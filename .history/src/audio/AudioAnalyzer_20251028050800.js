// AudioAnalyzer.js - BPM and Key detection for audio tracks

class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analysisCache = new Map(); // Cache results by file path
  }

  // Initialize audio context for analysis
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioAnalyzer] Audio context initialized for analysis');
    }
    return this.audioContext;
  }

  // Main analysis function - returns both BPM and Key
  async analyzeTrack(filePath) {
    console.log('[AudioAnalyzer] Starting analysis for:', filePath);

    // Check cache first
    if (this.analysisCache.has(filePath)) {
      console.log('[AudioAnalyzer] Using cached analysis');
      return this.analysisCache.get(filePath);
    }

    try {
      // Load the audio file
      const audioBuffer = await this.loadAudioFile(filePath);
      
      // Analyze BPM and Key in parallel
      const [bpm, key] = await Promise.all([
        this.detectBPM(audioBuffer),
        this.detectKey(audioBuffer)
      ]);

      const result = {
        bpm: Math.round(bpm),
        key: key,
        analyzed: true,
        timestamp: Date.now()
      };

      // Cache the results
      this.analysisCache.set(filePath, result);
      
      console.log('[AudioAnalyzer] Analysis complete:', result);
      return result;
    } catch (error) {
      console.error('[AudioAnalyzer] Analysis failed:', error);
      return {
        bpm: null,
        key: null,
        analyzed: false,
        error: error.message
      };
    }
  }

  // Load audio file into AudioBuffer
  async loadAudioFile(filePath) {
    this.initAudioContext();

    // Convert file path to proper URL
    let audioUrl = filePath;
    if (!filePath.startsWith('http://') && !filePath.startsWith('https://') && !filePath.startsWith('local://')) {
      audioUrl = `local://${filePath}`;
    }

    console.log('[AudioAnalyzer] Fetching audio from:', audioUrl);

    // Fetch the audio file
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log('[AudioAnalyzer] Audio file loaded, size:', arrayBuffer.byteLength);

    // Decode audio data
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    console.log('[AudioAnalyzer] Audio decoded - Duration:', audioBuffer.duration, 'Sample Rate:', audioBuffer.sampleRate);

    return audioBuffer;
  }

  // BPM Detection using autocorrelation and peak detection
  async detectBPM(audioBuffer) {
    console.log('[AudioAnalyzer] Detecting BPM...');

    // Get mono channel data
    const channelData = this.getMonoData(audioBuffer);
    const sampleRate = audioBuffer.sampleRate;

    // Calculate energy envelope with optimized window
    const energyData = this.calculateEnergyEnvelope(channelData, sampleRate);
    
    // Find peaks in energy
    const peaks = this.findPeaks(energyData, sampleRate);
    
    if (peaks.length < 2) {
      console.warn('[AudioAnalyzer] Not enough peaks detected for BPM analysis');
      return 120; // Default fallback
    }

    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Find most common interval using histogram
    const bpm = this.intervalsToTempo(intervals, sampleRate);
    
    console.log('[AudioAnalyzer] BPM detected:', bpm);
    return bpm;
  }

  // Get mono channel data from stereo or mono buffer
  getMonoData(audioBuffer) {
    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const monoData = new Float32Array(length);

    if (channels === 1) {
      monoData.set(audioBuffer.getChannelData(0));
    } else {
      // Mix down to mono
      const leftChannel = audioBuffer.getChannelData(0);
      const rightChannel = audioBuffer.getChannelData(1);
      for (let i = 0; i < length; i++) {
        monoData[i] = (leftChannel[i] + rightChannel[i]) / 2;
      }
    }

    return monoData;
  }

  // Calculate energy envelope using RMS in sliding window
  calculateEnergyEnvelope(channelData, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms window
    const hopSize = Math.floor(windowSize / 4); // 25% overlap
    const energyData = [];

    for (let i = 0; i < channelData.length - windowSize; i += hopSize) {
      let sum = 0;
      for (let j = 0; j < windowSize; j++) {
        const sample = channelData[i + j];
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / windowSize);
      energyData.push(rms);
    }

    return energyData;
  }

  // Find peaks in energy envelope
  findPeaks(energyData, sampleRate) {
    const peaks = [];
    const minPeakDistance = Math.floor((sampleRate * 0.3) / (sampleRate * 0.1 / 4)); // ~300ms minimum between peaks
    
    // Calculate dynamic threshold
    const mean = energyData.reduce((a, b) => a + b, 0) / energyData.length;
    const threshold = mean * 1.5; // 1.5x average energy

    for (let i = 1; i < energyData.length - 1; i++) {
      if (energyData[i] > threshold &&
          energyData[i] > energyData[i - 1] &&
          energyData[i] > energyData[i + 1]) {
        
        // Check minimum distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }

    console.log('[AudioAnalyzer] Found', peaks.length, 'peaks');
    return peaks;
  }

  // Convert intervals to tempo (BPM)
  intervalsToTempo(intervals, sampleRate) {
    const windowSize = sampleRate * 0.1 / 4; // Convert from energy envelope index to samples
    
    // Convert intervals to BPM values
    const bpms = intervals.map(interval => {
      const seconds = (interval * windowSize) / sampleRate;
      return 60 / seconds;
    });

    // Filter to reasonable BPM range (60-180)
    const validBpms = bpms.filter(bpm => bpm >= 60 && bpm <= 180);
    
    if (validBpms.length === 0) {
      // Try doubling/halving to get into range
      const adjustedBpms = bpms.map(bpm => {
        if (bpm < 60) return bpm * 2;
        if (bpm > 180) return bpm / 2;
        return bpm;
      }).filter(bpm => bpm >= 60 && bpm <= 180);
      
      if (adjustedBpms.length === 0) {
        return 120; // Fallback
      }
      return this.findMostCommon(adjustedBpms);
    }

    // Find most common BPM (mode)
    return this.findMostCommon(validBpms);
  }

  // Find most common value in array (with tolerance)
  findMostCommon(values, tolerance = 3) {
    const histogram = new Map();
    
    values.forEach(value => {
      const bucket = Math.round(value / tolerance) * tolerance;
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    });

    let maxCount = 0;
    let mostCommon = 120;

    histogram.forEach((count, value) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = value;
      }
    });

    return mostCommon;
  }

  // Key Detection using chromagram and pitch class profile
  async detectKey(audioBuffer) {
    console.log('[AudioAnalyzer] Detecting musical key...');

    try {
      // Get mono channel data
      const channelData = this.getMonoData(audioBuffer);
      const sampleRate = audioBuffer.sampleRate;

      // Calculate chromagram
      const chromagram = this.calculateChromagram(channelData, sampleRate);
      
      // Sum across time to get pitch class profile
      const pitchClassProfile = this.sumChromagram(chromagram);
      
      // Match against known key profiles
      const key = this.matchKeyProfile(pitchClassProfile);
      
      console.log('[AudioAnalyzer] Key detected:', key);
      return key;
    } catch (error) {
      console.error('[AudioAnalyzer] Key detection failed:', error);
      return null;
    }
  }

  // Calculate chromagram (12-bin pitch class representation)
  calculateChromagram(channelData, sampleRate) {
    const fftSize = 8192;
    const hopSize = 2048;
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
    const chromagram = [];

    // Frequency to pitch class mapping (A440 reference)
    const refFreq = 440; // A4
    const pitchClasses = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    for (let frame = 0; frame < numFrames; frame++) {
      const startIdx = frame * hopSize;
      const frameData = channelData.slice(startIdx, startIdx + fftSize);
      
      // Apply Hann window
      const windowed = this.applyHannWindow(frameData);
      
      // Compute FFT (simplified - using real approximation)
      const spectrum = this.computeSpectrum(windowed, sampleRate);
      
      // Map spectrum to 12 pitch classes
      const pitchClass = new Array(12).fill(0);
      
      for (let bin = 1; bin < spectrum.length; bin++) {
        const freq = (bin * sampleRate) / fftSize;
        if (freq < 60 || freq > 4000) continue; // Focus on musical range
        
        // Convert frequency to pitch class (0-11)
        const pitch = 12 * Math.log2(freq / refFreq);
        const pitchClassIdx = Math.round(pitch) % 12;
        const normalizedIdx = (pitchClassIdx + 12) % 12; // Ensure positive
        
        pitchClass[normalizedIdx] += spectrum[bin];
      }
      
      chromagram.push(pitchClass);
    }

    return chromagram;
  }

  // Apply Hann window to reduce spectral leakage
  applyHannWindow(data) {
    const windowed = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
      const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (data.length - 1)));
      windowed[i] = data[i] * windowValue;
    }
    return windowed;
  }

  // Compute magnitude spectrum (simplified FFT approximation)
  computeSpectrum(data, sampleRate) {
    const n = data.length;
    const spectrum = new Array(n / 2).fill(0);

    // Simplified DFT for magnitude spectrum
    for (let k = 0; k < n / 2; k++) {
      let real = 0;
      let imag = 0;
      
      for (let i = 0; i < n; i++) {
        const angle = (2 * Math.PI * k * i) / n;
        real += data[i] * Math.cos(angle);
        imag -= data[i] * Math.sin(angle);
      }
      
      spectrum[k] = Math.sqrt(real * real + imag * imag);
    }

    return spectrum;
  }

  // Sum chromagram across time
  sumChromagram(chromagram) {
    const pitchClassProfile = new Array(12).fill(0);
    
    chromagram.forEach(frame => {
      frame.forEach((value, idx) => {
        pitchClassProfile[idx] += value;
      });
    });

    // Normalize
    const max = Math.max(...pitchClassProfile);
    if (max > 0) {
      for (let i = 0; i < 12; i++) {
        pitchClassProfile[i] /= max;
      }
    }

    return pitchClassProfile;
  }

  // Match pitch class profile to known key profiles
  matchKeyProfile(pitchClassProfile) {
    // Major and minor key profiles (Krumhansl-Kessler)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const modes = ['maj', 'min'];
    
    let bestKey = 'C';
    let bestCorrelation = -Infinity;

    // Try all 24 keys (12 major + 12 minor)
    keys.forEach((key, keyIdx) => {
      // Major key
      const majorCorr = this.correlate(pitchClassProfile, this.rotateArray(majorProfile, keyIdx));
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        bestKey = key;
      }

      // Minor key
      const minorCorr = this.correlate(pitchClassProfile, this.rotateArray(minorProfile, keyIdx));
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        bestKey = key + 'm';
      }
    });

    return bestKey;
  }

  // Rotate array for key transposition
  rotateArray(arr, n) {
    const rotated = [...arr];
    const len = arr.length;
    return rotated.map((_, i) => arr[(i + n) % len]);
  }

  // Calculate correlation between two arrays
  correlate(a, b) {
    if (a.length !== b.length) return 0;
    
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += a[i] * b[i];
    }
    
    return sum;
  }

  // Clear cache
  clearCache() {
    this.analysisCache.clear();
    console.log('[AudioAnalyzer] Analysis cache cleared');
  }

  // Get cache size
  getCacheSize() {
    return this.analysisCache.size;
  }

  // Destroy analyzer
  destroy() {
    this.clearCache();
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export default AudioAnalyzer;
