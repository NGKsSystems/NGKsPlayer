/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: lighting-integration-example.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player Lighting Integration Example
 * Add this to your main NGKs Player file to enable lighting control
 */

import { NGKsLightingSystem, initializeNGKsLighting, autoInitializeLighting } from './lighting/NGKsLightingSystem.js';

// Example 1: Manual initialization with existing NGKs Player instance
async function addLightingToNGKsPlayer(ngksPlayerInstance) {
  console.log('🎭 Adding lighting control to NGKs Player...');
  
  try {
    // Initialize lighting system
    const lightingSystem = await initializeNGKsLighting(ngksPlayerInstance);
    
    if (lightingSystem) {
      // Add lighting system to NGKs Player instance
      ngksPlayerInstance.lighting = lightingSystem;
      
      // Add manual control methods to NGKs Player
      ngksPlayerInstance.lightingBlackout = () => lightingSystem.blackout();
      ngksPlayerInstance.lightingStrobe = () => lightingSystem.startStrobe();
      ngksPlayerInstance.lightingRainbow = () => lightingSystem.startRainbow();
      ngksPlayerInstance.lightingSetColor = (r, g, b, intensity) => lightingSystem.setColor(r, g, b, intensity);
      
      console.log('✅ Lighting control added to NGKs Player');
      console.log('📖 Available methods:');
      console.log('  - ngksPlayer.lightingBlackout()');
      console.log('  - ngksPlayer.lightingStrobe()');
      console.log('  - ngksPlayer.lightingRainbow()');
      console.log('  - ngksPlayer.lightingSetColor(r, g, b, intensity)');
      console.log('  - ngksPlayer.lighting.enableBeatSync(true/false)');
      
      return lightingSystem;
    }
  } catch (error) {
    console.error('❌ Failed to add lighting to NGKs Player:', error);
    return null;
  }
}

// Example 2: Auto-initialization (tries to find NGKs Player automatically)
async function autoAddLighting() {
  console.log('🔍 Auto-detecting NGKs Player for lighting integration...');
  
  const lightingSystem = await autoInitializeLighting();
  
  if (lightingSystem) {
    console.log('✅ Lighting system auto-initialized');
    return lightingSystem;
  } else {
    console.log('❌ Could not auto-initialize lighting system');
    return null;
  }
}

// Example 3: Integration with existing NGKs Player main file
class NGKsPlayerWithLighting {
  constructor() {
    // Your existing NGKs Player initialization
    this.audioContext = null;
    this.audioEngine = null;
    this.currentTrack = null;
    this.isPlaying = false;
    
    // Lighting system
    this.lighting = null;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Initialize audio system first (your existing code)
      await this.initializeAudioSystem();
      
      // Initialize lighting system
      await this.initializeLightingSystem();
      
      console.log('🎉 NGKs Player with Lighting initialized');
    } catch (error) {
      console.error('❌ Failed to initialize NGKs Player with Lighting:', error);
    }
  }
  
  async initializeAudioSystem() {
    // Your existing audio initialization code
    console.log('🎵 Initializing audio system...');
    // ... your code here ...
  }
  
  async initializeLightingSystem() {
    console.log('🎭 Initializing lighting system...');
    
    this.lighting = new NGKsLightingSystem(this);
    const success = await this.lighting.initialize();
    
    if (success) {
      console.log('✅ Lighting system ready');
      
      // Connect lighting to audio events
      this.setupLightingEvents();
    } else {
      console.log('⚠️ Lighting system initialization failed - continuing without lighting');
    }
  }
  
  setupLightingEvents() {
    // Connect playback events to lighting
    this.on('play', () => {
      if (this.lighting) {
        console.log('▶️ Playback started - activating lighting');
        this.lighting.enableBeatSync(true);
      }
    });
    
    this.on('pause', () => {
      if (this.lighting) {
        console.log('⏸️ Playback paused - dimming lighting');
        this.lighting.setColor(255, 255, 255, 0.3);
      }
    });
    
    this.on('stop', () => {
      if (this.lighting) {
        console.log('⏹️ Playback stopped - blackout');
        this.lighting.blackout();
      }
    });
  }
  
  // Enhanced playback methods with lighting integration
  async play() {
    // Your existing play logic
    this.isPlaying = true;
    
    // Emit event for lighting
    this.emit('play', { track: this.currentTrack });
    
    console.log('▶️ Playing with lighting sync');
  }
  
  pause() {
    // Your existing pause logic
    this.isPlaying = false;
    
    // Emit event for lighting
    this.emit('pause', { track: this.currentTrack });
    
    console.log('⏸️ Paused with lighting sync');
  }
  
  stop() {
    // Your existing stop logic
    this.isPlaying = false;
    this.currentTrack = null;
    
    // Emit event for lighting
    this.emit('stop');
    
    console.log('⏹️ Stopped with lighting sync');
  }
  
  // Manual lighting controls
  lightingBlackout() {
    if (this.lighting) {
      this.lighting.blackout();
    }
  }
  
  lightingStrobe() {
    if (this.lighting) {
      this.lighting.startStrobe();
    }
  }
  
  lightingRainbow() {
    if (this.lighting) {
      this.lighting.startRainbow();
    }
  }
  
  lightingSetColor(r, g, b, intensity = 1.0) {
    if (this.lighting) {
      this.lighting.setColor(r, g, b, intensity);
    }
  }
  
  // Event emitter methods (simple implementation)
  on(event, callback) {
    if (!this._events) this._events = {};
    if (!this._events[event]) this._events[event] = [];
    this._events[event].push(callback);
  }
  
  emit(event, data) {
    if (!this._events || !this._events[event]) return;
    this._events[event].forEach(callback => callback(data));
  }
}

// Example 4: Simple HTML integration
function createLightingButton() {
  const button = document.createElement('button');
  button.textContent = '🎭 Add Lighting';
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4CAF50;
    color: white;
    border: none;
    padding: 12px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    z-index: 1000;
  `;
  
  button.addEventListener('click', async () => {
    button.textContent = '⏳ Initializing...';
    button.disabled = true;
    
    const lightingSystem = await autoAddLighting();
    
    if (lightingSystem) {
      button.textContent = '✅ Lighting Active';
      button.style.background = '#2196F3';
      
      // Add some manual control buttons
      addManualControlButtons(lightingSystem);
    } else {
      button.textContent = '❌ Lighting Failed';
      button.style.background = '#f44336';
      button.disabled = false;
    }
  });
  
  document.body.appendChild(button);
  return button;
}

function addManualControlButtons(lightingSystem) {
  const controlsContainer = document.createElement('div');
  controlsContainer.style.cssText = `
    position: fixed;
    top: 70px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 1000;
  `;
  
  const buttons = [
    { text: '⚫ Blackout', action: () => lightingSystem.blackout() },
    { text: '⚡ Strobe', action: () => lightingSystem.startStrobe() },
    { text: '🌈 Rainbow', action: () => lightingSystem.startRainbow() },
    { text: '🔴 Red', action: () => lightingSystem.setColor(255, 0, 0) },
    { text: '🟢 Green', action: () => lightingSystem.setColor(0, 255, 0) },
    { text: '🔵 Blue', action: () => lightingSystem.setColor(0, 0, 255) },
    { text: '⚪ White', action: () => lightingSystem.setColor(255, 255, 255) }
  ];
  
  buttons.forEach(({ text, action }) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.style.cssText = `
      background: #333;
      color: white;
      border: 1px solid #555;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
    
    button.addEventListener('click', action);
    button.addEventListener('mouseenter', () => {
      button.style.background = '#4CAF50';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = '#333';
    });
    
    controlsContainer.appendChild(button);
  });
  
  document.body.appendChild(controlsContainer);
}

// Example 5: Console commands for testing
if (typeof window !== 'undefined') {
  // Add global functions for easy testing
  window.initNGKsLighting = autoAddLighting;
  window.createLightingButton = createLightingButton;
  
  console.log('🎭 NGKs Lighting Integration loaded!');
  console.log('📖 Try these commands:');
  console.log('  - await initNGKsLighting() // Auto-initialize lighting');
  console.log('  - createLightingButton() // Add lighting button to page');
}

export {
  addLightingToNGKsPlayer,
  autoAddLighting,
  NGKsPlayerWithLighting,
  createLightingButton
};
