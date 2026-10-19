// Placeholder – replace with the app shell (TopBar, Canvas, Panel, StatusBar).
import {AppShell} from "./components/layout/AppShell.tsx";
import {Button} from "./components/ui/Button.tsx";
import {IconButton} from "./components/ui/IconButton.tsx";
import {Download, Redo2} from "lucide-react";
import {SegmentedControl} from "./components/ui/SegmentedControl.tsx";
import {SliderRow} from "./components/ui/SliderRow.tsx";
import {useState} from "react";

type Effect = "halftone" | "dithering" | "ascii"

function App() {
    // Temporary local state – moves to the Zustand store later.
    const [effect, setEffect] = useState<Effect>("halftone")
    const [resolution, setResolution] = useState(100)

    return (
        <AppShell
            topBar={
                <>
                    <Button variant="primary" icon={<Download size={16}/>}>Export</Button>
                    <IconButton icon={<Redo2 size={16}/>} label="Redo" aria-disabled={true}/>
                    <SegmentedControl
                        label="View mode"
                        options={[
                            {value: "halftone", label: "Halftone"},
                            {value: "dithering", label: "Dithering"},
                            {value: "ascii", label: "ASCII"},
                        ]}
                        value={effect}
                        onChange={setEffect}
                    />
                </>
            }

            canvas={<p>Canvas</p>}

            panel={
                <SliderRow
                    label="Resolution"
                    value={resolution}
                    min={1}
                    max={200}
                    step={1}
                    onChange={setResolution}
                />
            }

            statusBar={<p>Status</p>}
        />
    )
}

export default App
