import {describe, expect, it} from "vitest"
import {parseShareParams, serializeShareParams, type ShareSettings} from "./shareParams.ts"
import {charsetPresets, defaultAscii, defaultDithering, defaultHalftone} from "../store/params.ts"

const defaults: ShareSettings = {
    effect: "halftone",
    halftone: defaultHalftone,
    dithering: defaultDithering,
    ascii: defaultAscii,
}

describe("parseShareParams", () => {
    it("gives the defaults for an empty query", () => {
        expect(parseShareParams("")).toEqual({effect: "halftone", halftone: defaultHalftone})
    })

    it("reads the values of the chosen effect", () => {
        const result = parseShareParams("?effect=dithering&algorithm=bayer&pixelSize=4&foreground=1b2a6b")

        expect(result).toEqual({
            effect: "dithering",
            dithering: {...defaultDithering, algorithm: "bayer", pixelSize: 4, foreground: "#1b2a6b"},
        })
    })

    it("treats an unknown effect as the default", () => {
        expect(parseShareParams("?effect=blur&gridSize=12").effect).toBe("halftone")
    })

    it("ignores unknown keys", () => {
        expect(parseShareParams("?foo=bar&__proto__=1").halftone).toEqual(defaultHalftone)
    })

    it.each([
        ["too large", "gridSize=9999", 40],
        ["too small", "gridSize=0", 2],
        ["negative", "gridSize=-5", 2],
        ["a fraction", "gridSize=12.6", 13],
    ])("limits a number that is %s", (_, query, expected) => {
        expect(parseShareParams(`?${query}`).halftone?.gridSize).toBe(expected)
    })

    it.each([
        ["empty", "gridSize="],
        ["only spaces", "gridSize=%20%20"],
        ["text", "gridSize=abc"],
        ["infinite", "gridSize=Infinity"],
        ["not a number", "gridSize=NaN"],
    ])("falls back to the default for a number that is %s", (_, query) => {
        expect(parseShareParams(`?${query}`).halftone?.gridSize).toBe(defaultHalftone.gridSize)
    })

    it.each([
        ["shape", "?shape=star", "halftone"],
        ["algorithm", "?effect=dithering&algorithm=magic", "dithering"],
        ["palette", "?effect=dithering&palette=8bit", "dithering"],
        ["charSet", "?effect=ascii&charSet=runes", "ascii"],
    ] as const)("falls back to the default for an unknown %s", (_, query, effect) => {
        expect(parseShareParams(query)[effect]).toEqual(defaults[effect])
    })

    it.each(["zzzzzz", "12345", "red", ""])("falls back to the default for the broken color %j", (color) => {
        expect(parseShareParams(`?foreground=${color}`).halftone?.foreground).toBe(defaultHalftone.foreground)
    })

    it.each([
        ["1", true],
        ["0", false],
        ["true", false],
        ["yes", false],
    ])("reads the boolean %j as %j", (raw, expected) => {
        expect(parseShareParams(`?effect=ascii&invert=${raw}`).ascii?.invert).toBe(expected)
    })

    it("takes a preset's characters from the preset, not from the link", () => {
        const result = parseShareParams("?effect=ascii&charSet=blocks&characters=abc")

        expect(result.ascii?.characters).toBe(charsetPresets.blocks)
    })

    it("keeps custom characters, including a leading space", () => {
        const result = parseShareParams("?effect=ascii&charSet=custom&characters=%20.x")

        expect(result.ascii?.characters).toBe(" .x")
    })

    it("cuts very long custom characters without splitting an emoji", () => {
        const emoji = encodeURIComponent("😀".repeat(150))

        const characters = parseShareParams(`?effect=ascii&charSet=custom&characters=${emoji}`).ascii?.characters

        expect(characters).toBe("😀".repeat(100))
    })
})

describe("serializeShareParams", () => {
    it("is empty when everything is the default", () => {
        expect(serializeShareParams(defaults)).toBe("")
    })

    it("only writes what differs from the default", () => {
        const query = serializeShareParams({...defaults, halftone: {...defaultHalftone, gridSize: 12}})

        expect(query).toBe("gridSize=12")
    })

    it("only writes the active effect", () => {
        const query = serializeShareParams({
            ...defaults,
            effect: "dithering",
            halftone: {...defaultHalftone, gridSize: 12},
        })

        expect(query).toBe("effect=dithering")
    })

    it("writes colors without the #", () => {
        const query = serializeShareParams({...defaults, halftone: {...defaultHalftone, foreground: "#1b2a6b"}})

        expect(query).toBe("foreground=1b2a6b")
    })

    it("writes booleans as 1 and 0", () => {
        const on = {...defaults, effect: "ascii", ascii: {...defaultAscii, invert: true}} as const

        expect(serializeShareParams(on)).toBe("effect=ascii&invert=1")
    })

    it("leaves a preset's characters out", () => {
        const ascii = {...defaultAscii, charSet: "detailed", characters: charsetPresets.detailed} as const

        expect(serializeShareParams({...defaults, effect: "ascii", ascii})).toBe("effect=ascii&charSet=detailed")
    })
})

describe("a link survives the round trip", () => {
    it.each<[string, ShareSettings]>([
        ["defaults", defaults],
        [
            "halftone",
            {
                ...defaults,
                halftone: {...defaultHalftone, gridSize: 16, angle: 0, shape: "line", contrast: -30, noise: 0},
            },
        ],
        [
            "dithering",
            {
                ...defaults,
                effect: "dithering",
                dithering: {...defaultDithering, algorithm: "bayer", palette: "4colors", background: "#ffee00"},
            },
        ],
        [
            "ascii preset",
            {
                ...defaults,
                effect: "ascii",
                ascii: {...defaultAscii, charSet: "blocks", characters: charsetPresets.blocks, invert: true},
            },
        ],
        [
            "custom characters with special signs",
            {
                ...defaults,
                effect: "ascii",
                ascii: {...defaultAscii, charSet: "custom", characters: " &=+#%?😀", colorFromImage: true},
            },
        ],
        [
            "an emptied character field",
            {...defaults, effect: "ascii", ascii: {...defaultAscii, charSet: "custom", characters: ""}},
        ],
    ])("%s", (_, settings) => {
        const parsed = parseShareParams(`?${serializeShareParams(settings)}`)

        expect(parsed.effect).toBe(settings.effect)
        expect(parsed[settings.effect]).toEqual(settings[settings.effect])
    })
})
