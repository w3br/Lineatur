export type Effect = "halftone" | "dithering" | "ascii"

export type HalftoneParams = {
    gridSize: number
    angle: number
    shape: "circle" | "square" | "line"
    contrast: number
    brightness: number
    noise: number
    foreground: string
    background: string
}

export type DitheringParams = {
    algorithm: "floyd-steinberg" | "atkinson" | "bayer"
    pixelSize: number
    palette: "1bit" | "2colors" | "4colors"
    contrast: number
    brightness: number
    threshold: number
    foreground: string
    background: string
}

export type AsciiParams = {
    charSet: "standard" | "blocks" | "detailed" | "custom"
    characters: string
    cellSize: number
    contrast: number
    brightness: number
    invert: boolean
    colorFromImage: boolean
    foreground: string
    background: string
}

type Range = {min: number; max: number}

const toneRange: Range = {min: -100, max: 100}

// One source for the sliders and the URL check – a link can't set what a slider couldn't
export const halftoneRanges = {
    gridSize: {min: 2, max: 40},
    angle: {min: 0, max: 180},
    contrast: toneRange,
    brightness: toneRange,
    noise: {min: 0, max: 100},
} satisfies Partial<Record<keyof HalftoneParams, Range>>

export const ditheringRanges = {
    pixelSize: {min: 1, max: 8},
    contrast: toneRange,
    brightness: toneRange,
    threshold: {min: 0, max: 100},
} satisfies Partial<Record<keyof DitheringParams, Range>>

export const asciiRanges = {
    cellSize: {min: 4, max: 32},
    contrast: toneRange,
    brightness: toneRange,
} satisfies Partial<Record<keyof AsciiParams, Range>>

// satisfies: TypeScript complains if a value here isn't part of the type above
export const effects = ["halftone", "dithering", "ascii"] as const satisfies readonly Effect[]
export const dotShapes = ["circle", "square", "line"] as const satisfies readonly HalftoneParams["shape"][]
export const ditheringAlgorithms = [
    "floyd-steinberg",
    "atkinson",
    "bayer",
] as const satisfies readonly DitheringParams["algorithm"][]
export const palettes = ["1bit", "2colors", "4colors"] as const satisfies readonly DitheringParams["palette"][]
export const charSets = ["standard", "blocks", "detailed", "custom"] as const satisfies readonly AsciiParams["charSet"][]

// Characters ordered from light to dark
export const charsetPresets: Record<Exclude<AsciiParams["charSet"], "custom">, string> = {
    standard: " .:-=+*#%@",
    blocks: " ░▒▓█",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
}

export const defaultEffect: Effect = "halftone"

export const defaultHalftone: HalftoneParams = {
    gridSize: 8,
    angle: 45,
    shape: "circle",
    contrast: 0,
    brightness: 0,
    noise: 20,
    foreground: "#000000",
    background: "#ffffff",
}

export const defaultDithering: DitheringParams = {
    algorithm: "atkinson",
    pixelSize: 2,
    palette: "1bit",
    contrast: 0,
    brightness: 0,
    threshold: 50,
    foreground: "#000000",
    background: "#ffffff",
}

export const defaultAscii: AsciiParams = {
    charSet: "standard",
    characters: charsetPresets.standard,
    cellSize: 8,
    contrast: 0,
    brightness: 0,
    invert: false,
    colorFromImage: false,
    foreground: "#000000",
    background: "#ffffff",
}
