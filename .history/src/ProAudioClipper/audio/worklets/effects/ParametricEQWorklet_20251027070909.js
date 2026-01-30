/**
 * Parametric EQ AudioWorklet Processor
 * 
 * High-performance 4-band parametric equalizer with biquad filters.
 * Optimized for real-time processing with minimal latency.
 */

class ParametricEQWorklet {
  constructor(sampleRate, parameters = {}) {
    this.sampleRate = sampleRate;
    this.nyquist = sampleRate / 2;
    
    // Default parameters
    this.params = {
      // High frequency shelf
      highFreq: parameters.highFreq || 8000,
      highGain: parameters.highGain || 0,
      highQ: parameters.highQ || 0.707,
      
      // High-mid parametric
      hmidFreq: parameters.hmidFreq || 2500,
      hmidGain: parameters.hmidGain || 0,
      hmidQ: parameters.hmidQ || 1.0,
      
      // Low-mid parametric
      lmidFreq: parameters.lmidFreq || 500,
      lmidGain: parameters.lmidGain || 0,
      lmidQ: parameters.lmidQ || 1.0,
      
      // Low frequency shelf
      lowFreq: parameters.lowFreq || 100,
      lowGain: parameters.lowGain || 0,
      lowQ: parameters.lowQ || 0.707,
      
      bypass: false
    };
    
    // Biquad filter coefficients for each band (L/R channels)
    this.filters = {
      high: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      hmid: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      lmid: { left: new BiquadCoeffs(), right: new BiquadCoeffs() },
      low: { left: new BiquadCoeffs(), right: new BiquadCoeffs() }
    };
    
    // Initialize filter coefficients
    this.updateAllFilters();
  }

  setParameter(param, value) {
    if (this.params.hasOwnProperty(param)) {
      this.params[param] = value;
      
      // Update affected filter
      if (param.startsWith('high')) {
        this.updateFilter('high', 'highShelf');
      } else if (param.startsWith('hmid')) {
        this.updateFilter('hmid', 'peaking');
      } else if (param.startsWith('lmid')) {
        this.updateFilter('lmid', 'peaking');
      } else if (param.startsWith('low')) {
        this.updateFilter('low', 'lowShelf');
      }
    }
  }

  updateAllFilters() {
    this.updateFilter('high', 'highShelf');
    this.updateFilter('hmid', 'peaking');
    this.updateFilter('lmid', 'peaking');
    this.updateFilter('low', 'lowShelf');
  }

  updateFilter(band, type) {
    const freq = this.params[band + 'Freq'];
    const gain = this.params[band + 'Gain'];
    const q = this.params[band + 'Q'];
    
    // Calculate normalized frequency
    const w = (2 * Math.PI * freq) / this.sampleRate;
    const cosw = Math.cos(w);
    const sinw = Math.sin(w);
    const A = Math.pow(10, gain / 40); // Convert dB to linear
    const alpha = sinw / (2 * q);
    
    let b0, b1, b2, a0, a1, a2;
    
    switch (type) {
      case 'highShelf':
        {
          const S = 1;
          const beta = Math.sqrt(A) / q;
          
          b0 = A * ((A + 1) + (A - 1) * cosw + beta * sinw);
          b1 = -2 * A * ((A - 1) + (A + 1) * cosw);
          b2 = A * ((A + 1) + (A - 1) * cosw - beta * sinw);
          a0 = (A + 1) - (A - 1) * cosw + beta * sinw;
          a1 = 2 * ((A - 1) - (A + 1) * cosw);
          a2 = (A + 1) - (A - 1) * cosw - beta * sinw;
        }
        break;
        
      case 'lowShelf':
        {
          const S = 1;
          const beta = Math.sqrt(A) / q;
          
          b0 = A * ((A + 1) - (A - 1) * cosw + beta * sinw);
          b1 = 2 * A * ((A - 1) - (A + 1) * cosw);
          b2 = A * ((A + 1) - (A - 1) * cosw - beta * sinw);
          a0 = (A + 1) + (A - 1) * cosw + beta * sinw;
          a1 = -2 * ((A - 1) + (A + 1) * cosw);
          a2 = (A + 1) + (A - 1) * cosw - beta * sinw;
        }
        break;
        
      case 'peaking':
      default:
        {
          b0 = 1 + alpha * A;
          b1 = -2 * cosw;
          b2 = 1 - alpha * A;
          a0 = 1 + alpha / A;
          a1 = -2 * cosw;
          a2 = 1 - alpha / A;
        }
        break;
    }
    
    // Normalize coefficients
    this.filters[band].left.setCoeffs(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
    this.filters[band].right.setCoeffs(b0/a0, b1/a0, b2/a0, a1/a0, a2/a0);
  }

  process(leftSample, rightSample, sampleIndex) {
    if (this.bypass) {
      return [leftSample, rightSample];
    }
    
    // Process through each band in series
    let leftOut = leftSample;
    let rightOut = rightSample;
    
    // Low frequency shelf
    leftOut = this.filters.low.left.process(leftOut);
    rightOut = this.filters.low.right.process(rightOut);
    
    // Low-mid parametric
    leftOut = this.filters.lmid.left.process(leftOut);
    rightOut = this.filters.lmid.right.process(rightOut);
    
    // High-mid parametric
    leftOut = this.filters.hmid.left.process(leftOut);
    rightOut = this.filters.hmid.right.process(rightOut);
    
    // High frequency shelf
    leftOut = this.filters.high.left.process(leftOut);
    rightOut = this.filters.high.right.process(rightOut);
    
    return [leftOut, rightOut];
  }
}

/**
 * Biquad Filter Coefficients and State
 * 
 * Implements direct form I biquad filter for high-quality audio processing.
 */
class BiquadCoeffs {
  constructor() {
    // Filter coefficients
    this.b0 = 1; this.b1 = 0; this.b2 = 0;
    this.a1 = 0; this.a2 = 0;
    
    // Filter state
    this.x1 = 0; this.x2 = 0; // Input history
    this.y1 = 0; this.y2 = 0; // Output history
  }

  setCoeffs(b0, b1, b2, a1, a2) {
    this.b0 = b0; this.b1 = b1; this.b2 = b2;
    this.a1 = a1; this.a2 = a2;
  }

  process(input) {
    // Direct Form I implementation
    const output = this.b0 * input + this.b1 * this.x1 + this.b2 * this.x2
                 - this.a1 * this.y1 - this.a2 * this.y2;
    
    // Update history
    this.x2 = this.x1;
    this.x1 = input;
    this.y2 = this.y1;
    this.y1 = output;
    
    return output;
  }

  reset() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
}