/**
 * Convolution Reverb Effect
 * 
 * A high-quality convolution reverb using Web Audio API's ConvolverNode.
 * Includes built-in impulse responses and support for custom IRs.
 * 
 * Features:
 * - Multiple built-in reverb types (Hall, Room, Plate, Spring)
 * - Adjustable reverb time and wet/dry mix
 * - Pre-delay control
 * - High-frequency damping
 * - Real-time parameter changes
 */

import BaseAudioEffect from '../BaseAudioEffect.js';

export class ConvolutionReverb extends BaseAudioEffect {
  static displayName = 'Convolution Reverb';
  static category = 'Reverb';
  static description = 'High-quality convolution reverb with multiple room types';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext, parameters);
    
    // Convolver node
    this.convolverNode = audioContext.createConvolver();
    this.convolverNode.normalize = true;
    
    // Pre-delay
    this.preDelayNode = audioContext.createDelay(0.5);
    
    // High-frequency damping
    this.dampingFilter = audioContext.createBiquadFilter();
    this.dampingFilter.type = 'lowpass';
    this.dampingFilter.frequency.value = 8000;
    this.dampingFilter.Q.value = 0.7;
    
    // Built-in impulse responses
    this.impulseResponses = new Map();
    this.currentReverbType = 'hall';
    
    this.generateImpulseResponses();
    this.setupRouting();
  }

  initializeParameters() {
    super.initializeParameters();
    
    this.addParameter('reverbType', { min: 0, max: 3, default: 0, unit: 'enum' }); // 0=Hall, 1=Room, 2=Plate, 3=Spring
    this.addParameter('mix', { min: 0, max: 1, default: 0.3, unit: 'ratio' });
    this.addParameter('reverbTime', { min: 0.1, max: 10, default: 2, unit: 's' });
    this.addParameter('preDelay', { min: 0, max: 200, default: 20, unit: 'ms' });
    this.addParameter('damping', { min: 1000, max: 20000, default: 8000, unit: 'Hz' });
    this.addParameter('roomSize', { min: 0.1, max: 3, default: 1, unit: 'ratio' });
  }

  setupRouting() {
    // Wet signal path: input -> preDelay -> convolver -> damping -> wet
    this.inputNode.connect(this.preDelayNode);
    this.preDelayNode.connect(this.convolverNode);
    this.convolverNode.connect(this.dampingFilter);
    this.dampingFilter.connect(this.wetNode);
    
    // Dry signal path: input -> dry
    this.inputNode.connect(this.dryNode);
    
    // Mix wet and dry
    this.wetNode.connect(this.outputNode);
    this.dryNode.connect(this.outputNode);
    
    this.updateMix();
  }

  generateImpulseResponses() {
    // Generate synthetic impulse responses for different reverb types
    // In a real implementation, you would load actual recorded impulse responses
    
    const sampleRate = this.audioContext.sampleRate;
    
    // Hall Reverb - Large space with long decay
    this.impulseResponses.set('hall', this.generateHallIR(sampleRate, 4.0, 0.8));
    
    // Room Reverb - Medium space with moderate decay
    this.impulseResponses.set('room', this.generateRoomIR(sampleRate, 1.5, 0.6));
    
    // Plate Reverb - Bright, metallic character
    this.impulseResponses.set('plate', this.generatePlateIR(sampleRate, 2.5, 0.7));
    
    // Spring Reverb - Vintage spring tank sound
    this.impulseResponses.set('spring', this.generateSpringIR(sampleRate, 1.0, 0.9));
    
    // Set initial impulse response
    this.setImpulseResponse('hall');
  }

  generateHallIR(sampleRate, reverbTime, diffusion) {
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        
        // Exponential decay
        const decay = Math.exp(-t * 3 / reverbTime);
        
        // Add some early reflections
        let sample = 0;
        
        // Direct sound (very early)
        if (i < sampleRate * 0.01) {
          sample += (Math.random() * 2 - 1) * 0.1 * decay;
        }
        
        // Early reflections (first 80ms)
        if (t < 0.08) {
          sample += (Math.random() * 2 - 1) * 0.3 * decay * diffusion;
        }
        
        // Late reverberation
        if (t > 0.02) {
          sample += (Math.random() * 2 - 1) * decay * diffusion * 0.5;
        }
        
        // Add some modulation for realism
        const modulation = Math.sin(t * 2 * Math.PI * (3 + channel)) * 0.1;
        sample *= (1 + modulation);
        
        channelData[i] = sample;
      }
    }
    
    return impulse;
  }

  generateRoomIR(sampleRate, reverbTime, diffusion) {
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 4 / reverbTime); // Faster decay than hall
        
        let sample = 0;
        
        // More prominent early reflections for room character
        if (t < 0.05) {
          sample += (Math.random() * 2 - 1) * 0.4 * decay * diffusion;
        }
        
        // Dense late reverb
        if (t > 0.01) {
          sample += (Math.random() * 2 - 1) * decay * diffusion * 0.6;
        }
        
        channelData[i] = sample;
      }
    }
    
    return impulse;
  }

  generatePlateIR(sampleRate, reverbTime, brightness) {
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 2.5 / reverbTime);
        
        let sample = 0;
        
        // Plate characteristics: bright, dense, metallic
        if (t > 0.001) {
          sample += (Math.random() * 2 - 1) * decay * brightness;
          
          // Add some high-frequency emphasis
          const hfEmphasis = Math.sin(t * 2 * Math.PI * 1000) * 0.2;
          sample *= (1 + hfEmphasis * brightness);
        }
        
        channelData[i] = sample;
      }
    }
    
    return impulse;
  }

  generateSpringIR(sampleRate, reverbTime, character) {
    const length = Math.floor(sampleRate * reverbTime);
    const impulse = this.audioContext.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-t * 6 / reverbTime); // Fast decay
        
        let sample = 0;
        
        // Spring characteristics: bouncy, metallic, short
        if (t > 0.002) {
          sample += (Math.random() * 2 - 1) * decay * character;
          
          // Add spring resonances
          const spring1 = Math.sin(t * 2 * Math.PI * 200) * 0.3;
          const spring2 = Math.sin(t * 2 * Math.PI * 400) * 0.2;
          const spring3 = Math.sin(t * 2 * Math.PI * 800) * 0.1;
          
          sample *= (1 + (spring1 + spring2 + spring3) * character);
        }
        
        channelData[i] = sample;
      }
    }
    
    return impulse;
  }

  setImpulseResponse(type) {
    const impulse = this.impulseResponses.get(type);
    if (impulse) {
      this.convolverNode.buffer = impulse;
      this.currentReverbType = type;
    }
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    switch (name) {
      case 'reverbType':
        const types = ['hall', 'room', 'plate', 'spring'];
        const type = types[Math.floor(value)] || 'hall';
        this.setImpulseResponse(type);
        break;
        
      case 'mix':
        this.wetGain = value;
        this.dryGain = 1 - value;
        this.updateMix();
        break;
        
      case 'reverbTime':
        // Regenerate impulse response with new reverb time
        this.regenerateCurrentIR();
        break;
        
      case 'preDelay':
        this.preDelayNode.delayTime.value = value / 1000; // Convert ms to seconds
        break;
        
      case 'damping':
        this.dampingFilter.frequency.value = value;
        break;
        
      case 'roomSize':
        // Regenerate impulse response with new room size
        this.regenerateCurrentIR();
        break;
    }
  }

  regenerateCurrentIR() {
    const reverbTime = this.getParameter('reverbTime') || 2;
    const roomSize = this.getParameter('roomSize') || 1;
    const sampleRate = this.audioContext.sampleRate;
    
    let newImpulse;
    const adjustedReverbTime = reverbTime * roomSize;
    
    switch (this.currentReverbType) {
      case 'hall':
        newImpulse = this.generateHallIR(sampleRate, adjustedReverbTime, 0.8);
        break;
      case 'room':
        newImpulse = this.generateRoomIR(sampleRate, adjustedReverbTime, 0.6);
        break;
      case 'plate':
        newImpulse = this.generatePlateIR(sampleRate, adjustedReverbTime, 0.7);
        break;
      case 'spring':
        newImpulse = this.generateSpringIR(sampleRate, adjustedReverbTime, 0.9);
        break;
      default:
        newImpulse = this.generateHallIR(sampleRate, adjustedReverbTime, 0.8);
    }
    
    if (newImpulse) {
      this.impulseResponses.set(this.currentReverbType, newImpulse);
      this.convolverNode.buffer = newImpulse;
    }
  }

  updateMix() {
    this.wetNode.gain.value = this.wetGain;
    this.dryNode.gain.value = this.dryGain;
  }

  /**
   * Get reverb type names for UI
   */
  getReverbTypes() {
    return [
      { value: 0, name: 'Hall', description: 'Large concert hall with long decay' },
      { value: 1, name: 'Room', description: 'Medium room with moderate decay' },
      { value: 2, name: 'Plate', description: 'Bright metallic plate reverb' },
      { value: 3, name: 'Spring', description: 'Vintage spring tank reverb' }
    ];
  }

  /**
   * Load custom impulse response from audio file
   */
  async loadCustomIR(audioBuffer) {
    try {
      // Validate the audio buffer
      if (!audioBuffer || audioBuffer.length === 0) {
        throw new Error('Invalid audio buffer');
      }
      
      // Store custom IR
      this.impulseResponses.set('custom', audioBuffer);
      this.currentReverbType = 'custom';
      this.convolverNode.buffer = audioBuffer;
      
      console.log('Custom impulse response loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load custom impulse response:', error);
      return false;
    }
  }

  destroy() {
    this.convolverNode.disconnect();
    this.preDelayNode.disconnect();
    this.dampingFilter.disconnect();
    
    super.destroy();
  }
}

export default ConvolutionReverb;