export type LoadedImage = {
    name: string
    width: number
    height: number
    /** Max. 4096 px on the long side – used for export */
    original: ImageBitmap
    /** Max. 1200 px on the long side – used for the live preview */
    preview: ImageBitmap
}

export const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const PREVIEW_MAX = 1200
// Safari limits a canvas to about 16.7 megapixels (4096²) and fails silently above that
const ORIGINAL_MAX = 4096

export function isSupportedImage(file: File): boolean {
    return ACCEPTED_TYPES.includes(file.type)
}

export async function loadImage(file: File): Promise<LoadedImage> {
    if (!isSupportedImage(file)) {
        throw new Error(`Unsupported file type: ${file.type || "unknown"}`)
    }

    const decoded = await createImageBitmap(file)
    const original = await fitWithin(decoded, ORIGINAL_MAX)
    // Limiting here, not at export: preview, scale factor and the size shown in the UI stay in sync
    if (original !== decoded) decoded.close()
    const preview = await fitWithin(original, PREVIEW_MAX)

    return {name: file.name, width: original.width, height: original.height, original, preview}
}

/** Returns the same bitmap when it already fits, otherwise a smaller copy. */
function fitWithin(bitmap: ImageBitmap, max: number): ImageBitmap | Promise<ImageBitmap> {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    return scale === 1 ? bitmap : resize(bitmap, scale)
}

/** Draws the bitmap smaller onto a temporary canvas – works in every browser. */
async function resize(bitmap: ImageBitmap, scale: number): Promise<ImageBitmap> {
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Canvas 2D is not supported")

    context.imageSmoothingQuality = "high"
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return createImageBitmap(canvas)
}

/** Disposes of the previously loaded image */
export function closeImage(image: LoadedImage): void {
    if (image.original !== image.preview) {
        image.preview.close()
    }
    image.original.close()
}
