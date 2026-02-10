/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: autodj-controller.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKsPlayer Auto DJ Controller
 * Combines Professional Audio Engine + Auto DJ Brain for intelligent mixing
 */

import AutoDJBrain from './autodj-brain.js';

class AutoDJController {
  constructor() {
    this.brain = new AutoDJBrain();
    this.isActive = false;
    this.currentTrack = null;
    this.nextTrack = null;
    this.trackLibrary = [];
    this.playHistory = [];
    this.settings = {
      crossfadeDuration: 16, // seconds
      energyTarget: 'maintain', // 'build', 'maintain', 'wind_down'
      harmonyPriority: 0.8, // 0-1, how much to prioritize harmonic matching
      avoidRepeats: true,
      minTrackGap: 5, // don't repeat track within X tracks
      contextAware: true // consider time of day, set position, etc.
    };
  }

  /**
   * Initialize Auto DJ with track library
   */
  async initialize(trackLibrary) {
    this.trackLibrary = trackLibrary.filter(track => 
      track.analyzed && track.bpm && track.duration > 120
    );
    
    console.log(`[Auto DJ] Initialized with ${this.trackLibrary.length} analyzed tracks`);
    
    if (this.trackLibrary.length < 10) {
      throw new Error('Auto DJ requires at least 10 analyzed tracks to function');
    }
  }

  /**
   * Start Auto DJ with an initial track
   */
  async start(initialTrack = null) {
    if (this.isActive) {
      console.log('[Auto DJ] Already active');
      return;
    }

    this.isActive = true;
    this.playHistory = [];
    
    // Select initial track if not provided
    if (!initialTrack) {
      initialTrack = this.selectInitialTrack();
    }
    
    this.currentTrack = initialTrack;
    this.playHistory.push(initialTrack);
    
    console.log(`[Auto DJ] Starting with: ${initialTrack.title} by ${initialTrack.artist}`);
    
    // Immediately find next track
    await this.prepareNextTrack();
    
    // Schedule the next transition
    this.scheduleNextTransition();
    
    return {
      success: true,
      currentTrack: this.currentTrack,
      nextTrack: this.nextTrack,
      message: 'Auto DJ activated'
    };
  }

  /**
   * Stop Auto DJ
   */
  stop() {
    this.isActive = false;
    this.currentTrack = null;
    this.nextTrack = null;
    
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
      this.transitionTimer = null;
    }
    
    console.log('[Auto DJ] Stopped');
    
    return { success: true, message: 'Auto DJ deactivated' };
  }

  /**
   * Get current Auto DJ status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentTrack: this.currentTrack,
      nextTrack: this.nextTrack,
      playHistory: this.playHistory.slice(-10), // Last 10 tracks
      settings: this.settings,
      librarySize: this.trackLibrary.length
    };
  }

  /**
   * Update Auto DJ settings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('[Auto DJ] Settings updated:', newSettings);
    
    // If energy target changed, re-evaluate next track
    if (newSettings.energyTarget && this.isActive) {
      this.prepareNextTrack();
    }
  }

  /**
   * Manually override next track selection
   */
  async overrideNextTrack(track) {
    if (!this.isActive) {
      throw new Error('Auto DJ is not active');
    }
    
    // Validate track compatibility
    const compatibility = await this.brain.calculateCompatibilityScore(
      this.currentTrack, 
      track, 
      this.getContext()
    );
    
    if (compatibility.total < 0.2) {
      console.warn('[Auto DJ] Warning: Low compatibility for manual override');
    }
    
    this.nextTrack = {
      track,
      score: compatibility,
      mixInstructions: await this.brain.generateMixInstructions(this.currentTrack, track),
      isManualOverride: true
    };
    
    console.log(`[Auto DJ] Next track manually overridden: ${track.title}`);
    
    return this.nextTrack;
  }

  /**
   * Execute transition to next track (called by player)
   */
  async executeTransition() {
    if (!this.isActive || !this.nextTrack) {
      throw new Error('No next track prepared');
    }
    
    const previousTrack = this.currentTrack;
    const newTrack = this.nextTrack.track;
    const mixInstructions = this.nextTrack.mixInstructions;
    
    console.log(`[Auto DJ] Transitioning: ${previousTrack.title} â†’ ${newTrack.title}`);
    console.log(`[Auto DJ] Mix confidence: ${mixInstructions.confidence.toFixed(2)}`);
    console.log(`[Auto DJ] Harmonic advice: ${mixInstructions.harmonic.advice}`);
    
    // Update current track
    this.currentTrack = newTrack;
    this.playHistory.push(newTrack);
    this.nextTrack = null;
    
    // Record mix for learning
    this.brain.performanceAnalytics.recordMixSuccess(
      previousTrack,
      newTrack,
      true, // Assume success for now - could be enhanced with user feedback
      { confidence: mixInstructions.confidence }
    );
    
    // Prepare the next track
    await this.prepareNextTrack();
    
    // Schedule next transition
    this.scheduleNextTransition();
    
    return {
      success: true,
      transitionedTo: newTrack,
      nextTrack: this.nextTrack?.track,
      mixInstructions
    };
  }

  /**
   * Select optimal initial track based on context
   */
  selectInitialTrack() {
    const context = this.getContext();
    const candidates = this.trackLibrary.slice();
    
    // Filter by energy level appropriate for context
    let energyRange = [0.3, 0.8]; // Default range
    
    if (context.setPosition === 'opening') {
      energyRange = [0.3, 0.6];
    } else if (context.setPosition === 'peak') {
      energyRange = [0.7, 1.0];
    } else if (context.setPosition === 'closing') {
      energyRange = [0.2, 0.5];
    }
    
    const suitableTracks = candidates.filter(track => {
      const energy = track.energy || 0.5;
      return energy >= energyRange[0] && energy <= energyRange[1];
    });
    
    // Select random track from suitable options
    const selected = suitableTracks[Math.floor(Math.random() * suitableTracks.length)];
    
    return selected || candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Find and prepare the optimal next track
   */
  async prepareNextTrack() {
    if (!this.currentTrack) return;
    
    const candidates = this.getCandidateTracks();
    const context = this.getContext();
    
    const optimalNext = await this.brain.findOptimalNextTrack(
      this.currentTrack,
      candidates,
      context
    );
    
    if (optimalNext) {
      this.nextTrack = optimalNext;
      console.log(`[Auto DJ] Next track prepared: ${optimalNext.track.title} (Score: ${optimalNext.score.total.toFixed(2)})`);
    } else {
      console.warn('[Auto DJ] No compatible tracks found, selecting fallback');
      this.nextTrack = this.selectFallbackTrack();
    }
  }

  /**
   * Get candidate tracks for next selection
   */
  getCandidateTracks() {
    let candidates = this.trackLibrary.slice();
    
    // Remove current track
    candidates = candidates.filter(track => track.id !== this.currentTrack.id);
    
    // Avoid recent repeats
    if (this.settings.avoidRepeats) {
      const recentIds = this.playHistory
        .slice(-this.settings.minTrackGap)
        .map(track => track.id);
      
      candidates = candidates.filter(track => !recentIds.includes(track.id));
    }
    
    // Limit to reasonable number for performance
    if (candidates.length > 100) {
      candidates = candidates.slice(0, 100);
    }
    
    return candidates;
  }

  /**
   * Get current context for decision making
   */
  getContext() {
    const now = new Date();
    const hour = now.getHours();
    
    // Determine set position based on play history
    let setPosition = 'middle';
    if (this.playHistory.length <= 3) {
      setPosition = 'opening';
    } else if (this.playHistory.length >= 20) {
      setPosition = 'closing';
    } else if (hour >= 22 || hour <= 2) {
      setPosition = 'peak';
    }
    
    return {
      currentHour: hour,
      setPosition,
      playHistoryLength: this.playHistory.length,
      energyTarget: this.settings.energyTarget,
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6
    };
  }

  /**
   * Select fallback track when no optimal match found
   */
  selectFallbackTrack() {
    const candidates = this.getCandidateTracks();
    
    if (candidates.length === 0) {
      // Fallback to any track except current
      const allExceptCurrent = this.trackLibrary.filter(
        track => track.id !== this.currentTrack.id
      );
      const fallback = allExceptCurrent[Math.floor(Math.random() * allExceptCurrent.length)];
      
      return {
        track: fallback,
        score: { total: 0.3, fallback: true },
        mixInstructions: {
          crossfadeStrategy: 'quick_cut',
          crossfadeDuration: 8,
          confidence: 0.3
        }
      };
    }
    
    // Select random from candidates
    const fallback = candidates[Math.floor(Math.random() * candidates.length)];
    
    return {
      track: fallback,
      score: { total: 0.4, fallback: true },
      mixInstructions: {
        crossfadeStrategy: 'smooth_blend',
        crossfadeDuration: this.settings.crossfadeDuration,
        confidence: 0.4
      }
    };
  }

  /**
   * Schedule the next transition based on current track length and mix point
   */
  scheduleNextTransition() {
    if (!this.currentTrack || !this.nextTrack) return;
    
    const mixOutPoint = this.currentTrack.cueOut || (this.currentTrack.duration - 30);
    const crossfadeDuration = this.nextTrack.mixInstructions.crossfadeDuration || 16;
    
    // Start crossfade early enough to complete before mix out point
    const transitionStartTime = Math.max(0, mixOutPoint - crossfadeDuration);
    
    // Convert to milliseconds from track start
    const delayMs = transitionStartTime * 1000;
    
    if (this.transitionTimer) {
      clearTimeout(this.transitionTimer);
    }
    
    this.transitionTimer = setTimeout(() => {
      // Notify the player that it's time to start the transition
      this.onTransitionReady?.(this.nextTrack);
    }, delayMs);
    
    console.log(`[Auto DJ] Transition scheduled in ${(delayMs / 1000).toFixed(1)} seconds`);
  }

  /**
   * Set callback for when transition is ready
   */
  onTransitionReady(callback) {
    this.onTransitionReady = callback;
  }

  /**
   * Get detailed analysis of upcoming transition
   */
  getTransitionAnalysis() {
    if (!this.currentTrack || !this.nextTrack) {
      return null;
    }
    
    const current = this.currentTrack;
    const next = this.nextTrack.track;
    const score = this.nextTrack.score;
    const instructions = this.nextTrack.mixInstructions;
    
    return {
      current: {
        title: current.title,
        artist: current.artist,
        bpm: current.bpm,
        key: current.key,
        camelotKey: current.camelotKey,
        energy: current.energy
      },
      next: {
        title: next.title,
        artist: next.artist,
        bpm: next.bpm,
        key: next.key,
        camelotKey: next.camelotKey,
        energy: next.energy
      },
      compatibility: {
        total: score.total,
        harmonic: score.harmonic,
        energy: score.energy,
        bpm: score.bpm,
        breakdown: score.breakdown
      },
      mixInstructions: instructions,
      advice: instructions.harmonic.advice
    };
  }
}

export default AutoDJController;

