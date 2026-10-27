import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {renderAscii} from "./renderAscii.ts"
import {defaultAscii, type AsciiParams} from "../../store/params.ts"

type Rgb = [number, number, number]

/** Which color each cell of the shrunken image has – set per test, black by default. */
let cellColor: (col: number, row: number) => Rgb

/**
 * jsdom has no OffscreenCanvas. This stand-in records what gets drawn,
 * so the tests can check the drawing commands instead of real pixels.
 */
class FakeContext {
    fillStyle = ""
    font = ""
    textBaseline = ""
    imageSmoothingQuality = ""
    drawImage = vi.fn()
    fillRect = vi.fn()
    texts: {char: string; x: number; y: number; color: string}[] = []
    rects: {color: string; args: number[]}[] = []

    constructor() {
        this.fillRect = vi.fn((...args: number[]) => this.rects.push({color: this.fillStyle, args}))
    }

    getImageData(_x: number, _y: number, width: number, height: number) {
        const data = new Uint8ClampedArray(width * height * 4)
        for (let row = 0; row < height; row++) {
            for (let col = 0; col < width; col++) {
                data.set([...cellColor(col, row), 255], (row * width + col) * 4)
            }
        }
        return {width, height, data}
    }

    fillText(char: string, x: number, y: number) {
        this.texts.push({char, x, y, color: this.fillStyle})
    }
}

let canvases: FakeOffscreenCanvas[] = []
let contextOptions: unknown[] = []

class FakeOffscreenCanvas {
    readonly context = new FakeContext()
    readonly bitmap = {} as ImageBitmap
    readonly width: number
    readonly height: number

    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        canvases.push(this)
    }

    getContext(_type: string, options?: unknown) {
        contextOptions.push(options)
        return this.context
    }

    transferToImageBitmap() {
        return this.bitmap
    }
}

beforeEach(() => {
    canvases = []
    contextOptions = []
    cellColor = () => [0, 0, 0]
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas)
})
afterEach(() => vi.unstubAllGlobals())

function source(width: number, height: number) {
    return {width, height} as ImageBitmap
}

const params = (patch: Partial<AsciiParams> = {}): AsciiParams => ({
    ...defaultAscii,
    characters: " .:-=+*#%@",
    foreground: "#112233",
    background: "#eeddcc",
    ...patch,
})

/** The first canvas is the small measuring image, the second the full-size output. */
function render(width: number, height: number, patch: Partial<AsciiParams> = {}) {
    const result = renderAscii(source(width, height), params(patch))
    const [small, out] = canvases
    return {result, small, out, texts: out.context.texts}
}

describe("renderAscii", () => {
    describe("grid", () => {
        it("shrinks the image to one pixel per character cell", () => {
            // cellSize 8 → cells are 4.8 × 8 px → 48 / 4.8 = 10 columns, 32 / 8 = 4 rows
            const {small} = render(48, 32, {cellSize: 8})

            expect([small.width, small.height]).toEqual([10, 4])
            expect(small.context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 10, 4)
        })

        it("rounds partial cells down to whole columns and rows", () => {
            // 50 / 4.8 = 10.4 → 10, 35 / 8 = 4.375 → 4 – a fractional count would break the cell index
            const {small} = render(50, 35, {cellSize: 8})

            expect([small.width, small.height]).toEqual([10, 4])
        })

        it("keeps at least one cell when the image is smaller than a character", () => {
            const {small} = render(2, 2, {cellSize: 8})

            expect([small.width, small.height]).toEqual([1, 1])
        })

        it("averages with high smoothing quality when shrinking", () => {
            const {small} = render(48, 32)

            expect(small.context.imageSmoothingQuality).toBe("high")
        })

        it("only marks the measuring canvas as read back frequently", () => {
            render(48, 32)

            expect(contextOptions).toEqual([{willReadFrequently: true}, undefined])
        })
    })

    describe("output", () => {
        it("draws at the full source size and returns that canvas as a bitmap", () => {
            const {result, out} = render(48, 32)

            expect([out.width, out.height]).toEqual([48, 32])
            expect(result).toBe(out.bitmap)
        })

        it("fills the whole output with the background first", () => {
            const {out} = render(48, 32)

            expect(out.context.rects).toEqual([{color: "#eeddcc", args: [0, 0, 48, 32]}])
        })

        it("uses a monospace font as tall as a cell, anchored at the top", () => {
            const {out} = render(48, 32, {cellSize: 8})

            expect(out.context.font).toBe("8px ui-monospace, monospace")
            expect(out.context.textBaseline).toBe("top")
        })

        it("places every character at its cell's top-left corner", () => {
            const {texts} = render(48, 32, {cellSize: 8})

            expect(texts).toHaveLength(40)
            expect(texts[0]).toMatchObject({x: 0, y: 0})
            expect(texts[1].x).toBeCloseTo(4.8)
            expect(texts[10]).toMatchObject({x: 0, y: 8})
        })
    })

    describe("characters", () => {
        it("picks the character from each cell's brightness", () => {
            // Left half black, right half mid-gray
            cellColor = (col) => (col < 5 ? [0, 0, 0] : [128, 128, 128])

            const {texts} = render(48, 8, {cellSize: 8})

            expect(texts.map((text) => text.char).join("")).toBe("@@@@@=====")
        })

        it("uses the characters from the text field, not the preset name", () => {
            const {texts} = render(48, 8, {cellSize: 8, charSet: "custom", characters: " x"})

            expect(new Set(texts.map((text) => text.char))).toEqual(new Set(["x"]))
        })

        it("skips spaces – a white image draws no text at all", () => {
            cellColor = () => [255, 255, 255]

            const {texts} = render(48, 32)

            expect(texts).toHaveLength(0)
        })

        it("draws nothing for an empty character set instead of crashing", () => {
            const {texts} = render(48, 32, {characters: ""})

            expect(texts).toHaveLength(0)
        })

        it("inverts: black becomes the lightest character", () => {
            const {texts} = render(48, 32, {invert: true})

            expect(texts).toHaveLength(0)
        })

        it("applies brightness before picking the character", () => {
            // Black + full brightness → white → only spaces
            const {texts} = render(48, 32, {brightness: 100})

            expect(texts).toHaveLength(0)
        })
    })

    describe("color", () => {
        it("draws every character in the foreground color by default", () => {
            const {texts} = render(48, 32)

            expect(new Set(texts.map((text) => text.color))).toEqual(new Set(["#112233"]))
        })

        it("takes each character's color from its cell with 'color from image'", () => {
            cellColor = (col) => (col < 5 ? [200, 30, 10] : [10, 60, 90])

            const {texts} = render(48, 8, {cellSize: 8, colorFromImage: true})

            expect(texts[0].color).toBe("rgb(200, 30, 10)")
            expect(texts[9].color).toBe("rgb(10, 60, 90)")
        })

        it("only produces valid CSS colors – an invalid one is silently ignored by the canvas", () => {
            // A broken template string like `rgb(r, g, b)` would keep the background color → invisible text
            cellColor = (col, row) => [col * 20, row * 40, 100]

            const {texts} = render(48, 32, {colorFromImage: true})

            for (const text of texts) {
                expect(text.color).toMatch(/^rgb\(\d{1,3}, \d{1,3}, \d{1,3}\)$/)
                expect(text.color).not.toBe("#eeddcc")
            }
        })
    })

    it("throws when the browser can't create a 2D context", () => {
        vi.spyOn(FakeOffscreenCanvas.prototype, "getContext").mockReturnValue(null as never)

        expect(() => renderAscii(source(48, 32), params())).toThrow("Could not create a 2D canvas context")
    })
})
