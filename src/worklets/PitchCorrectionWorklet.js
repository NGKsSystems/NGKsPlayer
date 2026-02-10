/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PitchCorrectionWorklet.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Pitch Correction AudioWorklet Processor
 * Real-time pitch detection and correction
 */

class PitchCorrectionProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Analysis parameters
        this.frameSize = 4096;
        this.hopSize = 1024;
        this.sampleRate = 44100; // Will be updated from main thread
        
        // Pitch correction parameters
        this.correctionStrength = 0.8;
        this.correctionSpeed = 0.1;
        this.key = 'C';
        this.scale = 'major';
        this.mode = 'transparent';
        this.snapThreshold = 50; // cents
        
        // Processing buffers
        this.inputBuffer = new Float32Array(this.frameSize * 2);
        this.outputBuffer = new Float32Array(this.frameSize * 2);
        this.analysisBuffer = new Float32Array(this.frameSize);
        
        this.inputIndex = 0;
        this.outputIndex = 0;
        this.frameCount = 0;
        
        // Pitch detection
        this.pitchDetector = new SimplePitchDetector(this.sampleRate);
        this.currentPitch = 0;
        this.targetPitch = 0;
        this.pitchConfidence = 0;
        
        // Scale notes (will be updated from main thread)
        this.scaleNotes = this.generateScaleNotes();
        
        // Correction smoothing
        this.correctionSmoother = new ExponentialSmoother(0.1);
        
        // Analysis window
        this.window = this.createWindow(this.frameSize, 'hann');
        
        // Message handling
        this.port.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }
    
    handleMessage(message) {
        const { type, value, parameters } = message;
        
        switch (type) {
            case 'set-correction-strength':
                this.correctionStrength = value;
                break;
                
            case 'set-correction-speed':
                this.correctionSpeed = value;
                this.correctionSmoother.setResponse(value);
                break;
                
            case 'set-key':
                this.key = value;
                this.scaleNotes = this.generateScaleNotes();
                break;
                
            case 'set-scale':
                this.scale = value;
                this.scaleNotes = this.generateScaleNotes();
                break;
                
            case 'set-mode':
                this.mode = value;
                break;
                
            case 'update-parameters':
                if (parameters) {
                    this.correctionStrength = parameters.correctionStrength || this.correctionStrength;
                    this.correctionSpeed = parameters.correctionSpeed || this.correctionSpeed;
                    this.key = parameters.key || this.key;
                    this.scale = parameters.scale || this.scale;
                    this.mode = parameters.mode || this.mode;
                    this.scaleNotes = parameters.scaleNotes || this.scaleNotes;
                    
                    if (parameters.correctionSpeed) {
                        this.correctionSmoother.setResponse(parameters.correctionSpeed);
                    }
                }
                break;
                
            case 'set-sample-rate':
                this.sampleRate = value;
                this.pitchDetector = new SimplePitchDetector(this.sampleRate);
                break;
        }
    }
    
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        
        if (!input || !input[0] || !output || !output[0]) {
            return true;
        }
        
        const inputChannel = input[0];
        const outputChannel = output[0];
        const blockSize = inputChannel.length;
        
        // Process samples
        for (let i = 0; i < blockSize; i++) {
            // Fill input buffer
            this.inputBuffer[this.inputIndex] = inputChannel[i];
            this.inputIndex = (this.inputIndex + 1) % this.inputBuffer.length;
            
            // Process frame when ready
            if (this.inputIndex % this.hopSize === 0) {
                this.processFrame();
            }
            
            // Output processed samples
            outputChannel[i] = this.outputBuffer[this.outputIndex];
            this.outputIndex = (this.outputIndex + 1) % this.outputBuffer.length;
        }
        
        return true;
    }
    
    processFrame() {
        // Extract analysis frame
        const frame = new Float32Array(this.frameSize);
        let readIndex = (this.inputIndex - this.frameSize + this.inputBuffer.length) % this.inputBuffer.length;
        
        for (let i = 0; i < this.frameSize; i++) {
            frame[i] = this.inputBuffer[readIndex];
            readIndex = (readIndex + 1) % this.inputBuffer.length;
        }
        
        // Apply window
        const windowedFrame = this.applyWindow(frame, this.window);
        
        // Detect pitch
        const pitchData = this.pitchDetector.detectPitch(windowedFrame);
        this.currentPitch = pitchData.frequency;
        this.pitchConfidence = pitchData.confidence;
        
        // Determine correction if needed
        let correctionRatio = 1.0;
        
        if (this.pitchConfidence > 0.5 && this.currentPitch > 0) {
            const targetNote = this.findTargetNote(this.currentPitch);
            this.targetPitch = this.noteToFrequency(targetNote);
            
            const correctionCents = this.frequencyToCents(this.targetPitch / this.currentPitch);
            
            if (Math.abs(correctionCents) > this.snapThreshold || this.mode !== 'transparent') {
                correctionRatio = this.calculateCorrectionRatio(correctionCents);
            }
        }
        
        // Apply correction (simplified - in practice would use more sophisticated pitch shifting)
        if (correctionRatio !== 1.0) {
            this.applePitchCorrection(frame, correctionRatio);
        } else {
            // Copy input to output
            this.copyFrameToOutput(frame);
        }
        
        // Send analysis data
        if (this.frameCount % 10 === 0) {
            this.sendAnalysisData();
        }
        
        this.frameCount++;
    }
    
    findTargetNote(frequency) {
        if (frequency <= 0) return null;
        
        // Convert to cents relative to A4
        const cents = this.frequencyToCents(frequency / 440);
        const semitonesFromA4 = Math.round(cents / 100);
        
        // Find closest scale note
        let closestNote = null;
        let closestDistance = Infinity;
        
        this.scaleNotes.forEach(note => {
            const distance = Math.abs(note.semitones - semitonesFromA4);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestNote = note;
            }
        });
        
        return closestNote;
    }
    
    calculateCorrectionRatio(correctionCents) {
        let correctionAmount = correctionCents * this.correctionStrength;
        
        // Mode-specific adjustments
        switch (this.mode) {
            case 'transparent':
                if (Math.abs(correctionCents) < this.snapThreshold) {
                    correctionAmount *= 0.3;
                }
                break;
                
            case 'creative':
                correctionAmount *= 1.5;
                break;
                
            case 'robotic':
                correctionAmount = correctionCents;
                break;
        }
        
        // Smooth correction
        const smoothedCorrection = this.correctionSmoother.process(correctionAmount);
        
        // Convert to frequency ratio
        return Math.pow(2, smoothedCorrection / 1200);
    }
    
    applePitchCorrection(frame, correctionRatio) {
        // Simplified pitch shifting using time-domain interpolation
        // In practice, would use proper pitch shifting algorithm
        
        if (correctionRatio === 1.0) {
            this.copyFrameToOutput(frame);
            return;
        }
        
        const outputFrame = new Float32Array(this.frameSize);
        
        // Simple linear interpolation for pitch shifting
        for (let i = 0; i < this.frameSize; i++) {
            const sourceIndex = i / correctionRatio;
            const index1 = Math.floor(sourceIndex);
            const index2 = Math.ceil(sourceIndex);
            const fraction = sourceIndex - index1;
            
            if (index1 >= 0 && index2 < this.frameSize) {
                outputFrame[i] = frame[index1] * (1 - fraction) + frame[index2] * fraction;
            }
        }
        
        this.copyFrameToOutput(outputFrame);
    }
    
    copyFrameToOutput(frame) {
        // Copy frame to output buffer with overlap-add
        let writeIndex = this.outputIndex;
        
        for (let i = 0; i < this.frameSize; i++) {
            this.outputBuffer[writeIndex] = frame[i];
            writeIndex = (writeIndex + 1) % this.outputBuffer.length;
        }
    }
    
    sendAnalysisData() {
        this.port.postMessage({
            type: 'pitch-detected',
            data: {
                frequency: this.currentPitch,
                confidence: this.pitchConfidence,
                targetFrequency: this.targetPitch
            }
        });
        
        if (this.currentPitch > 0) {
            const note = this.findTargetNote(this.currentPitch);
            if (note) {
                this.port.postMessage({
                    type: 'note-detected',
                    data: {
                        note: note.note,
                        octave: note.octave,
                        cents: this.frequencyToCents(this.currentPitch / this.noteToFrequency(note)),
                        inTune: Math.abs(this.frequencyToCents(this.currentPitch / this.noteToFrequency(note))) < this.snapThreshold
                    }
                });
            }
        }
    }
    
    // Musical calculations
    noteToFrequency(note) {
        if (!note) return 0;
        return 440 * Math.pow(2, note.semitones / 12);
    }
    
    frequencyToCents(ratio) {
        return 1200 * Math.log2(ratio);
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

// Simple pitch detector for the worklet
class SimplePitchDetector {
    constructor(sampleRate) {
        this.sampleRate = sampleRate;
        this.minPeriod = Math.floor(sampleRate / 800); // 800 Hz max
        this.maxPeriod = Math.floor(sampleRate / 50);  // 50 Hz min
        this.threshold = 0.3;
    }
    
    detectPitch(frame) {
        // Autocorrelation method
        const autocorrelation = new Float32Array(this.maxPeriod + 1);
        
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
        
        const frequency = maxCorrelation > this.threshold && bestLag > 0 ? 
                         this.sampleRate / bestLag : 0;
        
        return {
            frequency,
            confidence: maxCorrelation
        };
    }
}

// Exponential smoother
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
}

registerProcessor('pitch-correction-processor', PitchCorrectionProcessor);
