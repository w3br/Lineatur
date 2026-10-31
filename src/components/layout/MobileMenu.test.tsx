import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MobileMenu} from "./MobileMenu.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import type {LoadedImage} from "../../lib/loadImage.ts"

const onOpenImage = vi.fn()
const onExport = vi.fn()
const calls: string[] = []

function setup() {
    render(<MobileMenu effectSwitcher={<p>Effect switcher</p>} onOpenImage={onOpenImage} onExport={onExport} />)
    return {
        user: userEvent.setup(),
        menuButton: screen.getByRole("button", {name: "Menu", hidden: true}),
        // Found by attribute: a closed popover has no accessible name
        menu: document.querySelector<HTMLElement>("[popover]")!,
    }
}

/** jsdom doesn't fire the toggle event – a real browser reports open and close through it. */
function toggle(menu: HTMLElement, newState: "open" | "closed") {
    const event = new Event("toggle")
    Object.assign(event, {newState})
    fireEvent(menu, event)
}

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState())
    calls.length = 0
    // jsdom has no popovers
    HTMLElement.prototype.hidePopover = vi.fn(() => {
        calls.push("hide")
    })
    onOpenImage.mockImplementation(() => calls.push("openImage"))
    onExport.mockImplementation(() => calls.push("export"))
})

afterEach(() => {
    cleanup()
    vi.clearAllMocks()
})

describe("MobileMenu", () => {
    it("connects the button to the menu", () => {
        const {menuButton, menu} = setup()

        expect(menu.getAttribute("popover")).toBe("auto")
        expect(menuButton.getAttribute("popovertarget")).toBe(menu.id)
    })

    it("comes right after its button, so the tab order stays logical", () => {
        const {menuButton, menu} = setup()

        expect(menuButton.nextElementSibling).toBe(menu)
    })

    it("tells assistive technology whether it is open", () => {
        const {menuButton, menu} = setup()
        expect(menuButton.getAttribute("aria-expanded")).toBe("false")

        toggle(menu, "open")
        expect(menuButton.getAttribute("aria-expanded")).toBe("true")

        toggle(menu, "closed")
        expect(menuButton.getAttribute("aria-expanded")).toBe("false")
    })

    it("shows the effect switcher it is given", () => {
        setup()

        expect(screen.getByText("Effect switcher")).toBeTruthy()
    })

    it("closes before opening the file picker", async () => {
        const {user} = setup()

        await user.click(screen.getByRole("button", {name: "Open image", hidden: true}))

        expect(calls).toEqual(["hide", "openImage"])
    })

    it("closes before opening the export, so focus can return to the menu button", async () => {
        useEditorStore.setState({image: {} as LoadedImage})
        const {user} = setup()

        await user.click(screen.getByRole("button", {name: "Export", hidden: true}))

        expect(calls).toEqual(["hide", "export"])
    })

    it("can not export without an image", () => {
        setup()

        expect(screen.getByRole<HTMLButtonElement>("button", {name: "Export", hidden: true}).disabled).toBe(true)
    })

    it("keeps undo focusable when there is nothing to undo, but does nothing", async () => {
        const undo = vi.fn()
        useEditorStore.setState({undo})
        const {user} = setup()
        const button = screen.getByRole<HTMLButtonElement>("button", {name: "Undo", hidden: true})

        await user.click(button)

        expect(button.disabled).toBe(false)
        expect(button.getAttribute("aria-disabled")).toBe("true")
        expect(undo).not.toHaveBeenCalled()
    })

    it("stays open for undo and redo, so the result can be followed", async () => {
        useEditorStore.getState().updateHalftone({gridSize: 12})
        const {user} = setup()

        await user.click(screen.getByRole("button", {name: "Undo", hidden: true}))
        expect(useEditorStore.getState().halftone.gridSize).toBe(8)

        await user.click(screen.getByRole("button", {name: "Redo", hidden: true}))
        expect(useEditorStore.getState().halftone.gridSize).toBe(12)
        expect(calls).toEqual([])
    })
})
