import {useEditorStore} from "../../store/useEditorStore.ts"

// Layout and typography come from the <footer> in AppShell
export function StatusBar() {
    const image = useEditorStore((s) => s.image)
    const renderMs = useEditorStore((s) => s.renderMs)

    if (!image) return <span>No image loaded</span>

    return (
        <span>
            {image.width} × {image.height} · {image.name}
            {renderMs !== null && ` · ${Math.round(renderMs)} ms`}
        </span>
    )
}
