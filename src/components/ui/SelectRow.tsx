import type {Option} from "./types.ts"
import styles from "./SelectRow.module.css"
import {useId} from "react"
import {ChevronDown} from "lucide-react"

type SelectRowProps<T extends string> = {
    label: string
    options: Option<T>[]
    value: T
    onChange: (value: T) => void
}

export function SelectRow<T extends string>({label, options, value, onChange}: SelectRowProps<T>) {
    const id = useId()

    return (
        <div className={styles.root}>
            <label htmlFor={id} className={styles.label}>
                {label}
            </label>
            <div className={styles.field}>
                <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value as T)}>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className={styles.chevron} size={16} aria-hidden />
            </div>
        </div>
    )
}
