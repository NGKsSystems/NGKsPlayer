// AudioAnalyzer.js - BPM and Key detection for audio tracks
import AnalyzerCalibration from './AnalyzerCalibration.js';

class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analysisCache = new Map(); // Cache results by file path
    this.calibration = new AnalyzerCalibration();
  }

  // Initialize audio context for analysis
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioAnalyzer] Audio context initialized for analysis');
    }
    return this.audioContext;
  }

  // Main analysis function - returns both BPM and Key (with calibration applied)
  async analyzeTrack(filePath) {
    console.log('[AudioAnalyzer] Starting analysis for:', filePath);

    // Check cache first
    if (this.analysisCache.has(filePath)) {
      console.log('[AudioAnalyzer] Using cached analysis');
      return this.analysisCache.get(filePath);
    }

    try {
      // Get raw analysis
      const raw = await this.analyzeTrackRaw(filePath);
      
      // Apply calibration
      const calibratedBPM = this.calibration.applyCalibratedBPM(raw.bpm, raw.bpmCandidates);
      const calibratedKey = this.calibration.applyCalibratedKey(raw.key);

      const result = {
        bpm: calibratedBPM.bpm,
        bpmConfidence: calibratedBPM.confidence,
        bpmCandidates: calibratedBPM.candidates,
        key: calibratedKey,
        keyCandidates: raw.keyCandidates || [],
        analyzed: true,
        calibrated: this.calibration.profile.calibrated,
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

  // Raw analysis function (no calibration) - used for calibration training
  async analyzeTrackRaw(filePath) {
    console.log('[AudioAnalyzer] Starting RAW analysis for:', filePath);

    try {
      // Load the audio file
      const audioBuffer = await this.loadAudioFile(filePath);
      
      // Analyze BPM and Key in parallel
      const [bpmResult, keyResult] = await Promise.all([
        this.detectBPMWithCandidates(audioBuffer),
        this.detectKeyWithCandidates(audioBuffer)
      ]);

      return {
        bpm: bpmResult.primary,
        bpmCandidates: bpmResult.candidates,
        key: keyResult.primary,
        keyCandidates: keyResult.candidates,
        analyzed: true,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('[AudioAnalyzer] Raw analysis failed:', error);
      throw error;
    }
  }

  // BPM Detection with multiple candidates
  async detectBPMWithCandidates(audioBuffer) {
    console.log('[AudioAnalyzer] Detecting BPM with candidates...');

    // Get mono channel data
    const channelData = this.getMonoData(audioBuffer);
    const sampleRate = audioBuffer.sampleRate;

    // Calculate energy envelope with optimized window
    const energyData = this.calculateEnergyEnvelope(channelData, sampleRate);
    
    // Find peaks in energy
    const peaks = this.findPeaks(energyData, sampleRate);
    
    if (peaks.length < 2) {
      console.warn('[AudioAnalyzer] Not enough peaks detected for BPM analysis');
      return {
        primary: 120,
        candidates: [
          { value: 120, confidence: 0.5 }
        ]
      };
    }

    // Calculate intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }

    // Find most common interval using histogram
    const primaryBPM = this.intervalsToTempo(intervals, sampleRate);
    
    // Generate candidates (half-time, normal, double-time, 1.5x)
    const candidates = [
      { value: Math.round(primaryBPM * 0.5), confidence: 0.3, label: 'half-time' },
      { value: Math.round(primaryBPM * 1.0), confidence: 0.6, label: 'detected' },
      { value: Math.round(primaryBPM * 1.5), confidence: 0.2, label: '1.5x' },
      { value: Math.round(primaryBPM * 2.0), confidence: 0.4, label: 'double-time' }
    ].sort((a, b) => b.confidence - a.confidence);
    
    console.log('[AudioAnalyzer] BPM detected:', primaryBPM, 'Candidates:', candidates);
    return {
      primary: primaryBPM,
      candidates: candidates
    };
  }

  // Legacy BPM detection (for compatibility)
  async detectBPM(audioBuffer) {
    const result = await this.detectBPMWithCandidates(audioBuffer);
    return result.primary;
  }/ BPM Detection using autocorrelation and peak detection
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
    let detectedBPM = this.findMostCommon(validBpms);
    
    // Smart half/double-time detection
    // Calculate variance (consistency) of the BPM values
    const mean = validBpms.reduce((a, b) => a + b, 0) / validBpms.length;
    const variance = validBpms.reduce((sum, bpm) => sum + Math.pow(bpm - mean, 2), 0) / validBpms.length;
    const stdDev = Math.sqrt(variance);
    
    console.log('[AudioAnalyzer] BPM detected:', detectedBPM, 'std dev:', stdDev.toFixed(2));
    
    // If outside typical range (70-160), check if doubled/halved version is more consistent
    if (detectedBPM < 70) {
      const doubled = detectedBPM * 2;
      const doubledBpms = validBpms.map(b => b * 2);
      const doubledMean = doubledBpms.reduce((a, b) => a + b, 0) / doubledBpms.length;
      const doubledVariance = doubledBpms.reduce((sum, bpm) => sum + Math.pow(bpm - doubledMean, 2), 0) / doubledBpms.length;
      const doubledStdDev = Math.sqrt(doubledVariance);
      
      // If doubled version is similar or better consistency, use it (within 150% tolerance)
      // This is aggressive since most songs <70 BPM are actually half-time
      if (doubledStdDev < stdDev * 1.5) {
        console.log('[AudioAnalyzer] Doubled BPM more consistent (', doubledStdDev.toFixed(2), '<=', (stdDev * 1.5).toFixed(2), '), using', doubled);
        detectedBPM = doubled;
      } else {
        console.log('[AudioAnalyzer] Keeping slow BPM', detectedBPM, '(legitimate slow song)');
      }
    } else if (detectedBPM > 160) {
      const halved = detectedBPM / 2;
      const halvedBpms = validBpms.map(b => b / 2);
      const halvedMean = halvedBpms.reduce((a, b) => a + b, 0) / halvedBpms.length;
      const halvedVariance = halvedBpms.reduce((sum, bpm) => sum + Math.pow(bpm - halvedMean, 2), 0) / halvedBpms.length;
      const halvedStdDev = Math.sqrt(halvedVariance);
      
      // If halved version is similar or better consistency, use it
      if (halvedStdDev < stdDev * 1.5) {
        console.log('[AudioAnalyzer] Halved BPM more consistent (', halvedStdDev.toFixed(2), '<=', (stdDev * 1.5).toFixed(2), '), using', halved);
        detectedBPM = halved;
      } else {
        console.log('[AudioAnalyzer] Keeping fast BPM', detectedBPM, '(legitimate fast song)');
      }
    }
    
    return Math.round(detectedBPM);
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
  // Key Detection with multiple candidates
  async detectKeyWithCandidates(audioBuffer) {
    console.log('[AudioAnalyzer] Detecting musical key with candidates...');

    try {
      // Get mono channel data for analysis
      const channelData = this.getMonoData(audioBuffer);
      const sampleRate = audioBuffer.sampleRate;
      
      // Analyze first 30 seconds for representative sample
      const maxSamples = Math.min(channelData.length, sampleRate * 30);
      const analyzeData = channelData.slice(0, maxSamples);
      
      // Estimate tuning offset (detuning from A440)
      const tuningOffset = this.estimateTuning(analyzeData, sampleRate);
      console.log('[AudioAnalyzer] Tuning offset:', tuningOffset.toFixed(2), 'semitones from A440');
      
      // Build chroma profile with harmonic emphasis
      const chromaProfile = this.buildChromaProfile(analyzeData, sampleRate);
      
      // Normalize using L2 norm for better correlation
      const norm = Math.sqrt(chromaProfile.reduce((sum, val) => sum + val * val, 0));
      if (norm > 0) {
        for (let i = 0; i < 12; i++) {
          chromaProfile[i] /= norm;
        }
      }

      // Match to key using scale templates and get top candidates
      const result = this.matchKeyProfileWithCandidates(chromaProfile);
      
      console.log('[AudioAnalyzer] Key detected:', result.primary, 'with', result.candidates.length, 'candidates');
      return result;
    } catch (error) {
      console.error('[AudioAnalyzer] Key detection failed:', error);
      return {
        primary: null,
        candidates: []
      };
    }
  }

  // Legacy key detection (for compatibility)
  async detectKey(audioBuffer) {
    const result = await this.detectKeyWithCandidates(audioBuffer);
    return result.primary;
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
  matchKeyProfileWithCandidates(pitchClassProfile) {
    console.log('[AudioAnalyzer] ✓✓✓ NEW KEY DETECTION CODE RUNNING ✓✓✓');
    
    // Normalize the chroma profile
    const sum = pitchClassProfile.reduce((a, b) => a + b, 0);
    const normalized = pitchClassProfile.map(val => sum > 0 ? val / sum : 0);
    
    const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Try all 24 keys using scale template matching
    const majorScale = [3, 0, 2, 0, 2, 1, 0, 2, 0, 2, 0, 1]; // C major - weighted (tonic=3, third=2, fifth=2, others=1)
    const minorScale = [3, 0, 1, 2, 0, 1, 0, 2, 1, 0, 2, 0]; // C minor - weighted (tonic=3, b3=2, fifth=2, b7=2)
    
    let bestKey = 'C';
    let bestScore = -Infinity;
    const scores = [];
    
    // Test all 12 major and 12 minor keys
    for (let keyIdx = 0; keyIdx < 12; keyIdx++) {
      // Major key
      const rotatedMajor = this.rotateArray(majorScale, keyIdx);
      let majorScore = 0;
      for (let i = 0; i < 12; i++) {
        if (rotatedMajor[i] > 0) {
          majorScore += normalized[i] * rotatedMajor[i]; // Weight by importance
        } else {
          majorScore -= normalized[i] * 0.5; // Penalty for out-of-scale notes
        }
      }
      scores.push({ key: noteNames[keyIdx], score: majorScore });
      
      if (majorScore > bestScore) {
        bestScore = majorScore;
        bestKey = noteNames[keyIdx];
      }
      
      // Minor key
      const rotatedMinor = this.rotateArray(minorScale, keyIdx);
      let minorScore = 0;
      for (let i = 0; i < 12; i++) {
        if (rotatedMinor[i] > 0) {
          minorScore += normalized[i] * rotatedMinor[i];
        } else {
          minorScore -= normalized[i] * 0.5;
        }
      }
      scores.push({ key: noteNames[keyIdx] + 'm', score: minorScore });
      
      if (minorScore > bestScore) {
        bestScore = minorScore;
        bestKey = noteNames[keyIdx] + 'm';
      }
    }
    
    // Sort scores and create candidates
    scores.sort((a, b) => b.score - a.score);
    
    // Normalize scores to 0-1 range for confidence
    const maxScore = scores[0].score;
    const minScore = scores[scores.length - 1].score;
    const range = maxScore - minScore;
    
    const candidates = scores.slice(0, 5).map(s => ({
      value: s.key,
      confidence: range > 0 ? (s.score - minScore) / range : 1.0,
      score: s.score
    }));
    
    // Debug output
    console.log('[AudioAnalyzer] Top 5 key candidates:');
    for (let i = 0; i < 5; i++) {
      console.log(`  ${i+1}. ${candidates[i].value}: ${candidates[i].score.toFixed(4)} (confidence: ${(candidates[i].confidence * 100).toFixed(1)}%)`);
    }
    console.log('[AudioAnalyzer] Detected key:', bestKey);
    console.log('[AudioAnalyzer] Chroma profile:', normalized.map((v, i) => `${noteNames[i]}:${(v*100).toFixed(1)}%`).join(', '));
    
    return {
      primary: bestKey,
      candidates: candidates
    };
  }

  // Legacy method (for compatibility)
  matchKeyProfile(pitchClassProfile) {
    const result = this.matchKeyProfileWithCandidates(pitchClassProfile);
    return result.primary;
  }

  // Get frequency for a given pitch class and octave
  getPitchFrequency(pitchClass, octave) {
    // C0 = 16.35 Hz
    const C0 = 16.35;
    const halfSteps = octave * 12 + pitchClass;
    return C0 * Math.pow(2, halfSteps / 12);
  }

  // Estimate tuning offset in semitones from A440
  estimateTuning(channelData, sampleRate) {
    // Find peaks in common tuning reference range (A3-A5: 220-880 Hz)
    const fftSize = 8192;
    const hopSize = 4096;
    const A440 = 440.0;
    
    let peakFrequencies = [];
    
    // Sample a few frames
    for (let frame = 0; frame < Math.min(10, Math.floor((channelData.length - fftSize) / hopSize)); frame++) {
      const startIdx = frame * hopSize;
      const frameData = channelData.slice(startIdx, startIdx + fftSize);
      
      // Apply window
      const windowed = new Float32Array(fftSize);
      for (let i = 0; i < fftSize; i++) {
        windowed[i] = frameData[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (fftSize - 1)));
      }
      
      // Find peak frequency in A reference range
      const binWidth = sampleRate / fftSize;
      const minBin = Math.floor(200 / binWidth);
      const maxBin = Math.floor(900 / binWidth);
      
      let maxMag = 0;
      let peakBin = 0;
      
      for (let k = minBin; k < maxBin; k++) {
        let real = 0, imag = 0;
        for (let n = 0; n < fftSize; n++) {
          const angle = (-2 * Math.PI * k * n) / fftSize;
          real += windowed[n] * Math.cos(angle);
          imag += windowed[n] * Math.sin(angle);
        }
        const mag = Math.sqrt(real * real + imag * imag);
        if (mag > maxMag) {
          maxMag = mag;
          peakBin = k;
        }
      }
      
      if (maxMag > 0.1) {
        peakFrequencies.push(peakBin * binWidth);
      }
    }
    
    if (peakFrequencies.length === 0) return 0;
    
    // Calculate average tuning offset from each peak
    const tuningOffsets = peakFrequencies.map(freq => {
      // Map frequency to nearest semitone from C0
      const C0 = 16.35;
      const semitonesFromC0 = 12 * Math.log2(freq / C0);
      const nearestSemitone = Math.round(semitonesFromC0);
      const actualFreq = C0 * Math.pow(2, nearestSemitone / 12);
      
      // Offset from expected frequency (in semitones)
      const offset = 12 * Math.log2(freq / actualFreq);
      return offset;
    });
    
    const avgOffset = tuningOffsets.reduce((a, b) => a + b, 0) / tuningOffsets.length;
    
    // Negative offset means flat (tuned down), positive means sharp
    return avgOffset;
  }

  // Transpose a key by semitones
  transposeKey(key, semitones) {
    const noteNames = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    
    // Extract note and mode
    const isMinor = key.endsWith('m');
    const noteName = isMinor ? key.slice(0, -1) : key;
    
    // Find current note index
    const currentIdx = noteNames.indexOf(noteName);
    if (currentIdx === -1) return key; // Invalid key, return as-is
    
    // Transpose
    const newIdx = (currentIdx + semitones + 12) % 12;
    const newNote = noteNames[newIdx];
    
    return isMinor ? newNote + 'm' : newNote;
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
