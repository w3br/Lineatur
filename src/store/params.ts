export type Effect = 'halftone' | 'dithering' | 'ascii'

export type HalftoneParams = {
    gridSize: number
    angle: number
    shape: 'circle' | 'square' | 'line'
    contrast: number
    brightness: number
    noise: number
    foreground: string
    background: string
}

export type DitheringParams = {
    algorithm: 'floyd-steinberg' | 'atkinson' | 'bayer'
    pixelSize: number
    palette: '1bit' | '2colors' | '4colors'
    contrast: number
    brightness: number
    threshold: number
    foreground: string
    background: string
}

export type AsciiParams = {
    charSet: 'standard' | 'blocks' | 'detailed' | 'custom'
    characters: string
    cellSize: number
    contrast: number
    brightness: number
    invert: boolean
    colorFromImage: boolean
    foreground: string
    background: string
}

export const defaultHalftone: HalftoneParams = {
    gridSize: 8,
    angle: 45,
    shape: 'circle',
    contrast: 0,
    brightness: 0,
    noise: 20,
    foreground: '#000000',
    background: '#ffffff',
}

export const defaultDithering: DitheringParams = {
    algorithm: 'atkinson',
    pixelSize: 2,
    palette: '1bit',
    contrast: 0,
    brightness: 0,
    threshold: 50,
    foreground: '#000000',
    background: '#ffffff',
}

export const defaultAscii: AsciiParams = {
    charSet: 'standard',
    characters: ' .:-=+*#%@',
    cellSize: 8,
    contrast: 0,
    brightness: 0,
    invert: false,
    colorFromImage: false,
    foreground: '#000000',
    background: '#ffffff',
}