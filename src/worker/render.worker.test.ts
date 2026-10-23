import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import type {RenderRequest} from "./messages.ts"
import {renderPixelEffect} from "../effects/pipeline.ts"
import {dither} from "../effects/dither"
import {halftone} from "../effects/halftone/halftone.ts"
import {defaultAscii, defaultDithering, defaultHalftone} from "../store/params.ts"

// The pipeline and the effects have their own tests – here only the message handling matters
const rendered = {} as ImageBitmap
vi.mock("../effects/pipeline.ts", () => ({renderPixelEffect: vi.fn(() => rendered)}))
vi.mock("../effects/dither/index.ts", () => ({dither: vi.fn((image: ImageData) => image)}))
vi.mock("../effects/halftone/halftone.ts", () => ({halftone: vi.fn((image: ImageData) => image)}))

// In jsdom `self` is the window – the worker module sets its onmessage and calls its postMessage
let postMessage: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
    postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {})
    // Fresh module per test – otherwise the image from the previous test would still be there
    vi.resetModules()
    await import("./render.worker.ts")
})

afterEach(() => {
    vi.restoreAllMocks()
    vi.mocked(renderPixelEffect).mockClear()
    vi.mocked(dither).mockClear()
    vi.mocked(halftone).mockClear()
})

function receive(request: RenderRequest) {
    self.onmessage!({data: request} as MessageEvent<RenderRequest>)
}

function image() {
    return {width: 800, height: 600, close: vi.fn()} as unknown as ImageBitmap
}

describe("render worker", () => {
    it("answers 'skipped' when asked to render before it has an image", () => {
        receive({type: "render", effect: "dithering", params: defaultDithering})

        expect(postMessage).toHaveBeenCalledWith({type: "skipped"}, {transfer: []})
        expect(renderPixelEffect).not.toHaveBeenCalled()
    })

    it("doesn't answer a new image", () => {
        receive({type: "setImage", bitmap: image()})

        expect(postMessage).not.toHaveBeenCalled()
    })

    it("frees the previous image when a new one arrives", () => {
        const first = image()
        receive({type: "setImage", bitmap: first})
        receive({type: "setImage", bitmap: image()})

        expect(first.close).toHaveBeenCalled()
    })

    it("renders dithering with its pixel size and params", () => {
        const source = image()
        const params = {...defaultDithering, pixelSize: 4}
        receive({type: "setImage", bitmap: source})
        receive({type: "render", effect: "dithering", params})

        const [from, pixelSize, apply] = vi.mocked(renderPixelEffect).mock.lastCall!
        expect(from).toBe(source)
        expect(pixelSize).toBe(4)
        const pixels = {} as ImageData
        apply(pixels)
        expect(dither).toHaveBeenCalledWith(pixels, params)
    })

    it("renders halftone at full size with its params", () => {
        const source = image()
        const params = {...defaultHalftone, gridSize: 12}
        receive({type: "setImage", bitmap: source})
        receive({type: "render", effect: "halftone", params})

        const [from, pixelSize, apply] = vi.mocked(renderPixelEffect).mock.lastCall!
        expect(from).toBe(source)
        // The grid comes from the effect itself – the image must not be shrunk first
        expect(pixelSize).toBe(1)
        const pixels = {} as ImageData
        apply(pixels)
        expect(halftone).toHaveBeenCalledWith(pixels, params)
    })

    it("shows the original for ascii until it is implemented", () => {
        receive({type: "setImage", bitmap: image()})
        receive({type: "render", effect: "ascii", params: defaultAscii})

        const [, pixelSize, apply] = vi.mocked(renderPixelEffect).mock.lastCall!
        expect(pixelSize).toBe(1)
        const pixels = {} as ImageData
        expect(apply(pixels)).toBe(pixels)
    })

    it("sends the result back as a transfer, with the time it took", () => {
        receive({type: "setImage", bitmap: image()})
        receive({type: "render", effect: "dithering", params: defaultDithering})

        expect(postMessage).toHaveBeenCalledWith(
            {type: "rendered", bitmap: rendered, ms: expect.any(Number)},
            // Transferred, not copied – the bitmap moves to the main thread
            {transfer: [rendered]},
        )
    })

    it("answers with an error instead of staying silent when rendering fails", () => {
        vi.mocked(renderPixelEffect).mockImplementationOnce(() => {
            throw new Error("Could not create a 2D canvas context")
        })
        receive({type: "setImage", bitmap: image()})
        receive({type: "render", effect: "dithering", params: defaultDithering})

        expect(postMessage).toHaveBeenCalledWith(
            {type: "error", message: "Error: Could not create a 2D canvas context"},
            {transfer: []},
        )
    })
})
