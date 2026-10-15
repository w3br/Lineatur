// Placeholder – replace with the app shell (TopBar, Canvas, Panel, StatusBar).
import {AppShell} from "./components/layout/AppShell.tsx";
import {Button} from "./components/ui/Button.tsx";
import {Download} from "lucide-react";

function App() {
  return (
    <AppShell
        topBar={<Button variant="primary" icon={<Download size={16} />}>Export</Button>}
        canvas={<p>Canvas</p>}
        panel={<p>Panel</p>}
        statusBar={<p>Status</p>}
    />
  )
}

export default App
