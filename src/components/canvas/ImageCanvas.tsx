import {useEffect, useMemo, useRef} from "react"
import styles from "./ImageCanvas.module.css"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {useRenderer} from "../../worker/useRenderer.ts"
import type {RenderJob} from "../../worker/messages.ts"

type ImageCanvasProps = {
    bitmap: ImageBitmap
    label: string
}

export function ImageCanvas({bitmap, label}: ImageCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const effect = useEditorStore((s) => s.effect)
    // Only the active effect's params – changing another effect's sliders doesn't trigger a render
    const params = useEditorStore((s) => s[s.effect])
    const setRenderMs = useEditorStore((s) => s.setRenderMs)

    // Stable job: a new object only when effect or params really change (pitfall 4).
    // The cast is needed because TypeScript can't tell that both selectors read the same effect.
    const job = useMemo(() => ({effect, params}) as RenderJob, [effect, params])
    const result = useRenderer(bitmap, job)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !result) return
        draw(canvas, result.bitmap)
        setRenderMs(result.ms)
    }, [result, setRenderMs])

    return <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
}

/** drawImage instead of transferFromImageBitmap: it doesn't use the bitmap up, so StrictMode can draw twice. */
function draw(canvas: HTMLCanvasElement, bitmap: ImageBitmap) {
    // The resolution must match, otherwise the canvas stays 300 × 150 and crops the image
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
}
