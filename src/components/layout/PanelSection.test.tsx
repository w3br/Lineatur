import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PanelSection } from "./PanelSection.tsx";

afterEach(cleanup);

describe("PanelSection", () => {
    it("renders a named region with a heading", () => {
        render(<PanelSection title="Tone"><p>content</p></PanelSection>);

        expect(screen.getByRole("region", { name: "Tone" })).toBeDefined();
        expect(screen.getByRole("heading", { level: 2, name: "Tone" })).toBeDefined();
    });

    it("renders its children inside the region", () => {
        render(<PanelSection title="Tone"><p>content</p></PanelSection>);

        expect(screen.getByRole("region", { name: "Tone" }).textContent).toContain("content");
    });
});
