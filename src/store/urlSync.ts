import {useEditorStore} from "./useEditorStore.ts"
import {parseShareParams, serializeShareParams} from "../lib/shareParams.ts"

// Safari throws after about 100 replaceState calls in 30 s – a slider drag alone gets there
const WRITE_DELAY_MS = 300

/** Applies the link's settings. setState instead of updateHalftone: opening a link is no undo step. */
export function restoreFromUrl(): void {
    useEditorStore.setState(parseShareParams(location.search))
}

/** Keeps the URL in step with the settings. Returns a function that stops it. */
export function startUrlSync(): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = useEditorStore.subscribe((state, previous) => {
        // subscribe fires on every store change, also for renderMs and the undo history
        if (state.effect === previous.effect && state[state.effect] === previous[previous.effect]) return

        clearTimeout(timer)
        timer = setTimeout(() => {
            const query = serializeShareParams(useEditorStore.getState())
            // replace, not push: every slider move would otherwise be a step of the back button.
            // Without a query the pathname is needed – an empty string wouldn't remove the old one
            history.replaceState(null, "", query ? `?${query}` : location.pathname)
        }, WRITE_DELAY_MS)
    })

    return () => {
        clearTimeout(timer)
        unsubscribe()
    }
}
