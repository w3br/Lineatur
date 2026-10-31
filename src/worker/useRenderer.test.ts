import {StrictMode} from "react"
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {act, renderHook} from "@testing-library/react"
import {useRenderer} from "./useRenderer.ts"
import type {RenderJob, RenderRequest, RenderResponse} from "./messages.ts"
import {defaultDithering} from "../store/params.ts"
import {useEditorStore} from "../store/useEditorStore.ts"

// jsdom has no Worker – the fake records what it gets, and the test decides when it answers
class FakeWorker {
    onmessage: ((event: MessageEvent<RenderResponse>) => void) | null = null
    posted: RenderRequest[] = []
    terminated = false

    constructor() {
        workers.push(this)
    }

    postMessage(request: RenderRequest) {
        this.posted.push(request)
    }

    terminate() {
        this.terminated = true
    }

    /** Simulates the worker finishing a job. */
    respond(response: RenderResponse) {
        act(() => this.onmessage!({data: response} as MessageEvent<RenderResponse>))
    }

    /** Only the render requests, as the jobs they carry. */
    rendered() {
        return this.posted.filter((request) => request.type === "render").map((request) => request.params)
    }
}

let workers: FakeWorker[] = []

beforeEach(() => {
    workers = []
    vi.stubGlobal("Worker", FakeWorker)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

function source(width = 800, height = 600) {
    return {width, height} as ImageBitmap
}

/** Jobs that differ only in contrast – easy to tell apart. */
function job(contrast: number): RenderJob {
    return {effect: "dithering", params: {...defaultDithering, contrast}}
}

function result(ms = 10) {
    return {type: "rendered", bitmap: {close: vi.fn()} as unknown as ImageBitmap, ms} as const
}

function setup(initial: {source: ImageBitmap | null; job: RenderJob}) {
    const hook = renderHook((props) => useRenderer(props.source, props.job), {initialProps: initial})
    return {...hook, worker: workers.at(-1)!}
}

describe("useRenderer", () => {
    it("sends the image first, then the job", () => {
        const image = source()
        const {worker} = setup({source: image, job: job(10)})

        expect(worker.posted).toEqual([
            {type: "setImage", bitmap: image},
            {type: "render", ...job(10)},
        ])
    })

    it("doesn't render without an image", () => {
        const {worker} = setup({source: null, job: job(10)})

        expect(worker.posted).toEqual([])
    })

    it("returns nothing until the first render is done, then the result", () => {
        const {result: hook, worker} = setup({source: source(), job: job(10)})
        expect(hook.current).toBeNull()

        const done = result(38)
        worker.respond(done)

        expect(hook.current).toEqual({bitmap: done.bitmap, ms: 38})
    })

    describe("only the latest job counts", () => {
        it("doesn't send while the worker is busy", () => {
            const image = source()
            const {rerender, worker} = setup({source: image, job: job(10)})

            rerender({source: image, job: job(20)})

            expect(worker.rendered()).toEqual([job(10).params])
        })

        it("skips jobs in between and sends only the newest when the worker is free", () => {
            const image = source()
            const {rerender, worker} = setup({source: image, job: job(10)})

            rerender({source: image, job: job(20)})
            rerender({source: image, job: job(30)})
            rerender({source: image, job: job(40)})
            worker.respond(result())

            expect(worker.rendered()).toEqual([job(10).params, job(40).params])
        })

        it("sends right away when nothing is waiting", () => {
            const image = source()
            const {rerender, worker} = setup({source: image, job: job(10)})
            worker.respond(result())

            rerender({source: image, job: job(20)})

            expect(worker.rendered()).toEqual([job(10).params, job(20).params])
        })

        // Pitfall 1: if only "rendered" freed the worker, nothing would ever render again
        it.each([
            ["skipped", {type: "skipped"}],
            ["error", {type: "error", message: "boom"}],
        ] as const)("frees the worker on '%s' too", (_name, response) => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            const image = source()
            const {rerender, worker} = setup({source: image, job: job(10)})

            // Nothing is waiting – the next job must still go out right away
            worker.respond(response)
            rerender({source: image, job: job(20)})

            expect(worker.rendered()).toEqual([job(10).params, job(20).params])
        })
    })

    it("logs render errors", () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
        const {worker} = setup({source: source(), job: job(10)})

        worker.respond({type: "error", message: "Could not create a 2D canvas context"})

        expect(consoleError).toHaveBeenCalledWith("Could not create a 2D canvas context")
    })

    it("tells the user when rendering fails", () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        useEditorStore.setState({message: null})
        const {worker} = setup({source: source(), job: job(10)})

        worker.respond({type: "error", message: "Could not create a 2D canvas context"})

        expect(useEditorStore.getState().message).toBe("Rendering failed")
    })

    it("frees the previous bitmap when a new result arrives", () => {
        const image = source()
        const {rerender, worker} = setup({source: image, job: job(10)})
        const first = result()
        worker.respond(first)

        rerender({source: image, job: job(20)})
        worker.respond(result())

        expect(first.bitmap.close).toHaveBeenCalled()
    })

    it("sends a new image together with the current job", () => {
        const {rerender, worker} = setup({source: source(), job: job(10)})
        worker.respond(result())
        worker.posted = []

        const next = source(400, 1200)
        rerender({source: next, job: job(10)})

        expect(worker.posted).toEqual([
            {type: "setImage", bitmap: next},
            {type: "render", ...job(10)},
        ])
    })

    it("doesn't render again when the same job comes back", () => {
        const image = source()
        const sameJob = job(10)
        const {rerender, worker} = setup({source: image, job: sameJob})
        worker.respond(result())

        rerender({source: image, job: sameJob})

        expect(worker.rendered()).toHaveLength(1)
    })

    it("stops the worker on unmount", () => {
        const {unmount, worker} = setup({source: source(), job: job(10)})

        unmount()

        expect(worker.terminated).toBe(true)
    })

    // Pitfall 2: StrictMode mounts, unmounts and mounts again in development
    it("ends up with exactly one live worker that has the image and the job under StrictMode", () => {
        const image = source()
        renderHook(() => useRenderer(image, job(10)), {wrapper: StrictMode})

        const live = workers.filter((worker) => !worker.terminated)
        expect(live).toHaveLength(1)
        expect(live[0].posted).toEqual([
            {type: "setImage", bitmap: image},
            {type: "render", ...job(10)},
        ])
    })
})
