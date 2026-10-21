import {clamp} from "es-toolkit/math"

export function luminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b
}

export function adjustTone(value: number, brightness: number, contrast: number): number {
    const b = brightness * 2.55
    const C = contrast * 2.55
    const f = (259 * (C + 255)) / (255 * (259 - C))
    const out = f * (value + b - 128) + 128

    return clamp(out, 0, 255)
}

export function toGray(image: ImageData, brightness: number, contrast: number): Float32Array {
    const gray = new Float32Array(image.width * image.height)
    for (let y = 0; y < image.height; y++) {
        for (let x = 0; x < image.width; x++) {
            const index = y * image.width + x
            const pixelIndex = index * 4

            const r = image.data[pixelIndex]
            const g = image.data[pixelIndex + 1]
            const b = image.data[pixelIndex + 2]

            gray[index] = adjustTone(luminance(r, g, b), brightness, contrast)
        }
    }

    return gray
}
