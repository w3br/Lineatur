import {useEffect, useRef} from "react"
import styles from "./ImageCanvas.module.css"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {dither} from "../../effects/dither"
import {renderPixelEffect} from "../../effects/pipeline.ts"

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
            const result = renderPixelEffect(bitmap, dithering.pixelSize, (image) => dither(image, dithering))
            canvas.width = result.width
            canvas.height = result.height
            canvas.getContext("2d")?.drawImage(result, 0, 0)
            result.close()
        } else {
            const result = renderPixelEffect(bitmap, 1, (image) => image)
            canvas.width = result.width
            canvas.height = result.height
            canvas.getContext("2d")?.drawImage(result, 0, 0)
            result.close()
        }
    }, [bitmap, effect, dithering])

    return <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
}
