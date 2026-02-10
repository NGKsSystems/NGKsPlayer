/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PitchCorrectionProcessor.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Pitch Correction Processor
 * Real-time pitch detection and correction with note snapping
 * Supports auto-tune style effects and natural pitch correction
 */

export class PitchCorrectionProcessor {
    constructor(audioContext, sampleRate = 44100) {
        this.audioContext = audioContext;
        this.sampleRate = sampleRate;
        
        // Pitch detection parameters
        this.frameSize = 4096;
        this.hopSize = 1024;
        this.minFrequency = 80;   // Lowest detectable frequency (Hz)
        this.maxFrequency = 2000; // Highest detectable frequency (Hz)
        
        // Correction parameters
        this.correctionStrength = 1.0; // 0 = no correction, 1 = full correction
        this.correctionSpeed = 0.1;    // Speed of correction (0-1)
        this.snapThreshold = 50;       // Cents threshold for note snapping
        this.vibratoPreservation = 0.5; // Amount of original vibrato to preserve
        
        // Musical parameters
        this.key = 'C';
        this.scale = 'major';
        this.temperament = 'equal'; // 'equal', 'just', 'pythagorean'
        this.referenceA4 = 440; // Hz
        
        // Processing modes
        this.mode = 'transparent'; // 'transparent', 'creative', 'robotic'
        this.formantCorrection = true;
        this.naturalVariation = true;
        
        // Analysis buffers
        this.analysisBuffer = new Float32Array(this.frameSize);
        this.previousPitch = 0;
        this.pitchHistory = [];
        this.confidenceHistory = [];
        
        // Correction state
        this.targetPitch = 0;
        this.currentCorrection = 0;
        this.correctionSmoother = new ExponentialSmoother(0.1);
        
        // Note detection
        this.noteDetector = new NoteDetector(this.referenceA4);
        this.scaleNotes = this.generateScaleNotes();
        
        // Pitch detection algorithm
        this.pitchDetector = new PitchDetector(sampleRate);
        
        // Time stretching for pitch correction
        this.timeStretch = null; // Will be injected
        
        this.initializeProcessor();
    }
    
    initializeProcessor() {
        // Create audio worklet for real-time processing
        this.audioContext.audioWorklet.addModule('./src/worklets/PitchCorrectionWorklet.js')
            .then(() => {
                this.workletNode = new AudioWorkletNode(this.audioContext, 'pitch-correction-processor');
                this.setupWorkletCommunication();
            });
    }
    
    setupWorkletCommunication() {
        this.workletNode.port.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'pitch-detected':
                    this.handlePitchDetection(data);
                    break;
                case 'note-detected':
                    this.handleNoteDetection(data);
                    break;
                case 'correction-applied':
                    this.handleCorrectionApplied(data);
                    break;
            }
        };
    }
    
    // Main pitch correction function
    async correctPitch(audioBuffer) {
        const inputData = audioBuffer.getChannelData(0);
        const outputBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            this.sampleRate
        );
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const correctedData = await this.correctChannel(channelData);
            outputBuffer.copyToChannel(correctedData, channel);
        }
        
        return outputBuffer;
    }
    
    async correctChannel(inputData) {
        const outputData = new Float32Array(inputData.length);
        
        // Process in overlapping frames
        for (let pos = 0; pos < inputData.length - this.frameSize; pos += this.hopSize) {
            const frame = inputData.slice(pos, pos + this.frameSize);
            const correctedFrame = await this.processFrame(frame, pos);
            
            // Overlap-add
            for (let i = 0; i < correctedFrame.length; i++) {
                if (pos + i < outputData.length) {
                    outputData[pos + i] += correctedFrame[i];
                }
            }
        }
        
        return outputData;
    }
    
    async processFrame(frame, position) {
        // Detect pitch
        const pitchData = this.pitchDetector.detectPitch(frame);
        
        if (pitchData.confidence < 0.5) {
            // Not enough confidence, return original frame
            return frame;
        }
        
        // Determine target pitch
        const targetNote = this.findTargetNote(pitchData.frequency);
        const targetFrequency = this.noteToFrequency(targetNote);
        
        // Calculate correction amount
        const correctionCents = this.frequencyToCents(targetFrequency / pitchData.frequency);
        const shouldCorrect = Math.abs(correctionCents) > this.snapThreshold;
        
        if (!shouldCorrect && this.mode === 'transparent') {
            return frame;
        }
        
        // Apply correction
        const correctionRatio = this.calculateCorrectionRatio(
            pitchData.frequency, 
            targetFrequency,
            correctionCents
        );
        
        // Use time stretching for pitch correction
        if (this.timeStretch && correctionRatio !== 1.0) {
            const tempBuffer = this.audioContext.createBuffer(1, frame.length, this.sampleRate);
            tempBuffer.copyToChannel(frame, 0);
            
            const correctedBuffer = await this.timeStretch.stretchAudio(
                tempBuffer, 
                1.0, // No time stretching
                correctionRatio
            );
            
            return correctedBuffer.getChannelData(0);
        }
        
        return frame;
    }
    
    // Pitch detection and analysis
    detectPitch(frame) {
        return this.pitchDetector.detectPitch(frame);
    }
    
    findTargetNote(frequency) {
        const cents = this.frequencyToCents(frequency / this.referenceA4);
        const semitonesFromA4 = Math.round(cents / 100);
        
        // Find closest note in current scale
        const noteInScale = this.findClosestScaleNote(semitonesFromA4);
        
        return {
            note: noteInScale.note,
            octave: noteInScale.octave,
            semitones: noteInScale.semitones
        };
    }
    
    findClosestScaleNote(semitonesFromA4) {
        let closestNote = null;
        let closestDistance = Infinity;
        
        this.scaleNotes.forEach(note => {
            const distance = Math.abs(note.semitones - semitonesFromA4);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        });
        
        return closestNote || { note: 'A', octave: 4, semitones: 0 };
    }
    
    generateScaleNotes() {
        const scales = {
            major: [0, 2, 4, 5, 7, 9, 11],
            minor: [0, 2, 3, 5, 7, 8, 10],
            pentatonic: [0, 2, 4, 7, 9],
            blues: [0, 3, 5, 6, 7, 10],
            chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
        };
        
        const scaleIntervals = scales[this.scale] || scales.chromatic;
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const keyOffset = notes.indexOf(this.key);
        
        const scaleNotes = [];
        
        // Generate notes across multiple octaves
        for (let octave = 1; octave <= 7; octave++) {
            scaleIntervals.forEach(interval => {
                const noteIndex = (keyOffset + interval) % 12;
                const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - 9); // A is index 9
                
                scaleNotes.push({
                    note: notes[noteIndex],
                    octave: octave,
                    semitones: semitonesFromA4
                });
            });
        }
        
        return scaleNotes;
    }
    
    // Musical calculations
    noteToFrequency(note) {
        const semitonesFromA4 = note.semitones;
        return this.referenceA4 * Math.pow(2, semitonesFromA4 / 12);
    }
    
    frequencyToCents(ratio) {
        return 1200 * Math.log2(ratio);
    }
    
    calculateCorrectionRatio(currentFreq, targetFreq, correctionCents) {
        let correctionAmount = correctionCents;
        
        // Apply correction strength
        correctionAmount *= this.correctionStrength;
        
        // Mode-specific adjustments
        switch (this.mode) {
            case 'transparent':
                // Gentle correction, preserve natural variations
                if (Math.abs(correctionCents) < this.snapThreshold) {
                    correctionAmount *= 0.3;
                }
                break;
                
            case 'creative':
                // More aggressive correction for effect
                correctionAmount *= 1.5;
                break;
                
            case 'robotic':
                // Full correction to exact pitch
                correctionAmount = correctionCents;
                break;
        }
        
        // Smooth correction over time
        this.targetCorrection = correctionAmount;
        this.currentCorrection = this.correctionSmoother.process(this.targetCorrection);
        
        // Convert cents to frequency ratio
        return Math.pow(2, this.currentCorrection / 1200);
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
    
    // Parameter updates
    setCorrectionStrength(strength) {
        this.correctionStrength = Math.max(0, Math.min(1, strength));
        this.updateWorkletParameters();
    }
    
    setCorrectionSpeed(speed) {
        this.correctionSpeed = Math.max(0, Math.min(1, speed));
        this.correctionSmoother.setResponse(speed);
        this.updateWorkletParameters();
    }
    
    setKey(key) {
        this.key = key;
        this.scaleNotes = this.generateScaleNotes();
        this.updateWorkletParameters();
    }
    
    setScale(scale) {
        this.scale = scale;
        this.scaleNotes = this.generateScaleNotes();
        this.updateWorkletParameters();
    }
    
    setMode(mode) {
        this.mode = mode;
        this.updateWorkletParameters();
    }
    
    setReferenceA4(frequency) {
        this.referenceA4 = frequency;
        this.scaleNotes = this.generateScaleNotes();
        this.updateWorkletParameters();
    }
    
    updateWorkletParameters() {
        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'update-parameters',
                parameters: {
                    correctionStrength: this.correctionStrength,
                    correctionSpeed: this.correctionSpeed,
                    key: this.key,
                    scale: this.scale,
                    mode: this.mode,
                    referenceA4: this.referenceA4,
                    scaleNotes: this.scaleNotes
                }
            });
        }
    }
    
    // Event handlers
    handlePitchDetection(data) {
        this.dispatchEvent(new CustomEvent('pitch-detected', { 
            detail: {
                frequency: data.frequency,
                confidence: data.confidence,
                clarity: data.clarity
            }
        }));
    }
    
    handleNoteDetection(data) {
        this.dispatchEvent(new CustomEvent('note-detected', { 
            detail: {
                note: data.note,
                octave: data.octave,
                cents: data.cents,
                inTune: data.inTune
            }
        }));
    }
    
    handleCorrectionApplied(data) {
        this.dispatchEvent(new CustomEvent('correction-applied', { 
            detail: {
                originalPitch: data.originalPitch,
                correctedPitch: data.correctedPitch,
                correctionAmount: data.correctionAmount
            }
        }));
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
    
    // Inject time stretch engine
    setTimeStretchEngine(timeStretchEngine) {
        this.timeStretch = timeStretchEngine;
    }
}

// Pitch detection class using autocorrelation and spectral methods
class PitchDetector {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.windowSize = 4096;
        this.threshold = 0.3;
        
        // Autocorrelation parameters
        this.minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
        this.maxPeriod = Math.floor(sampleRate / 50);  // 50 Hz min
        
        // Spectral analysis
        this.fftSize = 4096;
        this.binSize = sampleRate / this.fftSize;
    }
    
    detectPitch(frame) {
        // Normalize input
        const normalizedFrame = this.normalizeFrame(frame);
        
        // Try multiple algorithms and combine results
        const autocorrelationResult = this.autocorrelationMethod(normalizedFrame);
        const spectralResult = this.spectralMethod(normalizedFrame);
        const yinResult = this.yinMethod(normalizedFrame);
        
        // Combine results with confidence weighting
        const results = [autocorrelationResult, spectralResult, yinResult]
            .filter(result => result.confidence > 0.3)
            .sort((a, b) => b.confidence - a.confidence);
        
        if (results.length === 0) {
            return { frequency: 0, confidence: 0, clarity: 0 };
        }
        
        // Use best result or weighted average
        const bestResult = results[0];
        
        return {
            frequency: bestResult.frequency,
            confidence: bestResult.confidence,
            clarity: this.calculateClarity(normalizedFrame, bestResult.frequency)
        };
    }
    
    normalizeFrame(frame) {
        const normalized = new Float32Array(frame.length);
        let maxValue = 0;
        
        for (let i = 0; i < frame.length; i++) {
            maxValue = Math.max(maxValue, Math.abs(frame[i]));
        }
        
        if (maxValue > 0) {
            for (let i = 0; i < frame.length; i++) {
                normalized[i] = frame[i] / maxValue;
            }
        }
        
        return normalized;
    }
    
    autocorrelationMethod(frame) {
        const autocorrelation = new Float32Array(this.maxPeriod + 1);
        
        // Calculate autocorrelation
        for (let lag = this.minPeriod; lag <= this.maxPeriod; lag++) {
            let sum = 0;
            for (let i = 0; i < frame.length - lag; i++) {
                sum += frame[i] * frame[i + lag];
            }
            autocorrelation[lag] = sum / (frame.length - lag);
        }
        
        // Find peak
        let maxCorrelation = 0;
        let bestLag = 0;
        
        for (let lag = this.minPeriod; lag <= this.maxPeriod; lag++) {
            if (autocorrelation[lag] > maxCorrelation) {
                maxCorrelation = autocorrelation[lag];
                bestLag = lag;
            }
        }
        
        const frequency = maxCorrelation > this.threshold ? this.sampleRate / bestLag : 0;
        
        return {
            frequency,
            confidence: maxCorrelation
        };
    }
    
    spectralMethod(frame) {
        // Simple spectral peak detection
        const spectrum = this.fft(frame);
        const magnitude = new Float32Array(spectrum.length / 2);
        
        for (let i = 0; i < magnitude.length; i++) {
            magnitude[i] = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2);
        }
        
        // Find dominant peak
        let maxMagnitude = 0;
        let peakBin = 0;
        
        const minBin = Math.floor(50 / this.binSize);   // 50 Hz min
        const maxBin = Math.floor(800 / this.binSize);  // 800 Hz max
        
        for (let i = minBin; i < maxBin && i < magnitude.length; i++) {
            if (magnitude[i] > maxMagnitude) {
                maxMagnitude = magnitude[i];
                peakBin = i;
            }
        }
        
        const frequency = peakBin * this.binSize;
        const confidence = maxMagnitude / this.calculateRMS(magnitude);
        
        return {
            frequency,
            confidence: Math.min(confidence / 10, 1) // Normalize confidence
        };
    }
    
    yinMethod(frame) {
        // Simplified YIN algorithm
        const yinBuffer = new Float32Array(this.maxPeriod);
        
        // Calculate cumulative mean normalized difference
        for (let lag = 1; lag < this.maxPeriod; lag++) {
            let sum = 0;
            for (let i = 0; i < frame.length - lag; i++) {
                const diff = frame[i] - frame[i + lag];
                sum += diff * diff;
            }
            yinBuffer[lag] = sum;
        }
        
        // Cumulative mean normalized difference
        let runningSum = 0;
        for (let lag = 1; lag < this.maxPeriod; lag++) {
            runningSum += yinBuffer[lag];
            yinBuffer[lag] = yinBuffer[lag] / (runningSum / lag);
        }
        
        // Find first minimum below threshold
        let bestLag = 0;
        for (let lag = this.minPeriod; lag < this.maxPeriod; lag++) {
            if (yinBuffer[lag] < this.threshold) {
                bestLag = lag;
                break;
            }
        }
        
        if (bestLag === 0) {
            // Find global minimum
            let minValue = Infinity;
            for (let lag = this.minPeriod; lag < this.maxPeriod; lag++) {
                if (yinBuffer[lag] < minValue) {
                    minValue = yinBuffer[lag];
                    bestLag = lag;
                }
            }
        }
        
        const frequency = bestLag > 0 ? this.sampleRate / bestLag : 0;
        const confidence = bestLag > 0 ? 1 - yinBuffer[bestLag] : 0;
        
        return {
            frequency,
            confidence
        };
    }
    
    calculateClarity(frame, frequency) {
        if (frequency === 0) return 0;
        
        const period = this.sampleRate / frequency;
        const periodSamples = Math.floor(period);
        
        if (periodSamples >= frame.length / 2) return 0;
        
        // Calculate periodicity
        let correlation = 0;
        let count = 0;
        
        for (let i = 0; i < frame.length - periodSamples; i++) {
            correlation += frame[i] * frame[i + periodSamples];
            count++;
        }
        
        return count > 0 ? Math.abs(correlation / count) : 0;
    }
    
    calculateRMS(array) {
        let sum = 0;
        for (let i = 0; i < array.length; i++) {
            sum += array[i] * array[i];
        }
        return Math.sqrt(sum / array.length);
    }
    
    // Simplified FFT for demo purposes
    fft(inputData) {
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

// Note detection helper
class NoteDetector {
    constructor(referenceA4 = 440) {
        this.referenceA4 = referenceA4;
        this.noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    }
    
    frequencyToNote(frequency) {
        if (frequency <= 0) return null;
        
        const semitonesFromA4 = Math.round(12 * Math.log2(frequency / this.referenceA4));
        const octave = Math.floor((semitonesFromA4 + 9) / 12) + 4;
        const noteIndex = ((semitonesFromA4 + 9) % 12 + 12) % 12;
        
        const exactSemitones = 12 * Math.log2(frequency / this.referenceA4);
        const cents = Math.round((exactSemitones - semitonesFromA4) * 100);
        
        return {
            note: this.noteNames[noteIndex],
            octave,
            cents,
            frequency,
            exactSemitones
        };
    }
}

// Exponential smoother for parameter smoothing
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
    
    setResponse(alpha) {
        this.alpha = Math.max(0, Math.min(1, alpha));
    }
    
    reset() {
        this.initialized = false;
        this.previousValue = 0;
    }
}

export { PitchDetector, NoteDetector, ExponentialSmoother };
