/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LightingIntegration.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player Lighting Integration
 * Connects lighting controller to audio analysis system
 * Provides real-time beat-synchronized lighting effects
 */

import { LightingController } from './LightingController.js';
import { TempoAnalyzer } from '../components/audio/TempoAnalyzer.js';

export class LightingIntegration {
  constructor() {
    this.lightingController = null;
    this.tempoAnalyzer = null;
    this.audioContext = null;
    this.isConnected = false;
    this.currentAudioSource = null;
    
    // Beat synchronization settings
    this.beatSyncEnabled = true;
    this.effectSyncEnabled = true;
    this.colorSyncEnabled = true;
    
    // Current audio analysis data
    this.currentBPM = 120;
    this.currentKey = 'C major';
    this.currentEnergy = 0.5;
    this.beatPhase = 0;
    
    // Effect mappings for different energy levels
    this.energyEffects = {
      low: ['color-wash', 'fade'],
      medium: ['rainbow', 'chase'],
      high: ['strobe', 'flash'],
      extreme: ['beat-strobe', 'rapid-chase']
    };
    
    // Color mappings for musical keys
    this.keyColors = {
      'C major': { r: 255, g: 255, b: 255 },    // White
      'G major': { r: 0, g: 255, b: 0 },        // Green
      'D major': { r: 255, g: 165, b: 0 },      // Orange
      'A major': { r: 255, g: 0, b: 0 },        // Red
      'E major': { r: 255, g: 255, b: 0 },      // Yellow
      'B major': { r: 255, g: 20, b: 147 },     // Deep Pink
      'F# major': { r: 138, g: 43, b: 226 },    // Blue Violet
      'C# major': { r: 75, g: 0, b: 130 },      // Indigo
      'F major': { r: 0, g: 255, b: 255 },      // Cyan
      'Bb major': { r: 0, g: 0, b: 255 },       // Blue
      'Eb major': { r: 128, g: 0, b: 128 },     // Purple
      'Ab major': { r: 255, g: 192, b: 203 },   // Pink
      // Minor keys - darker variants
      'A minor': { r: 139, g: 0, b: 0 },        // Dark Red
      'E minor': { r: 139, g: 139, b: 0 },      // Dark Yellow
      'B minor': { r: 139, g: 10, b: 80 },      // Dark Pink
      'F# minor': { r: 72, g: 61, b: 139 },     // Dark Slate Blue
      'C# minor': { r: 25, g: 25, b: 112 },     // Midnight Blue
      'G# minor': { r: 85, g: 107, b: 47 },     // Dark Olive Green
      'D# minor': { r: 105, g: 105, b: 105 },   // Dim Gray
      'Bb minor': { r: 47, g: 79, b: 79 },      // Dark Slate Gray
      'F minor': { r: 0, g: 139, b: 139 },      // Dark Cyan
      'C minor': { r: 0, g: 0, b: 139 },        // Dark Blue
      'G minor': { r: 128, g: 0, b: 128 },      // Purple
      'D minor': { r: 139, g: 69, b: 19 }       // Saddle Brown
    };
    
    console.log('ðŸŽ­ Lighting integration initialized');
  }
  
  /**
   * Initialize lighting integration with audio context
   */
  async initialize(audioContext) {
    try {
      this.audioContext = audioContext;
      
      // Initialize lighting controller
      this.lightingController = new LightingController();
      await this.lightingController.initialize();
      
      // Initialize tempo analyzer
      this.tempoAnalyzer = new TempoAnalyzer(audioContext);
      
      // Set up event listeners for audio analysis
      this.setupAudioAnalysisListeners();
      
      console.log('ðŸŽ¯ Lighting integration initialized successfully');
      return true;
    } catch (error) {
      console.error('âŒ Failed to initialize lighting integration:', error);
      return false;
    }
  }
  
  /**
   * Connect to current audio source for lighting sync
   */
  async connectToAudioSource(audioSource) {
    if (!this.lightingController || !this.tempoAnalyzer) {
      throw new Error('Lighting integration not initialized');
    }
    
    try {
      this.currentAudioSource = audioSource;
      
      // Connect tempo analyzer to audio source
      if (audioSource && audioSource.connect) {
        audioSource.connect(this.tempoAnalyzer.getAnalyserNode());
        this.tempoAnalyzer.startRealTimeAnalysis();
      }
      
      // Connect lighting controller to tempo analyzer
      this.lightingController.connectAudioAnalyzer(
        this.tempoAnalyzer,
        this.tempoAnalyzer
      );
      
      this.isConnected = true;
      console.log('ðŸŽµ Audio source connected to lighting system');
      
      return true;
    } catch (error) {
      console.error('âŒ Failed to connect audio source:', error);
      return false;
    }
  }
  
  /**
   * Set up event listeners for audio analysis data
   */
  setupAudioAnalysisListeners() {
    if (!this.tempoAnalyzer) return;
    
    // Listen for tempo changes
    this.tempoAnalyzer.on('tempo', (bpm, confidence) => {
      this.currentBPM = bpm;
      this.onTempoChange(bpm, confidence);
    });
    
    // Listen for beat events
    this.tempoAnalyzer.on('beat', (beat) => {
      this.beatPhase = beat.phase || 0;
      this.onBeat(beat);
    });
    
    // Listen for energy changes
    this.tempoAnalyzer.on('energy', (energy) => {
      this.currentEnergy = energy;
      this.onEnergyChange(energy);
    });
    
    // Listen for key changes
    this.tempoAnalyzer.on('key', (key) => {
      this.currentKey = key;
      this.onKeyChange(key);
    });
  }
  
  /**
   * Handle tempo changes
   */
  onTempoChange(bpm, confidence) {
    if (!this.beatSyncEnabled || !this.lightingController) return;
    
    console.log(`ðŸŽµ Tempo: ${bpm} BPM (confidence: ${(confidence * 100).toFixed(1)}%)`);
    
    // Adjust effect speeds based on tempo
    if (bpm < 100) {
      // Slow songs - smooth, gentle effects
      this.lightingController.setEffectSpeed(0.5);
      this.lightingController.startEffect('fade', { duration: 4000 });
    } else if (bpm < 140) {
      // Medium tempo - normal effects
      this.lightingController.setEffectSpeed(1.0);
      this.lightingController.startEffect('color-wash', { duration: 2000 });
    } else {
      // Fast songs - rapid effects
      this.lightingController.setEffectSpeed(1.5);
      this.lightingController.startEffect('chase', { duration: 1000 });
    }
  }
  
  /**
   * Handle beat events
   */
  onBeat(beat) {
    if (!this.beatSyncEnabled || !this.lightingController) return;
    
    const intensity = beat.strength || 0.5;
    
    // Flash on strong beats
    if (intensity > 0.7) {
      this.lightingController.flash({ 
        color: this.getCurrentKeyColor(),
        intensity: intensity,
        duration: 100
      });
    }
    
    // Update beat-synchronized strobing
    if (this.currentEnergy > 0.8) {
      this.lightingController.beatStrobe(this.currentBPM);
    }
  }
  
  /**
   * Handle energy level changes
   */
  onEnergyChange(energy) {
    if (!this.effectSyncEnabled || !this.lightingController) return;
    
    console.log(`âš¡ Energy: ${(energy * 100).toFixed(1)}%`);
    
    // Select effect based on energy level
    let effectType;
    if (energy < 0.3) {
      effectType = this.energyEffects.low[Math.floor(Math.random() * this.energyEffects.low.length)];
    } else if (energy < 0.6) {
      effectType = this.energyEffects.medium[Math.floor(Math.random() * this.energyEffects.medium.length)];
    } else if (energy < 0.8) {
      effectType = this.energyEffects.high[Math.floor(Math.random() * this.energyEffects.high.length)];
    } else {
      effectType = this.energyEffects.extreme[Math.floor(Math.random() * this.energyEffects.extreme.length)];
    }
    
    // Start the selected effect
    this.lightingController.startEffect(effectType, {
      intensity: energy,
      speed: this.currentBPM / 120 // Normalize to 120 BPM
    });
  }
  
  /**
   * Handle musical key changes
   */
  onKeyChange(key) {
    if (!this.colorSyncEnabled || !this.lightingController) return;
    
    console.log(`ðŸŽ¼ Key: ${key}`);
    
    const keyColor = this.getCurrentKeyColor();
    
    // Gradually transition to key-based color scheme
    this.lightingController.fadeToColor(keyColor, 2000);
    
    // Save as a scene for this key
    this.lightingController.saveScene(`Key: ${key}`, {
      color: keyColor,
      intensity: 0.8
    });
  }
  
  /**
   * Get color associated with current musical key
   */
  getCurrentKeyColor() {
    return this.keyColors[this.currentKey] || { r: 255, g: 255, b: 255 };
  }
  
  /**
   * Integrate with NGKs Player UI
   */
  createLightingPanel() {
    const panel = document.createElement('div');
    panel.className = 'lighting-panel';
    panel.innerHTML = `
      <div class="lighting-header">
        <h3>ðŸŽ­ Lighting Control</h3>
        <div class="lighting-status">
          <span class="status-indicator ${this.isConnected ? 'connected' : 'disconnected'}"></span>
          <span>${this.isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div class="lighting-controls">
        <div class="sync-controls">
          <label>
            <input type="checkbox" id="beat-sync" ${this.beatSyncEnabled ? 'checked' : ''}>
            Beat Sync
          </label>
          <label>
            <input type="checkbox" id="effect-sync" ${this.effectSyncEnabled ? 'checked' : ''}>
            Effect Sync
          </label>
          <label>
            <input type="checkbox" id="color-sync" ${this.colorSyncEnabled ? 'checked' : ''}>
            Color Sync
          </label>
        </div>
        
        <div class="audio-info">
          <div class="info-item">
            <span class="label">BPM:</span>
            <span class="value" id="current-bpm">${this.currentBPM}</span>
          </div>
          <div class="info-item">
            <span class="label">Key:</span>
            <span class="value" id="current-key">${this.currentKey}</span>
          </div>
          <div class="info-item">
            <span class="label">Energy:</span>
            <div class="energy-bar">
              <div class="energy-fill" style="width: ${this.currentEnergy * 100}%"></div>
            </div>
          </div>
        </div>
        
        <div class="manual-controls">
          <button id="blackout">Blackout</button>
          <button id="strobe">Strobe</button>
          <button id="rainbow">Rainbow</button>
          <button id="auto-mode">Auto Mode</button>
        </div>
      </div>
    `;
    
    // Add event listeners
    this.setupPanelEventListeners(panel);
    
    return panel;
  }
  
  /**
   * Set up event listeners for the lighting panel
   */
  setupPanelEventListeners(panel) {
    // Sync control toggles
    panel.querySelector('#beat-sync').addEventListener('change', (e) => {
      this.beatSyncEnabled = e.target.checked;
    });
    
    panel.querySelector('#effect-sync').addEventListener('change', (e) => {
      this.effectSyncEnabled = e.target.checked;
    });
    
    panel.querySelector('#color-sync').addEventListener('change', (e) => {
      this.colorSyncEnabled = e.target.checked;
    });
    
    // Manual control buttons
    panel.querySelector('#blackout').addEventListener('click', () => {
      this.lightingController.blackout();
    });
    
    panel.querySelector('#strobe').addEventListener('click', () => {
      this.lightingController.startEffect('strobe', { duration: 5000 });
    });
    
    panel.querySelector('#rainbow').addEventListener('click', () => {
      this.lightingController.startEffect('rainbow', { duration: 10000 });
    });
    
    panel.querySelector('#auto-mode').addEventListener('click', () => {
      this.enableAutoMode();
    });
  }
  
  /**
   * Enable automatic lighting mode based on audio analysis
   */
  enableAutoMode() {
    if (!this.lightingController) return;
    
    console.log('ðŸ¤– Auto lighting mode enabled');
    
    // Start with key-based color
    const keyColor = this.getCurrentKeyColor();
    this.lightingController.fadeToColor(keyColor, 1000);
    
    // Enable all sync features
    this.beatSyncEnabled = true;
    this.effectSyncEnabled = true;
    this.colorSyncEnabled = true;
    
    // Start appropriate effect based on current energy
    this.onEnergyChange(this.currentEnergy);
  }
  
  /**
   * Update real-time display values
   */
  updateDisplay() {
    const bpmElement = document.getElementById('current-bpm');
    const keyElement = document.getElementById('current-key');
    const energyFill = document.querySelector('.energy-fill');
    
    if (bpmElement) bpmElement.textContent = this.currentBPM;
    if (keyElement) keyElement.textContent = this.currentKey;
    if (energyFill) energyFill.style.width = `${this.currentEnergy * 100}%`;
  }
  
  /**
   * Connect to NGKs Player's professional audio engine
   */
  async connectToProfessionalEngine(audioEngine) {
    if (!audioEngine) {
      console.warn('âš ï¸ No audio engine provided');
      return false;
    }
    
    try {
      // Listen for audio analysis results
      audioEngine.on('analysis', (analysis) => {
        if (analysis.bpm) {
          this.onTempoChange(analysis.bpm, analysis.bpmConfidence || 0.8);
        }
        
        if (analysis.key) {
          this.onKeyChange(analysis.key);
        }
        
        if (analysis.energy) {
          this.onEnergyChange(analysis.energy);
        }
        
        if (analysis.beat) {
          this.onBeat(analysis.beat);
        }
      });
      
      console.log('ðŸŽ¯ Connected to NGKs Player professional audio engine');
      return true;
    } catch (error) {
      console.error('âŒ Failed to connect to professional audio engine:', error);
      return false;
    }
  }
  
  /**
   * Disconnect lighting system
   */
  disconnect() {
    if (this.tempoAnalyzer) {
      this.tempoAnalyzer.stopRealTimeAnalysis();
      this.tempoAnalyzer.disconnect();
    }
    
    if (this.lightingController) {
      this.lightingController.disconnect();
    }
    
    this.isConnected = false;
    console.log('ðŸ”Œ Lighting integration disconnected');
  }
  
  /**
   * Get lighting controller instance
   */
  getLightingController() {
    return this.lightingController;
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      connected: this.isConnected,
      bpm: this.currentBPM,
      key: this.currentKey,
      energy: this.currentEnergy,
      beatSync: this.beatSyncEnabled,
      effectSync: this.effectSyncEnabled,
      colorSync: this.colorSyncEnabled,
      fixtures: this.lightingController ? this.lightingController.getFixtureCount() : 0
    };
  }
}

// CSS styles for the lighting panel
const lightingPanelStyles = `
.lighting-panel {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 16px;
  margin: 8px;
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.lighting-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  border-bottom: 1px solid #333;
  padding-bottom: 8px;
}

.lighting-header h3 {
  margin: 0;
  color: #4CAF50;
}

.lighting-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f44336;
}

.status-indicator.connected {
  background: #4CAF50;
}

.sync-controls {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.sync-controls label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.audio-info {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  padding: 8px;
  background: #2a2a2a;
  border-radius: 4px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 12px;
  color: #888;
}

.info-item .value {
  font-weight: bold;
  color: #4CAF50;
}

.energy-bar {
  width: 60px;
  height: 8px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
}

.energy-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #FFC107, #FF5722);
  transition: width 0.3s ease;
}

.manual-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.manual-controls button {
  background: #333;
  border: 1px solid #555;
  color: #fff;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.3s ease;
}

.manual-controls button:hover {
  background: #4CAF50;
}
`;

// Inject CSS if not already present
if (!document.getElementById('lighting-panel-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'lighting-panel-styles';
  styleSheet.textContent = lightingPanelStyles;
  document.head.appendChild(styleSheet);
}

export default LightingIntegration;
