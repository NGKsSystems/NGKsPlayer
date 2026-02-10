/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioWorkletOptimization.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * High-Performance Audio Worklet Processor
 * 
 * Optimized audio processing using AudioWorklet for low-latency,
 * glitch-free audio operations
 */

// AudioWorklet processor code (runs in audio thread)
const audioWorkletCode = `
class ProAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    
    this.bufferSize = options.processorOptions?.bufferSize || 128;
    this.sampleRate = globalThis.sampleRate;
    this.channelCount = options.processorOptions?.channelCount || 2;
    
    // Processing state
    this.processedSamples = 0;
    this.isRecording = false;
    this.recordBuffer = [];
    this.maxRecordLength = this.sampleRate * 60 * 10; // 10 minutes max
    
    // Effects chain
    this.effects = new Map();
    this.effectsOrder = [];
    
    // Performance monitoring
    this.processingTimes = [];
    this.maxProcessingTime = (this.bufferSize / this.sampleRate) * 1000; // ms
    this.perfMonitorCounter = 0;
    
    // Listen for parameter changes
    this.port.onmessage = this.handleMessage.bind(this);
    
    console.log(\`ProAudioProcessor initialized: \${this.bufferSize} samples @ \${this.sampleRate}Hz\`);
  }

  handleMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'startRecording':
        this.startRecording();
        break;
        
      case 'stopRecording':
        this.stopRecording();
        break;
        
      case 'addEffect':
        this.addEffect(data.id, data.config);
        break;
        
      case 'removeEffect':
        this.removeEffect(data.id);
        break;
        
      case 'updateEffect':
        this.updateEffect(data.id, data.params);
        break;
        
      case 'setEffectOrder':
        this.effectsOrder = data.order;
        break;
        
      case 'getPerformanceStats':
        this.sendPerformanceStats();
        break;
    }
  }

  startRecording() {
    this.isRecording = true;
    this.recordBuffer = [];
    this.port.postMessage({ type: 'recordingStarted' });
  }

  stopRecording() {
    this.isRecording = false;
    
    // Send recorded audio back to main thread
    if (this.recordBuffer.length > 0) {
      const channels = this.recordBuffer[0].length;
      const totalSamples = this.recordBuffer.length;
      
      // Interleave samples for transfer
      const interleavedBuffer = new Float32Array(totalSamples * channels);
      
      for (let i = 0; i < totalSamples; i++) {
        for (let ch = 0; ch < channels; ch++) {
          interleavedBuffer[i * channels + ch] = this.recordBuffer[i][ch];
        }
      }
      
      this.port.postMessage({
        type: 'recordingComplete',
        audioData: interleavedBuffer,
        channels: channels,
        sampleRate: this.sampleRate,
        duration: totalSamples / this.sampleRate
      });
    }
    
    this.recordBuffer = [];
  }

  addEffect(id, config) {
    const effect = this.createEffect(config.type, config.params);
    if (effect) {
      this.effects.set(id, effect);
      if (!this.effectsOrder.includes(id)) {
        this.effectsOrder.push(id);
      }
    }
  }

  removeEffect(id) {
    this.effects.delete(id);
    this.effectsOrder = this.effectsOrder.filter(effectId => effectId !== id);
  }

  updateEffect(id, params) {
    const effect = this.effects.get(id);
    if (effect && effect.updateParams) {
      effect.updateParams(params);
    }
  }

  createEffect(type, params) {
    switch (type) {
      case 'gain':
        return new GainEffect(params);
      case 'delay':
        return new DelayEffect(params, this.sampleRate);
      case 'reverb':
        return new ReverbEffect(params, this.sampleRate);
      case 'filter':
        return new FilterEffect(params, this.sampleRate);
      case 'compressor':
        return new CompressorEffect(params, this.sampleRate);
      case 'distortion':
        return new DistortionEffect(params);
      default:
        return null;
    }
  }

  process(inputs, outputs, parameters) {
    let startTime;
    const shouldMonitorPerf = (++this.perfMonitorCounter % 50) === 0;
    if (shouldMonitorPerf) {
      startTime = performance.now();
    }
    
    const input = inputs[0];
    const output = outputs[0];
    
    if (!input || !output) return true;
    
    const inputChannels = input.length;
    const outputChannels = output.length;
    const frameCount = input[0]?.length || this.bufferSize;
    
    // Process each channel
    for (let channel = 0; channel < Math.min(inputChannels, outputChannels); channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      
      if (!inputChannel || !outputChannel) continue;
      
      // Copy input to output first
      outputChannel.set(inputChannel);
      
      // Apply effects chain
      this.applyEffectsChain(outputChannel, channel);
      
      // Record if enabled
      if (this.isRecording && this.recordBuffer.length < this.maxRecordLength) {
        // Store sample frame
        if (channel === 0) {
          for (let i = 0; i < frameCount; i++) {
            this.recordBuffer.push(new Array(outputChannels));
          }
        }
        
        for (let i = 0; i < frameCount; i++) {
          const frameIndex = this.recordBuffer.length - frameCount + i;
          if (frameIndex >= 0 && this.recordBuffer[frameIndex]) {
            this.recordBuffer[frameIndex][channel] = outputChannel[i];
          }
        }
      }
    }
    
    this.processedSamples += frameCount;
    
    // Performance monitoring (sampled)
    if (shouldMonitorPerf) {
      const processingTime = performance.now() - startTime;
      this.processingTimes.push(processingTime);
      
      if (this.processingTimes.length > 100) {
        this.processingTimes.shift();
      }
      
      // Check for real-time performance issues
      if (processingTime > this.maxProcessingTime * 0.8) {
        this.port.postMessage({
          type: 'performanceWarning',
          processingTime,
          maxTime: this.maxProcessingTime
        });
      }
    }
    
    return true;
  }

  applyEffectsChain(audioData, channel) {
    for (const effectId of this.effectsOrder) {
      const effect = this.effects.get(effectId);
      if (effect && effect.process) {
        effect.process(audioData, channel);
      }
    }
  }

  sendPerformanceStats() {
    const avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    const maxProcessingTime = Math.max(...this.processingTimes);
    
    this.port.postMessage({
      type: 'performanceStats',
      stats: {
        averageProcessingTime: avgProcessingTime,
        maxProcessingTime: maxProcessingTime,
        cpuUsage: (avgProcessingTime / this.maxProcessingTime) * 100,
        processedSamples: this.processedSamples,
        activeEffects: this.effects.size
      }
    });
  }
}

// Effect classes
class GainEffect {
  constructor(params) {
    this.gain = params.gain || 1.0;
  }
  
  updateParams(params) {
    this.gain = params.gain ?? this.gain;
  }
  
  process(audioData, channel) {
    for (let i = 0; i < audioData.length; i++) {
      audioData[i] *= this.gain;
    }
  }
}

class DelayEffect {
  constructor(params, sampleRate) {
    this.delayTime = params.delayTime || 0.3;
    this.feedback = params.feedback || 0.3;
    this.wetLevel = params.wetLevel || 0.3;
    this.sampleRate = sampleRate;
    
    this.bufferSize = Math.floor(this.sampleRate * 2); // 2 second max delay
    this.delayBuffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
  }
  
  updateParams(params) {
    this.delayTime = params.delayTime ?? this.delayTime;
    this.feedback = params.feedback ?? this.feedback;
    this.wetLevel = params.wetLevel ?? this.wetLevel;
  }
  
  process(audioData, channel) {
    const delaySamples = Math.floor(this.delayTime * this.sampleRate);
    
    for (let i = 0; i < audioData.length; i++) {
      const inputSample = audioData[i];
      
      // Calculate read index
      let readIndex = this.writeIndex - delaySamples;
      if (readIndex < 0) readIndex += this.bufferSize;
      
      // Get delayed sample
      const delayedSample = this.delayBuffer[readIndex];
      
      // Write to delay buffer with feedback
      this.delayBuffer[this.writeIndex] = inputSample + (delayedSample * this.feedback);
      
      // Mix dry and wet signal
      audioData[i] = inputSample + (delayedSample * this.wetLevel);
      
      // Advance write index
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
  }
}

class CompressorEffect {
  constructor(params, sampleRate) {
    this.threshold = params.threshold || -20; // dB
    this.ratio = params.ratio || 4;
    this.attack = params.attack || 0.003; // seconds
    this.release = params.release || 0.1; // seconds
    this.makeupGain = params.makeupGain || 1.0;
    
    this.sampleRate = sampleRate;
    this.envelope = 0;
    this.attackCoeff = Math.exp(-1 / (this.attack * sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.release * sampleRate));
  }
  
  updateParams(params) {
    this.threshold = params.threshold ?? this.threshold;
    this.ratio = params.ratio ?? this.ratio;
    this.attack = params.attack ?? this.attack;
    this.release = params.release ?? this.release;
    this.makeupGain = params.makeupGain ?? this.makeupGain;
    
    this.attackCoeff = Math.exp(-1 / (this.attack * this.sampleRate));
    this.releaseCoeff = Math.exp(-1 / (this.release * this.sampleRate));
  }
  
  process(audioData, channel) {
    const thresholdLinear = Math.pow(10, this.threshold / 20);
    
    for (let i = 0; i < audioData.length; i++) {
      const inputLevel = Math.abs(audioData[i]);
      
      // Update envelope follower
      const targetLevel = inputLevel > this.envelope ? inputLevel : this.envelope;
      const coeff = inputLevel > this.envelope ? this.attackCoeff : this.releaseCoeff;
      this.envelope = targetLevel + (this.envelope - targetLevel) * coeff;
      
      // Calculate gain reduction
      let gainReduction = 1.0;
      if (this.envelope > thresholdLinear) {
        const excess = this.envelope / thresholdLinear;
        const compressedExcess = Math.pow(excess, 1 / this.ratio - 1);
        gainReduction = compressedExcess;
      }
      
      // Apply compression and makeup gain
      audioData[i] = audioData[i] * gainReduction * this.makeupGain;
    }
  }
}

class FilterEffect {
  constructor(params, sampleRate) {
    this.frequency = params.frequency || 1000;
    this.Q = params.Q || 1.0;
    this.type = params.type || 'lowpass';
    this.sampleRate = sampleRate;
    
    // Biquad filter coefficients
    this.b0 = 0; this.b1 = 0; this.b2 = 0;
    this.a1 = 0; this.a2 = 0;
    
    // Filter memory
    this.x1 = 0; this.x2 = 0;
    this.y1 = 0; this.y2 = 0;
    
    this.calculateCoefficients();
  }
  
  updateParams(params) {
    this.frequency = params.frequency ?? this.frequency;
    this.Q = params.Q ?? this.Q;
    this.type = params.type ?? this.type;
    this.calculateCoefficients();
  }
  
  calculateCoefficients() {
    const omega = 2 * Math.PI * this.frequency / this.sampleRate;
    const sin = Math.sin(omega);
    const cos = Math.cos(omega);
    const alpha = sin / (2 * this.Q);
    
    switch (this.type) {
      case 'lowpass':
        this.b0 = (1 - cos) / 2;
        this.b1 = 1 - cos;
        this.b2 = (1 - cos) / 2;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cos;
        this.a2 = 1 - alpha;
        break;
        
      case 'highpass':
        this.b0 = (1 + cos) / 2;
        this.b1 = -(1 + cos);
        this.b2 = (1 + cos) / 2;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cos;
        this.a2 = 1 - alpha;
        break;
        
      case 'bandpass':
        this.b0 = alpha;
        this.b1 = 0;
        this.b2 = -alpha;
        this.a0 = 1 + alpha;
        this.a1 = -2 * cos;
        this.a2 = 1 - alpha;
        break;
    }
    
    // Normalize coefficients
    this.b0 /= this.a0;
    this.b1 /= this.a0;
    this.b2 /= this.a0;
    this.a1 /= this.a0;
    this.a2 /= this.a0;
  }
  
  process(audioData, channel) {
    for (let i = 0; i < audioData.length; i++) {
      const input = audioData[i];
      
      // Biquad filter equation
      const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                    - this.a1 * this.y1 - this.a2 * this.y2;
      
      // Update delay elements
      this.x2 = this.x1;
      this.x1 = input;
      this.y2 = this.y1;
      this.y1 = output;
      
      audioData[i] = output;
    }
  }
}

registerProcessor('pro-audio-processor', ProAudioProcessor);
`;

/**
 * High-Performance Audio Worklet Manager
 */
class AudioWorkletManager {
  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.isInitialized = false;
    this.effectsChain = new Map();
    this.performanceStats = null;
    
    this.callbacks = {
      onRecordingComplete: null,
      onPerformanceWarning: null,
      onPerformanceStats: null
    };
  }

  /**
   * Initialize audio worklet system
   */
  async initialize(audioContext, options = {}) {
    try {
      this.audioContext = audioContext;
      
      // Create and register the audio worklet
      const blob = new Blob([audioWorkletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      
      await audioContext.audioWorklet.addModule(workletUrl);
      
      // Create worklet node
      this.workletNode = new AudioWorkletNode(audioContext, 'pro-audio-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        channelCount: options.channelCount || 2,
        processorOptions: {
          bufferSize: options.bufferSize || 128,
          channelCount: options.channelCount || 2
        }
      });
      
      // Set up message handling
      this.workletNode.port.onmessage = this.handleWorkletMessage.bind(this);
      
      this.isInitialized = true;
      
      // Cleanup blob URL
      URL.revokeObjectURL(workletUrl);
      
      console.log('AudioWorkletManager initialized successfully');
      return this.workletNode;
      
    } catch (error) {
      console.error('Failed to initialize AudioWorkletManager:', error);
      throw error;
    }
  }

  /**
   * Handle messages from audio worklet
   */
  handleWorkletMessage(event) {
    const { type, audioData, channels, sampleRate, duration, stats, processingTime, maxTime } = event.data;
    
    switch (type) {
      case 'recordingStarted':
        console.log('Recording started in audio worklet');
        break;
        
      case 'recordingComplete':
        if (this.callbacks.onRecordingComplete) {
          // Convert interleaved buffer back to AudioBuffer
          const audioBuffer = this.audioContext.createBuffer(channels, audioData.length / channels, sampleRate);
          
          for (let ch = 0; ch < channels; ch++) {
            const channelData = audioBuffer.getChannelData(ch);
            for (let i = 0; i < channelData.length; i++) {
              channelData[i] = audioData[i * channels + ch];
            }
          }
          
          this.callbacks.onRecordingComplete(audioBuffer, duration);
        }
        break;
        
      case 'performanceWarning':
        if (this.callbacks.onPerformanceWarning) {
          this.callbacks.onPerformanceWarning(processingTime, maxTime);
        }
        console.warn(`Audio processing performance warning: ${processingTime.toFixed(2)}ms (max: ${maxTime.toFixed(2)}ms)`);
        break;
        
      case 'performanceStats':
        this.performanceStats = stats;
        if (this.callbacks.onPerformanceStats) {
          this.callbacks.onPerformanceStats(stats);
        }
        break;
    }
  }

  /**
   * Start recording audio
   */
  startRecording() {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.workletNode.port.postMessage({
      type: 'startRecording'
    });
  }

  /**
   * Stop recording audio
   */
  stopRecording() {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.workletNode.port.postMessage({
      type: 'stopRecording'
    });
  }

  /**
   * Add audio effect to processing chain
   */
  addEffect(id, type, params = {}) {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.effectsChain.set(id, { type, params });
    
    this.workletNode.port.postMessage({
      type: 'addEffect',
      data: {
        id,
        config: { type, params }
      }
    });
  }

  /**
   * Remove effect from processing chain
   */
  removeEffect(id) {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.effectsChain.delete(id);
    
    this.workletNode.port.postMessage({
      type: 'removeEffect',
      data: { id }
    });
  }

  /**
   * Update effect parameters
   */
  updateEffect(id, params) {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    const effect = this.effectsChain.get(id);
    if (effect) {
      effect.params = { ...effect.params, ...params };
    }
    
    this.workletNode.port.postMessage({
      type: 'updateEffect',
      data: { id, params }
    });
  }

  /**
   * Set processing order of effects
   */
  setEffectOrder(order) {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.workletNode.port.postMessage({
      type: 'setEffectOrder',
      data: { order }
    });
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.workletNode.port.postMessage({
      type: 'getPerformanceStats'
    });
    
    return this.performanceStats;
  }

  /**
   * Connect worklet to audio graph
   */
  connect(destination) {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    return this.workletNode.connect(destination);
  }

  /**
   * Disconnect worklet from audio graph
   */
  disconnect() {
    if (!this.isInitialized) throw new Error('AudioWorkletManager not initialized');
    
    this.workletNode.disconnect();
  }

  /**
   * Set callback functions
   */
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    
    this.effectsChain.clear();
    this.isInitialized = false;
  }
}

export { AudioWorkletManager };
