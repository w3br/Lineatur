import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TextField } from "./TextField.tsx";

// TextField is controlled, so the test needs a parent that holds the state.
function Harness({ initial = "" }: { initial?: string }) {
    const [value, setValue] = useState(initial);
    return <TextField label="Characters" value={value} onChange={setValue} />;
}

function field() {
    return screen.getByRole<HTMLInputElement>("textbox", { name: "Characters" });
}

afterEach(cleanup);

describe("TextField", () => {
    it("is named via its label and shows the value", () => {
        render(<Harness initial=" .:-=+*#%@" />);

        expect(field().value).toBe(" .:-=+*#%@");
    });

    it("updates while typing", async () => {
        const user = userEvent.setup();
        render(<Harness />);

        await user.type(field(), "#@");

        expect(field().value).toBe("#@");
    });
});
