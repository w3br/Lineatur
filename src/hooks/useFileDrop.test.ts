import {afterEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, renderHook} from "@testing-library/react"
import type {DragEvent} from "react"
import {useFileDrop} from "./useFileDrop.ts"

const png = new File(["png"], "photo.png", {type: "image/png"})

// The hook only reads preventDefault and dataTransfer.files, so a plain object is enough
function dragEvent(files: File[] = []) {
    return {preventDefault: vi.fn(), dataTransfer: {files}} as unknown as DragEvent<HTMLElement>
}

afterEach(cleanup)

describe("useFileDrop", () => {
    it("is not dragging initially", () => {
        const {result} = renderHook(() => useFileDrop(vi.fn()))

        expect(result.current.isDragging).toBe(false)
    })

    it("starts dragging on drag over and prevents the browser default", () => {
        const {result} = renderHook(() => useFileDrop(vi.fn()))
        const event = dragEvent()

        act(() => result.current.handlers.onDragOver(event))

        expect(result.current.isDragging).toBe(true)
        // Without preventDefault the browser would open the file in the tab
        expect(event.preventDefault).toHaveBeenCalled()
    })

    it("stops dragging on drag leave", () => {
        const {result} = renderHook(() => useFileDrop(vi.fn()))

        act(() => result.current.handlers.onDragOver(dragEvent()))
        act(() => result.current.handlers.onDragLeave())

        expect(result.current.isDragging).toBe(false)
    })

    it("passes the first dropped file to onFile and stops dragging", () => {
        const onFile = vi.fn()
        const {result} = renderHook(() => useFileDrop(onFile))
        const second = new File(["jpg"], "second.jpg", {type: "image/jpeg"})
        const event = dragEvent([png, second])

        act(() => result.current.handlers.onDragOver(dragEvent()))
        act(() => result.current.handlers.onDrop(event))

        expect(onFile).toHaveBeenCalledExactlyOnceWith(png)
        expect(event.preventDefault).toHaveBeenCalled()
        expect(result.current.isDragging).toBe(false)
    })

    it("ignores a drop without files", () => {
        const onFile = vi.fn()
        const {result} = renderHook(() => useFileDrop(onFile))

        act(() => result.current.handlers.onDrop(dragEvent([])))

        expect(onFile).not.toHaveBeenCalled()
    })
})
