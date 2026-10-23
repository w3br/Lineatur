import {afterAll, beforeAll, describe, expect, it, vi} from "vitest"
import {halftone} from "./halftone.ts"
import {defaultHalftone, type HalftoneParams} from "../../store/params.ts"

// jsdom has no ImageData – same minimal stand-in as in the dither tests
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

/** An image where every pixel has the same gray value. */
function flatImage(value: number, width: number, height: number) {
    return grayImage(Array(width * height).fill(value), width, height)
}

/** One character per pixel, one string per row: "#" = ink, "." = paper – readable in a diff. */
function picture(image: ImageData) {
    const rows: string[] = []
    for (let y = 0; y < image.height; y++) {
        let row = ""
        for (let x = 0; x < image.width; x++) {
            const i = (y * image.width + x) * 4
            row += image.data[i] === INK[0] ? "#" : "."
        }
        rows.push(row)
    }
    return rows
}

function inkShare(image: ImageData) {
    const all = picture(image).join("")
    return [...all].filter((char) => char === "#").length / all.length
}

// Square, no rotation, no noise: the only shape the effect draws so far – and the easiest to calculate by hand
const params = (patch: Partial<HalftoneParams> = {}): HalftoneParams => ({
    ...defaultHalftone,
    shape: "square",
    angle: 0,
    noise: 0,
    foreground: "#112233",
    background: "#eeddcc",
    ...patch,
})

const INK = [0x11, 0x22, 0x33, 255]
const PAPER = [0xee, 0xdd, 0xcc, 255]

describe("halftone", () => {
    it("returns a new opaque image of the same size and leaves the input untouched", () => {
        const image = flatImage(100, 5, 3)
        const before = Array.from(image.data)

        const result = halftone(image, params({gridSize: 2}))

        expect(result).not.toBe(image)
        expect([result.width, result.height]).toEqual([5, 3])
        expect(Array.from(image.data)).toEqual(before)
        for (let i = 3; i < result.data.length; i += 4) {
            expect(result.data[i]).toBe(255)
        }
    })

    it("paints ink with the foreground and paper with the background", () => {
        // 4×2, two cells: left black, right white
        const result = halftone(grayImage([0, 0, 255, 255, 0, 0, 255, 255], 4, 2), params({gridSize: 2}))

        expect(Array.from(result.data.slice(0, 4))).toEqual(INK)
        expect(Array.from(result.data.slice(8, 12))).toEqual(PAPER)
    })

    it("leaves a white image completely blank", () => {
        // d = 0 → the dot has size 0 – not even the center pixel may be inked
        const result = halftone(flatImage(255, 8, 8), params({gridSize: 4}))

        expect(inkShare(result)).toBe(0)
    })

    it("fills a black image completely", () => {
        // d = 1 → the square is as big as the cell
        const result = halftone(flatImage(0, 8, 8), params({gridSize: 4}))

        expect(inkShare(result)).toBe(1)
    })

    it("draws a centered dot in a mid-gray cell", () => {
        // Gray 128: d ≈ 0.498, half = 2 · √0.498 ≈ 1.41.
        // Measured from pixel centers, |lx| is 0.5 or 1.5 – only the inner 2×2 is closer than 1.41
        const result = halftone(flatImage(128, 4, 4), params({gridSize: 4}))

        expect(picture(result)).toEqual([
            "....", //
            ".##.",
            ".##.",
            "....",
        ])
    })

    it("uses the average of the cell, not the single pixels", () => {
        // Left half black, right half white: average 127.5 – the dot sits in the middle, not on the black pixels
        const halfBlack = [0, 0, 255, 255]
        const image = grayImage([...halfBlack, ...halfBlack, ...halfBlack, ...halfBlack], 4, 4)

        const result = halftone(image, params({gridSize: 4}))

        expect(picture(result)).toEqual(picture(halftone(flatImage(128, 4, 4), params({gridSize: 4}))))
    })

    it("treats every cell on its own", () => {
        // 4×2, s = 2: left cell black, right cell white
        const result = halftone(grayImage([0, 0, 255, 255, 0, 0, 255, 255], 4, 2), params({gridSize: 2}))

        expect(picture(result)).toEqual([
            "##..", //
            "##..",
        ])
    })

    it("handles cells that hang over the image edge", () => {
        // 3 pixels wide, s = 2: the second cell only has one pixel – its average must still be right
        const result = halftone(flatImage(0, 3, 3), params({gridSize: 2}))

        expect(inkShare(result)).toBe(1)
    })

    it("uses more ink the darker the image is", () => {
        const shares = [192, 128, 64].map((value) =>
            inkShare(halftone(flatImage(value, 16, 16), params({gridSize: 16}))),
        )

        expect(shares[0]).toBeLessThan(shares[1])
        expect(shares[1]).toBeLessThan(shares[2])
    })

    it.each([192, 128, 64])("keeps the ink share of a square close to the darkness (gray %i)", (value) => {
        // The square's area is d · s² – on a 16 px grid the pixel steps keep it within 10 %
        const darkness = 1 - value / 255

        const share = inkShare(halftone(flatImage(value, 16, 16), params({gridSize: 16})))

        expect(Math.abs(share - darkness)).toBeLessThan(0.1)
    })
})
