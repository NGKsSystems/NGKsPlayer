/**
 * Reverb AudioWorklet
 * 
 * High-quality reverb processor using Freeverb algorithm with multiple
 * comb filters and allpass filters for realistic spatial simulation.
 */

class ReverbWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    
    // Default parameters
    this.params = {
      roomSize: parameters.roomSize || 0.5, // 0-1
      damping: parameters.damping || 0.5, // 0-1 (high frequency damping)
      wetLevel: parameters.wetLevel || 0.3, // 0-1
      dryLevel: parameters.dryLevel || 0.7, // 0-1
      width: parameters.width || 1.0, // 0-1 (stereo width)
      preDelay: parameters.preDelay || 0.02, // seconds
      bypass: false
    };
    
    // Freeverb constants
    this.numCombs = 8;
    this.numAllpasses = 4;
    this.muted = 0.015; // Wet gain scaling
    this.fixedGain = 0.015;
    this.scaleWet = 3.0;
    this.scaleDamp = 0.4;
    this.scaleRoom = 0.28;
    this.offsetRoom = 0.7;
    
    // Comb filter delays (in samples)
    this.combTuning = [
      1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617
    ].map(delay => Math.floor(delay * sampleRate / 44100));
    
    // Allpass filter delays (in samples)
    this.allpassTuning = [
      556, 441, 341, 225
    ].map(delay => Math.floor(delay * sampleRate / 44100));
    
    // Initialize filters
    this.combFilters = {
      left: [],
      right: []
    };
    
    this.allpassFilters = {
      left: [],
      right: []
    };
    
    // Create comb filters
    for (let i = 0; i < this.numCombs; i++) {
      const leftDelay = this.combTuning[i];
      const rightDelay = leftDelay + Math.floor(23 + i * 7); // Slight offset for stereo
      
      this.combFilters.left.push(new CombFilter(leftDelay));
      this.combFilters.right.push(new CombFilter(rightDelay));
    }
    
    // Create allpass filters
    for (let i = 0; i < this.numAllpasses; i++) {
      const leftDelay = this.allpassTuning[i];
      const rightDelay = leftDelay + Math.floor(23 + i * 7); // Slight offset for stereo
      
      this.allpassFilters.left.push(new AllpassFilter(leftDelay));
      this.allpassFilters.right.push(new AllpassFilter(rightDelay));
    }
    
    // Pre-delay buffer
    this.preDelaySize = Math.floor(sampleRate * 0.1); // Max 100ms pre-delay
    this.preDelayBuffer = {
      left: new Float32Array(this.preDelaySize),
      right: new Float32Array(this.preDelaySize)
    };
    this.preDelayIndex = 0;
    
    this.updateParameters();
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
      this.updateParameters();
    }
  }

  updateParameters() {
    const roomSize = this.params.roomSize * this.scaleRoom + this.offsetRoom;
    const damping = this.params.damping * this.scaleDamp;
    
    // Update all comb filters
    for (let i = 0; i < this.numCombs; i++) {
      this.combFilters.left[i].setFeedback(roomSize);
      this.combFilters.left[i].setDamping(damping);
      this.combFilters.right[i].setFeedback(roomSize);
      this.combFilters.right[i].setDamping(damping);
    }
    
    // Update all allpass filters
    for (let i = 0; i < this.numAllpasses; i++) {
      this.allpassFilters.left[i].setFeedback(0.5);
      this.allpassFilters.right[i].setFeedback(0.5);
    }
  }

  process(leftSample, rightSample, sampleIndex) {
    if (this.params.bypass) {
      return [leftSample, rightSample];
    }
    
    // Apply pre-delay
    const preDelayIndex = Math.floor(this.params.preDelay * this.sampleRate);
    const preDelayPos = (this.preDelayIndex - preDelayIndex + this.preDelaySize) % this.preDelaySize;
    
    const delayedLeft = this.preDelayBuffer.left[preDelayPos];
    const delayedRight = this.preDelayBuffer.right[preDelayPos];
    
    this.preDelayBuffer.left[this.preDelayIndex] = leftSample;
    this.preDelayBuffer.right[this.preDelayIndex] = rightSample;
    this.preDelayIndex = (this.preDelayIndex + 1) % this.preDelaySize;
    
    // Input mix for reverb processing
    const inputMix = (delayedLeft + delayedRight) * this.fixedGain;
    
    // Process through comb filters
    let combOutputLeft = 0;
    let combOutputRight = 0;
    
    for (let i = 0; i < this.numCombs; i++) {
      combOutputLeft += this.combFilters.left[i].process(inputMix);
      combOutputRight += this.combFilters.right[i].process(inputMix);
    }
    
    // Process through allpass filters
    let reverbLeft = combOutputLeft;
    let reverbRight = combOutputRight;
    
    for (let i = 0; i < this.numAllpasses; i++) {
      reverbLeft = this.allpassFilters.left[i].process(reverbLeft);
      reverbRight = this.allpassFilters.right[i].process(reverbRight);
    }
    
    // Apply stereo width
    const mono = (reverbLeft + reverbRight) * 0.5;
    const stereo = (reverbRight - reverbLeft) * this.params.width;
    
    reverbLeft = mono - stereo * 0.5;
    reverbRight = mono + stereo * 0.5;
    
    // Final mix
    const wetGain = this.params.wetLevel * this.scaleWet;
    const dryGain = this.params.dryLevel;
    
    const outputLeft = delayedLeft * dryGain + reverbLeft * wetGain;
    const outputRight = delayedRight * dryGain + reverbRight * wetGain;
    
    return [outputLeft, outputRight];
  }
}

/**
 * Comb Filter Implementation
 * 
 * Feedback delay line with damping for natural sounding decay.
 */
class CombFilter {
  constructor(delaySize) {
    this.delaySize = delaySize;
    this.buffer = new Float32Array(delaySize);
    this.index = 0;
    this.feedback = 0;
    this.filterStore = 0;
    this.damping1 = 0;
    this.damping2 = 0;
  }

  setFeedback(value) {
    this.feedback = value;
  }

  setDamping(value) {
    this.damping1 = value;
    this.damping2 = 1 - value;
  }

  process(input) {
    const output = this.buffer[this.index];
    
    // One-pole lowpass filter for damping
    this.filterStore = output * this.damping2 + this.filterStore * this.damping1;
    
    this.buffer[this.index] = input + this.filterStore * this.feedback;
    this.index = (this.index + 1) % this.delaySize;
    
    return output;
  }
}

/**
 * Allpass Filter Implementation
 * 
 * Creates dense early reflections and diffusion.
 */
class AllpassFilter {
  constructor(delaySize) {
    this.delaySize = delaySize;
    this.buffer = new Float32Array(delaySize);
    this.index = 0;
    this.feedback = 0.5;
  }

  setFeedback(value) {
    this.feedback = value;
  }

  process(input) {
    const delayedSample = this.buffer[this.index];
    const output = -input + delayedSample;
    
    this.buffer[this.index] = input + delayedSample * this.feedback;
    this.index = (this.index + 1) % this.delaySize;
    
    return output;
  }
}