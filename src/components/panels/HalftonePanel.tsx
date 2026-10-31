import {PanelSection} from "../layout/PanelSection.tsx"
import {SliderRow} from "../ui/SliderRow.tsx"
import {SegmentedControl} from "../ui/SegmentedControl.tsx"
import {ColorRow} from "../ui/ColorRow.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {halftoneRanges} from "../../store/params.ts"

export function HalftonePanel() {
    const params = useEditorStore((state) => state.halftone)
    const update = useEditorStore((state) => state.updateHalftone)

    return (
        <>
            <PanelSection title="Grid">
                <SliderRow
                    label="Grid size"
                    value={params.gridSize}
                    {...halftoneRanges.gridSize}
                    onChange={(gridSize) => update({gridSize})}
                />
                <SliderRow
                    label="Angle"
                    value={params.angle}
                    {...halftoneRanges.angle}
                    onChange={(angle) => update({angle})}
                />
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
                    {...halftoneRanges.contrast}
                    onChange={(contrast) => update({contrast})}
                />
                <SliderRow
                    label="Brightness"
                    value={params.brightness}
                    {...halftoneRanges.brightness}
                    onChange={(brightness) => update({brightness})}
                />
                <SliderRow
                    label="Noise"
                    value={params.noise}
                    {...halftoneRanges.noise}
                    onChange={(noise) => update({noise})}
                />
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
