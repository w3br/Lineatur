import {AppShell} from "./components/layout/AppShell.tsx";
import {TopBar} from "./components/layout/TopBar.tsx";
import {Button} from "./components/ui/Button.tsx";
import {IconButton} from "./components/ui/IconButton.tsx";
import {Download, Redo2, Undo2} from "lucide-react";
import {SegmentedControl} from "./components/ui/SegmentedControl.tsx";
import {SliderRow} from "./components/ui/SliderRow.tsx";
import {useState} from "react";
import styles from "./App.module.css";
import {SwitchRow} from "./components/ui/SwitchRow.tsx";
import {SelectRow} from "./components/ui/SelectRow.tsx";

type Effect = "halftone" | "dithering" | "ascii"

// Files in public/ are served from the base path (/Lineatur/ on GitHub Pages), not from /
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`;

function App() {
    // Temporary local state – moves to the Zustand store later.
    const [effect, setEffect] = useState<Effect>("halftone")
    const [resolution, setResolution] = useState(100)
    const [invert, setInvert] = useState(false)
    const [color, setColor] = useState(false)


    return (
        <AppShell
            topBar={
                <TopBar
                    start={
                        <h1 className={styles.brand}>
                            {/* Decorative: the heading text already names the app */}
                            <img className={styles.logo} src={logoUrl} alt=""/>
                            Lineatur
                        </h1>
                    }
                    center={
                        <SegmentedControl
                            label="Effect"
                            options={[
                                {value: "halftone", label: "Halftone"},
                                {value: "dithering", label: "Dithering"},
                                {value: "ascii", label: "ASCII"},
                            ]}
                            value={effect}
                            onChange={setEffect}
                        />
                    }
                    end={
                        <>
                            <div className={styles.history}>
                                <IconButton icon={<Undo2 size={16}/>} label="Undo" />
                                <IconButton icon={<Redo2 size={16}/>} label="Redo" />
                            </div>
                            <Button variant="primary" icon={<Download size={16}/>}>Export</Button>
                        </>
                    }
                />
            }

            canvas={<p></p>}

            panel={
                <>
                    <SliderRow
                    label="Resolution"
                    value={resolution}
                    min={1}
                    max={200}
                    step={1}
                    onChange={setResolution}/>

                    <SwitchRow
                        label="Invert"
                        checked={invert}
                        onChange={setInvert}
                    />
                    <SwitchRow
                        label="Color From Image"
                        checked={color}
                        onChange={setColor}
                    />
                    <SelectRow
                        label="Effect"
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

            statusBar="Status"
        />
    )
}

export default App
