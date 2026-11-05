import {PanelSection} from "../layout/PanelSection.tsx"
import {SelectRow} from "../ui/SelectRow.tsx"
import {SliderRow} from "../ui/SliderRow.tsx"
import {ColorRow} from "../ui/ColorRow.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"
import {ditheringRanges} from "../../store/params.ts"

export function DitheringPanel() {
    const params = useEditorStore((state) => state.dithering)
    const update = useEditorStore((state) => state.updateDithering)

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
                    value={params.algorithm}
                    onChange={(algorithm) => update({algorithm})}
                />
                <SliderRow
                    label="Pixel size"
                    value={params.pixelSize}
                    {...ditheringRanges.pixelSize}
                    onChange={(pixelSize) => update({pixelSize})}
                />
            </PanelSection>

            <PanelSection title="Tone">
                <SliderRow
                    label="Contrast"
                    value={params.contrast}
                    {...ditheringRanges.contrast}
                    onChange={(contrast) => update({contrast})}
                />
                <SliderRow
                    label="Brightness"
                    value={params.brightness}
                    {...ditheringRanges.brightness}
                    onChange={(brightness) => update({brightness})}
                />
                {params.algorithm !== "bayer" && (
                    <SliderRow
                        label="Threshold"
                        value={params.threshold}
                        {...ditheringRanges.threshold}
                        onChange={(threshold) => update({threshold})}
                    />
                )}
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
