/**
 * Professional Audio Processor - Main AudioWorklet
 * 
 * Integrates all professional audio effects in a single high-performance worklet.
 * Provides sample-accurate timing and ultra-low latency processing.
 */

// Import effect processors
import { ParametricEQWorklet } from './effects/ParametricEQWorklet.js';
import { CompressorWorklet } from './effects/CompressorWorklet.js';
import { ReverbWorklet } from './effects/ReverbWorklet.js';
import { DelayWorklet } from './effects/DelayWorklet.js';

class ProfessionalAudioProcessorWorklet extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      // Master controls
      { name: 'masterGain', defaultValue: 1.0, minValue: 0, maxValue: 2 },
      { name: 'masterPan', defaultValue: 0, minValue: -1, maxValue: 1 },
      { name: 'masterMute', defaultValue: 0, minValue: 0, maxValue: 1 },
      
      // EQ parameters
      { name: 'eqBypass', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'eqLowGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'eqLowFreq', defaultValue: 100, minValue: 20, maxValue: 500 },
      { name: 'eqLmidGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'eqLmidFreq', defaultValue: 500, minValue: 200, maxValue: 2000 },
      { name: 'eqHmidGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'eqHmidFreq', defaultValue: 2500, minValue: 1000, maxValue: 8000 },
      { name: 'eqHighGain', defaultValue: 0, minValue: -15, maxValue: 15 },
      { name: 'eqHighFreq', defaultValue: 8000, minValue: 2000, maxValue: 20000 },
      
      // Compressor parameters
      { name: 'compBypass', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'compThreshold', defaultValue: -12, minValue: -60, maxValue: 0 },
      { name: 'compRatio', defaultValue: 4, minValue: 1, maxValue: 20 },
      { name: 'compAttack', defaultValue: 0.003, minValue: 0.0001, maxValue: 0.1 },
      { name: 'compRelease', defaultValue: 0.1, minValue: 0.01, maxValue: 3 },
      { name: 'compMakeup', defaultValue: 0, minValue: 0, maxValue: 20 },
      
      // Reverb parameters
      { name: 'reverbBypass', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'reverbRoom', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'reverbDamping', defaultValue: 0.5, minValue: 0, maxValue: 1 },
      { name: 'reverbWet', defaultValue: 0.3, minValue: 0, maxValue: 1 },
      { name: 'reverbDry', defaultValue: 0.7, minValue: 0, maxValue: 1 },
      { name: 'reverbWidth', defaultValue: 1.0, minValue: 0, maxValue: 1 },
      
      // Delay parameters
      { name: 'delayBypass', defaultValue: 0, minValue: 0, maxValue: 1 },
      { name: 'delayTime', defaultValue: 0.25, minValue: 0.001, maxValue: 2 },
      { name: 'delayFeedback', defaultValue: 0.3, minValue: 0, maxValue: 0.95 },
      { name: 'delayWet', defaultValue: 0.3, minValue: 0, maxValue: 1 },
      { name: 'delayDry', defaultValue: 0.7, minValue: 0, maxValue: 1 }
    ];
  }

  constructor() {
    super();
    
    // Initialize effect processors
    this.eq = new ParametricEQWorklet(sampleRate);
    this.compressor = new CompressorWorklet(sampleRate);
    this.reverb = new ReverbWorklet(sampleRate);
    this.delay = new DelayWorklet(sampleRate);
    
    // Processing state
    this.sampleCount = 0;
    this.previousParams = new Map();
    
    // Metering
    this.meteringInterval = Math.floor(sampleRate / 30); // 30 FPS updates
    this.meteringCounter = 0;
    this.peakLevels = { left: 0, right: 0 };
    this.rmsLevels = { left: 0, right: 0 };
    this.rmsAccumulators = { left: 0, right: 0 };
    
    // Performance monitoring
    this.performanceCounter = 0;
    this.processingTime = 0;
    this.maxProcessingTime = 0;
    
    // Message handling
    this.port.onmessage = (event) => {
      this.handleMessage(event.data);
    };
    
    console.log('ProfessionalAudioProcessorWorklet initialized');
  }

  handleMessage(data) {
    const { type, payload } = data;
    
    switch (type) {
      case 'setEffectParameter':
        this.setEffectParameter(payload.effect, payload.parameter, payload.value);
        break;
        
      case 'getMetering':
        this.sendMeteringData();
        break;
        
      case 'getPerformanceStats':
        this.sendPerformanceStats();
        break;
        
      case 'resetEffect':
        this.resetEffect(payload.effect);
        break;
        
      default:
        console.warn('Unknown message type:', type);
    }
  }

  setEffectParameter(effect, parameter, value) {
    switch (effect) {
      case 'eq':
        this.eq.setParameter(parameter, value);
        break;
      case 'compressor':
        this.compressor.setParameter(parameter, value);
        break;
      case 'reverb':
        this.reverb.setParameter(parameter, value);
        break;
      case 'delay':
        this.delay.setParameter(parameter, value);
        break;
    }
  }

  resetEffect(effect) {
    // Reset effect to default state
    switch (effect) {
      case 'eq':
        this.eq = new ParametricEQWorklet(sampleRate);
        break;
      case 'compressor':
        this.compressor = new CompressorWorklet(sampleRate);
        break;
      case 'reverb':
        this.reverb = new ReverbWorklet(sampleRate);
        break;
      case 'delay':
        this.delay = new DelayWorklet(sampleRate);
        break;
    }
  }

  process(inputs, outputs, parameters) {
    const startTime = performance.now();
    
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !output || input.length === 0 || output.length === 0) {
      return true;
    }
    
    const inputLeft = input[0];
    const inputRight = input[1] || input[0]; // Mono to stereo if needed
    const outputLeft = output[0];
    const outputRight = output[1];
    
    const frameLength = inputLeft.length;
    
    // Update parameters
    this.updateParameters(parameters);
    
    // Process each sample
    for (let i = 0; i < frameLength; i++) {
      let leftSample = inputLeft[i];
      let rightSample = inputRight[i];
      
      // Master mute check
      if (parameters.masterMute[0] > 0.5) {
        outputLeft[i] = 0;
        outputRight[i] = 0;
        continue;
      }
      
      // Process through effects chain
      // 1. EQ (first in chain)
      if (parameters.eqBypass[0] < 0.5) {
        [leftSample, rightSample] = this.eq.process(leftSample, rightSample, this.sampleCount + i);
      }
      
      // 2. Compressor
      if (parameters.compBypass[0] < 0.5) {
        [leftSample, rightSample] = this.compressor.process(leftSample, rightSample, this.sampleCount + i);
      }
      
      // 3. Delay (before reverb for cleaner sound)
      if (parameters.delayBypass[0] < 0.5) {
        [leftSample, rightSample] = this.delay.process(leftSample, rightSample, this.sampleCount + i);
      }
      
      // 4. Reverb (last in chain)
      if (parameters.reverbBypass[0] < 0.5) {
        [leftSample, rightSample] = this.reverb.process(leftSample, rightSample, this.sampleCount + i);
      }
      
      // Apply master gain and pan
      const gain = parameters.masterGain[0];
      const pan = parameters.masterPan[0];
      
      // Pan calculation (constant power)
      const leftGain = gain * Math.cos((pan + 1) * Math.PI / 4);
      const rightGain = gain * Math.sin((pan + 1) * Math.PI / 4);
      
      leftSample *= leftGain;
      rightSample *= rightGain;
      
      // Update metering
      this.updateMetering(leftSample, rightSample);
      
      // Write to output
      outputLeft[i] = leftSample;
      outputRight[i] = rightSample;
    }
    
    this.sampleCount += frameLength;
    
    // Performance monitoring
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    this.processingTime += processingTime;
    this.maxProcessingTime = Math.max(this.maxProcessingTime, processingTime);
    this.performanceCounter++;
    
    // Send periodic updates
    if (this.performanceCounter % 1000 === 0) {
      this.sendPerformanceStats();
    }
    
    return true;
  }

  updateParameters(parameters) {
    // Update EQ parameters
    Object.entries(parameters).forEach(([key, values]) => {
      const value = values[0];
      const previousValue = this.previousParams.get(key);
      
      if (value !== previousValue) {
        this.previousParams.set(key, value);
        
        if (key.startsWith('eq')) {
          const param = key.substring(2).toLowerCase();
          this.eq.setParameter(param, value);
        } else if (key.startsWith('comp')) {
          const param = key.substring(4).toLowerCase();
          this.compressor.setParameter(param, value);
        } else if (key.startsWith('reverb')) {
          const param = key.substring(6).toLowerCase();
          this.reverb.setParameter(param, value);
        } else if (key.startsWith('delay')) {
          const param = key.substring(5).toLowerCase();
          this.delay.setParameter(param, value);
        }
      }
    });
  }

  updateMetering(leftSample, rightSample) {
    // Update peak levels
    this.peakLevels.left = Math.max(this.peakLevels.left, Math.abs(leftSample));
    this.peakLevels.right = Math.max(this.peakLevels.right, Math.abs(rightSample));
    
    // Accumulate RMS
    this.rmsAccumulators.left += leftSample * leftSample;
    this.rmsAccumulators.right += rightSample * rightSample;
    
    this.meteringCounter++;
    
    // Send metering data at regular intervals
    if (this.meteringCounter >= this.meteringInterval) {
      this.sendMeteringData();
      this.resetMetering();
    }
  }

  sendMeteringData() {
    const rmsLeft = Math.sqrt(this.rmsAccumulators.left / this.meteringCounter);
    const rmsRight = Math.sqrt(this.rmsAccumulators.right / this.meteringCounter);
    
    this.port.postMessage({
      type: 'metering',
      data: {
        peak: {
          left: this.peakLevels.left,
          right: this.peakLevels.right
        },
        rms: {
          left: rmsLeft,
          right: rmsRight
        },
        compressorGR: this.compressor.getGainReductionMeter ? this.compressor.getGainReductionMeter() : 0
      }
    });
  }

  resetMetering() {
    this.peakLevels.left = this.peakLevels.right = 0;
    this.rmsAccumulators.left = this.rmsAccumulators.right = 0;
    this.meteringCounter = 0;
  }

  sendPerformanceStats() {
    const avgProcessingTime = this.processingTime / this.performanceCounter;
    const cpuUsage = (avgProcessingTime / (128 / sampleRate * 1000)) * 100; // Assuming 128 sample buffer
    
    this.port.postMessage({
      type: 'performance',
      data: {
        averageProcessingTime: avgProcessingTime,
        maxProcessingTime: this.maxProcessingTime,
        cpuUsage: cpuUsage,
        sampleCount: this.sampleCount
      }
    });
    
    // Reset performance counters
    this.processingTime = 0;
    this.maxProcessingTime = 0;
    this.performanceCounter = 0;
  }
}

// Register the processor
registerProcessor('professional-audio-processor', ProfessionalAudioProcessorWorklet);