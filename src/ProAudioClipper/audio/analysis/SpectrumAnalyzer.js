/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SpectrumAnalyzer.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Real-Time Spectrum Analyzer
 * 
 * Professional FFT-based spectrum analyzer with logarithmic frequency scaling,
 * configurable window sizes, smoothing, and professional visualization.
 */

export class SpectrumAnalyzer {
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
    
    // Configuration
    this.config = {
      fftSize: options.fftSize || 2048, // Must be power of 2
      smoothingTimeConstant: options.smoothing || 0.8,
      minDecibels: options.minDecibels || -90,
      maxDecibels: options.maxDecibels || -10,
      minFrequency: options.minFrequency || 20,
      maxFrequency: options.maxFrequency || 20000,
      updateRate: options.updateRate || 60 // FPS
    };
    
    // Create analyzer node
    this.analyzerNode = audioContext.createAnalyser();
    this.analyzerNode.fftSize = this.config.fftSize;
    this.analyzerNode.smoothingTimeConstant = this.config.smoothingTimeConstant;
    this.analyzerNode.minDecibels = this.config.minDecibels;
    this.analyzerNode.maxDecibels = this.config.maxDecibels;
    
    // FFT data arrays
    this.frequencyBinCount = this.analyzerNode.frequencyBinCount;
    this.frequencyData = new Uint8Array(this.frequencyBinCount);
    this.timeData = new Uint8Array(this.frequencyBinCount);
    
    // Frequency mapping for logarithmic scale
    this.frequencyBins = this.createFrequencyBins();
    
    // Canvas setup will be done externally
    this.canvas = null;
    this.canvasContext = null;
    
    // Animation
    this.isRunning = false;
    this.animationId = null;
    this.lastUpdateTime = 0;
    this.updateInterval = 1000 / this.config.updateRate;
    
    // Peak hold functionality
    this.peakHoldTime = 1000; // ms
    this.peakData = new Array(this.frequencyBinCount).fill(0);
    this.peakTimestamps = new Array(this.frequencyBinCount).fill(0);
    
    console.log(`Spectrum Analyzer initialized: ${this.config.fftSize} FFT, ${this.frequencyBinCount} bins`);
  }
  
  /**
   * Create logarithmic frequency bin mapping
   */
  createFrequencyBins() {
    const bins = [];
    const nyquist = this.sampleRate / 2;
    
    for (let i = 0; i < this.frequencyBinCount; i++) {
      const frequency = (i * nyquist) / this.frequencyBinCount;
      bins.push({
        frequency,
        index: i,
        // Logarithmic position for display (0-1)
        logPosition: this.frequencyToLogPosition(frequency)
      });
    }
    
    return bins;
  }
  
  /**
   * Convert frequency to logarithmic position (0-1)
   */
  frequencyToLogPosition(frequency) {
    if (frequency <= this.config.minFrequency) return 0;
    if (frequency >= this.config.maxFrequency) return 1;
    
    const logMin = Math.log10(this.config.minFrequency);
    const logMax = Math.log10(this.config.maxFrequency);
    const logFreq = Math.log10(frequency);
    
    return (logFreq - logMin) / (logMax - logMin);
  }
  
  /**
   * Convert logarithmic position to frequency
   */
  logPositionToFrequency(position) {
    const logMin = Math.log10(this.config.minFrequency);
    const logMax = Math.log10(this.config.maxFrequency);
    const logFreq = logMin + position * (logMax - logMin);
    
    return Math.pow(10, logFreq);
  }
  
  /**
   * Connect audio source to analyzer
   */
  connectSource(sourceNode) {
    sourceNode.connect(this.analyzerNode);
    return this.analyzerNode; // Return for chaining
  }
  
  /**
   * Set up canvas for visualization
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    this.canvasContext = canvas.getContext('2d');
    
    // Set up high DPI support
    const dpr = (typeof window !== 'undefined' ? window.devicePixelRatio : null) || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    this.canvasContext.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }
  
  /**
   * Start real-time analysis and visualization
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.animate();
  }
  
  /**
   * Stop analysis
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Animation loop for real-time updates
   */
  animate() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.updateAnalysis();
      this.draw();
      this.lastUpdateTime = currentTime;
    }
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  /**
   * Update FFT analysis data
   */
  updateAnalysis() {
    // Get frequency domain data
    this.analyzerNode.getByteFrequencyData(this.frequencyData);
    
    // Update peak hold data
    const currentTime = performance.now();
    for (let i = 0; i < this.frequencyData.length; i++) {
      const currentLevel = this.frequencyData[i];
      
      if (currentLevel > this.peakData[i]) {
        this.peakData[i] = currentLevel;
        this.peakTimestamps[i] = currentTime;
      } else if (currentTime - this.peakTimestamps[i] > this.peakHoldTime) {
        // Decay peak hold
        this.peakData[i] = Math.max(0, this.peakData[i] - 1);
      }
    }
  }
  
  /**
   * Draw spectrum analyzer visualization
   */
  draw() {
    if (!this.canvas || !this.canvasContext) return;
    
    const ctx = this.canvasContext;
    const pixelRatio = (typeof window !== 'undefined' ? window.devicePixelRatio : null) || 1;
    const width = this.canvas.width / pixelRatio;
    const height = this.canvas.height / pixelRatio;
    
    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);
    
    // Draw frequency grid
    this.drawGrid(ctx, width, height);
    
    // Draw spectrum bars
    this.drawSpectrum(ctx, width, height);
    
    // Draw peak hold
    this.drawPeakHold(ctx, width, height);
    
    // Draw frequency labels
    this.drawFrequencyLabels(ctx, width, height);
  }
  
  /**
   * Draw background grid
   */
  drawGrid(ctx, width, height) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Frequency grid lines (logarithmic)
    const frequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    
    frequencies.forEach(freq => {
      if (freq >= this.config.minFrequency && freq <= this.config.maxFrequency) {
        const x = this.frequencyToLogPosition(freq) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
    });
    
    // dB grid lines
    const dbLevels = [-60, -40, -20, -10, -3, 0];
    dbLevels.forEach(db => {
      if (db >= this.config.minDecibels && db <= this.config.maxDecibels) {
        const y = height - ((db - this.config.minDecibels) / (this.config.maxDecibels - this.config.minDecibels)) * height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    });
  }
  
  /**
   * Draw spectrum bars
   */
  drawSpectrum(ctx, width, height) {
    const barWidth = width / this.frequencyBinCount;
    
    // Create gradient for spectrum
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#00ff00');    // Green at bottom
    gradient.addColorStop(0.5, '#ffff00');  // Yellow in middle
    gradient.addColorStop(0.8, '#ff8000');  // Orange near top
    gradient.addColorStop(1, '#ff0000');    // Red at top
    
    ctx.fillStyle = gradient;
    
    for (let i = 0; i < this.frequencyBinCount; i++) {
      const frequency = this.frequencyBins[i].frequency;
      
      // Skip frequencies outside our range
      if (frequency < this.config.minFrequency || frequency > this.config.maxFrequency) {
        continue;
      }
      
      const x = this.frequencyBins[i].logPosition * width;
      const normalizedValue = this.frequencyData[i] / 255;
      const barHeight = normalizedValue * height;
      
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    }
  }
  
  /**
   * Draw peak hold indicators
   */
  drawPeakHold(ctx, width, height) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < this.frequencyBinCount; i++) {
      const frequency = this.frequencyBins[i].frequency;
      
      if (frequency < this.config.minFrequency || frequency > this.config.maxFrequency) {
        continue;
      }
      
      const x = this.frequencyBins[i].logPosition * width;
      const normalizedPeak = this.peakData[i] / 255;
      const peakY = height - (normalizedPeak * height);
      
      if (this.peakData[i] > 0) {
        ctx.beginPath();
        ctx.moveTo(x, peakY);
        ctx.lineTo(x + width / this.frequencyBinCount, peakY);
        ctx.stroke();
      }
    }
  }
  
  /**
   * Draw frequency labels
   */
  drawFrequencyLabels(ctx, width, height) {
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    
    const frequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    
    frequencies.forEach(freq => {
      if (freq >= this.config.minFrequency && freq <= this.config.maxFrequency) {
        const x = this.frequencyToLogPosition(freq) * width;
        const label = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
        ctx.fillText(label, x, height - 5);
      }
    });
  }
  
  /**
   * Get current spectrum data for external use
   */
  getSpectrumData() {
    return {
      frequencyData: new Uint8Array(this.frequencyData),
      peakData: new Array(...this.peakData),
      frequencyBins: this.frequencyBins,
      config: this.config
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    
    if (newConfig.fftSize && newConfig.fftSize !== this.analyzerNode.fftSize) {
      this.analyzerNode.fftSize = newConfig.fftSize;
      this.frequencyBinCount = this.analyzerNode.frequencyBinCount;
      this.frequencyData = new Uint8Array(this.frequencyBinCount);
      this.timeData = new Uint8Array(this.frequencyBinCount);
      this.frequencyBins = this.createFrequencyBins();
      this.peakData = new Array(this.frequencyBinCount).fill(0);
      this.peakTimestamps = new Array(this.frequencyBinCount).fill(0);
    }
    
    if (newConfig.smoothing !== undefined) {
      this.analyzerNode.smoothingTimeConstant = newConfig.smoothing;
    }
    
    if (newConfig.updateRate) {
      this.updateInterval = 1000 / newConfig.updateRate;
    }
  }
}
