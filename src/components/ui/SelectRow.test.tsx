import {afterEach, describe, expect, it, vi} from "vitest"
import {cleanup, render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {useState} from "react"
import {SelectRow} from "./SelectRow.tsx"

type Algorithm = "floyd-steinberg" | "atkinson" | "bayer"

const options: {value: Algorithm; label: string}[] = [
    {value: "floyd-steinberg", label: "Floyd–Steinberg"},
    {value: "atkinson", label: "Atkinson"},
    {value: "bayer", label: "Bayer"},
]

// SelectRow is controlled, so the test needs a parent that holds the state.
function Harness({initial = "atkinson"}: {initial?: Algorithm}) {
    const [value, setValue] = useState<Algorithm>(initial)
    return <SelectRow label="Algorithm" options={options} value={value} onChange={setValue} />
}

function select() {
    // A single-choice <select> has the ARIA role "combobox"
    return screen.getByRole<HTMLSelectElement>("combobox", {name: "Algorithm"})
}

afterEach(cleanup)

describe("SelectRow", () => {
    it("renders a labelled select with the initial value", () => {
        render(<Harness initial="atkinson" />)

        expect(select().value).toBe("atkinson")
    })

    it("renders one option per entry, showing the label", () => {
        render(<Harness />)

        const rendered = screen.getAllByRole<HTMLOptionElement>("option")

        expect(rendered.map((option) => option.textContent)).toEqual(["Floyd–Steinberg", "Atkinson", "Bayer"])
        expect(rendered.map((option) => option.value)).toEqual(["floyd-steinberg", "atkinson", "bayer"])
    })

    it("updates the selection when an option is chosen", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.selectOptions(select(), "Bayer")

        expect(select().value).toBe("bayer")
    })

    it("calls onChange with the option value, not the label", async () => {
        const onChange = vi.fn()
        const user = userEvent.setup()
        render(<SelectRow label="Algorithm" options={options} value="atkinson" onChange={onChange} />)

        await user.selectOptions(select(), "Floyd–Steinberg")

        expect(onChange).toHaveBeenCalledExactlyOnceWith("floyd-steinberg")
    })

    it("focuses the select when the label is clicked", async () => {
        const user = userEvent.setup()
        render(<Harness />)

        await user.click(screen.getByText("Algorithm"))

        expect(document.activeElement).toBe(select())
    })

    it("hides the decorative chevron from assistive technology", () => {
        const {container} = render(<Harness />)

        expect(container.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
    })
})
