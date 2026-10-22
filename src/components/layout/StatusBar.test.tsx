import {afterEach, beforeEach, describe, expect, it} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"
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
})
