import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {cleanup, render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {ExportDialog} from "./ExportDialog.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {exportImage} from "../../worker/exportImage.ts"
import {downloadBlob} from "../../lib/downloadBlob.ts"
import type {LoadedImage} from "../../lib/loadImage.ts"
import {defaultAscii, defaultHalftone} from "../../store/params.ts"

// jsdom has no Worker – exportImage has its own tests
vi.mock("../../worker/exportImage.ts", () => ({exportImage: vi.fn()}))
// Only the click on a link is faked – the real file name is part of what's tested
vi.mock("../../lib/downloadBlob.ts", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../../lib/downloadBlob.ts")>()),
    downloadBlob: vi.fn(),
}))

const bitmap = {width: 1200, height: 800} as ImageBitmap
const image: LoadedImage = {name: "photo.jpg", width: 4096, height: 2731, original: bitmap, preview: bitmap}
const blob = new Blob(["pixels"])

function exportButton() {
    return screen.getByRole<HTMLButtonElement>("button", {name: "Export"})
}

/** Renders the dialog and opens it, as a click on the top bar's button does. */
async function openDialog() {
    const user = userEvent.setup()
    render(<ExportDialog />)
    await user.click(exportButton())
    return user
}

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState())
    useEditorStore.setState({image})
    vi.mocked(exportImage).mockResolvedValue(blob)
    // jsdom can't run a modal – open and close only need to flip the attribute
    HTMLDialogElement.prototype.showModal = function () {
        this.open = true
    }
    HTMLDialogElement.prototype.close = function () {
        this.open = false
    }
})

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.mocked(exportImage).mockReset()
    vi.mocked(downloadBlob).mockReset()
})

describe("ExportDialog", () => {
    it("can't be opened without an image", () => {
        useEditorStore.setState({image: null})
        render(<ExportDialog />)

        expect(exportButton().disabled).toBe(true)
    })

    it("opens a labelled dialog with the export size", async () => {
        await openDialog()

        expect(screen.getByRole("dialog", {name: "Export image"})).toBeTruthy()
        expect(screen.getByRole("status").textContent).toBe("4096 × 2731 px")
    })

    it("offers txt only for ascii", async () => {
        await openDialog()
        expect(screen.queryByRole("radio", {name: "TXT"})).toBeNull()

        cleanup()
        useEditorStore.setState({effect: "ascii"})
        await openDialog()
        expect(screen.getByRole("radio", {name: "TXT"})).toBeTruthy()
    })

    it("exports the current effect in the chosen format, then closes", async () => {
        const user = await openDialog()

        await user.click(screen.getByRole("radio", {name: "JPG"}))
        await user.click(screen.getByRole("button", {name: "Export JPG"}))

        expect(exportImage).toHaveBeenCalledExactlyOnceWith(
            image,
            {effect: "halftone", params: defaultHalftone},
            "jpg",
        )
        expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(blob, "photo-lineatur-halftone.jpg")
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    })

    it("exports ascii as txt and names the file after the effect", async () => {
        useEditorStore.setState({effect: "ascii"})
        const user = await openDialog()

        await user.click(screen.getByRole("radio", {name: "TXT"}))
        expect(screen.getByRole("status").textContent).toBe("Plain text, one line per row")
        await user.click(screen.getByRole("button", {name: "Export TXT"}))

        expect(exportImage).toHaveBeenCalledExactlyOnceWith(image, {effect: "ascii", params: defaultAscii}, "txt")
        expect(downloadBlob).toHaveBeenCalledExactlyOnceWith(blob, "photo-lineatur-ascii.txt")
    })

    it("falls back to png when txt is chosen and the effect changes", async () => {
        useEditorStore.setState({effect: "ascii"})
        const user = await openDialog()
        await user.click(screen.getByRole("radio", {name: "TXT"}))

        useEditorStore.setState({effect: "halftone"})

        expect((await screen.findByRole("radio", {name: "PNG"})).getAttribute("aria-checked")).toBe("true")
    })

    it("locks the buttons and reports progress while exporting", async () => {
        let finish!: (blob: Blob) => void
        vi.mocked(exportImage).mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
        const user = await openDialog()

        await user.click(screen.getByRole("button", {name: "Export PNG"}))

        expect(screen.getByRole("status").textContent).toBe("Exporting…")
        expect(screen.getByRole<HTMLButtonElement>("button", {name: "Exporting…"}).disabled).toBe(true)
        expect(screen.getByRole<HTMLButtonElement>("button", {name: "Cancel"}).disabled).toBe(true)

        finish(blob)
        await waitFor(() => expect(downloadBlob).toHaveBeenCalled())
    })

    it("stays open and shows an error when the export fails", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(exportImage).mockRejectedValueOnce(new Error("Encoding failed"))
        const user = await openDialog()

        await user.click(screen.getByRole("button", {name: "Export PNG"}))

        expect((await screen.findByRole("alert")).textContent).toBe("Export failed – please try again.")
        expect(screen.getByRole("dialog")).toBeTruthy()
        expect(downloadBlob).not.toHaveBeenCalled()
    })

    it("clears an old error when opened again", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        vi.mocked(exportImage).mockRejectedValueOnce(new Error("Encoding failed"))
        const user = await openDialog()
        await user.click(screen.getByRole("button", {name: "Export PNG"}))
        await screen.findByRole("alert")

        await user.click(screen.getByRole("button", {name: "Cancel"}))
        await user.click(exportButton())

        expect(screen.queryByRole("alert")).toBeNull()
    })

    it("closes on cancel without exporting", async () => {
        const user = await openDialog()

        await user.click(screen.getByRole("button", {name: "Cancel"}))

        expect(screen.queryByRole("dialog")).toBeNull()
        expect(exportImage).not.toHaveBeenCalled()
    })
})
