/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DistortionEffects.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Distortion Effects - Real WaveShaperNode implementations with custom curves
 */

import BaseAudioEffect from '../BaseAudioEffect.js';

/**
 * Overdrive - Soft clipping distortion
 */
export class Overdrive extends BaseAudioEffect {
  static displayName = 'Overdrive';
  static category = 'Distortion';
  static description = 'Soft clipping overdrive using WaveShaperNode';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.oversample = '4x';
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Wire processing chain
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
    
    // Wire wet path through base class
    this.setProcessingChain(this.inputGain, this.outputGain);
    
    this.updateCurve();
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('drive', { min: 0, max: 100, default: 50, unit: '%' });
    this.addParameter('tone', { min: 0, max: 1, default: 0.5, unit: 'ratio' });
    this.addParameter('level', { min: 0, max: 2, default: 1, unit: 'gain' });
  }

  updateCurve() {
    const drive = this.getParameter('drive') || 50;
    const amount = drive / 100 * 10; // 0-10 drive amount
    
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1; // -1 to 1
      // Soft clipping curve: tanh(amount * x)
      curve[i] = Math.tanh(amount * x);
    }
    
    this.waveshaper.curve = curve;
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'drive') {
      this.updateCurve();
      // Apply level parameter directly without drive compensation
      // This allows distortion harmonics to increase RMS as expected
      this.outputGain.gain.value = this.getParameter('level') || 1;
    } else if (name === 'level') {
      this.outputGain.gain.value = value;
    }
  }

  destroy() {
    this.waveshaper.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}

/**
 * Distortion - Hard clipping distortion
 */
export class Distortion extends BaseAudioEffect {
  static displayName = 'Distortion';
  static category = 'Distortion';
  static description = 'Hard clipping distortion';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.oversample = '4x';
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Wire processing chain
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
    
    // Wire wet path through base class
    this.setProcessingChain(this.inputGain, this.outputGain);
    
    this.updateCurve();
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('amount', { min: 0, max: 100, default: 50, unit: '%' });
    this.addParameter('level', { min: 0, max: 2, default: 1, unit: 'gain' });
  }

  updateCurve() {
    const amount = this.getParameter('amount') || 50;
    const threshold = 1 - (amount / 100) * 0.9; // Clipping threshold
    
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      // Hard clipping
      if (x > threshold) {
        curve[i] = threshold;
      } else if (x < -threshold) {
        curve[i] = -threshold;
      } else {
        curve[i] = x;
      }
    }
    
    this.waveshaper.curve = curve;
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'amount') {
      this.updateCurve();
    } else if (name === 'level') {
      this.outputGain.gain.value = value;
    }
  }

  destroy() {
    this.waveshaper.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}

/**
 * Tape Saturation - Analog tape saturation simulation
 */
export class TapeSaturation extends BaseAudioEffect {
  static displayName = 'Tape Saturation';
  static category = 'Distortion';
  static description = 'Analog tape saturation';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.oversample = '4x';
    
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    
    // Wire processing chain
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.outputGain);
    
    // Wire wet path through base class
    this.setProcessingChain(this.inputGain, this.outputGain);
    
    this.updateCurve();
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('saturation', { min: 0, max: 100, default: 30, unit: '%' });
    this.addParameter('warmth', { min: 0, max: 1, default: 0.5, unit: 'ratio' });
    this.addParameter('level', { min: 0, max: 2, default: 1, unit: 'gain' });
  }

  updateCurve() {
    const saturation = this.getParameter('saturation') || 30;
    const warmth = this.getParameter('warmth') || 0.5;
    const amount = saturation / 100 * 3; // 0-3 saturation amount
    
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      // Tape saturation curve: asymmetric soft clipping
      const pos = x > 0 ? 1 : -1;
      const abs = Math.abs(x);
      const saturated = pos * (abs - (abs * abs * abs) / 3 * amount);
      
      // Add warmth (even harmonics)
      const warmed = saturated + warmth * x * x * 0.1;
      
      curve[i] = Math.tanh(warmed);
    }
    
    this.waveshaper.curve = curve;
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'saturation' || name === 'warmth') {
      this.updateCurve();
    } else if (name === 'level') {
      this.outputGain.gain.value = value;
    }
  }

  destroy() {
    this.waveshaper.disconnect();
    this.inputGain.disconnect();
    this.outputGain.disconnect();
    super.destroy();
  }
}

/**
 * Bit Crusher - Sample rate and bit depth reduction
 */
export class BitCrusher extends BaseAudioEffect {
  static displayName = 'Bit Crusher';
  static category = 'Distortion';
  static description = 'Digital bit crushing and sample rate reduction';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.waveshaper = audioContext.createWaveShaper();
    this.waveshaper.oversample = 'none'; // Disable oversampling for authentic lo-fi
    
    // Wire wet path through base class
    this.setProcessingChain(this.waveshaper, this.waveshaper);
    
    this.updateCurve();
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('bitDepth', { min: 1, max: 16, default: 8, unit: 'bits' });
    this.addParameter('sampleRate', { min: 1000, max: 48000, default: 8000, unit: 'Hz' });
  }

  updateCurve() {
    const bits = this.getParameter('bitDepth') || 8;
    const levels = Math.pow(2, bits);
    
    const samples = 1024;
    const curve = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      const x = (i / samples) * 2 - 1;
      // Quantize to bit depth
      const quantized = Math.round(x * levels) / levels;
      curve[i] = quantized;
    }
    
    this.waveshaper.curve = curve;
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'bitDepth') {
      this.updateCurve();
    }
    // Note: Sample rate reduction would require ScriptProcessor/AudioWorklet for true downsampling
  }

  destroy() {
    this.waveshaper.disconnect();
    super.destroy();
  }
}

