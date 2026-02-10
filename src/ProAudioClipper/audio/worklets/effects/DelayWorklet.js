/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DelayWorklet.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Delay AudioWorklet
 * 
 * Multi-tap delay processor with tempo sync, feedback, and modulation.
 * Supports ping-pong stereo delays and high-quality interpolation.
 */

class DelayWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    
    // Default parameters
    this.params = {
      delayTime: parameters.delayTime || 0.25, // seconds
      feedback: parameters.feedback || 0.3, // 0-0.95
      wetLevel: parameters.wetLevel || 0.3, // 0-1
      dryLevel: parameters.dryLevel || 0.7, // 0-1
      highCut: parameters.highCut || 8000, // Hz
      lowCut: parameters.lowCut || 100, // Hz
      pingPong: parameters.pingPong || false,
      tempoSync: parameters.tempoSync || false,
      bpm: parameters.bpm || 120,
      noteValue: parameters.noteValue || 4, // 1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth
      modRate: parameters.modRate || 0.5, // Hz
      modDepth: parameters.modDepth || 0, // 0-1
      bypass: false
    };
    
    // Maximum delay time: 2 seconds
    this.maxDelayTime = 2.0;
    this.maxDelaySamples = Math.floor(this.maxDelayTime * sampleRate);
    
    // Delay buffers
    this.delayBuffer = {
      left: new Float32Array(this.maxDelaySamples),
      right: new Float32Array(this.maxDelaySamples)
    };
    
    this.writeIndex = 0;
    
    // Feedback filters (one-pole highpass and lowpass)
    this.feedbackFilters = {
      left: new FeedbackFilter(sampleRate),
      right: new FeedbackFilter(sampleRate)
    };
    
    // LFO for modulation
    this.lfo = new LFO(sampleRate);
    
    // Cross-feedback for ping-pong
    this.crossFeedback = {
      left: 0,
      right: 0
    };
    
    this.updateFilters();
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
      
      if (param === 'highCut' || param === 'lowCut') {
        this.updateFilters();
      } else if (param === 'modRate') {
        this.lfo.setFrequency(value);
      }
    }
  }

  updateFilters() {
    this.feedbackFilters.left.setHighCut(this.params.highCut);
    this.feedbackFilters.left.setLowCut(this.params.lowCut);
    this.feedbackFilters.right.setHighCut(this.params.highCut);
    this.feedbackFilters.right.setLowCut(this.params.lowCut);
  }

  getDelayTimeInSamples() {
    let delayTime = this.params.delayTime;
    
    if (this.params.tempoSync) {
      // Calculate delay time from BPM and note value
      const beatTime = 60.0 / this.params.bpm; // Time of one quarter note
      const noteTime = beatTime * (4.0 / this.params.noteValue);
      delayTime = noteTime;
    }
    
    // Apply modulation
    const lfoValue = this.lfo.getValue();
    const modulation = lfoValue * this.params.modDepth * 0.05; // Max 5% modulation
    delayTime = delayTime * (1.0 + modulation);
    
    // Clamp to valid range
    delayTime = Math.max(0.001, Math.min(delayTime, this.maxDelayTime));
    
    return delayTime * this.sampleRate;
  }

  process(leftSample, rightSample, sampleIndex) {
    if (this.params.bypass) {
      return [leftSample, rightSample];
    }
    
    // Update LFO
    this.lfo.update();
    
    // Calculate delay time in samples
    const delaySamples = this.getDelayTimeInSamples();
    
    // Read delayed samples with interpolation
    const delayedLeft = this.readDelayedSample(this.delayBuffer.left, delaySamples);
    const delayedRight = this.readDelayedSample(this.delayBuffer.right, delaySamples);
    
    // Apply feedback filtering
    const filteredLeft = this.feedbackFilters.left.process(delayedLeft);
    const filteredRight = this.feedbackFilters.right.process(delayedRight);
    
    // Calculate feedback signals
    let feedbackLeft, feedbackRight;
    
    if (this.params.pingPong) {
      // Ping-pong mode: cross-feed the channels
      feedbackLeft = filteredRight * this.params.feedback + this.crossFeedback.left;
      feedbackRight = filteredLeft * this.params.feedback + this.crossFeedback.right;
      
      // Update cross-feedback for next sample
      this.crossFeedback.left = filteredLeft * this.params.feedback * 0.7;
      this.crossFeedback.right = filteredRight * this.params.feedback * 0.7;
    } else {
      // Normal mode: same-channel feedback
      feedbackLeft = filteredLeft * this.params.feedback;
      feedbackRight = filteredRight * this.params.feedback;
    }
    
    // Write new samples to delay buffer
    this.delayBuffer.left[this.writeIndex] = leftSample + feedbackLeft;
    this.delayBuffer.right[this.writeIndex] = rightSample + feedbackRight;
    
    // Advance write pointer
    this.writeIndex = (this.writeIndex + 1) % this.maxDelaySamples;
    
    // Mix dry and wet signals
    const outputLeft = leftSample * this.params.dryLevel + delayedLeft * this.params.wetLevel;
    const outputRight = rightSample * this.params.dryLevel + delayedRight * this.params.wetLevel;
    
    return [outputLeft, outputRight];
  }

  readDelayedSample(buffer, delaySamples) {
    // Calculate read position with fractional part
    const readPos = this.writeIndex - delaySamples;
    const readIndex = Math.floor(readPos);
    const fraction = readPos - readIndex;
    
    // Wrap indices
    const index1 = ((readIndex % this.maxDelaySamples) + this.maxDelaySamples) % this.maxDelaySamples;
    const index2 = (index1 + 1) % this.maxDelaySamples;
    
    // Linear interpolation
    const sample1 = buffer[index1];
    const sample2 = buffer[index2];
    
    return sample1 + fraction * (sample2 - sample1);
  }
}

/**
 * Feedback Filter
 * 
 * Combines high-cut and low-cut filters for feedback path processing.
 */
class FeedbackFilter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.nyquist = sampleRate / 2;
    
    // One-pole filter states
    this.lowpassState = 0;
    this.highpassState = 0;
    
    // Filter coefficients
    this.lowpassCoeff = 1;
    this.highpassCoeff = 0;
  }

  setHighCut(frequency) {
    // One-pole lowpass filter
    const omega = 2 * Math.PI * frequency / this.sampleRate;
    this.lowpassCoeff = Math.exp(-omega);
  }

  setLowCut(frequency) {
    // One-pole highpass filter
    const omega = 2 * Math.PI * frequency / this.sampleRate;
    this.highpassCoeff = Math.exp(-omega);
  }

  process(input) {
    // Apply lowpass (high-cut)
    this.lowpassState = input + (this.lowpassState - input) * this.lowpassCoeff;
    let output = this.lowpassState;
    
    // Apply highpass (low-cut)
    this.highpassState = output + (this.highpassState - output) * this.highpassCoeff;
    output = output - this.highpassState;
    
    return output;
  }
}

/**
 * Low Frequency Oscillator
 * 
 * Sine wave generator for delay time modulation.
 */
class LFO {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.phaseIncrement = 0;
    this.setFrequency(0.5); // Default 0.5 Hz
  }

  setFrequency(frequency) {
    this.phaseIncrement = (2 * Math.PI * frequency) / this.sampleRate;
  }

  update() {
    this.phase += this.phaseIncrement;
    if (this.phase >= 2 * Math.PI) {
      this.phase -= 2 * Math.PI;
    }
  }

  getValue() {
    return Math.sin(this.phase);
  }
}
