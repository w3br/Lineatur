import type {AsciiParams} from "../../store/params.ts"
import {toGray} from "../tone.ts"
import {asciiChar} from "./ascii.ts"

export function renderAscii(source: ImageBitmap, params: AsciiParams): ImageBitmap {
    const cellH = params.cellSize
    const cellW = params.cellSize * 0.6 // 0.6 is the average width/height ratio of a monospace font
    const cols = Math.floor(Math.max(1, source.width / cellW))
    const rows = Math.floor(Math.max(1, source.height / cellH))

    // Shrink the image to one pixel per character – the browser averages each cell for us
    const small = new OffscreenCanvas(cols, rows)
    const context = small.getContext("2d", {willReadFrequently: true})
    if (!context) throw new Error("Could not create a 2D canvas context")

    context.imageSmoothingQuality = "high"
    context.drawImage(source, 0, 0, cols, rows)
    const cells = context.getImageData(0, 0, cols, rows)

    // No willReadFrequently here: this canvas is never read back, and the option would keep it off the GPU
    const out = new OffscreenCanvas(source.width, source.height)
    const ctx = out.getContext("2d")
    if (!ctx) throw new Error("Could not create a 2D canvas context")

    ctx.fillStyle = params.background
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.font = `${cellH}px ui-monospace, monospace`
    ctx.textBaseline = "top"
    // Set once: assigning fillStyle parses a CSS color, which adds up over thousands of characters
    ctx.fillStyle = params.foreground

    const gray = toGray(cells, params.brightness, params.contrast)

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col
            const char = asciiChar(gray[index], params.characters, params.invert)
            // The background is already there – drawing a space would only cost time
            if (char === " ") continue

            if (params.colorFromImage) {
                const p = index * 4
                ctx.fillStyle = `rgb(${cells.data[p]}, ${cells.data[p + 1]}, ${cells.data[p + 2]})`
            }
            ctx.fillText(char, col * cellW, row * cellH)
        }
    }

    return out.transferToImageBitmap()
}
