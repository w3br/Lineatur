import {useEditorStore} from "../../store/useEditorStore.ts";

// Layout and typography come from the <footer> in AppShell
export function StatusBar() {
    const image = useEditorStore((s) => s.image)

    if (!image) return <span>No image loaded</span>

    return <span>{image.width} × {image.height} · {image.name}</span>
}
