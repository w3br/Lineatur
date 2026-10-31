import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import App from "./App.tsx"
import {useEditorStore} from "./store/useEditorStore.ts"
import {closeImage, loadImage, type LoadedImage} from "./lib/loadImage.ts"

// jsdom has no createImageBitmap – partial mock: only decoding and releasing are faked
vi.mock("./lib/loadImage.ts", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./lib/loadImage.ts")>()),
    loadImage: vi.fn(),
    closeImage: vi.fn(),
}))

// jsdom has no Worker – the renderer is tested on its own in src/worker
vi.mock("./worker/useRenderer.ts", () => ({useRenderer: vi.fn(() => null)}))

function fakeImage(name: string) {
    const bitmap = {width: 800, height: 600} as ImageBitmap
    return {name, width: 800, height: 600, original: bitmap, preview: bitmap} as LoadedImage
}

const png = new File(["png"], "photo.png", {type: "image/png"})

// jsdom has no matchMedia
function setWidth(mobile: boolean) {
    window.matchMedia = vi.fn(() => ({
        matches: mobile,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia
}

function setup() {
    const {container} = render(<App />)
    // The top bar's own hidden input – the drop zone renders a second one while no image is loaded
    const input = container.querySelector<HTMLInputElement>('header input[type="file"]')!
    // hidden: on a phone it sits in the closed menu
    const openButton = screen.getByRole("button", {name: "Open image", hidden: true})
    return {input, openButton}
}

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState())
    setWidth(false)
    // jsdom can't draw – ImageCanvas only needs getContext not to crash
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.mocked(loadImage).mockReset()
    vi.mocked(closeImage).mockReset()
})

describe("Open image button", () => {
    it("is a labelled button in the top bar", () => {
        const {openButton} = setup()

        expect(openButton.closest("header")).not.toBeNull()
        // IconButton shows the label as tooltip too
        expect(openButton.title).toBe("Open image")
    })

    it("opens the file dialog through its own hidden input", async () => {
        const user = userEvent.setup()
        const {input, openButton} = setup()
        const click = vi.spyOn(input, "click")

        await user.click(openButton)

        expect(click).toHaveBeenCalledOnce()
    })

    it("loads the chosen file", async () => {
        const user = userEvent.setup()
        vi.mocked(loadImage).mockResolvedValueOnce(fakeImage("photo.png"))
        const {input} = setup()

        await user.upload(input, png)

        expect(await screen.findByRole("img", {name: "Preview of photo.png"})).toBeTruthy()
    })

    it("replaces an image that is already shown – without dragging (WCAG 2.5.7)", async () => {
        const user = userEvent.setup()
        const previous = fakeImage("old.png")
        useEditorStore.getState().setImage(previous)
        vi.mocked(loadImage).mockResolvedValueOnce(fakeImage("photo.png"))
        const {input} = setup()

        await user.upload(input, png)

        expect(await screen.findByRole("img", {name: "Preview of photo.png"})).toBeTruthy()
        expect(closeImage).toHaveBeenCalledExactlyOnceWith(previous)
    })

    it("stays enabled without an image, unlike Export", () => {
        const {openButton} = setup()

        expect(openButton.getAttribute("aria-disabled")).toBeNull()
        expect(screen.getByRole<HTMLButtonElement>("button", {name: "Export"}).disabled).toBe(true)
    })

    it("comes before undo and redo in the tab order", async () => {
        const user = userEvent.setup()
        setup()

        // Effect switcher is one tab stop (roving tabindex), then the file and history buttons
        await user.tab()
        expect(document.activeElement).toBe(screen.getByRole("radio", {name: "Halftone"}))
        await user.tab()
        expect(document.activeElement).toBe(screen.getByRole("button", {name: "Open image"}))
        await user.tab()
        expect(document.activeElement).toBe(screen.getByRole("button", {name: "Undo"}))
        await user.tab()
        expect(document.activeElement).toBe(screen.getByRole("button", {name: "Redo"}))
    })
})

describe("top bar", () => {
    it("keeps the controls in the bar on a desktop", () => {
        setup()

        expect(screen.getByRole("radio", {name: "Halftone"}).closest("header")).not.toBeNull()
        expect(screen.queryByRole("button", {name: "Menu"})).toBeNull()
    })

    describe("on a phone", () => {
        beforeEach(() => setWidth(true))

        it("moves everything into one menu", () => {
            setup()
            const menu = document.querySelector("[popover]")!

            for (const name of ["Undo", "Redo", "Open image", "Export"]) {
                expect(menu.contains(screen.getByRole("button", {name, hidden: true}))).toBe(true)
            }
            expect(menu.contains(screen.getByRole("radio", {name: "ASCII", hidden: true}))).toBe(true)
        })

        it("has exactly one switcher and one export button", () => {
            setup()

            expect(screen.getAllByRole("radio", {name: "Halftone", hidden: true})).toHaveLength(1)
            expect(screen.getAllByRole("button", {name: "Export", hidden: true})).toHaveLength(1)
        })

        it("opens the export dialog outside of the menu – inside, it would be hidden with it", async () => {
            const user = userEvent.setup()
            HTMLElement.prototype.hidePopover = vi.fn()
            HTMLDialogElement.prototype.showModal = vi.fn()
            useEditorStore.getState().setImage(fakeImage("photo.png"))
            setup()

            await user.click(screen.getByRole("button", {name: "Export", hidden: true}))

            expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledOnce()
            expect(document.querySelector("[popover] dialog")).toBeNull()
        })
    })
})
