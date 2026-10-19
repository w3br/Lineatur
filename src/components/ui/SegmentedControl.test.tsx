import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SegmentedControl } from "./SegmentedControl.tsx";

type Effect = "halftone" | "dithering" | "ascii"

const options: { value: Effect; label: string }[] = [
    { value: "halftone", label: "Halftone" },
    { value: "dithering", label: "Dithering" },
    { value: "ascii", label: "ASCII" },
];

// SegmentedControl is controlled, so the test needs a parent that holds the state.
function Harness({ initial = "halftone" }: { initial?: Effect }) {
    const [value, setValue] = useState<Effect>(initial);
    return (
        <>
            <SegmentedControl label="Effect" options={options} value={value} onChange={setValue} />
            <button type="button">After</button>
        </>
    );
}

function radio(name: string) {
    return screen.getByRole("radio", { name });
}

afterEach(cleanup);

describe("SegmentedControl", () => {
    it("renders a labelled radiogroup with the initial value checked", () => {
        render(<Harness />);

        expect(screen.getByRole("radiogroup", { name: "Effect" })).toBeDefined();
        expect(radio("Halftone").getAttribute("aria-checked")).toBe("true");
        expect(radio("Dithering").getAttribute("aria-checked")).toBe("false");
    });

    it("selects an option on click", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.click(radio("ASCII"));

        expect(radio("ASCII").getAttribute("aria-checked")).toBe("true");
        expect(radio("Halftone").getAttribute("aria-checked")).toBe("false");
    });

    it("makes only the checked option tabbable (roving tabindex)", () => {
        render(<Harness initial="dithering" />);

        expect(radio("Halftone").tabIndex).toBe(-1);
        expect(radio("Dithering").tabIndex).toBe(0);
        expect(radio("ASCII").tabIndex).toBe(-1);
    });

    it("moves selection and focus with ArrowRight / ArrowDown", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.tab();
        expect(document.activeElement).toBe(radio("Halftone"));

        await user.keyboard("{ArrowRight}");
        expect(radio("Dithering").getAttribute("aria-checked")).toBe("true");
        expect(document.activeElement).toBe(radio("Dithering"));

        await user.keyboard("{ArrowDown}");
        expect(radio("ASCII").getAttribute("aria-checked")).toBe("true");
        expect(document.activeElement).toBe(radio("ASCII"));
    });

    it("wraps around at both ends", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.tab();
        await user.keyboard("{ArrowLeft}");
        expect(document.activeElement).toBe(radio("ASCII"));

        await user.keyboard("{ArrowRight}");
        expect(document.activeElement).toBe(radio("Halftone"));
        expect(radio("Halftone").getAttribute("aria-checked")).toBe("true");
    });

    it("jumps to first / last option with Home / End", async () => {
        const user = userEvent.setup();
        render(<Harness initial="dithering" />);

        await user.tab();
        await user.keyboard("{End}");
        expect(document.activeElement).toBe(radio("ASCII"));

        await user.keyboard("{Home}");
        expect(document.activeElement).toBe(radio("Halftone"));
        expect(radio("Halftone").getAttribute("aria-checked")).toBe("true");
    });

    it("leaves Tab to the browser, so focus can leave the group", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.tab();
        await user.tab();

        expect(document.activeElement).toBe(screen.getByRole("button", { name: "After" }));
    });

    it("hides the label visually by default", () => {
        render(<Harness />);

        expect(screen.queryByText("Effect")).toBeNull();
    });

    it("shows a visible label that names the group with showLabel", () => {
        render(<SegmentedControl label="Palette" showLabel options={options} value="halftone" onChange={() => {}} />);

        const group = screen.getByRole("radiogroup", { name: "Palette" });
        const label = screen.getByText("Palette");

        expect(group.getAttribute("aria-labelledby")).toBe(label.id);
        expect(group.hasAttribute("aria-label")).toBe(false);
    });
});
