import type {HalftoneParams} from "../../store/params.ts"
import {toGray} from "../tone.ts"
import {hexToRgb} from "../../lib/color.ts"
import {clamp} from "es-toolkit/math"

/**
 * A deterministic pseudo-random number generator for 2D coordinates.
 * The same (x, y) always returns the same value, so the noise is stable across frames.
 * Returns a float in [−1, 1).
 */
export function noise2d(x: number, y: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
    return (n - Math.floor(n)) * 2 - 1
}

/**
 * Does the pixel at (lx, ly) – its offset from the cell center – lie inside the dot?
 * Every shape covers d · s² of the cell, so the ink area grows with the darkness, not the radius.
 * Bounds are half-open [−x, x), like the cell itself (Math.floor): a dot of size 0 inks nothing,
 * a full dot inks pixels lying exactly on the cell border.
 */
export function isInk(shape: HalftoneParams["shape"], lx: number, ly: number, s: number, d: number): boolean {
    // switch instead of if/else: TypeScript sees that every shape returns – and complains if a new one is missing
    switch (shape) {
        case "square": {
            const half = (s / 2) * Math.sqrt(d)
            return -half <= lx && lx < half && -half <= ly && ly < half
        }
        case "circle": {
            const radius = s * Math.sqrt(d / Math.PI)
            return lx * lx + ly * ly < radius * radius
        }
        case "line": {
            const t = s * d
            return -t / 2 <= ly && ly < t / 2
        }
    }
}

export function halftone(image: ImageData, params: HalftoneParams): ImageData {
    const gray = toGray(image, params.brightness, params.contrast)
    const s = params.gridSize
    const a = params.angle * (Math.PI / 180)
    // Same for every pixel – compute once instead of millions of times
    const cos = Math.cos(a)
    const sin = Math.sin(a)

    // Rotate the image corners into grid space – they bound every cell a pixel can land in
    const corners = [
        [0, 0],
        [image.width, 0],
        [0, image.height],
        [image.width, image.height],
    ]
    const us = corners.map(([x, y]) => x * cos + y * sin)
    const vs = corners.map(([x, y]) => -x * sin + y * cos)
    const minCol = Math.floor(Math.min(...us) / s)
    const maxCol = Math.floor(Math.max(...us) / s)
    const minRow = Math.floor(Math.min(...vs) / s)
    const maxRow = Math.floor(Math.max(...vs) / s)
    const cols = maxCol - minCol + 1
    const rows = maxRow - minRow + 1

    /** Pixel → its cell in the rotated grid, plus the offset from that cell's center. */
    const toGrid = (x: number, y: number) => {
        const px = x + 0.5 // + 0.5: measure from the pixel center, so lx is symmetric
        const py = y + 0.5
        // Rotate by −angle: from image space back into grid space
        const u = px * cos + py * sin
        const v = -px * sin + py * cos
        const col = Math.floor(u / s)
        const row = Math.floor(v / s)

        // Shift by whole cells so the index never goes negative – the grid itself doesn't move
        const cell = (row - minRow) * cols + (col - minCol)
        const lx = u - (col + 0.5) * s
        const ly = v - (row + 0.5) * s
        return {cell, lx, ly}
    }

    const sums = new Float32Array(cols * rows)
    const counts = new Uint32Array(cols * rows)

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const {cell} = toGrid(x, y)
            const index = y * image.width + x
            sums[cell] += gray[index]
            counts[cell] += 1
        }
    }

    const darkness = new Float32Array(cols * rows)

    for (let i = 0; i < cols * rows; i++) {
        const col = (i % cols) + minCol
        const row = Math.floor(i / cols) + minRow
        const average = counts[i] > 0 ? sums[i] / counts[i] : 0
        const d = clamp(1 - average / 255 + noise2d(col, row) * (params.noise / 100) * 0.5, 0, 1)
        darkness[i] = d
    }

    const out = new ImageData(image.width, image.height)
    const ink = hexToRgb(params.foreground)
    const paper = hexToRgb(params.background)

    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const {cell, lx, ly} = toGrid(x, y)

            const color = isInk(params.shape, lx, ly, s, darkness[cell]) ? ink : paper
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
