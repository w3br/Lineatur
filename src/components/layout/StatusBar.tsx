import {useEditorStore} from "../../store/useEditorStore.ts"
import styles from "./StatusBar.module.css"

// Layout and typography come from the <footer> in AppShell
export function StatusBar() {
    const image = useEditorStore((s) => s.image)
    const renderMs = useEditorStore((s) => s.renderMs)
    const message = useEditorStore((s) => s.message)

    return (
        <>
            {image ? (
                <span>
                    {image.width} × {image.height} · {image.name}
                    {renderMs !== null && ` · ${Math.round(renderMs)} ms`}
                </span>
            ) : (
                <span>No image loaded</span>
            )}
            {/* Always in the DOM: screen readers only announce changes in a live region they already know */}
            <span className={styles.message} role="status">
                {message}
            </span>
        </>
    )
}
