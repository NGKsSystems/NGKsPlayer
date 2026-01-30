/**
 * Professional Tempo Analyzer
 * Beat detection, tempo estimation, and rhythm analysis
 * Supports real-time and offline analysis
 */

export class TempoAnalyzer {
    constructor(audioContext, sampleRate = 44100) {
        this.audioContext = audioContext;
        this.sampleRate = sampleRate;
        
        // Analysis parameters
        this.frameSize = 2048;
        this.hopSize = 512;
        this.bufferSize = this.sampleRate * 10; // 10 seconds of audio
        
        // Tempo detection parameters
        this.minTempo = 60;    // BPM
        this.maxTempo = 200;   // BPM
        this.tempoSmoothingFactor = 0.9;
        
        // Beat detection parameters
        this.beatThreshold = 0.3;
        this.adaptiveThreshold = true;
        this.minimumBeatInterval = 0.3; // seconds
        
        // Frequency bands for beat detection
        this.frequencyBands = [
            { name: 'sub-bass', min: 20, max: 60 },
            { name: 'bass', min: 60, max: 250 },
            { name: 'low-mid', min: 250, max: 500 },
            { name: 'mid', min: 500, max: 2000 },
            { name: 'high-mid', min: 2000, max: 4000 },
            { name: 'high', min: 4000, max: 8000 }
        ];
        
        // Analysis buffers
        this.audioBuffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.analysisHistory = [];
        
        // Beat tracking
        this.beats = [];
        this.tempoHistory = [];
        this.currentTempo = 0;
        this.confidence = 0;
        this.phase = 0; // Beat phase (0-1)
        
        // Onset detection
        this.onsetDetector = new OnsetDetector(sampleRate);
        
        // Spectral analysis
        this.spectralAnalyzer = new SpectralAnalyzer(sampleRate);
        
        // Autocorrelation for tempo
        this.autocorrelationBuffer = new Float32Array(this.sampleRate);
        
        // Real-time processing
        this.processingActive = false;
        
        this.initializeProcessor();
    }
    
    initializeProcessor() {
        // Create audio worklet for real-time analysis
        this.audioContext.audioWorklet.addModule('/src/worklets/TempoAnalysisWorklet.js')
            .then(() => {
                this.workletNode = new AudioWorkletNode(this.audioContext, 'tempo-analysis-processor');
                this.setupWorkletCommunication();
            });
    }
    
    setupWorkletCommunication() {
        this.workletNode.port.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'onset-detected':
                    this.handleOnsetDetection(data);
                    break;
                case 'beat-detected':
                    this.handleBeatDetection(data);
                    break;
                case 'tempo-updated':
                    this.handleTempoUpdate(data);
                    break;
                case 'analysis-data':
                    this.handleAnalysisData(data);
                    break;
            }
        };
    }
    
    // Main tempo analysis function
    async analyzeAudio(audioBuffer) {
        const results = {
            tempo: 0,
            confidence: 0,
            beats: [],
            onsets: [],
            timeSignature: { numerator: 4, denominator: 4 },
            rhythmPattern: [],
            tempoStability: 0
        };
        
        const audioData = audioBuffer.getChannelData(0);
        
        // Detect onsets
        const onsets = await this.detectOnsets(audioData);
        results.onsets = onsets;
        
        // Analyze tempo from onsets
        const tempoAnalysis = this.analyzeTempoFromOnsets(onsets);
        results.tempo = tempoAnalysis.tempo;
        results.confidence = tempoAnalysis.confidence;
        results.tempoStability = tempoAnalysis.stability;
        
        // Detect beats
        const beats = this.detectBeats(onsets, results.tempo);
        results.beats = beats;
        
        // Analyze time signature
        results.timeSignature = this.analyzeTimeSignature(beats, results.tempo);
        
        // Extract rhythm pattern
        results.rhythmPattern = this.extractRhythmPattern(beats, results.tempo);
        
        return results;
    }
    
    // Onset detection
    async detectOnsets(audioData) {
        const onsets = [];
        const stepSize = this.hopSize;
        
        // Initialize onset detection buffers
        let previousSpectrum = null;
        let previousEnergy = 0;
        
        for (let pos = 0; pos < audioData.length - this.frameSize; pos += stepSize) {
            const frame = audioData.slice(pos, pos + this.frameSize);
            const timePosition = pos / this.sampleRate;
            
            // Spectral analysis
            const spectrum = this.spectralAnalyzer.analyze(frame);
            const energy = this.calculateEnergy(frame);
            
            // Onset detection methods
            const spectralDiff = previousSpectrum ? 
                this.calculateSpectralDifference(spectrum, previousSpectrum) : 0;
            
            const energyDiff = energy - previousEnergy;
            
            const complexDomainOnset = this.calculateComplexDomainOnset(spectrum, previousSpectrum);
            
            // Combine onset detection functions
            const onsetStrength = this.combineOnsetFunctions({
                spectralDiff,
                energyDiff,
                complexDomain: complexDomainOnset,
                timePosition
            });
            
            if (onsetStrength > this.beatThreshold) {
                onsets.push({
                    time: timePosition,
                    strength: onsetStrength,
                    frequency: this.estimateOnsetFrequency(spectrum),
                    type: this.classifyOnset(spectrum, previousSpectrum)
                });
            }
            
            previousSpectrum = spectrum;
            previousEnergy = energy;
        }
        
        // Post-process onsets (remove duplicates, apply minimum interval)
        return this.postProcessOnsets(onsets);
    }
    
    calculateSpectralDifference(current, previous) {
        let diff = 0;
        const minLength = Math.min(current.magnitude.length, previous.magnitude.length);
        
        for (let i = 0; i < minLength; i++) {
            const currentMag = current.magnitude[i];
            const previousMag = previous.magnitude[i];
            
            // Half-wave rectified spectral difference
            if (currentMag > previousMag) {
                diff += currentMag - previousMag;
            }
        }
        
        return diff;
    }
    
    calculateComplexDomainOnset(current, previous) {
        if (!previous) return 0;
        
        let onset = 0;
        const minLength = Math.min(current.magnitude.length, previous.magnitude.length);
        
        for (let i = 0; i < minLength; i++) {
            const currentMag = current.magnitude[i];
            const previousMag = previous.magnitude[i];
            const currentPhase = current.phase[i];
            const previousPhase = previous.phase[i];
            
            // Predicted phase
            const phaseDiff = currentPhase - previousPhase;
            const unwrappedDiff = this.unwrapPhase(phaseDiff);
            
            // Deviation from predicted phase
            const phaseDeviation = Math.abs(unwrappedDiff);
            
            onset += currentMag * phaseDeviation;
        }
        
        return onset;
    }
    
    combineOnsetFunctions(functions) {
        // Weighted combination of onset detection functions
        const weights = {
            spectralDiff: 0.4,
            energyDiff: 0.3,
            complexDomain: 0.3
        };
        
        let combined = 0;
        combined += functions.spectralDiff * weights.spectralDiff;
        combined += Math.max(0, functions.energyDiff) * weights.energyDiff;
        combined += functions.complexDomain * weights.complexDomain;
        
        return combined;
    }
    
    postProcessOnsets(onsets) {
        const processed = [];
        let lastOnsetTime = -Infinity;
        
        // Sort by time
        onsets.sort((a, b) => a.time - b.time);
        
        // Apply minimum interval and adaptive threshold
        let adaptiveThreshold = this.beatThreshold;
        
        onsets.forEach(onset => {
            if (onset.time - lastOnsetTime >= this.minimumBeatInterval) {
                if (this.adaptiveThreshold) {
                    // Update adaptive threshold based on recent onset strengths
                    const recentOnsets = processed.slice(-10);
                    if (recentOnsets.length > 0) {
                        const avgStrength = recentOnsets.reduce((sum, o) => sum + o.strength, 0) / recentOnsets.length;
                        adaptiveThreshold = avgStrength * 0.7;
                    }
                }
                
                if (onset.strength > adaptiveThreshold) {
                    processed.push(onset);
                    lastOnsetTime = onset.time;
                }
            }
        });
        
        return processed;
    }
    
    // Tempo analysis from onsets
    analyzeTempoFromOnsets(onsets) {
        if (onsets.length < 3) {
            return { tempo: 0, confidence: 0, stability: 0 };
        }
        
        // Calculate inter-onset intervals
        const intervals = [];
        for (let i = 1; i < onsets.length; i++) {
            intervals.push(onsets[i].time - onsets[i - 1].time);
        }
        
        // Autocorrelation method for tempo detection
        const tempoFromAutocorr = this.autocorrelationTempo(intervals);
        
        // Beat tracking method
        const tempoFromBeats = this.beatTrackingTempo(onsets);
        
        // Combine results
        const tempo = this.combineTempo([tempoFromAutocorr, tempoFromBeats]);
        
        // Calculate confidence and stability
        const confidence = this.calculateTempoConfidence(intervals, tempo);
        const stability = this.calculateTempoStability(intervals);
        
        return { tempo, confidence, stability };
    }
    
    autocorrelationTempo(intervals) {
        if (intervals.length < 10) return 0;
        
        const maxLag = Math.min(intervals.length / 2, 100);
        const autocorr = new Float32Array(maxLag);
        
        // Calculate autocorrelation of interval sequence
        for (let lag = 1; lag < maxLag; lag++) {
            let sum = 0;
            let count = 0;
            
            for (let i = 0; i < intervals.length - lag; i++) {
                sum += intervals[i] * intervals[i + lag];
                count++;
            }
            
            autocorr[lag] = count > 0 ? sum / count : 0;
        }
        
        // Find peak in autocorrelation
        let maxCorr = 0;
        let bestLag = 0;
        
        for (let lag = 1; lag < maxLag; lag++) {
            if (autocorr[lag] > maxCorr) {
                maxCorr = autocorr[lag];
                bestLag = lag;
            }
        }
        
        if (bestLag === 0) return 0;
        
        // Convert to BPM
        const avgInterval = intervals.slice(0, bestLag).reduce((sum, val) => sum + val, 0) / bestLag;
        const tempo = 60 / avgInterval;
        
        // Ensure tempo is in valid range
        return Math.max(this.minTempo, Math.min(this.maxTempo, tempo));
    }
    
    beatTrackingTempo(onsets) {
        // Dynamic programming approach for beat tracking
        const scoreMatrix = [];
        const tempoRange = [];
        
        // Create tempo hypotheses
        for (let tempo = this.minTempo; tempo <= this.maxTempo; tempo += 1) {
            tempoRange.push(tempo);
        }
        
        // Initialize score matrix
        for (let i = 0; i < onsets.length; i++) {
            scoreMatrix[i] = new Float32Array(tempoRange.length);
        }
        
        // Fill score matrix using dynamic programming
        for (let i = 1; i < onsets.length; i++) {
            for (let t = 0; t < tempoRange.length; t++) {
                const tempo = tempoRange[t];
                const beatInterval = 60 / tempo;
                
                let maxScore = 0;
                
                // Look back for compatible beats
                for (let j = 0; j < i; j++) {
                    const timeGap = onsets[i].time - onsets[j].time;
                    const expectedBeats = Math.round(timeGap / beatInterval);
                    
                    if (expectedBeats > 0) {
                        const error = Math.abs(timeGap - expectedBeats * beatInterval);
                        const tolerance = beatInterval * 0.2; // 20% tolerance
                        
                        if (error < tolerance) {
                            const score = scoreMatrix[j][t] + onsets[i].strength * (1 - error / tolerance);
                            maxScore = Math.max(maxScore, score);
                        }
                    }
                }
                
                scoreMatrix[i][t] = maxScore + onsets[i].strength;
            }
        }
        
        // Find best tempo
        let maxScore = 0;
        let bestTempo = 0;
        
        for (let t = 0; t < tempoRange.length; t++) {
            const totalScore = scoreMatrix[onsets.length - 1][t];
            if (totalScore > maxScore) {
                maxScore = totalScore;
                bestTempo = tempoRange[t];
            }
        }
        
        return bestTempo;
    }
    
    combineTempo(tempos) {
        const validTempos = tempos.filter(t => t > 0);
        if (validTempos.length === 0) return 0;
        
        // Weighted average (prefer more consistent tempos)
        return validTempos.reduce((sum, tempo) => sum + tempo, 0) / validTempos.length;
    }
    
    calculateTempoConfidence(intervals, tempo) {
        if (tempo === 0 || intervals.length === 0) return 0;
        
        const beatInterval = 60 / tempo;
        let matches = 0;
        
        intervals.forEach(interval => {
            const nearestBeat = Math.round(interval / beatInterval);
            const expectedInterval = nearestBeat * beatInterval;
            const error = Math.abs(interval - expectedInterval);
            
            if (error < beatInterval * 0.2) {
                matches++;
            }
        });
        
        return matches / intervals.length;
    }
    
    calculateTempoStability(intervals) {
        if (intervals.length < 2) return 0;
        
        const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
        const variance = intervals.reduce((sum, val) => sum + (val - mean) ** 2, 0) / intervals.length;
        const stdDev = Math.sqrt(variance);
        
        // Stability is inverse of coefficient of variation
        return mean > 0 ? 1 / (1 + stdDev / mean) : 0;
    }
    
    // Beat detection
    detectBeats(onsets, tempo) {
        if (tempo === 0 || onsets.length === 0) return [];
        
        const beatInterval = 60 / tempo;
        const beats = [];
        
        // Start from first onset
        let currentBeatTime = onsets[0].time;
        let onsetIndex = 0;
        
        while (currentBeatTime < onsets[onsets.length - 1].time + beatInterval) {
            // Find closest onset to predicted beat time
            let closestOnset = null;
            let minDistance = Infinity;
            
            for (let i = onsetIndex; i < onsets.length; i++) {
                const distance = Math.abs(onsets[i].time - currentBeatTime);
                if (distance < minDistance && distance < beatInterval * 0.3) {
                    minDistance = distance;
                    closestOnset = onsets[i];
                    onsetIndex = i;
                }
            }
            
            if (closestOnset) {
                beats.push({
                    time: closestOnset.time,
                    strength: closestOnset.strength,
                    confidence: 1 - (minDistance / (beatInterval * 0.3))
                });
                currentBeatTime = closestOnset.time + beatInterval;
            } else {
                // Insert predicted beat
                beats.push({
                    time: currentBeatTime,
                    strength: 0,
                    confidence: 0.3 // Low confidence for predicted beats
                });
                currentBeatTime += beatInterval;
            }
        }
        
        return beats;
    }
    
    // Time signature analysis
    analyzeTimeSignature(beats, tempo) {
        if (beats.length < 8) {
            return { numerator: 4, denominator: 4 };
        }
        
        const beatInterval = 60 / tempo;
        
        // Analyze beat strength patterns
        const strongBeats = beats.filter(beat => beat.strength > 0.7);
        const patterns = this.findBeatPatterns(strongBeats, beatInterval);
        
        // Most common patterns
        const commonPatterns = [
            { numerator: 4, denominator: 4, interval: beatInterval },
            { numerator: 3, denominator: 4, interval: beatInterval },
            { numerator: 6, denominator: 8, interval: beatInterval * 0.5 },
            { numerator: 2, denominator: 4, interval: beatInterval }
        ];
        
        let bestPattern = { numerator: 4, denominator: 4 };
        let bestScore = 0;
        
        commonPatterns.forEach(pattern => {
            const score = this.scoreTimeSignature(strongBeats, pattern);
            if (score > bestScore) {
                bestScore = score;
                bestPattern = pattern;
            }
        });
        
        return bestPattern;
    }
    
    findBeatPatterns(beats, interval) {
        const patterns = {};
        
        for (let i = 0; i < beats.length - 1; i++) {
            const gap = beats[i + 1].time - beats[i].time;
            const ratio = Math.round(gap / interval);
            
            if (ratio >= 1 && ratio <= 8) {
                patterns[ratio] = (patterns[ratio] || 0) + 1;
            }
        }
        
        return patterns;
    }
    
    scoreTimeSignature(beats, pattern) {
        let score = 0;
        const expectedInterval = pattern.interval;
        
        for (let i = 0; i < beats.length - 1; i++) {
            const gap = beats[i + 1].time - beats[i].time;
            const expectedBeats = Math.round(gap / expectedInterval);
            const actualInterval = gap / expectedBeats;
            
            const error = Math.abs(actualInterval - expectedInterval);
            if (error < expectedInterval * 0.2) {
                score += 1 - (error / (expectedInterval * 0.2));
            }
        }
        
        return score / Math.max(1, beats.length - 1);
    }
    
    // Rhythm pattern extraction
    extractRhythmPattern(beats, tempo) {
        if (beats.length < 4) return [];
        
        const beatInterval = 60 / tempo;
        const pattern = [];
        
        // Quantize beats to grid
        const gridResolution = 16; // 16th notes
        const gridInterval = beatInterval / 4; // 4 quarters per beat
        
        beats.forEach(beat => {
            const gridPosition = Math.round(beat.time / gridInterval);
            pattern.push({
                position: gridPosition,
                strength: beat.strength,
                time: beat.time
            });
        });
        
        return pattern;
    }
    
    // Real-time processing
    connect(sourceNode) {
        if (this.workletNode) {
            sourceNode.connect(this.workletNode);
            return this.workletNode;
        }
        return sourceNode;
    }
    
    disconnect() {
        if (this.workletNode) {
            this.workletNode.disconnect();
        }
    }
    
    startRealTimeAnalysis() {
        this.processingActive = true;
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: 'start-analysis' });
        }
    }
    
    stopRealTimeAnalysis() {
        this.processingActive = false;
        if (this.workletNode) {
            this.workletNode.port.postMessage({ type: 'stop-analysis' });
        }
    }
    
    // Utility functions
    calculateEnergy(frame) {
        let energy = 0;
        for (let i = 0; i < frame.length; i++) {
            energy += frame[i] * frame[i];
        }
        return energy / frame.length;
    }
    
    unwrapPhase(phaseDiff) {
        while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
        while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;
        return phaseDiff;
    }
    
    estimateOnsetFrequency(spectrum) {
        let maxMag = 0;
        let peakBin = 0;
        
        for (let i = 0; i < spectrum.magnitude.length; i++) {
            if (spectrum.magnitude[i] > maxMag) {
                maxMag = spectrum.magnitude[i];
                peakBin = i;
            }
        }
        
        return (peakBin / spectrum.magnitude.length) * (this.sampleRate / 2);
    }
    
    classifyOnset(current, previous) {
        if (!previous) return 'unknown';
        
        // Simple onset classification based on spectral characteristics
        const bassEnergy = this.getBandEnergy(current, 60, 250);
        const midEnergy = this.getBandEnergy(current, 250, 2000);
        const highEnergy = this.getBandEnergy(current, 2000, 8000);
        
        const totalEnergy = bassEnergy + midEnergy + highEnergy;
        
        if (totalEnergy === 0) return 'unknown';
        
        const bassRatio = bassEnergy / totalEnergy;
        const midRatio = midEnergy / totalEnergy;
        const highRatio = highEnergy / totalEnergy;
        
        if (bassRatio > 0.5) return 'bass';
        if (highRatio > 0.4) return 'percussion';
        if (midRatio > 0.4) return 'melodic';
        
        return 'complex';
    }
    
    getBandEnergy(spectrum, minFreq, maxFreq) {
        const minBin = Math.floor(minFreq * spectrum.magnitude.length / (this.sampleRate / 2));
        const maxBin = Math.floor(maxFreq * spectrum.magnitude.length / (this.sampleRate / 2));
        
        let energy = 0;
        for (let i = minBin; i <= maxBin && i < spectrum.magnitude.length; i++) {
            energy += spectrum.magnitude[i] * spectrum.magnitude[i];
        }
        
        return energy;
    }
    
    // Event handlers
    handleOnsetDetection(data) {
        this.dispatchEvent(new CustomEvent('onset-detected', { detail: data }));
    }
    
    handleBeatDetection(data) {
        this.dispatchEvent(new CustomEvent('beat-detected', { detail: data }));
    }
    
    handleTempoUpdate(data) {
        this.currentTempo = data.tempo;
        this.confidence = data.confidence;
        this.dispatchEvent(new CustomEvent('tempo-updated', { detail: data }));
    }
    
    handleAnalysisData(data) {
        this.dispatchEvent(new CustomEvent('analysis-data', { detail: data }));
    }
    
    // Event handling
    addEventListener(type, listener) {
        if (!this.eventListeners) this.eventListeners = {};
        if (!this.eventListeners[type]) this.eventListeners[type] = [];
        this.eventListeners[type].push(listener);
    }
    
    dispatchEvent(event) {
        if (!this.eventListeners) return;
        const listeners = this.eventListeners[event.type];
        if (listeners) {
            listeners.forEach(listener => listener(event));
        }
    }
}

// Onset detector helper class
class OnsetDetector {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.frameSize = 1024;
        this.threshold = 0.3;
    }
    
    detect(frame) {
        // Simple energy-based onset detection
        const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length;
        return energy > this.threshold;
    }
}

// Spectral analyzer helper class
class SpectralAnalyzer {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.fftSize = 2048;
    }
    
    analyze(frame) {
        // Simplified spectral analysis
        const paddedFrame = new Float32Array(this.fftSize);
        paddedFrame.set(frame);
        
        const spectrum = this.fft(paddedFrame);
        const magnitude = new Float32Array(this.fftSize / 2 + 1);
        const phase = new Float32Array(this.fftSize / 2 + 1);
        
        for (let i = 0; i < magnitude.length; i++) {
            magnitude[i] = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2);
            phase[i] = Math.atan2(spectrum[i * 2 + 1], spectrum[i * 2]);
        }
        
        return { magnitude, phase };
    }
    
    fft(inputData) {
        // Simplified FFT - use proper library in production
        const N = inputData.length;
        const output = new Float32Array(N * 2);
        
        for (let k = 0; k < N; k++) {
            let realSum = 0;
            let imagSum = 0;
            
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                realSum += inputData[n] * Math.cos(angle);
                imagSum += inputData[n] * Math.sin(angle);
            }
            
            output[k * 2] = realSum;
            output[k * 2 + 1] = imagSum;
        }
        
        return output;
    }
}

export { OnsetDetector, SpectralAnalyzer };