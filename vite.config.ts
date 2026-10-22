/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react"
import {defineConfig} from "vite"

// https://vite.dev/config/
export default defineConfig(({command, isPreview}) => ({
    plugins: [react()],
    // GitHub Pages serves the app from https://w3br.github.io/Lineatur/
    // (build + `npm run preview` use that path, the dev server stays on /)
    base: command === "build" || isPreview ? "/Lineatur/" : "/",
    test: {
        // Component tests need a DOM; effect tests run fine in it too.
        environment: "jsdom",
    },
}))
