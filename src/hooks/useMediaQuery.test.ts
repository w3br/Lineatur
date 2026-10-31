import {afterEach, describe, expect, it, vi} from "vitest"
import {act, cleanup, renderHook} from "@testing-library/react"
import {useMediaQuery} from "./useMediaQuery.ts"

/** jsdom has no matchMedia – this stand-in remembers its listeners, and the test flips the result. */
function fakeMatchMedia(initial: boolean) {
    let matches = initial
    const listeners = new Set<() => void>()

    window.matchMedia = vi.fn(() => ({
        get matches() {
            return matches
        },
        addEventListener: (_: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
    })) as unknown as typeof window.matchMedia

    return {
        listeners,
        change(next: boolean) {
            matches = next
            listeners.forEach((listener) => listener())
        },
    }
}

afterEach(cleanup)

describe("useMediaQuery", () => {
    it.each([true, false])("starts with the current result %j", (matches) => {
        fakeMatchMedia(matches)

        const {result} = renderHook(() => useMediaQuery("(max-width: 767px)"))

        expect(result.current).toBe(matches)
    })

    it("asks for the given query", () => {
        fakeMatchMedia(false)

        renderHook(() => useMediaQuery("(max-width: 767px)"))

        expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 767px)")
    })

    it("follows a change, e.g. a rotated phone", () => {
        const media = fakeMatchMedia(false)
        const {result} = renderHook(() => useMediaQuery("(max-width: 767px)"))

        act(() => media.change(true))

        expect(result.current).toBe(true)
    })

    it("stops listening after unmount", () => {
        const media = fakeMatchMedia(false)
        const {unmount} = renderHook(() => useMediaQuery("(max-width: 767px)"))
        expect(media.listeners.size).toBe(1)

        unmount()

        expect(media.listeners.size).toBe(0)
    })
})
