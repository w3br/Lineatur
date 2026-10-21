import {describe, expect, it} from "vitest"
import {bayer} from "./bayer.ts"

// A flat area: every pixel has the same gray value
function flat(width: number, height: number, value: number) {
    return new Float32Array(width * height).fill(value)
}

function whiteShare(result: Uint8ClampedArray) {
    return result.filter((value) => value === 255).length / result.length
}

describe("bayer", () => {
    it("turns mid gray into a checkerboard", () => {
        const result = bayer(flat(4, 4, 128), 4, 4)

        // prettier-ignore
        expect(Array.from(result)).toEqual([
            255,   0, 255,   0,
              0, 255,   0, 255,
            255,   0, 255,   0,
              0, 255,   0, 255,
        ])
    })

    // The 16 thresholds are spread evenly, so the share of white pixels matches the brightness
    it.each([
        [64, 0.25],
        [128, 0.5],
        [192, 0.75],
    ])("keeps the brightness: gray %i → %f white", (value, expected) => {
        const result = bayer(flat(64, 64, value), 64, 64)

        expect(whiteShare(result)).toBe(expected)
    })

    it("keeps black black and white white", () => {
        expect(whiteShare(bayer(flat(8, 8, 0), 8, 8))).toBe(0)
        expect(whiteShare(bayer(flat(8, 8, 255), 8, 8))).toBe(1)
    })

    it("repeats the pattern every 4 pixels", () => {
        const width = 8
        const height = 8
        const result = bayer(flat(width, height, 100), width, height)

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                expect(result[y * width + x]).toBe(result[(y % 4) * width + (x % 4)])
            }
        }
    })

    it("handles sizes that aren't a multiple of 4", () => {
        // 5×3: the pattern is cut off at the right and bottom edge
        const result = bayer(flat(5, 3, 128), 5, 3)

        // prettier-ignore
        expect(Array.from(result)).toEqual([
            255,   0, 255,   0, 255,
              0, 255,   0, 255,   0,
            255,   0, 255,   0, 255,
        ])
    })

    it("reads the matrix by row and column, not the other way round", () => {
        // Gray 150 lies between the thresholds of matrix value 8 (≈ 135) and 12 (≈ 199).
        // Two pixels side by side hit 0 and 8, two pixels on top of each other hit 0 and 12.
        const gray = Float32Array.from([150, 150])

        expect(Array.from(bayer(gray, 2, 1))).toEqual([255, 255])
        expect(Array.from(bayer(gray, 1, 2))).toEqual([255, 0])
    })

    it("returns black/white bytes and leaves the input untouched", () => {
        const gray = flat(4, 4, 100)
        const before = Array.from(gray)

        const result = bayer(gray, 4, 4)

        expect(result).toBeInstanceOf(Uint8ClampedArray)
        expect(result.every((value) => value === 0 || value === 255)).toBe(true)
        expect(Array.from(gray)).toEqual(before)
    })
})
