import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {useEditorStore} from "./useEditorStore.ts"
import {defaultAscii, defaultDithering, defaultHalftone} from "./params.ts"
import {closeImage, loadImage, type LoadedImage} from "../lib/loadImage.ts"

// jsdom can't decode images – loadFile's own logic is tested, decoding and releasing are faked.
// Partial mock, so everything else (e.g. ACCEPTED_TYPES) stays real
vi.mock("../lib/loadImage.ts", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../lib/loadImage.ts")>()),
    loadImage: vi.fn(),
    closeImage: vi.fn(),
}))

// The store is a module-level singleton, so every test starts from a fresh copy
beforeEach(() => useEditorStore.setState(useEditorStore.getInitialState()))

afterEach(() => {
    vi.mocked(loadImage).mockReset()
    vi.mocked(closeImage).mockReset()
    vi.restoreAllMocks()
})

describe("initial state", () => {
    it("starts with halftone, the defaults and no image", () => {
        const state = useEditorStore.getState()
        expect(state.effect).toBe("halftone")
        expect(state.halftone).toEqual(defaultHalftone)
        expect(state.dithering).toEqual(defaultDithering)
        expect(state.ascii).toEqual(defaultAscii)
        expect(state.image).toBeNull()
        expect(state.renderMs).toBeNull()
    })
})

describe("updateHalftone", () => {
    it("updates one param without touching the others", () => {
        useEditorStore.getState().updateHalftone({gridSize: 12})
        const {halftone} = useEditorStore.getState()
        expect(halftone.gridSize).toBe(12)
        expect(halftone.angle).toBe(45)
    })

    it("applies several params from one patch", () => {
        useEditorStore.getState().updateHalftone({angle: 90, shape: "line"})
        expect(useEditorStore.getState().halftone).toEqual({...defaultHalftone, angle: 90, shape: "line"})
    })

    it("creates a new object instead of mutating the old one", () => {
        const before = useEditorStore.getState().halftone
        useEditorStore.getState().updateHalftone({gridSize: 30})
        // React/Zustand only notice changes through a new reference
        expect(useEditorStore.getState().halftone).not.toBe(before)
        expect(before.gridSize).toBe(8)
    })

    it("never mutates the exported defaults", () => {
        useEditorStore.getState().updateHalftone({gridSize: 30})
        expect(defaultHalftone.gridSize).toBe(8)
    })
})

describe("updateDithering", () => {
    it("updates only the given params", () => {
        useEditorStore.getState().updateDithering({algorithm: "bayer", pixelSize: 4})
        expect(useEditorStore.getState().dithering).toEqual({...defaultDithering, algorithm: "bayer", pixelSize: 4})
    })
})

describe("updateAscii", () => {
    it("updates charset and characters together", () => {
        useEditorStore.getState().updateAscii({charSet: "custom", characters: " #"})
        const {ascii} = useEditorStore.getState()
        expect(ascii.charSet).toBe("custom")
        expect(ascii.characters).toBe(" #")
        expect(ascii.cellSize).toBe(defaultAscii.cellSize)
    })
})

describe("effects are independent", () => {
    it("keeps contrast separate per effect", () => {
        useEditorStore.getState().updateHalftone({contrast: 50})
        const {halftone, dithering, ascii} = useEditorStore.getState()
        expect(halftone.contrast).toBe(50)
        expect(dithering.contrast).toBe(0)
        expect(ascii.contrast).toBe(0)
    })

    it("keeps params when switching effects and back (day 1 bug)", () => {
        useEditorStore.getState().updateHalftone({gridSize: 30})
        useEditorStore.getState().setEffect("ascii")
        useEditorStore.getState().setEffect("halftone")
        expect(useEditorStore.getState().halftone.gridSize).toBe(30)
    })
})

describe("setImage", () => {
    // ImageBitmap doesn't exist in jsdom – the store only stores the object, so a stub is enough
    const image = {name: "photo.jpg", width: 2400, height: 1600} as LoadedImage

    it("stores the image and clears it again", () => {
        useEditorStore.getState().setImage(image)
        expect(useEditorStore.getState().image).toBe(image)

        useEditorStore.getState().setImage(null)
        expect(useEditorStore.getState().image).toBeNull()
    })

    it("keeps effect params when the image changes", () => {
        useEditorStore.getState().updateDithering({threshold: 70})
        useEditorStore.getState().setImage(image)
        expect(useEditorStore.getState().dithering.threshold).toBe(70)
    })
})

describe("setRenderMs", () => {
    it("stores the last render time and clears it again", () => {
        useEditorStore.getState().setRenderMs(38)
        expect(useEditorStore.getState().renderMs).toBe(38)

        useEditorStore.getState().setRenderMs(null)
        expect(useEditorStore.getState().renderMs).toBeNull()
    })
})

describe("loadFile", () => {
    function fakeImage(name: string) {
        return {name, width: 800, height: 600} as LoadedImage
    }

    function file(name: string) {
        return new File(["x"], name, {type: "image/png"})
    }

    // A promise the test resolves by hand – controls which load finishes first
    function deferred<T>() {
        let resolve!: (value: T) => void
        const promise = new Promise<T>((r) => (resolve = r))
        return {promise, resolve}
    }

    it("loads a file and stores the image", async () => {
        const image = fakeImage("photo.png")
        vi.mocked(loadImage).mockResolvedValueOnce(image)

        await useEditorStore.getState().loadFile(file("photo.png"))

        expect(useEditorStore.getState().image).toBe(image)
        expect(closeImage).not.toHaveBeenCalled()
    })

    it("releases the previous image only after the new one is stored", async () => {
        const previous = fakeImage("old.png")
        const next = fakeImage("new.png")
        useEditorStore.getState().setImage(previous)
        vi.mocked(loadImage).mockResolvedValueOnce(next)
        // Records what the store showed at the moment closeImage ran
        let shownWhileClosing: LoadedImage | null = null
        vi.mocked(closeImage).mockImplementation(() => {
            shownWhileClosing = useEditorStore.getState().image
        })

        await useEditorStore.getState().loadFile(file("new.png"))

        expect(closeImage).toHaveBeenCalledExactlyOnceWith(previous)
        expect(shownWhileClosing).toBe(next)
    })

    it("keeps the current image when loading fails", async () => {
        const current = fakeImage("current.png")
        useEditorStore.getState().setImage(current)
        vi.mocked(loadImage).mockRejectedValueOnce(new Error("Unsupported file type: application/pdf"))
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

        await useEditorStore.getState().loadFile(new File(["x"], "doc.pdf", {type: "application/pdf"}))

        expect(useEditorStore.getState().image).toBe(current)
        expect(closeImage).not.toHaveBeenCalled()
        expect(consoleError).toHaveBeenCalled()
    })

    describe("race condition", () => {
        it("ignores an older load that finishes after a newer one", async () => {
            const slow = deferred<LoadedImage>()
            const fast = deferred<LoadedImage>()
            vi.mocked(loadImage).mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise)
            const first = fakeImage("first.png")
            const second = fakeImage("second.png")

            const loadingFirst = useEditorStore.getState().loadFile(file("first.png"))
            const loadingSecond = useEditorStore.getState().loadFile(file("second.png"))
            fast.resolve(second)
            await loadingSecond
            slow.resolve(first)
            await loadingFirst

            expect(useEditorStore.getState().image).toBe(second)
            // The discarded image is never shown, so it's released right away
            expect(closeImage).toHaveBeenCalledExactlyOnceWith(first)
        })

        it("ignores an older load even if it finishes first", async () => {
            const firstLoad = deferred<LoadedImage>()
            const secondLoad = deferred<LoadedImage>()
            vi.mocked(loadImage).mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise)
            const first = fakeImage("first.png")
            const second = fakeImage("second.png")

            const loadingFirst = useEditorStore.getState().loadFile(file("first.png"))
            const loadingSecond = useEditorStore.getState().loadFile(file("second.png"))
            firstLoad.resolve(first)
            await loadingFirst

            // The user already chose the second file – the first one must not flash up
            expect(useEditorStore.getState().image).toBeNull()
            expect(closeImage).toHaveBeenCalledExactlyOnceWith(first)

            secondLoad.resolve(second)
            await loadingSecond
            expect(useEditorStore.getState().image).toBe(second)
        })
    })
})

describe("undo / redo", () => {
    // Grouping depends on time, so the test controls the clock
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    // Longer than the 500 ms grouping window – the next change starts a new undo step
    const pause = () => vi.advanceTimersByTime(600)

    it("starts with an empty history", () => {
        const {past, future} = useEditorStore.getState()
        expect(past).toEqual([])
        expect(future).toEqual([])
    })

    it("groups quick changes into one undo step (one slider drag)", () => {
        const {updateHalftone} = useEditorStore.getState()
        updateHalftone({gridSize: 10})
        vi.advanceTimersByTime(100)
        updateHalftone({gridSize: 12})
        vi.advanceTimersByTime(100)
        updateHalftone({gridSize: 14})

        expect(useEditorStore.getState().past).toHaveLength(1)
        useEditorStore.getState().undo()
        expect(useEditorStore.getState().halftone.gridSize).toBe(8)
    })

    it("creates separate steps for changes more than 500 ms apart", () => {
        const {updateHalftone} = useEditorStore.getState()
        updateHalftone({gridSize: 10})
        pause()
        updateHalftone({gridSize: 12})

        useEditorStore.getState().undo()
        expect(useEditorStore.getState().halftone.gridSize).toBe(10)
        useEditorStore.getState().undo()
        expect(useEditorStore.getState().halftone.gridSize).toBe(8)
    })

    it("restores an undone change with redo", () => {
        useEditorStore.getState().updateDithering({threshold: 70})
        useEditorStore.getState().undo()
        expect(useEditorStore.getState().dithering.threshold).toBe(50)

        useEditorStore.getState().redo()
        expect(useEditorStore.getState().dithering.threshold).toBe(70)
        expect(useEditorStore.getState().future).toEqual([])
    })

    it("clears the redo stack on a new change", () => {
        useEditorStore.getState().updateAscii({cellSize: 12})
        useEditorStore.getState().undo()
        expect(useEditorStore.getState().future).toHaveLength(1)

        useEditorStore.getState().updateAscii({invert: true})
        expect(useEditorStore.getState().future).toEqual([])
    })

    it("does nothing when there is nothing to undo or redo", () => {
        const before = useEditorStore.getState()
        useEditorStore.getState().undo()
        useEditorStore.getState().redo()
        // Same reference = Zustand saw no change, so nothing re-renders
        expect(useEditorStore.getState()).toBe(before)
    })

    it("starts a new step for a change right after undo", () => {
        const {updateHalftone} = useEditorStore.getState()
        updateHalftone({gridSize: 10})
        pause()
        updateHalftone({gridSize: 12})
        useEditorStore.getState().undo()
        // Within 500 ms of the undo – must still be its own step (lastChangeAt reset)
        vi.advanceTimersByTime(100)
        updateHalftone({gridSize: 20})

        useEditorStore.getState().undo()
        expect(useEditorStore.getState().halftone.gridSize).toBe(10)
    })

    it("treats an effect switch as its own undo step", () => {
        useEditorStore.getState().updateHalftone({gridSize: 10})
        pause()
        useEditorStore.getState().setEffect("ascii")

        useEditorStore.getState().undo()
        expect(useEditorStore.getState().effect).toBe("halftone")
        expect(useEditorStore.getState().halftone.gridSize).toBe(10)
    })

    it("ignores a switch to the already active effect", () => {
        useEditorStore.getState().setEffect("halftone")
        expect(useEditorStore.getState().past).toEqual([])
    })

    it("restores all effects at once, not only the active one", () => {
        useEditorStore.getState().updateHalftone({contrast: 40})
        useEditorStore.getState().updateDithering({contrast: -20})
        useEditorStore.getState().undo()

        const {halftone, dithering} = useEditorStore.getState()
        expect(halftone.contrast).toBe(0)
        expect(dithering.contrast).toBe(0)
    })

    it("keeps at most 100 undo steps and drops the oldest", () => {
        const {updateHalftone} = useEditorStore.getState()
        for (let i = 1; i <= 101; i++) {
            updateHalftone({gridSize: i})
            pause()
        }

        const {past} = useEditorStore.getState()
        expect(past).toHaveLength(100)
        // The default (gridSize 8 before the first change) fell out – the oldest kept step is gridSize 1
        expect(past[0].halftone.gridSize).toBe(1)
    })

    it("does not touch the history when an image is set", () => {
        useEditorStore.getState().updateHalftone({gridSize: 10})
        const before = useEditorStore.getState().past
        useEditorStore.getState().setImage({name: "photo.jpg", width: 800, height: 600} as LoadedImage)
        useEditorStore.getState().setRenderMs(20)

        expect(useEditorStore.getState().past).toBe(before)
    })

    it("does not undo the image", () => {
        const image = {name: "photo.jpg", width: 800, height: 600} as LoadedImage
        useEditorStore.getState().updateHalftone({gridSize: 10})
        useEditorStore.getState().setImage(image)
        useEditorStore.getState().undo()

        expect(useEditorStore.getState().image).toBe(image)
        expect(useEditorStore.getState().halftone.gridSize).toBe(8)
    })
})

describe("showMessage", () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it("shows the message and removes it after 4 s", () => {
        useEditorStore.getState().showMessage("Rendering failed")
        expect(useEditorStore.getState().message).toBe("Rendering failed")

        vi.advanceTimersByTime(3999)
        expect(useEditorStore.getState().message).toBe("Rendering failed")

        vi.advanceTimersByTime(1)
        expect(useEditorStore.getState().message).toBeNull()
    })

    it("gives a new message its full time", () => {
        useEditorStore.getState().showMessage("First")
        vi.advanceTimersByTime(3000)

        useEditorStore.getState().showMessage("Second")
        vi.advanceTimersByTime(3000)

        expect(useEditorStore.getState().message).toBe("Second")
    })

    it("is no undo step", () => {
        useEditorStore.getState().showMessage("Rendering failed")

        expect(useEditorStore.getState().past).toEqual([])
    })
})

describe("loadFile messages", () => {
    beforeEach(() => {
        vi.spyOn(console, "error").mockImplementation(() => {})
    })

    it("names the supported types for an unsupported file", async () => {
        vi.mocked(loadImage).mockRejectedValueOnce(new Error("Unsupported file type: application/pdf"))

        await useEditorStore.getState().loadFile(new File(["x"], "doc.pdf", {type: "application/pdf"}))

        expect(useEditorStore.getState().message).toBe("Unsupported file – use PNG, JPG or WebP")
    })

    it("says something else for a broken file of a supported type", async () => {
        vi.mocked(loadImage).mockRejectedValueOnce(new Error("The source image could not be decoded"))

        await useEditorStore.getState().loadFile(new File(["x"], "broken.png", {type: "image/png"}))

        expect(useEditorStore.getState().message).toBe("Could not open this image")
    })

    it("stays silent when loading works", async () => {
        vi.mocked(loadImage).mockResolvedValueOnce({name: "photo.png"} as LoadedImage)

        await useEditorStore.getState().loadFile(new File(["x"], "photo.png", {type: "image/png"}))

        expect(useEditorStore.getState().message).toBeNull()
    })
})
