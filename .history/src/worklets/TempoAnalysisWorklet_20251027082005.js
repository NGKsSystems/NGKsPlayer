/**
 * Tempo Analysis AudioWorklet Processor
 * Real-time beat detection and tempo analysis
 */

class TempoAnalysisProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Analysis parameters
        this.frameSize = 2048;
        this.hopSize = 512;
        this.sampleRate = 44100;
        
        // Tempo parameters
        this.minTempo = 60;
        this.maxTempo = 200;
        this.beatThreshold = 0.3;
        
        // Processing buffers
        this.inputBuffer = new Float32Array(this.frameSize * 2);
        this.analysisBuffer = new Float32Array(this.frameSize);
        this.inputIndex = 0;
        this.frameCount = 0;
        
        // Onset detection
        this.previousSpectrum = null;
        this.previousEnergy = 0;
        this.onsetHistory = [];
        
        // Beat tracking
        this.beatHistory = [];
        this.currentTempo = 0;
        this.tempoConfidence = 0;
        this.lastBeatTime = 0;
        
        // Analysis state
        this.isAnalyzing = false;
        
        // Window function
        this.window = this.createWindow(this.frameSize, 'hann');
        
        // Energy smoothing
        this.energySmoother = new ExponentialSmoother(0.1);
        
        // Message handling
        this.port.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }
    
    handleMessage(message) {
        const { type, value, parameters } = message;
        
        switch (type) {
            case 'start-analysis':
                this.isAnalyzing = true;
                break;
                
            case 'stop-analysis':
                this.isAnalyzing = false;
                break;
                
            case 'set-tempo-range':
                if (parameters) {
                    this.minTempo = parameters.min || this.minTempo;
                    this.maxTempo = parameters.max || this.maxTempo;
                }
                break;
                
            case 'set-sensitivity':
                this.beatThreshold = value;
                break;
                
            case 'reset-analysis':
                this.resetAnalysis();
                break;
        }
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        
        if (!input || !input[0]) {
            return true;
        }
        
        const inputChannel = input[0];
        const blockSize = inputChannel.length;
        
        // Pass through audio
        if (output && output[0]) {
            output[0].set(inputChannel);
        }
        
        if (!this.isAnalyzing) {
            return true;
        }
        
        // Process for analysis
        for (let i = 0; i < blockSize; i++) {
            this.inputBuffer[this.inputIndex] = inputChannel[i];
            this.inputIndex = (this.inputIndex + 1) % this.inputBuffer.length;
            
            // Analyze frame when ready
            if (this.inputIndex % this.hopSize === 0) {
                this.analyzeFrame();
            }
        }
        
        return true;
    }
    
    analyzeFrame() {
        // Extract analysis frame
        const frame = new Float32Array(this.frameSize);
        let readIndex = (this.inputIndex - this.frameSize + this.inputBuffer.length) % this.inputBuffer.length;
        
        for (let i = 0; i < this.frameSize; i++) {
            frame[i] = this.inputBuffer[readIndex];
            readIndex = (readIndex + 1) % this.inputBuffer.length;
        }
        
        // Apply window
        const windowedFrame = this.applyWindow(frame, this.window);
        
        // Calculate energy
        const energy = this.calculateEnergy(windowedFrame);
        const smoothedEnergy = this.energySmoother.process(energy);
        
        // Spectral analysis for onset detection
        const spectrum = this.calculateSpectrum(windowedFrame);
        
        // Detect onset
        const onsetStrength = this.detectOnset(spectrum, energy, smoothedEnergy);
        
        // Current time
        const currentTime = this.frameCount * this.hopSize / this.sampleRate;
        
        // Check for beat
        if (onsetStrength > this.beatThreshold) {
            this.detectBeat(currentTime, onsetStrength);
        }
        
        // Update tempo estimation
        if (this.frameCount % 20 === 0) { // Update every ~0.5 seconds
            this.updateTempoEstimation();
        }
        
        // Store previous values
        this.previousSpectrum = spectrum;
        this.previousEnergy = smoothedEnergy;
        this.frameCount++;
    }
    
    detectOnset(spectrum, energy, smoothedEnergy) {
        let onsetStrength = 0;
        
        // Energy-based onset detection
        const energyIncrease = energy - this.previousEnergy;
        if (energyIncrease > 0) {
            onsetStrength += energyIncrease;
        }
        
        // Spectral flux
        if (this.previousSpectrum) {
            let spectralFlux = 0;
            const minLength = Math.min(spectrum.length, this.previousSpectrum.length);
            
            for (let i = 0; i < minLength; i++) {
                const diff = spectrum[i] - this.previousSpectrum[i];
                if (diff > 0) {
                    spectralFlux += diff;
                }
            }
            
            onsetStrength += spectralFlux * 0.5;
        }
        
        // Normalize
        if (smoothedEnergy > 0) {
            onsetStrength /= smoothedEnergy;
        }
        
        return onsetStrength;
    }
    
    detectBeat(currentTime, strength) {
        // Minimum interval between beats
        const minInterval = 60 / this.maxTempo; // Minimum beat interval
        
        if (currentTime - this.lastBeatTime < minInterval) {
            return;
        }
        
        // Add to beat history
        this.beatHistory.push({
            time: currentTime,
            strength: strength
        });
        
        // Keep only recent beats (last 10 seconds)
        this.beatHistory = this.beatHistory.filter(beat => 
            currentTime - beat.time < 10
        );
        
        this.lastBeatTime = currentTime;
        
        // Send beat detection event
        this.port.postMessage({
            type: 'beat-detected',
            data: {
                time: currentTime,
                strength: strength
            }
        });
    }
    
    updateTempoEstimation() {
        if (this.beatHistory.length < 3) {
            return;
        }
        
        // Calculate inter-beat intervals
        const intervals = [];
        for (let i = 1; i < this.beatHistory.length; i++) {
            intervals.push(this.beatHistory[i].time - this.beatHistory[i - 1].time);
        }
        
        // Find most common interval (tempo)
        const tempo = this.estimateTempoFromIntervals(intervals);
        const confidence = this.calculateTempoConfidence(intervals, tempo);
        
        if (tempo !== this.currentTempo) {
            this.currentTempo = tempo;
            this.tempoConfidence = confidence;
            
            this.port.postMessage({
                type: 'tempo-updated',
                data: {
                    tempo: tempo,
                    confidence: confidence
                }
            });
        }
        
        // Send periodic analysis data
        this.port.postMessage({
            type: 'analysis-data',
            data: {
                beatCount: this.beatHistory.length,
                avgInterval: intervals.length > 0 ? 
                           intervals.reduce((sum, i) => sum + i, 0) / intervals.length : 0,
                tempo: this.currentTempo,
                confidence: this.tempoConfidence
            }
        });
    }
    
    estimateTempoFromIntervals(intervals) {
        if (intervals.length === 0) return 0;
        
        // Simple median-based tempo estimation
        const sortedIntervals = intervals.slice().sort((a, b) => a - b);
        const medianInterval = sortedIntervals[Math.floor(sortedIntervals.length / 2)];
        
        const tempo = 60 / medianInterval;
        
        // Clamp to valid range
        return Math.max(this.minTempo, Math.min(this.maxTempo, tempo));
    }
    
    calculateTempoConfidence(intervals, tempo) {
        if (intervals.length === 0 || tempo === 0) return 0;
        
        const expectedInterval = 60 / tempo;
        let matches = 0;
        
        intervals.forEach(interval => {
            const error = Math.abs(interval - expectedInterval) / expectedInterval;
            if (error < 0.2) { // 20% tolerance
                matches++;
            }
        });
        
        return matches / intervals.length;
    }
    
    calculateEnergy(frame) {
        let energy = 0;
        for (let i = 0; i < frame.length; i++) {
            energy += frame[i] * frame[i];
        }
        return energy / frame.length;
    }
    
    calculateSpectrum(frame) {
        // Simplified spectral analysis
        const spectrum = new Float32Array(this.frameSize / 2);
        
        // Basic FFT bins - simplified for demo
        const binSize = this.sampleRate / this.frameSize;
        
        for (let bin = 0; bin < spectrum.length; bin++) {
            let real = 0;
            let imag = 0;
            
            for (let n = 0; n < frame.length; n++) {
                const angle = -2 * Math.PI * bin * n / frame.length;
                real += frame[n] * Math.cos(angle);
                imag += frame[n] * Math.sin(angle);
            }
            
            spectrum[bin] = Math.sqrt(real * real + imag * imag) / frame.length;
        }
        
        return spectrum;
    }
    
    resetAnalysis() {
        this.onsetHistory = [];
        this.beatHistory = [];
        this.currentTempo = 0;
        this.tempoConfidence = 0;
        this.lastBeatTime = 0;
        this.previousSpectrum = null;
        this.previousEnergy = 0;
        this.frameCount = 0;
    }
    
    // Utility functions
    createWindow(size, type = 'hann') {
        const window = new Float32Array(size);
        
        for (let i = 0; i < size; i++) {
            switch (type) {
                case 'hann':
                    window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
                    break;
                case 'hamming':
                    window[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (size - 1));
                    break;
                default:
                    window[i] = 1.0;
            }
        }
        
        return window;
    }
    
    applyWindow(frame, window) {
        const windowed = new Float32Array(frame.length);
        for (let i = 0; i < frame.length; i++) {
            windowed[i] = frame[i] * window[i];
        }
        return windowed;
    }
}

// Simple exponential smoother
class ExponentialSmoother {
    constructor(alpha = 0.1) {
        this.alpha = alpha;
        this.previousValue = 0;
        this.initialized = false;
    }
    
    process(input) {
        if (!this.initialized) {
            this.previousValue = input;
            this.initialized = true;
            return input;
        }
        
        this.previousValue = this.alpha * input + (1 - this.alpha) * this.previousValue;
        return this.previousValue;
    }
}

registerProcessor('tempo-analysis-processor', TempoAnalysisProcessor);