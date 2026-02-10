/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: NGKsLightingSystem.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player Lighting System Main Component
 * Easy integration with existing NGKs Player interface
 */

import LightingIntegration from './LightingIntegration.js';

export class NGKsLightingSystem {
  constructor(ngksPlayerInstance) {
    this.ngksPlayer = ngksPlayerInstance;
    this.lightingIntegration = new LightingIntegration();
    this.initialized = false;
    this.panelElement = null;
    
    console.log('ðŸŽ­ NGKs Lighting System created');
  }
  
  /**
   * Initialize the lighting system
   */
  async initialize() {
    if (this.initialized) {
      console.log('âš ï¸ Lighting system already initialized');
      return true;
    }
    
    try {
      // Get audio context from NGKs Player
      const audioContext = this.getAudioContext();
      
      if (!audioContext) {
        throw new Error('No audio context available from NGKs Player');
      }
      
      // Initialize lighting integration
      const success = await this.lightingIntegration.initialize(audioContext);
      
      if (success) {
        this.initialized = true;
        
        // Connect to NGKs Player's audio analysis
        this.connectToNGKsAudio();
        
        // Create and add lighting panel to UI
        this.addLightingPanelToUI();
        
        console.log('âœ… NGKs Lighting System initialized successfully');
        return true;
      } else {
        throw new Error('Failed to initialize lighting integration');
      }
    } catch (error) {
      console.error('âŒ Failed to initialize NGKs Lighting System:', error);
      return false;
    }
  }
  
  /**
   * Get audio context from NGKs Player
   */
  getAudioContext() {
    // Try different ways to get audio context from NGKs Player
    if (this.ngksPlayer) {
      // Method 1: Direct audio context property
      if (this.ngksPlayer.audioContext) {
        return this.ngksPlayer.audioContext;
      }
      
      // Method 2: Audio engine audio context
      if (this.ngksPlayer.audioEngine && this.ngksPlayer.audioEngine.audioContext) {
        return this.ngksPlayer.audioEngine.audioContext;
      }
      
      // Method 3: Player audio context
      if (this.ngksPlayer.player && this.ngksPlayer.player.audioContext) {
        return this.ngksPlayer.player.audioContext;
      }
    }
    
    // Method 4: Global audio context
    if (window.audioContext) {
      return window.audioContext;
    }
    
    // Method 5: Create new audio context
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      return new AudioContext();
    } catch (error) {
      console.error('Failed to create audio context:', error);
      return null;
    }
  }
  
  /**
   * Connect to NGKs Player's audio analysis system
   */
  connectToNGKsAudio() {
    if (!this.ngksPlayer) return;
    
    // Try to connect to existing audio analysis
    if (this.ngksPlayer.audioEngine) {
      this.lightingIntegration.connectToProfessionalEngine(this.ngksPlayer.audioEngine);
    }
    
    // Listen for track changes
    if (this.ngksPlayer.on) {
      this.ngksPlayer.on('trackLoaded', (track) => {
        this.onTrackLoaded(track);
      });
      
      this.ngksPlayer.on('trackAnalyzed', (analysis) => {
        this.onTrackAnalyzed(analysis);
      });
      
      this.ngksPlayer.on('playback', (state) => {
        this.onPlaybackStateChange(state);
      });
    }
    
    // Try to get current audio source
    const audioSource = this.getCurrentAudioSource();
    if (audioSource) {
      this.lightingIntegration.connectToAudioSource(audioSource);
    }
  }
  
  /**
   * Get current audio source from NGKs Player
   */
  getCurrentAudioSource() {
    if (!this.ngksPlayer) return null;
    
    // Try different ways to get current audio source
    if (this.ngksPlayer.audioSource) {
      return this.ngksPlayer.audioSource;
    }
    
    if (this.ngksPlayer.currentTrack && this.ngksPlayer.currentTrack.audioSource) {
      return this.ngksPlayer.currentTrack.audioSource;
    }
    
    if (this.ngksPlayer.player && this.ngksPlayer.player.audioSource) {
      return this.ngksPlayer.player.audioSource;
    }
    
    return null;
  }
  
  /**
   * Handle track loaded event
   */
  onTrackLoaded(track) {
    console.log('ðŸŽµ Track loaded for lighting:', track.name || 'Unknown');
    
    // Connect to new audio source if available
    if (track.audioSource) {
      this.lightingIntegration.connectToAudioSource(track.audioSource);
    }
    
    // Reset lighting to default state
    const lightingController = this.lightingIntegration.getLightingController();
    if (lightingController) {
      lightingController.fadeToColor({ r: 255, g: 255, b: 255 }, 1000);
    }
  }
  
  /**
   * Handle track analysis results
   */
  onTrackAnalyzed(analysis) {
    console.log('ðŸ“Š Track analysis received for lighting:', analysis);
    
    // Use analysis data for lighting
    if (analysis.bpm) {
      this.lightingIntegration.onTempoChange(analysis.bpm, analysis.bpmConfidence || 0.8);
    }
    
    if (analysis.key) {
      this.lightingIntegration.onKeyChange(analysis.key);
    }
    
    if (analysis.energy) {
      this.lightingIntegration.onEnergyChange(analysis.energy);
    }
  }
  
  /**
   * Handle playback state changes
   */
  onPlaybackStateChange(state) {
    const lightingController = this.lightingIntegration.getLightingController();
    if (!lightingController) return;
    
    switch (state.type) {
      case 'play':
        console.log('â–¶ï¸ Playback started - enabling lighting');
        this.lightingIntegration.enableAutoMode();
        break;
        
      case 'pause':
        console.log('â¸ï¸ Playback paused - dimming lights');
        lightingController.dimTo(0.3, 1000);
        break;
        
      case 'stop':
        console.log('â¹ï¸ Playback stopped - blackout');
        lightingController.fadeOut(2000);
        break;
    }
  }
  
  /**
   * Add lighting panel to NGKs Player UI
   */
  addLightingPanelToUI() {
    // Create the lighting panel
    this.panelElement = this.lightingIntegration.createLightingPanel();
    
    // Try to find a good place to add it in the UI
    const targetContainer = this.findUIContainer();
    
    if (targetContainer) {
      targetContainer.appendChild(this.panelElement);
      console.log('ðŸŽ¨ Lighting panel added to UI');
    } else {
      // Fallback: add to body
      document.body.appendChild(this.panelElement);
      console.log('ðŸŽ¨ Lighting panel added to body (no container found)');
    }
    
    // Start updating display
    this.startDisplayUpdates();
  }
  
  /**
   * Find appropriate UI container for lighting panel
   */
  findUIContainer() {
    // Try to find NGKs Player's control panel or sidebar
    const selectors = [
      '.control-panel',
      '.sidebar',
      '.controls',
      '.player-controls',
      '.ngks-controls',
      '.audio-controls',
      '#controls',
      '#sidebar',
      '.main-controls'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    
    // Try to find any container that looks suitable
    const containers = document.querySelectorAll('div[class*="control"], div[class*="panel"], div[class*="sidebar"]');
    if (containers.length > 0) {
      return containers[0];
    }
    
    return null;
  }
  
  /**
   * Start updating the lighting display
   */
  startDisplayUpdates() {
    setInterval(() => {
      this.lightingIntegration.updateDisplay();
    }, 100); // Update 10 times per second
  }
  
  /**
   * Manual control methods for external use
   */
  
  blackout() {
    const controller = this.lightingIntegration.getLightingController();
    if (controller) controller.blackout();
  }
  
  startStrobe() {
    const controller = this.lightingIntegration.getLightingController();
    if (controller) controller.startEffect('strobe');
  }
  
  startRainbow() {
    const controller = this.lightingIntegration.getLightingController();
    if (controller) controller.startEffect('rainbow');
  }
  
  setColor(r, g, b, intensity = 1.0) {
    const controller = this.lightingIntegration.getLightingController();
    if (controller) {
      controller.setAllFixtures('color', { r, g, b });
      controller.setAllFixtures('intensity', intensity);
    }
  }
  
  enableBeatSync(enabled = true) {
    this.lightingIntegration.beatSyncEnabled = enabled;
  }
  
  /**
   * Get lighting system status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      ...this.lightingIntegration.getStatus()
    };
  }
  
  /**
   * Shutdown lighting system
   */
  shutdown() {
    if (this.panelElement && this.panelElement.parentNode) {
      this.panelElement.parentNode.removeChild(this.panelElement);
    }
    
    this.lightingIntegration.disconnect();
    this.initialized = false;
    
    console.log('ðŸ”Œ NGKs Lighting System shutdown');
  }
}

/**
 * Easy initialization function for NGKs Player
 * Usage: const lighting = await initializeNGKsLighting(ngksPlayerInstance);
 */
export async function initializeNGKsLighting(ngksPlayerInstance) {
  const lightingSystem = new NGKsLightingSystem(ngksPlayerInstance);
  const success = await lightingSystem.initialize();
  
  if (success) {
    console.log('ðŸŽ‰ NGKs Lighting System ready!');
    return lightingSystem;
  } else {
    console.error('âŒ Failed to initialize NGKs Lighting System');
    return null;
  }
}

/**
 * Auto-detect and initialize lighting system
 * Tries to find NGKs Player instance automatically
 */
export async function autoInitializeLighting() {
  // Try to find NGKs Player instance
  let ngksPlayer = null;
  
  // Check common global variables
  if (window.ngksPlayer) {
    ngksPlayer = window.ngksPlayer;
  } else if (window.player) {
    ngksPlayer = window.player;
  } else if (window.audioPlayer) {
    ngksPlayer = window.audioPlayer;
  }
  
  if (ngksPlayer) {
    return await initializeNGKsLighting(ngksPlayer);
  } else {
    console.warn('âš ï¸ Could not find NGKs Player instance for auto-initialization');
    return null;
  }
}

export default NGKsLightingSystem;
