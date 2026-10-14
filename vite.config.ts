import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the app from https://w3br.github.io/Lineatur/
  base: command === 'build' ? '/Lineatur/' : '/',
}))
