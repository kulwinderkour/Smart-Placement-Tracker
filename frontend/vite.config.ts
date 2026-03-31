import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'GEMINI_'],
  cacheDir: '/tmp/.vite',
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
  },
})