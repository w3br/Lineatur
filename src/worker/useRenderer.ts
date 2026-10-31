import {useCallback, useEffect, useRef, useState} from "react"
import type {RenderJob, RenderRequest, RenderResponse, RenderResult} from "./messages.ts"
import {useEditorStore} from "../store/useEditorStore.ts"

/**
 * Renders effects in a Web Worker so the UI never blocks.
 * "Only the latest job counts": at most one job is rendering and at most one is waiting –
 * everything in between (e.g. while dragging a slider) is skipped.
 */
export function useRenderer(source: ImageBitmap | null, job: RenderJob): RenderResult | null {
    // Refs, not state: they change all the time but must not trigger a re-render
    const workerRef = useRef<Worker | null>(null)
    const busy = useRef(false)
    const pending = useRef<RenderJob | null>(null)
    const [result, setResult] = useState<RenderResult | null>(null)

    const send = useCallback((job: RenderJob) => {
        const request: RenderRequest = {type: "render", ...job}
        workerRef.current?.postMessage(request)
        busy.current = true
    }, [])

    // 1. Start the worker – once, and again after StrictMode's test unmount
    useEffect(() => {
        const worker = new Worker(new URL("./render.worker.ts", import.meta.url), {type: "module"})
        workerRef.current = worker

        worker.onmessage = (event: MessageEvent<RenderResponse>) => {
            const response = event.data
            // Every response frees the worker – also "skipped" and "error", or busy would stay stuck
            busy.current = false

            if (response.type === "rendered") {
                const next = {bitmap: response.bitmap, ms: response.ms}
                // Updater form: this handler is created once and would otherwise only see the first result.
                // The previous bitmap is replaced now, so its memory can be freed.
                setResult((previous) => {
                    previous?.bitmap.close()
                    return next
                })
            } else if (response.type === "error") {
                console.error(response.message)
                useEditorStore.getState().showMessage("Rendering failed")
            }

            if (pending.current) {
                send(pending.current)
                pending.current = null
            }
        }

        return () => {
            worker.terminate()
            workerRef.current = null
            busy.current = false
            pending.current = null
        }
    }, [send])

    // 2. New image – copied, not transferred, so the main thread keeps it (e.g. for export)
    useEffect(() => {
        if (!source) return
        const request: RenderRequest = {type: "setImage", bitmap: source}
        workerRef.current?.postMessage(request)
    }, [source])

    // 3. New job – messages arrive in order, so it's always rendered with the image from step 2
    useEffect(() => {
        if (!source) return
        if (busy.current) {
            // Overwrites an older waiting job – that one is never rendered
            pending.current = job
        } else {
            send(job)
        }
    }, [source, job, send])

    return result
}
