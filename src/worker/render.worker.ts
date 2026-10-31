import type {RenderJob, RenderRequest, RenderResponse} from "./messages.ts"
import {renderPixelEffect} from "../effects/pipeline.ts"
import {dither} from "../effects/dither"
import {halftone} from "../effects/halftone/halftone.ts"
import {asciiCells, renderAscii} from "../effects/ascii/renderAscii.ts"
import {toAsciiText} from "../effects/ascii/ascii.ts"

// The current image lives in the worker, so a render request only has to carry the settings
let source: ImageBitmap | null = null

/** Typed wrapper around postMessage – TypeScript checks every response against RenderResponse. */
function send(response: RenderResponse, transfer: Transferable[] = []) {
    self.postMessage(response, {transfer})
}

function render(source: ImageBitmap, job: RenderJob): ImageBitmap {
    if (job.effect === "dithering") {
        return renderPixelEffect(source, job.params.pixelSize, (image) => dither(image, job.params))
    }

    if (job.effect === "halftone") {
        return renderPixelEffect(source, 1, (image) => halftone(image, job.params))
    }
    return renderAscii(source, job.params)
}

function toBlob(bitmap: ImageBitmap, options: ImageEncodeOptions): Promise<Blob> {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not create a 2D canvas context")

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close() // Free the bitmap's memory – the canvas now owns the pixels
    return canvas.convertToBlob(options)
}

async function exportBlob(source: ImageBitmap, request: Extract<RenderRequest, {type: "export"}>): Promise<Blob> {
    if (request.format === "txt") {
        if (request.effect !== "ascii") throw new Error("TXT export only works for ASCII")
        const text = toAsciiText(asciiCells(source, request.params), request.params)
        return new Blob([text], {type: "text/plain"})
    }

    const rendered = render(source, request)
    switch (request.format) {
        case "png":
            return toBlob(rendered, {type: "image/png"})
        case "jpg":
            return toBlob(rendered, {type: "image/jpeg", quality: 0.9})
    }
}

self.onmessage = async (event: MessageEvent<RenderRequest>) => {
    const request = event.data
    if (request.type === "setImage") {
        source?.close()
        source = request.bitmap
        return
    }

    // Always answer – otherwise the main thread waits forever for this job to finish
    if (!source) {
        send({type: "skipped"})
        return
    }

    if (request.type === "export") {
        try {
            send({type: "exported", blob: await exportBlob(source, request)})
        } catch (error) {
            send({type: "error", message: String(error)})
        }
        return
    }

    const start = performance.now()

    try {
        const bitmap = render(source, request)
        // Transfer instead of copy: the bitmap moves to the main thread without duplicating its pixels
        send({type: "rendered", bitmap, ms: performance.now() - start}, [bitmap])
    } catch (error) {
        send({type: "error", message: String(error)})
    }
}
