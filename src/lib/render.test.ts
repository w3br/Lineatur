import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {renderEffect} from "./render.ts"

// jsdom can't draw – every canvas gets a fake 2D context that records what happens to it
type FakeContext = {
    canvas: HTMLCanvasElement
    drawImage: ReturnType<typeof vi.fn>
    getImageData: ReturnType<typeof vi.fn>
    putImageData: ReturnType<typeof vi.fn>
    imageSmoothingEnabled: boolean
}

let contexts: FakeContext[] = []

beforeEach(() => {
    contexts = []
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (this: HTMLCanvasElement) {
        const context: FakeContext = {
            canvas: this,
            drawImage: vi.fn(),
            // Stands in for the pixels read back from the work canvas
            getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({width, height})),
            putImageData: vi.fn(),
            imageSmoothingEnabled: true,
        }
        contexts.push(context)
        return context as unknown as RenderingContext
    })
})

afterEach(() => vi.restoreAllMocks())

function source(width: number, height: number) {
    return {width, height} as ImageBitmap
}

/** The work canvas is created inside renderEffect, the target is the one we pass in. */
function setup(pixelSize: number, apply = vi.fn((image: ImageData) => image)) {
    const bitmap = source(1200, 800)
    const target = document.createElement("canvas")

    renderEffect(bitmap, target, pixelSize, apply)

    const work = contexts.find((context) => context.canvas !== target)!
    const output = contexts.find((context) => context.canvas === target)!
    return {bitmap, target, work, output, apply}
}

describe("renderEffect", () => {
    it("runs the effect on a copy shrunk by the pixel size", () => {
        const {work, bitmap, apply} = setup(4)

        expect([work.canvas.width, work.canvas.height]).toEqual([300, 200])
        expect(work.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 300, 200)
        expect(apply).toHaveBeenCalledWith({width: 300, height: 200})
    })

    it("writes the effect's result back onto the work canvas", () => {
        const result = {width: 300, height: 200} as ImageData
        const {work} = setup(
            4,
            vi.fn(() => result),
        )

        expect(work.putImageData).toHaveBeenCalledWith(result, 0, 0)
    })

    it("scales the result back up to full size without smoothing", () => {
        const {target, output, work} = setup(4)

        expect([target.width, target.height]).toEqual([1200, 800])
        // Smoothing off is what turns one work pixel into a crisp 4×4 block
        expect(output.imageSmoothingEnabled).toBe(false)
        expect(output.drawImage).toHaveBeenCalledWith(work.canvas, 0, 0, 1200, 800)
    })

    it("works on the full size at pixel size 1", () => {
        const {work} = setup(1)

        expect([work.canvas.width, work.canvas.height]).toEqual([1200, 800])
    })

    it("never shrinks below 1 × 1 pixel", () => {
        const {work} = setup(5000)

        expect([work.canvas.width, work.canvas.height]).toEqual([1, 1])
    })
})
