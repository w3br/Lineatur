# Lineatur

**Halftone, dither & ASCII – in real time, in your browser.**

> 🚧 Work in progress – development phase.

Lineatur is a browser-based image effects studio. Upload an image, tune a print-inspired effect with a real-time preview, and download the result. Everything runs locally in the browser – no uploads, no account.

*Lineatur* is the German print term for screen ruling – the number of lines per inch in a halftone raster.

## Planned features

- **Effects:** Halftone, Dithering (Threshold, Bayer, Floyd–Steinberg, Atkinson, Stucki), ASCII
- Real-time preview (processing in a Web Worker)
- Undo / redo, presets, before/after comparison
- Export as PNG, JPG, SVG (halftone) and TXT (ASCII)
- Keyboard-friendly and accessible (WCAG 2.2 AA as target)

## Stack

React · TypeScript · Vite · Zustand · CSS Modules + design tokens · Vitest · GitHub Pages

## Process

Design decisions and daily progress are documented in [`docs/devlog.md`](docs/devlog.md).

## Development

Requires Node.js 22.12 or later.

```bash
npm install       # install dependencies
npm run dev       # start dev server on http://localhost:5173
npm run build     # type-check and build for production
npm run lint      # lint with oxlint
npm test          # run tests in watch mode
```

Design tokens live in [`src/styles/tokens.css`](src/styles/tokens.css) and mirror the Figma variables 1:1.
