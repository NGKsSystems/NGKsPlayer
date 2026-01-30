import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

export default defineConfig({ 
  plugins: [wasm(), topLevelAwait(), react()],
  base: './',
  build: { 
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      external: ['electron', 'music-metadata-browser', 'essentia.js/dist/essentia-wasm.umd.js', 'essentia.js/dist/essentia.js-core.umd.js']
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
    },
    configureServer(server) {
      // Ensure WASM files are served with correct MIME type
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
        }
        next();
      });
    }
  },
  logLevel: 'error',
  clearScreen: false,
  optimizeDeps: {
    exclude: ['electron', 'music-metadata-browser', 'essentia.js'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es'
  }
})
