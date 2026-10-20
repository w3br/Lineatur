import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CanvasArea } from "./CanvasArea.tsx";
import { useEditorStore } from "../../store/useEditorStore.ts";
import { loadImage, type LoadedImage } from "../../lib/loadImage.ts";

// jsdom has no createImageBitmap, so decoding is replaced with a fake
vi.mock("../../lib/loadImage.ts", () => ({ loadImage: vi.fn() }));

function fakeImage(name: string, width = 800, height = 600) {
    const bitmap = { width, height } as ImageBitmap;
    return { name, width, height, original: bitmap, preview: bitmap } as LoadedImage;
}

function file(name: string, type = "image/png") {
    return new File(["x"], name, { type });
}

function area() {
    // The drop target is the wrapper around both states
    return render(<CanvasArea />).container.firstElementChild as HTMLElement;
}

async function drop(target: HTMLElement, dropped: File) {
    await act(async () => {
        fireEvent.drop(target, { dataTransfer: { files: [dropped] } });
    });
}

async function paste(pasted: File) {
    const event = new Event("paste", { bubbles: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [pasted] } });
    await act(async () => {
        window.dispatchEvent(event);
    });
}

beforeEach(() => {
    useEditorStore.setState(useEditorStore.getInitialState());
    // jsdom can't draw – ImageCanvas only needs getContext not to crash
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.mocked(loadImage).mockReset();
});

describe("CanvasArea", () => {
    it("shows the drop zone while no image is loaded", () => {
        area();

        expect(screen.getByRole("heading", { name: "Choose or drop an image" })).toBeTruthy();
        expect(screen.queryByRole("img")).toBeNull();
    });

    it("loads a dropped file and shows it instead of the drop zone", async () => {
        vi.mocked(loadImage).mockResolvedValueOnce(fakeImage("first.png"));
        const target = area();

        await drop(target, file("first.png"));

        expect(screen.getByRole("img", { name: "Preview of first.png" })).toBeTruthy();
        expect(screen.queryByRole("heading", { name: "Choose or drop an image" })).toBeNull();
        expect(useEditorStore.getState().image?.name).toBe("first.png");
    });

    describe("replacing the image (E.5)", () => {
        beforeEach(() => {
            useEditorStore.getState().setImage(fakeImage("first.png"));
        });

        it("replaces the current image on drop", async () => {
            vi.mocked(loadImage).mockResolvedValueOnce(fakeImage("second.png"));
            const target = area();

            await drop(target, file("second.png"));

            expect(screen.getByRole("img", { name: "Preview of second.png" })).toBeTruthy();
        });

        it("replaces the current image on paste", async () => {
            vi.mocked(loadImage).mockResolvedValueOnce(fakeImage("pasted.png"));
            area();

            await paste(file("pasted.png"));

            expect(screen.getByRole("img", { name: "Preview of pasted.png" })).toBeTruthy();
        });

        it("keeps the current image when the new file can't be loaded", async () => {
            vi.mocked(loadImage).mockRejectedValueOnce(new Error("Unsupported file type: application/pdf"));
            const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
            const target = area();

            await drop(target, file("doc.pdf", "application/pdf"));

            expect(screen.getByRole("img", { name: "Preview of first.png" })).toBeTruthy();
            expect(consoleError).toHaveBeenCalled();
        });

        it("marks the area while a file is dragged over the image", () => {
            const target = area();

            fireEvent.dragOver(target);
            expect(target.dataset.dragging).toBe("true");

            fireEvent.dragLeave(target);
            expect(target.dataset.dragging).toBe("false");
        });
    });
});
