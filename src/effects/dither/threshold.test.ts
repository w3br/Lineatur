import {describe, expect, it} from "vitest"
import {threshold} from "./threshold.ts"

describe("threshold", () => {
    it("turns values at or above the level white and the rest black", () => {
        const gray = Float32Array.from([0, 127, 128, 255])

        const result = threshold(gray, 128)

        expect(Array.from(result)).toEqual([0, 0, 255, 255])
    })

    it("turns everything white at level 0", () => {
        const gray = Float32Array.from([0, 50, 255])

        const result = threshold(gray, 0)

        expect(Array.from(result)).toEqual([255, 255, 255])
    })

    it("turns everything black above 255", () => {
        const gray = Float32Array.from([0, 50, 255])

        const result = threshold(gray, 256)

        expect(Array.from(result)).toEqual([0, 0, 0])
    })
})
