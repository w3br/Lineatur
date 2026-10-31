import type {Effect} from "../store/params.ts"
import type {ExportFormat} from "../worker/messages.ts"

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()

    // Revoke the object URL after a short delay to ensure the download has started
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function exportFileName(name: string, effect: Effect, format: ExportFormat): string {
    const newName = name.replace(/\.[^.]+$/, "") // Remove existing extension
    return `${newName}-lineatur-${effect}.${format}`
}
