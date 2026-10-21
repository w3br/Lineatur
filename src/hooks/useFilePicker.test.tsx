import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFilePicker } from "./useFilePicker.tsx";
import { ACCEPTED_TYPES } from "../lib/loadImage.ts";

const png = new File(["png"], "photo.png", { type: "image/png" });

// The hook needs a component that renders its input – just like DropZone and the top bar do
function Harness({ onFile, label = "Open" }: { onFile: (file: File) => void; label?: string }) {
    const picker = useFilePicker(onFile);
    return (
        <>
            {picker.input}
            <button type="button" onClick={picker.open}>{label}</button>
        </>
    );
}

function setup() {
    const onFile = vi.fn();
    const { container } = render(<Harness onFile={onFile} />);
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    return { onFile, input };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("useFilePicker", () => {
    it("renders a hidden file input for the supported formats", () => {
        const { input } = setup();

        expect(input.hidden).toBe(true);
        expect(input.accept.split(",")).toEqual(ACCEPTED_TYPES);
    });

    it("opens the file dialog through the hidden input", async () => {
        const user = userEvent.setup();
        const { input } = setup();
        const click = vi.spyOn(input, "click");

        await user.click(screen.getByRole("button", { name: "Open" }));

        expect(click).toHaveBeenCalledOnce();
    });

    it("passes the chosen file to onFile", async () => {
        const user = userEvent.setup();
        const { onFile, input } = setup();

        await user.upload(input, png);

        expect(onFile).toHaveBeenCalledExactlyOnceWith(png);
    });

    it("accepts the same file twice in a row", async () => {
        const user = userEvent.setup();
        const { onFile, input } = setup();

        // Without resetting input.value, the second change event would never fire
        await user.upload(input, png);
        await user.upload(input, png);

        expect(onFile).toHaveBeenCalledTimes(2);
    });

    it("does nothing when the dialog is cancelled", () => {
        const { onFile, input } = setup();

        // Cancelling can fire a change event with an empty file list
        fireEvent.change(input, { target: { files: [] } });

        expect(onFile).not.toHaveBeenCalled();
    });

    it("gives every caller its own input", async () => {
        const user = userEvent.setup();
        const first = vi.fn();
        const second = vi.fn();
        const { container } = render(
            <>
                <Harness onFile={first} label="Drop zone" />
                <Harness onFile={second} label="Top bar" />
            </>,
        );
        const [, secondInput] = container.querySelectorAll<HTMLInputElement>('input[type="file"]');

        await user.upload(secondInput, png);

        expect(second).toHaveBeenCalledExactlyOnceWith(png);
        expect(first).not.toHaveBeenCalled();
    });

    it("fails silently if the input is never rendered", () => {
        // The pitfall: without {picker.input} the ref stays null and open() does nothing
        const { result } = renderHook(() => useFilePicker(vi.fn()));

        expect(() => result.current.open()).not.toThrow();
    });
});
