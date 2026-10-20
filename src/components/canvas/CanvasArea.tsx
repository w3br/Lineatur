import {useEditorStore} from "../../store/useEditorStore.ts";
import {ImageCanvas} from "./ImageCanvas.tsx";
import {loadImage} from "../../lib/loadImage.ts";
import {DropZone} from "./DropZone.tsx";
import {usePasteFile} from "../../hooks/usePasteFile.ts";

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

    usePasteFile(handleFile)

    return image ? <ImageCanvas bitmap={image.preview} label={`Preview of ${image.name}`} /> : <DropZone onFile={handleFile} />
}
