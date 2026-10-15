import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./IconButton.module.css";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    icon: ReactNode;
    label: string;
}

export function IconButton({ icon, label, className, disabled, onClick, ...rest }: IconButtonProps) {
    const classes = [styles.iconButton, className].filter(Boolean).join(' ');

    return (
        <button type="button" className={classes} aria-label={label} title={label} aria-disabled={disabled || undefined}
                onClick={disabled ? undefined : onClick} {...rest}>
            {icon}
        </button>
    );
}