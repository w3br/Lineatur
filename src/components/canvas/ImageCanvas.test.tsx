import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, render, screen} from "@testing-library/react"
import {ImageCanvas} from "./ImageCanvas.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {renderEffect} from "../../lib/render.ts"
import {dither} from "../../effects/dither"

// Drawing is tested in render.test.ts and the effects' own tests –
// here only the wiring matters: what gets rendered with which settings, and when
vi.mock("../../lib/render.ts", () => ({renderEffect: vi.fn()}))
vi.mock("../../effects/dither/index.ts", () => ({dither: vi.fn((image: ImageData) => image)}))

// ImageBitmap doesn't exist in jsdom – the component only passes it on
function bitmap(width: number, height: number) {
    return {width, height} as ImageBitmap
}

function canvas() {
    return screen.getByRole("img", {name: "Preview of photo.jpg"}) as HTMLCanvasElement
}

/** The arguments of the most recent renderEffect call. */
function lastRender() {
    const [source, target, pixelSize, apply] = vi.mocked(renderEffect).mock.lastCall!
    return {source, target, pixelSize, apply}
}

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState())
    // Keeps the timing log out of the test output
    vi.spyOn(console, "debug").mockImplementation(() => {})
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.mocked(renderEffect).mockClear()
    vi.mocked(dither).mockClear()
})

describe("ImageCanvas", () => {
    it("is exposed to screen readers as a labelled image", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

        expect(canvas().tagName).toBe("CANVAS")
    })

    it("shows the original while no effect is implemented yet", () => {
        const image = bitmap(800, 600)
        render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)

        const {source, target, pixelSize, apply} = lastRender()
        expect(source).toBe(image)
        expect(target).toBe(canvas())
        expect(pixelSize).toBe(1)
        // Passes the image through unchanged
        const pixels = {} as ImageData
        expect(apply(pixels)).toBe(pixels)
        expect(dither).not.toHaveBeenCalled()
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

        it("re-renders live when a slider changes", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
            vi.mocked(renderEffect).mockClear()

            act(() => useEditorStore.getState().updateDithering({contrast: 40}))

            expect(renderEffect).toHaveBeenCalledOnce()
            lastRender().apply({} as ImageData)
            expect(dither).toHaveBeenLastCalledWith({}, expect.objectContaining({contrast: 40}))
        })

        it("doesn't re-render when another effect's params change", () => {
            render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
            vi.mocked(renderEffect).mockClear()

            act(() => useEditorStore.getState().updateHalftone({gridSize: 20}))

            expect(renderEffect).not.toHaveBeenCalled()
        })
    })

    it("re-renders when switching the effect", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
        vi.mocked(renderEffect).mockClear()

        act(() => useEditorStore.getState().setEffect("dithering"))

        expect(renderEffect).toHaveBeenCalledOnce()
        expect(lastRender().pixelSize).toBe(useEditorStore.getState().dithering.pixelSize)
    })

    it("re-renders when the bitmap changes, but not when only the label changes", () => {
        const image = bitmap(800, 600)
        const {rerender} = render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)
        vi.mocked(renderEffect).mockClear()

        rerender(<ImageCanvas bitmap={image} label="Preview of other.jpg" />)
        expect(renderEffect).not.toHaveBeenCalled()

        const next = bitmap(400, 1200)
        rerender(<ImageCanvas bitmap={next} label="Preview of other.jpg" />)
        expect(lastRender().source).toBe(next)
    })
})
