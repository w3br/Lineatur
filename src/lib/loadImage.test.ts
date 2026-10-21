import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {closeImage, isSupportedImage, loadImage, type LoadedImage} from "./loadImage.ts"

function file(type: string, name = "image") {
    return new File(["x"], name, {type})
}

describe("isSupportedImage", () => {
    it.each(["image/png", "image/jpeg", "image/webp"])("accepts %s", (type) => {
        expect(isSupportedImage(file(type))).toBe(true)
    })

    it.each([
        "application/pdf",
        "image/gif",
        "image/svg+xml",
        "image/heic",
        "", // unknown type, e.g. a file without extension
    ])("rejects %j", (type) => {
        expect(isSupportedImage(file(type))).toBe(false)
    })
})

describe("loadImage", () => {
    // jsdom can neither decode images nor draw, so both are faked:
    // decoding a File returns a bitmap of the given size, decoding a canvas returns the canvas size
    let decodedSize = {width: 0, height: 0}
    const createImageBitmap = vi.fn(async (source: File | HTMLCanvasElement) =>
        source instanceof File
            ? ({...decodedSize} as ImageBitmap)
            : ({width: source.width, height: source.height} as ImageBitmap),
    )

    beforeEach(() => {
        vi.stubGlobal("createImageBitmap", createImageBitmap)
        vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
            drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
        createImageBitmap.mockClear()
    })

    it("rejects unsupported files before decoding them", async () => {
        await expect(loadImage(file("application/pdf"))).rejects.toThrow("Unsupported file type: application/pdf")
        expect(createImageBitmap).not.toHaveBeenCalled()
    })

    it("names an unknown type in the error message", async () => {
        await expect(loadImage(file(""))).rejects.toThrow("Unsupported file type: unknown")
    })

    it("keeps name and original size", async () => {
        decodedSize = {width: 2400, height: 1600}

        const image = await loadImage(file("image/jpeg", "photo.jpg"))

        expect(image).toMatchObject({name: "photo.jpg", width: 2400, height: 1600})
    })

    it("uses the original as preview when it is small enough", async () => {
        decodedSize = {width: 800, height: 600}

        const image = await loadImage(file("image/png"))

        // Same object – nothing was resized
        expect(image.preview).toBe(image.original)
    })

    it("doesn't resize an image of exactly 1200 px", async () => {
        decodedSize = {width: 1200, height: 900}

        const image = await loadImage(file("image/png"))

        expect(image.preview).toBe(image.original)
    })

    it.each([
        ["landscape", 6000, 4000, 1200, 800],
        ["portrait", 1000, 3000, 400, 1200],
    ])(
        "scales a large %s image down to 1200 px on the long side",
        async (_, width, height, previewWidth, previewHeight) => {
            decodedSize = {width, height}

            const image = await loadImage(file("image/png"))

            expect(image.preview).not.toBe(image.original)
            expect(image.preview).toMatchObject({width: previewWidth, height: previewHeight})
            // The original keeps its full size for export
            expect(image.original).toMatchObject({width, height})
        },
    )
})

describe("closeImage", () => {
    function bitmap() {
        return {close: vi.fn()} as unknown as ImageBitmap
    }

    it("releases both bitmaps of a resized image", () => {
        const original = bitmap()
        const preview = bitmap()

        closeImage({original, preview} as LoadedImage)

        expect(original.close).toHaveBeenCalledOnce()
        expect(preview.close).toHaveBeenCalledOnce()
    })

    it("releases a small image only once, because preview and original are the same bitmap", () => {
        const shared = bitmap()

        closeImage({original: shared, preview: shared} as LoadedImage)

        expect(shared.close).toHaveBeenCalledOnce()
    })
})
