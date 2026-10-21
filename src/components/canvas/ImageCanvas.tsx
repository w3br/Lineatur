import {useEffect, useRef} from "react"
import styles from "./ImageCanvas.module.css"

type ImageCanvasProps = {
    bitmap: ImageBitmap
    label: string
}

export function ImageCanvas({bitmap, label}: ImageCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0)
    }, [bitmap])

    return <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={label} />
}
