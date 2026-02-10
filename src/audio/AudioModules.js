/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioModules.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Audio Modules for Routing System
 * Provides specific implementations of audio processing modules
 * for use in the modular routing architecture
 */

import { AudioModule, AudioPort } from '../audio/RoutingEngine';

// Effect Module - Wraps existing effects for modular routing
export class EffectModule extends AudioModule {
  constructor(id, name, effectType, audioContext) {
    super(id, name, 'effect', audioContext);
    
    this.effectType = effectType;
    this.effectProcessor = null;
    this.inputGain = audioContext.createGain();
    this.outputGain = audioContext.createGain();
    this.bypassGain = audioContext.createGain();
    this.wetGain = audioContext.createGain();
    this.dryGain = audioContext.createGain();
    
    // Set up signal chain: input -> effect -> wet/dry mix -> output
    this.inputGain.connect(this.dryGain);
    this.wetGain.connect(this.outputGain);
    this.dryGain.connect(this.outputGain);
    
    // Create ports
    this.addPort(new AudioPort('input', 'Audio In', 'audio', 'input', this.inputGain));
    this.addPort(new AudioPort('output', 'Audio Out', 'audio', 'output', this.outputGain));
    this.addPort(new AudioPort('sidechain', 'Sidechain', 'sidechain', 'input'));
    
    // Add effect-specific parameters
    this.parameters.set('wetDryMix', 1.0);
    this.parameters.set('enabled', true);
    this.parameters.set('bypass', false);
    
    this.initializeEffect();
  }

  initializeEffect() {
    // Initialize specific effect based on type
    switch (this.effectType) {
      case 'filter':
        this.effectProcessor = this.audioContext.createBiquadFilter();
        this.effectProcessor.type = 'lowpass';
        this.effectProcessor.frequency.value = 1000;
        this.effectProcessor.Q.value = 1;
        this.parameters.set('frequency', 1000);
        this.parameters.set('Q', 1);
        this.parameters.set('type', 'lowpass');
        break;
        
      case 'delay':
        this.effectProcessor = this.audioContext.createDelay(5.0);
        this.effectProcessor.delayTime.value = 0.3;
        this.parameters.set('delayTime', 0.3);
        this.parameters.set('feedback', 0.3);
        break;
        
      case 'reverb':
        this.effectProcessor = this.audioContext.createConvolver();
        this.parameters.set('roomSize', 0.5);
        this.parameters.set('damping', 0.5);
        break;
        
      case 'distortion':
        this.effectProcessor = this.audioContext.createWaveShaper();
        this.parameters.set('amount', 20);
        this.parameters.set('oversample', 'none');
        break;
        
      default:
        this.effectProcessor = this.audioContext.createGain();
        break;
    }
    
    // Connect effect to signal chain
    this.inputGain.connect(this.effectProcessor);
    this.effectProcessor.connect(this.wetGain);
    
    this.updateWetDryMix();
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'wetDryMix':
        this.updateWetDryMix();
        break;
        
      case 'enabled':
        this.enabled = value;
        this.updateBypass();
        break;
        
      case 'bypass':
        this.bypassed = value;
        this.updateBypass();
        break;
        
      // Effect-specific parameters
      case 'frequency':
        if (this.effectProcessor && this.effectProcessor.frequency) {
          this.effectProcessor.frequency.setValueAtTime(value, this.audioContext.currentTime);
        }
        break;
        
      case 'Q':
        if (this.effectProcessor && this.effectProcessor.Q) {
          this.effectProcessor.Q.setValueAtTime(value, this.audioContext.currentTime);
        }
        break;
        
      case 'delayTime':
        if (this.effectProcessor && this.effectProcessor.delayTime) {
          this.effectProcessor.delayTime.setValueAtTime(value, this.audioContext.currentTime);
        }
        break;
    }
  }

  updateWetDryMix() {
    const wetDryMix = this.parameters.get('wetDryMix');
    this.wetGain.gain.setValueAtTime(wetDryMix, this.audioContext.currentTime);
    this.dryGain.gain.setValueAtTime(1 - wetDryMix, this.audioContext.currentTime);
  }

  updateBypass() {
    const bypassed = this.bypassed || !this.enabled;
    this.wetGain.gain.setValueAtTime(bypassed ? 0 : this.parameters.get('wetDryMix'), this.audioContext.currentTime);
    this.dryGain.gain.setValueAtTime(bypassed ? 1 : 1 - this.parameters.get('wetDryMix'), this.audioContext.currentTime);
  }
}

// Mixer Module - Multi-input mixer with sends
export class MixerModule extends AudioModule {
  constructor(id, name, channelCount = 4, audioContext) {
    super(id, name, 'mixer', audioContext);
    
    this.channelCount = channelCount;
    this.channels = [];
    this.masterGain = audioContext.createGain();
    this.auxSends = [];
    
    // Create mixer channels
    for (let i = 0; i < channelCount; i++) {
      const channel = this.createMixerChannel(i);
      this.channels.push(channel);
      channel.gain.connect(this.masterGain);
    }
    
    // Create aux sends
    for (let i = 0; i < 4; i++) {
      const auxSend = audioContext.createGain();
      this.auxSends.push(auxSend);
      this.addPort(new AudioPort(`aux${i}`, `Aux ${i + 1}`, 'audio', 'output', auxSend));
    }
    
    // Master output
    this.addPort(new AudioPort('master', 'Master Out', 'audio', 'output', this.masterGain));
    
    // Parameters
    this.parameters.set('masterVolume', 0.8);
    this.parameters.set('masterPan', 0);
    
    this.updateMasterVolume();
  }

  createMixerChannel(index) {
    const channel = {
      input: this.audioContext.createGain(),
      gain: this.audioContext.createGain(),
      pan: this.audioContext.createStereoPanner(),
      mute: this.audioContext.createGain(),
      solo: false,
      auxSends: []
    };
    
    // Signal chain
    channel.input.connect(channel.gain);
    channel.gain.connect(channel.pan);
    channel.pan.connect(channel.mute);
    
    // Create aux sends for this channel
    for (let i = 0; i < 4; i++) {
      const auxSend = this.audioContext.createGain();
      auxSend.gain.value = 0;
      channel.gain.connect(auxSend);
      auxSend.connect(this.auxSends[i]);
      channel.auxSends.push(auxSend);
    }
    
    // Add ports
    this.addPort(new AudioPort(`input${index}`, `Input ${index + 1}`, 'audio', 'input', channel.input));
    
    // Parameters
    this.parameters.set(`ch${index}_volume`, 0.8);
    this.parameters.set(`ch${index}_pan`, 0);
    this.parameters.set(`ch${index}_mute`, false);
    
    return channel;
  }

  onParameterChange(name, value) {
    if (name === 'masterVolume') {
      this.updateMasterVolume();
    } else if (name === 'masterPan') {
      this.updateMasterPan();
    } else if (name.startsWith('ch') && name.includes('_')) {
      const [channelPart, param] = name.split('_');
      const channelIndex = parseInt(channelPart.replace('ch', ''));
      this.updateChannelParameter(channelIndex, param, value);
    }
  }

  updateMasterVolume() {
    const volume = this.parameters.get('masterVolume');
    this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  updateMasterPan() {
    // Master pan would require additional stereo panner
  }

  updateChannelParameter(channelIndex, param, value) {
    if (channelIndex >= this.channels.length) return;
    
    const channel = this.channels[channelIndex];
    
    switch (param) {
      case 'volume':
        channel.gain.gain.setValueAtTime(value, this.audioContext.currentTime);
        break;
      case 'pan':
        channel.pan.pan.setValueAtTime(value, this.audioContext.currentTime);
        break;
      case 'mute':
        channel.mute.gain.setValueAtTime(value ? 0 : 1, this.audioContext.currentTime);
        break;
    }
  }
}

// Generator Module - Audio source generators
export class GeneratorModule extends AudioModule {
  constructor(id, name, generatorType, audioContext) {
    super(id, name, 'generator', audioContext);
    
    this.generatorType = generatorType;
    this.oscillator = null;
    this.noiseBuffer = null;
    this.outputGain = audioContext.createGain();
    
    // Add ports
    this.addPort(new AudioPort('output', 'Audio Out', 'audio', 'output', this.outputGain));
    this.addPort(new AudioPort('trigger', 'Trigger', 'control', 'input'));
    
    // Parameters
    this.parameters.set('frequency', 440);
    this.parameters.set('amplitude', 0.5);
    this.parameters.set('waveform', 'sine');
    this.parameters.set('enabled', false);
    
    this.initializeGenerator();
  }

  initializeGenerator() {
    switch (this.generatorType) {
      case 'oscillator':
        this.createOscillator();
        break;
      case 'noise':
        this.createNoiseGenerator();
        break;
      case 'sweep':
        this.createSweepGenerator();
        break;
    }
  }

  createOscillator() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator.disconnect();
    }
    
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = this.parameters.get('waveform');
    this.oscillator.frequency.value = this.parameters.get('frequency');
    this.oscillator.connect(this.outputGain);
    
    if (this.parameters.get('enabled')) {
      this.oscillator.start();
    }
  }

  createNoiseGenerator() {
    // Create noise buffer
    const bufferSize = this.audioContext.sampleRate * 2;
    this.noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const channelData = this.noiseBuffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      channelData[i] = Math.random() * 2 - 1;
    }
    
    if (this.parameters.get('enabled')) {
      this.startNoise();
    }
  }

  startNoise() {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;
    source.connect(this.outputGain);
    source.start();
    this.noiseSource = source;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'frequency':
        if (this.oscillator && this.oscillator.frequency) {
          this.oscillator.frequency.setValueAtTime(value, this.audioContext.currentTime);
        }
        break;
        
      case 'amplitude':
        this.outputGain.gain.setValueAtTime(value, this.audioContext.currentTime);
        break;
        
      case 'waveform':
        if (this.oscillator) {
          this.oscillator.type = value;
        }
        break;
        
      case 'enabled':
        if (value) {
          this.start();
        } else {
          this.stop();
        }
        break;
    }
  }

  start() {
    this.parameters.set('enabled', true);
    if (this.generatorType === 'oscillator') {
      this.createOscillator();
    } else if (this.generatorType === 'noise') {
      this.startNoise();
    }
  }

  stop() {
    this.parameters.set('enabled', false);
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    if (this.noiseSource) {
      this.noiseSource.stop();
      this.noiseSource = null;
    }
  }
}

// Analyzer Module - Audio analysis and monitoring
export class AnalyzerModule extends AudioModule {
  constructor(id, name, audioContext) {
    super(id, name, 'analyzer', audioContext);
    
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.splitter = audioContext.createChannelSplitter(2);
    this.merger = audioContext.createChannelMerger(2);
    
    // Signal chain: input -> splitter -> analyser + merger -> output
    this.splitter.connect(this.analyser, 0);
    this.splitter.connect(this.merger, 0, 0);
    this.splitter.connect(this.merger, 1, 1);
    
    // Add ports
    this.addPort(new AudioPort('input', 'Audio In', 'audio', 'input', this.splitter));
    this.addPort(new AudioPort('output', 'Audio Out', 'audio', 'output', this.merger));
    this.addPort(new AudioPort('analysis', 'Analysis Out', 'control', 'output'));
    
    // Analysis data
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.fftSize);
    
    // Parameters
    this.parameters.set('fftSize', 2048);
    this.parameters.set('smoothing', 0.8);
    this.parameters.set('analysisRate', 60); // Hz
    
    this.startAnalysis();
  }

  startAnalysis() {
    const updateRate = 1000 / this.parameters.get('analysisRate');
    
    this.analysisInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(this.frequencyData);
      this.analyser.getByteTimeDomainData(this.timeData);
      
      // Calculate additional metrics
      const rms = this.calculateRMS();
      const peak = this.calculatePeak();
      const spectralCentroid = this.calculateSpectralCentroid();
      
      this.analysisData = {
        frequency: this.frequencyData,
        time: this.timeData,
        rms,
        peak,
        spectralCentroid,
        timestamp: Date.now()
      };
    }, updateRate);
  }

  calculateRMS() {
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = (this.timeData[i] - 128) / 128;
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / this.timeData.length);
  }

  calculatePeak() {
    let peak = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      const normalized = Math.abs((this.timeData[i] - 128) / 128);
      if (normalized > peak) peak = normalized;
    }
    return peak;
  }

  calculateSpectralCentroid() {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < this.frequencyData.length; i++) {
      const frequency = (i * this.audioContext.sampleRate) / (2 * this.frequencyData.length);
      const magnitude = this.frequencyData[i];
      numerator += frequency * magnitude;
      denominator += magnitude;
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }

  onParameterChange(name, value) {
    switch (name) {
      case 'fftSize':
        this.analyser.fftSize = value;
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeData = new Uint8Array(this.analyser.fftSize);
        break;
        
      case 'smoothing':
        this.analyser.smoothingTimeConstant = value;
        break;
        
      case 'analysisRate':
        clearInterval(this.analysisInterval);
        this.startAnalysis();
        break;
    }
  }

  getAnalysisData() {
    return this.analysisData;
  }
}

// Module Factory
export class ModuleFactory {
  static createModule(type, subtype, audioContext) {
    const id = `module_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    switch (type) {
      case 'effect':
        return new EffectModule(id, `${subtype} Effect`, subtype, audioContext);
        
      case 'mixer':
        return new MixerModule(id, 'Mixer', 4, audioContext);
        
      case 'generator':
        return new GeneratorModule(id, `${subtype} Generator`, subtype, audioContext);
        
      case 'analyzer':
        return new AnalyzerModule(id, 'Analyzer', audioContext);
        
      default:
        return new AudioModule(id, 'Basic Module', type, audioContext);
    }
  }

  static getAvailableModules() {
    return {
      effect: ['filter', 'delay', 'reverb', 'distortion', 'compressor'],
      mixer: ['mixer'],
      generator: ['oscillator', 'noise', 'sweep'],
      analyzer: ['analyzer'],
      utility: ['gain', 'splitter', 'merger']
    };
  }
}
