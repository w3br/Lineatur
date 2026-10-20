import {useEffect} from "react";

export function usePasteFile(onFile: (file: File) => void) {
    // Paste (Ctrl+V) – listens on the whole window, so it needs cleanup
    useEffect(() => {
        function handlePaste(event: ClipboardEvent) {
            const file = event.clipboardData?.files[0]
            if (file) onFile(file)
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [onFile])
}
