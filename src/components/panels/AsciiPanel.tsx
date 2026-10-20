import {PanelSection} from "../layout/PanelSection.tsx";
import {SelectRow} from "../ui/SelectRow.tsx";
import {TextField} from "../ui/TextField.tsx";
import {SliderRow} from "../ui/SliderRow.tsx";
import {SwitchRow} from "../ui/SwitchRow.tsx";
import {ColorRow} from "../ui/ColorRow.tsx";
import {useEditorStore} from "../../store/useEditorStore.ts";

type Charset = "standard" | "blocks" | "detailed" | "custom"

// Characters ordered from light to dark
const charsetPresets: Record<Exclude<Charset, "custom">, string> = {
    standard: " .:-=+*#%@",
    blocks: " ░▒▓█",
    detailed: " .'`^\",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
}

export function AsciiPanel() {
    const params = useEditorStore(state => state.ascii)
    const update = useEditorStore(state => state.updateAscii)

    function handleCharsetChange(next: Charset) {
        // "Custom" keeps whatever is in the field, presets replace it
        if (next === "custom") update({charSet: next})
        else update({charSet: next, characters: charsetPresets[next]})
    }

    function handleCharactersChange(next: string) {
        // Editing the characters turns any preset into a custom set
        update({charSet: "custom", characters: next})
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
                    value={params.charSet}
                    onChange={handleCharsetChange}
                />
                <TextField
                    label="Characters, from light to dark"
                    placeholder="Type characters…"
                    value={params.characters}
                    onChange={handleCharactersChange}
                />
                <SliderRow label="Cell size" value={params.cellSize} min={4} max={32} onChange={(cellSize) => update({ cellSize })}/>
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow label="Contrast" value={params.contrast} min={-100} max={100} onChange={(contrast) => update({ contrast })}/>
                <SliderRow label="Brightness" value={params.brightness} min={-100} max={100} onChange={(brightness) => update({ brightness })}/>
            </PanelSection>

            <PanelSection title="Display">
                <SwitchRow label="Invert" checked={params.invert} onChange={(invert) => update({ invert })}/>
                <SwitchRow label="Color from image" checked={params.colorFromImage} onChange={(colorFromImage) => update({ colorFromImage })}/>
            </PanelSection>

            <PanelSection title="Colors">
                <ColorRow label="Foreground" value={params.foreground} onChange={(foreground) => update({ foreground })}/>
                <ColorRow label="Background" value={params.background} onChange={(background) => update({ background })}/>
            </PanelSection>
        </>
    )
}
