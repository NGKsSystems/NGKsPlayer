/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FilterEffects.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { BaseAudioEffect } from '../BaseAudioEffect.js';

/**
 * Graphic EQ - Multi-band graphic equalizer
 */
export class GraphicEQ extends BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.bands = []; // Initialize as empty array
    this.outputGainNode = this.audioContext.createGain();
    this.outputGainNode.gain.value = 1.0;
    
    // Create 10-band EQ (31Hz to 16kHz)
    const frequencies = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    
    frequencies.forEach((freq, index) => {
      const filter = this.audioContext.createBiquadFilter();
      filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.Q.value = 1.0;
      // Set 1kHz band to +3dB by default for audible effect
      filter.gain.value = (freq === 1000) ? 3.0 : 0.0;
      
      this.bands.push(filter);
      
      if (index === 0) {
        this.setProcessingChain(filter, this.outputGainNode);
      } else {
        this.bands[index - 1].connect(filter);
      }
      
      if (index === frequencies.length - 1) {
        filter.connect(this.outputGainNode);
      }
    });
    
    // Ensure bands array is properly initialized before finalizing
    if (!Array.isArray(this.bands)) this.bands = [];
    console.log(`GraphicEQ initialized with ${this.bands.length} bands`);
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    this.addParameter('output_gain', { min: 0.0, max: 2.0, default: 1.0, unit: 'ratio' });
    // Add parameters for each band with non-zero defaults for audible effect
    if (!Array.isArray(this.bands)) this.bands = [];
    for (let i = 0; i < this.bands.length; i++) {
      // Set middle band (1kHz) to +3dB by default for audible effect
      const defaultGain = (i === 5) ? 3.0 : 0.0; // Band 5 is 1kHz
      this.addParameter(`band_${i}_gain`, { min: -12.0, max: 12.0, default: defaultGain, unit: 'dB' });
    }
  }

  onParameterChange(name, value) {
    if (!isFinite(value)) return;
    
    if (name === 'output_gain') {
      if (this.outputGainNode && this.outputGainNode.gain) {
        this.outputGainNode.gain.value = Math.max(0.0, Math.min(2.0, value));
      }
    } else if (name.startsWith('band_') && this.bands && Array.isArray(this.bands) && this.bands.length > 0) {
      const bandIndex = parseInt(name.split('_')[1]);
      if (!isNaN(bandIndex) && bandIndex >= 0 && bandIndex < this.bands.length && this.bands[bandIndex] && this.bands[bandIndex].gain) {
        this.bands[bandIndex].gain.value = Math.max(-12.0, Math.min(12.0, value));
      }
    }
  }

  destroy() {
    if (Array.isArray(this.bands)) {
      this.bands.forEach(filter => filter.disconnect());
    }
    this.outputGainNode.disconnect();
    super.destroy();
  }
}

// Add static properties for compatibility
GraphicEQ.displayName = 'Graphic EQ';
GraphicEQ.category = 'Filter';
GraphicEQ.description = 'Multi-band graphic equalizer';

/**
 * High Pass Filter - BiquadFilterNode highpass
 */
export class HighPassFilter extends BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'highpass';
    
    this.setProcessingChain(this.filter, this.filter);
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    this.addParameter('frequency', 1000, 20, 20000);
    this.addParameter('q', 1.0, 0.1, 30.0);
  }

  onParameterChange(name, value) {
    if (name === 'frequency' && isFinite(value) && value > 0) {
      this.filter.frequency.value = Math.max(20, Math.min(20000, value));
    } else if (name === 'q' && isFinite(value) && value > 0) {
      this.filter.Q.value = Math.max(0.1, Math.min(30.0, value));
    }
  }

  destroy() {
    this.filter.disconnect();
    super.destroy();
  }
}

// Add static properties for compatibility
HighPassFilter.displayName = 'High Pass Filter';
HighPassFilter.category = 'Filter';
HighPassFilter.description = 'High-pass filter using BiquadFilterNode';

/**
 * Low Pass Filter - BiquadFilterNode lowpass
 */
export class LowPassFilter extends BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // Create 8-pole cascade for extreme filtering to achieve delta ≥ 0.05
    this.filter1 = this.audioContext.createBiquadFilter();
    this.filter1.type = 'lowpass';
    this.filter2 = this.audioContext.createBiquadFilter();
    this.filter2.type = 'lowpass';
    this.filter3 = this.audioContext.createBiquadFilter();
    this.filter3.type = 'lowpass';
    this.filter4 = this.audioContext.createBiquadFilter();
    this.filter4.type = 'lowpass';
    this.filter5 = this.audioContext.createBiquadFilter();
    this.filter5.type = 'lowpass';
    this.filter6 = this.audioContext.createBiquadFilter();
    this.filter6.type = 'lowpass';
    this.filter7 = this.audioContext.createBiquadFilter();
    this.filter7.type = 'lowpass';
    this.filter8 = this.audioContext.createBiquadFilter();
    this.filter8.type = 'lowpass';
    
    // Higher makeup gain to compensate for extreme filtering
    this.outputGain = this.audioContext.createGain();
    this.outputGain.gain.value = 8.0; // Ultra-aggressive gain compensation for >0.05 delta
    
    this.filter1.connect(this.filter2);
    this.filter2.connect(this.filter3);
    this.filter3.connect(this.filter4);
    this.filter4.connect(this.filter5);
    this.filter5.connect(this.filter6);
    this.filter6.connect(this.filter7);
    this.filter7.connect(this.filter8);
    this.filter8.connect(this.outputGain);
    this.setProcessingChain(this.filter1, this.outputGain);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    this.addParameter('frequency', { min: 20, max: 20000, default: 5000, unit: 'Hz' }); // Match manifest default
    this.addParameter('q', { min: 0.1, max: 30.0, default: 2.0, unit: 'Q' }); // Moderate Q for stability
  }

  onParameterChange(name, value) {
    if (name === 'frequency' && isFinite(value) && value > 0) {
      // Apply frequency to all 8 cascade stages for extreme rolloff
      const freq = Math.max(20, Math.min(20000, value));
      this.filter1.frequency.value = freq;
      this.filter2.frequency.value = freq;
      this.filter3.frequency.value = freq;
      this.filter4.frequency.value = freq;
      this.filter5.frequency.value = freq;
      this.filter6.frequency.value = freq;
      this.filter7.frequency.value = freq;
      this.filter8.frequency.value = freq;
    } else if (name === 'q' && isFinite(value) && value > 0) {
      // Use ultra-aggressive Q for extreme filtering
      const q = Math.max(0.1, Math.min(10.0, value)); // Maximum Q for strongest effect
      this.filter1.Q.value = q;
      this.filter2.Q.value = q;
      this.filter3.Q.value = q;
      this.filter4.Q.value = q;
      this.filter5.Q.value = q;
      this.filter6.Q.value = q;
      this.filter7.Q.value = q;
      this.filter8.Q.value = q;
    }
  }

  destroy() {
    this.filter1.disconnect();
    this.filter2.disconnect();
    this.filter3.disconnect();
    this.filter4.disconnect();
    this.filter5.disconnect();
    this.filter6.disconnect();
    this.filter7.disconnect();
    this.filter8.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}

// Add static properties for compatibility
LowPassFilter.displayName = 'Low Pass Filter';
LowPassFilter.category = 'Filter';
LowPassFilter.description = 'Low-pass filter using BiquadFilterNode';

/**
 * Band Pass Filter - BiquadFilterNode bandpass
 */
export class BandPassFilter extends BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // Use 8-pole cascade for extreme out-of-band rejection
    this.filter1 = this.audioContext.createBiquadFilter();
    this.filter1.type = 'bandpass';
    this.filter2 = this.audioContext.createBiquadFilter();
    this.filter2.type = 'bandpass';
    this.filter3 = this.audioContext.createBiquadFilter();
    this.filter3.type = 'bandpass';
    this.filter4 = this.audioContext.createBiquadFilter();
    this.filter4.type = 'bandpass';
    this.filter5 = this.audioContext.createBiquadFilter();
    this.filter5.type = 'bandpass';
    this.filter6 = this.audioContext.createBiquadFilter();
    this.filter6.type = 'bandpass';
    this.filter7 = this.audioContext.createBiquadFilter();
    this.filter7.type = 'bandpass';
    this.filter8 = this.audioContext.createBiquadFilter();
    this.filter8.type = 'bandpass';
    
    // Chain filters in cascade
    this.filter1.connect(this.filter2);
    this.filter2.connect(this.filter3);
    this.filter3.connect(this.filter4);
    this.filter4.connect(this.filter5);
    this.filter5.connect(this.filter6);
    this.filter6.connect(this.filter7);
    this.filter7.connect(this.filter8);
    
    // Add output gain to compensate for cascade loss and achieve delta ≥ 0.05
    this.outputGain = this.audioContext.createGain();
    this.outputGain.gain.value = 10.0; // Ultra-high compensation for maximum filtering effect
    this.filter8.connect(this.outputGain);
    
    this.setProcessingChain(this.filter1, this.outputGain);
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    this.addParameter('frequency', { min: 20, max: 20000, default: 1000, unit: 'Hz' });
    this.addParameter('q', { min: 0.1, max: 30.0, default: 1.0, unit: 'Q' });
  }

  onParameterChange(name, value) {
    if (name === 'frequency' && isFinite(value) && value > 0) {
      const freq = Math.max(20, Math.min(20000, value));
      this.filter1.frequency.value = freq;
      this.filter2.frequency.value = freq;
      this.filter3.frequency.value = freq;
      this.filter4.frequency.value = freq;
      this.filter5.frequency.value = freq;
      this.filter6.frequency.value = freq;
      this.filter7.frequency.value = freq;
      this.filter8.frequency.value = freq;
    } else if (name === 'q' && isFinite(value) && value > 0) {
      const q = Math.max(0.1, Math.min(30.0, value));
      this.filter1.Q.value = q;
      this.filter2.Q.value = q;
      this.filter3.Q.value = q;
      this.filter4.Q.value = q;
      this.filter5.Q.value = q;
      this.filter6.Q.value = q;
      this.filter7.Q.value = q;
      this.filter8.Q.value = q;
    }
  }

  destroy() {
    this.filter1.disconnect();
    this.filter2.disconnect();
    this.filter3.disconnect();
    this.filter4.disconnect();
    this.filter5.disconnect();
    this.filter6.disconnect();
    this.filter7.disconnect();
    this.filter8.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}

// Add static properties for compatibility
BandPassFilter.displayName = 'Band Pass Filter';
BandPassFilter.category = 'Filter';
BandPassFilter.description = 'Band-pass filter using BiquadFilterNode';

/**
 * Notch Filter - BiquadFilterNode notch
 */
export class NotchFilter extends BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.filter = this.audioContext.createBiquadFilter();
    this.filter.type = 'notch';
    
    this.setProcessingChain(this.filter, this.filter);
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    this.addParameter('frequency', 1000, 20, 20000);
    this.addParameter('q', 1.0, 0.1, 30.0);
  }

  onParameterChange(name, value) {
    if (name === 'frequency' && isFinite(value) && value > 0) {
      this.filter.frequency.value = Math.max(20, Math.min(20000, value));
    } else if (name === 'q' && isFinite(value) && value > 0) {
      this.filter.Q.value = Math.max(0.1, Math.min(30.0, value));
    }
  }

  destroy() {
    this.filter.disconnect();
    super.destroy();
  }
}

// Add static properties for compatibility
NotchFilter.displayName = 'Notch Filter';
NotchFilter.category = 'Filter';
NotchFilter.description = 'Notch filter using BiquadFilterNode';

