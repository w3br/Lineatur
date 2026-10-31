import {useId, useRef, useState} from "react"
import {Download} from "lucide-react"
import styles from "./ExportDialog.module.css"
import {Button} from "../ui/Button.tsx"
import {SegmentedControl} from "../ui/SegmentedControl.tsx"
import type {Option} from "../ui/types.ts"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {exportImage} from "../../worker/exportImage.ts"
import type {ExportFormat, RenderJob} from "../../worker/messages.ts"
import {downloadBlob, exportFileName} from "../../lib/downloadBlob.ts"

const imageFormats: Option<ExportFormat>[] = [
    {value: "png", label: "PNG"},
    {value: "jpg", label: "JPG"},
]
const asciiFormats: Option<ExportFormat>[] = [...imageFormats, {value: "txt", label: "TXT"}]

/** The Export button and its dialog – a native <dialog> brings the focus trap, Escape and the backdrop. */
export function ExportDialog() {
    const image = useEditorStore((state) => state.image)
    const effect = useEditorStore((state) => state.effect)
    const dialogRef = useRef<HTMLDialogElement>(null)
    const titleId = useId()
    const [format, setFormat] = useState<ExportFormat>("png")
    const [exporting, setExporting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Derived while rendering: "txt" stays remembered, so going back to ASCII restores it
    const activeFormat = format === "txt" && effect !== "ascii" ? "png" : format

    function open() {
        setError(null)
        dialogRef.current?.showModal()
    }

    async function handleExport() {
        if (!image || exporting) return
        setExporting(true)
        setError(null)

        try {
            const state = useEditorStore.getState()
            // Same cast as in ImageCanvas: TypeScript can't tell that both read the same effect
            const job = {effect: state.effect, params: state[state.effect]} as RenderJob
            const blob = await exportImage(image, job, activeFormat)
            downloadBlob(blob, exportFileName(image.name, job.effect, activeFormat))
            dialogRef.current?.close()
        } catch (exportError) {
            console.error(exportError)
            setError("Export failed – please try again.")
        } finally {
            setExporting(false)
        }
    }

    function describeResult() {
        if (exporting) return "Exporting…"
        if (activeFormat === "txt") return "Plain text, one line per row"
        return image ? `${image.width} × ${image.height} px` : ""
    }

    return (
        <>
            <Button variant="primary" icon={<Download size={16} />} disabled={!image} onClick={open}>
                Export
            </Button>

            <dialog
                ref={dialogRef}
                className={styles.dialog}
                aria-labelledby={titleId}
                onCancel={(event) => {
                    // Escape would hide the running export. Chrome closes on a second Escape anyway –
                    // that's fine: the download still arrives.
                    if (exporting) event.preventDefault()
                }}
            >
                <h2 id={titleId} className={styles.title}>
                    Export image
                </h2>

                <SegmentedControl
                    label="Format"
                    showLabel
                    options={effect === "ascii" ? asciiFormats : imageFormats}
                    value={activeFormat}
                    onChange={setFormat}
                />

                {/* role="status": a disabled button says nothing, so screen readers hear the progress here */}
                <p className={styles.info} role="status">
                    {describeResult()}
                </p>

                {error && (
                    <p className={styles.error} role="alert">
                        {error}
                    </p>
                )}

                <div className={styles.actions}>
                    <Button disabled={exporting} onClick={() => dialogRef.current?.close()}>
                        Cancel
                    </Button>
                    <Button variant="primary" disabled={exporting} onClick={handleExport}>
                        {exporting ? "Exporting…" : `Export ${activeFormat.toUpperCase()}`}
                    </Button>
                </div>
            </dialog>
        </>
    )
}
