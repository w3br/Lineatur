import styles from "./TextField.module.css"

type TextFieldProps = {
    /** Accessible name – the field has no visible label in the design */
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function TextField({label, value, onChange, placeholder}: TextFieldProps) {
    return (
        <input
            type="text"
            className={styles.field}
            aria-label={label}
            spellCheck={false}
            autoComplete="off"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
        />
    )
}
