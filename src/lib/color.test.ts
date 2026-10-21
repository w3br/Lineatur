import {describe, expect, it} from "vitest"
import {normalizeHex} from "./color.ts"

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
