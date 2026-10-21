import {useEditorStore} from "../../store/useEditorStore.ts";
import {ImageCanvas} from "./ImageCanvas.tsx";
import {usePasteFile} from "../../hooks/usePasteFile.ts";
import {useFileDrop} from "../../hooks/useFileDrop.ts";
import { DropZone } from "./DropZone.tsx";
import styles from "./CanvasArea.module.css"

export function CanvasArea() {
    const image = useEditorStore((s) => s.image)
    const loadFile = useEditorStore((s) => s.loadFile)


    const {isDragging, handlers} = useFileDrop(loadFile)
    usePasteFile(loadFile)

    return (
        <div className={styles.area} data-dragging={isDragging && image !== null} {...handlers}>
            {image
                ? <ImageCanvas bitmap={image.preview} label={`Preview of ${image.name}`} />
                : <DropZone onFile={loadFile} isDragging={isDragging} />}
        </div>
    )
}
