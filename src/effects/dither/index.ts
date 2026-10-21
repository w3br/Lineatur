import type {DitheringParams} from "../../store/params.ts"
import {toGray} from "../tone.ts"
import {ATKINSON, errorDiffusion, FLOYD_STEINBERG} from "./errorDiffusion.ts"
import {bayer} from "./bayer.ts"
import {hexToRgb} from "../../lib/color.ts"

function quantize(gray: Float32Array, width: number, height: number, params: DitheringParams): Uint8ClampedArray {
    const level = params.threshold * 2.55

    switch (params.algorithm) {
        case "atkinson":
            return errorDiffusion(gray, width, height, ATKINSON, level)
        case "floyd-steinberg":
            return errorDiffusion(gray, width, height, FLOYD_STEINBERG, level)
        case "bayer":
            return bayer(gray, width, height)
    }
}

export function dither(image: ImageData, params: DitheringParams): ImageData {
    const {width, height} = image
    const gray = toGray(image, params.brightness, params.contrast)
    const mono = quantize(gray, width, height, params)

    // Colors don't change per pixel – convert them once, before the loop
    const ink = hexToRgb(params.foreground)
    const paper = hexToRgb(params.background)

    const out = new ImageData(width, height)

    for (let p = 0; p < mono.length; p++) {
        const color = mono[p] === 0 ? ink : paper
        const i = p * 4

        out.data[i] = color[0] // R
        out.data[i + 1] = color[1] // G
        out.data[i + 2] = color[2] // B
        out.data[i + 3] = 255 // A – fully opaque
    }

    return out
}
