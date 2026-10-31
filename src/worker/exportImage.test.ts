import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {exportImage} from "./exportImage.ts"
import type {RenderJob, RenderRequest, RenderResponse} from "./messages.ts"
import type {LoadedImage} from "../lib/loadImage.ts"
import {defaultHalftone} from "../store/params.ts"

let workers: FakeWorker[] = []

/** jsdom has no Worker. This stand-in records the messages, and each test answers by hand. */
class FakeWorker {
    onmessage: ((event: MessageEvent<RenderResponse>) => void) | null = null
    onerror: ((event: {message?: string}) => void) | null = null
    posted: RenderRequest[] = []
    transfers: unknown[] = []
    terminated = false

    constructor() {
        workers.push(this)
    }

    postMessage(request: RenderRequest, transfer?: unknown) {
        this.posted.push(request)
        this.transfers.push(transfer)
    }

    terminate() {
        this.terminated = true
    }

    respond(response: RenderResponse) {
        this.onmessage!({data: response} as MessageEvent<RenderResponse>)
    }
}

const original = {width: 4800, height: 3200} as ImageBitmap
const preview = {width: 1200, height: 800} as ImageBitmap
const image: LoadedImage = {name: "photo.jpg", width: 4800, height: 3200, original, preview}
const job: RenderJob = {effect: "halftone", params: {...defaultHalftone, gridSize: 8}}

beforeEach(() => {
    workers = []
    vi.stubGlobal("Worker", FakeWorker)
})

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("exportImage", () => {
    it("sends the original first, then the export", () => {
        void exportImage(image, job, "png")

        const [first, second] = workers[0].posted
        expect(first).toEqual({type: "setImage", bitmap: original})
        expect(second.type).toBe("export")
    })

    it("copies the original instead of transferring it, so a second export still works", () => {
        void exportImage(image, job, "png")

        expect(workers[0].transfers).toEqual([undefined, undefined])
    })

    it("scales the params from preview to original size", () => {
        void exportImage(image, job, "png")

        expect(workers[0].posted[1]).toEqual({
            type: "export",
            format: "png",
            effect: "halftone",
            params: {...job.params, gridSize: 32},
        })
    })

    it("resolves with the blob and stops the worker", async () => {
        const blob = {} as Blob
        const result = exportImage(image, job, "png")

        workers[0].respond({type: "exported", blob})

        await expect(result).resolves.toBe(blob)
        expect(workers[0].terminated).toBe(true)
    })

    it("rejects with the worker's message and stops the worker", async () => {
        const result = exportImage(image, job, "png")

        workers[0].respond({type: "error", message: "Encoding failed"})

        await expect(result).rejects.toThrow("Encoding failed")
        expect(workers[0].terminated).toBe(true)
    })

    it("rejects when the worker skips the job", async () => {
        const result = exportImage(image, job, "png")

        workers[0].respond({type: "skipped"})

        await expect(result).rejects.toThrow("Export skipped")
        expect(workers[0].terminated).toBe(true)
    })

    it("rejects when the worker crashes", async () => {
        const result = exportImage(image, job, "png")

        workers[0].onerror!({message: "Boom"})

        await expect(result).rejects.toThrow("Boom")
        expect(workers[0].terminated).toBe(true)
    })

    it("has a message even when the worker fails to load", async () => {
        const result = exportImage(image, job, "png")

        workers[0].onerror!({})

        await expect(result).rejects.toThrow("Export worker failed")
    })
})
