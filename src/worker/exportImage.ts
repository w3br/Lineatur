import type {LoadedImage} from "../lib/loadImage.ts"
import type {ExportFormat, RenderJob, RenderRequest, RenderResponse} from "./messages.ts"
import {scaleParams} from "./scaleParams.ts"

/**
 * Renders the original image in its own short-lived worker, so the preview's worker stays free.
 * Size params are set in preview pixels, so they're scaled up to the original first.
 */
export function exportImage(image: LoadedImage, job: RenderJob, format: ExportFormat): Promise<Blob> {
    const scale = image.width / image.preview.width
    const worker = new Worker(new URL("./render.worker.ts", import.meta.url), {type: "module"})

    // Explicit <Blob>: .finally() hides the return type, so TypeScript can't infer it from the signature
    return new Promise<Blob>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<RenderResponse>) => {
            const response = event.data
            if (response.type === "exported") {
                resolve(response.blob)
            } else if (response.type === "error") {
                reject(new Error(response.message))
            } else if (response.type === "skipped") {
                reject(new Error("Export skipped: the worker has no image"))
            }
        }

        // A worker that fails to load fires a plain Event without a message
        worker.onerror = (event) => {
            reject(new Error(event.message || "Export worker failed"))
        }

        // Typed, because postMessage accepts anything – a wrong message would only fail at runtime.
        // Copied, not transferred: the main thread keeps the original for the next export.
        const setImage: RenderRequest = {type: "setImage", bitmap: image.original}
        const request: RenderRequest = {type: "export", format, ...scaleParams(job, scale)}
        worker.postMessage(setImage)
        worker.postMessage(request)
    }).finally(() => {
        worker.terminate()
    })
}
