import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "./DropZone.tsx";

const png = new File(["png"], "photo.png", { type: "image/png" });

function setup() {
    const onFile = vi.fn();
    const { container, unmount } = render(<DropZone onFile={onFile} />);
    // The file input is hidden and has no role, so it's found via the DOM
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const zone = container.firstElementChild as HTMLElement;
    return { onFile, input, zone, unmount };
}

// jsdom's ClipboardEvent has no clipboardData, so it's attached by hand
function paste(files: File[]) {
    const event = new Event("paste", { bubbles: true });
    Object.defineProperty(event, "clipboardData", { value: { files } });
    window.dispatchEvent(event);
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

    describe("drag and drop", () => {
        it("highlights while dragging and resets on leave", () => {
            const { zone } = setup();

            fireEvent.dragOver(zone);
            expect(zone.dataset.dragging).toBe("true");

            fireEvent.dragLeave(zone);
            expect(zone.dataset.dragging).toBe("false");
        });

        it("passes the first dropped file to onFile and resets the highlight", () => {
            const { onFile, zone } = setup();
            const second = new File(["jpg"], "second.jpg", { type: "image/jpeg" });

            fireEvent.dragOver(zone);
            fireEvent.drop(zone, { dataTransfer: { files: [png, second] } });

            expect(onFile).toHaveBeenCalledExactlyOnceWith(png);
            expect(zone.dataset.dragging).toBe("false");
        });

        it("ignores a drop without files", () => {
            const { onFile, zone } = setup();

            fireEvent.drop(zone, { dataTransfer: { files: [] } });

            expect(onFile).not.toHaveBeenCalled();
        });
    });

    describe("paste", () => {
        it("passes a pasted image to onFile", () => {
            const { onFile } = setup();

            paste([png]);

            expect(onFile).toHaveBeenCalledExactlyOnceWith(png);
        });

        it("ignores pasted text", () => {
            const { onFile } = setup();

            // Plain text in the clipboard comes with an empty file list
            paste([]);

            expect(onFile).not.toHaveBeenCalled();
        });

        it("stops listening after unmount", () => {
            const { onFile, unmount } = setup();

            unmount();
            paste([png]);

            expect(onFile).not.toHaveBeenCalled();
        });
    });
});
