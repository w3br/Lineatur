import {useEffect, useRef} from "react"
import styles from "./ImageCanvas.module.css"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {renderEffect} from "../../lib/render.ts"
import {dither} from "../../effects/dither"

type ImageCanvasProps = {
    bitmap: ImageBitmap
    label: string
}

export function ImageCanvas({bitmap, label}: ImageCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const effect = useEditorStore((s) => s.effect)
    const dithering = useEditorStore((s) => s.dithering)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        if (effect === "dithering") {
            const start = performance.now()
            renderEffect(bitmap, canvas, dithering.pixelSize, (image) => dither(image, dithering))
            console.debug(`dither: ${(performance.now() - start).toFixed(1)} ms`)
        } else {
            renderEffect(bitmap, canvas, 1, (image) => image)
        }
    }, [bitmap, effect, dithering])

    return <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
}
