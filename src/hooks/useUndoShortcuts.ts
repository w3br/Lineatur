import {useEffect} from "react"

export function useUndoShortcuts(undo: () => void, redo: () => void) {
    // Keyboard shortcuts – listens on the whole window, so it needs cleanup
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            // Text fields keep their own native undo (e.g. typing in the hex field)
            if (event.target instanceof HTMLInputElement && event.target.type === "text") return

            // Cmd on Mac, Ctrl elsewhere
            const mod = event.ctrlKey || event.metaKey
            // Shift (or Caps Lock) turns "z" into "Z"
            const key = event.key.toLowerCase()
            if (!mod) return

            // Redo first – otherwise Ctrl+Shift+Z would end up in the undo branch
            if (key === "y" || (key === "z" && event.shiftKey)) {
                event.preventDefault()
                redo()
            } else if (key === "z") {
                event.preventDefault()
                undo()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [undo, redo])
}
