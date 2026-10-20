# Lineatur – Tag 2: Store & Bild laden (Tutorial)

**Ziel:** Ein echtes Bild per Drag & Drop, Dateiauswahl oder Ctrl+V laden und im Canvas anzeigen. Alle Einstellungen liegen in einem zentralen Store und gehen beim Effektwechsel nicht mehr verloren.

**Dauer:** ca. 4–6 h · Legende: 🅰️ Angular-Vergleich · ✍️ du schreibst · 🤖 Claude darf helfen

---

## Rückblick Tag 1 – Review

**Richtig gut gemacht:**
- **SegmentedControl mit Roving Tabindex** und Pfeiltasten/Home/End – das ist exakt das WAI-ARIA-Muster für Radiogroups. Viele erfahrene Devs machen das nicht.
- **Draft-Muster** in `SliderRow` und `ColorRow` (Tippen ≠ Übernehmen, Enter/Blur übernimmt, Escape verwirft, ungültige Eingabe fällt zurück) – durchdachte UX.
- **`Record<Effect, ComponentType>`** für die Panels statt if/else-Kette – elegant und erweiterbar.
- **`PanelSection`** als benannte Region mit `aria-labelledby` – semantisch sauber.
- **Tests** für jede Komponente, über Rollen statt CSS-Klassen – genau so testet man heute.
- **`import.meta.env.BASE_URL`** für das Logo – an GitHub Pages gedacht.

**Drei Dinge, die du dir merken solltest:**
1. **Bug: Einstellungen gehen beim Effektwechsel verloren.** Stell bei Halftone die Rastergröße auf 30, wechsle zu ASCII und zurück → wieder 8. Grund: `<Panel/>` wird beim Wechsel **ausgehängt** (unmount), und mit der Komponente verschwindet ihr `useState`. 🅰️ Wie bei einer Komponente in `@if` – ihre Felder sind danach weg. → **Lösung heute: Store.**
2. **Kontrast/Helligkeit gibt es dreimal.** Fürs Erste ok – aber merk dir, dass sie eigentlich pro Effekt gespeichert werden (gleich benannt, getrennte Werte).
3. **Das Draft-Muster ist doppelt** (SliderRow + ColorRow). Später kann daraus ein eigener Hook `useDraftValue` werden – optional, kein Muss.

🎓 **Interview-Check:** Kannst du ohne nachzuschauen erklären, was „Roving Tabindex“ ist und warum `tabIndex={-1}` auf den nicht gewählten Segmenten steht? Wenn nicht: kurz mit Claude durchgehen – das ist ein super Gesprächsthema.

---

## Teil A – Zustand-Store ✍️ (Kernlogik)

### A.1 Was ist ein Store?

Ein Store ist **ein zentraler Ort für den App-State**, auf den jede Komponente direkt zugreifen kann – ohne Props durch fünf Ebenen zu reichen.

🅰️ Der direkte Vergleich: ein **Service mit `providedIn: 'root'` und Signals**.

| Angular | Zustand |
|---|---|
| `@Injectable({ providedIn: 'root' })` | `create(...)` – einmal erzeugt, global |
| `effect = signal<Effect>('halftone')` | `effect: 'halftone'` im State |
| `this.effect.set('ascii')` | `set({ effect: 'ascii' })` |
| `inject(EditorService).effect()` | `useEditorStore((s) => s.effect)` |
| `computed(...)` | Selector-Funktion |

**Warum Zustand und nicht React Context?** Zustand rendert nur die Komponenten neu, deren ausgewählter Wert sich ändert. Bei Slidern, die sich 60× pro Sekunde ändern, ist das wichtig.

### A.2 Typen & Defaults: `src/store/params.ts`

Hier landen alle Parameter-Typen, die jetzt noch verstreut in den Panels stehen.

```ts
export type Effect = 'halftone' | 'dithering' | 'ascii'

export type HalftoneParams = {
  gridSize: number
  angle: number
  shape: 'circle' | 'square' | 'line'
  contrast: number
  brightness: number
  noise: number
  foreground: string
  background: string
}

export const defaultHalftone: HalftoneParams = {
  gridSize: 8,
  angle: 45,
  shape: 'circle',
  contrast: 0,
  brightness: 0,
  noise: 20,
  foreground: '#111113',
  background: '#ffffff',
}
```
✍️ **Deine Aufgabe:** `DitheringParams` + `defaultDithering` und `AsciiParams` + `defaultAscii` nach demselben Muster – die Werte stehen schon in deinen Panels (`useState(...)`).

### A.3 Der Store: `src/store/useEditorStore.ts`

Vorlage mit Halftone – die anderen beiden ergänzt du:
```ts
import { create } from 'zustand'
import { defaultHalftone, type Effect, type HalftoneParams } from './params'
import type { LoadedImage } from '../lib/loadImage'

type EditorState = {
  effect: Effect
  halftone: HalftoneParams
  image: LoadedImage | null

  setEffect: (effect: Effect) => void
  updateHalftone: (patch: Partial<HalftoneParams>) => void
  setImage: (image: LoadedImage | null) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  effect: 'halftone',
  halftone: defaultHalftone,
  image: null,

  setEffect: (effect) => set({ effect }),
  updateHalftone: (patch) => set((state) => ({ halftone: { ...state.halftone, ...patch } })),
  setImage: (image) => set({ image }),
}))
```

Die drei wichtigen Ideen:
1. **`Partial<HalftoneParams>`** – alle Felder optional. So kannst du `updateHalftone({ gridSize: 12 })` schreiben, ohne alle anderen Werte mitzugeben.
2. **`{ ...state.halftone, ...patch }`** – erzeugt ein **neues** Objekt: erst alle alten Werte, dann die neuen drüber. **Niemals** `state.halftone.gridSize = 12` – dann merkt React die Änderung nicht. 🅰️ Wie bei `OnPush`: nur eine neue Referenz löst Change Detection aus.
3. **`create<EditorState>()(...)`** – die doppelten Klammern sind Absicht (TypeScript-Trick von Zustand), nicht wundern.

✍️ **Deine Aufgabe:** `dithering`, `ascii`, `updateDithering`, `updateAscii` ergänzen.

### A.4 Panels umstellen

Vorher (HalftonePanel):
```tsx
const [gridSize, setGridSize] = useState(8)
<SliderRow label="Grid size" value={gridSize} … onChange={setGridSize}/>
```
Nachher:
```tsx
const params = useEditorStore((s) => s.halftone)
const update = useEditorStore((s) => s.updateHalftone)

<SliderRow label="Grid size" value={params.gridSize} min={2} max={40}
  onChange={(gridSize) => update({ gridSize })}/>
```
- `(gridSize) => update({ gridSize })` – `{ gridSize }` ist Kurzschreibweise für `{ gridSize: gridSize }`.
- Die ASCII-Logik (Preset ↔ Custom) bleibt im Panel, ruft aber `updateAscii({ charset, characters })` statt zwei `setState`.

Und in `App.tsx`:
```tsx
const effect = useEditorStore((s) => s.effect)
const setEffect = useEditorStore((s) => s.setEffect)
```

✅ **Check:** Rastergröße auf 30 → zu ASCII → zurück zu Halftone → **steht noch auf 30**. Bug behoben.

💾 `refactor: move editor state into zustand store`

### A.5 Test für den Store ✍️/🤖

Stores sind leicht zu testen, weil sie kein React brauchen:
```ts
import { beforeEach, expect, it } from 'vitest'
import { useEditorStore } from './useEditorStore'

beforeEach(() => useEditorStore.setState(useEditorStore.getInitialState()))

it('updates one halftone param without touching the others', () => {
  useEditorStore.getState().updateHalftone({ gridSize: 12 })
  const { halftone } = useEditorStore.getState()
  expect(halftone.gridSize).toBe(12)
  expect(halftone.angle).toBe(45)
})
```
🤖 Weitere Fälle (Effektwechsel behält Parameter, Dithering/ASCII) darf Claude ergänzen.

---

## Teil B – Bild laden 🤖 (Browser-API, mit Erklärung)

### B.1 `src/lib/loadImage.ts`

Hier geht es um Browser-APIs, nicht um Projektlogik – die Vorlage darfst du übernehmen, **aber verstehe jede Zeile**:

```ts
export type LoadedImage = {
  name: string
  width: number
  height: number
  /** Full resolution – used for export */
  original: ImageBitmap
  /** Max. 1200 px on the long side – used for the live preview */
  preview: ImageBitmap
}

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const PREVIEW_MAX = 1200

export function isSupportedImage(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type)
}

export async function loadImage(file: File): Promise<LoadedImage> {
  if (!isSupportedImage(file)) {
    throw new Error(`Unsupported file type: ${file.type || 'unknown'}`)
  }

  const original = await createImageBitmap(file)
  const scale = Math.min(1, PREVIEW_MAX / Math.max(original.width, original.height))
  const preview = scale === 1 ? original : await resize(original, scale)

  return { name: file.name, width: original.width, height: original.height, original, preview }
}

/** Draws the bitmap smaller onto a temporary canvas – works in every browser. */
async function resize(bitmap: ImageBitmap, scale: number): Promise<ImageBitmap> {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D is not supported')

  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return createImageBitmap(canvas)
}
```

Was hier passiert:
- **`createImageBitmap(file)`** dekodiert das Bild direkt aus der Datei – schneller als der klassische Weg über `<img>` + `onload`, und ein `ImageBitmap` kann später **an den Web Worker geschickt** werden. Das ist der eigentliche Grund für diese Wahl.
- **`scale`**: 4000×3000 → Faktor 0,3 → Vorschau 1200×900. Ein Bild unter 1200 px bleibt unverändert (`Math.min(1, …)`).
- **Zwei Versionen:** `preview` für die flüssige Echtzeit-Vorschau, `original` für den Export in voller Auflösung. Das ist die zentrale Performance-Entscheidung des Projekts → gehört in den Devlog.
- **`async/await`** 🅰️ statt RxJS-Observables: ein Wert, der irgendwann kommt = Promise.

✍️ **Test dazu:** `isSupportedImage` mit einer PNG- und einer PDF-Datei testen (`new File([''], 'a.png', { type: 'image/png' })`).

---

## Teil C – DropZone ✍️ (Leerzustand D01)

Drei Wege, ein Bild zu laden – alle landen in **einer** Funktion `onFile`.

Gerüst (Logik vorgegeben, Markup & CSS nach D01 machst du):
```tsx
import { type ChangeEvent, type DragEvent, useEffect, useId, useState } from 'react'

type DropZoneProps = {
  onFile: (file: File) => void
}

export function DropZone({ onFile }: DropZoneProps) {
  const inputId = useId()
  const [isDragging, setIsDragging] = useState(false)

  // 1) Drag & drop
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault() // without this the browser opens the file itself
    setIsDragging(true)
  }
  function handleDragLeave() {
    setIsDragging(false)
  }
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) onFile(file)
  }

  // 2) File picker
  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = '' // allows choosing the same file again
  }

  // 3) Paste (Ctrl+V) – listens on the whole window, so it needs cleanup
  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = event.clipboardData?.files[0]
      if (file) onFile(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onFile])

  return (
    <div data-dragging={isDragging} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {/* icon, heading, hint text from D01 */}
      <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={handleInputChange} />
      <label htmlFor={inputId}>Choose image</label>
    </div>
  )
}
```

Neu für dich:
- **`useEffect` mit Cleanup** 🅰️ = `ngOnInit` (Listener anmelden) + `ngOnDestroy` (abmelden) in einem. Die zurückgegebene Funktion räumt auf, sobald die DropZone verschwindet. Ohne Cleanup würde jedes Einfügen später ein zweites Bild laden.
- **`[onFile]`** = Dependency-Array: Der Effect läuft neu, wenn sich `onFile` ändert.
- **`<label htmlFor>` statt `<button>`** öffnet den versteckten File-Input – und ist trotzdem per Tastatur erreichbar? **Nein!** Ein `<label>` ist nicht fokussierbar. ✍️ **Aufgabe:** Mach daraus einen echten `<Button>`, der per `useRef` `inputRef.current?.click()` aufruft. (🎓 schöner A11y-Fix fürs Devlog)
- **`data-dragging`** – im CSS: `.dropZone[data-dragging='true'] { border-color: var(--accent-default); }`

---

## Teil D – Bild anzeigen ✍️

```tsx
import { useEffect, useRef } from 'react'

type ImageCanvasProps = {
  bitmap: ImageBitmap
}

export function ImageCanvas({ bitmap }: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = bitmap.width
    canvas.height = bitmap.height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
  }, [bitmap])

  return <canvas ref={canvasRef} className={styles.canvas} />
}
```
- **`useRef`** 🅰️ = `@ViewChild`. Nach dem ersten Render zeigt `canvasRef.current` auf das echte `<canvas>`-Element.
- **Warum `useEffect`?** Beim Rendern existiert das Canvas-Element noch nicht im DOM. Effects laufen **nach** dem Rendern. 🅰️ wie `ngAfterViewInit`.
- **`canvas.width` vs. CSS-Breite:** `width/height`-Attribute = Pixel-Auflösung des Bildes. Die **Anzeigegröße** steuerst du per CSS: `max-width: 100%; max-height: 100%;` → passt sich in den Canvas-Bereich ein, Seitenverhältnis bleibt.

✍️ CSS: Canvas-Bereich mit `display: grid; place-items: center; padding: var(--space-32);`, Bild mit 1px `--border-default`.

---

## Teil E – Zusammenbauen ✍️

**E.1 `CanvasArea.tsx`** – entscheidet zwischen Leerzustand und Bild:
```tsx
export function CanvasArea() {
  const image = useEditorStore((s) => s.image)
  const setImage = useEditorStore((s) => s.setImage)

  async function handleFile(file: File) {
    try {
      setImage(await loadImage(file))
    } catch (error) {
      console.error(error) // later: show a toast
    }
  }

  return image ? <ImageCanvas bitmap={image.preview} /> : <DropZone onFile={handleFile} />
}
```

**E.2 In `App.tsx`:** `canvas={<CanvasArea />}`

**E.3 Statusleiste** ✍️ – eigene Komponente `StatusBar`, liest `image` aus dem Store:
- ohne Bild: „No image loaded“
- mit Bild: `2400 × 1600 · photo.jpg` (in `--font-mono`, `--text-tertiary`)

**E.4 Export-Button** ✍️ – `disabled`, solange `image === null`.

**E.5 Bild ersetzen** ✍️ – Wenn schon ein Bild da ist, soll Ctrl+V bzw. Drag & Drop ein neues laden. Tipp: Die DropZone ist dann nicht sichtbar … Wo müsste der Paste-Listener stattdessen hängen? (Denk drüber nach, bevor du Claude fragst.)

✅ **Tagesziel:**
- [ ] Bild per Drop, Button und Ctrl+V laden
- [ ] Großes Foto (z. B. 6000 px) wird flüssig angezeigt
- [ ] Statusleiste zeigt Größe und Name
- [ ] Effektwechsel behält alle Einstellungen
- [ ] PDF reinziehen → nichts passiert / Konsole zeigt Fehler (Fehler-Toast kommt später)
- [ ] Alles per Tastatur bedienbar

💾 Commits: `feat: add image loading`, `feat: add drop zone empty state`, `feat: show image dimensions in status bar`
📝 Devlog „Day 2 – Store & image loading“ – mit der Preview/Original-Entscheidung

---

## Ausblick Tag 3 – Der erste Effekt

Morgen wird's spannend: Du schreibst deine erste **Bildverarbeitung**. Vorbereitung (5 min Lesen): Was steckt in `ImageData.data`? → Ein langes Array mit **4 Zahlen pro Pixel** (R, G, B, A, je 0–255). Wir starten mit Graustufen und Schwellwert – das sind ca. 10 Zeilen und die Grundlage für alle Dithering-Algorithmen.
