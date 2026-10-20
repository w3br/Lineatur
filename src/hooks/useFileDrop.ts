import {type DragEvent, useState} from "react";

export function useFileDrop(onFile: (file: File) => void) {
    const [isDragging, setIsDragging] = useState(false)

    function onDragOver(event: DragEvent<HTMLElement>) {
        event.preventDefault() // without this the browser opens the file itself
        setIsDragging(true)
    }
    function onDragLeave() {
        setIsDragging(false)
    }
    function onDrop(event: DragEvent<HTMLElement>) {
        event.preventDefault()
        setIsDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) onFile(file)
    }

    return {isDragging, handlers: {onDragOver, onDragLeave, onDrop}}
}