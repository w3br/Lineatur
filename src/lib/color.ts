/**
 * Turns user input into the `#rrggbb` format that <input type="color"> expects.
 * Accepts "#FF8800", "ff8800", "#f80" and "f80" (case-insensitive).
 * Returns null for anything else, so the caller can fall back to the old value.
 */
export function normalizeHex(input: string): string | null {
    const hex = input.trim().replace(/^#/, "").toLowerCase()

    if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`

    // Shorthand: "f80" → "ff8800"
    if (/^[0-9a-f]{3}$/.test(hex)) {
        return `#${[...hex].map((char) => char + char).join("")}`
    }

    return null
}

/**
 * Turns "#ff8800" (or any form normalizeHex accepts) into [255, 136, 0].
 * Invalid input gives black: the store only ever holds colors that passed ColorRow's validation,
 * so this is a safety net that keeps the effect running instead of throwing mid-render.
 */
export function hexToRgb(hex: string): [number, number, number] {
    const normalized = normalizeHex(hex)

    if (normalized === null) {
        return [0, 0, 0]
    }

    // "#rrggbb" – each pair of hex digits is one channel (0–255)
    const r = Number.parseInt(normalized.slice(1, 3), 16)
    const g = Number.parseInt(normalized.slice(3, 5), 16)
    const b = Number.parseInt(normalized.slice(5, 7), 16)

    return [r, g, b]
}
