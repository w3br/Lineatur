import {afterAll, beforeAll, describe, expect, it, vi} from "vitest"
import {halftone, isInk, noise2d} from "./halftone.ts"
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

describe("noise2d", () => {
    it("returns the same value for the same coordinates – no flicker between renders", () => {
        expect(noise2d(3, 4)).toBe(noise2d(3, 4))
        expect(noise2d(-12, 57)).toBe(noise2d(-12, 57))
    })

    it("returns exactly −1 at the origin", () => {
        // sin(0) = 0 → fractional part 0 → 0 · 2 − 1
        expect(noise2d(0, 0)).toBe(-1)
    })

    it("stays within [−1, 1) – also for negative cell indices of a rotated grid", () => {
        for (let y = -50; y <= 50; y++) {
            for (let x = -50; x <= 50; x++) {
                const n = noise2d(x, y)
                expect(n).toBeGreaterThanOrEqual(-1)
                expect(n).toBeLessThan(1)
            }
        }
    })

    it("varies between neighboring cells", () => {
        const values = new Set([0, 1, 2, 3, 4, 5, 6, 7].map((x) => noise2d(x, 1)))

        expect(values.size).toBe(8)
    })

    it("spreads over the whole range instead of clustering", () => {
        // A rough check that it looks random: a 10 × 10 sample hits both halves of the range
        const values = Array.from({length: 100}, (_, i) => noise2d(i % 10, Math.floor(i / 10)))

        expect(values.some((n) => n < -0.5)).toBe(true)
        expect(values.some((n) => n > 0.5)).toBe(true)
    })
})

describe("isInk", () => {
    const shapes = ["square", "circle", "line"] as const

    it.each(shapes)("never inks a %s of darkness 0 – not even the center", (shape) => {
        expect(isInk(shape, 0, 0, 10, 0)).toBe(false)
    })

    it.each(shapes)("inks the center of a %s of any darkness above 0", (shape) => {
        expect(isInk(shape, 0, 0, 10, 0.01)).toBe(true)
    })

    it("gives a full circle a radius of s · √(1/π) ≈ 5.64 on a 10 px grid", () => {
        expect(isInk("circle", 5.6, 0, 10, 1)).toBe(true)
        expect(isInk("circle", 5.7, 0, 10, 1)).toBe(false)
    })

    it("gives a quarter-dark circle half that radius (≈ 2.82)", () => {
        // Area ∝ darkness → radius ∝ √darkness: a quarter of the ink, half the radius
        expect(isInk("circle", 2.8, 0, 10, 0.25)).toBe(true)
        expect(isInk("circle", 2.9, 0, 10, 0.25)).toBe(false)
    })

    it("measures the circle in every direction, not just along the axes", () => {
        // (4, 4) is 5.66 from the center – just outside a full circle, although both coordinates are inside
        expect(isInk("circle", 4, 4, 10, 1)).toBe(false)
        expect(isInk("square", 4, 4, 10, 1)).toBe(true)
    })

    it("gives a quarter-dark square a side of s · √0.25 = 5", () => {
        expect(isInk("square", -2.5, 2.4, 10, 0.25)).toBe(true)
        expect(isInk("square", 2.5, 0, 10, 0.25)).toBe(false)
    })

    it("gives a half-dark line a thickness of s · 0.5 = 5, over the full cell width", () => {
        expect(isInk("line", -5, 2.4, 10, 0.5)).toBe(true)
        expect(isInk("line", 4.9, -2.5, 10, 0.5)).toBe(true)
        expect(isInk("line", 0, 2.5, 10, 0.5)).toBe(false)
    })
})

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

    describe("shapes", () => {
        it.each(["circle", "line"] as const)("keeps the ink share of a %s close to the darkness", (shape) => {
            const darkness = 1 - 128 / 255

            const share = inkShare(halftone(flatImage(128, 32, 32), params({gridSize: 16, shape})))

            expect(Math.abs(share - darkness)).toBeLessThan(0.1)
        })

        it("draws a horizontal stripe per cell for the line shape", () => {
            // Gray 128 on a 4 px grid: t ≈ 2 → the two middle rows of every cell
            const result = halftone(flatImage(128, 4, 4), params({gridSize: 4, shape: "line"}))

            expect(picture(result)).toEqual([
                "....", //
                "####",
                "####",
                "....",
            ])
        })

        it("draws a round dot for the circle shape", () => {
            // Gray 64 on an 8 px grid: r ≈ 3.9, r² ≈ 15.3. Pixel centers sit at ±0.5 … ±3.5:
            // (3.5, 1.5) → 14.5 is ink, (3.5, 2.5) → 18.5 is not – so only the corners are cut off
            const result = halftone(flatImage(64, 8, 8), params({gridSize: 8, shape: "circle"}))

            expect(picture(result)).toEqual([
                "..####..", //
                ".######.",
                "########",
                "########",
                "########",
                "########",
                ".######.",
                "..####..",
            ])
        })

        it("leaves the cell corners blank when a full circle is clipped by its cell", () => {
            // r ≈ 0.564 · s is bigger than half a cell but smaller than half its diagonal
            const result = halftone(flatImage(0, 8, 8), params({gridSize: 8, shape: "circle"}))

            expect(picture(result)[0][0]).toBe(".")
            expect(picture(result)[0][4]).toBe("#")
        })
    })

    describe("noise", () => {
        /** Number of ink pixels per s × s cell of an unrotated grid, row by row. */
        function inkPerCell(image: ImageData, s: number) {
            const rows = picture(image)
            const counts: number[] = []
            for (let cy = 0; cy < image.height; cy += s) {
                for (let cx = 0; cx < image.width; cx += s) {
                    let count = 0
                    for (let y = cy; y < cy + s; y++) {
                        for (let x = cx; x < cx + s; x++) {
                            if (rows[y][x] === "#") count++
                        }
                    }
                    counts.push(count)
                }
            }
            return counts
        }

        it("renders the same image twice with the same settings", () => {
            const image = flatImage(128, 32, 32)

            const first = halftone(image, params({gridSize: 8, noise: 50}))
            const second = halftone(image, params({gridSize: 8, noise: 50}))

            expect(Array.from(second.data)).toEqual(Array.from(first.data))
        })

        it("gives every cell of a flat gray the same dot without noise", () => {
            const counts = inkPerCell(halftone(flatImage(128, 32, 32), params({gridSize: 8, noise: 0})), 8)

            expect(new Set(counts).size).toBe(1)
        })

        it("varies the dot size from cell to cell with noise", () => {
            const counts = inkPerCell(halftone(flatImage(128, 32, 32), params({gridSize: 8, noise: 100})), 8)

            expect(new Set(counts).size).toBeGreaterThan(1)
        })

        it("changes the dot size, not the dot shape – every dot stays a centered square", () => {
            // Noise per cell, not per pixel: frayed edges would break the symmetry
            const result = picture(halftone(flatImage(128, 32, 32), params({gridSize: 8, noise: 100})))

            for (let cy = 0; cy < 32; cy += 8) {
                for (let cx = 0; cx < 32; cx += 8) {
                    const cell = result.slice(cy, cy + 8).map((row) => row.slice(cx, cx + 8))
                    const mirrored = [...cell].reverse().map((row) => [...row].reverse().join(""))
                    expect(mirrored).toEqual(cell)
                }
            }
        })

        it("lightens the top-left cell at full noise, because noise2d(0, 0) = −1", () => {
            // Gray 128: d ≈ 0.498, minus 0.5 → clamped to 0 → the cell stays blank
            const counts = inkPerCell(halftone(flatImage(128, 16, 16), params({gridSize: 8, noise: 100})), 8)

            expect(counts[0]).toBe(0)
        })

        it("clamps the darkness, so white gets some dots but never anything but ink or paper", () => {
            const result = halftone(flatImage(255, 32, 32), params({gridSize: 8, noise: 100}))

            expect(inkShare(result)).toBeGreaterThan(0)
            for (let i = 0; i < result.data.length; i += 4) {
                const pixel = Array.from(result.data.slice(i, i + 4))
                expect([INK, PAPER]).toContainEqual(pixel)
            }
        })

        it("keeps the noise pattern stable for a rotated grid", () => {
            const image = flatImage(128, 32, 32)

            const first = halftone(image, params({gridSize: 8, angle: 30, noise: 80}))
            const second = halftone(image, params({gridSize: 8, angle: 30, noise: 80}))

            expect(Array.from(second.data)).toEqual(Array.from(first.data))
        })
    })

    describe("rotation", () => {
        it.each([30, 45, 90, 135])("keeps the ink share close to the darkness at %i°", (angle) => {
            // Rotated, the grid reaches outside the image – negative or overflowing cell indices would break this
            const darkness = 1 - 128 / 255

            const share = inkShare(halftone(flatImage(128, 64, 48), params({gridSize: 8, angle})))

            expect(Math.abs(share - darkness)).toBeLessThan(0.1)
        })

        it("fills a black image completely at any angle", () => {
            // Squares at d = 1 tile the plane – a single paper pixel means a cell got the wrong darkness
            const result = halftone(flatImage(0, 20, 20), params({gridSize: 4, angle: 45}))

            expect(inkShare(result)).toBe(1)
        })

        it("leaves a white image blank at any angle", () => {
            const result = halftone(flatImage(255, 20, 20), params({gridSize: 4, angle: 45}))

            expect(inkShare(result)).toBe(0)
        })

        it("differs from the unrotated grid", () => {
            const image = flatImage(128, 16, 16)

            const straight = picture(halftone(image, params({gridSize: 8, angle: 0})))
            const rotated = picture(halftone(image, params({gridSize: 8, angle: 45})))

            expect(rotated).not.toEqual(straight)
        })
    })
})
