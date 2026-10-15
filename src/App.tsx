// Placeholder – replace with the app shell (TopBar, Canvas, Panel, StatusBar).
import {AppShell} from "./components/layout/AppShell.tsx";

function App() {
  return (
    <AppShell
        topBar={<p>TopBar</p>}
        canvas={<p>Canvas</p>}
        panel={<p>Panel</p>}
        statusBar={<p>Status</p>}
    />
  )
}

export default App
