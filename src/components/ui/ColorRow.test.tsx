import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {useState} from "react"
import {ColorRow} from "./ColorRow.tsx"

// ColorRow is controlled, so the test needs a parent that holds the state.
function Harness({initial = "#111113", onChange}: {initial?: string; onChange?: (color: string) => void}) {
    const [value, setValue] = useState(initial)
    return (
        <ColorRow
            label="Foreground"
            value={value}
            onChange={(next) => {
                setValue(next)
                onChange?.(next)
            }}
        />
    )
}

function swatch() {
    // <input type="color"> has no ARIA role, so find it via its label
    return screen.getByLabelText<HTMLInputElement>("Foreground")
}

function hexField() {
    return screen.getByRole<HTMLInputElement>("textbox", {name: "Foreground hex value"})
}

async function typeHex(text: string) {
    const user = userEvent.setup()
    await user.clear(hexField())
    // user.type rejects an empty string, so only type when there is something to type
    if (text) await user.type(hexField(), text)
    return user
}

afterEach(cleanup)

describe("ColorRow", () => {
    describe("swatch", () => {
        it("is labelled and shows the current color", () => {
            render(<Harness initial="#111113" />)

            expect(swatch().type).toBe("color")
            expect(swatch().value).toBe("#111113")
        })

        it("shows the hex value in upper case", () => {
            render(<Harness initial="#ff8800" />)

            expect(hexField().value).toBe("#FF8800")
        })

        it("updates the hex field when a color is picked", () => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            // userEvent can't operate the native color picker, so set the value directly
            fireEvent.change(swatch(), {target: {value: "#00ff00"}})

            expect(onChange).toHaveBeenCalledWith("#00ff00")
            expect(hexField().value).toBe("#00FF00")
        })
    })

    describe("hex field", () => {
        it("commits a typed value on Enter and updates the swatch", async () => {
            render(<Harness />)

            await typeHex("#FF8800{Enter}")

            expect(swatch().value).toBe("#ff8800")
            expect(hexField().value).toBe("#FF8800")
        })

        it("commits on blur", async () => {
            render(<Harness />)

            const user = await typeHex("#00ff00")
            await user.tab()

            expect(swatch().value).toBe("#00ff00")
        })

        it("does not commit while typing", async () => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            await typeHex("#ff88")

            expect(onChange).not.toHaveBeenCalled()
            expect(hexField().value).toBe("#ff88")
        })

        it("accepts input without # and the shorthand form", async () => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            await typeHex("ff8800{Enter}")
            expect(onChange).toHaveBeenLastCalledWith("#ff8800")

            await typeHex("#0f0{Enter}")
            expect(onChange).toHaveBeenLastCalledWith("#00ff00")
            expect(hexField().value).toBe("#00FF00")
        })

        it.each(["#gg0000", "#ff88", ""])("reverts invalid input %j to the current value", async (input) => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            const user = await typeHex(input)
            await user.keyboard("{Enter}")

            expect(onChange).not.toHaveBeenCalled()
            expect(hexField().value).toBe("#111113")
            expect(swatch().value).toBe("#111113")
        })

        it("discards the draft on Escape", async () => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            const user = await typeHex("#ff8800{Escape}")
            await user.tab()

            expect(onChange).not.toHaveBeenCalled()
            expect(hexField().value).toBe("#111113")
        })

        it("limits the input to 7 characters", async () => {
            render(<Harness />)

            await typeHex("#ff8800ff")

            expect(hexField().value).toBe("#ff8800")
        })
    })
})
