type Option<T extends string> = { value: T; label: string }
import styles from "./SegmentedControl.module.css";

type SegmentedControlProps<T extends string> = {
    label: string
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ label, options, value, onChange }: SegmentedControlProps<T>) {
    return (
        <div role="radiogroup" aria-label={label} className={styles.root}>
            {options.map((option) => (
                <button
                    className={styles.segment}
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={option.value === value}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    )
}