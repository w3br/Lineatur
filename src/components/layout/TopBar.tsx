import type {ReactNode} from "react";
import styles from "./TopBar.module.css";

type TopBarProps = {
    start: ReactNode;
    center: ReactNode;
    end: ReactNode;
}

export function TopBar({start, center, end}: TopBarProps) {
    return (
        <div className={styles.topBar}>
            <div className={styles.start}>{start}</div>
            <div className={styles.center}>{center}</div>
            <div className={styles.end}>{end}</div>
        </div>
    )
}

