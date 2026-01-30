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
    },
    target: 'esnext'
  },
  assetsInclude: ['**/*.wasm'],
  server: { 
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true
    },
    fs: {
      strict: false
    }
  },
  logLevel: 'error',
  clearScreen: false,
  optimizeDeps: {
    include: ['essentia.js'],
    exclude: ['electron', 'music-metadata-browser'],
    esbuildOptions: {
      target: 'esnext'
    }
  }
})
