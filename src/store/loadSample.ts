import {hasLoadRequest, useEditorStore} from "./useEditorStore.ts"

/**
 * Opens the sample image on start, so a shared link shows its preset right away.
 * Any failure just leaves the empty state – nobody asked for this image, so there's nothing to report.
 */
export async function loadSample(): Promise<void> {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}samples/sample.jpg`)
        if (!response.ok) return

        const blob = await response.blob()
        // Dev servers answer a missing file with 200 and index.html, so ok alone proves nothing
        if (!blob.type.startsWith("image/")) return

        // The user was faster: their image is on screen or still decoding. Must not be replaced
        if (hasLoadRequest()) return

        await useEditorStore.getState().loadFile(new File([blob], "sample.jpg", {type: blob.type}))
    } catch (error) {
        console.warn("Sample image not available", error)
    }
}
