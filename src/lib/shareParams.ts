import {clamp} from "es-toolkit/math"
import {normalizeHex} from "./color.ts"
import {
    asciiRanges,
    charSets,
    charsetPresets,
    defaultAscii,
    defaultDithering,
    defaultEffect,
    defaultHalftone,
    ditheringAlgorithms,
    ditheringRanges,
    dotShapes,
    effects,
    halftoneRanges,
    palettes,
    type AsciiParams,
    type DitheringParams,
    type Effect,
    type HalftoneParams,
} from "../store/params.ts"

export type ShareSettings = {
    effect: Effect
    halftone: HalftoneParams
    dithering: DitheringParams
    ascii: AsciiParams
}

// Keeps a link at a sensible length – the text field itself has no limit
const MAX_CHARACTERS = 100

/** A link can be edited by anyone, so every value is checked. Anything invalid falls back to the default. */
function readNumber(query: URLSearchParams, key: string, range: {min: number; max: number}, fallback: number): number {
    const raw = query.get(key)
    // Checked first: Number(null) and Number("") are 0, which would pass as a valid number
    if (raw === null || raw.trim() === "") return fallback

    const value = Number(raw)
    if (!Number.isFinite(value)) return fallback
    // Rounded, because the sliders only know whole numbers
    return clamp(Math.round(value), range.min, range.max)
}

function readChoice<T extends string>(query: URLSearchParams, key: string, choices: readonly T[], fallback: T): T {
    const raw = query.get(key)
    return choices.find((choice) => choice === raw) ?? fallback
}

function readColor(query: URLSearchParams, key: string, fallback: string): string {
    const raw = query.get(key)
    return (raw !== null && normalizeHex(raw)) || fallback
}

function readBoolean(query: URLSearchParams, key: string, fallback: boolean): boolean {
    const raw = query.get(key)
    if (raw === "1") return true
    if (raw === "0") return false
    return fallback
}

function readHalftone(query: URLSearchParams): HalftoneParams {
    const fallback = defaultHalftone
    return {
        gridSize: readNumber(query, "gridSize", halftoneRanges.gridSize, fallback.gridSize),
        angle: readNumber(query, "angle", halftoneRanges.angle, fallback.angle),
        shape: readChoice(query, "shape", dotShapes, fallback.shape),
        contrast: readNumber(query, "contrast", halftoneRanges.contrast, fallback.contrast),
        brightness: readNumber(query, "brightness", halftoneRanges.brightness, fallback.brightness),
        noise: readNumber(query, "noise", halftoneRanges.noise, fallback.noise),
        foreground: readColor(query, "foreground", fallback.foreground),
        background: readColor(query, "background", fallback.background),
    }
}

function readDithering(query: URLSearchParams): DitheringParams {
    const fallback = defaultDithering
    return {
        algorithm: readChoice(query, "algorithm", ditheringAlgorithms, fallback.algorithm),
        pixelSize: readNumber(query, "pixelSize", ditheringRanges.pixelSize, fallback.pixelSize),
        palette: readChoice(query, "palette", palettes, fallback.palette),
        contrast: readNumber(query, "contrast", ditheringRanges.contrast, fallback.contrast),
        brightness: readNumber(query, "brightness", ditheringRanges.brightness, fallback.brightness),
        threshold: readNumber(query, "threshold", ditheringRanges.threshold, fallback.threshold),
        foreground: readColor(query, "foreground", fallback.foreground),
        background: readColor(query, "background", fallback.background),
    }
}

function readCharacters(query: URLSearchParams, charSet: AsciiParams["charSet"]): string {
    // A preset decides its own characters, so a link can't make the two disagree
    if (charSet !== "custom") return charsetPresets[charSet]

    const raw = query.get("characters") ?? defaultAscii.characters
    // Spread instead of slice: cutting a string could split an emoji in half. No trim – a leading space is a character
    return [...raw].slice(0, MAX_CHARACTERS).join("")
}

function readAscii(query: URLSearchParams): AsciiParams {
    const fallback = defaultAscii
    const charSet = readChoice(query, "charSet", charSets, fallback.charSet)
    return {
        charSet,
        characters: readCharacters(query, charSet),
        cellSize: readNumber(query, "cellSize", asciiRanges.cellSize, fallback.cellSize),
        contrast: readNumber(query, "contrast", asciiRanges.contrast, fallback.contrast),
        brightness: readNumber(query, "brightness", asciiRanges.brightness, fallback.brightness),
        invert: readBoolean(query, "invert", fallback.invert),
        colorFromImage: readBoolean(query, "colorFromImage", fallback.colorFromImage),
        foreground: readColor(query, "foreground", fallback.foreground),
        background: readColor(query, "background", fallback.background),
    }
}

/** Reads the effect and its settings from a query string. Unknown keys are ignored. */
export function parseShareParams(search: string): Partial<ShareSettings> {
    const query = new URLSearchParams(search)
    const effect = readChoice(query, "effect", effects, defaultEffect)

    switch (effect) {
        case "halftone":
            return {effect, halftone: readHalftone(query)}
        case "dithering":
            return {effect, dithering: readDithering(query)}
        case "ascii":
            return {effect, ascii: readAscii(query)}
    }
}

function encodeValue(key: string, value: string | number | boolean): string {
    if (typeof value === "boolean") return value ? "1" : "0"
    // Without the #, which would need escaping in a link
    if (key === "foreground" || key === "background") return String(value).replace(/^#/, "")
    return String(value)
}

/** Only values that differ from the default – that keeps links short. */
function writeChanged<T extends HalftoneParams | DitheringParams | AsciiParams>(
    query: URLSearchParams,
    params: T,
    defaults: T,
) {
    for (const [key, value] of Object.entries(params)) {
        if (value !== defaults[key as keyof T]) query.set(key, encodeValue(key, value))
    }
}

/** The active effect and its settings as a query string, without the leading "?". */
export function serializeShareParams(settings: ShareSettings): string {
    const query = new URLSearchParams()
    if (settings.effect !== defaultEffect) query.set("effect", settings.effect)

    switch (settings.effect) {
        case "halftone":
            writeChanged(query, settings.halftone, defaultHalftone)
            break
        case "dithering":
            writeChanged(query, settings.dithering, defaultDithering)
            break
        case "ascii":
            writeChanged(query, settings.ascii, defaultAscii)
            // A preset's name is enough – its characters would only make the link longer
            if (settings.ascii.charSet !== "custom") query.delete("characters")
            break
    }

    return query.toString()
}
