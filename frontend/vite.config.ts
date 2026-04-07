import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'GEMINI_'],
  server: {
    host: true,
    port: 3000,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/ai': {
        target: 'http://ai-engine:8002',
        changeOrigin: true,
      },
    },
  },
})