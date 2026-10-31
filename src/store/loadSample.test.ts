import {afterEach, beforeEach, describe, expect, it, vi} from "vitest"
import {loadImage, type LoadedImage} from "../lib/loadImage.ts"

// jsdom can't decode images – partial mock, isSupportedImage stays real
vi.mock("../lib/loadImage.ts", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../lib/loadImage.ts")>()),
    loadImage: vi.fn(),
    closeImage: vi.fn(),
}))

const fetchMock = vi.fn()
const image = {name: "sample.jpg"} as LoadedImage

function answer(body: string, type: string, ok = true) {
    return {ok, blob: async () => new Blob([body], {type})}
}

/** Fresh modules per test – whether an image was requested is remembered inside the store's module. */
async function setup() {
    vi.resetModules()
    const {useEditorStore} = await import("./useEditorStore.ts")
    const {loadSample} = await import("./loadSample.ts")
    return {useEditorStore, loadSample}
}

beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
    vi.mocked(loadImage).mockResolvedValue(image)
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    fetchMock.mockReset()
    vi.mocked(loadImage).mockReset()
})

describe("loadSample", () => {
    it("loads the sample from the base path", async () => {
        fetchMock.mockResolvedValueOnce(answer("jpg", "image/jpeg"))
        const {useEditorStore, loadSample} = await setup()

        await loadSample()

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${import.meta.env.BASE_URL}samples/sample.jpg`)
        expect(useEditorStore.getState().image).toBe(image)
        expect(vi.mocked(loadImage).mock.lastCall![0].name).toBe("sample.jpg")
    })

    it("keeps the empty state when the file is missing", async () => {
        fetchMock.mockResolvedValueOnce(answer("Not found", "text/html", false))
        const {useEditorStore, loadSample} = await setup()

        await loadSample()

        expect(useEditorStore.getState().image).toBeNull()
        expect(loadImage).not.toHaveBeenCalled()
    })

    it("isn't fooled by a dev server answering 200 with index.html", async () => {
        fetchMock.mockResolvedValueOnce(answer("<!doctype html>", "text/html"))
        const {loadSample} = await setup()

        await loadSample()

        expect(loadImage).not.toHaveBeenCalled()
    })

    it("keeps the empty state when the network fails", async () => {
        vi.spyOn(console, "warn").mockImplementation(() => {})
        fetchMock.mockRejectedValueOnce(new Error("Offline"))
        const {useEditorStore, loadSample} = await setup()

        await expect(loadSample()).resolves.toBeUndefined()

        expect(useEditorStore.getState().image).toBeNull()
    })

    it("doesn't replace an image the user opened while the sample was loading", async () => {
        const mine = {name: "mine.png"} as LoadedImage
        let finishFetch!: (response: unknown) => void
        fetchMock.mockReturnValueOnce(new Promise((resolve) => (finishFetch = resolve)))
        const {useEditorStore, loadSample} = await setup()

        const sample = loadSample()
        vi.mocked(loadImage).mockResolvedValueOnce(mine)
        await useEditorStore.getState().loadFile(new File(["x"], "mine.png", {type: "image/png"}))
        finishFetch(answer("jpg", "image/jpeg"))
        await sample

        expect(useEditorStore.getState().image).toBe(mine)
        expect(loadImage).toHaveBeenCalledOnce()
    })

    it("doesn't cancel an image that is still decoding", async () => {
        const mine = {name: "mine.png"} as LoadedImage
        let finishDecoding!: (image: LoadedImage) => void
        vi.mocked(loadImage).mockReturnValueOnce(new Promise((resolve) => (finishDecoding = resolve)))
        fetchMock.mockResolvedValueOnce(answer("jpg", "image/jpeg"))
        const {useEditorStore, loadSample} = await setup()

        const decoding = useEditorStore.getState().loadFile(new File(["x"], "mine.png", {type: "image/png"}))
        await loadSample()
        finishDecoding(mine)
        await decoding

        expect(useEditorStore.getState().image).toBe(mine)
    })
})
