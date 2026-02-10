/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: InitializationCoordinator.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Initialization Coordinator
 * 
 * Ensures all critical services are ready before React renders content
 * Provides single source of truth for app initialization state
 * 
 * @module services/InitializationCoordinator
 */

class InitializationCoordinator {
  constructor() {
    this.readyStates = {
      ipcBridge: false,
      database: false,
      uiReady: false,
    };
    this.listeners = new Set();
    this.timeouts = {};
  }

  /**
   * Mark a system as ready
   * @param {string} system - System name (ipcBridge, database, etc)
   * @param {boolean} ready - Ready state
   */
  setReady(system, ready = true) {
    const changed = this.readyStates[system] !== ready;
    this.readyStates[system] = ready;
    
    console.log(`[InitCoordinator] ${system}: ${ready ? 'âœ… READY' : 'âŒ NOT READY'}`);
    
    if (changed) {
      this.notifyListeners();
    }
  }

  /**
   * Check if all critical systems are ready
   * @returns {boolean} True if all systems ready
   */
  isFullyReady() {
    return this.readyStates.ipcBridge && this.readyStates.database && this.readyStates.uiReady;
  }

  /**
   * Get current ready state for a system
   * @param {string} system - System name
   * @returns {boolean} Ready state
   */
  isReady(system) {
    return this.readyStates[system] || false;
  }

  /**
   * Wait for a system to be ready with timeout
   * @param {string} system - System name
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise<boolean>} Resolves to true when ready or timeout
   */
  waitForReady(system, timeoutMs = 10000) {
    return new Promise((resolve) => {
      // Already ready
      if (this.readyStates[system]) {
        resolve(true);
        return;
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        console.warn(`[InitCoordinator] Timeout waiting for ${system}`);
        this.listeners.delete(listener);
        resolve(false);
      }, timeoutMs);

      // Listen for ready
      const listener = () => {
        if (this.readyStates[system]) {
          clearTimeout(timeoutId);
          this.listeners.delete(listener);
          resolve(true);
        }
      };

      this.listeners.add(listener);
    });
  }

  /**
   * Subscribe to initialization changes
   * @param {Function} callback - Called when any system changes
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Call immediately with current state
    callback();
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of state change
   * @private
   */
  notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[InitCoordinator] Listener error:', error);
      }
    });
  }

  /**
   * Get complete status object for debugging
   * @returns {Object} Current initialization state
   */
  getStatus() {
    return {
      ...this.readyStates,
      isFullyReady: this.isFullyReady(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset to initial state (for testing)
   */
  reset() {
    this.readyStates = {
      ipcBridge: false,
      database: false,
      uiReady: false,
    };
    this.notifyListeners();
  }
}

// Global instance
const initCoordinator = new InitializationCoordinator();

export default initCoordinator;

