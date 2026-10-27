import {describe, expect, it} from "vitest"
import {asciiChar, toAsciiText} from "./ascii.ts"
import {defaultAscii, type AsciiParams} from "../../store/params.ts"

// Light to dark, like the "standard" preset
const STANDARD = " .:-=+*#%@"

/** Builds the shrunken cell image from rows of gray values – plain object, jsdom has no ImageData. */
function cells(rows: number[][]): ImageData {
    const height = rows.length
    const width = rows[0]?.length ?? 0
    const data = new Uint8ClampedArray(width * height * 4)
    rows.flat().forEach((value, p) => data.set([value, value, value, 255], p * 4))
    return {width, height, data} as ImageData
}

const params = (patch: Partial<AsciiParams> = {}): AsciiParams => ({
    ...defaultAscii,
    characters: STANDARD,
    ...patch,
})

describe("asciiChar", () => {
    it.each([
        [255, " "],
        [0, "@"],
        [128, "="],
        [64, "#"],
    ])("maps luminance %i to %j", (luminance, expected) => {
        expect(asciiChar(luminance, STANDARD, false)).toBe(expected)
    })

    it("rounds to the nearest character instead of always rounding down", () => {
        // 64 → t ≈ 0.749 → 0.749 · 9 = 6.74 → 7 = "#" (rounding down would give "*")
        // 20 → t ≈ 0.922 → 8.29 → 8 = "%"
        expect(asciiChar(64, STANDARD, false)).toBe("#")
        expect(asciiChar(20, STANDARD, false)).toBe("%")
    })

    it("reaches the darkest character before pure black", () => {
        // Rounding gives the last character its fair half step – floor would reserve it for exactly 0
        expect(asciiChar(10, STANDARD, false)).toBe("@")
    })

    it("uses every character of the set across the luminance range", () => {
        const used = new Set(Array.from({length: 256}, (_, luminance) => asciiChar(luminance, STANDARD, false)))

        expect(used.size).toBe(STANDARD.length)
    })

    it("gets denser the darker the input is", () => {
        const indices = [255, 192, 128, 64, 0].map((luminance) => STANDARD.indexOf(asciiChar(luminance, STANDARD, false)))

        for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBeGreaterThan(indices[i - 1])
        }
    })

    describe("invert", () => {
        it("maps black to the lightest and white to the densest character", () => {
            expect(asciiChar(0, STANDARD, true)).toBe(" ")
            expect(asciiChar(255, STANDARD, true)).toBe("@")
        })

        it("mirrors the normal mapping", () => {
            for (const luminance of [0, 32, 64, 100, 128, 200, 255]) {
                expect(asciiChar(luminance, STANDARD, true)).toBe(asciiChar(255 - luminance, STANDARD, false))
            }
        })
    })

    describe("edge cases", () => {
        it("returns a space for an empty character set instead of undefined", () => {
            // The user can clear the text field in the panel – rendering must keep running
            expect(asciiChar(0, "", false)).toBe(" ")
            expect(asciiChar(128, "", false)).toBe(" ")
            expect(asciiChar(255, "", true)).toBe(" ")
        })

        it("always returns that one character for a single-character set", () => {
            // length − 1 = 0 → index is always 0
            expect(asciiChar(0, "#", false)).toBe("#")
            expect(asciiChar(255, "#", false)).toBe("#")
        })

        it("works with the block preset", () => {
            const blocks = " ░▒▓█"

            expect(asciiChar(255, blocks, false)).toBe(" ")
            expect(asciiChar(0, blocks, false)).toBe("█")
            expect(asciiChar(128, blocks, false)).toBe("▒")
        })

        it("treats an emoji as one character, not as two broken halves", () => {
            // "😀" is two UTF-16 code units – charset[i] and .length would split it
            const emoji = " .😀"

            expect(asciiChar(0, emoji, false)).toBe("😀")
            expect(asciiChar(128, emoji, false)).toBe(".")
            expect(asciiChar(255, emoji, false)).toBe(" ")
        })

        it("always returns exactly one visible character", () => {
            for (let luminance = 0; luminance <= 255; luminance += 5) {
                expect([...asciiChar(luminance, " .😀#", false)]).toHaveLength(1)
            }
        })
    })
})

describe("toAsciiText", () => {
    it("turns each cell into one character and each row into one line", () => {
        const text = toAsciiText(cells([[0, 128, 255], [255, 128, 0]]), params())

        expect(text).toBe("@= \n =@")
    })

    it("joins lines with \n and adds no trailing newline", () => {
        const text = toAsciiText(cells([[0], [0], [0]]), params())

        expect(text.split("\n")).toEqual(["@", "@", "@"])
        expect(text.endsWith("\n")).toBe(false)
    })

    it("keeps trailing spaces, so every line has the same width", () => {
        const text = toAsciiText(cells([[0, 255, 255], [255, 255, 255]]), params())

        expect(text).toBe("@  \n   ")
        expect(text.split("\n").map((line) => line.length)).toEqual([3, 3])
    })

    it("uses the brightness of the color, not just one channel", () => {
        // Pure red, green and blue have very different luminance (0.299 / 0.587 / 0.114)
        const image = {width: 3, height: 1, data: Uint8ClampedArray.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])}

        const text = toAsciiText(image as ImageData, params())

        // Red ≈ 76 → "*", green ≈ 150 → "=", blue ≈ 29 → "%" – one channel alone would give the same character thrice
        expect(text).toBe("*=%")
    })

    it("applies brightness and contrast before picking characters", () => {
        // Full brightness turns black white; full contrast pushes mid-gray to an extreme
        expect(toAsciiText(cells([[0, 0]]), params({brightness: 100}))).toBe("  ")
        expect(toAsciiText(cells([[100]]), params({contrast: 100}))).toBe("@")
    })

    it("inverts the mapping", () => {
        expect(toAsciiText(cells([[0, 255]]), params({invert: true}))).toBe(" @")
    })

    it("uses the characters from the text field, including multi-unit ones", () => {
        expect(toAsciiText(cells([[255, 0]]), params({characters: " 😀"}))).toBe(" 😀")
    })

    it("gives spaces of the right shape for an empty character set", () => {
        expect(toAsciiText(cells([[0, 0], [0, 0]]), params({characters: ""}))).toBe("  \n  ")
    })
})
