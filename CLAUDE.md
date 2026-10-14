# Lineatur – context for Claude Code

Browser-based image effects studio: upload an image → tune Halftone / Dithering / ASCII with real-time preview → export. Fully client-side, no backend. Portfolio project of Max (junior frontend / UI-UX focus).

## How to work with Max (important)

- **Communicate in German.** Code, comments, commit messages and UI copy in English.
- **This is a learning and portfolio project.** Max must be able to explain every line in a job interview.
- **Core logic is written by Max**: effect algorithms (`src/effects`), worker pipeline (`src/worker`), state/undo (`src/store`). For these: explain concepts, give hints, pseudo-code or small snippets, review his code – do **not** write the full implementation unless he explicitly asks ("schreib es mir").
- **Claude may write directly**: config, boilerplate, CSS polish, tests (after Max wrote the code under test), README/docs.
- Prefer small steps. Before larger changes, propose a short plan and wait for OK.
- When you write code, explain the non-obvious parts briefly.

## Commands

- `npm run dev` – dev server (http://localhost:5173)
- `npm run build` – type-check + production build
- `npm run lint` – oxlint
- `npm test` – vitest (watch), `npm run test:run` – single run

## Structure

```
src/
  styles/tokens.css    design tokens (1:1 Figma variables) – single source of truth
styles/global.css    reset, body, focus ring, reduced motion
  components/ui/       Button, IconButton, SegmentedControl, SliderRow, Switch, Select …
  components/layout/   TopBar, Canvas, Panel, StatusBar
  effects/             pure functions: (ImageData, params) => ImageData|string, + param schema
  worker/              Web Worker that runs effects off the main thread
  store/               Zustand store (effect, params, history for undo/redo)
  hooks/               React hooks
  lib/                 helpers (image loading, export, url state)
docs/                  devlog.md, design/ (Figma exports)
```

## Conventions

- **Styling:** CSS Modules (`Component.module.css`) + tokens. Never hard-code colors, spacing or radii – always `var(--…)`.
- **Components:** function components, typed props, named exports, one component per file.
- **Accessibility:** native elements first (`<button>`, `<input type="range">`), visible `:focus-visible`, labels for every control, keyboard operable. Target WCAG 2.2 AA.
- **Effects** are pure and framework-free so they can run in the worker and be unit-tested.
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Design reference

- Figma screens: `docs/design/figma-prototypes/` (D01 empty, D02 halftone, D03 dithering, D04 ascii)
- Layout: top bar 44 px (logo · effect switcher centered · undo/redo/export), panel right 280 px, status bar 28 px
- Dark mode only, accent `#7CC4FF` used only for primary action, active state and focus
