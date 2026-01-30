import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'

export default defineConfig({ 
  plugins: [wasm(), react()],
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
    },
    configureServer(server) {
      // Ensure WASM files are served with correct MIME type
      server.middlewares.use((req, res, next) => {
        if (req.url?.endsWith('.wasm')) {
          res.setHeader('Content-Type', 'application/wasm');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
        next();
      });
    }
  },
  logLevel: 'error',
  clearScreen: false,
  optimizeDeps: {
    exclude: ['electron', 'music-metadata-browser'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es'
  }
})
