import {afterEach, beforeEach, describe, expect, it} from "vitest"
import {act, cleanup, render, screen} from "@testing-library/react"
import {StatusBar} from "./StatusBar.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import type {LoadedImage} from "../../lib/loadImage.ts"

const image = {name: "photo.jpg", width: 2400, height: 1600} as LoadedImage

beforeEach(() => useEditorStore.setState(useEditorStore.getInitialState()))
afterEach(cleanup)

describe("StatusBar", () => {
    it("says so when no image is loaded", () => {
        render(<StatusBar />)

        expect(screen.getByText("No image loaded")).toBeTruthy()
    })

    it("shows size and name while the first render is still running", () => {
        useEditorStore.setState({image})
        const {container} = render(<StatusBar />)

        expect(container.textContent).toBe("2400 × 1600 · photo.jpg")
    })

    it("adds the render time, rounded to whole milliseconds", () => {
        useEditorStore.setState({image, renderMs: 37.6})
        const {container} = render(<StatusBar />)

        expect(container.textContent).toBe("2400 × 1600 · photo.jpg · 38 ms")
    })

    it("shows 0 ms instead of hiding it", () => {
        useEditorStore.setState({image, renderMs: 0})
        const {container} = render(<StatusBar />)

        expect(container.textContent).toBe("2400 × 1600 · photo.jpg · 0 ms")
    })

    describe("message", () => {
        it("appears in a live region", () => {
            useEditorStore.setState({message: "Rendering failed"})
            render(<StatusBar />)

            expect(screen.getByRole("status").textContent).toBe("Rendering failed")
        })

        it("keeps the status next to it", () => {
            useEditorStore.setState({image, message: "Rendering failed"})
            const {container} = render(<StatusBar />)

            expect(container.textContent).toBe("2400 × 1600 · photo.jpg" + "Rendering failed")
        })

        it.each([
            ["without an image", null],
            ["with an image", image],
        ])("has its live region ready before there is text, %s", (_, loaded) => {
            useEditorStore.setState({image: loaded})
            render(<StatusBar />)
            const region = screen.getByRole("status")
            expect(region.textContent).toBe("")

            act(() => useEditorStore.setState({message: "Rendering failed"}))

            // The same element – a newly added live region stays silent in screen readers
            expect(screen.getByRole("status")).toBe(region)
            expect(region.textContent).toBe("Rendering failed")
        })

        it("keeps the live region when an image arrives", () => {
            render(<StatusBar />)
            const region = screen.getByRole("status")

            act(() => useEditorStore.setState({image}))

            expect(screen.getByRole("status")).toBe(region)
        })
    })
})
