import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, render, screen} from "@testing-library/react"
import {ImageCanvas} from "./ImageCanvas.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {renderPixelEffect} from "../../effects/pipeline.ts"
import {dither} from "../../effects/dither"

// Drawing is tested in pipeline.test.ts and the effects' own tests –
// here only the wiring matters: what gets rendered with which settings, and how it's shown.
// The fake result is a bit smaller than the source so the canvas size proves where it came from.
vi.mock("../../effects/pipeline.ts", () => ({
    renderPixelEffect: vi.fn((source: ImageBitmap) => ({
        width: source.width - 1,
        height: source.height - 1,
        close: vi.fn(),
    })),
}))
vi.mock("../../effects/dither/index.ts", () => ({dither: vi.fn((image: ImageData) => image)}))

// ImageBitmap doesn't exist in jsdom – the component only passes it on
function bitmap(width: number, height: number) {
    return {width, height} as ImageBitmap
}

function canvas() {
    return screen.getByRole("img", {name: "Preview of photo.jpg"}) as HTMLCanvasElement
}

/** The arguments and the returned bitmap of the most recent renderPixelEffect call. */
function lastRender() {
    const mock = vi.mocked(renderPixelEffect).mock
    const [source, pixelSize, apply] = mock.lastCall!
    const result = mock.results.at(-1)!.value as ImageBitmap
    return {source, pixelSize, apply, result}
}

// jsdom can't draw – the canvas gets a fake 2D context that records drawImage
let drawImage: ReturnType<typeof vi.fn>

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState())
    drawImage = vi.fn()
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({drawImage} as unknown as RenderingContext)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.mocked(renderPixelEffect).mockClear()
    vi.mocked(dither).mockClear()
})

/** Every effect has to show its result the same way. */
function expectResultShown() {
    const {result} = lastRender()
    // The canvas resolution must match the result, otherwise it stays 300 × 150 and crops the image
    expect([canvas().width, canvas().height]).toEqual([result.width, result.height])
    expect(drawImage).toHaveBeenLastCalledWith(result, 0, 0)
    // The bitmap is drawn now and not needed anymore – free its memory
    expect(result.close).toHaveBeenCalledOnce()
}

describe("ImageCanvas", () => {
    it("is exposed to screen readers as a labelled image", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

        expect(canvas().tagName).toBe("CANVAS")
    })

    describe("without an implemented effect", () => {
        it("shows the original at full resolution", () => {
            const image = bitmap(800, 600)
            render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)

            const {source, pixelSize, apply} = lastRender()
            expect(source).toBe(image)
            expect(pixelSize).toBe(1)
            // Passes the image through unchanged
            const pixels = {} as ImageData
            expect(apply(pixels)).toBe(pixels)
            expect(dither).not.toHaveBeenCalled()
        })

        it("draws the result onto a canvas of the same size", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            expectResultShown()
        })
    })

    describe("dithering", () => {
        beforeEach(() => useEditorStore.getState().setEffect("dithering"))

        it("renders with the dithering pixel size and params", () => {
            useEditorStore.getState().updateDithering({pixelSize: 4})
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            const {pixelSize, apply} = lastRender()
            expect(pixelSize).toBe(4)

            const pixels = {} as ImageData
            apply(pixels)
            expect(dither).toHaveBeenCalledWith(pixels, useEditorStore.getState().dithering)
        })

        it("draws the result onto a canvas of the same size", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            expectResultShown()
        })

        it("re-renders live when a slider changes", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
            vi.mocked(renderPixelEffect).mockClear()

            act(() => useEditorStore.getState().updateDithering({contrast: 40}))

            expect(renderPixelEffect).toHaveBeenCalledOnce()
            lastRender().apply({} as ImageData)
            expect(dither).toHaveBeenLastCalledWith({}, expect.objectContaining({contrast: 40}))
        })

        it("doesn't re-render when another effect's params change", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
            vi.mocked(renderPixelEffect).mockClear()

            act(() => useEditorStore.getState().updateHalftone({gridSize: 20}))

            expect(renderPixelEffect).not.toHaveBeenCalled()
        })
    })

    it("re-renders when switching the effect", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
        vi.mocked(renderPixelEffect).mockClear()

        act(() => useEditorStore.getState().setEffect("dithering"))

        expect(renderPixelEffect).toHaveBeenCalledOnce()
        expect(lastRender().pixelSize).toBe(useEditorStore.getState().dithering.pixelSize)
    })

    it("re-renders when the bitmap changes, but not when only the label changes", () => {
        const image = bitmap(800, 600)
        const {rerender} = render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)
        vi.mocked(renderPixelEffect).mockClear()

        rerender(<ImageCanvas bitmap={image} label="Preview of other.jpg" />)
        expect(renderPixelEffect).not.toHaveBeenCalled()

        const next = bitmap(400, 1200)
        rerender(<ImageCanvas bitmap={next} label="Preview of other.jpg" />)
        expect(lastRender().source).toBe(next)
    })
})
