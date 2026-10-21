import {useId} from "react"
import styles from "./SwitchRow.module.css"

type SwitchRowProps = {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
}

export function SwitchRow({label, checked, onChange}: SwitchRowProps) {
    const id = useId()

    return (
        <div className={styles.root}>
            <label htmlFor={id} className={styles.label}>
                {label}
            </label>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                className={styles.switch}
                onClick={() => onChange(!checked)}
            >
                <span className={styles.thumb} />
            </button>
        </div>
    )
}
