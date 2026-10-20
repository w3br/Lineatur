import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { usePasteFile } from "./usePasteFile.ts";

const png = new File(["png"], "photo.png", { type: "image/png" });

// jsdom's ClipboardEvent has no clipboardData, so it's attached by hand
function paste(files: File[]) {
    const event = new Event("paste", { bubbles: true });
    Object.defineProperty(event, "clipboardData", { value: { files } });
    window.dispatchEvent(event);
}

afterEach(cleanup);

describe("usePasteFile", () => {
    it("passes a pasted image to onFile", () => {
        const onFile = vi.fn();
        renderHook(() => usePasteFile(onFile));

        paste([png]);

        expect(onFile).toHaveBeenCalledExactlyOnceWith(png);
    });

    it("ignores pasted text", () => {
        const onFile = vi.fn();
        renderHook(() => usePasteFile(onFile));

        // Plain text in the clipboard comes with an empty file list
        paste([]);

        expect(onFile).not.toHaveBeenCalled();
    });

    it("stops listening after unmount", () => {
        const onFile = vi.fn();
        const { unmount } = renderHook(() => usePasteFile(onFile));

        unmount();
        paste([png]);

        expect(onFile).not.toHaveBeenCalled();
    });

    it("always calls the latest callback", () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = renderHook(({ onFile }) => usePasteFile(onFile), {
            initialProps: { onFile: first },
        });

        // A new callback re-subscribes the listener (the [onFile] dependency)
        rerender({ onFile: second });
        paste([png]);

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledExactlyOnceWith(png);
    });
});
