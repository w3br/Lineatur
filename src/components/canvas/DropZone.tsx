import {type ChangeEvent, type DragEvent, useEffect, useRef, useState} from 'react'
import {ImagePlus} from "lucide-react";
import styles from "./DropZone.module.css";

type DropZoneProps = {
    onFile: (file: File) => void
}

export function DropZone({onFile}: DropZoneProps) {
    const [isDragging, setIsDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    // Drag & drop
    function handleDragOver(event: DragEvent<HTMLDivElement>) {
        event.preventDefault() // without this the browser opens the file itself
        setIsDragging(true)
    }

    function handleDragLeave() {
        setIsDragging(false)
    }

    function handleDrop(event: DragEvent<HTMLDivElement>) {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
    }

    // File picker
    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) onFile(file)
        event.target.value = '' // allows choosing the same file again
    }

    // Paste (Ctrl+V) – listens on the whole window, so it needs cleanup
    useEffect(() => {
        function handlePaste(event: ClipboardEvent) {
            const file = event.clipboardData?.files[0]
            if (file) onFile(file)
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [onFile])

    return (
        <div className={styles.dropZone} data-dragging={isDragging} onDragOver={handleDragOver}
             onDragLeave={handleDragLeave} onDrop={handleDrop}>
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