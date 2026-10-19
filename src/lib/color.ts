/**
 * Turns user input into the `#rrggbb` format that <input type="color"> expects.
 * Accepts "#FF8800", "ff8800", "#f80" and "f80" (case-insensitive).
 * Returns null for anything else, so the caller can fall back to the old value.
 */
export function normalizeHex(input: string): string | null {
    const hex = input.trim().replace(/^#/, "").toLowerCase();

    if (/^[0-9a-f]{6}$/.test(hex)) return `#${hex}`;

    // Shorthand: "f80" → "ff8800"
    if (/^[0-9a-f]{3}$/.test(hex)) {
        return `#${[...hex].map((char) => char + char).join("")}`;
    }

    return null;
}
