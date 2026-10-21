import styles from "./ColorRow.module.css"
import {type KeyboardEvent, useId, useState} from "react"
import {normalizeHex} from "../../lib/color.ts"

type ColorRowProps = {
    label: string
    value: string
    onChange: (color: string) => void
}

export function ColorRow({label, value, onChange}: ColorRowProps) {
    const id = useId()

    // What the user is typing into the hex field. null = not editing, show `value`.
    const [draft, setDraft] = useState<string | null>(null)

    function commitDraft() {
        if (draft === null) return

        const hex = normalizeHex(draft)
        // Invalid input simply falls back to the current value
        if (hex !== null) onChange(hex)
        setDraft(null)
    }

    function handleHexKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") commitDraft()
        if (event.key === "Escape") setDraft(null)
    }

    return (
        <div className={styles.root}>
            <label htmlFor={id} className={styles.label}>
                {label}
            </label>
            <div className={styles.field}>
                <input
                    id={id}
                    type="color"
                    className={styles.swatch}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                />
                <input
                    type="text"
                    className={styles.hex}
                    aria-label={`${label} hex value`}
                    spellCheck={false}
                    maxLength={7}
                    value={draft ?? value.toUpperCase()}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={handleHexKeyDown}
                />
            </div>
        </div>
    )
}
