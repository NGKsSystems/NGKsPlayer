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
    target: 'esnext',
    assetsInlineLimit: 0  // Never inline WASM
  },
  assetsInclude: ['**/*.wasm'],
  server: { 
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true
    },
    fs: {
      strict: false,
      allow: ['..']
    }
  },
  logLevel: 'info',
  clearScreen: false,
  optimizeDeps: {
    exclude: ['essentia.js', 'electron', 'music-metadata-browser'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es'
  }
})
