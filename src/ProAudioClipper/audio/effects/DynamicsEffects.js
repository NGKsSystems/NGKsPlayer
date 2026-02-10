/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DynamicsEffects.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Dynamics Effects - Real DynamicsCompressorNode and custom DSP implementations
 */

import BaseAudioEffect from '../BaseAudioEffect.js';import { WorkletLoader } from '../worklets/WorkletLoader.js';
/**
 * Limiter - Hard limiting using DynamicsCompressorNode
 */
export class Limiter extends BaseAudioEffect {
  static displayName = 'Limiter';
  static category = 'Dynamics';
  static description = 'Brick-wall limiter using DynamicsCompressorNode';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.ratio.value = 20;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.1;
    this.compressor.knee.value = 0;
    
    this.outputGainNode = this.audioContext.createGain();
    this.compressor.connect(this.outputGainNode);
    this.setProcessingChain(this.compressor, this.outputGainNode);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('threshold', { min: -60, max: 0, default: -1, unit: 'dB' });
    this.addParameter('release', { min: 10, max: 1000, default: 100, unit: 'ms' });
    this.addParameter('outputGain', { min: 0, max: 20, default: 0, unit: 'dB' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'threshold') {
      this.compressor.threshold.value = value;
    } else if (name === 'release') {
      this.compressor.release.value = value / 1000; // Convert ms to seconds
    } else if (name === 'outputGain') {
      this.outputGainNode.gain.value = Math.pow(10, value / 20);
    }
  }

  destroy() {
    this.compressor.disconnect();
    this.outputGainNode.disconnect();
    super.destroy();
  }
}

/**
 * Noise Gate - Simple threshold-based gate using DynamicsCompressorNode
 * FIXED: Web Audio API only (no worklets) for offline rendering compatibility
 */
export class NoiseGate extends BaseAudioEffect {
  static displayName = 'Noise Gate';
  static category = 'Dynamics';
  static description = 'Noise gate using DynamicsCompressorNode';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // SIMPLIFIED: Use DynamicsCompressorNode configured as expander/gate
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -40;
    this.compressor.knee.value = 0; // Hard knee for gate behavior
    this.compressor.ratio.value = 20; // High ratio acts like gate
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.1;
    
    this.setProcessingChain(this.compressor, this.compressor);
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('threshold', { min: -80, max: 0, default: -40, unit: 'dB' });
    this.addParameter('attack', { min: 0.1, max: 100, default: 1, unit: 'ms' });
    this.addParameter('release', { min: 10, max: 2000, default: 100, unit: 'ms' });
    this.addParameter('range', { min: 0, max: 80, default: 60, unit: 'dB' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'threshold') {
      this.compressor.threshold.value = value;
    } else if (name === 'attack') {
      this.compressor.attack.value = value / 1000; // Convert ms to seconds
    } else if (name === 'release') {
      this.compressor.release.value = value / 1000; // Convert ms to seconds
    }
    // 'range' not supported by DynamicsCompressorNode
  }

  destroy() {
    this.compressor.disconnect();
    super.destroy();
  }
}

/**
 * Expander - Upward/downward expansion using DynamicsCompressorNode in reverse
 */
export class Expander extends BaseAudioEffect {
  static displayName = 'Expander';
  static category = 'Dynamics';
  static description = 'Dynamic range expander';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.compressor = audioContext.createDynamicsCompressor();
    this.makeupGain = audioContext.createGain();
    this.compressor.connect(this.makeupGain);
    this.setProcessingChain(this.compressor, this.makeupGain);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('threshold', { min: -60, max: 0, default: -30, unit: 'dB' });
    this.addParameter('ratio', { min: 1, max: 10, default: 2, unit: ':1' });
    this.addParameter('attack', { min: 0.1, max: 100, default: 5, unit: 'ms' });
    this.addParameter('release', { min: 10, max: 1000, default: 100, unit: 'ms' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'threshold') {
      this.compressor.threshold.value = value;
    } else if (name === 'ratio') {
      // Inverse ratio for expansion
      this.compressor.ratio.value = 1 / value;
    } else if (name === 'attack') {
      this.compressor.attack.value = value / 1000;
    } else if (name === 'release') {
      this.compressor.release.value = value / 1000;
    }
  }

  destroy() {
    this.compressor.disconnect();
    this.makeupGain.disconnect();
    super.destroy();
  }
}

/**
 * De-Esser - High-frequency compressor using multiband splitting
 */
export class DeEsser extends BaseAudioEffect {
  static displayName = 'De-Esser';
  static category = 'Dynamics';
  static description = 'Sibilance reduction using frequency-selective compression';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.highPassFilter = audioContext.createBiquadFilter();
    this.highPassFilter.type = 'highpass';
    this.highPassFilter.frequency.value = 4000;
    this.highPassFilter.Q.value = 0.7;
    
    this.lowPassFilter = audioContext.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = 4000;
    this.lowPassFilter.Q.value = 0.7;
    
    this.compressor = audioContext.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.ratio.value = 8;
    this.compressor.attack.value = 0.001;
    this.compressor.release.value = 0.05;
    
    this.lowBandGain = audioContext.createGain();
    this.highBandGain = audioContext.createGain();
    this.splitInput = audioContext.createGain();
    this.recombineMix = audioContext.createGain();
    
    this.splitInput.connect(this.lowPassFilter);
    this.splitInput.connect(this.highPassFilter);
    this.highPassFilter.connect(this.compressor);
    this.compressor.connect(this.highBandGain);
    this.lowPassFilter.connect(this.lowBandGain);
    this.lowBandGain.connect(this.recombineMix);
    this.highBandGain.connect(this.recombineMix);
    this.setProcessingChain(this.splitInput, this.recombineMix);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('frequency', { min: 2000, max: 10000, default: 6000, unit: 'Hz' });
    this.addParameter('threshold', { min: -60, max: 0, default: -20, unit: 'dB' });
    this.addParameter('ratio', { min: 1, max: 20, default: 4, unit: ':1' });
    this.addParameter('amount', { min: 0, max: 100, default: 50, unit: '%' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'frequency') {
      this.highPassFilter.frequency.value = value;
      this.lowPassFilter.frequency.value = value;
    } else if (name === 'threshold') {
      this.compressor.threshold.value = value;
    } else if (name === 'ratio') {
      this.compressor.ratio.value = value;
    } else if (name === 'amount') {
      // Amount controls wet/dry mix of processed high band
      const wetGain = value / 100;
      this.highBandGain.gain.value = wetGain;
      this.lowBandGain.gain.value = 1;
    }
  }

  destroy() {
    this.highPassFilter.disconnect();
    this.lowPassFilter.disconnect();
    this.compressor.disconnect();
    this.lowBandGain.disconnect();
    this.highBandGain.disconnect();
    this.splitInput.disconnect();
    this.recombineMix.disconnect();
    super.destroy();
  }
}

