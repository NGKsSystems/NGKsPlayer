/**
 * Compressor AudioWorklet
 * 
 * Professional dynamics processor with look-ahead capability.
 * Features smooth gain reduction, automatic makeup gain, and stereo linking.
 */

class CompressorWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    
    // Default parameters
    this.params = {
      threshold: parameters.threshold || -12, // dB
      ratio: parameters.ratio || 4.0,
      attack: parameters.attack || 0.003, // seconds
      release: parameters.release || 0.1, // seconds
      knee: parameters.knee || 2.0, // dB
      makeupGain: parameters.makeupGain || 0, // dB
      autoGain: parameters.autoGain || false,
      stereoLink: parameters.stereoLink || true,
      bypass: false
    };
    
    // Processing state
    this.envelope = 0; // RMS envelope for level detection
    this.gainReduction = 0; // Current gain reduction in dB
    this.smoothedGR = 0; // Smoothed gain reduction for display
    
    // Look-ahead delay line (for zero-latency feel)
    this.lookAheadSamples = Math.floor(sampleRate * 0.005); // 5ms look-ahead
    this.delayBuffer = {
      left: new Float32Array(this.lookAheadSamples),
      right: new Float32Array(this.lookAheadSamples)
    };
    this.delayIndex = 0;
    
    // Attack/release time constants
    this.updateTimeConstants();
    
    // RMS detection window
    this.rmsWindowSize = Math.floor(sampleRate * 0.001); // 1ms RMS window
    this.rmsBuffer = new Float32Array(this.rmsWindowSize);
    this.rmsIndex = 0;
    this.rmsSum = 0;
    
    // Auto gain calculation
    this.inputLevel = new MovingAverage(sampleRate * 0.1); // 100ms average
    this.outputLevel = new MovingAverage(sampleRate * 0.1);
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
    // Convert time constants to per-sample coefficients
    this.attackCoeff = this.params.attack > 0 
      ? Math.exp(-1.0 / (this.params.attack * this.sampleRate))
      : 0;
      
    this.releaseCoeff = this.params.release > 0
      ? Math.exp(-1.0 / (this.params.release * this.sampleRate))
      : 0;
  }

  process(leftSample, rightSample, sampleIndex) {
    if (this.params.bypass) {
      return [leftSample, rightSample];
    }
    
    // Store delayed samples
    const delayedLeft = this.delayBuffer.left[this.delayIndex];
    const delayedRight = this.delayBuffer.right[this.delayIndex];
    
    this.delayBuffer.left[this.delayIndex] = leftSample;
    this.delayBuffer.right[this.delayIndex] = rightSample;
    this.delayIndex = (this.delayIndex + 1) % this.lookAheadSamples;
    
    // Level detection - use current samples for detection
    let detectionLevel;
    if (this.params.stereoLink) {
      // Use maximum of left/right for stereo linking
      detectionLevel = Math.max(Math.abs(leftSample), Math.abs(rightSample));
    } else {
      // Use RMS of both channels
      const rms = Math.sqrt((leftSample * leftSample + rightSample * rightSample) / 2);
      detectionLevel = rms;
    }
    
    // Update RMS envelope
    this.updateRMSEnvelope(detectionLevel);
    
    // Convert to dB
    const levelDb = this.envelope > 0 ? 20 * Math.log10(this.envelope) : -96;
    
    // Calculate gain reduction
    const targetGR = this.calculateGainReduction(levelDb);
    
    // Smooth gain reduction changes
    const coeff = targetGR < this.gainReduction ? this.attackCoeff : this.releaseCoeff;
    this.gainReduction = targetGR + (this.gainReduction - targetGR) * coeff;
    
    // Apply gain reduction to delayed samples
    const gainLinear = Math.pow(10, (this.gainReduction + this.params.makeupGain) / 20);
    
    const outputLeft = delayedLeft * gainLinear;
    const outputRight = delayedRight * gainLinear;
    
    // Update levels for auto gain
    if (this.params.autoGain) {
      this.inputLevel.update(Math.abs(delayedLeft) + Math.abs(delayedRight));
      this.outputLevel.update(Math.abs(outputLeft) + Math.abs(outputRight));
    }
    
    // Update smoothed gain reduction for metering
    this.smoothedGR = this.smoothedGR * 0.99 + Math.abs(this.gainReduction) * 0.01;
    
    return [outputLeft, outputRight];
  }

  updateRMSEnvelope(sample) {
    // Remove old sample from RMS calculation
    const oldSample = this.rmsBuffer[this.rmsIndex];
    this.rmsSum -= oldSample * oldSample;
    
    // Add new sample
    const newSample = sample;
    this.rmsBuffer[this.rmsIndex] = newSample;
    this.rmsSum += newSample * newSample;
    
    this.rmsIndex = (this.rmsIndex + 1) % this.rmsWindowSize;
    
    // Update envelope
    this.envelope = Math.sqrt(this.rmsSum / this.rmsWindowSize);
  }

  calculateGainReduction(levelDb) {
    const threshold = this.params.threshold;
    const ratio = this.params.ratio;
    const knee = this.params.knee;
    
    if (levelDb <= threshold - knee / 2) {
      // Below threshold
      return 0;
    } else if (levelDb >= threshold + knee / 2) {
      // Above threshold + knee
      const overThreshold = levelDb - threshold;
      return -(overThreshold - overThreshold / ratio);
    } else {
      // In knee region - apply soft knee curve
      const kneeInput = levelDb - threshold + knee / 2;
      const kneeRatio = kneeInput / knee;
      const kneeGain = kneeRatio * kneeRatio;
      const overThreshold = kneeInput - knee / 2;
      return -(kneeGain * (overThreshold - overThreshold / ratio));
    }
  }

  getGainReductionMeter() {
    return this.smoothedGR;
  }

  getAutoMakeupGain() {
    if (!this.params.autoGain) return 0;
    
    const inputAvg = this.inputLevel.getValue();
    const outputAvg = this.outputLevel.getValue();
    
    if (inputAvg > 0 && outputAvg > 0) {
      const ratio = inputAvg / outputAvg;
      return 20 * Math.log10(ratio);
    }
    
    return 0;
  }
}

/**
 * Moving Average Utility Class
 * 
 * Calculates a moving average over a specified window size.
 */
class MovingAverage {
  constructor(windowSize) {
    this.windowSize = Math.floor(windowSize);
    this.buffer = new Float32Array(this.windowSize);
    this.index = 0;
    this.sum = 0;
    this.count = 0;
  }

  update(value) {
    // Remove old value
    if (this.count >= this.windowSize) {
      this.sum -= this.buffer[this.index];
    } else {
      this.count++;
    }
    
    // Add new value
    this.buffer[this.index] = value;
    this.sum += value;
    
    this.index = (this.index + 1) % this.windowSize;
  }

  getValue() {
    return this.count > 0 ? this.sum / this.count : 0;
  }

  reset() {
    this.buffer.fill(0);
    this.index = 0;
    this.sum = 0;
    this.count = 0;
  }
}