import {AppShell} from "./components/layout/AppShell.tsx";
import {TopBar} from "./components/layout/TopBar.tsx";
import {Button} from "./components/ui/Button.tsx";
import {IconButton} from "./components/ui/IconButton.tsx";
import {Download, Redo2, Undo2} from "lucide-react";
import {SegmentedControl} from "./components/ui/SegmentedControl.tsx";
import {HalftonePanel} from "./components/panels/HalftonePanel.tsx";
import {DitheringPanel} from "./components/panels/DitheringPanel.tsx";
import {AsciiPanel} from "./components/panels/AsciiPanel.tsx";
import {type ComponentType} from "react";
import styles from "./App.module.css";
import {useEditorStore} from "./store/useEditorStore.ts";
import type {Effect} from "./store/params.ts";
import {CanvasArea} from "./components/canvas/CanvasArea.tsx";
import {StatusBar} from "./components/layout/StatusBar.tsx";

// One panel per effect – the effect switcher picks which one is shown
const panels: Record<Effect, ComponentType> = {
    halftone: HalftonePanel,
    dithering: DitheringPanel,
    ascii: AsciiPanel,
}

// Files in public/ are served from the base path (/Lineatur/ on GitHub Pages), not from /
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`;

function App() {
    const effect = useEditorStore(state => state.effect)
    const setEffect = useEditorStore(state => state.setEffect)
    const hasImage = useEditorStore(state => state.image !== null)

    // Capitalized, so JSX treats it as a component: <Panel/>
    const Panel = panels[effect]

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
                                <IconButton icon={<Undo2 size={16}/>} label="Undo"/>
                                <IconButton icon={<Redo2 size={16}/>} label="Redo"/>
                            </div>
                            <Button variant="primary" icon={<Download size={16}/>} disabled={!hasImage}>Export</Button>
                        </>
                    }
                />
            }

            canvas={<CanvasArea/>}

            panel={<Panel/>}

            statusBar={<StatusBar/>}
        />
    )
}

export default App
