/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: MasteringProcessor.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Mastering Processor
 * Advanced mastering tools for final audio processing
 * Multi-band compression, limiting, stereo enhancement, and more
 */

export class MasteringProcessor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.sampleRate = audioContext.sampleRate;
        
        // Mastering modules
        this.modules = {
            eq: new MasteringEQ(audioContext),
            multiCompressor: new MultibandCompressor(audioContext),
            stereoEnhancer: new StereoEnhancer(audioContext),
            exciter: new HarmonicExciter(audioContext),
            limiter: new MasteringLimiter(audioContext),
            analyzer: new MasteringAnalyzer(audioContext)
        };
        
        // Processing chain order
        this.processingChain = [
            'eq',
            'multiCompressor', 
            'stereoEnhancer',
            'exciter',
            'limiter'
        ];
        
        // Global settings
        this.settings = {
            bypass: false,
            inputGain: 0,
            outputGain: 0,
            autoGain: false,
            loudnessTarget: -23, // LUFS
            truePeak: -1 // dBTP
        };
        
        // Analysis data
        this.analysisData = {
            lufs: 0,
            peak: 0,
            rms: 0,
            stereoWidth: 0,
            dynamicRange: 0,
            spectrum: null
        };
        
        // Real-time processing
        this.inputNode = null;
        this.outputNode = null;
        this.isProcessing = false;
        
        this.initializeAudioGraph();
    }
    
    initializeAudioGraph() {
        // Create audio graph for real-time processing
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        // Connect modules in series
        let currentNode = this.inputNode;
        
        for (const moduleName of this.processingChain) {
            const module = this.modules[moduleName];
            if (module && module.connect) {
                currentNode.connect(module.inputNode || module);
                currentNode = module.outputNode || module;
            }
        }
        
        currentNode.connect(this.outputNode);
        
        // Connect analyzer in parallel for monitoring
        this.inputNode.connect(this.modules.analyzer.inputNode);
    }
    
    // Process audio buffer offline
    async processAudio(audioBuffer) {
        let processedBuffer = audioBuffer;
        
        if (this.settings.bypass) {
            return processedBuffer;
        }
        
        // Apply input gain
        if (this.settings.inputGain !== 0) {
            processedBuffer = this.applyGain(processedBuffer, this.settings.inputGain);
        }
        
        // Process through mastering chain
        for (const moduleName of this.processingChain) {
            const module = this.modules[moduleName];
            if (module.enabled && module.processBuffer) {
                processedBuffer = await module.processBuffer(processedBuffer);
            }
        }
        
        // Apply output gain
        if (this.settings.outputGain !== 0) {
            processedBuffer = this.applyGain(processedBuffer, this.settings.outputGain);
        }
        
        // Auto-gain for loudness targeting
        if (this.settings.autoGain) {
            processedBuffer = await this.applyAutoGain(processedBuffer);
        }
        
        // Update analysis
        this.analysisData = await this.modules.analyzer.analyzeBuffer(processedBuffer);
        
        return processedBuffer;
    }
    
    // Real-time processing control
    startRealTimeProcessing(sourceNode) {
        if (this.isProcessing) {
            this.stopRealTimeProcessing();
        }
        
        sourceNode.connect(this.inputNode);
        this.isProcessing = true;
        
        // Start analyzer
        this.modules.analyzer.startRealTimeAnalysis();
        
        return this.outputNode;
    }
    
    stopRealTimeProcessing() {
        if (this.inputNode) {
            this.inputNode.disconnect();
        }
        
        this.modules.analyzer.stopRealTimeAnalysis();
        this.isProcessing = false;
    }
    
    // Utility functions
    applyGain(audioBuffer, gainDb) {
        const gain = Math.pow(10, gainDb / 20);
        const outputBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const inputData = audioBuffer.getChannelData(channel);
            const outputData = outputBuffer.getChannelData(channel);
            
            for (let i = 0; i < inputData.length; i++) {
                outputData[i] = inputData[i] * gain;
            }
        }
        
        return outputBuffer;
    }
    
    async applyAutoGain(audioBuffer) {
        // Measure current loudness
        const currentLufs = await this.measureLUFS(audioBuffer);
        const targetLufs = this.settings.loudnessTarget;
        
        // Calculate required gain
        const gainAdjustment = targetLufs - currentLufs;
        
        return this.applyGain(audioBuffer, gainAdjustment);
    }
    
    async measureLUFS(audioBuffer) {
        // Simplified LUFS measurement
        // In production, use proper EBU R128 algorithm
        let sum = 0;
        let count = 0;
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
                count++;
            }
        }
        
        const rms = Math.sqrt(sum / count);
        return 20 * Math.log10(rms) - 0.691; // Approximate LUFS conversion
    }
    
    // Module configuration
    configureMasteringEQ(settings) {
        this.modules.eq.updateSettings(settings);
    }
    
    configureMultibandCompressor(settings) {
        this.modules.multiCompressor.updateSettings(settings);
    }
    
    configureStereoEnhancer(settings) {
        this.modules.stereoEnhancer.updateSettings(settings);
    }
    
    configureExciter(settings) {
        this.modules.exciter.updateSettings(settings);
    }
    
    configureLimiter(settings) {
        this.modules.limiter.updateSettings(settings);
    }
    
    // Preset management
    loadPreset(presetName) {
        const presets = this.getMasteringPresets();
        if (presets[presetName]) {
            this.applyPreset(presets[presetName]);
        }
    }
    
    applyPreset(preset) {
        for (const [moduleName, settings] of Object.entries(preset)) {
            if (this.modules[moduleName]) {
                this.modules[moduleName].updateSettings(settings);
            }
        }
    }
    
    getMasteringPresets() {
        return {
            'Gentle Master': {
                eq: { enabled: true, lowShelf: 0.5, midBoost: 0.3, highShelf: 1.0 },
                multiCompressor: { enabled: true, gentle: true },
                stereoEnhancer: { enabled: true, width: 1.1 },
                limiter: { enabled: true, ceiling: -0.1, gentle: true }
            },
            'Loud Master': {
                eq: { enabled: true, lowShelf: 1.0, midBoost: 0.8, highShelf: 1.5 },
                multiCompressor: { enabled: true, aggressive: true },
                exciter: { enabled: true, amount: 0.3 },
                limiter: { enabled: true, ceiling: -0.1, aggressive: true }
            },
            'Broadcast': {
                eq: { enabled: true, broadcast: true },
                multiCompressor: { enabled: true, broadcast: true },
                limiter: { enabled: true, ceiling: -1.0, broadcast: true }
            },
            'Streaming': {
                eq: { enabled: true, streaming: true },
                multiCompressor: { enabled: true, streaming: true },
                limiter: { enabled: true, ceiling: -1.0, lufsTarget: -14 }
            }
        };
    }
    
    // Analysis getters
    getAnalysisData() {
        return { ...this.analysisData };
    }
    
    // Settings management
    updateGlobalSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
    }
}

// Mastering EQ Module
class MasteringEQ {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.enabled = false;
        
        // 5-band parametric EQ
        this.bands = [
            { freq: 80, q: 0.7, gain: 0, type: 'highpass' },    // High-pass
            { freq: 200, q: 0.8, gain: 0, type: 'bell' },       // Low
            { freq: 1000, q: 1.0, gain: 0, type: 'bell' },      // Mid
            { freq: 4000, q: 0.8, gain: 0, type: 'bell' },      // High-mid
            { freq: 12000, q: 0.7, gain: 0, type: 'shelf' }     // High shelf
        ];
        
        this.filters = [];
        this.setupFilters();
    }
    
    setupFilters() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        let currentNode = this.inputNode;
        
        this.bands.forEach((band, index) => {
            const filter = this.audioContext.createBiquadFilter();
            filter.frequency.value = band.freq;
            filter.Q.value = band.q;
            filter.gain.value = band.gain;
            filter.type = band.type === 'bell' ? 'peaking' : 
                         band.type === 'shelf' ? 'highshelf' : 'highpass';
            
            currentNode.connect(filter);
            currentNode = filter;
            
            this.filters.push(filter);
        });
        
        currentNode.connect(this.outputNode);
    }
    
    async processBuffer(audioBuffer) {
        if (!this.enabled) return audioBuffer;
        
        // Offline processing would require manual filter implementation
        // For now, return input buffer (real-time processing handles EQ)
        return audioBuffer;
    }
    
    updateSettings(settings) {
        this.enabled = settings.enabled !== false;
        
        if (settings.bands) {
            settings.bands.forEach((bandSettings, index) => {
                if (this.filters[index] && bandSettings) {
                    if (bandSettings.freq !== undefined) {
                        this.filters[index].frequency.value = bandSettings.freq;
                    }
                    if (bandSettings.gain !== undefined) {
                        this.filters[index].gain.value = bandSettings.gain;
                    }
                    if (bandSettings.q !== undefined) {
                        this.filters[index].Q.value = bandSettings.q;
                    }
                }
            });
        }
    }
}

// Multiband Compressor Module
class MultibandCompressor {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.enabled = false;
        
        // 3-band compressor
        this.bands = [
            { name: 'Low', freq: 250, compressor: null },
            { name: 'Mid', freq: 2500, compressor: null },
            { name: 'High', freq: 20000, compressor: null }
        ];
        
        this.setupCompressors();
    }
    
    setupCompressors() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        // Create crossover filters and compressors
        this.bands.forEach((band, index) => {
            const compressor = this.audioContext.createDynamicsCompressor();
            compressor.threshold.value = -12;
            compressor.knee.value = 30;
            compressor.ratio.value = 3;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            
            band.compressor = compressor;
            
            // Connect to output (simplified - proper crossover would split frequencies)
            this.inputNode.connect(compressor);
            compressor.connect(this.outputNode);
        });
    }
    
    async processBuffer(audioBuffer) {
        if (!this.enabled) return audioBuffer;
        
        // Simplified multiband compression
        // In production, implement proper crossover filtering
        return audioBuffer;
    }
    
    updateSettings(settings) {
        this.enabled = settings.enabled !== false;
        
        if (settings.bands) {
            settings.bands.forEach((bandSettings, index) => {
                const compressor = this.bands[index]?.compressor;
                if (compressor && bandSettings) {
                    if (bandSettings.threshold !== undefined) {
                        compressor.threshold.value = bandSettings.threshold;
                    }
                    if (bandSettings.ratio !== undefined) {
                        compressor.ratio.value = bandSettings.ratio;
                    }
                    if (bandSettings.attack !== undefined) {
                        compressor.attack.value = bandSettings.attack;
                    }
                    if (bandSettings.release !== undefined) {
                        compressor.release.value = bandSettings.release;
                    }
                }
            });
        }
    }
}

// Stereo Enhancer Module
class StereoEnhancer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.enabled = false;
        
        this.settings = {
            width: 1.0,
            bassMonoFreq: 120
        };
        
        this.setupProcessing();
    }
    
    setupProcessing() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        // M/S processing would be implemented here
        this.inputNode.connect(this.outputNode);
    }
    
    async processBuffer(audioBuffer) {
        if (!this.enabled || audioBuffer.numberOfChannels < 2) {
            return audioBuffer;
        }
        
        const outputBuffer = this.audioContext.createBuffer(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );
        
        const leftInput = audioBuffer.getChannelData(0);
        const rightInput = audioBuffer.getChannelData(1);
        const leftOutput = outputBuffer.getChannelData(0);
        const rightOutput = outputBuffer.getChannelData(1);
        
        // M/S stereo enhancement
        for (let i = 0; i < audioBuffer.length; i++) {
            const mid = (leftInput[i] + rightInput[i]) * 0.5;
            const side = (leftInput[i] - rightInput[i]) * 0.5;
            
            const enhancedSide = side * this.settings.width;
            
            leftOutput[i] = mid + enhancedSide;
            rightOutput[i] = mid - enhancedSide;
        }
        
        return outputBuffer;
    }
    
    updateSettings(settings) {
        this.enabled = settings.enabled !== false;
        this.settings = { ...this.settings, ...settings };
    }
}

// Harmonic Exciter Module
class HarmonicExciter {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.enabled = false;
        
        this.settings = {
            amount: 0.1,
            frequency: 5000
        };
        
        this.setupProcessing();
    }
    
    setupProcessing() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        this.inputNode.connect(this.outputNode);
    }
    
    async processBuffer(audioBuffer) {
        if (!this.enabled) return audioBuffer;
        
        // Simplified harmonic excitement
        // In production, implement proper harmonic generation
        return audioBuffer;
    }
    
    updateSettings(settings) {
        this.enabled = settings.enabled !== false;
        this.settings = { ...this.settings, ...settings };
    }
}

// Mastering Limiter Module
class MasteringLimiter {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.enabled = false;
        
        this.settings = {
            ceiling: -0.1,
            release: 0.05,
            lookahead: 0.005
        };
        
        this.setupProcessing();
    }
    
    setupProcessing() {
        this.inputNode = this.audioContext.createGain();
        this.outputNode = this.audioContext.createGain();
        
        // Simple limiter using Web Audio dynamics compressor
        this.limiter = this.audioContext.createDynamicsCompressor();
        this.limiter.threshold.value = -1;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = this.settings.release;
        
        this.inputNode.connect(this.limiter);
        this.limiter.connect(this.outputNode);
    }
    
    async processBuffer(audioBuffer) {
        if (!this.enabled) return audioBuffer;
        
        // Professional lookahead limiting would be implemented here
        // For now, return input buffer (real-time processing handles limiting)
        return audioBuffer;
    }
    
    updateSettings(settings) {
        this.enabled = settings.enabled !== false;
        this.settings = { ...this.settings, ...settings };
        
        if (this.limiter) {
            if (settings.ceiling !== undefined) {
                this.limiter.threshold.value = settings.ceiling;
            }
            if (settings.release !== undefined) {
                this.limiter.release.value = settings.release;
            }
        }
    }
}

// Mastering Analyzer Module
class MasteringAnalyzer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        
        this.setupAnalysis();
    }
    
    setupAnalysis() {
        this.inputNode = this.audioContext.createGain();
        this.analyzer = this.audioContext.createAnalyser();
        this.analyzer.fftSize = 2048;
        
        this.inputNode.connect(this.analyzer);
    }
    
    async analyzeBuffer(audioBuffer) {
        // Comprehensive audio analysis
        const analysis = {
            lufs: await this.measureLUFS(audioBuffer),
            peak: this.measurePeak(audioBuffer),
            rms: this.measureRMS(audioBuffer),
            stereoWidth: this.measureStereoWidth(audioBuffer),
            dynamicRange: this.measureDynamicRange(audioBuffer),
            spectrum: this.getSpectralData()
        };
        
        return analysis;
    }
    
    async measureLUFS(audioBuffer) {
        // Simplified LUFS measurement
        let sum = 0;
        let count = 0;
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
                count++;
            }
        }
        
        const rms = Math.sqrt(sum / count);
        return 20 * Math.log10(rms) - 0.691;
    }
    
    measurePeak(audioBuffer) {
        let peak = 0;
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                peak = Math.max(peak, Math.abs(channelData[i]));
            }
        }
        
        return 20 * Math.log10(peak);
    }
    
    measureRMS(audioBuffer) {
        let sum = 0;
        let count = 0;
        
        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                sum += channelData[i] * channelData[i];
                count++;
            }
        }
        
        return 20 * Math.log10(Math.sqrt(sum / count));
    }
    
    measureStereoWidth(audioBuffer) {
        if (audioBuffer.numberOfChannels < 2) return 0;
        
        const leftData = audioBuffer.getChannelData(0);
        const rightData = audioBuffer.getChannelData(1);
        
        let correlation = 0;
        let leftPower = 0;
        let rightPower = 0;
        
        for (let i = 0; i < leftData.length; i++) {
            correlation += leftData[i] * rightData[i];
            leftPower += leftData[i] * leftData[i];
            rightPower += rightData[i] * rightData[i];
        }
        
        const denominator = Math.sqrt(leftPower * rightPower);
        return denominator > 0 ? correlation / denominator : 0;
    }
    
    measureDynamicRange(audioBuffer) {
        // Simplified DR measurement
        const rms = this.measureRMS(audioBuffer);
        const peak = this.measurePeak(audioBuffer);
        
        return peak - rms;
    }
    
    getSpectralData() {
        const bufferLength = this.analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyzer.getByteFrequencyData(dataArray);
        
        return Array.from(dataArray);
    }
    
    startRealTimeAnalysis() {
        // Start real-time analysis updates
        this.analysisInterval = setInterval(() => {
            this.dispatchAnalysisUpdate();
        }, 100);
    }
    
    stopRealTimeAnalysis() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
        }
    }
    
    dispatchAnalysisUpdate() {
        const spectrum = this.getSpectralData();
        // Dispatch analysis update event
        if (this.onAnalysisUpdate) {
            this.onAnalysisUpdate({ spectrum });
        }
    }
}

export { MasteringEQ, MultibandCompressor, StereoEnhancer, HarmonicExciter, MasteringLimiter, MasteringAnalyzer };
