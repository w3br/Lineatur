import {type CSSProperties, type KeyboardEvent, useId, useState} from "react"
import styles from "./SliderRow.module.css"

type SliderRowProps = {
    label: string
    value: number
    min: number
    max: number
    step?: number
    onChange: (value: number) => void
}

export function SliderRow({label, value, min, max, step = 1, onChange}: SliderRowProps) {
    const id = useId()
    const percent = ((value - min) / (max - min)) * 100

    // What the user is typing into the value field. null = not editing, show `value`.
    const [draft, setDraft] = useState<string | null>(null)

    function commitDraft() {
        if (draft === null) return

        const trimmed = draft.trim()
        // Accept "1,5" as well as "1.5"
        const parsed = Number(trimmed.replace(",", "."))

        // Number("") is 0, so empty input has to be rejected explicitly
        if (trimmed !== "" && Number.isFinite(parsed)) {
            onChange(Math.min(max, Math.max(min, parsed)))
        }
        // Invalid input simply falls back to the current value
        setDraft(null)
    }

    function handleValueKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === "Enter") commitDraft()
        if (event.key === "Escape") setDraft(null)
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <label className={styles.label} htmlFor={id}>
                    {label}
                </label>
                <input
                    className={styles.value}
                    type="text"
                    inputMode="decimal"
                    aria-label={`${label} value`}
                    value={draft ?? String(value)}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitDraft}
                    onKeyDown={handleValueKeyDown}
                />
            </div>
            <input
                style={{"--fill": `${percent}%`} as CSSProperties}
                className={styles.slider}
                type="range"
                id={id}
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    )
}
