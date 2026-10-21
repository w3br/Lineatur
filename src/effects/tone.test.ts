import {describe, expect, it} from "vitest"
import {adjustTone, luminance, toGray} from "./tone.ts"

describe("luminance", () => {
    // Floating point: 0.299 · 255 isn't exact, so results are compared to one decimal
    it("weights red with about 30 %", () => {
        expect(luminance(255, 0, 0)).toBeCloseTo(76.2, 1)
    })

    it("weights green the most", () => {
        expect(luminance(0, 255, 0)).toBeCloseTo(149.7, 1)
    })

    it("weights blue the least", () => {
        expect(luminance(0, 0, 255)).toBeCloseTo(29.1, 1)
    })

    it("keeps gray as gray", () => {
        // toBe(128) would fail: the result is 127.99999999999999
        expect(luminance(128, 128, 128)).toBeCloseTo(128)
    })
})

describe("adjustTone", () => {
    it("leaves the value unchanged at neutral settings", () => {
        expect(adjustTone(128, 0, 0)).toBeCloseTo(128)
    })

    it("adds brightness × 2.55 to the value", () => {
        expect(adjustTone(100, 20, 0)).toBeCloseTo(151)
    })

    it("darkens with negative brightness", () => {
        expect(adjustTone(100, -20, 0)).toBeCloseTo(49)
    })

    it("keeps the midpoint fixed when contrast changes", () => {
        expect(adjustTone(128, 0, 50)).toBeCloseTo(128)
        expect(adjustTone(128, 0, -50)).toBeCloseTo(128)
    })

    it("pulls values towards the midpoint with negative contrast", () => {
        const result = adjustTone(200, 0, -50)

        expect(result).toBeLessThan(200)
        expect(result).toBeGreaterThan(128)
    })

    it("clamps bright values to 255", () => {
        expect(adjustTone(200, 0, 50)).toBe(255)
    })

    it("clamps dark values to 0", () => {
        expect(adjustTone(50, 0, 50)).toBe(0)
    })
})

describe("toGray", () => {
    // jsdom has no ImageData – toGray only reads width, height and data, so a plain object is enough
    function image(rgba: number[], width: number, height: number) {
        return {width, height, data: Uint8ClampedArray.from(rgba)} as ImageData
    }

    it("returns one luminance value per pixel", () => {
        // 2×1 image: red, gray – RGBA, so 4 values per pixel
        const gray = toGray(image([255, 0, 0, 255, 128, 128, 128, 255], 2, 1), 0, 0)

        expect(gray).toBeInstanceOf(Float32Array)
        expect(gray).toHaveLength(2)
        expect(gray[0]).toBeCloseTo(76.2, 1)
        expect(gray[1]).toBeCloseTo(128)
    })

    it("applies brightness and contrast to every pixel", () => {
        const gray = toGray(image([100, 100, 100, 255, 100, 100, 100, 255], 2, 1), 20, 0)

        expect(gray[0]).toBeCloseTo(151)
        expect(gray[1]).toBeCloseTo(151)
    })

    it("ignores the alpha channel", () => {
        const opaque = image([255, 0, 0, 255], 1, 1)
        const transparent = image([255, 0, 0, 0], 1, 1)

        expect(toGray(transparent, 0, 0)[0]).toBe(toGray(opaque, 0, 0)[0])
    })

    it("walks rows correctly in a taller image", () => {
        // 1×3 image: black, white, black – catches a mix-up of width and height
        const gray = toGray(image([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255], 1, 3), 0, 0)

        expect(Array.from(gray, Math.round)).toEqual([0, 255, 0])
    })
})
