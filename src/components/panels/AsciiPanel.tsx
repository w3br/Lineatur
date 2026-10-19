import {useState} from "react";
import {PanelSection} from "../layout/PanelSection.tsx";
import {SelectRow} from "../ui/SelectRow.tsx";
import {TextField} from "../ui/TextField.tsx";
import {SliderRow} from "../ui/SliderRow.tsx";
import {SwitchRow} from "../ui/SwitchRow.tsx";
import {ColorRow} from "../ui/ColorRow.tsx";

type Charset = "standard" | "blocks" | "detailed" | "custom"

// Characters ordered from light to dark
const charsetPresets: Record<Exclude<Charset, "custom">, string> = {
    standard: " .:-=+*#%@",
    blocks: " ░▒▓█",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
}

export function AsciiPanel() {
    // Temporary local state – moves to the Zustand store later.
    const [charset, setCharset] = useState<Charset>("standard")
    const [characters, setCharacters] = useState(charsetPresets.standard)
    const [cellSize, setCellSize] = useState(8)
    const [contrast, setContrast] = useState(0)
    const [brightness, setBrightness] = useState(0)
    const [invert, setInvert] = useState(false)
    const [colorFromImage, setColorFromImage] = useState(false)
    const [foreground, setForeground] = useState("#111113")
    const [background, setBackground] = useState("#ffffff")

    function handleCharsetChange(next: Charset) {
        setCharset(next)
        // "Custom" keeps whatever is in the field, presets replace it
        if (next !== "custom") setCharacters(charsetPresets[next])
    }

    function handleCharactersChange(next: string) {
        setCharacters(next)
        // Editing the characters turns any preset into a custom set
        setCharset("custom")
    }

    return (
        <>
            <PanelSection title="Characters">
                <SelectRow
                    label="Character set"
                    options={[
                        {value: "standard", label: "Standard"},
                        {value: "blocks", label: "Blocks"},
                        {value: "detailed", label: "Detailed"},
                        {value: "custom", label: "Custom"},
                    ]}
                    value={charset}
                    onChange={handleCharsetChange}
                />
                <TextField
                    label="Characters, from light to dark"
                    placeholder="Type characters…"
                    value={characters}
                    onChange={handleCharactersChange}
                />
                <SliderRow label="Cell size" value={cellSize} min={4} max={32} onChange={setCellSize}/>
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow label="Contrast" value={contrast} min={-100} max={100} onChange={setContrast}/>
                <SliderRow label="Brightness" value={brightness} min={-100} max={100} onChange={setBrightness}/>
            </PanelSection>

            <PanelSection title="Display">
                <SwitchRow label="Invert" checked={invert} onChange={setInvert}/>
                <SwitchRow label="Color from image" checked={colorFromImage} onChange={setColorFromImage}/>
            </PanelSection>

            <PanelSection title="Colors">
                <ColorRow label="Foreground" value={foreground} onChange={setForeground}/>
                <ColorRow label="Background" value={background} onChange={setBackground}/>
            </PanelSection>
        </>
    )
}
