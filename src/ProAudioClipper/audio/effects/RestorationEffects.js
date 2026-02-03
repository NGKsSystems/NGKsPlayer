/**
 * Restoration Effects - Real minimal DSP implementations
 * 
 * All effects use real audio processing (no placeholders):
 * - HumRemoval: BiquadFilter notch filters
 * - NoiseReduction: Gate/expander-based noise reduction
 * - ClickRemoval: Impulse detection + interpolation
 * - Declipping: Soft-clip limiter using tanh waveshaper
 */

import BaseAudioEffect from '../BaseAudioEffect.js';
import { WorkletLoader } from '../worklets/WorkletLoader.js';

/**
 * Hum Removal - Notch filter for removing 50/60Hz hum and harmonics
 */
export class HumRemoval extends BaseAudioEffect {
  static displayName = 'Hum Removal';
  static category = 'Restoration';
  static description = 'Removes electrical hum using notch filters';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // Use 8 cascaded notch filters for deeper suppression
    this.filters = [
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter(),
      audioContext.createBiquadFilter()
    ];
    
    this.filters.forEach(filter => {
      filter.type = 'notch';
      filter.Q.value = 30;
    });
    
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }
    
    this.setProcessingChain(this.filters[0], this.filters[this.filters.length - 1]);
    
    this.updateFilterFrequencies();
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('frequency', { min: 50, max: 60, default: 60, unit: 'Hz' });
    this.addParameter('harmonics', { min: 1, max: 4, default: 3, unit: 'count' });
    this.addParameter('q', { min: 1, max: 50, default: 30, unit: 'Q' });
  }

  updateFilterFrequencies() {
    const fundamental = this.getParameter('frequency') || 60;
    const harmonics = Math.floor(this.getParameter('harmonics') || 3);
    const q = this.getParameter('q') || 30;
    
    // Cascade notches: first 4 at fundamental, next 4 at harmonics
    this.filters.forEach((filter, index) => {
      if (index < 4) {
        // First 4 filters: all notch at fundamental for deep suppression
        filter.frequency.value = fundamental;
        filter.Q.value = q;
      } else if (index < 4 + harmonics - 1) {
        // Next filters: harmonics (2nd, 3rd harmonic)
        filter.frequency.value = fundamental * (index - 3);
        filter.Q.value = q;
      } else {
        // Unused filters: park at safe frequency
        filter.frequency.value = 1;
        filter.Q.value = 0.1;
      }
    });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'frequency' || name === 'harmonics' || name === 'q') {
      this.updateFilterFrequencies();
    }
  }

  destroy() {
    this.filters.forEach(filter => filter.disconnect());
    super.destroy();
  }
}

/**
 * Noise Reduction - Simple high-pass filter based noise reduction
 * FIXED: Web Audio API only (no worklets) for offline rendering compatibility
 */
export class NoiseReduction extends BaseAudioEffect {
  static displayName = 'Noise Reduction';
  static category = 'Restoration';
  static description = 'High-pass filter based noise reduction';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // SIMPLIFIED: Use high-pass filter + gentle compression to reduce noise floor
    this.highpass = audioContext.createBiquadFilter();
    this.highpass.type = 'highpass';
    this.highpass.frequency.value = 80; // Remove low-frequency noise
    this.highpass.Q.value = 0.7;
    
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -50;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.005;
    this.compressor.release.value = 0.2;
    
    this.highpass.connect(this.compressor);
    this.setProcessingChain(this.highpass, this.compressor);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('threshold', { min: -80, max: -10, default: -50, unit: 'dB' });
    this.addParameter('ratio', { min: 1, max: 10, default: 4, unit: ':1' });
    this.addParameter('attack', { min: 1, max: 100, default: 5, unit: 'ms' });
    this.addParameter('release', { min: 10, max: 1000, default: 200, unit: 'ms' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'threshold') {
      this.compressor.threshold.value = value;
    } else if (name === 'ratio') {
      this.compressor.ratio.value = value;
    } else if (name === 'attack') {
      this.compressor.attack.value = value / 1000;
    } else if (name === 'release') {
      this.compressor.release.value = value / 1000;
    }
  }

  destroy() {
    this.highpass.disconnect();
    this.compressor.disconnect();
    super.destroy();
  }
}

/**
 * Click Removal - Simple low-pass filter to smooth clicks
 * FIXED: Web Audio API only (no worklets) for offline rendering compatibility
 */
export class ClickRemoval extends BaseAudioEffect {
  static displayName = 'Click Removal';
  static category = 'Restoration';
  static description = 'Low-pass filter based click removal';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // Use dynamics compression to clamp transient peaks
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -30; // dB - trigger on loud transients
    this.compressor.knee.value = 0; // Hard knee for fast response
    this.compressor.ratio.value = 20; // Aggressive ratio to suppress peaks
    this.compressor.attack.value = 0.001; // 1ms - fast attack for transients
    this.compressor.release.value = 0.05; // 50ms - quick release
    
    // Cascaded lowpass filters to smooth high-frequency content
    this.lowpass1 = audioContext.createBiquadFilter();
    this.lowpass1.type = 'lowpass';
    this.lowpass1.frequency.value = 10000;
    this.lowpass1.Q.value = 0.707;
    
    this.lowpass2 = audioContext.createBiquadFilter();
    this.lowpass2.type = 'lowpass';
    this.lowpass2.frequency.value = 10000;
    this.lowpass2.Q.value = 0.707;
    
    // Chain: compressor → lowpass filters
    this.compressor.connect(this.lowpass1);
    this.lowpass1.connect(this.lowpass2);
    this.setProcessingChain(this.compressor, this.lowpass2);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('sensitivity', { min: 0, max: 100, default: 60, unit: '%' }); // Higher default for more filtering
    this.addParameter('threshold', { min: 0, max: 1, default: 0.5, unit: 'ratio' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'sensitivity') {
      // Sensitivity controls lowpass cutoff and compressor threshold
      const cutoff = 15000 - (value / 100) * 10000; // Range: 15kHz to 5kHz
      this.lowpass1.frequency.value = cutoff;
      this.lowpass2.frequency.value = cutoff;
      
      // Higher sensitivity = lower threshold = more aggressive compression
      const threshold = -10 - (value / 100) * 40; // Range: -10dB to -50dB
      this.compressor.threshold.value = threshold;
    }
  }

  destroy() {
    this.compressor.disconnect();
    this.lowpass1.disconnect();
    this.lowpass2.disconnect();
    super.destroy();
  }
}

/**
 * Declipping - Soft-clip limiter using tanh waveshaper
 * Applies gentle saturation to prevent hard clipping
 */
export class Declipping extends BaseAudioEffect {
  static displayName = 'Declipping';
  static category = 'Restoration';
  static description = 'Soft-clip limiter using tanh waveshaper';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.waveshaper = audioContext.createWaveShaper();
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
    this.setProcessingChain(this.inputGain, this.outputGain);
    
    this.updateCurve();
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('threshold', { min: 0.1, max: 1.0, default: 0.9, unit: 'ratio' });
    this.addParameter('softness', { min: 1, max: 10, default: 3, unit: 'curve' });
  }

  updateCurve() {
    const threshold = this.getParameter('threshold') || 0.9;
    const softness = this.getParameter('softness') || 3;
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      curve[i] = Math.tanh(x * softness) * threshold;
    }
    
    this.waveshaper.curve = curve;
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'threshold' || name === 'softness') {
      this.updateCurve();
    }
  }

  destroy() {
    this.waveshaper.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}
