import {StrictMode} from "react"
import {createRoot} from "react-dom/client"
import "@fontsource-variable/geist"
import "@fontsource-variable/geist-mono"
import "./styles/global.css"
import App from "./App.tsx"
import {restoreFromUrl, startUrlSync} from "./store/urlSync.ts"
import {loadSample} from "./store/loadSample.ts"

// Out here, not in an effect: runs once (StrictMode runs effects twice) and before the first render
restoreFromUrl()
startUrlSync()
void loadSample()

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <App />
    </StrictMode>,
)
