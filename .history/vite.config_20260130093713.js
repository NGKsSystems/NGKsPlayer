import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({ 
  plugins: [
    wasm(),
    topLevelAwait(),
    react()
  ],
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
      strict: false,
      allow: ['..']
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
  },
  worker: {
    format: 'es'
  }
})
