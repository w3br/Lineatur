import {afterAll, beforeAll, describe, expect, it, vi} from "vitest"
import {dither} from "./index.ts"
import {bayer} from "./bayer.ts"
import {ATKINSON, errorDiffusion, FLOYD_STEINBERG} from "./errorDiffusion.ts"
import {toGray} from "../tone.ts"
import {defaultDithering, type DitheringParams} from "../../store/params.ts"

// jsdom has no ImageData. dither only needs `new ImageData(width, height)` with an RGBA buffer,
// so a minimal stand-in is enough (in the browser and in the worker the real one is used)
class FakeImageData {
    readonly width: number
    readonly height: number
    readonly data: Uint8ClampedArray

    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        this.data = new Uint8ClampedArray(width * height * 4)
    }
}

beforeAll(() => vi.stubGlobal("ImageData", FakeImageData))
afterAll(() => vi.unstubAllGlobals())

/** Builds an image from gray values – every pixel gets r = g = b = value, alpha 255. */
function grayImage(values: number[], width: number, height = 1) {
    const image = new ImageData(width, height)
    values.forEach((value, p) => image.data.set([value, value, value, 255], p * 4))
    return image
}

/** Splits RGBA data into one [r, g, b, a] entry per pixel – easier to read in assertions. */
function pixels(image: ImageData) {
    return Array.from({length: image.width * image.height}, (_, p) => Array.from(image.data.slice(p * 4, p * 4 + 4)))
}

const params = (patch: Partial<DitheringParams> = {}): DitheringParams => ({
    ...defaultDithering,
    foreground: "#112233",
    background: "#eeddcc",
    ...patch,
})

const INK = [0x11, 0x22, 0x33, 255]
const PAPER = [0xee, 0xdd, 0xcc, 255]

describe("dither", () => {
    it("paints black pixels with the foreground and white pixels with the background", () => {
        const result = dither(grayImage([0, 255], 2), params())

        expect(pixels(result)).toEqual([INK, PAPER])
    })

    it("returns a new opaque image of the same size and leaves the input untouched", () => {
        const image = grayImage([10, 120, 200, 250], 2, 2)
        const before = Array.from(image.data)

        const result = dither(image, params())

        expect(result).not.toBe(image)
        expect([result.width, result.height]).toEqual([2, 2])
        expect(pixels(result).every(([, , , alpha]) => alpha === 255)).toBe(true)
        expect(Array.from(image.data)).toEqual(before)
    })

    // dither must give exactly what the chosen algorithm gives on the same gray values
    it.each([
        ["floyd-steinberg", (gray: Float32Array) => errorDiffusion(gray, 8, 8, FLOYD_STEINBERG, 127.5)],
        ["atkinson", (gray: Float32Array) => errorDiffusion(gray, 8, 8, ATKINSON, 127.5)],
        ["bayer", (gray: Float32Array) => bayer(gray, 8, 8)],
    ] as const)("uses %s for the matching algorithm", (algorithm, run) => {
        // A gradient, so the algorithms really differ
        const image = grayImage(
            Array.from({length: 64}, (_, p) => p * 4),
            8,
            8,
        )

        const result = dither(image, params({algorithm, threshold: 50}))

        const expected = run(toGray(image, 0, 0))
        expect(pixels(result)).toEqual(Array.from(expected, (value) => (value === 0 ? INK : PAPER)))
    })

    it("maps threshold 0–100 to the level 0–255", () => {
        // 1 pixel, gray 110: below level 127.5 at threshold 50, above level 102 at threshold 40
        const image = grayImage([110], 1)

        expect(pixels(dither(image, params({algorithm: "floyd-steinberg", threshold: 50})))).toEqual([INK])
        expect(pixels(dither(image, params({algorithm: "floyd-steinberg", threshold: 40})))).toEqual([PAPER])
    })

    it("applies brightness and contrast before dithering", () => {
        // Gray 100 is ink at threshold 50 – brightness +20 lifts it to 151, which turns it into paper
        const image = grayImage([100], 1)

        expect(pixels(dither(image, params({brightness: 0})))).toEqual([INK])
        expect(pixels(dither(image, params({brightness: 20})))).toEqual([PAPER])
        expect(pixels(dither(image, params({contrast: -100})))).toEqual([PAPER])
    })
})
