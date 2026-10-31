import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {restoreFromUrl, startUrlSync} from "./urlSync.ts"
import {useEditorStore} from "./useEditorStore.ts"

const store = useEditorStore

beforeEach(() => {
    vi.useFakeTimers()
    store.setState(store.getInitialState())
    history.replaceState(null, "", "/")
})

afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
})

describe("restoreFromUrl", () => {
    it("applies the link's settings", () => {
        history.replaceState(null, "", "/?effect=dithering&pixelSize=4")

        restoreFromUrl()

        expect(store.getState().effect).toBe("dithering")
        expect(store.getState().dithering.pixelSize).toBe(4)
    })

    it("is no undo step", () => {
        history.replaceState(null, "", "/?gridSize=12")

        restoreFromUrl()

        expect(store.getState().past).toEqual([])
    })
})

describe("startUrlSync", () => {
    let stop: () => void

    beforeEach(() => {
        stop = startUrlSync()
    })

    afterEach(() => stop())

    it("writes a change to the url after a short delay", () => {
        store.getState().updateHalftone({gridSize: 12})

        expect(location.search).toBe("")
        vi.advanceTimersByTime(300)
        expect(location.search).toBe("?gridSize=12")
    })

    it("writes a slider drag only once", () => {
        const replaceState = vi.spyOn(history, "replaceState")

        for (let gridSize = 10; gridSize < 30; gridSize++) {
            store.getState().updateHalftone({gridSize})
            vi.advanceTimersByTime(16)
        }
        vi.advanceTimersByTime(300)

        expect(replaceState).toHaveBeenCalledOnce()
        expect(location.search).toBe("?gridSize=29")
    })

    it("replaces the entry, so the back button isn't filled up", () => {
        const pushState = vi.spyOn(history, "pushState")

        store.getState().updateHalftone({gridSize: 12})
        vi.advanceTimersByTime(300)

        expect(pushState).not.toHaveBeenCalled()
    })

    it("ignores store changes that aren't settings", () => {
        const replaceState = vi.spyOn(history, "replaceState")

        store.getState().setRenderMs(12)
        vi.advanceTimersByTime(300)

        expect(replaceState).not.toHaveBeenCalled()
    })

    it("follows an effect change", () => {
        store.getState().setEffect("ascii")
        vi.advanceTimersByTime(300)

        expect(location.search).toBe("?effect=ascii")
    })

    it("follows undo", () => {
        store.getState().updateHalftone({gridSize: 12})
        vi.advanceTimersByTime(300)

        store.getState().undo()
        vi.advanceTimersByTime(300)

        expect(location.search).toBe("")
    })

    it("removes the query completely when everything is the default again", () => {
        store.getState().updateHalftone({gridSize: 12})
        vi.advanceTimersByTime(300)

        store.getState().updateHalftone({gridSize: 8})
        vi.advanceTimersByTime(300)

        expect(location.href.endsWith("?")).toBe(false)
        expect(location.search).toBe("")
    })

    it("does nothing after being stopped", () => {
        store.getState().updateHalftone({gridSize: 12})

        stop()
        vi.advanceTimersByTime(300)

        expect(location.search).toBe("")
    })
})
