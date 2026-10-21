import {useId, useRef} from "react"
import styles from "./SegmentedControl.module.css"
import type {Option} from "./types.ts"

type SegmentedControlProps<T extends string> = {
    label: string
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
    /** Show the label above the control. Otherwise it is only announced to screen readers. */
    showLabel?: boolean
}

export function SegmentedControl<T extends string>({
    label,
    options,
    value,
    onChange,
    showLabel = false,
}: SegmentedControlProps<T>) {
    const labelId = useId()
    const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        const currentIndex = options.findIndex((option) => option.value === value)
        let nextIndex: number

        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                nextIndex = (currentIndex + 1) % options.length
                break
            case "ArrowLeft":
            case "ArrowUp":
                nextIndex = (currentIndex - 1 + options.length) % options.length
                break
            case "Home":
                nextIndex = 0
                break
            case "End":
                nextIndex = options.length - 1
                break
            default:
                // Leave all other keys (Tab, Space, Enter …) to the browser.
                return
        }

        event.preventDefault()
        onChange(options[nextIndex].value)
        buttonRefs.current[nextIndex]?.focus()
    }

    const group = (
        <div
            role="radiogroup"
            // A visible label names the group via aria-labelledby, otherwise aria-label does
            aria-label={showLabel ? undefined : label}
            aria-labelledby={showLabel ? labelId : undefined}
            className={styles.root}
            onKeyDown={handleKeyDown}
        >
            {options.map((option, index) => (
                <button
                    className={styles.segment}
                    key={option.value}
                    type="button"
                    role="radio"
                    ref={(el) => {
                        buttonRefs.current[index] = el
                    }}
                    aria-checked={option.value === value}
                    tabIndex={option.value === value ? 0 : -1}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )

    if (!showLabel) return group

    // <label> only works for form elements, a radiogroup is named via aria-labelledby instead
    return (
        <div className={styles.field}>
            <span id={labelId} className={styles.label}>
                {label}
            </span>
            {group}
        </div>
    )
}
