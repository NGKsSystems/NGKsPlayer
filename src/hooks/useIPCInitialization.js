/**
 * IPC Initialization Bridge
 * 
 * Ensures IPC bridge is ready and handles initialization handshake
 * Should be one of the first things to run in React
 * 
 * @module hooks/useIPCInitialization
 */

import { useEffect, useState } from 'react';
import initCoordinator from '../services/InitializationCoordinator';

/**
 * Hook to initialize and verify IPC bridge
 * @returns {Object} IPC state
 */
export function useIPCInitialization() {
  const [ipcReady, setIpcReady] = useState(false);
  const [ipcError, setIpcError] = useState(null);

  useEffect(() => {
    const initializeIPC = async () => {
      try {
        // Check if IPC bridge exists
        if (!window.api) {
          throw new Error('IPC bridge (window.api) not available');
        }

        // Verify critical IPC methods exist
        const requiredMethods = [
          'listSongs',
          'listArtists',
          'listAlbums',
          'listFolders',
          'listGenres',
        ];

        for (const method of requiredMethods) {
          if (typeof window.api[method] !== 'function') {
            throw new Error(`IPC method not available: ${method}`);
          }
        }

        console.log('[IPCInit] ✅ All IPC methods verified');
        
        // Wait for database to be ready (signal from main process)
        const dbReady = await Promise.race([
          // Wait for main process to signal database is ready
          new Promise((resolve) => {
            // Listen for database ready signal (sent from main.cjs)
            if (window.__dbReady) {
              resolve(true);
            }
            const interval = setInterval(() => {
              if (window.__dbReady) {
                clearInterval(interval);
                resolve(true);
              }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
              clearInterval(interval);
              resolve(false);
            }, 5000);
          }),
        ]);

        if (!dbReady) {
          console.warn('[IPCInit] ⚠️  Database not signaled ready, but continuing...');
        }

        setIpcReady(true);
        initCoordinator.setReady('ipcBridge', true);
        
      } catch (error) {
        console.error('[IPCInit] ❌ IPC initialization failed:', error);
        setIpcError(error.message);
        initCoordinator.setReady('ipcBridge', false);
      }
    };

    initializeIPC();
  }, []);

  return {
    ipcReady,
    ipcError,
    isLoading: !ipcReady && !ipcError,
  };
}

export default useIPCInitialization;
