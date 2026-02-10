/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: initBootstrap.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Initialization Bootstrap Module
 * 
 * Should be imported at the very top of main.jsx
 * Coordinates with Electron main process to signal readiness
 * 
 * @module bootstrap/initBootstrap
 */

import initCoordinator from '../services/InitializationCoordinator';

/**
 * Initialize app bootstrap
 * Call this as early as possible in React lifecycle
 */
export function bootstrapAppInitialization() {
  console.log('[Bootstrap] Starting app initialization...');

  // Signal UI is attempting to initialize
  window.__appInitializing = true;

  // CRITICAL: window.api is only available AFTER preload script runs
  // which happens when the BrowserWindow loads. Use a check-and-wait pattern.
  function setupIPCListeners() {
    // window.api should be available now (preload has run)
    if (!window.api) {
      console.warn('[Bootstrap] ⚠️  window.api not yet available, retrying...');
      // Retry after a brief delay
      setTimeout(setupIPCListeners, 100);
      return;
    }

    console.log('[Bootstrap] ✅ window.api is available, setting up IPC listeners');

    // Listen for readiness signals from Electron main process via IPC
    if (window.api.onAppDatabaseReady) {
      window.api.onAppDatabaseReady(() => {
        console.log('[Bootstrap] ✅ Received database-ready signal from main process');
        initCoordinator.setReady('database', true);
      });
    }

    if (window.api.onAppReady) {
      window.api.onAppReady(() => {
        console.log('[Bootstrap] ✅ Received app-ready signal from main process');
        initCoordinator.setReady('database', true);
        initCoordinator.setReady('ipcBridge', true);
      });
    }
  }

  // Try to set up IPC listeners immediately
  // If window.api doesn't exist yet, will retry
  setupIPCListeners();

  // Fallback: Mark database as ready if not signaled after 5 seconds
  // This prevents app from getting stuck if main process doesn't signal
  setTimeout(() => {
    if (!initCoordinator.isReady('database')) {
      console.warn('[Bootstrap] ⚠️  Database ready signal not received, marking ready anyway');
      initCoordinator.setReady('database', true);
    }
  }, 5000);
}

export default bootstrapAppInitialization;

