import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({ 
  plugins: [react()],
  base: './',
  build: { 
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: ['electron', 'music-metadata-browser']
    }
  }, 
  server: { 
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true
    }
  },
  logLevel: 'error',
  clearScreen: false,
  optimizeDeps: {
    exclude: ['electron', 'music-metadata-browser']
  }
})
