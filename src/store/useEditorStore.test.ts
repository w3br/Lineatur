import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "./useEditorStore.ts";
import { defaultAscii, defaultDithering, defaultHalftone } from "./params.ts";
import type { LoadedImage } from "../lib/loadImage.ts";

// The store is a module-level singleton, so every test starts from a fresh copy
beforeEach(() => useEditorStore.setState(useEditorStore.getInitialState()));

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
