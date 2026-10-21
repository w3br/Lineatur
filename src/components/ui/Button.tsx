import type {ButtonHTMLAttributes, ReactNode} from "react"
import styles from "./Button.module.css"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost"
    icon?: ReactNode
}

export function Button({variant = "secondary", icon, children, className, ...rest}: ButtonProps) {
    const classes = [styles.button, styles[variant], className].filter(Boolean).join(" ")

    return (
        <button type={"button"} className={classes} {...rest}>
            {icon}
            {children}
        </button>
    )
}
