import {useState} from "react";
import {PanelSection} from "../layout/PanelSection.tsx";
import {SelectRow} from "../ui/SelectRow.tsx";
import {SliderRow} from "../ui/SliderRow.tsx";
import {SegmentedControl} from "../ui/SegmentedControl.tsx";
import {ColorRow} from "../ui/ColorRow.tsx";

type Algorithm = "floyd-steinberg" | "atkinson" | "bayer"
type Palette = "1bit" | "2colors" | "4colors"

export function DitheringPanel() {
    // Temporary local state – moves to the Zustand store later.
    const [algorithm, setAlgorithm] = useState<Algorithm>("atkinson")
    const [pixelSize, setPixelSize] = useState(2)
    const [palette, setPalette] = useState<Palette>("1bit")
    const [contrast, setContrast] = useState(0)
    const [brightness, setBrightness] = useState(0)
    const [threshold, setThreshold] = useState(50)
    const [foreground, setForeground] = useState("#111113")
    const [background, setBackground] = useState("#ffffff")

    return (
        <>
            <PanelSection title="Algorithm">
                <SelectRow
                    label="Algorithm"
                    options={[
                        {value: "floyd-steinberg", label: "Floyd–Steinberg"},
                        {value: "atkinson", label: "Atkinson"},
                        {value: "bayer", label: "Bayer"},
                    ]}
                    value={algorithm}
                    onChange={setAlgorithm}
                />
                <SliderRow label="Pixel size" value={pixelSize} min={1} max={8} onChange={setPixelSize}/>
                <SegmentedControl
                    label="Palette"
                    showLabel
                    options={[
                        {value: "1bit", label: "1 bit"},
                        {value: "2colors", label: "2 colors"},
                        {value: "4colors", label: "4 colors"},
                    ]}
                    value={palette}
                    onChange={setPalette}
                />
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow label="Contrast" value={contrast} min={-100} max={100} onChange={setContrast}/>
                <SliderRow label="Brightness" value={brightness} min={-100} max={100} onChange={setBrightness}/>
                <SliderRow label="Threshold" value={threshold} min={0} max={100} onChange={setThreshold}/>
            </PanelSection>

            <PanelSection title="Colors">
                <ColorRow label="Foreground" value={foreground} onChange={setForeground}/>
                <ColorRow label="Background" value={background} onChange={setBackground}/>
            </PanelSection>
        </>
    )
}
