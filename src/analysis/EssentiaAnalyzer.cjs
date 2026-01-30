const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const mm = require('music-metadata');
const Meyda = require('meyda');

class EssentiaAnalyzer {
    constructor() {
        this.tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async analyzeTrack(filePath) {
        console.log(`🎵 Starting REAL analysis of: ${path.basename(filePath)}`);
        const startTime = Date.now();
        
        try {
            // Extract audio to WAV for analysis
            const wavPath = await this.extractAudioToWav(filePath);
            
            // Load audio data into buffer
            const audioBuffer = await this.loadAudioBuffer(wavPath);
            
            // Perform DSP analysis
            const analysis = await this.performDSPAnalysis(audioBuffer);
            
            // Get metadata
            const metadata = await mm.parseFile(filePath);
            
            // Cleanup
            fs.unlinkSync(wavPath);
            
            const duration = (Date.now() - startTime) / 1000;
            console.log(`✅ Analysis completed in ${duration.toFixed(1)}s`);
            
            return {
                ...analysis,
                metadata: {
                    title: metadata.common.title || path.basename(filePath, path.extname(filePath)),
                    artist: metadata.common.artist || 'Unknown Artist',
                    album: metadata.common.album || 'Unknown Album',
                    duration: metadata.format.duration || 0,
                    genre: metadata.common.genre?.[0] || 'Unknown',
                    year: metadata.common.year || null
                },
                analysisTime: duration
            };
            
        } catch (error) {
            console.error('❌ Analysis failed:', error.message);
            throw error;
        }
    }

    async extractAudioToWav(inputPath) {
        return new Promise((resolve, reject) => {
            const outputPath = path.join(this.tempDir, `audio_${Date.now()}.wav`);
            
            console.log('🔄 Extracting audio...');
            
            const ffmpegProcess = spawn(ffmpeg, [
                '-i', inputPath,
                '-f', 'wav',
                '-ar', '44100',
                '-ac', '1',  // Mono for analysis
                '-acodec', 'pcm_s16le',
                '-y',
                outputPath
            ], { stdio: 'pipe' });

            let stderr = '';
            ffmpegProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ffmpegProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(outputPath);
                } else {
                    reject(new Error(`FFmpeg failed with code ${code}: ${stderr}`));
                }
            });

            ffmpegProcess.on('error', reject);
        });
    }

    async loadAudioBuffer(wavPath) {
        console.log('📊 Loading audio buffer...');
        
        const fs = require('fs');
        const data = fs.readFileSync(wavPath);
        
        // Skip WAV header (44 bytes) and read PCM data
        const pcmData = data.slice(44);
        const samples = new Float32Array(pcmData.length / 2);
        
        // Convert 16-bit PCM to Float32Array
        for (let i = 0; i < samples.length; i++) {
            const sample = pcmData.readInt16LE(i * 2);
            samples[i] = sample / 32768.0; // Normalize to [-1, 1]
        }
        
        return {
            sampleRate: 44100,
            samples: samples,
            duration: samples.length / 44100
        };
    }

    async performDSPAnalysis(audioBuffer) {
        console.log('🧮 Performing DSP analysis...');
        
        const sampleRate = audioBuffer.sampleRate;
        const samples = audioBuffer.samples;
        const frameSize = 2048;
        const hopSize = 512;
        
        // Arrays to collect features
        const chromaFrames = [];
        const energyFrames = [];
        const spectralCentroidFrames = [];
        const spectralFluxFrames = [];
        const rmsFrames = [];
        
        // Process audio in frames
        for (let i = 0; i < samples.length - frameSize; i += hopSize) {
            const frame = samples.slice(i, i + frameSize);
            
            // Extract features using Meyda
            const features = Meyda.extract([
                'chroma',
                'energy', 
                'rms',
                'spectralCentroid',
                'spectralFlux'
            ], frame);
            
            if (features.chroma) chromaFrames.push(features.chroma);
            if (features.energy) energyFrames.push(features.energy);
            if (features.rms) rmsFrames.push(features.rms);
            if (features.spectralCentroid) spectralCentroidFrames.push(features.spectralCentroid);
            if (features.spectralFlux) spectralFluxFrames.push(features.spectralFlux);
        }
        
        // Analyze BPM using onset detection
        const bpm = this.analyzeBPM(spectralFluxFrames, hopSize, sampleRate);
        
        // Analyze key using chroma features
        const key = this.analyzeKey(chromaFrames);
        
        // Analyze energy
        const energy = this.analyzeEnergy(energyFrames, rmsFrames);
        
        return {
            bpm: Math.round(bpm * 10) / 10, // Round to 1 decimal
            key: key,
            energy: Math.round(energy * 100) / 100, // Round to 2 decimals
            danceability: this.calculateDanceability(bpm, energy),
            valence: this.calculateValence(spectralCentroidFrames, energy),
            tempo: this.categorizeTempoFromBPM(bpm)
        };
    }

    analyzeBPM(spectralFluxFrames, hopSize, sampleRate) {
        if (spectralFluxFrames.length < 10) return 120; // Default if insufficient data
        
        // Find onsets using spectral flux
        const onsets = [];
        const threshold = this.calculateAdaptiveThreshold(spectralFluxFrames);
        
        for (let i = 1; i < spectralFluxFrames.length; i++) {
            const flux = spectralFluxFrames[i];
            if (flux > threshold && flux > spectralFluxFrames[i-1]) {
                const timeMs = (i * hopSize / sampleRate) * 1000;
                onsets.push(timeMs);
            }
        }
        
        if (onsets.length < 4) return 120; // Default if too few onsets
        
        // Calculate intervals between onsets
        const intervals = [];
        for (let i = 1; i < onsets.length; i++) {
            intervals.push(onsets[i] - onsets[i-1]);
        }
        
        // Find most common interval (peak in histogram)
        const bpm = this.findDominantBPM(intervals);
        
        // Validate BPM range
        if (bpm < 60) return bpm * 2;    // Double if too slow
        if (bpm > 200) return bpm / 2;   // Halve if too fast
        
        return bpm;
    }

    calculateAdaptiveThreshold(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - median, 2), 0) / values.length);
        return median + (stdDev * 0.5); // Adaptive threshold
    }

    findDominantBPM(intervals) {
        if (intervals.length === 0) return 120;
        
        // Convert intervals to BPM values
        const bpmValues = intervals.map(interval => 60000 / interval);
        
        // Create histogram bins
        const bins = {};
        bpmValues.forEach(bpm => {
            const bin = Math.round(bpm / 5) * 5; // Group into 5 BPM bins
            bins[bin] = (bins[bin] || 0) + 1;
        });
        
        // Find most frequent BPM
        let maxCount = 0;
        let dominantBPM = 120;
        
        for (const [bpm, count] of Object.entries(bins)) {
            if (count > maxCount) {
                maxCount = count;
                dominantBPM = parseInt(bpm);
            }
        }
        
        return dominantBPM;
    }

    analyzeKey(chromaFrames) {
        if (chromaFrames.length === 0) return 'C major';
        
        // Average chroma across all frames
        const avgChroma = new Array(12).fill(0);
        
        chromaFrames.forEach(chroma => {
            for (let i = 0; i < 12; i++) {
                avgChroma[i] += chroma[i] || 0;
            }
        });
        
        // Normalize
        for (let i = 0; i < 12; i++) {
            avgChroma[i] /= chromaFrames.length;
        }
        
        // Key profiles (Krumhansl-Schmuckler)
        const majorProfile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
        const minorProfile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
        
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        
        let maxCorrelation = -1;
        let detectedKey = 'C major';
        
        // Test all 24 keys (12 major + 12 minor)
        for (let tonic = 0; tonic < 12; tonic++) {
            // Major key
            let correlation = this.calculateCorrelation(avgChroma, majorProfile, tonic);
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                detectedKey = `${notes[tonic]} major`;
            }
            
            // Minor key
            correlation = this.calculateCorrelation(avgChroma, minorProfile, tonic);
            if (correlation > maxCorrelation) {
                maxCorrelation = correlation;
                detectedKey = `${notes[tonic]} minor`;
            }
        }
        
        return detectedKey;
    }

    calculateCorrelation(chroma, profile, tonic) {
        let correlation = 0;
        for (let i = 0; i < 12; i++) {
            const chromaIndex = (i + tonic) % 12;
            correlation += chroma[chromaIndex] * profile[i];
        }
        return correlation;
    }

    analyzeEnergy(energyFrames, rmsFrames) {
        if (energyFrames.length === 0 && rmsFrames.length === 0) return 0.5;
        
        // Use RMS if available, otherwise energy
        const frames = rmsFrames.length > 0 ? rmsFrames : energyFrames;
        
        const avgEnergy = frames.reduce((sum, val) => sum + val, 0) / frames.length;
        const maxEnergy = Math.max(...frames);
        
        // Normalize energy to 0-1 scale
        return Math.min(avgEnergy / (maxEnergy || 1), 1.0);
    }

    calculateDanceability(bpm, energy) {
        // Danceability based on BPM and energy
        let danceability = 0;
        
        // BPM component (peak at 120-130 BPM)
        if (bpm >= 90 && bpm <= 140) {
            danceability += 0.6;
        } else if (bpm >= 70 && bpm <= 160) {
            danceability += 0.4;
        } else {
            danceability += 0.2;
        }
        
        // Energy component
        danceability += energy * 0.4;
        
        return Math.min(Math.round(danceability * 100) / 100, 1.0);
    }

    calculateValence(spectralCentroidFrames, energy) {
        if (spectralCentroidFrames.length === 0) return 0.5;
        
        const avgCentroid = spectralCentroidFrames.reduce((sum, val) => sum + val, 0) / spectralCentroidFrames.length;
        
        // Higher spectral centroid + energy often indicates more positive valence
        const centroidComponent = Math.min(avgCentroid / 3000, 1.0); // Normalize
        const valence = (centroidComponent * 0.6) + (energy * 0.4);
        
        return Math.min(Math.round(valence * 100) / 100, 1.0);
    }

    categorizeTempoFromBPM(bpm) {
        if (bpm < 90) return 'Slow';
        if (bpm < 120) return 'Medium';
        if (bpm < 140) return 'Fast';
        return 'Very Fast';
    }
}

module.exports = EssentiaAnalyzer;
