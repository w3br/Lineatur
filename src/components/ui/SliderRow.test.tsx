import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, fireEvent, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {useState} from "react"
import {SliderRow} from "./SliderRow.tsx"

// SliderRow is controlled, so the test needs a parent that holds the state.
function Harness({initial = 50, onChange}: {initial?: number; onChange?: (value: number) => void}) {
    const [value, setValue] = useState(initial)
    return (
        <SliderRow
            label="Resolution"
            value={value}
            min={0}
            max={200}
            onChange={(next) => {
                setValue(next)
                onChange?.(next)
            }}
        />
    )
}

function slider() {
    return screen.getByRole<HTMLInputElement>("slider", {name: "Resolution"})
}

function field() {
    return screen.getByRole<HTMLInputElement>("textbox", {name: "Resolution value"})
}

afterEach(cleanup)

describe("SliderRow", () => {
    describe("slider", () => {
        it("is labelled and shows the current value", () => {
            render(<Harness initial={50} />)

            expect(slider().value).toBe("50")
            expect(field().value).toBe("50")
        })

        it("calls onChange with a number, not a string", () => {
            const onChange = vi.fn()
            render(<Harness onChange={onChange} />)

            // userEvent can't drag a range input, so set the value directly
            fireEvent.change(slider(), {target: {value: "150"}})

            expect(onChange).toHaveBeenCalledWith(150)
            expect(field().value).toBe("150")
        })

        it("exposes the fill percentage as --fill", () => {
            render(<Harness initial={50} />)

            expect(slider().style.getPropertyValue("--fill")).toBe("25%")
        })
    })

    describe("value field", () => {
        it("commits a typed value on Enter and moves the slider", async () => {
            const user = userEvent.setup()
            render(<Harness />)

            await user.clear(field())
            await user.type(field(), "120{Enter}")

            expect(slider().value).toBe("120")
            expect(slider().style.getPropertyValue("--fill")).toBe("60%")
        })

        it("commits on blur", async () => {
            const user = userEvent.setup()
            render(<Harness />)

            await user.clear(field())
            await user.type(field(), "80")
            await user.tab()

            expect(slider().value).toBe("80")
        })

        it("does not commit while typing", async () => {
            const onChange = vi.fn()
            const user = userEvent.setup()
            render(<Harness onChange={onChange} />)

            await user.clear(field())
            await user.type(field(), "12")

            expect(onChange).not.toHaveBeenCalled()
            expect(field().value).toBe("12")
        })

        it("clamps values above max and below min", async () => {
            const user = userEvent.setup()
            render(<Harness />)

            await user.clear(field())
            await user.type(field(), "999{Enter}")
            expect(slider().value).toBe("200")
            expect(field().value).toBe("200")

            await user.clear(field())
            await user.type(field(), "-5{Enter}")
            expect(slider().value).toBe("0")
            expect(field().value).toBe("0")
        })

        it("accepts a comma as decimal separator", async () => {
            const onChange = vi.fn()
            const user = userEvent.setup()
            render(<Harness onChange={onChange} />)

            await user.clear(field())
            await user.type(field(), "12,5{Enter}")

            expect(onChange).toHaveBeenCalledWith(12.5)
        })

        it.each(["abc", ""])("reverts invalid input %j to the current value", async (input) => {
            const onChange = vi.fn()
            const user = userEvent.setup()
            render(<Harness onChange={onChange} />)

            await user.clear(field())
            if (input) await user.type(field(), input)
            await user.keyboard("{Enter}")

            expect(onChange).not.toHaveBeenCalled()
            expect(field().value).toBe("50")
        })

        it("discards the draft on Escape", async () => {
            const onChange = vi.fn()
            const user = userEvent.setup()
            render(<Harness onChange={onChange} />)

            await user.clear(field())
            await user.type(field(), "120{Escape}")
            await user.tab()

            expect(onChange).not.toHaveBeenCalled()
            expect(field().value).toBe("50")
        })
    })
})
