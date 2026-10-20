import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "./DropZone.tsx";

const png = new File(["png"], "photo.png", { type: "image/png" });

// Drag & drop and paste live in hooks now (src/hooks) and are tested there
function setup(isDragging = false) {
    const onFile = vi.fn();
    const { container } = render(<DropZone onFile={onFile} isDragging={isDragging} />);
    // The file input is hidden and has no role, so it's found via the DOM
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const zone = container.firstElementChild as HTMLElement;
    return { onFile, input, zone };
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe("DropZone", () => {
    it("renders heading, accepted formats and a button", () => {
        setup();

        expect(screen.getByRole("heading", { name: "Choose or drop an image" })).toBeTruthy();
        expect(screen.getByText("PNG, JPEG or WebP")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Choose image" })).toBeTruthy();
    });

    it("reflects the dragging state from its parent", () => {
        expect(setup(false).zone.dataset.dragging).toBe("false");
        cleanup();
        expect(setup(true).zone.dataset.dragging).toBe("true");
    });

    describe("file picker", () => {
        it("opens the hidden file input when the button is clicked", async () => {
            const user = userEvent.setup();
            const { input } = setup();
            const click = vi.spyOn(input, "click");

            await user.click(screen.getByRole("button", { name: "Choose image" }));

            expect(click).toHaveBeenCalledOnce();
        });

        it("can be reached and triggered with the keyboard", async () => {
            const user = userEvent.setup();
            const { input } = setup();
            const click = vi.spyOn(input, "click");

            await user.tab();
            await user.keyboard("{Enter}");

            expect(click).toHaveBeenCalledOnce();
        });

        it("passes the chosen file to onFile", async () => {
            const user = userEvent.setup();
            const { onFile, input } = setup();

            await user.upload(input, png);

            expect(onFile).toHaveBeenCalledWith(png);
        });

        it("accepts the same file twice in a row", async () => {
            const user = userEvent.setup();
            const { onFile, input } = setup();

            // Without resetting input.value, the second change event would never fire
            await user.upload(input, png);
            await user.upload(input, png);

            expect(onFile).toHaveBeenCalledTimes(2);
        });
    });
});
