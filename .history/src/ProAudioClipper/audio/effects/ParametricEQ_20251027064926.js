/**
 * Professional Parametric EQ Effect
 * 
 * A high-quality 4-band parametric equalizer with professional-grade DSP
 * comparable to hardware and professional DAW EQs.
 * 
 * Features:
 * - 4 fully parametric bands (Low, Low-Mid, High-Mid, High)
 * - Switchable filter types per band
 * - High-Q notch filtering capability
 * - Real-time frequency response visualization
 * - Phase-coherent processing
 * - Low CPU overhead
 */

import BaseAudioEffect from '../BaseAudioEffect.js';

export class ParametricEQ extends BaseAudioEffect {
  static displayName = 'Parametric EQ';
  static category = 'EQ';
  static description = 'Professional 4-band parametric equalizer with real-time frequency response';
  
  constructor(audioContext, parameters = {}) {
    super(audioContext, parameters);
    
    // EQ bands storage
    this.bands = [];
    this.analysisBufferSize = 2048;
    
    // Create analysis node for frequency response visualization
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = this.analysisBufferSize;
    this.analyser.smoothingTimeConstant = 0.8;
    
    this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
    this.frequencyResponse = new Float32Array(this.analyser.frequencyBinCount);
    
    this.setupEQBands();
    this.setupRouting();
  }

  initializeParameters() {
    super.initializeParameters();
    
    // Master controls
    this.addParameter('outputGain', { min: -20, max: 20, default: 0, unit: 'dB' });
    this.addParameter('phase', { min: 0, max: 1, default: 0, unit: 'boolean' });
    
    // Low Band (Shelf/Bell)
    this.addParameter('lowEnabled', { min: 0, max: 1, default: 1, unit: 'boolean' });
    this.addParameter('lowType', { min: 0, max: 2, default: 0, unit: 'enum' }); // 0=shelf, 1=bell, 2=highpass
    this.addParameter('lowFreq', { min: 20, max: 500, default: 80, unit: 'Hz' });
    this.addParameter('lowGain', { min: -20, max: 20, default: 0, unit: 'dB' });
    this.addParameter('lowQ', { min: 0.1, max: 10, default: 0.7, unit: 'Q' });
    
    // Low-Mid Band (Bell/Notch)
    this.addParameter('lowMidEnabled', { min: 0, max: 1, default: 1, unit: 'boolean' });
    this.addParameter('lowMidType', { min: 0, max: 1, default: 0, unit: 'enum' }); // 0=bell, 1=notch
    this.addParameter('lowMidFreq', { min: 200, max: 2000, default: 500, unit: 'Hz' });
    this.addParameter('lowMidGain', { min: -20, max: 20, default: 0, unit: 'dB' });
    this.addParameter('lowMidQ', { min: 0.1, max: 30, default: 0.7, unit: 'Q' });
    
    // High-Mid Band (Bell/Notch)
    this.addParameter('highMidEnabled', { min: 0, max: 1, default: 1, unit: 'boolean' });
    this.addParameter('highMidType', { min: 0, max: 1, default: 0, unit: 'enum' }); // 0=bell, 1=notch
    this.addParameter('highMidFreq', { min: 1000, max: 8000, default: 2000, unit: 'Hz' });
    this.addParameter('highMidGain', { min: -20, max: 20, default: 0, unit: 'dB' });
    this.addParameter('highMidQ', { min: 0.1, max: 30, default: 0.7, unit: 'Q' });
    
    // High Band (Shelf/Bell)
    this.addParameter('highEnabled', { min: 0, max: 1, default: 1, unit: 'boolean' });
    this.addParameter('highType', { min: 0, max: 2, default: 0, unit: 'enum' }); // 0=shelf, 1=bell, 2=lowpass
    this.addParameter('highFreq', { min: 4000, max: 20000, default: 8000, unit: 'Hz' });
    this.addParameter('highGain', { min: -20, max: 20, default: 0, unit: 'dB' });
    this.addParameter('highQ', { min: 0.1, max: 10, default: 0.7, unit: 'Q' });
  }

  setupEQBands() {
    // Create 4 biquad filters for each band
    this.bands = [
      {
        name: 'low',
        filter: this.audioContext.createBiquadFilter(),
        enabled: true,
        type: 'lowshelf'
      },
      {
        name: 'lowMid',
        filter: this.audioContext.createBiquadFilter(),
        enabled: true,
        type: 'peaking'
      },
      {
        name: 'highMid',
        filter: this.audioContext.createBiquadFilter(),
        enabled: true,
        type: 'peaking'
      },
      {
        name: 'high',
        filter: this.audioContext.createBiquadFilter(),
        enabled: true,
        type: 'highshelf'
      }
    ];

    // Initialize filter settings
    this.updateAllBands();
  }

  setupRouting() {
    // Create output gain for master output level
    this.outputGain = this.audioContext.createGain();
    this.phaseInverter = this.audioContext.createGain();
    
    // Chain all EQ bands together
    let currentNode = this.inputNode;
    
    for (const band of this.bands) {
      currentNode.connect(band.filter);
      currentNode = band.filter;
    }
    
    // Connect to phase inverter, then output gain, then analyser
    currentNode.connect(this.phaseInverter);
    this.phaseInverter.connect(this.outputGain);
    this.outputGain.connect(this.analyser);
    this.analyser.connect(this.outputNode);
    
    // Set initial values
    this.outputGain.gain.value = this.dbToLinear(0); // 0 dB
    this.phaseInverter.gain.value = 1; // Normal phase
  }

  onParameterChange(name, value) {
    super.onParameterChange(name, value);
    
    // Handle master controls
    if (name === 'outputGain') {
      this.outputGain.gain.value = this.dbToLinear(value);
      return;
    }
    
    if (name === 'phase') {
      this.phaseInverter.gain.value = value > 0.5 ? -1 : 1;
      return;
    }
    
    // Handle band-specific parameters
    const bandMatch = name.match(/^(low|lowMid|highMid|high)(.+)$/);
    if (bandMatch) {
      const [, bandName, paramType] = bandMatch;
      this.updateBand(bandName, paramType, value);
    }
  }

  updateBand(bandName, paramType, value) {
    const band = this.bands.find(b => b.name === bandName);
    if (!band) return;

    const filter = band.filter;
    
    try {
      switch (paramType) {
        case 'Enabled':
          band.enabled = value > 0.5;
          // When disabled, set gain to 0 dB to effectively bypass
          if (!band.enabled && (band.type === 'peaking' || band.type === 'lowshelf' || band.type === 'highshelf')) {
            filter.gain.value = 0;
          } else if (band.enabled) {
            // Re-apply the gain when re-enabled
            const gainValue = this.getParameter(`${bandName}Gain`) || 0;
            filter.gain.value = gainValue;
          }
          break;
          
        case 'Type':
          this.updateBandType(band, value);
          break;
          
        case 'Freq':
          filter.frequency.value = Math.max(20, Math.min(20000, value));
          break;
          
        case 'Gain':
          if (band.enabled) {
            filter.gain.value = value;
          }
          break;
          
        case 'Q':
          filter.Q.value = Math.max(0.1, Math.min(30, value));
          break;
      }
    } catch (error) {
      console.warn(`EQ parameter update failed for ${bandName}.${paramType}:`, error);
    }
  }

  updateBandType(band, typeValue) {
    const typeMap = {
      low: ['lowshelf', 'peaking', 'highpass'],
      lowMid: ['peaking', 'notch'],
      highMid: ['peaking', 'notch'],
      high: ['highshelf', 'peaking', 'lowpass']
    };
    
    const types = typeMap[band.name];
    if (types && types[Math.floor(typeValue)]) {
      const newType = types[Math.floor(typeValue)];
      band.type = newType;
      band.filter.type = newType;
      
      // Re-apply parameters since filter type changed
      this.updateAllBands();
    }
  }

  updateAllBands() {
    for (const band of this.bands) {
      const enabled = this.getParameter(`${band.name}Enabled`);
      const freq = this.getParameter(`${band.name}Freq`);
      const gain = this.getParameter(`${band.name}Gain`);
      const q = this.getParameter(`${band.name}Q`);
      
      if (enabled !== undefined) this.updateBand(band.name, 'Enabled', enabled);
      if (freq !== undefined) this.updateBand(band.name, 'Freq', freq);
      if (gain !== undefined) this.updateBand(band.name, 'Gain', gain);
      if (q !== undefined) this.updateBand(band.name, 'Q', q);
    }
  }

  /**
   * Get frequency response data for visualization
   */
  getFrequencyResponse(frequencyArray = null) {
    if (!frequencyArray) {
      // Create default frequency array (20Hz to 20kHz, logarithmic)
      frequencyArray = new Float32Array(100);
      for (let i = 0; i < 100; i++) {
        frequencyArray[i] = 20 * Math.pow(1000, i / 99); // 20Hz to 20kHz
      }
    }
    
    const magnitudeResponse = new Float32Array(frequencyArray.length);
    const phaseResponse = new Float32Array(frequencyArray.length);
    
    // Calculate cumulative response from all enabled bands
    magnitudeResponse.fill(1); // Start with unity gain
    phaseResponse.fill(0); // Start with zero phase
    
    for (const band of this.bands) {
      if (band.enabled) {
        const bandMagnitude = new Float32Array(frequencyArray.length);
        const bandPhase = new Float32Array(frequencyArray.length);
        
        try {
          band.filter.getFrequencyResponse(frequencyArray, bandMagnitude, bandPhase);
          
          // Multiply magnitude responses (add in dB domain)
          for (let i = 0; i < frequencyArray.length; i++) {
            magnitudeResponse[i] *= bandMagnitude[i];
            phaseResponse[i] += bandPhase[i];
          }
        } catch (error) {
          console.warn('Error calculating frequency response for band:', band.name, error);
        }
      }
    }
    
    return {
      frequencies: frequencyArray,
      magnitude: magnitudeResponse,
      phase: phaseResponse,
      magnitudeDB: this.magnitudeToDb(magnitudeResponse)
    };
  }

  /**
   * Get current spectrum analysis data
   */
  getSpectrumData() {
    this.analyser.getFloatFrequencyData(this.frequencyData);
    
    // Convert bin indices to frequencies
    const nyquist = this.audioContext.sampleRate / 2;
    const frequencies = new Float32Array(this.frequencyData.length);
    
    for (let i = 0; i < frequencies.length; i++) {
      frequencies[i] = (i / this.frequencyData.length) * nyquist;
    }
    
    return {
      frequencies,
      magnitudes: this.frequencyData
    };
  }

  /**
   * Utility function: Convert dB to linear gain
   */
  dbToLinear(db) {
    return Math.pow(10, db / 20);
  }

  /**
   * Utility function: Convert linear gain to dB
   */
  linearToDb(linear) {
    return 20 * Math.log10(Math.max(0.00001, linear));
  }

  /**
   * Convert magnitude response array to dB
   */
  magnitudeToDb(magnitudeArray) {
    return magnitudeArray.map(mag => this.linearToDb(mag));
  }

  /**
   * Get EQ band information for UI
   */
  getBandInfo() {
    return this.bands.map(band => ({
      name: band.name,
      displayName: this.getBandDisplayName(band.name),
      enabled: band.enabled,
      type: band.type,
      frequency: this.getParameter(`${band.name}Freq`),
      gain: this.getParameter(`${band.name}Gain`),
      q: this.getParameter(`${band.name}Q`)
    }));
  }

  getBandDisplayName(bandName) {
    const names = {
      low: 'Low',
      lowMid: 'Low-Mid',
      highMid: 'High-Mid',
      high: 'High'
    };
    return names[bandName] || bandName;
  }

  /**
   * Reset EQ to flat response
   */
  reset() {
    const flatParams = {
      outputGain: 0,
      phase: 0,
      lowGain: 0,
      lowMidGain: 0,
      highMidGain: 0,
      highGain: 0
    };
    
    this.setParameters(flatParams);
  }

  /**
   * Apply preset EQ curves
   */
  applyPreset(presetName) {
    const presets = {
      flat: {
        lowGain: 0, lowMidGain: 0, highMidGain: 0, highGain: 0
      },
      vocal: {
        lowGain: -2, lowFreq: 80, lowMidGain: 2, lowMidFreq: 1000,
        highMidGain: 3, highMidFreq: 3000, highGain: 2, highFreq: 8000
      },
      bass: {
        lowGain: 4, lowFreq: 60, lowMidGain: -1, lowMidFreq: 400,
        highMidGain: -2, highMidFreq: 2000, highGain: -3, highFreq: 8000
      },
      presence: {
        lowGain: 0, lowMidGain: 1, lowMidFreq: 800,
        highMidGain: 3, highMidFreq: 2500, highGain: 2, highFreq: 10000
      },
      brightener: {
        lowGain: 0, lowMidGain: 0, highMidGain: 2, highMidFreq: 4000,
        highGain: 3, highFreq: 12000
      }
    };
    
    const preset = presets[presetName];
    if (preset) {
      this.setParameters(preset);
    }
  }

  destroy() {
    // Clean up all filter nodes
    this.bands.forEach(band => {
      band.filter.disconnect();
    });
    
    this.outputGain.disconnect();
    this.phaseInverter.disconnect();
    this.analyser.disconnect();
    
    super.destroy();
  }
}

export default ParametricEQ;