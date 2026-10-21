/**Ordered dithering with a 4×4 Bayer matrix. Returns 0 or 255 per pixel.**/

// prettier-ignore
const BAYER_4 = [
    [ 0,  8,  2, 10],
    [12,  4, 14,  6],
    [ 3, 11,  1,  9],
    [15,  7, 13,  5],
]

const BAYER_4_THRESHOLDS = BAYER_4.map((row) => row.map((m) => ((m + 0.5) / 16) * 255))

export function bayer(gray: Float32Array, width: number, height: number): Uint8ClampedArray {
    const out = new Uint8ClampedArray(gray.length)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const threshold = BAYER_4_THRESHOLDS[y % 4][x % 4]
            const index = y * width + x
            out[index] = gray[index] > threshold ? 255 : 0
        }
    }

    return out
}