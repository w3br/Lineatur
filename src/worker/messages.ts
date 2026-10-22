import type {AsciiParams, DitheringParams, HalftoneParams} from "../store/params"

export type RenderJob =
    | {effect: "halftone"; params: HalftoneParams}
    | {effect: "dithering"; params: DitheringParams}
    | {effect: "ascii"; params: AsciiParams}

export type RenderRequest = {type: "setImage"; bitmap: ImageBitmap} | ({type: "render"} & RenderJob)

export type RenderResponse =
    {type: "rendered"; bitmap: ImageBitmap; ms: number} | {type: "skipped"} | {type: "error"; message: string}

/** What the preview shows: the latest finished render and how long it took. */
export type RenderResult = {bitmap: ImageBitmap; ms: number}
