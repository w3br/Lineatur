import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {downloadBlob, exportFileName} from "./downloadBlob.ts"

describe("downloadBlob", () => {
    const blob = new Blob(["pixels"])
    const objectUrl = "blob:http://localhost/fake"
    let click: ReturnType<typeof vi.spyOn>
    // Read at click time – that's the moment the link has to be complete
    let clicked: {href: string; download: string} | null

    beforeEach(() => {
        vi.useFakeTimers()
        clicked = null
        // jsdom has no object URLs and no real navigation
        URL.createObjectURL = vi.fn(() => objectUrl)
        URL.revokeObjectURL = vi.fn()
        click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
            clicked = {href: this.href, download: this.download}
        })
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it("clicks a link to the blob with the given file name", () => {
        downloadBlob(blob, "photo-lineatur-halftone.png")

        expect(URL.createObjectURL).toHaveBeenCalledWith(blob)
        expect(click).toHaveBeenCalledOnce()
        expect(clicked).toEqual({href: objectUrl, download: "photo-lineatur-halftone.png"})
    })

    it("keeps the url alive right after the click, while the download starts", () => {
        downloadBlob(blob, "photo.png")

        expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    })

    it("frees the url exactly once after the delay", () => {
        downloadBlob(blob, "photo.png")

        vi.advanceTimersByTime(1000)

        expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
        expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl)
    })
})

describe("exportFileName", () => {
    it("replaces the extension and adds app and effect", () => {
        expect(exportFileName("photo.jpg", "halftone", "png")).toBe("photo-lineatur-halftone.png")
    })

    it("only removes the last extension", () => {
        expect(exportFileName("trip.2024.jpg", "dithering", "png")).toBe("trip.2024-lineatur-dithering.png")
    })

    it("works without an extension", () => {
        expect(exportFileName("photo", "ascii", "txt")).toBe("photo-lineatur-ascii.txt")
    })

    it.each(["png", "jpg", "txt"] as const)("ends in .%s", (format) => {
        expect(exportFileName("photo.webp", "ascii", format)).toBe(`photo-lineatur-ascii.${format}`)
    })
})
