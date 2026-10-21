import {describe, expect, it} from "vitest"
import {hexToRgb, normalizeHex} from "./color.ts"

describe("normalizeHex", () => {
    it.each([
        ["#ff8800", "#ff8800"],
        ["#FF8800", "#ff8800"],
        ["ff8800", "#ff8800"],
        ["  #ff8800  ", "#ff8800"],
    ])("accepts the full form %j", (input, expected) => {
        expect(normalizeHex(input)).toBe(expected)
    })

    it.each([
        ["#f80", "#ff8800"],
        ["F80", "#ff8800"],
        ["#000", "#000000"],
    ])("expands the shorthand %j", (input, expected) => {
        expect(normalizeHex(input)).toBe(expected)
    })

    it.each([
        "",
        "#",
        "#ff88", // wrong length
        "#ff88001", // too long
        "#gg8800", // not a hex digit
        "##ff8800", // only one # is stripped
        "red", // color names aren't supported by <input type="color">
        "xxff8800yy", // must match the whole string
    ])("rejects %j", (input) => {
        expect(normalizeHex(input)).toBeNull()
    })
})

describe("hexToRgb", () => {
    it.each([
        ["#ff8800", [255, 136, 0]],
        ["#000000", [0, 0, 0]],
        ["#ffffff", [255, 255, 255]],
        ["#7cc4ff", [124, 196, 255]],
    ])("converts %s", (hex, expected) => {
        expect(hexToRgb(hex)).toEqual(expected)
    })

    it.each([
        ["#f80", [255, 136, 0]],
        ["FF8800", [255, 136, 0]],
    ])("accepts the forms normalizeHex accepts: %s", (hex, expected) => {
        expect(hexToRgb(hex)).toEqual(expected)
    })

    it("falls back to black for invalid input", () => {
        expect(hexToRgb("red")).toEqual([0, 0, 0])
    })
})
