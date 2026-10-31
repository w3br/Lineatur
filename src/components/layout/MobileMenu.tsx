import {useId, useRef, useState, type ReactNode} from "react"
import {Download, ImageUp, Menu, Redo2, Undo2, X} from "lucide-react"
import styles from "./MobileMenu.module.css"
import {Button} from "../ui/Button.tsx"
import {IconButton} from "../ui/IconButton.tsx"
import {useEditorStore} from "../../store/useEditorStore.ts"

type MobileMenuProps = {
    effectSwitcher: ReactNode
    onOpenImage: () => void
    onExport: () => void
}

/**
 * Everything the top bar has no room for on a phone.
 * popover instead of <dialog>: it closes on Escape and on a tap outside, but doesn't block the page –
 * the preview stays visible while switching effects. That's also why the menu is only two rows high.
 */
export function MobileMenu({effectSwitcher, onOpenImage, onExport}: MobileMenuProps) {
    const hasImage = useEditorStore((state) => state.image !== null)
    const canUndo = useEditorStore((state) => state.past.length > 0)
    const canRedo = useEditorStore((state) => state.future.length > 0)
    const undo = useEditorStore((state) => state.undo)
    const redo = useEditorStore((state) => state.redo)
    const menuRef = useRef<HTMLDivElement>(null)
    const menuId = useId()
    const [open, setOpen] = useState(false)

    // Closed first: focus returns to the menu button, and the export dialog hands it back there later
    function closeThen(action: () => void) {
        menuRef.current?.hidePopover()
        action()
    }

    return (
        <>
            <IconButton
                icon={open ? <X size={16} /> : <Menu size={16} />}
                label="Menu"
                aria-expanded={open}
                popoverTarget={menuId}
            />

            {/* Right after the button: that keeps the menu next in the tab order */}
            <div
                ref={menuRef}
                id={menuId}
                className={styles.menu}
                popover="auto"
                role="group"
                aria-label="Menu"
                onToggle={(event) => setOpen(event.newState === "open")}
            >
                {effectSwitcher}

                <div className={styles.actions}>
                    <IconButton icon={<Undo2 size={16} />} label="Undo" onClick={undo} disabled={!canUndo} />
                    <IconButton icon={<Redo2 size={16} />} label="Redo" onClick={redo} disabled={!canRedo} />
                    <IconButton
                        icon={<ImageUp size={16} />}
                        label="Open image"
                        onClick={() => closeThen(onOpenImage)}
                    />
                    <Button
                        className={styles.export}
                        variant="primary"
                        icon={<Download size={16} />}
                        disabled={!hasImage}
                        onClick={() => closeThen(onExport)}
                    >
                        Export
                    </Button>
                </div>
            </div>
        </>
    )
}
