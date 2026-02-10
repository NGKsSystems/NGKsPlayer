/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: playerCrashProtection.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Player Crash Protection
 * Bulletproof error handling and recovery for live DJ scenarios
 * Ensures players NEVER hang or crash, even under extreme conditions
 */

export class CrashProtection {
  constructor(audioRef, options = {}) {
    this.audioRef = audioRef;
    this.options = {
      maxRecoveryAttempts: 3,
      recoveryTimeout: 5000,
      stallTimeout: 3000,
      ...options
    };
    
    this.recoveryAttempts = 0;
    this.lastPosition = 0;
    this.positionUpdateTime = Date.now();
    this.isRecovering = false;
    this.watchdogInterval = null;
    this.eventHandlers = new Map();
  }

  /**
   * Initialize crash protection with comprehensive error handlers
   */
  enable() {
    if (this.watchdogInterval) return; // Already enabled

    console.log('[CrashProtection] Enabling bulletproof mode');

    // Global error boundary for audio element
    const errorHandler = (e) => {
      console.warn('[CrashProtection] Audio error detected:', e);
      this.handleError(e);
    };

    const stalledHandler = () => {
      console.warn('[CrashProtection] Playback stalled');
      this.handleStall();
    };

    const suspendHandler = () => {
      console.warn('[CrashProtection] Playback suspended');
      this.handleSuspend();
    };

    const waitingHandler = () => {
      const waitStart = Date.now();
      const waitTimeout = setTimeout(() => {
        console.warn('[CrashProtection] Waiting timeout - attempting recovery');
        this.attemptRecovery('waiting timeout');
      }, this.options.stallTimeout);

      // Clear timeout when playback resumes
      const playingHandler = () => {
        clearTimeout(waitTimeout);
        this.audioRef.removeEventListener('playing', playingHandler);
      };
      this.audioRef.addEventListener('playing', playingHandler, { once: true });
    };

    // Attach handlers
    this.audioRef.addEventListener('error', errorHandler);
    this.audioRef.addEventListener('stalled', stalledHandler);
    this.audioRef.addEventListener('suspend', suspendHandler);
    this.audioRef.addEventListener('waiting', waitingHandler);

    // Store for cleanup
    this.eventHandlers.set('error', errorHandler);
    this.eventHandlers.set('stalled', stalledHandler);
    this.eventHandlers.set('suspend', suspendHandler);
    this.eventHandlers.set('waiting', waitingHandler);

    // Watchdog timer - detects frozen playback
    this.watchdogInterval = setInterval(() => {
      this.checkPlaybackHealth();
    }, 2000);
  }

  /**
   * Disable crash protection
   */
  disable() {
    console.log('[CrashProtection] Disabling');

    // Remove event handlers
    this.eventHandlers.forEach((handler, event) => {
      this.audioRef.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Clear watchdog
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }

  /**
   * Check if playback is healthy (not frozen)
   */
  checkPlaybackHealth() {
    if (!this.audioRef || this.audioRef.paused || this.audioRef.ended) return;

    const currentPosition = this.audioRef.currentTime;
    const now = Date.now();

    // If position hasn't changed in 3 seconds while playing, we're frozen
    if (currentPosition === this.lastPosition) {
      const timeSinceUpdate = now - this.positionUpdateTime;
      
      // Only trigger if we're supposed to be playing and have valid media
      if (timeSinceUpdate > this.options.stallTimeout && 
          this.audioRef.readyState >= 2 && 
          !this.audioRef.paused) {
        console.error('[CrashProtection] FROZEN PLAYBACK DETECTED!');
        this.attemptRecovery('frozen playback');
      }
    } else {
      this.lastPosition = currentPosition;
      this.positionUpdateTime = now;
    }
  }

  /**
   * Handle audio errors
   */
  handleError(error) {
    if (this.isRecovering) return;

    const errorCode = this.audioRef.error?.code;
    const errorMessage = this.audioRef.error?.message || 'Unknown error';

    console.error('[CrashProtection] Error code:', errorCode, 'Message:', errorMessage);

    // Don't attempt recovery for missing files or network errors
    if (errorCode === 4 || errorCode === 2) {
      console.log('[CrashProtection] File not found or network error - skipping recovery');
      return;
    }

    this.attemptRecovery('error event');
  }

  /**
   * Handle stalled playback
   */
  handleStall() {
    if (this.isRecovering) return;

    // Give it a moment to recover naturally
    setTimeout(() => {
      if (this.audioRef.readyState < 2) {
        console.warn('[CrashProtection] Still stalled after grace period');
        this.attemptRecovery('persistent stall');
      }
    }, 1500);
  }

  /**
   * Handle suspended playback
   */
  handleSuspend() {
    // Suspend is often normal (browser resource management)
    // Only intervene if it persists
    setTimeout(() => {
      if (this.audioRef.networkState === 2) { // NETWORK_IDLE
        console.log('[CrashProtection] Network idle - may need recovery');
        this.attemptRecovery('network idle');
      }
    }, 2000);
  }

  /**
   * Attempt to recover from a crash/hang
   */
  async attemptRecovery(reason) {
    if (this.isRecovering) {
      console.log('[CrashProtection] Already recovering, skipping');
      return;
    }

    this.recoveryAttempts++;

    if (this.recoveryAttempts > this.options.maxRecoveryAttempts) {
      console.error('[CrashProtection] MAX RECOVERY ATTEMPTS REACHED - GIVING UP');
      this.onRecoveryFailed?.(reason);
      this.reset();
      return;
    }

    console.warn(`[CrashProtection] RECOVERY ATTEMPT ${this.recoveryAttempts}/${this.options.maxRecoveryAttempts} (${reason})`);
    this.isRecovering = true;

    try {
      const currentSrc = this.audioRef.src;
      const currentTime = this.audioRef.currentTime;
      const wasPlaying = !this.audioRef.paused;

      // Strategy 1: Pause and resume
      this.audioRef.pause();
      await this.sleep(100);
      
      if (wasPlaying) {
        try {
          await this.audioRef.play();
          console.log('[CrashProtection] âœ“ Recovered with pause/resume');
          this.onRecoverySuccess?.('pause-resume');
          this.reset();
          return;
        } catch (e) {
          console.warn('[CrashProtection] Pause/resume failed:', e.message);
        }
      }

      // Strategy 2: Reload from last position
      this.audioRef.load();
      await this.sleep(200);
      
      if (currentTime > 0) {
        this.audioRef.currentTime = currentTime;
      }

      if (wasPlaying) {
        try {
          await this.audioRef.play();
          console.log('[CrashProtection] âœ“ Recovered with reload');
          this.onRecoverySuccess?.('reload');
          this.reset();
          return;
        } catch (e) {
          console.warn('[CrashProtection] Reload failed:', e.message);
        }
      }

      // Strategy 3: Full reset (nuclear option)
      const tempSrc = currentSrc;
      this.audioRef.src = '';
      await this.sleep(100);
      this.audioRef.src = tempSrc;
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Load timeout')), this.options.recoveryTimeout);
        
        this.audioRef.addEventListener('canplay', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });

        this.audioRef.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Load error'));
        }, { once: true });
      });

      if (currentTime > 0) {
        this.audioRef.currentTime = currentTime;
      }

      if (wasPlaying) {
        await this.audioRef.play();
      }

      console.log('[CrashProtection] âœ“ Recovered with full reset');
      this.onRecoverySuccess?.('full-reset');
      this.reset();

    } catch (err) {
      console.error('[CrashProtection] Recovery failed:', err.message);
      
      // Try again
      this.isRecovering = false;
      await this.sleep(500);
      this.attemptRecovery(reason + ' (retry)');
    }
  }

  /**
   * Reset recovery state
   */
  reset() {
    this.isRecovering = false;
    this.recoveryAttempts = 0;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set callback for recovery success
   */
  onRecoverySuccess(callback) {
    this.onRecoverySuccess = callback;
  }

  /**
   * Set callback for recovery failure
   */
  onRecoveryFailed(callback) {
    this.onRecoveryFailed = callback;
  }
}

/**
 * Apply crash protection to an audio element
 */
export function protectAudioElement(audioRef, options = {}) {
  const protection = new CrashProtection(audioRef, options);
  protection.enable();
  return protection;
}

