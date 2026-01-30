/**
 * Professional Audio Processor - Main AudioWorklet
 * 
 * Integrates all professional audio effects in a single high-performance worklet.
 * Provides sample-accurate timing and ultra-low latency processing.
 */

// Effect processors will be included inline for worklet compatibility
// AudioWorklets cannot use ES6 imports, so we include the classes directly

/**
 * Parametric EQ AudioWorklet Processor
 */
class ParametricEQWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    this.nyquist = sampleRate / 2;
    
    // Default parameters
    this.params = {
      highFreq: parameters.highFreq || 8000,
      highGain: parameters.highGain || 0,
      highQ: parameters.highQ || 0.707,
      hmidFreq: parameters.hmidFreq || 2500,
      hmidGain: parameters.hmidGain || 0,
      hmidQ: parameters.hmidQ || 1.0,
      lmidFreq: parameters.lmidFreq || 500,
      lmidGain: parameters.lmidGain || 0,
      lmidQ: parameters.lmidQ || 1.0,
      lowFreq: parameters.lowFreq || 100,
      lowGain: parameters.lowGain || 0,
      lowQ: parameters.lowQ || 0.707,
      bypass: false
    };
    
    // Biquad filter coefficients for each band (L/R channels)
    this.filters = {
      high: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      hmid: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      lmid: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      low: { left: new BiquadCoeffs(), right: new BiquadCoeffs() }
    };
    
    this.updateAllFilters();
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
      
      if (param.startsWith('high')) {
        this.updateFilter('high', 'highShelf');
      } else if (param.startsWith('hmid')) {
        this.updateFilter('hmid', 'peaking');
      } else if (param.startsWith('lmid')) {
        this.updateFilter('lmid', 'peaking');
      } else if (param.startsWith('low')) {
        this.updateFilter('low', 'lowShelf');
      }
    }
  }

  updateAllFilters() {
    this.updateFilter('high', 'highShelf');
    this.updateFilter('hmid', 'peaking');
    this.updateFilter('lmid', 'peaking');
    this.updateFilter('low', 'lowShelf');
  }

  updateFilter(band, type) {
    const freq = this.params[band + 'Freq'];
    const gain = this.params[band + 'Gain'];
    const q = this.params[band + 'Q'];
    
    const w = (2 * Math.PI * freq) / this.sampleRate;
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const A = Math.pow(10, gain / 40);
    const alpha = sinw / (2 * q);
    
    let b0, b1, b2, a0, a1, a2;
    
    switch (type) {
      case 'highShelf':
        {
          const beta = Math.sqrt(A) / q;
          b0 = A * ((A + 1) + (A - 1) * cosw + beta * sinw);
          b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
          b2 = A * ((A + 1) + (A - 1) * cosw - beta * sinw);
          a0 = (A + 1) - (A - 1) * cosw + beta * sinw;
          a1 = 2 * ((A - 1) - (A + 1) * cosw);
          a2 = (A + 1) - (A - 1) * cosw - beta * sinw;
        }
        break;
        
      case 'lowShelf':
        {
          const beta = Math.sqrt(A) / q;
          b0 = A * ((A + 1) - (A - 1) * cosw + beta * sinw);
          b1 = 2 * A * ((A - 1) - (A + 1) * cosw);
          b2 = A * ((A + 1) - (A - 1) * cosw - beta * sinw);
          a0 = (A + 1) + (A - 1) * cosw + beta * sinw;
          a1 = -2 * ((A - 1) + (A + 1) * cosw);
          a2 = (A + 1) + (A - 1) * cosw - beta * sinw;
        }
        break;
        
      case 'peaking':
      default:
        {
          b0 = 1 + alpha * A;
          b1 = -2 * cosw;
          b2 = 1 - alpha * A;
          a0 = 1 + alpha / A;
          a1 = -2 * cosw;
          a2 = 1 - alpha / A;
        }
        break;
    }
    
    this.filters[band].left.setCoeffs(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
    this.filters[band].right.setCoeffs(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
  }

  process(leftSample, rightSample) {
    if (this.bypass) return [leftSample, rightSample];
    
    let leftOut = leftSample;
    let rightOut = rightSample;
    
    leftOut = this.filters.low.left.process(leftOut);
    rightOut = this.filters.low.right.process(rightOut);
    
    leftOut = this.filters.lmid.left.process(leftOut);
    rightOut = this.filters.lmid.right.process(rightOut);
    
    leftOut = this.filters.hmid.left.process(leftOut);
    rightOut = this.filters.hmid.right.process(rightOut);
    
    leftOut = this.filters.high.left.process(leftOut);
    rightOut = this.filters.high.right.process(rightOut);
    
    return [leftOut, rightOut];
  }
}

/**
 * Biquad Filter Coefficients and State
 */
class BiquadCoeffs {
  constructor() {
    this.b0 = 1; this.b1 = 0; this.b2 = 0;
    this.a1 = 0; this.a2 = 0;
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
  }

  setCoeffs(b0, b1, b2, a1, a2) {
    this.b0 = b0; this.b1 = b1; this.b2 = b2;
    this.a1 = a1; this.a2 = a2;
  }

  process(input) {
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                 - this.a1 * this.y1 - this.a2 * this.y2;
    
    this.x2 = this.x1; this.x1 = input;
    this.y2 = this.y1; this.y1 = output;
    
    return output;
  }
}

/**
 * Compressor AudioWorklet (simplified for inline inclusion)
 */
class CompressorWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    this.params = {
      threshold: parameters.threshold || -12,
      ratio: parameters.ratio || 4.0,
      attack: parameters.attack || 0.003,
      release: parameters.release || 0.1,
      bypass: false
    };
    
    this.envelope = 0;
    this.gainReduction = 0;
    this.updateTimeConstants();
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
      if (param === 'attack' || param === 'release') {
        this.updateTimeConstants();
      }
    }
  }

  updateTimeConstants() {
    this.attackCoeff = this.params.attack > 0 
      ? Math.exp(-1.0 / (this.params.attack * this.sampleRate)) : 0;
    this.releaseCoeff = this.params.release > 0
      ? Math.exp(-1.0 / (this.params.release * this.sampleRate)) : 0;
  }

  process(leftSample, rightSample) {
    if (this.params.bypass) return [leftSample, rightSample];
    
    const detectionLevel = Math.max(Math.abs(leftSample), Math.abs(rightSample));
    const levelDb = detectionLevel > 0 ? 20 * Math.log10(detectionLevel) : -96;
    
    let targetGR = 0;
    if (levelDb > this.params.threshold) {
      const overThreshold = levelDb - this.params.threshold;
      targetGR = -(overThreshold - overThreshold / this.params.ratio);
    }
    
    const coeff = targetGR < this.gainReduction ? this.attackCoeff : this.releaseCoeff;
    this.gainReduction = targetGR + (this.gainReduction - targetGR) * coeff;
    
    const gainLinear = Math.pow(10, this.gainReduction / 20);
    
    return [leftSample * gainLinear, rightSample * gainLinear];
  }
}

/**
 * Basic Reverb (simplified for inline inclusion)
 */
class ReverbWorklet {
  constructor(sampleRate, parameters = {}) {
    this.params = {
      wetLevel: parameters.wetLevel || 0.3,
      bypass: false
    };
    
    // Simple delay lines for basic reverb
    this.delayLines = [
      new DelayLine(Math.floor(sampleRate * 0.03)),
      new DelayLine(Math.floor(sampleRate * 0.05)),
      new DelayLine(Math.floor(sampleRate * 0.07))
    ];
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
    }
  }

  process(leftSample, rightSample) {
    if (this.params.bypass) return [leftSample, rightSample];
    
    let reverbSum = 0;
    this.delayLines.forEach(delay => {
      reverbSum += delay.process((leftSample + rightSample) * 0.5) * 0.3;
    });
    
    const wet = reverbSum * this.params.wetLevel;
    const dry = 1 - this.params.wetLevel;
    
    return [
      leftSample * dry + wet,
      rightSample * dry + wet
    ];
  }
}

/**
 * Basic Delay Line
 */
class DelayLine {
  constructor(size) {
    this.buffer = new Float32Array(size);
    this.writeIndex = 0;
    this.feedback = 0.3;
  }

  process(input) {
    const output = this.buffer[this.writeIndex];
    this.buffer[this.writeIndex] = input + output * this.feedback;
    this.writeIndex = (this.writeIndex + 1) % this.buffer.length;
    return output;
  }
}

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
    
    // Processing state
    this.sampleCount = 0;
    this.previousParams = new Map();
    
    // Metering
    this.meteringInterval = Math.floor(sampleRate / 30);
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