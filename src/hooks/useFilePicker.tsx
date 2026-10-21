import {type ChangeEvent, useRef} from "react"
import {ACCEPTED_TYPES} from "../lib/loadImage.ts"

export function useFilePicker(onFile: (file: File) => void) {
    const inputRef = useRef<HTMLInputElement>(null)

    function open() {
        inputRef.current?.click()
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (file) onFile(file)
        event.target.value = "" // allows choosing the same file again
    }

    const input = (
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join()} hidden onChange={handleInputChange} />
    )

    return {open, input}
}
