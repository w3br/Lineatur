import type {RenderJob} from "./messages.ts"

export function scaleParams(job: RenderJob, scale: number): RenderJob {
    switch (job.effect) {
        case "halftone":
            return {
                ...job,
                params: {...job.params, gridSize: job.params.gridSize * scale},
            }
        case "dithering":
            return {
                ...job,
                params: {...job.params, pixelSize: job.params.pixelSize * scale},
            }
        case "ascii":
            return {
                ...job,
                params: {...job.params, cellSize: job.params.cellSize * scale},
            }
    }
}
