import type {ReactNode} from "react"
import styles from "./AppShell.module.css"

type AppShellProps = {
    topBar: ReactNode
    canvas: ReactNode
    panel: ReactNode
    statusBar: ReactNode
}

export function AppShell({topBar, canvas, panel, statusBar}: AppShellProps) {
    return (
        <div className={styles.shell}>
            <header className={styles.topBar}>{topBar}</header>
            <main className={styles.canvas}>{canvas}</main>
            <aside className={styles.panel}>{panel}</aside>
            <footer className={styles.statusBar}>{statusBar}</footer>
        </div>
    )
}
