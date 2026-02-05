/**
 * Utility Effects - Basic audio processing using standard nodes
 */

import BaseAudioEffect from '../BaseAudioEffect.js';

/**
 * Stereo Enhancer - Widens stereo image using mid/side processing
 */
export class StereoEnhancer extends BaseAudioEffect {
  static displayName = 'Stereo Enhancer';
  static category = 'Utility';
  static description = 'Stereo width enhancement using M/S processing';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    // M/S encoding/decoding nodes
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Mid/side gain controls
    this.midGain = audioContext.createGain();
    this.sideGain = audioContext.createGain();
    
    // Inverter for M/S processing
    this.inverter = audioContext.createGain();
    this.inverter.gain.value = -1;
    
    // M/S encoding/decoding
    // Split stereo to L/R
    this.splitter.connect(this.midGain, 0); // L
    this.splitter.connect(this.midGain, 1); // R
    this.splitter.connect(this.sideGain, 0); // L
    this.splitter.connect(this.inverter, 1); // R inverted
    this.inverter.connect(this.sideGain);
    
    // M/S decoding back to L/R
    this.midGain.connect(this.merger, 0, 0); // Mid -> L
    this.midGain.connect(this.merger, 0, 1); // Mid -> R
    this.sideGain.connect(this.merger, 0, 0); // Side -> L
    this.sideGain.connect(this.inverter);
    this.inverter.connect(this.merger, 0, 1); // -Side -> R
    
    // Wire wet path through base class
    this.setProcessingChain(this.splitter, this.merger);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('width', { min: 0, max: 200, default: 100, unit: '%' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'width') {
      // 100% = normal stereo (1.0 side gain)
      // 0% = mono (0.0 side gain)
      // 200% = extra wide (2.0 side gain)
      const sideMultiplier = value / 100;
      this.sideGain.gain.value = sideMultiplier;
      
      // Compensate mid to maintain level
      this.midGain.gain.value = 1.0;
    }
  }

  destroy() {
    this.splitter.disconnect();
    this.merger.disconnect();
    this.midGain.disconnect();
    this.sideGain.disconnect();
    this.inverter.disconnect();
    super.destroy();
  }
}

/**
 * Mono Converter - Converts stereo to mono
 */
export class MonoConverter extends BaseAudioEffect {
  static displayName = 'Mono Converter';
  static category = 'Utility';
  static description = 'Converts stereo to mono';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    this.mixGain = audioContext.createGain();
    this.mixGain.gain.value = 0.5; // Average L and R
    
    // Split L/R
    this.splitter.connect(this.mixGain, 0); // L
    this.splitter.connect(this.mixGain, 1); // R
    
    // Send mono signal to both channels
    this.mixGain.connect(this.merger, 0, 0); // -> L
    this.mixGain.connect(this.merger, 0, 1); // -> R
    
    // Wire wet path through base class
    this.setProcessingChain(this.splitter, this.merger);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('amount', { min: 0, max: 100, default: 100, unit: '%' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'amount') {
      // Mix between stereo and mono
      // This is simplified - full implementation would blend original and mono
      this.mixGain.gain.value = 0.5 * (value / 100);
    }
  }

  destroy() {
    this.splitter.disconnect();
    this.merger.disconnect();
    this.mixGain.disconnect();
    super.destroy();
  }
}

/**
 * Phase Inverter - Inverts phase of left or right channel
 */
export class PhaseInverter extends BaseAudioEffect {
  static displayName = 'Phase Inverter';
  static category = 'Utility';
  static description = 'Inverts phase of selected channel';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    this.leftInverter = audioContext.createGain();
    this.leftInverter.gain.value = 1; // Normal by default
    
    this.rightInverter = audioContext.createGain();
    this.rightInverter.gain.value = 1; // Normal by default
    
    // Wire connections
    this.splitter.connect(this.leftInverter, 0);
    this.leftInverter.connect(this.merger, 0, 0);
    this.splitter.connect(this.rightInverter, 1);
    this.rightInverter.connect(this.merger, 0, 1);
    
    // Wire wet path through base class
    this.setProcessingChain(this.splitter, this.merger);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('invertLeft', { min: 0, max: 1, default: 0, unit: 'boolean' });
    this.addParameter('invertRight', { min: 0, max: 1, default: 0, unit: 'boolean' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'invertLeft') {
      this.leftInverter.gain.value = value > 0.5 ? -1 : 1;
    } else if (name === 'invertRight') {
      this.rightInverter.gain.value = value > 0.5 ? -1 : 1;
    }
  }

  destroy() {
    this.splitter.disconnect();
    this.merger.disconnect();
    this.leftInverter.disconnect();
    this.rightInverter.disconnect();
    super.destroy();
  }
}

/**
 * Gain Effect - Simple gain/trim control
 */
export class GainEffect extends BaseAudioEffect {
  static displayName = 'Gain';
  static category = 'Utility';
  static description = 'Simple gain/trim control';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext);
    
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = 1;
    
    // Wire wet path through base class
    this.setProcessingChain(this.gainNode, this.gainNode);
    
    this.finalizeInit(parameters);
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('gain', { min: -60, max: 20, default: 0, unit: 'dB' });
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    if (name === 'gain') {
      // Convert dB to linear
      this.gainNode.gain.value = Math.pow(10, value / 20);
    }
  }

  destroy() {
    this.gainNode.disconnect();
    super.destroy();
  }
}
