import {type ReactNode, useId} from "react"
import styles from "./PanelSection.module.css"

type PanelSectionProps = {
    title: string
    children: ReactNode
}

export function PanelSection({title, children}: PanelSectionProps) {
    const id = useId()

    // aria-labelledby turns the <section> into a named region for screen readers
    return (
        <section className={styles.section} aria-labelledby={id}>
            <h2 id={id} className={styles.title}>
                {title}
            </h2>
            {children}
        </section>
    )
}
