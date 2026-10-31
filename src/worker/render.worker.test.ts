import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import type {RenderRequest} from "./messages.ts"
import {renderPixelEffect} from "../effects/pipeline.ts"
import {dither} from "../effects/dither"
import {halftone} from "../effects/halftone/halftone.ts"
import {asciiCells, renderAscii} from "../effects/ascii/renderAscii.ts"
import {toAsciiText} from "../effects/ascii/ascii.ts"
import {defaultAscii, defaultDithering, defaultHalftone} from "../store/params.ts"

// The pipeline and the effects have their own tests – here only the message handling matters
const rendered = {width: 800, height: 600, close: vi.fn()} as unknown as ImageBitmap
const renderedAscii = {} as ImageBitmap
const cells = {} as ImageData
vi.mock("../effects/pipeline.ts", () => ({renderPixelEffect: vi.fn(() => rendered)}))
vi.mock("../effects/dither/index.ts", () => ({dither: vi.fn((image: ImageData) => image)}))
vi.mock("../effects/halftone/halftone.ts", () => ({halftone: vi.fn((image: ImageData) => image)}))
vi.mock("../effects/ascii/renderAscii.ts", () => ({
    renderAscii: vi.fn(() => renderedAscii),
    asciiCells: vi.fn(() => cells),
}))
vi.mock("../effects/ascii/ascii.ts", () => ({toAsciiText: vi.fn(() => "@#")}))

// jsdom has no OffscreenCanvas – this stand-in only records what the export does with it
const encoded = {} as Blob
const drawImage = vi.fn()
const convertToBlob = vi.fn(async (_options: ImageEncodeOptions) => encoded)
let canvasSizes: number[][] = []

class FakeOffscreenCanvas {
    convertToBlob = convertToBlob

    constructor(width: number, height: number) {
        canvasSizes.push([width, height])
    }

    getContext() {
        return {drawImage}
    }
}

// In jsdom `self` is the window – the worker module sets its onmessage and calls its postMessage
let postMessage: ReturnType<typeof vi.spyOn>

beforeEach(async () => {
    canvasSizes = []
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas)
    postMessage = vi.spyOn(self, "postMessage").mockImplementation(() => {})
    // Fresh module per test – otherwise the image from the previous test would still be there
    vi.resetModules()
    await import("./render.worker.ts")
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.mocked(renderPixelEffect).mockClear()
    vi.mocked(dither).mockClear()
    vi.mocked(halftone).mockClear()
    vi.mocked(renderAscii).mockClear()
    vi.mocked(asciiCells).mockClear()
    vi.mocked(toAsciiText).mockClear()
    vi.mocked(rendered.close).mockClear()
    drawImage.mockClear()
    convertToBlob.mockClear()
})

// Returns the handler's promise – export tests await it, because encoding is async
function receive(request: RenderRequest) {
    return self.onmessage!({data: request} as MessageEvent<RenderRequest>)
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

    it("renders ascii with its own renderer instead of the pixel pipeline", () => {
        // ASCII draws text at full size – it doesn't change pixels, so renderPixelEffect doesn't fit
        const source = image()
        const params = {...defaultAscii, cellSize: 12}
        receive({type: "setImage", bitmap: source})
        receive({type: "render", effect: "ascii", params})

        expect(renderAscii).toHaveBeenCalledWith(source, params)
        expect(renderPixelEffect).not.toHaveBeenCalled()
        expect(postMessage).toHaveBeenCalledWith(
            {type: "rendered", bitmap: renderedAscii, ms: expect.any(Number)},
            {transfer: [renderedAscii]},
        )
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

    describe("export", () => {
        it("encodes the rendered image as png", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(convertToBlob).toHaveBeenCalledWith({type: "image/png"})
            expect(postMessage).toHaveBeenCalledWith({type: "exported", blob: encoded}, {transfer: []})
        })

        it("asks for image/jpeg – an unknown type like image/jpg would silently become a png", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "jpg", effect: "dithering", params: defaultDithering})

            expect(convertToBlob).toHaveBeenCalledWith(expect.objectContaining({type: "image/jpeg"}))
        })

        it("renders the source with the job's params", async () => {
            const source = image()
            const params = {...defaultDithering, pixelSize: 8}
            receive({type: "setImage", bitmap: source})
            await receive({type: "export", format: "png", effect: "dithering", params})

            const [from, pixelSize] = vi.mocked(renderPixelEffect).mock.lastCall!
            expect(from).toBe(source)
            expect(pixelSize).toBe(8)
        })

        it("draws the result onto a canvas of the same size, then frees it", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(canvasSizes).toEqual([[800, 600]])
            expect(drawImage).toHaveBeenCalledWith(rendered, 0, 0)
            expect(rendered.close).toHaveBeenCalled()
        })

        it("keeps the source image open", async () => {
            const source = image()
            receive({type: "setImage", bitmap: source})
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(source.close).not.toHaveBeenCalled()
        })

        it("builds the txt from the character cells, without rendering or encoding", async () => {
            const source = image()
            receive({type: "setImage", bitmap: source})
            await receive({type: "export", format: "txt", effect: "ascii", params: defaultAscii})

            expect(asciiCells).toHaveBeenCalledWith(source, defaultAscii)
            expect(toAsciiText).toHaveBeenCalledWith(cells, defaultAscii)
            expect(convertToBlob).not.toHaveBeenCalled()

            const {blob} = postMessage.mock.calls[0][0] as {blob: Blob}
            expect(blob.type).toBe("text/plain")
            expect(blob.size).toBe(2)
        })

        it("refuses txt for anything but ascii", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "txt", effect: "halftone", params: defaultHalftone})

            expect(postMessage).toHaveBeenCalledWith(
                {type: "error", message: "Error: TXT export only works for ASCII"},
                {transfer: []},
            )
        })

        it("answers with an error when encoding fails", async () => {
            convertToBlob.mockRejectedValueOnce(new Error("Encoding failed"))
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(postMessage).toHaveBeenCalledWith({type: "error", message: "Error: Encoding failed"}, {transfer: []})
        })

        it("answers 'skipped' without an image", async () => {
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(postMessage).toHaveBeenCalledWith({type: "skipped"}, {transfer: []})
        })

        it("answers exactly once – an export must not fall through to the preview render", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "png", effect: "dithering", params: defaultDithering})

            expect(postMessage).toHaveBeenCalledOnce()
        })

        it("answers exactly once when the export fails", async () => {
            receive({type: "setImage", bitmap: image()})
            await receive({type: "export", format: "txt", effect: "halftone", params: defaultHalftone})

            expect(postMessage).toHaveBeenCalledOnce()
        })
    })
})
