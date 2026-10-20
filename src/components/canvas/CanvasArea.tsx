import {useEditorStore} from "../../store/useEditorStore.ts";
import {ImageCanvas} from "./ImageCanvas.tsx";
import {loadImage} from "../../lib/loadImage.ts";
import {usePasteFile} from "../../hooks/usePasteFile.ts";
import {useFileDrop} from "../../hooks/useFileDrop.ts";
import { DropZone } from "./DropZone.tsx";
import styles from "./CanvasArea.module.css"

export function CanvasArea() {
    const image = useEditorStore((s) => s.image)
    const setImage = useEditorStore((s) => s.setImage)


    async function handleFile(file: File) {
        try {
            setImage(await loadImage(file))
        } catch (error) {
            console.error(error) // later: show a toast
        }
    }

    const {isDragging, handlers} = useFileDrop(handleFile)
    usePasteFile(handleFile)

    return (
        <div className={styles.area} data-dragging={isDragging && image !== null} {...handlers}>
            {image
                ? <ImageCanvas bitmap={image.preview} label={`Preview of ${image.name}`} />
                : <DropZone onFile={handleFile} isDragging={isDragging} />}
        </div>
    )
}
