/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TimeStretchWorklet.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Time Stretch AudioWorklet Processor
 * Real-time PSOLA-based time stretching
 */

class TimeStretchProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Processing parameters
        this.frameSize = 2048;
        this.hopSize = 512;
        this.overlapFactor = 4;
        
        // Time stretch parameters
        this.stretchRatio = 1.0;
        this.pitchRatio = 1.0;
        this.quality = 'high';
        
        // Internal buffers
        this.inputBuffer = new Float32Array(this.frameSize * 4);
        this.outputBuffer = new Float32Array(this.frameSize * 4);
        this.overlapBuffer = new Float32Array(this.frameSize);
        
        this.inputIndex = 0;
        this.outputIndex = 0;
        this.frameCount = 0;
        
        // Analysis buffers
        this.analysisWindow = this.createWindow(this.frameSize, 'hann');
        this.synthesisWindow = this.createWindow(this.frameSize, 'hann');
        
        // Phase buffers for coherence
        this.previousPhase = new Float32Array(this.frameSize / 2 + 1);
        this.outputPhase = new Float32Array(this.frameSize / 2 + 1);
        
        // FFT buffers (simplified - use real FFT in production)
        this.fftBuffer = new Float32Array(this.frameSize * 2);
        this.ifftBuffer = new Float32Array(this.frameSize * 2);
        
        // Message handling
        this.port.onmessage = (event) => {
            this.handleMessage(event.data);
        };
        
        // Analysis tracking
        this.analysisData = {
            pitch: 0,
            tempo: 0,
            energy: 0
        };
    }
    
    handleMessage(message) {
        const { type, value, parameters } = message;
        
        switch (type) {
            case 'set-stretch-ratio':
                this.stretchRatio = value;
                break;
                
            case 'set-pitch-ratio':
                this.pitchRatio = value;
                break;
                
            case 'set-quality':
                this.setQuality(value);
                break;
                
            case 'update-parameters':
                if (parameters) {
                    this.stretchRatio = parameters.stretchRatio || this.stretchRatio;
                    this.pitchRatio = parameters.pitchRatio || this.pitchRatio;
                    this.quality = parameters.quality || this.quality;
                }
                break;
        }
    }
    
    setQuality(quality) {
        this.quality = quality;
        
        // Adjust parameters based on quality
        const qualitySettings = {
            low: { frameSize: 1024, hopSize: 256, overlapFactor: 2 },
            medium: { frameSize: 2048, hopSize: 512, overlapFactor: 4 },
            high: { frameSize: 4096, hopSize: 1024, overlapFactor: 4 },
            ultra: { frameSize: 8192, hopSize: 2048, overlapFactor: 8 }
        };
        
        const settings = qualitySettings[quality] || qualitySettings.high;
        
        if (settings.frameSize !== this.frameSize) {
            this.frameSize = settings.frameSize;
            this.hopSize = settings.hopSize;
            this.overlapFactor = settings.overlapFactor;
            this.reinitializeBuffers();
        }
    }
    
    reinitializeBuffers() {
        this.inputBuffer = new Float32Array(this.frameSize * 4);
        this.outputBuffer = new Float32Array(this.frameSize * 4);
        this.overlapBuffer = new Float32Array(this.frameSize);
        this.analysisWindow = this.createWindow(this.frameSize, 'hann');
        this.synthesisWindow = this.createWindow(this.frameSize, 'hann');
        this.previousPhase = new Float32Array(this.frameSize / 2 + 1);
        this.outputPhase = new Float32Array(this.frameSize / 2 + 1);
        this.fftBuffer = new Float32Array(this.frameSize * 2);
        this.ifftBuffer = new Float32Array(this.frameSize * 2);
        
        this.inputIndex = 0;
        this.outputIndex = 0;
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
        
        // Process in blocks
        for (let i = 0; i < blockSize; i++) {
            // Fill input buffer
            this.inputBuffer[this.inputIndex] = inputChannel[i];
            this.inputIndex = (this.inputIndex + 1) % this.inputBuffer.length;
            
            // Process when we have enough samples
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
        // Extract frame from input buffer
        const frame = new Float32Array(this.frameSize);
        let readIndex = (this.inputIndex - this.frameSize + this.inputBuffer.length) % this.inputBuffer.length;
        
        for (let i = 0; i < this.frameSize; i++) {
            frame[i] = this.inputBuffer[readIndex];
            readIndex = (readIndex + 1) % this.inputBuffer.length;
        }
        
        // Apply analysis window
        const windowedFrame = this.applyWindow(frame, this.analysisWindow);
        
        // Perform FFT
        const spectrum = this.fft(windowedFrame);
        
        // Extract magnitude and phase
        const magnitude = new Float32Array(this.frameSize / 2 + 1);
        const phase = new Float32Array(this.frameSize / 2 + 1);
        
        for (let i = 0; i < magnitude.length; i++) {
            const real = spectrum[i * 2];
            const imag = spectrum[i * 2 + 1];
            magnitude[i] = Math.sqrt(real * real + imag * imag);
            phase[i] = Math.atan2(imag, real);
        }
        
        // Process for time stretching and pitch shifting
        const processedMagnitude = this.processMagnitude(magnitude);
        const processedPhase = this.processPhase(phase);
        
        // Convert back to complex spectrum
        const processedSpectrum = this.magnitudePhaseToComplex(processedMagnitude, processedPhase);
        
        // Perform IFFT
        const processedFrame = this.ifft(processedSpectrum);
        
        // Apply synthesis window
        const synthesizedFrame = this.applyWindow(processedFrame, this.synthesisWindow);
        
        // Overlap-add to output buffer
        this.overlapAdd(synthesizedFrame);
        
        // Update analysis data
        this.updateAnalysisData(magnitude, phase, frame);
        
        this.frameCount++;
    }
    
    processMagnitude(magnitude) {
        // Apply pitch shifting by frequency domain shifting
        if (this.pitchRatio === 1.0) {
            return magnitude;
        }
        
        const shifted = new Float32Array(magnitude.length);
        shifted.fill(0);
        
        for (let i = 0; i < magnitude.length; i++) {
            const newIndex = Math.round(i * this.pitchRatio);
            if (newIndex < shifted.length) {
                shifted[newIndex] = magnitude[i];
            }
        }
        
        return shifted;
    }
    
    processPhase(phase) {
        // Phase processing for time stretching
        const processedPhase = new Float32Array(phase.length);
        
        for (let i = 0; i < phase.length; i++) {
            // Calculate phase difference
            let phaseDiff = phase[i] - this.previousPhase[i];
            
            // Unwrap phase
            while (phaseDiff > Math.PI) phaseDiff -= 2 * Math.PI;
            while (phaseDiff < -Math.PI) phaseDiff += 2 * Math.PI;
            
            // Apply time stretching to phase
            const expectedPhaseAdvance = (i * Math.PI * this.hopSize) / (this.frameSize / 2);
            const trueFreq = expectedPhaseAdvance + phaseDiff;
            
            // Update output phase
            this.outputPhase[i] += trueFreq / this.stretchRatio;
            processedPhase[i] = this.outputPhase[i];
            
            this.previousPhase[i] = phase[i];
        }
        
        return processedPhase;
    }
    
    magnitudePhaseToComplex(magnitude, phase) {
        const complex = new Float32Array(this.frameSize * 2);
        
        for (let i = 0; i < magnitude.length; i++) {
            complex[i * 2] = magnitude[i] * Math.cos(phase[i]);
            complex[i * 2 + 1] = magnitude[i] * Math.sin(phase[i]);
        }
        
        // Mirror for real FFT
        for (let i = 1; i < magnitude.length - 1; i++) {
            const mirrorIndex = this.frameSize - i;
            complex[mirrorIndex * 2] = complex[i * 2];
            complex[mirrorIndex * 2 + 1] = -complex[i * 2 + 1];
        }
        
        return complex;
    }
    
    overlapAdd(frame) {
        // Add frame to output buffer with overlap
        let writeIndex = this.outputIndex;
        
        for (let i = 0; i < this.frameSize; i++) {
            this.outputBuffer[writeIndex] += frame[i];
            writeIndex = (writeIndex + 1) % this.outputBuffer.length;
        }
    }
    
    updateAnalysisData(magnitude, phase, timeFrame) {
        // Calculate energy
        let energy = 0;
        for (let i = 0; i < timeFrame.length; i++) {
            energy += timeFrame[i] * timeFrame[i];
        }
        this.analysisData.energy = energy / timeFrame.length;
        
        // Estimate pitch (simplified)
        let maxMag = 0;
        let peakBin = 0;
        for (let i = 1; i < magnitude.length / 2; i++) {
            if (magnitude[i] > maxMag) {
                maxMag = magnitude[i];
                peakBin = i;
            }
        }
        
        this.analysisData.pitch = (peakBin * sampleRate) / (2 * this.frameSize);
        
        // Send analysis data periodically
        if (this.frameCount % 10 === 0) {
            this.port.postMessage({
                type: 'analysis-data',
                data: this.analysisData
            });
        }
    }
    
    // Window functions
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
                case 'blackman':
                    window[i] = 0.42 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)) + 
                               0.08 * Math.cos(4 * Math.PI * i / (size - 1));
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
    
    // Simplified FFT (use proper implementation in production)
    fft(inputData) {
        const N = inputData.length;
        
        // Copy input to complex buffer
        for (let i = 0; i < N; i++) {
            this.fftBuffer[i * 2] = inputData[i];
            this.fftBuffer[i * 2 + 1] = 0;
        }
        
        // Simplified DFT for demo
        const output = new Float32Array(N * 2);
        
        for (let k = 0; k < N; k++) {
            let realSum = 0;
            let imagSum = 0;
            
            for (let n = 0; n < N; n++) {
                const angle = -2 * Math.PI * k * n / N;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                
                realSum += this.fftBuffer[n * 2] * cos - this.fftBuffer[n * 2 + 1] * sin;
                imagSum += this.fftBuffer[n * 2] * sin + this.fftBuffer[n * 2 + 1] * cos;
            }
            
            output[k * 2] = realSum;
            output[k * 2 + 1] = imagSum;
        }
        
        return output;
    }
    
    ifft(spectrum) {
        const N = this.frameSize;
        const output = new Float32Array(N);
        
        // Simplified IDFT
        for (let n = 0; n < N; n++) {
            let realSum = 0;
            
            for (let k = 0; k < N; k++) {
                const angle = 2 * Math.PI * k * n / N;
                realSum += spectrum[k * 2] * Math.cos(angle) - spectrum[k * 2 + 1] * Math.sin(angle);
            }
            
            output[n] = realSum / N;
        }
        
        return output;
    }
}

registerProcessor('time-stretch-processor', TimeStretchProcessor);
