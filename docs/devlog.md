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

## Day 1 – Setup, app shell and first components (2026-10-14 – 2026-10-19)

**Setup**
- Vite + React + TypeScript, oxlint, Vitest; Figma screens for v1 added to `docs/design/`
- Figma variables mapped 1:1 to CSS custom properties in `tokens.css`; components only use `var(--…)`
- `global.css`: box-sizing reset, form controls inherit the font, global `:focus-visible` ring, reduced motion

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

**Tests**
- Testing Library + jsdom; 18 tests for `SegmentedControl` and `SliderRow` (keyboard navigation, roving tabindex, clamping, invalid input)

**Decisions**
- Effect switcher moved from the panel into the top bar (as in the Figma screens) – it switches the whole tool, not a single setting
- Controlled components only; state lives in `App` for now and moves to the Zustand store later
- Value field is `type="text"` with `inputMode="decimal"` instead of `type="number"`: no spinners, no accidental scroll-wheel changes, full control over parsing
- Layout spacing belongs to the parent (`gap`), not to the component (`margin`)

**Learnings**
- Figma "hug contents" ≈ `width: fit-content`, "fill container" ≈ `flex: 1`, "spacing between items" = `gap`
- `transition` belongs in the base state, not in `:hover` – otherwise it only animates one way
- `preventDefault()` only for handled keys, otherwise Tab and Space break
- Browser default margins on `<p>` / `<h1>` break fixed-height bars

**Next**
- Panel components: `SwitchRow`, `SelectRow`, `ColorRow`, visible label for `SegmentedControl`, `PanelSection`, `TextField`
- Assemble the Halftone, Dithering and ASCII panels
