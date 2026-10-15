// Placeholder – replace with the app shell (TopBar, Canvas, Panel, StatusBar).
import {AppShell} from "./components/layout/AppShell.tsx";
import {Button} from "./components/ui/Button.tsx";
import {IconButton} from "./components/ui/IconButton.tsx";
import {Download, Redo2} from "lucide-react";

function App() {
  return (
    <AppShell
        topBar={
          <>
            <Button variant="primary" icon={<Download size={16}/>}>Export</Button>
            <IconButton icon={<Redo2 size={16}/>} label="Redo" aria-disabled={true} />
          </>
        }

        canvas={<p>Canvas</p>}
        panel={<p>Panel</p>}
        statusBar={<p>Status</p>}
    />
  )
}

export default App
