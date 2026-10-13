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
