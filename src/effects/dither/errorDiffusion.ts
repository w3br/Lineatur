export type Kernel = [dx: number, dy: number, weight: number][]

export const FLOYD_STEINBERG: Kernel = [
    [1, 0, 7 / 16],
    [-1, 1, 3 / 16],
    [0, 1, 5 / 16],
    [1, 1, 1 / 16],
]

export const ATKINSON: Kernel = [
    [1, 0, 1 / 8],
    [2, 0, 1 / 8],
    [-1, 1, 1 / 8],
    [0, 1, 1 / 8],
    [1, 1, 1 / 8],
    [0, 2, 1 / 8],
]

export function errorDiffusion(
    gray: Float32Array,
    width: number,
    height: number,
    kernel: Kernel,
    level = 128,
): Uint8ClampedArray {
    const buffer = Float32Array.from(gray)
    const out = new Uint8ClampedArray(width * height)

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x
            const oldValue = buffer[index]
            const newValue = oldValue >= level ? 255 : 0
            out[index] = newValue
            const error = oldValue - newValue

            for (const [dx, dy, weight] of kernel) {
                const nx = x + dx
                const ny = y + dy

                if (nx >= 0 && nx < width && ny < height) {
                    buffer[ny * width + nx] += error * weight
                }
            }
        }
    }

    return out
}
