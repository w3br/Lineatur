import {PanelSection} from "../layout/PanelSection.tsx"
import {SliderRow} from "../ui/SliderRow.tsx"
import {SegmentedControl} from "../ui/SegmentedControl.tsx"
import {ColorRow} from "../ui/ColorRow.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"

export function HalftonePanel() {
    const params = useEditorStore((state) => state.halftone)
    const update = useEditorStore((state) => state.updateHalftone)

    return (
        <>
            <PanelSection title="Grid">
                <SliderRow
                    label="Grid size"
                    value={params.gridSize}
                    min={2}
                    max={40}
                    onChange={(gridSize) => update({gridSize})}
                />
                <SliderRow label="Angle" value={params.angle} min={0} max={180} onChange={(angle) => update({angle})} />
                <SegmentedControl
                    label="Dot shape"
                    options={[
                        {value: "circle", label: "Circle"},
                        {value: "square", label: "Square"},
                        {value: "line", label: "Line"},
                    ]}
                    value={params.shape}
                    onChange={(shape) => update({shape})}
                />
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow
                    label="Contrast"
                    value={params.contrast}
                    min={-100}
                    max={100}
                    onChange={(contrast) => update({contrast})}
                />
                <SliderRow
                    label="Brightness"
                    value={params.brightness}
                    min={-100}
                    max={100}
                    onChange={(brightness) => update({brightness})}
                />
                <SliderRow label="Noise" value={params.noise} min={0} max={100} onChange={(noise) => update({noise})} />
            </PanelSection>

            <PanelSection title="Colors">
                <ColorRow
                    label="Foreground"
                    value={params.foreground}
                    onChange={(foreground) => update({foreground})}
                />
                <ColorRow
                    label="Background"
                    value={params.background}
                    onChange={(background) => update({background})}
                />
            </PanelSection>
        </>
    )
}
