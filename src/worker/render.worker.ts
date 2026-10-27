import type {RenderJob, RenderRequest, RenderResponse} from "./messages.ts"
import {renderPixelEffect} from "../effects/pipeline.ts"
import {dither} from "../effects/dither"
import {halftone} from "../effects/halftone/halftone.ts"
import {renderAscii} from "../effects/ascii/renderAscii.ts"

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

self.onmessage = (event: MessageEvent<RenderRequest>) => {
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

    const start = performance.now()

    try {
        const bitmap = render(source, request)
        // Transfer instead of copy: the bitmap moves to the main thread without duplicating its pixels
        send({type: "rendered", bitmap, ms: performance.now() - start}, [bitmap])
    } catch (error) {
        send({type: "error", message: String(error)})
    }
}
