import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, renderHook} from "@testing-library/react"
import {useUndoShortcuts} from "./useUndoShortcuts.ts"

afterEach(cleanup)

function setup() {
    const undo = vi.fn()
    const redo = vi.fn()
    const hook = renderHook(() => useUndoShortcuts(undo, redo))
    return {undo, redo, ...hook}
}

describe("useUndoShortcuts", () => {
    it("undoes on Ctrl+Z", () => {
        const {undo, redo} = setup()
        fireEvent.keyDown(window, {key: "z", ctrlKey: true})
        expect(undo).toHaveBeenCalledOnce()
        expect(redo).not.toHaveBeenCalled()
    })

    it("undoes on Cmd+Z (Mac)", () => {
        const {undo} = setup()
        fireEvent.keyDown(window, {key: "z", metaKey: true})
        expect(undo).toHaveBeenCalledOnce()
    })

    it("redoes on Ctrl+Shift+Z – Shift makes the key uppercase", () => {
        const {undo, redo} = setup()
        fireEvent.keyDown(window, {key: "Z", ctrlKey: true, shiftKey: true})
        expect(redo).toHaveBeenCalledOnce()
        expect(undo).not.toHaveBeenCalled()
    })

    it("redoes on Ctrl+Y", () => {
        const {redo} = setup()
        fireEvent.keyDown(window, {key: "y", ctrlKey: true})
        expect(redo).toHaveBeenCalledOnce()
    })

    it("still undoes with Caps Lock on", () => {
        const {undo} = setup()
        fireEvent.keyDown(window, {key: "Z", ctrlKey: true})
        expect(undo).toHaveBeenCalledOnce()
    })

    it("prevents the browser default only for its own shortcuts", () => {
        setup()
        // fireEvent returns false when preventDefault was called
        expect(fireEvent.keyDown(window, {key: "z", ctrlKey: true})).toBe(false)
        // Ctrl+V must reach the paste handler untouched
        expect(fireEvent.keyDown(window, {key: "v", ctrlKey: true})).toBe(true)
    })

    it("ignores Z without a modifier", () => {
        const {undo, redo} = setup()
        fireEvent.keyDown(window, {key: "z"})
        expect(undo).not.toHaveBeenCalled()
        expect(redo).not.toHaveBeenCalled()
    })

    it("leaves text fields to their native undo", () => {
        const {undo} = setup()
        const input = document.createElement("input")
        input.type = "text"
        document.body.append(input)

        // Bubbles up from the input to window, like a real key press
        fireEvent.keyDown(input, {key: "z", ctrlKey: true})

        expect(undo).not.toHaveBeenCalled()
        input.remove()
    })

    it("still works when a slider has focus", () => {
        const {undo} = setup()
        const slider = document.createElement("input")
        slider.type = "range"
        document.body.append(slider)

        fireEvent.keyDown(slider, {key: "z", ctrlKey: true})

        expect(undo).toHaveBeenCalledOnce()
        slider.remove()
    })

    it("stops listening after unmount", () => {
        const {undo, unmount} = setup()
        unmount()
        fireEvent.keyDown(window, {key: "z", ctrlKey: true})
        expect(undo).not.toHaveBeenCalled()
    })
})
