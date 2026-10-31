import {AppShell} from "./components/layout/AppShell.tsx"
import {TopBar} from "./components/layout/TopBar.tsx"
import {Button} from "./components/ui/Button.tsx"
import {IconButton} from "./components/ui/IconButton.tsx"
import {Download, Redo2, Undo2, ImageUp} from "lucide-react"
import {SegmentedControl} from "./components/ui/SegmentedControl.tsx"
import {HalftonePanel} from "./components/panels/HalftonePanel.tsx"
import {DitheringPanel} from "./components/panels/DitheringPanel.tsx"
import {AsciiPanel} from "./components/panels/AsciiPanel.tsx"
import {useRef, type ComponentType} from "react"
import styles from "./App.module.css"
import {useEditorStore} from "./store/useEditorStore.ts"
import type {Effect} from "./store/params.ts"
import {CanvasArea} from "./components/canvas/CanvasArea.tsx"
import {StatusBar} from "./components/layout/StatusBar.tsx"
import {MobileMenu} from "./components/layout/MobileMenu.tsx"
import {ExportDialog, type ExportDialogHandle} from "./components/export/ExportDialog.tsx"
import {useFilePicker} from "./hooks/useFilePicker.tsx"
import {useMediaQuery} from "./hooks/useMediaQuery.ts"
import {useUndoShortcuts} from "./hooks/useUndoShortcuts.ts"

// One panel per effect – the effect switcher picks which one is shown
const panels: Record<Effect, ComponentType> = {
    halftone: HalftonePanel,
    dithering: DitheringPanel,
    ascii: AsciiPanel,
}

// Files in public/ are served from the base path (/Lineatur/ on GitHub Pages), not from /
const logoUrl = `${import.meta.env.BASE_URL}favicon.svg`

// Same width as the media queries in the CSS – custom properties don't work in those
const MOBILE_QUERY = "(max-width: 767px)"

function App() {
    const isMobile = useMediaQuery(MOBILE_QUERY)
    const exportDialog = useRef<ExportDialogHandle>(null)
    const hasImage = useEditorStore((state) => state.image !== null)
    const effect = useEditorStore((state) => state.effect)
    const setEffect = useEditorStore((state) => state.setEffect)
    const loadFile = useEditorStore((state) => state.loadFile)
    const picker = useFilePicker(loadFile)
    const canUndo = useEditorStore((state) => state.past.length > 0)
    const canRedo = useEditorStore((state) => state.future.length > 0)
    const undo = useEditorStore((state) => state.undo)
    const redo = useEditorStore((state) => state.redo)
    useUndoShortcuts(undo, redo)

    // Capitalized, so JSX treats it as a component: <Panel/>
    const Panel = panels[effect]

    const effectSwitcher = (
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
    )

    return (
        <AppShell
            topBar={
                <TopBar
                    start={
                        <>
                            <h1 className={styles.brand}>
                                {/* Decorative: the heading text already names the app */}
                                <img className={styles.logo} src={logoUrl} alt="" />
                                Lineatur
                            </h1>
                            {/* Here, in both layouts: they keep their state when the window crosses the breakpoint */}
                            {picker.input}
                            <ExportDialog ref={exportDialog} />
                        </>
                    }
                    center={isMobile ? undefined : effectSwitcher}
                    end={
                        isMobile ? (
                            <MobileMenu
                                effectSwitcher={effectSwitcher}
                                onOpenImage={picker.open}
                                onExport={() => exportDialog.current?.open()}
                            />
                        ) : (
                            <>
                                <div className={styles.history}>
                                    <IconButton icon={<ImageUp size={16} />} label="Open image" onClick={picker.open} />
                                    <IconButton
                                        icon={<Undo2 size={16} />}
                                        label="Undo"
                                        onClick={undo}
                                        disabled={!canUndo}
                                    />
                                    <IconButton
                                        icon={<Redo2 size={16} />}
                                        label="Redo"
                                        onClick={redo}
                                        disabled={!canRedo}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    icon={<Download size={16} />}
                                    disabled={!hasImage}
                                    onClick={() => exportDialog.current?.open()}
                                >
                                    Export
                                </Button>
                            </>
                        )
                    }
                />
            }

            canvas={<CanvasArea />}

            panel={<Panel />}

            statusBar={<StatusBar />}
        />
    )
}

export default App
