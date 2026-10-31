import {useCallback, useSyncExternalStore} from "react"

/**
 * Whether a CSS media query matches right now.
 * useSyncExternalStore is React's tool for values that live outside of React –
 * it re-renders on every change and never shows a stale value.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onChange: () => void) => {
            const list = window.matchMedia(query)
            list.addEventListener("change", onChange)
            return () => list.removeEventListener("change", onChange)
        },
        [query],
    )

    return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
