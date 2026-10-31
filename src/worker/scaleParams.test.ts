import {describe, expect, it} from "vitest"
import type {RenderJob} from "./messages.ts"
import {scaleParams} from "./scaleParams.ts"
import {defaultAscii, defaultDithering, defaultHalftone} from "../store/params.ts"

const halftone: RenderJob = {effect: "halftone", params: {...defaultHalftone, gridSize: 8, angle: 45}}
const dithering: RenderJob = {effect: "dithering", params: {...defaultDithering, pixelSize: 2}}
const ascii: RenderJob = {effect: "ascii", params: {...defaultAscii, cellSize: 8}}

// toEqual on the whole job: it also fails if a value lands next to params instead of inside
describe("scaleParams", () => {
    it("scales the halftone grid and nothing else", () => {
        expect(scaleParams(halftone, 4)).toEqual({
            effect: "halftone",
            params: {...halftone.params, gridSize: 32},
        })
    })

    it("scales the dithering pixels and nothing else", () => {
        expect(scaleParams(dithering, 4)).toEqual({
            effect: "dithering",
            params: {...dithering.params, pixelSize: 8},
        })
    })

    it("scales the ascii cells and nothing else", () => {
        expect(scaleParams(ascii, 4)).toEqual({
            effect: "ascii",
            params: {...ascii.params, cellSize: 32},
        })
    })

    it("keeps the angle", () => {
        expect(scaleParams(halftone, 4).params).toHaveProperty("angle", 45)
    })

    it("changes nothing at scale 1", () => {
        expect(scaleParams(halftone, 1)).toEqual(halftone)
        expect(scaleParams(dithering, 1)).toEqual(dithering)
        expect(scaleParams(ascii, 1)).toEqual(ascii)
    })

    it("doesn't round, so the grid stays where it is in the preview", () => {
        const job: RenderJob = {effect: "halftone", params: {...defaultHalftone, gridSize: 9}}

        expect(scaleParams(job, 1.25).params).toHaveProperty("gridSize", 11.25)
    })

    it("leaves the input untouched – its params are shared with the store and the undo history", () => {
        const before = structuredClone(halftone)

        scaleParams(halftone, 4)

        expect(halftone).toEqual(before)
    })
})
