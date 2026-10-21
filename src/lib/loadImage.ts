export type LoadedImage = {
    name: string
    width: number
    height: number
    /** Full resolution – used for export */
    original: ImageBitmap
    /** Max. 1200 px on the long side – used for the live preview */
    preview: ImageBitmap
}

export const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PREVIEW_MAX = 1200

export function isSupportedImage(file: File): boolean {
    return ACCEPTED_TYPES.includes(file.type)
}

export async function loadImage(file: File): Promise<LoadedImage> {
    if (!isSupportedImage(file)) {
        throw new Error(`Unsupported file type: ${file.type || 'unknown'}`)
    }

    const original = await createImageBitmap(file)
    const scale = Math.min(1, PREVIEW_MAX / Math.max(original.width, original.height))
    const preview = scale === 1 ? original : await resize(original, scale)

    return { name: file.name, width: original.width, height: original.height, original, preview }
}

/** Draws the bitmap smaller onto a temporary canvas – works in every browser. */
async function resize(bitmap: ImageBitmap, scale: number): Promise<ImageBitmap> {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is not supported')

    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return createImageBitmap(canvas)
}

/** Disposes of the previously loaded image */
export function closeImage(image: LoadedImage): void {
    if (image.original!==image.preview){
        image.preview.close()
    }
    image.original.close();
}