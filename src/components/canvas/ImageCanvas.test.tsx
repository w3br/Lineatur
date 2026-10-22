import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, render, screen} from "@testing-library/react"
import {ImageCanvas} from "./ImageCanvas.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {useRenderer} from "../../worker/useRenderer.ts"
import type {RenderResult} from "../../worker/messages.ts"

// The worker and the hook are tested in src/worker – here only the wiring matters:
// which job goes to the renderer, and how its result is shown
vi.mock("../../worker/useRenderer.ts", () => ({useRenderer: vi.fn(() => null)}))

// ImageBitmap doesn't exist in jsdom – the component only passes it on
function bitmap(width: number, height: number) {
    return {width, height} as ImageBitmap
}

function canvas() {
    return screen.getByRole("img", {name: "Preview of photo.jpg"}) as HTMLCanvasElement
}

/** The arguments of the most recent useRenderer call. */
function lastCall() {
    const [source, job] = vi.mocked(useRenderer).mock.lastCall!
    return {source, job}
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
    vi.mocked(useRenderer).mockReset()
    vi.mocked(useRenderer).mockReturnValue(null)
})

describe("ImageCanvas", () => {
    it("is exposed to screen readers as a labelled image", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

        expect(canvas().tagName).toBe("CANVAS")
    })

    describe("job", () => {
        it("renders the bitmap with the active effect and its params", () => {
            const image = bitmap(800, 600)
            render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)

            const {halftone} = useEditorStore.getState()
            expect(lastCall()).toEqual({source: image, job: {effect: "halftone", params: halftone}})
        })

        it("switches job when the effect changes", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            act(() => useEditorStore.getState().setEffect("dithering"))

            const {dithering} = useEditorStore.getState()
            expect(lastCall().job).toEqual({effect: "dithering", params: dithering})
        })

        it("hands over a new job when a slider of the active effect changes", () => {
            useEditorStore.getState().setEffect("dithering")
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            act(() => useEditorStore.getState().updateDithering({contrast: 40}))

            expect(lastCall().job.params).toEqual(expect.objectContaining({contrast: 40}))
        })

        // Pitfall 4: a new object on every render would look like a new job to the renderer
        it("keeps the same job object when unrelated state changes", () => {
            useEditorStore.getState().setEffect("dithering")
            const {rerender} = render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
            const before = lastCall().job

            act(() => useEditorStore.getState().updateHalftone({gridSize: 20}))
            rerender(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of other.jpg" />)

            expect(lastCall().job).toBe(before)
        })
    })

    describe("result", () => {
        function shown(width: number, height: number, ms = 38): RenderResult {
            return {bitmap: bitmap(width, height), ms}
        }

        it("draws nothing until the first result arrives", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            expect(drawImage).not.toHaveBeenCalled()
        })

        it("draws the result onto a canvas of the same size", () => {
            // Smaller than the source, so the canvas size proves where it came from
            const result = shown(799, 599)
            vi.mocked(useRenderer).mockReturnValue(result)
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            // The resolution must match the result, otherwise it stays 300 × 150 and crops the image
            expect([canvas().width, canvas().height]).toEqual([799, 599])
            expect(drawImage).toHaveBeenCalledWith(result.bitmap, 0, 0)
        })

        it("reports the render time for the status bar", () => {
            vi.mocked(useRenderer).mockReturnValue(shown(800, 600, 38))
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            expect(useEditorStore.getState().renderMs).toBe(38)
        })

        it("leaves freeing the bitmap to the renderer", () => {
            const result = {bitmap: {width: 800, height: 600, close: vi.fn()}, ms: 1} as unknown as RenderResult
            vi.mocked(useRenderer).mockReturnValue(result)
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

            // StrictMode may draw the same result twice – closing it here would break the second draw
            expect(result.bitmap.close).not.toHaveBeenCalled()
        })
    })
})
