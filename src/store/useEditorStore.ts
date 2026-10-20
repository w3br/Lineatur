import {create} from "zustand";
import {defaultHalftone, defaultDithering, defaultAscii,  type Effect, type HalftoneParams, type DitheringParams, type AsciiParams} from "./params.ts";
import type {LoadedImage} from "../lib/loadImage.ts";

type EditorState = {
    effect: Effect
    halftone: HalftoneParams
    dithering: DitheringParams
    ascii: AsciiParams
    image: LoadedImage | null

    setEffect: (effect: Effect) => void
    updateHalftone: (params: Partial<HalftoneParams>) => void
    updateDithering: (params: Partial<DitheringParams>) => void
    updateAscii: (params: Partial<AsciiParams>) => void
    setImage: (image: LoadedImage | null) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
    effect: 'halftone',
    halftone: defaultHalftone,
    dithering: defaultDithering,
    ascii: defaultAscii,
    image: null,

    setEffect: (effect) => set({effect}),
    updateHalftone: (params) => set((state) => ({halftone: {...state.halftone, ...params}})),
    updateDithering: (params) => set((state) => ({dithering: {...state.dithering, ...params}})),
    updateAscii: (params) => set((state) => ({ascii: {...state.ascii, ...params}})),
    setImage: (image) => set({image}),
}))