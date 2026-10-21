type Apply = (image: ImageData) => ImageData

/**
 * Runs an effect on a smaller copy of the image and scales the result back up
 * without smoothing – that is what makes "pixel size" look like big, crisp pixels.
 */
export function renderEffect(source: ImageBitmap, target: HTMLCanvasElement, pixelSize: number, apply: Apply) {
    const width = Math.max(1, Math.round(source.width / pixelSize))
    const height = Math.max(1, Math.round(source.height / pixelSize))

    const work = document.createElement("canvas")
    work.width = width
    work.height = height
    const workContext = work.getContext("2d", {willReadFrequently: true})
    if (!workContext) return

    workContext.drawImage(source, 0, 0, width, height)
    const result = apply(workContext.getImageData(0, 0, width, height))
    workContext.putImageData(result, 0, 0)

    target.width = source.width
    target.height = source.height
    const targetContext = target.getContext("2d")
    if (!targetContext) return

    targetContext.imageSmoothingEnabled = false
    targetContext.drawImage(work, 0, 0, target.width, target.height)
}
