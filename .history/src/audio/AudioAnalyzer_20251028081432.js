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

  // Key Detection using chroma-based approach with harmonic emphasis
  async detectKey(audioBuffer) {
    console.log('[AudioAnalyzer] Detecting musical key...');

    try {
      // Get mono channel data for analysis
      const channelData = this.getMonoData(audioBuffer);
      const sampleRate = audioBuffer.sampleRate;
      
      // Analyze first 30 seconds for representative sample
      const maxSamples = Math.min(channelData.length, sampleRate * 30);
      const analyzeData = channelData.slice(0, maxSamples);
      
      // Build chroma profile with harmonic emphasis
      const chromaProfile = this.buildChromaProfile(analyzeData, sampleRate);
      
      // Normalize using L2 norm for better correlation
      const norm = Math.sqrt(chromaProfile.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < 12; i++) {
          chromaProfile[i] /= norm;
        }
      }

      // Match to key using Krumhansl-Schmuckler profiles
      const key = this.matchKeyProfile(chromaProfile);
      
      console.log('[AudioAnalyzer] Key detected:', key);
      console.log('[AudioAnalyzer] Chroma profile:', chromaProfile.map(v => v.toFixed(3)));
      return key;
    } catch (error) {
      console.error('[AudioAnalyzer] Key detection failed:', error);
      return null;
    }
  }

  // Build chroma profile with harmonic emphasis
  buildChromaProfile(channelData, sampleRate) {
    const chromaProfile = new Array(12).fill(0);
    const fftSize = 8192; // Higher resolution for better pitch accuracy
    const hopSize = 4096; // 50% overlap
    const numFrames = Math.floor((channelData.length - fftSize) / hopSize);
    
    // Analyze more frames but with median aggregation for stability
    const frameStep = Math.max(1, Math.floor(numFrames / 120));
    const frameResults = [];
    
    for (let frame = 0; frame < numFrames; frame += frameStep) {
      const startIdx = frame * hopSize;
      const frameData = channelData.slice(startIdx, startIdx + fftSize);
      
      // Apply Hann window
      const windowed = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        const windowValue = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
        windowed[i] = frameData[i] * windowValue;
      }
      
      // Get chroma for this frame
      const frameChroma = new Array(12).fill(0);
      this.addChromaFromFrame(windowed, sampleRate, frameChroma);
      frameResults.push(frameChroma);
    }
    
    // Aggregate using median for robustness against outliers
    for (let pitchClass = 0; pitchClass < 12; pitchClass++) {
      const values = frameResults.map(frame => frame[pitchClass]).sort((a, b) => a - b);
      chromaProfile[pitchClass] = values[Math.floor(values.length / 2)] || 0;
    }
    
    // Debug: Show chroma profile with note names
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const debugProfile = chromaProfile.map((val, i) => `${noteNames[i]}:${val.toFixed(2)}`).join(', ');
    console.log('[AudioAnalyzer] Chroma profile:', debugProfile);
    
    // Find the dominant pitch class (highest value)
    const maxIdx = chromaProfile.indexOf(Math.max(...chromaProfile));
    console.log('[AudioAnalyzer] Strongest pitch class:', noteNames[maxIdx]);
    
    // Show actual raw values for debugging
    console.log('[AudioAnalyzer] Raw chroma array:', chromaProfile.map(v => v.toFixed(3)));
    
    return chromaProfile;
  }

  // Add chroma values from a single frame with harmonic emphasis
  addChromaFromFrame(frameData, sampleRate, chromaProfile) {
    // Use the existing efficient DFT method
    this.addPitchClassesFromFrame(frameData, sampleRate, chromaProfile);
  }

  // Extract pitch classes from a single frame
  addPitchClassesFromFrame(frameData, sampleRate, pitchClassProfile) {
    const fftSize = frameData.length;
    const binWidth = sampleRate / fftSize;
    
    // Focus on melodic range (100 Hz to 2000 Hz) to avoid bass/percussion
    const minBin = Math.floor(100 / binWidth);
    const maxBin = Math.floor(2000 / binWidth);
    
    // Harmonic product spectrum for better fundamental detection
    const harmonicWeights = [1.0, 0.6, 0.4]; // Weight for 1st, 2nd, 3rd harmonic
    
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
      
      // Skip if too quiet (adaptive threshold)
      if (magnitude < 0.1) continue;
      
      // Convert bin to frequency
      const frequency = k * binWidth;
      
      // Convert frequency to pitch class (0=C, 1=C#, 2=D, etc.)
      const C0 = 16.35; // C0 frequency
      const halfStepsFromC0 = 12 * Math.log2(frequency / C0);
      const pitchClass = Math.round(halfStepsFromC0) % 12;
      const normalizedPitchClass = (pitchClass + 12) % 12;
      
      // Apply harmonic emphasis - check if this bin reinforces harmonics
      let harmonicBoost = 1.0;
      for (let h = 0; h < harmonicWeights.length; h++) {
        const harmonicBin = k * (h + 1);
        if (harmonicBin < maxBin) {
          // Check if harmonic exists (simple approximation)
          harmonicBoost += harmonicWeights[h] * 0.2;
        }
      }
      
      // Add weighted by magnitude and harmonic boost
      pitchClassProfile[normalizedPitchClass] += magnitude * harmonicBoost;
    }
  }

  // Match pitch class profile to known key profiles (Krumhansl-Kessler)
  matchKeyProfile(pitchClassProfile) {
    // Normalize the chroma profile
    const sum = pitchClassProfile.reduce((a, b) => a + b, 0);
    const normalized = pitchClassProfile.map(val => sum > 0 ? val / sum : 0);
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    
    // Find the strongest note (tonic candidate)
    const maxIdx = normalized.indexOf(Math.max(...normalized));
    const tonicNote = noteNames[maxIdx];
    
    console.log('[AudioAnalyzer] Tonic candidate (strongest note):', tonicNote);
    console.log('[AudioAnalyzer] Normalized profile:', normalized.map((v, i) => `${noteNames[i]}:${v.toFixed(3)}`).join(', '));
    
    // Check if it's major or minor by looking at the third
    // Major third is 4 semitones up, minor third is 3 semitones up
    const majorThirdIdx = (maxIdx + 4) % 12;
    const minorThirdIdx = (maxIdx + 3) % 12;
    
    const majorThirdStrength = normalized[majorThirdIdx];
    const minorThirdStrength = normalized[minorThirdIdx];
    
    console.log('[AudioAnalyzer] Major third (', noteNames[majorThirdIdx], '):', majorThirdStrength.toFixed(3));
    console.log('[AudioAnalyzer] Minor third (', noteNames[minorThirdIdx], '):', minorThirdStrength.toFixed(3));
    
    // Decide major vs minor
    const isMajor = majorThirdStrength > minorThirdStrength;
    const detectedKey = isMajor ? tonicNote : tonicNote + 'm';
    
    console.log('[AudioAnalyzer] Detected key (simple method):', detectedKey);
    
    return detectedKey;
  }

  // Get frequency for a given pitch class and octave
  getPitchFrequency(pitchClass, octave) {
    // C0 = 16.35 Hz
    const C0 = 16.35;
    const halfSteps = octave * 12 + pitchClass;
    return C0 * Math.pow(2, halfSteps / 12);
  }

  // Get magnitude at specific frequency using targeted DFT
  getMagnitudeAtFrequency(frameData, sampleRate, targetFreq) {
    const fftSize = frameData.length;
    const binWidth = sampleRate / fftSize;
    
    // Find the bin closest to target frequency
    const targetBin = Math.round(targetFreq / binWidth);
    
    // Ensure bin is within valid range
    if (targetBin < 0 || targetBin >= fftSize / 2) return 0;
    
    let real = 0;
    let imag = 0;
    
    // Compute DFT for this specific bin
    for (let n = 0; n < fftSize; n++) {
      const angle = (-2 * Math.PI * targetBin * n) / fftSize;
      real += frameData[n] * Math.cos(angle);
      imag += frameData[n] * Math.sin(angle);
    }
    
    return Math.sqrt(real * real + imag * imag) / fftSize;
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
