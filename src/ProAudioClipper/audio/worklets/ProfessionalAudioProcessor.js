/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalAudioProcessor.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Audio Worklet Processor
 * 
 * High-performance, low-latency audio processing worklet for professional DAW functionality.
 * Handles real-time audio effects, mixing, and routing with sample-accurate timing.
 */

class ProfessionalAudioProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: 'gain',
        defaultValue: 1.0,
        minValue: 0.0,
        maxValue: 4.0,
        automationRate: 'a-rate'
      },
      {
        name: 'pan',
        defaultValue: 0.0,
        minValue: -1.0,
        maxValue: 1.0,
        automationRate: 'a-rate'
      },
      {
        name: 'mute',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate'
      },
      {
        name: 'solo',
        defaultValue: 0.0,
        minValue: 0.0,
        maxValue: 1.0,
        automationRate: 'k-rate'
      }
    ];
  }

  constructor(options) {
    super();
    
    // Processing state
    this.sampleRate = options.processorOptions?.sampleRate || 44100;
    this.blockSize = 128;
    this.channelCount = 2; // Stereo processing
    
    // Audio buffers for processing
    this.inputBuffer = new Float32Array(this.blockSize * this.channelCount);
    this.outputBuffer = new Float32Array(this.blockSize * this.channelCount);
    
    // Effects chain
    this.effectsChain = [];
    this.effectsEnabled = true;
    
    // Metering
    this.meterData = {
      peak: [0, 0],
      rms: [0, 0],
      peakHold: [0, 0],
      peakHoldTime: [0, 0]
    };
    this.meterDecay = 0.995;
    this.peakHoldDuration = this.sampleRate * 2; // 2 seconds
    
    // Sample-accurate automation
    this.automationBuffer = new Map();
    this.currentSample = 0;
    
    // Performance monitoring
    this.processingLoad = 0;
    this.processingTime = 0;
    this.lastProcessTime = performance.now();
    
    // Initialize message handling
    this.port.onmessage = this.handleMessage.bind(this);
    
    console.log('ProfessionalAudioProcessor initialized', {
      sampleRate: this.sampleRate,
      blockSize: this.blockSize
    });
  }

  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'ADD_EFFECT':
        this.addEffect(data);
        break;
        
      case 'REMOVE_EFFECT':
        this.removeEffect(data.effectId);
        break;
        
      case 'UPDATE_EFFECT_PARAM':
        this.updateEffectParameter(data.effectId, data.param, data.value);
        break;
        
      case 'SET_EFFECTS_ENABLED':
        this.effectsEnabled = data.enabled;
        break;
        
      case 'GET_METER_DATA':
        this.port.postMessage({
          type: 'METER_DATA',
          data: this.meterData
        });
        break;
        
      case 'AUTOMATION_DATA':
        this.processAutomationData(data);
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  }

  addEffect(effectData) {
    const { type, id, parameters } = effectData;
    
    let effect;
    
    switch (type) {
      case 'parametric-eq':
        effect = new ParametricEQWorklet(this.sampleRate, parameters);
        break;
      case 'compressor':
        effect = new CompressorWorklet(this.sampleRate, parameters);
        break;
      case 'reverb':
        effect = new ReverbWorklet(this.sampleRate, parameters);
        break;
      case 'delay':
        effect = new DelayWorklet(this.sampleRate, parameters);
        break;
      default:
        console.warn('Unknown effect type:', type);
        return;
    }
    
    effect.id = id;
    effect.type = type;
    effect.bypass = false;
    
    this.effectsChain.push(effect);
    
    this.port.postMessage({
      type: 'EFFECT_ADDED',
      data: { id, type }
    });
  }

  removeEffect(effectId) {
    const index = this.effectsChain.findIndex(effect => effect.id === effectId);
    if (index !== -1) {
      this.effectsChain.splice(index, 1);
      this.port.postMessage({
        type: 'EFFECT_REMOVED',
        data: { id: effectId }
      });
    }
  }

  updateEffectParameter(effectId, param, value) {
    const effect = this.effectsChain.find(e => e.id === effectId);
    if (effect && effect.setParameter) {
      effect.setParameter(param, value);
    }
  }

  processAutomationData(automationData) {
    // Store automation data for sample-accurate playback
    for (const [parameter, points] of Object.entries(automationData)) {
      this.automationBuffer.set(parameter, points);
    }
  }

  // High-performance stereo panning with constant power law
  applyPanning(inputL, inputR, panValue) {
    const panRad = (panValue + 1) * Math.PI * 0.25; // Convert -1..1 to 0..Ï€/2
    const leftGain = Math.cos(panRad);
    const rightGain = Math.sin(panRad);
    
    return [
      inputL * leftGain + inputR * (1 - leftGain),
      inputL * (1 - rightGain) + inputR * rightGain
    ];
  }

  // Real-time metering with peak and RMS calculation
  updateMetering(samples, channelCount) {
    const blockSize = samples.length / channelCount;
    
    for (let channel = 0; channel < channelCount; channel++) {
      let sumOfSquares = 0;
      let peak = 0;
      
      for (let i = channel; i < samples.length; i += channelCount) {
        const sample = Math.abs(samples[i]);
        
        // Peak detection
        if (sample > peak) {
          peak = sample;
        }
        
        // RMS calculation
        sumOfSquares += samples[i] * samples[i];
      }
      
      // Update peak with decay
      this.meterData.peak[channel] = Math.max(peak, this.meterData.peak[channel] * this.meterDecay);
      
      // Update RMS
      this.meterData.rms[channel] = Math.sqrt(sumOfSquares / blockSize);
      
      // Peak hold logic
      if (peak > this.meterData.peakHold[channel]) {
        this.meterData.peakHold[channel] = peak;
        this.meterData.peakHoldTime[channel] = this.currentSample + this.peakHoldDuration;
      } else if (this.currentSample > this.meterData.peakHoldTime[channel]) {
        this.meterData.peakHold[channel] *= this.meterDecay;
      }
    }
  }

  // Main audio processing function - called for every audio block
  process(inputs, outputs, parameters) {
    const startTime = performance.now();
    
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !output || input.length === 0 || output.length === 0) {
      return true;
    }
    
    const blockSize = input[0].length;
    const channelCount = Math.min(input.length, output.length, 2);
    
    // Get parameter values
    const gainParam = parameters.gain;
    const panParam = parameters.pan;
    const muteParam = parameters.mute;
    
    // Process each sample
    for (let sample = 0; sample < blockSize; sample++) {
      // Get current parameter values (support for automation)
      const gain = gainParam.length > 1 ? gainParam[sample] : gainParam[0];
      const pan = panParam.length > 1 ? panParam[sample] : panParam[0];
      const mute = muteParam.length > 1 ? muteParam[sample] : muteParam[0];
      
      // Get input samples
      let leftSample = channelCount > 0 ? input[0][sample] : 0;
      let rightSample = channelCount > 1 ? input[1][sample] : leftSample;
      
      // Skip processing if muted
      if (mute > 0.5) {
        output[0][sample] = 0;
        if (output[1]) output[1][sample] = 0;
        continue;
      }
      
      // Apply effects chain
      if (this.effectsEnabled && this.effectsChain.length > 0) {
        for (const effect of this.effectsChain) {
          if (!effect.bypass && effect.process) {
            const processed = effect.process(leftSample, rightSample, sample);
            leftSample = processed[0];
            rightSample = processed[1];
          }
        }
      }
      
      // Apply gain
      leftSample *= gain;
      rightSample *= gain;
      
      // Apply panning
      if (pan !== 0) {
        [leftSample, rightSample] = this.applyPanning(leftSample, rightSample, pan);
      }
      
      // Output samples
      output[0][sample] = leftSample;
      if (output[1]) output[1][sample] = rightSample;
      
      this.currentSample++;
    }
    
    // Update metering
    const flatSamples = [];
    for (let sample = 0; sample < blockSize; sample++) {
      flatSamples.push(output[0][sample]);
      if (output[1]) flatSamples.push(output[1][sample]);
    }
    this.updateMetering(flatSamples, channelCount);
    
    // Performance monitoring
    const endTime = performance.now();
    this.processingTime = endTime - startTime;
    this.processingLoad = this.processingTime / (blockSize / this.sampleRate * 1000);
    
    // Send performance data occasionally
    if (this.currentSample % (this.sampleRate * 2) === 0) { // Every 2 seconds
      this.port.postMessage({
        type: 'PERFORMANCE_DATA',
        data: {
          processingLoad: this.processingLoad,
          processingTime: this.processingTime,
          sampleRate: this.sampleRate,
          blockSize: blockSize
        }
      });
    }
    
    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('professional-audio-processor', ProfessionalAudioProcessor);
