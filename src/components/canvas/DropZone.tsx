import {ImagePlus} from "lucide-react";
import styles from "./DropZone.module.css";
import {useFilePicker} from "../../hooks/useFilePicker.tsx";

type DropZoneProps = {
    onFile: (file: File) => void
    isDragging: boolean
}


export function DropZone({onFile, isDragging}: DropZoneProps) {
    const picker = useFilePicker(onFile);

    return (
        <div className={styles.dropZone} data-dragging={isDragging}>
            <ImagePlus className={styles.icon} aria-hidden={true}/>
            <h2 className={styles.heading}>Choose or drop an image</h2>
            <p className={styles.hint}>PNG, JPEG or WebP</p>
            {picker.input}
            <button className={styles.button} type="button" onClick={picker.open}>
                Choose image
            </button>
        </div>
    )
}