/**
 * Node.js Audio Analyzer
 * 
 * REAL BPM and Key detection using FFmpeg and audio analysis algorithms
 * Production-ready implementation for Node.js environment
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

class NodeAudioAnalyzer {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'ngks-analyzer');
  }

  /**
   * Analyze audio file - Extracts raw PCM data using FFmpeg
   */
  async analyzeAudioFile(filePath) {
    try {
      console.log(`  Extracting audio data...`);
      
      // Extract raw PCM audio data using FFmpeg
      const audioData = await this.extractAudioData(filePath);
      
      console.log(`  Detecting BPM...`);
      const bpm = await this.detectBPM(audioData);
      
      console.log(`  Detecting Key...`);
      const key = await this.detectKey(audioData);
      
      return {
        bpm: bpm.bpm,
        bpmConfidence: bpm.confidence,
        key: key.key,
        mode: key.mode,
        confidence: {
          bpm: bpm.confidence,
          key: key.confidence
        }
      };
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      return {
        bpm: null,
        key: null,
        mode: null,
        error: error.message
      };
    }
  }

  /**
   * Extract audio data using FFmpeg
   */
  async extractAudioData(filePath) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      
      ffmpeg(filePath)
        .noVideo()
        .audioChannels(1)  // Mono
        .audioFrequency(22050)  // 22.05kHz sample rate
        .format('f32le')  // 32-bit float PCM
        .on('error', reject)
        .pipe()
        .on('data', chunk => chunks.push(chunk))
        .on('end', () => {
          const buffer = Buffer.concat(chunks);
          const float32Array = new Float32Array(
            buffer.buffer,
            buffer.byteOffset,
            buffer.length / Float32Array.BYTES_PER_ELEMENT
          );
          resolve({
            samples: float32Array,
            sampleRate: 22050
          });
        })
        .on('error', reject);
    });
  }

  /**
   * BPM Detection Algorithm
   * Uses auto-correlation for robust tempo detection with multi-octave analysis
   */
  async detectBPM(audioData) {
    try {
      const { samples, sampleRate } = audioData;
      
      // Step 1: Calculate energy envelope
      const envelope = this.calculateEnergyEnvelope(samples, sampleRate);
      
      // Step 2: Use auto-correlation to find tempo candidates at multiple octaves
      const candidates = this.autoCorrelationBPM(envelope, sampleRate);
      
      if (!candidates || candidates.length === 0) {
        return { bpm: null, confidence: 0 };
      }
      
      // Step 3: Score all candidates (includes octaves and harmonics)
      let bestCandidate = candidates[0];
      
      // Prefer tempos in the common range (80-160 BPM)
      for (const candidate of candidates) {
        let score = candidate.confidence;
        
        // Bonus for being in common tempo range
        if (candidate.bpm >= 80 && candidate.bpm <= 160) {
          score *= 1.3;
        } else if (candidate.bpm >= 60 && candidate.bpm < 80) {
          score *= 1.1; // Slight preference for slow tempos (ballads/reggae)
        } else if (candidate.bpm > 160 && candidate.bpm <= 200) {
          score *= 1.15; // Preference for fast tempos (metal/electronic)
        }
        
        // Update score
        candidate.score = score;
        
        if (score > bestCandidate.score) {
          bestCandidate = candidate;
        }
      }
      
      return { 
        bpm: Math.round(bestCandidate.bpm), 
        confidence: bestCandidate.confidence 
      };
    } catch (error) {
      console.error('  BPM detection error:', error.message);
      return { bpm: null, confidence: 0 };
    }
  }

  /**
   * Calculate energy envelope
   */
  calculateEnergyEnvelope(samples, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.046); // ~46ms
    const hopSize = Math.floor(windowSize / 4);
    const envelope = [];
    
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += samples[i + j] * samples[i + j];
      }
      envelope.push(Math.sqrt(energy / windowSize));
    }
    
    return envelope;
  }

  /**
   * Auto-correlation based BPM detection with multi-octave peak detection
   * Returns multiple tempo candidates at different octaves
   */
  autoCorrelationBPM(envelope, sampleRate) {
    const hopSize = Math.floor(sampleRate * 0.046 / 4);
    const minBPM = 50;   // Extended range for slow ballads
    const maxBPM = 240;  // Extended range for fast metal
    
    // Convert BPM range to lag range (in envelope samples)
    const minLag = Math.floor((60 / maxBPM) * sampleRate / hopSize);
    const maxLag = Math.floor((60 / minBPM) * sampleRate / hopSize);
    
    // Calculate auto-correlation for all lags
    const correlations = [];
    for (let lag = minLag; lag < maxLag && lag < envelope.length / 2; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < envelope.length - lag; i++) {
        correlation += envelope[i] * envelope[i + lag];
        count++;
      }
      
      if (count > 0) {
        correlation /= count;
        const bpm = (60 * sampleRate) / (lag * hopSize);
        correlations.push({ lag, correlation, bpm });
      }
    }
    
    // Find peaks in the correlation function
    const peaks = [];
    for (let i = 2; i < correlations.length - 2; i++) {
      const curr = correlations[i].correlation;
      const prev1 = correlations[i - 1].correlation;
      const prev2 = correlations[i - 2].correlation;
      const next1 = correlations[i + 1].correlation;
      const next2 = correlations[i + 2].correlation;
      
      // Peak if higher than neighbors
      if (curr > prev1 && curr > prev2 && curr > next1 && curr > next2) {
        peaks.push(correlations[i]);
      }
    }
    
    // Sort peaks by correlation strength
    peaks.sort((a, b) => b.correlation - a.correlation);
    
    // Return top candidates with octave variations
    const candidates = [];
    const seen = new Set();
    
    for (const peak of peaks.slice(0, 5)) {
      const bpm = peak.bpm;
      const confidence = Math.min(1.0, Math.max(0, peak.correlation * 2));
      
      // Add primary tempo
      if (bpm >= 50 && bpm <= 240 && !this.isTooClose(bpm, seen)) {
        candidates.push({ bpm, confidence, score: confidence });
        seen.add(Math.round(bpm));
      }
      
      // Add octave variations
      const half = bpm / 2;
      const double = bpm * 2;
      
      if (half >= 50 && half <= 240 && !this.isTooClose(half, seen)) {
        candidates.push({ bpm: half, confidence: confidence * 0.85, score: confidence * 0.85 });
        seen.add(Math.round(half));
      }
      
      if (double >= 50 && double <= 240 && !this.isTooClose(double, seen)) {
        candidates.push({ bpm: double, confidence: confidence * 0.85, score: confidence * 0.85 });
        seen.add(Math.round(double));
      }
    }
    
    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    return candidates.slice(0, 10);
  }
  
  /**
   * Check if a BPM value is too close to already seen values
   */
  isTooClose(bpm, seen) {
    const rounded = Math.round(bpm);
    for (const seenBpm of seen) {
      if (Math.abs(rounded - seenBpm) < 3) {
        return true;
      }
    }
    return false;
  }

  /**
   * Key Detection Algorithm
   * Uses chromagram and Krumhansl-Schmuckler key profiles
   */
  async detectKey(audioData) {
    try {
      const { samples, sampleRate } = audioData;
      
      // Step 1: Compute chromagram (pitch class distribution)
      const chromagram = this.computeChromagram(samples, sampleRate);
      
      // Step 2: Get all 24 key profiles (12 major + 12 minor)
      const keyProfiles = this.getAllKeyProfiles();
      
      // Step 3: Find best matching key
      let bestMatch = null;
      let bestScore = -Infinity;
      
      for (const [keyName, profile] of Object.entries(keyProfiles)) {
        const score = this.correlate(chromagram, profile);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = keyName;
        }
      }
      
      // Step 4: Parse key and mode
      const [key, mode] = this.parseKeyName(bestMatch);
      
      // Step 5: Calculate confidence
      const confidence = Math.min(1.0, Math.max(0, bestScore / 10)); // Normalize
      
      return { key, mode, confidence };
    } catch (error) {
      console.error('  Key detection error:', error.message);
      return { key: null, mode: null, confidence: 0 };
    }
  }

  /**
   * Onset Detection (energy-based with spectral flux)
   */
  detectOnsets(samples, sampleRate) {
    const windowSize = Math.floor(sampleRate * 0.046); // ~46ms (1024 samples @ 22050Hz)
    const hopSize = Math.floor(windowSize / 4);
    const onsets = [];
    
    // Calculate energy envelope
    const energyEnvelope = [];
    for (let i = 0; i < samples.length - windowSize; i += hopSize) {
      let energy = 0;
      for (let j = 0; j < windowSize; j++) {
        energy += samples[i + j] * samples[i + j];
      }
      energyEnvelope.push(Math.sqrt(energy / windowSize));
    }
    
    if (energyEnvelope.length < 3) return [];
    
    // Calculate spectral flux (energy differences)
    const flux = [];
    for (let i = 1; i < energyEnvelope.length; i++) {
      flux.push(Math.max(0, energyEnvelope[i] - energyEnvelope[i - 1]));
    }
    
    // Adaptive threshold
    const meanFlux = flux.reduce((a, b) => a + b, 0) / flux.length;
    const stdDev = Math.sqrt(
      flux.reduce((sum, val) => sum + Math.pow(val - meanFlux, 2), 0) / flux.length
    );
    const threshold = meanFlux + 0.5 * stdDev;
    
    // Find peaks above threshold
    for (let i = 1; i < flux.length - 1; i++) {
      if (flux[i] > threshold &&
          flux[i] > flux[i - 1] &&
          flux[i] > flux[i + 1]) {
        const timeInSeconds = ((i + 1) * hopSize) / sampleRate;
        onsets.push(timeInSeconds);
      }
    }
    
    return onsets;
  }

  /**
   * Build interval histogram
   */
  buildIntervalHistogram(intervals) {
    const histogram = new Map();
    const bucketSize = 0.05; // 50ms buckets
    
    for (const interval of intervals) {
      const bucket = Math.round(interval / bucketSize) * bucketSize;
      histogram.set(bucket, (histogram.get(bucket) || 0) + 1);
    }
    
    return histogram;
  }

  /**
   * Find dominant interval
   */
  findDominantInterval(histogram) {
    let maxCount = 0;
    let dominantInterval = 0;
    
    for (const [interval, count] of histogram.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantInterval = interval;
      }
    }
    
    return dominantInterval || 0.5; // Default to 120 BPM
  }

  /**
   * Calculate BPM confidence
   */
  calculateBPMConfidence(histogram, dominantInterval) {
    const totalIntervals = Array.from(histogram.values()).reduce((a, b) => a + b, 0);
    const dominantCount = histogram.get(dominantInterval) || 0;
    return dominantCount / totalIntervals;
  }

  /**
   * Compute chromagram using FFT
   */
  computeChromagram(samples, sampleRate) {
    const chromagram = new Array(12).fill(0);
    const fftSize = 4096;
    const hopSize = fftSize / 2;
    const numFrames = Math.floor((samples.length - fftSize) / hopSize);
    
    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopSize;
      const segment = samples.slice(start, start + fftSize);
      
      // Apply Hanning window
      for (let i = 0; i < segment.length; i++) {
        segment[i] *= 0.5 * (1 - Math.cos(2 * Math.PI * i / (segment.length - 1)));
      }
      
      // Compute magnitude spectrum
      const spectrum = this.computeFFT(segment);
      
      // Map spectrum to chroma bins (pitch classes)
      for (let bin = 1; bin < spectrum.length / 2; bin++) {
        const frequency = (bin * sampleRate) / fftSize;
        
        // Only consider musical range (C1 to C8: ~32Hz to 4186Hz)
        if (frequency < 32 || frequency > 4186) continue;
        
        const chromaBin = this.frequencyToChroma(frequency);
        chromagram[chromaBin] += spectrum[bin];
      }
    }
    
    // Normalize
    const sum = chromagram.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < 12; i++) {
        chromagram[i] /= sum;
      }
    }
    
    return chromagram;
  }

  /**
   * Compute FFT using Cooley-Tukey algorithm
   */
  computeFFT(data) {
    const n = data.length;
    const magnitude = new Array(n);
    
    // Pad to power of 2 if needed
    let size = 1;
    while (size < n) size *= 2;
    
    const real = new Array(size).fill(0);
    const imag = new Array(size).fill(0);
    
    for (let i = 0; i < n; i++) {
      real[i] = data[i];
    }
    
    // Bit reversal
    for (let i = 0; i < size; i++) {
      const j = this.reverseBits(i, Math.log2(size));
      if (j > i) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let len = 2; len <= size; len *= 2) {
      const angle = -2 * Math.PI / len;
      const wReal = Math.cos(angle);
      const wImag = Math.sin(angle);
      
      for (let i = 0; i < size; i += len) {
        let wnReal = 1;
        let wnImag = 0;
        
        for (let j = 0; j < len / 2; j++) {
          const k = i + j;
          const l = k + len / 2;
          
          const tReal = wnReal * real[l] - wnImag * imag[l];
          const tImag = wnReal * imag[l] + wnImag * real[l];
          
          real[l] = real[k] - tReal;
          imag[l] = imag[k] - tImag;
          real[k] += tReal;
          imag[k] += tImag;
          
          const tempReal = wnReal * wReal - wnImag * wImag;
          wnImag = wnReal * wImag + wnImag * wReal;
          wnReal = tempReal;
        }
      }
    }
    
    // Calculate magnitude
    for (let i = 0; i < size; i++) {
      magnitude[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    
    return magnitude;
  }

  /**
   * Reverse bits for FFT
   */
  reverseBits(num, bits) {
    let result = 0;
    for (let i = 0; i < bits; i++) {
      result = (result << 1) | (num & 1);
      num >>= 1;
    }
    return result;
  }

  /**
   * Map frequency to chroma bin
   */
  frequencyToChroma(frequency) {
    const a440 = 440;
    const c0 = a440 * Math.pow(2, -4.75); // C0 frequency
    const semitones = 12 * Math.log2(frequency / c0);
    return Math.floor(semitones) % 12;
  }

  /**
   * Get all 24 key profiles (Krumhansl-Schmuckler)
   */
  getAllKeyProfiles() {
    // Base profiles
    const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
    const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
    
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const profiles = {};
    
    // Generate all 24 key profiles by rotating
    for (let i = 0; i < 12; i++) {
      const majorRotated = [...majorProfile.slice(i), ...majorProfile.slice(0, i)];
      const minorRotated = [...minorProfile.slice(i), ...minorProfile.slice(0, i)];
      
      profiles[`${keys[i]} major`] = majorRotated;
      profiles[`${keys[i]} minor`] = minorRotated;
    }
    
    return profiles;
  }

  /**
   * Correlate chromagram with key profile
   */
  correlate(chroma1, chroma2) {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += chroma1[i] * chroma2[i];
    }
    return sum;
  }

  /**
   * Parse key name
   */
  parseKeyName(keyName) {
    const parts = keyName.split(' ');
    return [parts[0], parts[1]]; // ['C', 'major']
  }

  /**
   * Close audio context
   */
  async close() {
    if (this.audioContext) {
      await this.audioContext.close();
    }
  }
}

export default NodeAudioAnalyzer;
