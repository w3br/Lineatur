import type {AsciiParams} from "../../store/params.ts"
import {toGray} from "../tone.ts"

export function asciiChar(luminance: number, charset: string, invert: boolean): string {
    const charArray = [...charset] // Spread operator splits a string into its characters, even if they are multi-byte
    const t = invert ? luminance / 255 : 1 - luminance / 255
    const index = Math.round(t * (charArray.length - 1))
    return charArray.length === 0 ? " " : charArray[index]
}

/**
 * Turns the shrunken image (one pixel per character cell) into plain text, one line per row.
 * Takes ImageData instead of a bitmap, so it runs without a canvas – in tests and for the TXT export.
 */
export function toAsciiText(cells: ImageData, params: AsciiParams): string {
    const gray = toGray(cells, params.brightness, params.contrast)
    const lines: string[] = []

    for (let row = 0; row < cells.height; row++) {
        let line = ""
        for (let col = 0; col < cells.width; col++) {
            line += asciiChar(gray[row * cells.width + col], params.characters, params.invert)
        }
        // Trailing spaces stay: every line keeps the same width, so the picture doesn't shift in an editor
        lines.push(line)
    }

    return lines.join("\n")
}
