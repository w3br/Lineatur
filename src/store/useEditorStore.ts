import {create} from "zustand"
import {
    defaultEffect,
    defaultHalftone,
    defaultDithering,
    defaultAscii,
    type Effect,
    type HalftoneParams,
    type DitheringParams,
    type AsciiParams,
} from "./params.ts"
import {closeImage, loadImage, type LoadedImage, isSupportedImage} from "../lib/loadImage.ts"

type EditorState = {
    effect: Effect
    halftone: HalftoneParams
    dithering: DitheringParams
    ascii: AsciiParams
    image: LoadedImage | null
    /** How long the last preview render took – shown in the status bar */
    renderMs: number | null
    past: Snapshot[]
    future: Snapshot[]
    lastChangeAt: number

    undo: () => void
    redo: () => void
    setEffect: (effect: Effect) => void
    updateHalftone: (params: Partial<HalftoneParams>) => void
    updateDithering: (params: Partial<DitheringParams>) => void
    updateAscii: (params: Partial<AsciiParams>) => void
    setImage: (image: LoadedImage | null) => void
    setRenderMs: (ms: number | null) => void
    loadFile: (file: File) => Promise<void>
    /** Shown in the status bar for a few seconds, e.g. when a file can't be opened */
    message: string | null
    showMessage: (text: string) => void
}

type Snapshot = Pick<EditorState, "effect" | "halftone" | "dithering" | "ascii">

let latestRequest = 0

/** True as soon as any image was requested – also while it's still decoding, when `image` is null. */
export function hasLoadRequest(): boolean {
    return latestRequest > 0
}

const MESSAGE_MS = 4000
let messageTimer: ReturnType<typeof setTimeout> | undefined

function snapshotOf(state: EditorState): Snapshot {
    return {
        effect: state.effect,
        halftone: state.halftone,
        dithering: state.dithering,
        ascii: state.ascii,
    }
}

const COALESCE_MS = 500
const HISTORY_LIMIT = 100

// Called at the start of every user change. Changes less than COALESCE_MS apart
// (e.g. one slider drag) share a single undo step.
function record(state: EditorState): Pick<EditorState, "past" | "future" | "lastChangeAt"> {
    const now = Date.now()
    const startsNewStep = now - state.lastChangeAt > COALESCE_MS

    return {
        past: startsNewStep ? [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT) : state.past,
        future: [],
        lastChangeAt: now,
    }
}

export const useEditorStore = create<EditorState>()((set, get) => ({
    effect: defaultEffect,
    halftone: defaultHalftone,
    dithering: defaultDithering,
    ascii: defaultAscii,
    image: null,
    renderMs: null,
    past: [],
    future: [],
    lastChangeAt: 0,
    message: null,

    undo: () =>
        set((state) => {
            if (state.past.length === 0) return state
            const previous = state.past[state.past.length - 1]
            return {
                ...previous,
                past: state.past.slice(0, -1),
                future: [snapshotOf(state), ...state.future],
                lastChangeAt: 0,
            }
        }),

    redo: () =>
        set((state) => {
            if (state.future.length === 0) return state
            const next = state.future[0]
            return {
                ...next,
                past: [...state.past, snapshotOf(state)].slice(-HISTORY_LIMIT),
                future: state.future.slice(1),
                lastChangeAt: 0,
            }
        }),

    showMessage: (text) => {
        // A new message gets its full time – the old timer would clear it too early
        clearTimeout(messageTimer)
        set({message: text})
        messageTimer = setTimeout(() => set({message: null}), MESSAGE_MS)
    },

    setEffect: (effect) => set((state) => (effect === state.effect ? state : {...record(state), effect})),
    updateHalftone: (params) =>
        set((state) => ({
            ...record(state),
            halftone: {...state.halftone, ...params},
        })),
    updateDithering: (params) =>
        set((state) => ({
            ...record(state),
            dithering: {...state.dithering, ...params},
        })),
    updateAscii: (params) =>
        set((state) => ({
            ...record(state),
            ascii: {...state.ascii, ...params},
        })),
    setImage: (image) => set({image}),
    setRenderMs: (renderMs) => set({renderMs}),

    loadFile: async (file) => {
        const request = ++latestRequest

        try {
            const next = await loadImage(file)

            if (request !== latestRequest) {
                closeImage(next)
                return
            }

            const previous = get().image
            set({image: next})
            if (previous) closeImage(previous)
        } catch (error) {
            // The console keeps the details, the status bar says what to do
            console.error(error)
            get().showMessage(
                isSupportedImage(file) ? "Could not open this image" : "Unsupported file – use PNG, JPG or WebP",
            )
        }
    },
}))
