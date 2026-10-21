import {describe, expect, it} from "vitest"
import {ATKINSON, errorDiffusion, FLOYD_STEINBERG, type Kernel} from "./errorDiffusion.ts"

// A flat area: every pixel has the same gray value
function flat(width: number, height: number, value: number) {
    return new Float32Array(width * height).fill(value)
}

function whiteShare(result: Uint8ClampedArray) {
    return result.filter((value) => value === 255).length / result.length
}

describe("errorDiffusion", () => {
    describe("Floyd–Steinberg", () => {
        it("spreads mid gray into a diagonal pattern", () => {
            const result = errorDiffusion(flat(2, 2, 128), 2, 2, FLOYD_STEINBERG)

            expect(Array.from(result)).toEqual([255, 0, 0, 255])
        })

        it("pushes the error to the right until a pixel flips to white", () => {
            // 100 → black, error 100 · 7/16 makes the next pixel 143.75 → white
            const result = errorDiffusion(flat(4, 1, 100), 4, 1, FLOYD_STEINBERG)

            expect(Array.from(result)).toEqual([0, 255, 0, 0])
        })

        it("keeps the average brightness", () => {
            // 64 / 255 ≈ 0.25 – the error is passed on in full, so nothing gets lost
            const result = errorDiffusion(flat(64, 64, 64), 64, 64, FLOYD_STEINBERG)

            expect(whiteShare(result)).toBeCloseTo(0.25, 2)
        })
    })

    describe("Atkinson", () => {
        it("spreads the error two pixels to the right", () => {
            // 100 → black, the next two pixels each get 100 · 1/8 – none of them reaches 128
            const result = errorDiffusion(flat(4, 1, 100), 4, 1, ATKINSON)

            expect(Array.from(result)).toEqual([0, 0, 0, 255])
        })

        it("loses some brightness on purpose", () => {
            // Only 6/8 of the error is passed on – fewer white pixels than Floyd–Steinberg
            const result = errorDiffusion(flat(64, 64, 64), 64, 64, ATKINSON)

            expect(whiteShare(result)).toBeCloseTo(0.18, 2)
        })
    })

    it.each([
        ["Floyd–Steinberg", FLOYD_STEINBERG],
        ["Atkinson", ATKINSON],
    ])("%s leaves the input untouched", (_, kernel) => {
        const gray = flat(8, 8, 100)
        const before = Array.from(gray)

        errorDiffusion(gray, 8, 8, kernel)

        expect(Array.from(gray)).toEqual(before)
    })

    it.each([
        ["Floyd–Steinberg", FLOYD_STEINBERG],
        ["Atkinson", ATKINSON],
    ])("%s keeps pure black and pure white", (_, kernel) => {
        // No error at 0 and 255, so nothing is spread
        expect(whiteShare(errorDiffusion(flat(8, 8, 0), 8, 8, kernel))).toBe(0)
        expect(whiteShare(errorDiffusion(flat(8, 8, 255), 8, 8, kernel))).toBe(1)
    })

    it("returns black/white bytes", () => {
        const result = errorDiffusion(flat(8, 8, 100), 8, 8, FLOYD_STEINBERG)

        expect(result).toBeInstanceOf(Uint8ClampedArray)
        expect(result.every((value) => value === 0 || value === 255)).toBe(true)
    })

    it("uses the threshold level", () => {
        const gray = Float32Array.from([100])

        expect(Array.from(errorDiffusion(gray, 1, 1, FLOYD_STEINBERG, 128))).toEqual([0])
        expect(Array.from(errorDiffusion(gray, 1, 1, FLOYD_STEINBERG, 100))).toEqual([255])
    })

    describe("image edges", () => {
        // A kernel that only sends the error to the lower left neighbour
        const lowerLeftOnly: Kernel = [[-1, 1, 1]]

        it("doesn't wrap the error from the left edge into the previous row", () => {
            // (0,0) has no lower left neighbour – its share must be dropped.
            // Without the check, x = -1 in row 1 is index 1 = (1,0), the end of row 0, which would turn white.
            const gray = flat(2, 2, 100)

            const result = errorDiffusion(gray, 2, 2, lowerLeftOnly)

            // (1,0) passes its error 100 to (0,1): 100 + 100 = 200 → white
            expect(Array.from(result)).toEqual([0, 0, 255, 0])
        })

        it("doesn't wrap the error from the right edge into the next row", () => {
            // Only the right neighbour: the last pixel of row 0 must not feed the first pixel of row 1
            const rightOnly: Kernel = [[1, 0, 1]]
            const gray = Float32Array.from([0, 100, 100, 0])

            const result = errorDiffusion(gray, 2, 2, rightOnly)

            // Without the check, (1,0)'s error 100 would make (0,1) 200 → white
            expect(Array.from(result)).toEqual([0, 0, 0, 0])
        })
    })
})
