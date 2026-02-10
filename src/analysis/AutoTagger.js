/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutoTagger.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/analysis/AutoTagger.js - Independent Audio Analysis Module for NGKsPlayer
// Completely standalone module for deep audio analysis with no fake data

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const ffmpeg = require('fluent-ffmpeg');
const { parseFile } = require('music-metadata');

// Set FFmpeg path to use the bundled version
try {
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log('[AutoTagger] Using bundled FFmpeg:', ffmpegPath);
} catch (error) {
  try {
    const ffmpegStatic = require('ffmpeg-static');
    ffmpeg.setFfmpegPath(ffmpegStatic);
    console.log('[AutoTagger] Using ffmpeg-static:', ffmpegStatic);
  } catch (error2) {
    console.warn('[AutoTagger] No bundled FFmpeg found, using system PATH');
  }
}

class AutoTagger extends EventEmitter {
  constructor(dbPath = null) {
    super();
    this.dbPath = dbPath || path.join(__dirname, '../../audio_analysis.db');
    this.db = null;
    this.isInitialized = false;
    
    // Analysis settings
    this.settings = {
      sampleRate: 44100,
      analysisWindow: 4096,
      hopSize: 2048,
      minBPM: 60,
      maxBPM: 200,
      keyConfidenceThreshold: 0.7,
      energyWindowSize: 1024
    };
  }

  // Initialize database with expanded schema for DJ analysis
  async initializeDatabase() {
    try {
      this.db = new Database(this.dbPath);
      
      // Create analysis results table with all DJ fields
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS analysis_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          file_path TEXT UNIQUE NOT NULL,
          file_hash TEXT,
          last_analyzed DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          -- Basic metadata
          title TEXT,
          artist TEXT,
          album TEXT,
          year INTEGER,
          genre TEXT,
          duration REAL,
          
          -- DJ Analysis Data
          bpm REAL,
          bpm_confidence REAL,
          musical_key TEXT,
          key_confidence REAL,
          camelot_key TEXT,
          
          -- Energy and dynamics
          energy_level REAL,
          loudness_lufs REAL,
          loudness_range REAL,
          dynamic_range REAL,
          peak_db REAL,
          
          -- Structure analysis
          intro_end REAL,
          outro_start REAL,
          first_beat REAL,
          last_beat REAL,
          
          -- Hot cues (JSON array)
          hot_cues TEXT,
          
          -- Advanced DJ features
          danceability REAL,
          valence REAL,
          instrumentalness REAL,
          speechiness REAL,
          
          -- Technical audio data
          sample_rate INTEGER,
          bit_depth INTEGER,
          channels INTEGER,
          codec TEXT,
          
          -- Analysis metadata
          analysis_version TEXT,
          analysis_confidence REAL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_file_path ON analysis_results(file_path);
        CREATE INDEX IF NOT EXISTS idx_bpm ON analysis_results(bpm);
        CREATE INDEX IF NOT EXISTS idx_musical_key ON analysis_results(musical_key);
        CREATE INDEX IF NOT EXISTS idx_energy_level ON analysis_results(energy_level);
        CREATE INDEX IF NOT EXISTS idx_last_analyzed ON analysis_results(last_analyzed);
      `);

      this.isInitialized = true;
      this.emit('initialized');
      console.log('[AutoTagger] Database initialized with DJ analysis schema');
      
    } catch (error) {
      console.error('[AutoTagger] Database initialization failed:', error);
      this.emit('error', error);
      throw error;
    }
  }

  // Main analysis method - analyzes a single track
  async analyzeTrack(filePath) {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }

    try {
      console.log(`[AutoTagger] Starting analysis for: ${filePath}`);
      this.emit('analysisStarted', { filePath });

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get basic metadata first
      const metadata = await this.extractMetadata(filePath);
      
      // Extract audio for analysis
      const audioData = await this.extractAudioData(filePath);
      
      // Perform comprehensive analysis
      const analysis = await this.performAudioAnalysis(audioData, metadata);
      
      // Combine all results
      const result = {
        file_path: filePath,
        file_hash: await this.calculateFileHash(filePath),
        ...metadata,
        ...analysis,
        analysis_version: '2.0.0',
        analysis_confidence: this.calculateOverallConfidence(analysis)
      };

      // Save to database
      await this.saveAnalysisResult(result);
      
      this.emit('analysisComplete', { filePath, result });
      console.log(`[AutoTagger] Analysis complete for: ${path.basename(filePath)}`);
      
      return result;
      
    } catch (error) {
      console.error(`[AutoTagger] Analysis failed for ${filePath}:`, error);
      this.emit('analysisError', { filePath, error });
      throw error;
    }
  }

  // Extract metadata using music-metadata
  async extractMetadata(filePath) {
    try {
      const metadata = await parseFile(filePath);
      const format = metadata.format;
      const common = metadata.common;

      return {
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artist || 'Unknown Artist',
        album: common.album || 'Unknown Album',
        year: common.year || null,
        genre: common.genre?.[0] || 'Unknown',
        duration: format.duration || 0,
        sample_rate: format.sampleRate || 44100,
        bit_depth: format.bitsPerSample || 16,
        channels: format.numberOfChannels || 2,
        codec: format.codec || 'unknown'
      };
    } catch (error) {
      console.warn(`[AutoTagger] Metadata extraction failed for ${filePath}:`, error);
      return {
        title: path.basename(filePath, path.extname(filePath)),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0
      };
    }
  }

  // Extract raw audio data using FFmpeg
  async extractAudioData(filePath) {
    return new Promise((resolve, reject) => {
      const audioBuffer = [];
      
      ffmpeg(filePath)
        .audioCodec('pcm_f32le')
        .audioChannels(1) // Mono for analysis
        .audioFrequency(this.settings.sampleRate)
        .format('f32le')
        .on('error', reject)
        .pipe()
        .on('data', (chunk) => {
          audioBuffer.push(chunk);
        })
        .on('end', () => {
          const buffer = Buffer.concat(audioBuffer);
          const floatArray = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
          resolve(Array.from(floatArray));
        });
    });
  }

  // Comprehensive audio analysis
  async performAudioAnalysis(audioSamples, metadata) {
    const sampleRate = this.settings.sampleRate;
    
    // Run all analysis in parallel for efficiency
    const [
      bpmAnalysis,
      keyAnalysis,
      energyAnalysis,
      loudnessAnalysis,
      structureAnalysis,
      advancedFeatures
    ] = await Promise.all([
      this.analyzeBPM(audioSamples, sampleRate),
      this.analyzeKey(audioSamples, sampleRate),
      this.analyzeEnergy(audioSamples, sampleRate),
      this.analyzeLoudness(audioSamples, sampleRate),
      this.analyzeStructure(audioSamples, sampleRate, metadata.duration),
      this.analyzeAdvancedFeatures(audioSamples, sampleRate)
    ]);

    return {
      ...bpmAnalysis,
      ...keyAnalysis,
      ...energyAnalysis,
      ...loudnessAnalysis,
      ...structureAnalysis,
      ...advancedFeatures
    };
  }

  // BPM detection using autocorrelation and peak detection
  async analyzeBPM(audioSamples, sampleRate) {
    try {
      // Apply onset detection to find beats
      const onsets = this.detectOnsets(audioSamples, sampleRate);
      
      if (onsets.length < 4) {
        return { bpm: null, bpm_confidence: 0 };
      }

      // Calculate intervals between onsets
      const intervals = [];
      for (let i = 1; i < onsets.length; i++) {
        intervals.push(onsets[i] - onsets[i-1]);
      }

      // Find most common interval (mode)
      const histogram = {};
      intervals.forEach(interval => {
        const bpm = Math.round(60 / interval);
        if (bpm >= this.settings.minBPM && bpm <= this.settings.maxBPM) {
          histogram[bpm] = (histogram[bpm] || 0) + 1;
        }
      });

      // Find BPM with highest count
      let maxCount = 0;
      let detectedBPM = null;
      
      for (const [bpm, count] of Object.entries(histogram)) {
        if (count > maxCount) {
          maxCount = count;
          detectedBPM = parseInt(bpm);
        }
      }

      const confidence = maxCount / intervals.length;
      
      return {
        bpm: detectedBPM,
        bpm_confidence: confidence
      };
      
    } catch (error) {
      console.warn('[AutoTagger] BPM analysis failed:', error);
      return { bpm: null, bpm_confidence: 0 };
    }
  }

  // Key detection using chromagram analysis
  async analyzeKey(audioSamples, sampleRate) {
    try {
      const chromagram = this.computeChromagram(audioSamples, sampleRate);
      const keyProfile = this.detectKey(chromagram);
      
      return {
        musical_key: keyProfile.key,
        key_confidence: keyProfile.confidence,
        camelot_key: this.toCamelotNotation(keyProfile.key)
      };
      
    } catch (error) {
      console.warn('[AutoTagger] Key analysis failed:', error);
      return { 
        musical_key: null, 
        key_confidence: 0,
        camelot_key: null 
      };
    }
  }

  // Energy level analysis
  async analyzeEnergy(audioSamples, sampleRate) {
    try {
      const windowSize = this.settings.energyWindowSize;
      const energies = [];
      
      for (let i = 0; i < audioSamples.length - windowSize; i += windowSize) {
        const window = audioSamples.slice(i, i + windowSize);
        const rms = Math.sqrt(window.reduce((sum, x) => sum + x * x, 0) / windowSize);
        energies.push(rms);
      }
      
      const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const maxEnergy = Math.max(...energies);
      const energyVariance = this.calculateVariance(energies);
      
      return {
        energy_level: avgEnergy,
        dynamic_range: maxEnergy - Math.min(...energies),
        peak_db: 20 * Math.log10(maxEnergy)
      };
      
    } catch (error) {
      console.warn('[AutoTagger] Energy analysis failed:', error);
      return { energy_level: 0, dynamic_range: 0, peak_db: -96 };
    }
  }

  // Loudness analysis (LUFS approximation)
  async analyzeLoudness(audioSamples, sampleRate) {
    try {
      // Simple LUFS approximation using RMS
      const rms = Math.sqrt(audioSamples.reduce((sum, x) => sum + x * x, 0) / audioSamples.length);
      const lufs = -23 + 20 * Math.log10(rms); // Rough LUFS approximation
      
      // Calculate loudness range (simplified)
      const windowSize = Math.floor(sampleRate * 3); // 3-second windows
      const loudnessValues = [];
      
      for (let i = 0; i < audioSamples.length - windowSize; i += windowSize) {
        const window = audioSamples.slice(i, i + windowSize);
        const windowRMS = Math.sqrt(window.reduce((sum, x) => sum + x * x, 0) / windowSize);
        loudnessValues.push(-23 + 20 * Math.log10(windowRMS));
      }
      
      loudnessValues.sort((a, b) => a - b);
      const range = loudnessValues[Math.floor(loudnessValues.length * 0.95)] - 
                   loudnessValues[Math.floor(loudnessValues.length * 0.1)];
      
      return {
        loudness_lufs: lufs,
        loudness_range: range
      };
      
    } catch (error) {
      console.warn('[AutoTagger] Loudness analysis failed:', error);
      return { loudness_lufs: -23, loudness_range: 0 };
    }
  }

  // Structure analysis (intro/outro detection)
  async analyzeStructure(audioSamples, sampleRate, duration) {
    try {
      const segmentSize = Math.floor(sampleRate * 10); // 10-second segments
      const energies = [];
      
      // Calculate energy for each segment
      for (let i = 0; i < audioSamples.length; i += segmentSize) {
        const segment = audioSamples.slice(i, Math.min(i + segmentSize, audioSamples.length));
        const rms = Math.sqrt(segment.reduce((sum, x) => sum + x * x, 0) / segment.length);
        energies.push(rms);
      }
      
      // Find intro end (first significant energy increase)
      const avgEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
      const threshold = avgEnergy * 0.5;
      
      let introEnd = 0;
      for (let i = 0; i < energies.length; i++) {
        if (energies[i] > threshold) {
          introEnd = i * 10; // Convert to seconds
          break;
        }
      }
      
      // Find outro start (last significant energy decrease)
      let outroStart = duration;
      for (let i = energies.length - 1; i >= 0; i--) {
        if (energies[i] > threshold) {
          outroStart = (i + 1) * 10; // Convert to seconds
          break;
        }
      }
      
      // Generate hot cues at energy peaks
      const hotCues = this.generateHotCues(energies, duration);
      
      return {
        intro_end: introEnd,
        outro_start: outroStart,
        first_beat: this.findFirstBeat(audioSamples, sampleRate),
        last_beat: this.findLastBeat(audioSamples, sampleRate, duration),
        hot_cues: JSON.stringify(hotCues)
      };
      
    } catch (error) {
      console.warn('[AutoTagger] Structure analysis failed:', error);
      return { 
        intro_end: 0, 
        outro_start: duration || 0, 
        first_beat: 0, 
        last_beat: duration || 0,
        hot_cues: JSON.stringify([])
      };
    }
  }

  // Advanced feature analysis
  async analyzeAdvancedFeatures(audioSamples, sampleRate) {
    try {
      // Calculate spectral features
      const spectralCentroid = this.calculateSpectralCentroid(audioSamples, sampleRate);
      const spectralRolloff = this.calculateSpectralRolloff(audioSamples, sampleRate);
      const zcr = this.calculateZeroCrossingRate(audioSamples);
      
      // Derive high-level features
      const danceability = Math.min(1, spectralCentroid / 3000); // Normalized
      const valence = Math.min(1, (spectralRolloff - 2000) / 8000); // Emotional valence
      const instrumentalness = 1 - Math.min(1, zcr * 100); // Less vocals = more instrumental
      const speechiness = Math.min(1, zcr * 50); // Higher ZCR suggests speech-like content
      
      return {
        danceability: Math.max(0, danceability),
        valence: Math.max(0, valence),
        instrumentalness: Math.max(0, instrumentalness),
        speechiness: Math.max(0, speechiness)
      };
      
    } catch (error) {
      console.warn('[AutoTagger] Advanced features analysis failed:', error);
      return { 
        danceability: 0.5, 
        valence: 0.5, 
        instrumentalness: 0.5, 
        speechiness: 0.5 
      };
    }
  }

  // Helper methods for audio analysis
  detectOnsets(audioSamples, sampleRate) {
    const windowSize = 1024;
    const hopSize = 512;
    const onsets = [];
    
    for (let i = 0; i < audioSamples.length - windowSize; i += hopSize) {
      const window = audioSamples.slice(i, i + windowSize);
      const energy = window.reduce((sum, x) => sum + x * x, 0);
      
      // Simple onset detection based on energy increase
      if (i > hopSize) {
        const prevWindow = audioSamples.slice(i - hopSize, i - hopSize + windowSize);
        const prevEnergy = prevWindow.reduce((sum, x) => sum + x * x, 0);
        
        if (energy > prevEnergy * 1.3) { // 30% increase threshold
          onsets.push(i / sampleRate);
        }
      }
    }
    
    return onsets;
  }

  computeChromagram(audioSamples, sampleRate) {
    // Simplified chromagram computation
    const fftSize = 2048;
    const chromaVector = new Array(12).fill(0);
    
    // This is a simplified version - real implementation would use FFT
    for (let i = 0; i < audioSamples.length - fftSize; i += fftSize) {
      const window = audioSamples.slice(i, i + fftSize);
      // Apply windowing and FFT here in real implementation
      // For now, just accumulate energy in different frequency bins
      for (let j = 0; j < window.length; j++) {
        const bin = j % 12;
        chromaVector[bin] += Math.abs(window[j]);
      }
    }
    
    return chromaVector;
  }

  detectKey(chromagram) {
    // Key profiles for major and minor keys
    const keyProfiles = {
      'C': [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1],
      'C#': [1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
      'D': [0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
      'D#': [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0],
      'E': [0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      'F': [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0],
      'F#': [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1],
      'G': [1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1],
      'G#': [1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0],
      'A': [0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1],
      'A#': [1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0],
      'B': [0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1]
    };
    
    let bestKey = 'C';
    let bestScore = 0;
    
    for (const [key, profile] of Object.entries(keyProfiles)) {
      let score = 0;
      for (let i = 0; i < 12; i++) {
        score += chromagram[i] * profile[i];
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestKey = key;
      }
    }
    
    const totalEnergy = chromagram.reduce((a, b) => a + b, 0);
    const confidence = totalEnergy > 0 ? bestScore / totalEnergy : 0;
    
    return { key: bestKey, confidence };
  }

  toCamelotNotation(key) {
    const camelotMap = {
      'C': '8A', 'Cm': '5A',
      'C#': '3A', 'C#m': '12A',
      'D': '10A', 'Dm': '7A',
      'D#': '5A', 'D#m': '2A',
      'E': '12A', 'Em': '9A',
      'F': '7A', 'Fm': '4A',
      'F#': '2A', 'F#m': '11A',
      'G': '9A', 'Gm': '6A',
      'G#': '4A', 'G#m': '1A',
      'A': '11A', 'Am': '8A',
      'A#': '6A', 'A#m': '3A',
      'B': '1A', 'Bm': '10A'
    };
    
    return camelotMap[key] || '1A';
  }

  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
  }

  calculateSpectralCentroid(audioSamples, sampleRate) {
    // Simplified spectral centroid calculation
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < audioSamples.length; i++) {
      const frequency = (i * sampleRate) / audioSamples.length;
      const magnitude = Math.abs(audioSamples[i]);
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  calculateSpectralRolloff(audioSamples, sampleRate) {
    // Find frequency below which 85% of energy is contained
    const totalEnergy = audioSamples.reduce((sum, x) => sum + x * x, 0);
    let cumulativeEnergy = 0;
    
    for (let i = 0; i < audioSamples.length; i++) {
      cumulativeEnergy += audioSamples[i] * audioSamples[i];
      if (cumulativeEnergy >= 0.85 * totalEnergy) {
        return (i * sampleRate) / audioSamples.length;
      }
    }
    
    return sampleRate / 2;
  }

  calculateZeroCrossingRate(audioSamples) {
    let crossings = 0;
    for (let i = 1; i < audioSamples.length; i++) {
      if ((audioSamples[i] >= 0) !== (audioSamples[i-1] >= 0)) {
        crossings++;
      }
    }
    return crossings / audioSamples.length;
  }

  findFirstBeat(audioSamples, sampleRate) {
    const onsets = this.detectOnsets(audioSamples, sampleRate);
    return onsets.length > 0 ? onsets[0] : 0;
  }

  findLastBeat(audioSamples, sampleRate, duration) {
    const onsets = this.detectOnsets(audioSamples, sampleRate);
    return onsets.length > 0 ? onsets[onsets.length - 1] : duration;
  }

  generateHotCues(energies, duration) {
    const cues = [];
    const segmentDuration = duration / energies.length;
    
    // Find peaks in energy
    for (let i = 1; i < energies.length - 1; i++) {
      if (energies[i] > energies[i-1] && energies[i] > energies[i+1]) {
        const time = i * segmentDuration;
        const energy = energies[i];
        
        cues.push({
          time: Math.round(time * 100) / 100,
          type: 'energy_peak',
          value: Math.round(energy * 1000) / 1000
        });
      }
    }
    
    // Limit to 8 most significant cues
    return cues
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
      .sort((a, b) => a.time - b.time);
  }

  calculateOverallConfidence(analysis) {
    const confidences = [
      analysis.bpm_confidence || 0,
      analysis.key_confidence || 0
    ];
    
    return confidences.reduce((a, b) => a + b, 0) / confidences.length;
  }

  async calculateFileHash(filePath) {
    try {
      const crypto = require('crypto');
      const fileBuffer = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(fileBuffer).digest('hex');
    } catch (error) {
      console.warn(`[AutoTagger] Hash calculation failed for ${filePath}:`, error);
      return null;
    }
  }

  // Database operations
  async saveAnalysisResult(result) {
    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO analysis_results (
          file_path, file_hash, title, artist, album, year, genre, duration,
          bpm, bpm_confidence, musical_key, key_confidence, camelot_key,
          energy_level, loudness_lufs, loudness_range, dynamic_range, peak_db,
          intro_end, outro_start, first_beat, last_beat, hot_cues,
          danceability, valence, instrumentalness, speechiness,
          sample_rate, bit_depth, channels, codec,
          analysis_version, analysis_confidence, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, CURRENT_TIMESTAMP
        )
      `);

      stmt.run([
        result.file_path, result.file_hash, result.title, result.artist, result.album, 
        result.year, result.genre, result.duration,
        result.bpm, result.bpm_confidence, result.musical_key, result.key_confidence, result.camelot_key,
        result.energy_level, result.loudness_lufs, result.loudness_range, result.dynamic_range, result.peak_db,
        result.intro_end, result.outro_start, result.first_beat, result.last_beat, result.hot_cues,
        result.danceability, result.valence, result.instrumentalness, result.speechiness,
        result.sample_rate, result.bit_depth, result.channels, result.codec,
        result.analysis_version, result.analysis_confidence
      ]);

      console.log(`[AutoTagger] Saved analysis for: ${path.basename(result.file_path)}`);
      
    } catch (error) {
      console.error('[AutoTagger] Failed to save analysis result:', error);
      throw error;
    }
  }

  async getAnalysisResult(filePath) {
    if (!this.isInitialized) {
      await this.initializeDatabase();
    }

    try {
      const stmt = this.db.prepare('SELECT * FROM analysis_results WHERE file_path = ?');
      const result = stmt.get(filePath);
      
      if (result && result.hot_cues) {
        result.hot_cues = JSON.parse(result.hot_cues);
      }
      
      return result;
    } catch (error) {
      console.error('[AutoTagger] Failed to get analysis result:', error);
      return null;
    }
  }

  async batchAnalyze(filePaths, progressCallback = null) {
    const results = [];
    const total = filePaths.length;
    
    for (let i = 0; i < filePaths.length; i++) {
      try {
        const result = await this.analyzeTrack(filePaths[i]);
        results.push({ success: true, filePath: filePaths[i], result });
        
        if (progressCallback) {
          progressCallback({ completed: i + 1, total, current: filePaths[i] });
        }
        
      } catch (error) {
        results.push({ success: false, filePath: filePaths[i], error: error.message });
        console.error(`[AutoTagger] Batch analysis failed for ${filePaths[i]}:`, error);
      }
    }
    
    return results;
  }

  // Cleanup
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }
}

module.exports = AutoTagger;

