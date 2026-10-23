import type {HalftoneParams} from "../../store/params.ts"
import {toGray} from "../tone.ts"
import {hexToRgb} from "../../lib/color.ts"

export function halftone(image: ImageData, params: HalftoneParams): ImageData {
    const gray = toGray(image, params.brightness, params.contrast)
    const s = params.gridSize
    const cols = Math.ceil(image.width / s)
    const rows = Math.ceil(image.height / s)

    const sums = new Float32Array(cols * rows)
    const counts = new Uint32Array(cols * rows)

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const col = Math.floor(x / s)
            const row = Math.floor(y / s)

            const cell = row * cols + col

            const index = y * image.width + x
            sums[cell] += gray[index]
            counts[cell] += 1
        }
    }

    const darkness = new Float32Array(cols * rows)

    for (let i = 0; i < cols * rows; i++) {
        const avg = sums[i] / counts[i]
        darkness[i] = 1 - avg / 255
    }

    const out = new ImageData(image.width, image.height)
    const ink = hexToRgb(params.foreground)
    const paper = hexToRgb(params.background)

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const col = Math.floor(x / s)
            const row = Math.floor(y / s)

            const cell = row * cols + col
            const lx = x + 0.5 - (col + 0.5) * s // + 0.5: measure from the pixel center, so lx is symmetric
            const ly = y + 0.5 - (row + 0.5) * s

            const half = (s / 2) * Math.sqrt(darkness[cell])
            // < instead of <=: a dot of size 0 must not ink anything
            const inside = Math.abs(lx) < half && Math.abs(ly) < half

            const color = inside ? ink : paper
            const index = y * image.width + x
            const i = index * 4

            out.data[i] = color[0] // R
            out.data[i + 1] = color[1] // G
            out.data[i + 2] = color[2] // B
            out.data[i + 3] = 255 // A – fully opaque
        }
    }

    return out
}
