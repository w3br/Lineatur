# Devlog

## Day 0 – Design foundations (2026-10-13)

**Concept**
- Scope: three effects (Halftone, Dithering, ASCII), focus on UX and visual quality over number of features
- Fully client-side: upload → edit → download, no backend
- Visual direction: minimal pro tool (references: Figma, Linear, DITHR), dark UI so the image stays in focus

**Figma**
- Variables: color tokens (dark mode), spacing scale (4 px grid), radius scale
- Accent color: light blue `#7CC4FF` – used only for primary action, active state and focus
- Text styles: Geist for UI (11–22 px), Geist Mono for numeric values
- App shell with auto layout: top bar 44 px, control panel 280 px, status bar 28 px
- Components: `Button` (primary / secondary / ghost × default / hover / focus), `IconButton`, `Segment` + `SegmentedControl` (effect switcher), `SliderRow`

**Decisions**
- Effect switcher as segmented control at the top of the panel – placed next to the controls it changes
- Slider rows with directly editable value field instead of slider + separate number box
- Focus ring with offset so it stays visible on the light-blue primary button

**Next**
- Main screen (Halftone), Dithering and ASCII variants, empty state
- Start development: Vite + React + TypeScript, tokens to CSS custom properties

## Day 1 – Setup, app shell and all panel components (2026-10-14 – 2026-10-19)

**Setup**
- Vite + React + TypeScript, oxlint, Vitest; Figma screens for v1 added to `docs/design/`
- Figma variables mapped 1:1 to CSS custom properties in `tokens.css`; components only use `var(--…)`
- `global.css`: box-sizing reset, form controls inherit the font, global `:focus-visible` ring, reduced motion

**Figma prototypes**

The four v1 screens: empty state, Halftone, Dithering and ASCII. The panels share one structure (sections with slider, select, switch and color rows), so each effect only differs in its controls.

<p>
  <img src="design/figma-prototypes/D01%20-%20Empty.png" alt="D01 – empty state with drop zone" width="49%">
  <img src="design/figma-prototypes/D02%20-%20Halftone.png" alt="D02 – Halftone panel" width="49%">
  <img src="design/figma-prototypes/D03%20-%20Dithering.png" alt="D03 – Dithering panel" width="49%">
  <img src="design/figma-prototypes/D04%20-%20ASCII.png" alt="D04 – ASCII panel" width="49%">
</p>

Component sheet (slider row, segmented control, icon button and button states) and work in progress in Figma:

<p>
  <img src="design/figma-prototypes/Components.png" alt="Component sheet with all states" width="32%">
  <img src="design/figma-prototypes/Day1_FigmaComponents.png" alt="Figma components page" width="32%">
  <img src="design/figma-prototypes/Day1_FigmaDesktopPage.png" alt="Figma desktop page with the app shell in auto layout" width="32%">
</p>

**App shell**
- `AppShell` as CSS grid with named areas: top bar, canvas, panel, status bar
- Top bar and status bar always stay visible, only the panel scrolls: rows use `minmax(0, 1fr)` instead of `1fr`, because a plain `1fr` track never shrinks below its content
- `TopBar` with `start` / `center` / `end` slots on a `1fr auto 1fr` grid, so the effect switcher stays exactly centered regardless of how wide the sides are
- Brand (favicon + "Lineatur" as `<h1>`), undo/redo, export; logo path built from `import.meta.env.BASE_URL` so it also works on GitHub Pages

**Components**
- `Button` (primary / secondary / ghost) and `IconButton` (`aria-label`, `aria-disabled` keeps it focusable)
- `SegmentedControl`: ARIA radiogroup with roving tabindex – one tab stop, arrow keys / Home / End move selection and focus, wraps around at both ends. Styled via `aria-checked`, so visuals and screen reader output can't drift apart
- `SliderRow`: custom-styled `<input type="range">` (WebKit + Firefox pseudo-elements), filled track via a `--fill` CSS variable set from React (Chrome has no progress pseudo-element)
- Editable value field in `SliderRow`: typing is kept as a local draft and committed on Enter / blur, clamped to min/max, comma accepted as decimal separator, Escape or invalid input reverts
- `SwitchRow`: `<button role="switch">` with `aria-checked`; the `<label>` points at the button, so clicking the text toggles too. Keyboard support comes free with the native button
- `SelectRow`: native `<select>` with `appearance: none` and a Lucide chevron laid over it (`position: absolute`, `pointer-events: none`); generic over the option values like `SegmentedControl`, shared `Option<T>` type in `types.ts`
- `ColorRow`: native `<input type="color">` as swatch (WebKit + Firefox swatch pseudo-elements) plus an editable hex field. `normalizeHex` in `lib/color.ts` accepts `#FF8800`, `ff8800` and `#f80` and returns `null` for anything else, so invalid input falls back to the old value
- `SegmentedControl` got an optional visible label (`showLabel`) that names the group via `aria-labelledby`
- `PanelSection`: `<section>` named by its `<h2>` title, divider only between sections (`.section + .section`)
- `TextField`: full-width mono input for the ASCII character set

**Panels**
- `HalftonePanel`, `DitheringPanel` and `AsciiPanel` assembled from the components, matching the Figma screens
- `App` picks the panel from a `Record<Effect, ComponentType>` map – TypeScript complains if a new effect has no panel
- ASCII: choosing a preset fills the character field, editing the field switches the select to "Custom"
- Rows have no outer spacing anymore; `PanelSection` sets the gap, all single-line rows share the 28 px control height

**Tests**
- Testing Library + jsdom; 64 tests across all components and `normalizeHex` (keyboard navigation, roving tabindex, clamping, label wiring, hex parsing, invalid input)

**Decisions**
- Effect switcher moved from the panel into the top bar (as in the Figma screens) – it switches the whole tool, not a single setting
- Controlled components only; state lives in the panels for now and moves to the Zustand store later
- Value field is `type="text"` with `inputMode="decimal"` instead of `type="number"`: no spinners, no accidental scroll-wheel changes, full control over parsing
- Layout spacing belongs to the parent (`gap`), not to the component (`margin` / `padding`)
- Native `<select>` and `<input type="color">` instead of custom widgets or `react-color` (unmaintained, always-open picker, no React 19 support): accessibility, keyboard and mobile pickers for free, zero bundle size
- No open animation for the select for now – the native list is drawn by the OS. `appearance: base-select` is an option later as progressive enhancement

**Learnings**
- Figma "hug contents" ≈ `width: fit-content`, "fill container" ≈ `flex: 1`, "spacing between items" = `gap`
- `transition` belongs in the base state, not in `:hover` – otherwise it only animates one way
- `preventDefault()` only for handled keys, otherwise Tab and Space break
- Browser default margins on `<p>` / `<h1>` break fixed-height bars
- Controlled components only show what they get: two switches bound to the same state always toggle together – one state per setting
- `position: absolute` needs a positioned ancestor (`position: relative`), otherwise it is placed relative to the page
- Lucide icons are strokes with `currentColor` – color them with `color`, not `fill`
- `<label htmlFor>` only works for form elements; groups like a radiogroup are named with `aria-labelledby`
- With `verbatimModuleSyntax`, type-only imports need `import type`

**Open issues**
- Panel state resets when switching effects, because each panel is unmounted – solved by the store

**Next**
- Zustand store for effect and parameters (incl. undo/redo history)
- Image upload, empty state (D01) and canvas preview
- First effect implementation and the worker pipeline
