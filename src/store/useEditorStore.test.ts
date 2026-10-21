import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEditorStore } from "./useEditorStore.ts";
import { defaultAscii, defaultDithering, defaultHalftone } from "./params.ts";
import { closeImage, loadImage, type LoadedImage } from "../lib/loadImage.ts";

// jsdom can't decode images – loadFile's own logic is tested, decoding and releasing are faked.
// Partial mock, so everything else (e.g. ACCEPTED_TYPES) stays real
vi.mock("../lib/loadImage.ts", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../lib/loadImage.ts")>()),
    loadImage: vi.fn(),
    closeImage: vi.fn(),
}));

// The store is a module-level singleton, so every test starts from a fresh copy
beforeEach(() => useEditorStore.setState(useEditorStore.getInitialState()));

afterEach(() => {
    vi.mocked(loadImage).mockReset();
    vi.mocked(closeImage).mockReset();
    vi.restoreAllMocks();
});

describe("initial state", () => {
    it("starts with halftone, the defaults and no image", () => {
        const state = useEditorStore.getState();
        expect(state.effect).toBe("halftone");
        expect(state.halftone).toEqual(defaultHalftone);
        expect(state.dithering).toEqual(defaultDithering);
        expect(state.ascii).toEqual(defaultAscii);
        expect(state.image).toBeNull();
    });
});

describe("updateHalftone", () => {
    it("updates one param without touching the others", () => {
        useEditorStore.getState().updateHalftone({ gridSize: 12 });
        const { halftone } = useEditorStore.getState();
        expect(halftone.gridSize).toBe(12);
        expect(halftone.angle).toBe(45);
    });

    it("applies several params from one patch", () => {
        useEditorStore.getState().updateHalftone({ angle: 90, shape: "line" });
        expect(useEditorStore.getState().halftone).toEqual({ ...defaultHalftone, angle: 90, shape: "line" });
    });

    it("creates a new object instead of mutating the old one", () => {
        const before = useEditorStore.getState().halftone;
        useEditorStore.getState().updateHalftone({ gridSize: 30 });
        // React/Zustand only notice changes through a new reference
        expect(useEditorStore.getState().halftone).not.toBe(before);
        expect(before.gridSize).toBe(8);
    });

    it("never mutates the exported defaults", () => {
        useEditorStore.getState().updateHalftone({ gridSize: 30 });
        expect(defaultHalftone.gridSize).toBe(8);
    });
});

describe("updateDithering", () => {
    it("updates only the given params", () => {
        useEditorStore.getState().updateDithering({ algorithm: "bayer", pixelSize: 4 });
        expect(useEditorStore.getState().dithering).toEqual({ ...defaultDithering, algorithm: "bayer", pixelSize: 4 });
    });
});

describe("updateAscii", () => {
    it("updates charset and characters together", () => {
        useEditorStore.getState().updateAscii({ charSet: "custom", characters: " #" });
        const { ascii } = useEditorStore.getState();
        expect(ascii.charSet).toBe("custom");
        expect(ascii.characters).toBe(" #");
        expect(ascii.cellSize).toBe(defaultAscii.cellSize);
    });
});

describe("effects are independent", () => {
    it("keeps contrast separate per effect", () => {
        useEditorStore.getState().updateHalftone({ contrast: 50 });
        const { halftone, dithering, ascii } = useEditorStore.getState();
        expect(halftone.contrast).toBe(50);
        expect(dithering.contrast).toBe(0);
        expect(ascii.contrast).toBe(0);
    });

    it("keeps params when switching effects and back (day 1 bug)", () => {
        useEditorStore.getState().updateHalftone({ gridSize: 30 });
        useEditorStore.getState().setEffect("ascii");
        useEditorStore.getState().setEffect("halftone");
        expect(useEditorStore.getState().halftone.gridSize).toBe(30);
    });
});

describe("setImage", () => {
    // ImageBitmap doesn't exist in jsdom – the store only stores the object, so a stub is enough
    const image = { name: "photo.jpg", width: 2400, height: 1600 } as LoadedImage;

    it("stores the image and clears it again", () => {
        useEditorStore.getState().setImage(image);
        expect(useEditorStore.getState().image).toBe(image);

        useEditorStore.getState().setImage(null);
        expect(useEditorStore.getState().image).toBeNull();
    });

    it("keeps effect params when the image changes", () => {
        useEditorStore.getState().updateDithering({ threshold: 70 });
        useEditorStore.getState().setImage(image);
        expect(useEditorStore.getState().dithering.threshold).toBe(70);
    });
});

describe("loadFile", () => {
    function fakeImage(name: string) {
        return { name, width: 800, height: 600 } as LoadedImage;
    }

    function file(name: string) {
        return new File(["x"], name, { type: "image/png" });
    }

    // A promise the test resolves by hand – controls which load finishes first
    function deferred<T>() {
        let resolve!: (value: T) => void;
        const promise = new Promise<T>((r) => (resolve = r));
        return { promise, resolve };
    }

    it("loads a file and stores the image", async () => {
        const image = fakeImage("photo.png");
        vi.mocked(loadImage).mockResolvedValueOnce(image);

        await useEditorStore.getState().loadFile(file("photo.png"));

        expect(useEditorStore.getState().image).toBe(image);
        expect(closeImage).not.toHaveBeenCalled();
    });

    it("releases the previous image only after the new one is stored", async () => {
        const previous = fakeImage("old.png");
        const next = fakeImage("new.png");
        useEditorStore.getState().setImage(previous);
        vi.mocked(loadImage).mockResolvedValueOnce(next);
        // Records what the store showed at the moment closeImage ran
        let shownWhileClosing: LoadedImage | null = null;
        vi.mocked(closeImage).mockImplementation(() => {
            shownWhileClosing = useEditorStore.getState().image;
        });

        await useEditorStore.getState().loadFile(file("new.png"));

        expect(closeImage).toHaveBeenCalledExactlyOnceWith(previous);
        expect(shownWhileClosing).toBe(next);
    });

    it("keeps the current image when loading fails", async () => {
        const current = fakeImage("current.png");
        useEditorStore.getState().setImage(current);
        vi.mocked(loadImage).mockRejectedValueOnce(new Error("Unsupported file type: application/pdf"));
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        await useEditorStore.getState().loadFile(new File(["x"], "doc.pdf", { type: "application/pdf" }));

        expect(useEditorStore.getState().image).toBe(current);
        expect(closeImage).not.toHaveBeenCalled();
        expect(consoleError).toHaveBeenCalled();
    });

    describe("race condition", () => {
        it("ignores an older load that finishes after a newer one", async () => {
            const slow = deferred<LoadedImage>();
            const fast = deferred<LoadedImage>();
            vi.mocked(loadImage).mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);
            const first = fakeImage("first.png");
            const second = fakeImage("second.png");

            const loadingFirst = useEditorStore.getState().loadFile(file("first.png"));
            const loadingSecond = useEditorStore.getState().loadFile(file("second.png"));
            fast.resolve(second);
            await loadingSecond;
            slow.resolve(first);
            await loadingFirst;

            expect(useEditorStore.getState().image).toBe(second);
            // The discarded image is never shown, so it's released right away
            expect(closeImage).toHaveBeenCalledExactlyOnceWith(first);
        });

        it("ignores an older load even if it finishes first", async () => {
            const firstLoad = deferred<LoadedImage>();
            const secondLoad = deferred<LoadedImage>();
            vi.mocked(loadImage).mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
            const first = fakeImage("first.png");
            const second = fakeImage("second.png");

            const loadingFirst = useEditorStore.getState().loadFile(file("first.png"));
            const loadingSecond = useEditorStore.getState().loadFile(file("second.png"));
            firstLoad.resolve(first);
            await loadingFirst;

            // The user already chose the second file – the first one must not flash up
            expect(useEditorStore.getState().image).toBeNull();
            expect(closeImage).toHaveBeenCalledExactlyOnceWith(first);

            secondLoad.resolve(second);
            await loadingSecond;
            expect(useEditorStore.getState().image).toBe(second);
        });
    });
});
