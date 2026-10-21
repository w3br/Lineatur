export function threshold(gray: Float32Array, level: number): Uint8ClampedArray {
    const out = new Uint8ClampedArray(gray.length)

    for (let i = 0; i < gray.length; i++) {
        out[i] = gray[i] >= level ? 255 : 0
    }

    return out
}
