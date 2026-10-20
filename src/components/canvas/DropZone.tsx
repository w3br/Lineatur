import {type ChangeEvent,  useRef} from 'react'
import {ImagePlus} from "lucide-react";
import styles from "./DropZone.module.css";

type DropZoneProps = {
    onFile: (file: File) => void
    isDragging: boolean
}

export function DropZone({onFile, isDragging}: DropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null)

    // File picker
    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) onFile(file)
        event.target.value = '' // allows choosing the same file again
    }

    return (
        <div className={styles.dropZone} data-dragging={(isDragging)}>
            <ImagePlus className={styles.icon} aria-hidden={true}/>
            <h2 className={styles.heading}>Choose or drop an image</h2>
            <p className={styles.hint}>PNG, JPEG or WebP</p>
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleInputChange}
                   ref={inputRef}/>
            <button className={styles.button} type="button" onClick={() => inputRef.current?.click()}>
                Choose image
            </button>
        </div>
    )
}