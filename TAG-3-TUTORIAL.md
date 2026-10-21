# Lineatur – Tag 3: Der erste Effekt (Dithering)

**Ziel:** Dithering funktioniert live: Regler bewegen → Bild ändert sich. Dazu Ton-Regler (Kontrast, Helligkeit, Schwelle), Pixelgröße und Farben.

**Dauer:** ca. 5–7 h · Legende: 🅰️ Angular-Vergleich · ✍️ du schreibst · 🤖 Claude darf helfen

> **Heute ist Kerntag.** Die Algorithmen schreibst du selbst – das sind genau die Themen, über die im Bewerbungsgespräch gesprochen wird. Unten stehen Erklärungen, Pseudo-Code und **Testfälle mit erwarteten Ergebnissen** (vorher nachgerechnet). Schreib Tests zuerst oder direkt danach – dann weißt du sofort, ob dein Code stimmt.

---

## Teil 0 – Reste von Tag 2 (30–60 min)

Hak ab, was schon erledigt ist:

- [ ] **Bild ersetzen:** Ctrl+V und Drag & Drop funktionieren auch, wenn schon ein Bild geladen ist (Paste-Listener nicht nur in der DropZone)
- [ ] **„Choose image“ ist ein echter Button** (fokussierbar), der per `useRef` den versteckten File-Input klickt
- [ ] **Export-Button** ist deaktiviert ohne Bild
- [ ] **Statusleiste** zeigt `Breite × Höhe · Dateiname`
- [ ] **Tests:** `isSupportedImage` (PNG ja, PDF nein) + Store (Update ändert nur ein Feld, Effektwechsel behält Werte)
- [ ] **Devlog „Day 2“** inkl. der Entscheidung *Preview (max. 1200 px) vs. Original*
- [ ] Commit + Push

---

## Teil A – Wie ein Bild im Speicher aussieht (15 min Lesen)

`ImageData` hat drei Eigenschaften: `width`, `height` und `data`.

`data` ist **ein langes, flaches Array** (`Uint8ClampedArray`) mit **4 Werten pro Pixel**: R, G, B, A – jeweils 0–255.

```
Pixel:    (0,0)          (1,0)          (2,0)        …
data:  [R, G, B, A,    R, G, B, A,    R, G, B, A,  …]
index:  0  1  2  3     4  5  6  7     8  9 10 11
```

Der Index eines Pixels an Position (x, y):
```ts
const i = (y * width + x) * 4
const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3]
```

**„Clamped“** heißt: Schreibst du `300` hinein, wird daraus `255`; `-20` wird `0`; `12.7` wird `13`. Praktisch – du musst beim Schreiben nicht selbst begrenzen.

🎓 **Mini-Übung (im Kopf):** Bild ist 10 px breit. Wo beginnt Pixel (3, 2)? → `(2 * 10 + 3) * 4 = 92`.

---

## Teil B – Struktur für die Effekte

Alles in `src/effects/` ist **reines TypeScript ohne React** – Eingabe rein, Ergebnis raus. Deshalb lässt es sich leicht testen und morgen 1:1 in den Web Worker verschieben.

```
src/effects/
  tone.ts              luminance, adjustTone, toGray
  dither/
    threshold.ts       Schwellwert
    bayer.ts           geordnetes Dithering
    errorDiffusion.ts  Floyd–Steinberg & Atkinson (ein Algorithmus, zwei Kernel)
    index.ts           dither(image, params) – wählt Algorithmus, wendet Farben an
src/lib/
  color.ts             + hexToRgb()   (die Datei hast du schon)
  render.ts            Canvas-Pipeline (Vorlage unten)
```

**Datenfluss:**
```
ImageData (RGBA) → toGray → Float32Array (ein Grauwert pro Pixel)
                → Dithering → Uint8ClampedArray (nur 0 oder 255 pro Pixel)
                → Farben anwenden → ImageData (RGBA)
```

Warum ein **Grau-Array** dazwischen? Dithering arbeitet nur mit Helligkeit. Ein Wert pro Pixel statt vier ist einfacher und schneller. **`Float32Array`** statt `Uint8ClampedArray`, weil die Fehlerdiffusion Zwischenwerte wie `-23.4` oder `281.7` braucht, die nicht abgeschnitten werden dürfen.

---

## Teil C – Ton: Graustufen, Helligkeit, Kontrast ✍️

### C.1 Luminanz

Das menschliche Auge sieht Grün heller als Rot und Rot heller als Blau. Deshalb nicht einfach `(r + g + b) / 3`, sondern gewichtet:

```
luminance = 0.299 · R + 0.587 · G + 0.114 · B
```

```ts
export function luminance(r: number, g: number, b: number): number
```

**Tests** (nutze `toBeCloseTo`, weil Kommazahlen nie exakt sind):

| Eingabe | Erwartet |
|---|---|
| `luminance(255, 0, 0)` | ≈ 76.2 |
| `luminance(0, 255, 0)` | ≈ 149.7 |
| `luminance(0, 0, 255)` | ≈ 29.1 |
| `luminance(128, 128, 128)` | ≈ 128 (Grau bleibt Grau) |

🎓 Wenn du `toBe(128)` schreibst, schlägt der letzte Test fehl (Ergebnis: `127.99999999999999`). Gute Lektion über Gleitkommazahlen.

### C.2 Helligkeit & Kontrast

Beide Regler gehen von −100 bis +100. Formel (Standard aus der Bildbearbeitung):

```
b = brightness · 2.55                         // −255 … +255
C = contrast · 2.55
f = (259 · (C + 255)) / (255 · (259 − C))     // Kontrastfaktor, bei C = 0 genau 1
out = f · (value + b − 128) + 128             // um die Mitte (128) strecken
out = clamp(out, 0, 255)
```

Idee hinter Kontrast: Werte werden **von der Mitte (128) weggezogen** (f > 1) oder **zur Mitte hingezogen** (f < 1).

```ts
export function adjustTone(value: number, brightness: number, contrast: number): number
```

| Eingabe | Erwartet |
|---|---|
| `adjustTone(128, 0, 0)` | 128 (neutral) |
| `adjustTone(100, 20, 0)` | 151 |
| `adjustTone(128, 0, 50)` | 128 (Mitte bleibt bei Kontrast fix) |
| `adjustTone(200, 0, 50)` | 255 (geclampt) |
| `adjustTone(50, 0, 50)` | 0 (geclampt) |

### C.3 `toGray`

```ts
export function toGray(image: ImageData, brightness: number, contrast: number): Float32Array
```
Pseudo-Code:
```
gray = new Float32Array(width * height)
für jeden Pixel p (0 … width*height-1):
  i = p * 4
  gray[p] = adjustTone(luminance(data[i], data[i+1], data[i+2]), brightness, contrast)
return gray
```
🎓 Hier brauchst du kein x/y – ein Index `p` über alle Pixel reicht.

💾 `feat: add tone adjustments (luminance, brightness, contrast)`

---

## Teil D – Schwellwert ✍️ (der einfachste Fall)

Jeder Pixel wird schwarz oder weiß – je nachdem, ob er heller als die Schwelle ist.

```ts
export function threshold(gray: Float32Array, level: number): Uint8ClampedArray
// level: 0–255. Pixel >= level → 255, sonst 0
```

| Eingabe | Erwartet |
|---|---|
| `threshold([0, 127, 128, 255], 128)` | `[0, 0, 255, 255]` |

Sieht hart und flächig aus – genau deshalb gibt es Dithering.

---

## Teil E – Bayer (geordnetes Dithering) ✍️

**Idee:** Statt einer festen Schwelle bekommt **jeder Pixel eine eigene Schwelle** aus einem kleinen Muster, das sich über das Bild wiederholt. Graustufen werden so zu regelmäßigen Punktmustern – der typische Retro-Look.

Die 4×4-Bayer-Matrix (Daten, darfst du übernehmen):
```ts
const BAYER_4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
]
```

Pseudo-Code:
```
für jedes y, x:
  m = BAYER_4[y % 4][x % 4]                 // 0 … 15
  schwelle = (m + 0.5) / 16 * 255            // auf 0 … 255 verteilt
  out[y*width + x] = gray[y*width + x] > schwelle ? 255 : 0
```
`% 4` sorgt dafür, dass sich das Muster alle 4 Pixel wiederholt.

```ts
export function bayer(gray: Float32Array, width: number, height: number): Uint8ClampedArray
```

**Tests:**
- 4×4 Fläche, alle Werte 128 → `[255,0,255,0, 0,255,0,255, 255,0,255,0, 0,255,0,255]` (Schachbrett)
- 64×64 Fläche, alle Werte 64 → Anteil weißer Pixel genau **0.25**

🎓 Bonus: 2×2- und 8×8-Matrix. Die Matrizen lassen sich rekursiv erzeugen – schönes Thema, aber optional.

💾 `feat: add threshold and bayer dithering`

---

## Teil F – Fehlerdiffusion: Floyd–Steinberg & Atkinson ✍️ (Herzstück)

### F.1 Die Idee

Beim Schwellwert geht Information verloren: Ein Pixel mit Wert 100 wird 0 – der „Fehler“ von 100 verschwindet. **Fehlerdiffusion verteilt diesen Fehler auf die Nachbarn, die noch nicht bearbeitet wurden.** Die werden dadurch heller und kippen eher auf Weiß. Im Mittel bleibt die Helligkeit erhalten.

```
Bearbeitung: Zeile für Zeile, links → rechts

      x-1    x     x+1
y      ·    [●]   7/16      ● = aktueller Pixel
y+1   3/16  5/16  1/16      Brüche = Anteil des Fehlers
```
Das ist der **Floyd–Steinberg-Kernel**. Atkinson verteilt anders:
```
      x-1    x     x+1   x+2
y      ·    [●]   1/8   1/8
y+1   1/8   1/8   1/8
y+2          1/8
```
Atkinson verteilt nur **6/8** des Fehlers – 2/8 gehen absichtlich verloren. Ergebnis: mehr Kontrast, hellere Lichter, dunklere Schatten. So sah der Original-Macintosh aus.

### F.2 Kernel als Daten

Statt zwei Algorithmen schreibst du **einen**, der eine Kernel-Tabelle bekommt (darfst du übernehmen):
```ts
type Kernel = [dx: number, dy: number, weight: number][]

export const FLOYD_STEINBERG: Kernel = [
  [1, 0, 7 / 16],
  [-1, 1, 3 / 16], [0, 1, 5 / 16], [1, 1, 1 / 16],
]

export const ATKINSON: Kernel = [
  [1, 0, 1 / 8], [2, 0, 1 / 8],
  [-1, 1, 1 / 8], [0, 1, 1 / 8], [1, 1, 1 / 8],
  [0, 2, 1 / 8],
]
```
🎓 Gutes Interview-Argument: *„Ich habe die Algorithmen als Daten modelliert – ein neuer Algorithmus wie Stucki ist nur eine neue Tabelle.“*

### F.3 Pseudo-Code

```ts
export function errorDiffusion(
  gray: Float32Array, width: number, height: number, kernel: Kernel, level = 128,
): Uint8ClampedArray
```
```
buffer = Kopie von gray                       // NICHT das Original verändern!
out    = new Uint8ClampedArray(width * height)

für y von 0 bis height-1:
  für x von 0 bis width-1:
    i       = y * width + x
    alt     = buffer[i]
    neu     = alt >= level ? 255 : 0
    out[i]  = neu
    fehler  = alt - neu

    für jedes [dx, dy, gewicht] im kernel:
      nx = x + dx,  ny = y + dy
      wenn nx im Bild (0 … width-1) und ny < height:
        buffer[ny * width + nx] += fehler * gewicht

return out
```

**Stolperfallen:**
- **Kopie anlegen** (`Float32Array.from(gray)`) – sonst veränderst du die Eingabe, und der nächste Render startet mit falschen Werten.
- **Randprüfung** – ohne `nx >= 0` schreibt der Pixel ganz links in die vorige Zeile.

### F.4 Tests (nachgerechnet)

| Eingabe | Kernel | Erwartet |
|---|---|---|
| 2×2, alle 128 | Floyd–Steinberg | `[255, 0, 0, 255]` |
| 4×1, alle 100 | Floyd–Steinberg | `[0, 255, 0, 0]` |
| 4×1, alle 100 | Atkinson | `[0, 0, 0, 255]` |
| 64×64, alle 64 | Floyd–Steinberg | Anteil Weiß ≈ **0.25** (±0.01) |
| 64×64, alle 64 | Atkinson | Anteil Weiß ≈ **0.18** – deutlich weniger! |
| Eingabe-Array | beide | ist nach dem Aufruf **unverändert** |

Der vierte Test ist ein **Eigenschaftstest**: Er prüft keine einzelnen Pixel, sondern das Prinzip (*„mittlere Helligkeit bleibt erhalten“*, 64/255 ≈ 0.25). Der fünfte zeigt den Atkinson-Charakter in Zahlen – perfekt fürs Devlog.

💾 `feat: add error diffusion dithering (floyd-steinberg, atkinson)`

---

## Teil G – Farben & Zusammenführen ✍️

### G.1 `hexToRgb` in `lib/color.ts`
```ts
export function hexToRgb(hex: string): [number, number, number]
// '#ff8800' → [255, 136, 0]
```
Tipp: `parseInt('ff', 16)` → 255. Deine `normalizeHex` macht schon den schwierigen Teil.

### G.2 `dither(image, params)` in `dither/index.ts`
```ts
export function dither(image: ImageData, params: DitheringParams): ImageData
```
Ablauf:
1. `gray = toGray(image, params.brightness, params.contrast)`
2. Schwelle: `level = params.threshold * 2.55`
3. Je nach `params.algorithm`: `bayer(...)` oder `errorDiffusion(..., FLOYD_STEINBERG | ATKINSON, level)`
4. Neues `ImageData` gleicher Größe erzeugen; pro Pixel: `255` → **Hintergrund**farbe, `0` → **Vordergrund**farbe, Alpha 255

🎓 Warum Vordergrund = 0 (dunkel)? Wie beim Druck: Die „Tinte“ ist das Dunkle, das Papier der Hintergrund.

**Zur Palette (1 bit / 2 colors / 4 colors):** Heute nur **1 bit mit deinen zwei Farben**. Überleg dir, ob „1 bit“ und „2 colors“ für Nutzer:innen überhaupt verschieden sind – vermutlich reicht *2 Farben* vs. *4 Stufen*. Gute UX-Entscheidung fürs Devlog.

---

## Teil H – Live-Vorschau verdrahten (Canvas-Pipeline 🤖)

### H.1 `src/lib/render.ts` (Vorlage – reine Canvas-Technik)
```ts
type Apply = (image: ImageData) => ImageData

/**
 * Runs an effect on a smaller copy of the image and scales the result back up
 * without smoothing – that is what makes "pixel size" look like big, crisp pixels.
 */
export function renderEffect(source: ImageBitmap, target: HTMLCanvasElement, pixelSize: number, apply: Apply) {
  const width = Math.max(1, Math.round(source.width / pixelSize))
  const height = Math.max(1, Math.round(source.height / pixelSize))

  const work = document.createElement('canvas')
  work.width = width
  work.height = height
  const workContext = work.getContext('2d', { willReadFrequently: true })
  if (!workContext) return

  workContext.drawImage(source, 0, 0, width, height)
  const result = apply(workContext.getImageData(0, 0, width, height))
  workContext.putImageData(result, 0, 0)

  target.width = source.width
  target.height = source.height
  const targetContext = target.getContext('2d')
  if (!targetContext) return

  targetContext.imageSmoothingEnabled = false
  targetContext.drawImage(work, 0, 0, target.width, target.height)
}
```
**Der Pixelgrößen-Trick:** Bei Pixelgröße 4 wird das Bild auf ¼ verkleinert, dort gedithert und dann **ohne Glättung** wieder vergrößert → große, scharfe Pixel. Nebeneffekt: 16× weniger Rechenarbeit.

### H.2 `PreviewCanvas` ✍️ – baut auf deinem `ImageCanvas` auf
```tsx
const effect = useEditorStore((s) => s.effect)
const dithering = useEditorStore((s) => s.dithering)

useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  if (effect === 'dithering') {
    const start = performance.now()
    renderEffect(bitmap, canvas, dithering.pixelSize, (image) => dither(image, dithering))
    console.debug(`dither: ${(performance.now() - start).toFixed(1)} ms`)
  } else {
    // Halftone & ASCII come tomorrow – show the original until then
    renderEffect(bitmap, canvas, 1, (image) => image)
  }
}, [bitmap, effect, dithering])
```
- Das Dependency-Array `[bitmap, effect, dithering]` sorgt dafür, dass bei **jeder** Regleränderung neu gerendert wird. Weil `updateDithering` ein **neues** Objekt erzeugt, merkt React die Änderung (genau dafür war der Spread `{ ...state.dithering, ...patch }`).
- Die Zeitmessung behältst du – die brauchst du morgen.

---

## Teil I – Prüfen & Messen

✅ **Tagesziel:**
- [ ] Dithering-Tab: Bild ist schwarz-weiß gedithert
- [ ] Algorithmus wechseln → Bayer (Muster), Floyd–Steinberg (fein), Atkinson (kontrastreich)
- [ ] Pixelgröße, Kontrast, Helligkeit, Schwelle wirken sofort
- [ ] Farben ändern → z. B. dunkelblau auf creme sieht nach Risografie aus
- [ ] Alle Tests grün (`npm run test:run`)
- [ ] **Messen:** Konsole öffnen, Pixelgröße 1, Floyd–Steinberg, schnell am Kontrast-Regler ziehen. Wie viele ms pro Render? Ruckelt es?

📝 **Devlog „Day 3“:** Kernel als Daten, Atkinson vs. Floyd–Steinberg in Zahlen (0.18 vs. 0.25), Pixelgrößen-Trick, gemessene Renderzeit.

---

## Ausblick Tag 4

Wenn der Regler bei Pixelgröße 1 ruckelt, ist das **kein Fehler, sondern der Anlass für morgen**: Die Berechnung blockiert den Haupt-Thread – solange sie läuft, kann der Browser nicht auf die Maus reagieren. Morgen verschiebst du `src/effects/` in einen **Web Worker** (deshalb heute „reines TypeScript ohne React“), dann bleibt die Oberfläche immer flüssig. Danach: Halftone (aus deinem bestehenden Tool) und ASCII.
