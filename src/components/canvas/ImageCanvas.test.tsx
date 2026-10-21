import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"
import {ImageCanvas} from "./ImageCanvas.tsx"

// ImageBitmap doesn't exist in jsdom – the component only reads width/height and passes it to drawImage
function bitmap(width: number, height: number) {
    return {width, height} as ImageBitmap
}

// jsdom can't draw, so getContext is replaced with a fake that records the calls
const drawImage = vi.fn()

beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage,
    } as unknown as CanvasRenderingContext2D)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    drawImage.mockClear()
})

function canvas() {
    return screen.getByRole("img", {name: "Preview of photo.jpg"}) as HTMLCanvasElement
}

describe("ImageCanvas", () => {
    it("is exposed to screen readers as a labelled image", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

        expect(canvas().tagName).toBe("CANVAS")
    })

    it("takes its pixel size from the bitmap", () => {
        render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)

        expect(canvas().width).toBe(800)
        expect(canvas().height).toBe(600)
    })

    it("draws the bitmap at the top left corner", () => {
        const image = bitmap(800, 600)
        render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)

        expect(drawImage).toHaveBeenCalledExactlyOnceWith(image, 0, 0)
    })

    it("resizes and redraws when the bitmap changes", () => {
        const {rerender} = render(<ImageCanvas bitmap={bitmap(800, 600)} label="Preview of photo.jpg" />)
        const next = bitmap(400, 1200)

        rerender(<ImageCanvas bitmap={next} label="Preview of photo.jpg" />)

        expect(canvas().width).toBe(400)
        expect(canvas().height).toBe(1200)
        expect(drawImage).toHaveBeenLastCalledWith(next, 0, 0)
    })

    it("doesn't redraw when only the label changes", () => {
        const image = bitmap(800, 600)
        const {rerender} = render(<ImageCanvas bitmap={image} label="Preview of photo.jpg" />)

        rerender(<ImageCanvas bitmap={image} label="Preview of other.jpg" />)

        // The effect depends on [bitmap] only
        expect(drawImage).toHaveBeenCalledOnce()
    })
})
