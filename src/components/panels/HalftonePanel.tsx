import {useState} from "react";
import {PanelSection} from "../layout/PanelSection.tsx";
import {SliderRow} from "../ui/SliderRow.tsx";
import {SegmentedControl} from "../ui/SegmentedControl.tsx";
import {ColorRow} from "../ui/ColorRow.tsx";

type Shape = "circle" | "square" | "line"

export function HalftonePanel() {
    // Temporary local state – moves to the Zustand store later.
    const [gridSize, setGridSize] = useState(8)
    const [angle, setAngle] = useState(45)
    const [shape, setShape] = useState<Shape>("circle")
    const [contrast, setContrast] = useState(0)
    const [brightness, setBrightness] = useState(0)
    const [noise, setNoise] = useState(20)
    const [foreground, setForeground] = useState("#111113")
    const [background, setBackground] = useState("#ffffff")

    return (
        <>
            <PanelSection title="Grid">
                <SliderRow label="Grid size" value={gridSize} min={2} max={40} onChange={setGridSize}/>
                <SliderRow label="Angle" value={angle} min={0} max={180} onChange={setAngle}/>
                <SegmentedControl
                    label="Dot shape"
                    options={[
                        {value: "circle", label: "Circle"},
                        {value: "square", label: "Square"},
                        {value: "line", label: "Line"},
                    ]}
                    value={shape}
                    onChange={setShape}
                />
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow label="Contrast" value={contrast} min={-100} max={100} onChange={setContrast}/>
                <SliderRow label="Brightness" value={brightness} min={-100} max={100} onChange={setBrightness}/>
                <SliderRow label="Noise" value={noise} min={0} max={100} onChange={setNoise}/>
            </PanelSection>

            <PanelSection title="Colors">
                <ColorRow label="Foreground" value={foreground} onChange={setForeground}/>
                <ColorRow label="Background" value={background} onChange={setBackground}/>
            </PanelSection>
        </>
    )
}
