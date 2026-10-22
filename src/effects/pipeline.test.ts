import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {renderPixelEffect} from "./pipeline.ts"

// jsdom has no OffscreenCanvas – a fake one records what happens to it
type FakeContext = {
    drawImage: ReturnType<typeof vi.fn>
    getImageData: ReturnType<typeof vi.fn>
    putImageData: ReturnType<typeof vi.fn>
    imageSmoothingEnabled: boolean
}

class FakeOffscreenCanvas {
    width: number
    height: number
    context: FakeContext | null = {
        drawImage: vi.fn(),
        // Stands in for the pixels read back from the work canvas
        getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => ({width, height})),
        putImageData: vi.fn(),
        imageSmoothingEnabled: true,
    }
    // What transferToImageBitmap hands out – lets the test tell which canvas it came from
    bitmap = {} as ImageBitmap

    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        canvases.push(this)
    }

    getContext() {
        return this.context
    }

    transferToImageBitmap = vi.fn(() => this.bitmap)
}

let canvases: FakeOffscreenCanvas[] = []

beforeEach(() => {
    canvases = []
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas)
})

afterEach(() => vi.unstubAllGlobals())

function source(width: number, height: number) {
    return {width, height} as ImageBitmap
}

/** The first canvas is the small work canvas, the second the full-size output. */
function setup(pixelSize: number, apply = vi.fn((image: ImageData) => image)) {
    const bitmap = source(1200, 800)
    const result = renderPixelEffect(bitmap, pixelSize, apply)
    const [work, out] = canvases
    return {bitmap, result, work, out, apply}
}

describe("renderPixelEffect", () => {
    it("runs the effect on a copy shrunk by the pixel size", () => {
        const {work, bitmap, apply} = setup(4)

        expect([work.width, work.height]).toEqual([300, 200])
        expect(work.context!.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 300, 200)
        expect(apply).toHaveBeenCalledWith({width: 300, height: 200})
    })

    it("writes the effect's result back onto the work canvas", () => {
        const result = {width: 300, height: 200} as ImageData
        const {work} = setup(
            4,
            vi.fn(() => result),
        )

        expect(work.context!.putImageData).toHaveBeenCalledWith(result, 0, 0)
    })

    it("scales the result back up to full size without smoothing", () => {
        const {out, work} = setup(4)

        expect([out.width, out.height]).toEqual([1200, 800])
        // Smoothing off is what turns one work pixel into a crisp 4×4 block
        expect(out.context!.imageSmoothingEnabled).toBe(false)
        expect(out.context!.drawImage).toHaveBeenCalledWith(work, 0, 0, 1200, 800)
    })

    it("returns the full-size canvas as an ImageBitmap", () => {
        const {out, result} = setup(4)

        expect(out.transferToImageBitmap).toHaveBeenCalledOnce()
        expect(result).toBe(out.bitmap)
    })

    it("works on the full size at pixel size 1", () => {
        const {work} = setup(1)

        expect([work.width, work.height]).toEqual([1200, 800])
    })

    it("never shrinks below 1 × 1 pixel", () => {
        const {work} = setup(5000)

        expect([work.width, work.height]).toEqual([1, 1])
    })

    it("throws when the browser can't create a 2D context", () => {
        vi.spyOn(FakeOffscreenCanvas.prototype, "getContext").mockReturnValue(null)

        // In the worker this becomes an { type: 'error' } response instead of a silent blank image
        expect(() => renderPixelEffect(source(100, 100), 1, (image) => image)).toThrow()
    })
})
