/**
 * App Initialization Hook
 * 
 * Manages the complete initialization sequence for the app
 * Ensures all critical systems are ready before allowing interaction
 * 
 * @module hooks/useAppInitialization
 */

import { useEffect, useState } from 'react';
import initCoordinator from '../services/InitializationCoordinator';
import { useIPCInitialization } from './useIPCInitialization';

/**
 * Hook to manage complete app initialization
 * Coordinates IPC, database, and UI readiness
 * 
 * @returns {Object} Initialization state
 */
export function useAppInitialization() {
  const ipcState = useIPCInitialization();
  const [appReady, setAppReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    // Subscribe to initialization changes
    const unsubscribe = initCoordinator.subscribe(() => {
      const status = initCoordinator.getStatus();
      console.log('[AppInit] Current status:', status);

      // Check if all systems are ready
      if (status.isFullyReady) {
        console.log('[AppInit] ✅ APP FULLY INITIALIZED');
        setAppReady(true);
      }
    });

    // If IPC is ready, mark it
    if (ipcState.ipcReady && !initCoordinator.isReady('ipcBridge')) {
      initCoordinator.setReady('ipcBridge', true);
    }

    // If IPC has error
    if (ipcState.ipcError) {
      console.error('[AppInit] IPC initialization failed:', ipcState.ipcError);
      setInitError(ipcState.ipcError);
    }

    return unsubscribe;
  }, [ipcState]);

  return {
    appReady,
    initError,
    ipcReady: ipcState.ipcReady,
    isInitializing: !appReady && !initError,
    coordinatorStatus: initCoordinator.getStatus(),
  };
}

export default useAppInitialization;
