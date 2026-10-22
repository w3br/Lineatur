type Apply = (image: ImageData) => ImageData

export function renderPixelEffect(source: ImageBitmap, pixelSize: number, apply: Apply): ImageBitmap {
    const width = Math.max(1, Math.round(source.width / pixelSize))
    const height = Math.max(1, Math.round(source.height / pixelSize))
    const work = new OffscreenCanvas(width, height)
    const workContext = work.getContext("2d", {willReadFrequently: true})
    if (!workContext) throw new Error("Could not create a 2D canvas context")

    workContext.drawImage(source, 0, 0, width, height)
    const result = apply(workContext.getImageData(0, 0, width, height))
    workContext.putImageData(result, 0, 0)

    const out = new OffscreenCanvas(source.width, source.height)
    const outContext = out.getContext("2d")
    if (!outContext) throw new Error("Could not create a 2D canvas context")
    outContext.imageSmoothingEnabled = false
    outContext.drawImage(work, 0, 0, source.width, source.height)

    return out.transferToImageBitmap()
}
