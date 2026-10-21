import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {useState} from "react"
import {SwitchRow} from "./SwitchRow.tsx"

// SwitchRow is controlled, so the test needs a parent that holds the state.
function Harness({label = "Invert", initial = false}: {label?: string; initial?: boolean}) {
    const [checked, setChecked] = useState(initial)
    return <SwitchRow label={label} checked={checked} onChange={setChecked} />
}

function toggle(name = "Invert") {
    return screen.getByRole("switch", {name})
}

afterEach(cleanup)

describe("SwitchRow", () => {
    it("renders a labelled switch with the initial state", () => {
        render(<Harness initial={true} />)

        expect(toggle().getAttribute("aria-checked")).toBe("true")
    })

    it("toggles on click", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(toggle())
        expect(toggle().getAttribute("aria-checked")).toBe("true")

        await user.click(toggle())
        expect(toggle().getAttribute("aria-checked")).toBe("false")
    })

    it("toggles when the label is clicked", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByText("Invert"))

        expect(toggle().getAttribute("aria-checked")).toBe("true")
    })

    it.each(["{Enter}", " "])("toggles with the keyboard (%j)", async (key) => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.tab()
        expect(document.activeElement).toBe(toggle())

        await user.keyboard(key)
        expect(toggle().getAttribute("aria-checked")).toBe("true")
    })

    it("calls onChange with the negated value", async () => {
        const onChange = vi.fn()
        const user = userEvent.setup()
        render(<SwitchRow label="Invert" checked={true} onChange={onChange} />)

        await user.click(toggle())

        expect(onChange).toHaveBeenCalledExactlyOnceWith(false)
    })

    it("keeps multiple switches independent", async () => {
        const user = userEvent.setup()
        render(
            <>
                <Harness label="Invert" />
                <Harness label="Color from image" />
            </>,
        )

        await user.click(toggle("Invert"))

        expect(toggle("Invert").getAttribute("aria-checked")).toBe("true")
        expect(toggle("Color from image").getAttribute("aria-checked")).toBe("false")
    })
})
