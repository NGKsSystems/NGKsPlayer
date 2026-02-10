/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: StemSeparationService.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Stem Separation Service
 * Bridge between React and Electron for Spleeter stem separation
 */
class StemSeparationService {
  constructor() {
    this.progressCallbacks = new Map();
    this.setupProgressListener();
  }

  setupProgressListener() {
    if (window.electron?.on) {
      window.electron.on('stem-separation:progress', (event, update) => {
        console.log('📊 Stem progress update:', update);
        // Notify all registered callbacks
        this.progressCallbacks.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in progress callback:', error);
          }
        });
      });
    } else {
      console.warn('⚠️  Electron IPC not available - running in development mode?');
    }
  }

  async checkPythonAvailable() {
    if (!window.electron?.invoke) {
      throw new Error('Electron IPC not available');
    }
    
    try {
      const result = await window.electron.invoke('stem-separation:check-python');
      console.log('🐍 Python check result:', result);
      return result;
    } catch (error) {
      console.error('Python check failed:', error);
      throw error;
    }
  }

  async separateStems(filePath, stemsCount = '4stems', progressCallback) {
    if (!window.electron?.invoke) {
      throw new Error('Electron IPC not available');
    }

    // Register progress callback
    const callbackId = Date.now();
    if (progressCallback) {
      this.progressCallbacks.set(callbackId, progressCallback);
    }

    try {
      console.log(`🎵 Starting stem separation: ${filePath}`);
      const result = await window.electron.invoke('stem-separation:separate', {
        filePath,
        stemsCount
      });

      console.log('✅ Separation result:', result);
      return result;
    } catch (error) {
      console.error('❌ Separation failed:', error);
      throw error;
    } finally {
      // Cleanup callback
      if (callbackId) {
        this.progressCallbacks.delete(callbackId);
      }
    }
  }

  async cancelSeparation() {
    if (!window.electron?.invoke) {
      return { success: false };
    }
    
    try {
      const result = await window.electron.invoke('stem-separation:cancel');
      console.log('🛑 Cancel result:', result);
      return result;
    } catch (error) {
      console.error('Cancel failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Clear all callbacks (useful for cleanup)
  clearCallbacks() {
    this.progressCallbacks.clear();
  }
}

export default new StemSeparationService();

