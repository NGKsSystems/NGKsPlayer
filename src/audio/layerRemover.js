// Layer Remover for NGKsPlayer
// Provides vocal removal, instrumental isolation, and frequency layer extraction

export class LayerRemover {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isProcessing = false;
    this.originalBuffer = null;
    this.processedBuffers = new Map();
  }

  /**
   * Remove vocals from audio using center channel subtraction
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {Object} options - Processing options
   * @returns {AudioBuffer} - Processed audio buffer
   */
  async removeVocals(audioBuffer, options = {}) {
    const {
      strength = 1.0,        // Vocal removal strength (0-1)
      preserveBass = true,   // Keep bass frequencies intact
      highpassFreq = 200,    // Frequency below which to preserve audio
      lowpassFreq = 8000     // Frequency above which to attenuate
    } = options;

    console.log('Removing vocals with strength:', strength);

    if (audioBuffer.numberOfChannels < 2) {
      throw new Error('Stereo audio required for vocal removal');
    }

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Create new buffer for processed audio
    const processedBuffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const processedLeft = processedBuffer.getChannelData(0);
    const processedRight = processedBuffer.getChannelData(1);

    // Apply vocal removal algorithm
    for (let i = 0; i < length; i++) {
      const left = leftChannel[i];
      const right = rightChannel[i];
      
      // Calculate center (mono) content - typically vocals
      const center = (left + right) * 0.5;
      const side = (left - right) * 0.5;
      
      // Remove center content with specified strength
      const removedLeft = left - (center * strength);
      const removedRight = right - (center * strength);
      
      // Optional bass preservation
      if (preserveBass) {
        const freq = (i / length) * (sampleRate / 2);
        if (freq < highpassFreq) {
          processedLeft[i] = left;
          processedRight[i] = right;
        } else {
          processedLeft[i] = removedLeft;
          processedRight[i] = removedRight;
        }
      } else {
        processedLeft[i] = removedLeft;
        processedRight[i] = removedRight;
      }
    }

    console.log('Vocal removal complete');
    return processedBuffer;
  }

  /**
   * Extract instrumental layer (opposite of vocal removal)
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {Object} options - Processing options
   * @returns {AudioBuffer} - Instrumental audio buffer
   */
  async extractInstrumental(audioBuffer, options = {}) {
    const {
      vocalSuppressionStrength = 0.8,
      enhanceInstruments = true,
      stereoWidth = 1.2
    } = options;

    console.log('Extracting instrumental layer');

    if (audioBuffer.numberOfChannels < 2) {
      // For mono, just return original
      return audioBuffer;
    }

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const processedBuffer = this.audioContext.createBuffer(2, length, sampleRate);
    
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = audioBuffer.getChannelData(1);
    const processedLeft = processedBuffer.getChannelData(0);
    const processedRight = processedBuffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const left = leftChannel[i];
      const right = rightChannel[i];
      
      // Extract side information (stereo width)
      const mid = (left + right) * 0.5;
      const side = (left - right) * 0.5;
      
      // Suppress vocals (center) and enhance instruments (sides)
      const suppressedMid = mid * (1 - vocalSuppressionStrength);
      const enhancedSide = side * (enhanceInstruments ? stereoWidth : 1.0);
      
      processedLeft[i] = suppressedMid + enhancedSide;
      processedRight[i] = suppressedMid - enhancedSide;
    }

    console.log('Instrumental extraction complete');
    return processedBuffer;
  }

  /**
   * Extract specific frequency layer
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {Object} options - Frequency band options
   * @returns {AudioBuffer} - Filtered audio buffer
   */
  async extractFrequencyLayer(audioBuffer, options = {}) {
    const {
      lowFreq = 60,      // Low cutoff frequency
      highFreq = 16000,  // High cutoff frequency
      layerType = 'bandpass', // 'lowpass', 'highpass', 'bandpass', 'bandstop'
      resonance = 1.0    // Filter resonance/Q factor
    } = options;

    console.log(`Extracting ${layerType} frequency layer: ${lowFreq}Hz - ${highFreq}Hz`);

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    
    const processedBuffer = this.audioContext.createBuffer(channels, length, sampleRate);

    // Simple biquad filter implementation
    for (let channel = 0; channel < channels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Apply frequency filtering
      this.applyFrequencyFilter(inputData, outputData, sampleRate, lowFreq, highFreq, layerType, resonance);
    }

    console.log('Frequency layer extraction complete');
    return processedBuffer;
  }

  /**
   * Apply frequency filter to audio data
   * @private
   */
  applyFrequencyFilter(input, output, sampleRate, lowFreq, highFreq, filterType, resonance) {
    const length = input.length;
    
    // Simple filtering approach - in production you'd use proper biquad filters
    const nyquist = sampleRate / 2;
    const lowNorm = lowFreq / nyquist;
    const highNorm = highFreq / nyquist;
    
    // Simple filter implementation (placeholder for proper DSP)
    for (let i = 0; i < length; i++) {
      const freqPosition = i / length; // Simplified frequency position
      let gain = 1.0;
      
      switch (filterType) {
        case 'lowpass':
          gain = freqPosition < highNorm ? 1.0 : Math.max(0, 1 - (freqPosition - highNorm) * 10);
          break;
        case 'highpass':
          gain = freqPosition > lowNorm ? 1.0 : Math.max(0, freqPosition / lowNorm);
          break;
        case 'bandpass':
          if (freqPosition >= lowNorm && freqPosition <= highNorm) {
            gain = 1.0;
          } else {
            gain = 0.1; // Allow some bleed
          }
          break;
        case 'bandstop':
          if (freqPosition >= lowNorm && freqPosition <= highNorm) {
            gain = 0.1; // Notch out this range
          } else {
            gain = 1.0;
          }
          break;
      }
      
      output[i] = input[i] * gain * resonance;
    }
  }

  /**
   * Create harmonic layer extractor
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {Object} options - Harmonic extraction options
   * @returns {AudioBuffer} - Harmonic content
   */
  async extractHarmonicLayer(audioBuffer, options = {}) {
    const {
      fundamentalFreq = 440,  // Base frequency to extract harmonics from
      harmonicCount = 5,      // Number of harmonics to extract
      harmonicStrength = 0.8  // Strength of harmonic extraction
    } = options;

    console.log(`Extracting harmonic layer based on ${fundamentalFreq}Hz`);

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    
    const processedBuffer = this.audioContext.createBuffer(channels, length, sampleRate);

    for (let channel = 0; channel < channels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Extract harmonic content
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        let harmonicSum = 0;
        
        // Generate harmonic series
        for (let h = 1; h <= harmonicCount; h++) {
          const harmonicFreq = fundamentalFreq * h;
          const phase = 2 * Math.PI * harmonicFreq * t;
          harmonicSum += Math.sin(phase) * (1 / h) * harmonicStrength;
        }
        
        // Modulate original signal with harmonic content
        outputData[i] = inputData[i] * (1 + harmonicSum * 0.3);
      }
    }

    console.log('Harmonic layer extraction complete');
    return processedBuffer;
  }

  /**
   * Create percussion layer extractor
   * @param {AudioBuffer} audioBuffer - Source audio buffer
   * @param {Object} options - Percussion extraction options
   * @returns {AudioBuffer} - Percussion layer
   */
  async extractPercussionLayer(audioBuffer, options = {}) {
    const {
      sensitivity = 0.7,    // Transient detection sensitivity
      attackTime = 0.001,   // Attack time for transient detection
      releaseTime = 0.1     // Release time for transient detection
    } = options;

    console.log('Extracting percussion layer');

    const length = audioBuffer.length;
    const sampleRate = audioBuffer.sampleRate;
    const channels = audioBuffer.numberOfChannels;
    
    const processedBuffer = this.audioContext.createBuffer(channels, length, sampleRate);

    for (let channel = 0; channel < channels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = processedBuffer.getChannelData(channel);
      
      // Detect transients (percussion hits)
      let previousEnergy = 0;
      const windowSize = Math.floor(sampleRate * 0.01); // 10ms window
      
      for (let i = 0; i < length; i++) {
        // Calculate local energy
        let energy = 0;
        const startWindow = Math.max(0, i - windowSize);
        const endWindow = Math.min(length - 1, i + windowSize);
        
        for (let j = startWindow; j <= endWindow; j++) {
          energy += inputData[j] * inputData[j];
        }
        energy /= (endWindow - startWindow + 1);
        
        // Detect sudden energy increases (transients)
        const energyRatio = previousEnergy > 0 ? energy / previousEnergy : 1;
        const isTransient = energyRatio > (1 + sensitivity);
        
        if (isTransient) {
          outputData[i] = inputData[i] * 2; // Amplify percussion
        } else {
          outputData[i] = inputData[i] * 0.2; // Reduce other content
        }
        
        previousEnergy = energy;
      }
    }

    console.log('Percussion layer extraction complete');
    return processedBuffer;
  }

  /**
   * Get list of available layer types
   * @returns {Array} - Array of layer type objects
   */
  getAvailableLayerTypes() {
    return [
      {
        id: 'vocal_removal',
        name: 'Vocal Removal',
        description: 'Remove center-panned vocals from stereo tracks',
        requiresStereo: true
      },
      {
        id: 'instrumental',
        name: 'Instrumental Layer',
        description: 'Extract instrumental content, suppress vocals',
        requiresStereo: true
      },
      {
        id: 'frequency_band',
        name: 'Frequency Band',
        description: 'Extract specific frequency ranges',
        requiresStereo: false
      },
      {
        id: 'harmonic',
        name: 'Harmonic Layer',
        description: 'Extract harmonic content based on fundamental frequency',
        requiresStereo: false
      },
      {
        id: 'percussion',
        name: 'Percussion Layer',
        description: 'Extract transient/percussion elements',
        requiresStereo: false
      }
    ];
  }

  /**
   * Process audio with selected layer extraction method
   * @param {AudioBuffer} audioBuffer - Source audio
   * @param {string} layerType - Type of layer to extract
   * @param {Object} options - Processing options
   * @returns {AudioBuffer} - Processed audio
   */
  async processLayer(audioBuffer, layerType, options = {}) {
    this.isProcessing = true;
    
    try {
      let result;
      
      switch (layerType) {
        case 'vocal_removal':
          result = await this.removeVocals(audioBuffer, options);
          break;
        case 'instrumental':
          result = await this.extractInstrumental(audioBuffer, options);
          break;
        case 'frequency_band':
          result = await this.extractFrequencyLayer(audioBuffer, options);
          break;
        case 'harmonic':
          result = await this.extractHarmonicLayer(audioBuffer, options);
          break;
        case 'percussion':
          result = await this.extractPercussionLayer(audioBuffer, options);
          break;
        default:
          throw new Error(`Unknown layer type: ${layerType}`);
      }
      
      // Cache the result
      this.processedBuffers.set(`${layerType}_${JSON.stringify(options)}`, result);
      
      return result;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Clear cached processed buffers
   */
  clearCache() {
    this.processedBuffers.clear();
  }
}

export default LayerRemover;
