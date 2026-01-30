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

    // Remove local:// prefix if present
    let cleanPath = filePath;
    if (filePath.startsWith('local://')) {
      cleanPath = filePath.replace('local://', '');
    }

    console.log('[AudioAnalyzer] Fetching audio from:', cleanPath);

    // Use Electron IPC to read file as buffer
    const result = await window.api.invoke('fs:readFileBuffer', cleanPath);
    
    if (!result.ok) {
      throw new Error(`Failed to read audio file: ${result.error}`);
    }

    // Convert Uint8Array to ArrayBuffer
    const arrayBuffer = result.data.buffer;
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
      // Get mono channel data for analysis
      const channelData = this.getMonoData(audioBuffer);
      const sampleRate = audioBuffer.sampleRate;
      
      // Analyze first 30 seconds max
      const maxSamples = Math.min(channelData.length, sampleRate * 30);
      const analyzeData = channelData.slice(0, maxSamples);
      
      // Build pitch class profile using proper FFT
      const pitchClassProfile = this.buildPitchClassProfile(analyzeData, sampleRate);
      
      // Normalize
      const maxEnergy = Math.max(...pitchClassProfile);
      if (maxEnergy > 0) {
        for (let i = 0; i < 12; i++) {
          pitchClassProfile[i] /= maxEnergy;
        }
      }

      // Match to key using Krumhansl-Kessler profiles
      const key = this.matchKeyProfile(pitchClassProfile);
      
      console.log('[AudioAnalyzer] Key detected:', key);
      console.log('[AudioAnalyzer] Pitch class profile:', pitchClassProfile.map(v => v.toFixed(3)));
      return key;
    } catch (error) {
      console.error('[AudioAnalyzer] Key detection failed:', error);
      return null;
    }
  }

  // Build pitch class profile from audio data
  buildPitchClassProfile(channelData, sampleRate) {
    const pitchClassProfile = new Array(12).fill(0);
    const fftSize = 4096;
    const hopSize = 2048;
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
    
    // Sample every Nth frame for performance (analyze ~60 frames total)
    const frameStep = Math.max(1, Math.floor(numFrames / 60));
    
    for (let frame = 0; frame < numFrames; frame += frameStep) {
      const startIdx = frame * hopSize;
      const frameData = channelData.slice(startIdx, startIdx + fftSize);
      
      // Apply Hann window
      const windowed = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        windowed[i] = frameData[i] * windowValue;
      }
      
      // Compute FFT magnitudes using simple DFT on key frequencies
      this.addPitchClassesFromFrame(windowed, sampleRate, pitchClassProfile);
    }
    
    return pitchClassProfile;
  }

  // Extract pitch classes from a single frame
  addPitchClassesFromFrame(frameData, sampleRate, pitchClassProfile) {
    const fftSize = frameData.length;
    const binWidth = sampleRate / fftSize;
    
    // Only analyze bins in musical range (60 Hz to 4000 Hz for better coverage)
    const minBin = Math.floor(60 / binWidth);
    const maxBin = Math.floor(4000 / binWidth);
    
    // Compute magnitude for each bin in range
    for (let k = minBin; k < maxBin; k++) {
      let real = 0;
      let imag = 0;
      
      // DFT for this bin only
      for (let n = 0; n < fftSize; n++) {
        const angle = (-2 * Math.PI * k * n) / fftSize;
        real += frameData[n] * Math.cos(angle);
        imag += frameData[n] * Math.sin(angle);
      }
      
      const magnitude = Math.sqrt(real * real + imag * imag);
      
      // Skip if too quiet
      if (magnitude < 0.01) continue;
      
      // Convert bin to frequency
      const frequency = k * binWidth;
      
      // Convert frequency to pitch class (0=C, 1=C#, 2=D, etc.)
      // Use C as reference (C4 = 261.63 Hz)
      const C0 = 16.35; // C0 frequency
      const halfStepsFromC0 = 12 * Math.log2(frequency / C0);
      const pitchClass = Math.round(halfStepsFromC0) % 12;
      const normalizedPitchClass = (pitchClass + 12) % 12;
      
      // Add weighted by magnitude
      pitchClassProfile[normalizedPitchClass] += magnitude;
    }
  }

  // Match pitch class profile to known key profiles (Krumhansl-Kessler)
  matchKeyProfile(pitchClassProfile) {
    // Krumhansl-Kessler key profiles (perceptual weights)
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    let bestKey = 'C';
    let bestCorrelation = -Infinity;

    // Try all 24 keys (12 major + 12 minor)
    for (let keyIdx = 0; keyIdx < 12; keyIdx++) {
      // Test major key
      const rotatedMajor = this.rotateArray(majorProfile, keyIdx);
      const majorCorr = this.correlate(pitchClassProfile, rotatedMajor);
      
      if (majorCorr > bestCorrelation) {
        bestCorrelation = majorCorr;
        bestKey = keys[keyIdx];
      }

      // Test minor key
      const rotatedMinor = this.rotateArray(minorProfile, keyIdx);
      const minorCorr = this.correlate(pitchClassProfile, rotatedMinor);
      
      if (minorCorr > bestCorrelation) {
        bestCorrelation = minorCorr;
        bestKey = keys[keyIdx] + 'm';
      }
    }

    return bestKey;
  }

  // Rotate array for key transposition
  rotateArray(arr, n) {
    const len = arr.length;
    return arr.map((_, i) => arr[(i + n) % len]);
  }

  // Calculate Pearson correlation coefficient
  correlate(a, b) {
    if (a.length !== b.length) return 0;
    
    const n = a.length;
    const meanA = a.reduce((sum, val) => sum + val, 0) / n;
    const meanB = b.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let denomA = 0;
    let denomB = 0;
    
    for (let i = 0; i < n; i++) {
      const diffA = a[i] - meanA;
      const diffB = b[i] - meanB;
      numerator += diffA * diffB;
      denomA += diffA * diffA;
      denomB += diffB * diffB;
    }
    
    if (denomA === 0 || denomB === 0) return 0;
    
    return numerator / Math.sqrt(denomA * denomB);
  }

  // OLD SIMPLIFIED VERSION - REMOVED
  
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
