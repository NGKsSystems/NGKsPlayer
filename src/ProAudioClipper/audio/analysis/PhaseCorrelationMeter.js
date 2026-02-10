/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PhaseCorrelationMeter.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Phase Correlation Meter
 * 
 * Professional stereo phase correlation analysis for monitoring
 * stereo imaging and detecting phase issues.
 */

export class PhaseCorrelationMeter {
  constructor(audioContext, options = {}) {
    this.audioContext = audioContext;
    this.sampleRate = audioContext.sampleRate;
    
    // Configuration
    this.config = {
      windowSize: options.windowSize || 1024,
      updateRate: options.updateRate || 30,
      smoothing: options.smoothing || 0.8
    };
    
    // Create analyzer nodes for left and right channels
    this.leftAnalyzer = audioContext.createAnalyser();
    this.rightAnalyzer = audioContext.createAnalyser();
    
    this.leftAnalyzer.fftSize = this.config.windowSize;
    this.rightAnalyzer.fftSize = this.config.windowSize;
    
    // Data arrays
    this.bufferLength = this.leftAnalyzer.frequencyBinCount;
    this.leftData = new Float32Array(this.bufferLength);
    this.rightData = new Float32Array(this.bufferLength);
    
    // Channel splitter for stereo separation
    this.splitter = audioContext.createChannelSplitter(2);
    
    // Connect splitter to analyzers
    this.splitter.connect(this.leftAnalyzer, 0);
    this.splitter.connect(this.rightAnalyzer, 1);
    
    // Correlation calculation
    this.correlation = 0;
    this.smoothedCorrelation = 0;
    this.correlationHistory = [];
    this.historyLength = 100;
    
    // Goniometer data (X-Y plot for stereo imaging)
    this.goniometerData = [];
    this.maxGoniometerPoints = 200;
    
    // Update timing
    this.isRunning = false;
    this.lastUpdateTime = 0;
    this.updateInterval = 1000 / this.config.updateRate;
    
    console.log('Phase Correlation Meter initialized');
  }
  
  /**
   * Connect stereo audio source
   */
  connectSource(sourceNode) {
    sourceNode.connect(this.splitter);
    return this.splitter; // Return for chaining
  }
  
  /**
   * Start correlation analysis
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.update();
  }
  
  /**
   * Stop correlation analysis
   */
  stop() {
    this.isRunning = false;
  }
  
  /**
   * Update correlation calculation
   */
  update() {
    if (!this.isRunning) {
      requestAnimationFrame(() => this.update());
      return;
    }
    
    const currentTime = performance.now();
    
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.calculateCorrelation();
      this.updateGoniometer();
      this.lastUpdateTime = currentTime;
    }
    
    requestAnimationFrame(() => this.update());
  }
  
  /**
   * Calculate phase correlation
   */
  calculateCorrelation() {
    // Get time domain data for both channels
    this.leftAnalyzer.getFloatTimeDomainData(this.leftData);
    this.rightAnalyzer.getFloatTimeDomainData(this.rightData);
    
    // Calculate correlation coefficient
    let sumLR = 0;
    let sumLL = 0;
    let sumRR = 0;
    
    for (let i = 0; i < this.bufferLength; i++) {
      const left = this.leftData[i];
      const right = this.rightData[i];
      
      sumLR += left * right;
      sumLL += left * left;
      sumRR += right * right;
    }
    
    // Pearson correlation coefficient
    const denominator = Math.sqrt(sumLL * sumRR);
    this.correlation = denominator > 0 ? sumLR / denominator : 0;
    
    // Apply smoothing
    this.smoothedCorrelation = this.smoothedCorrelation * this.config.smoothing + 
                               this.correlation * (1 - this.config.smoothing);
    
    // Update history
    this.correlationHistory.push(this.smoothedCorrelation);
    if (this.correlationHistory.length > this.historyLength) {
      this.correlationHistory.shift();
    }
  }
  
  /**
   * Update goniometer data for stereo imaging display
   */
  updateGoniometer() {
    // Calculate M/S (Mid/Side) from L/R
    for (let i = 0; i < this.bufferLength; i += 4) { // Subsample for performance
      const left = this.leftData[i];
      const right = this.rightData[i];
      
      // Convert L/R to M/S
      const mid = (left + right) * 0.5;    // Sum
      const side = (left - right) * 0.5;   // Difference
      
      // Add to goniometer data (X=left, Y=right or X=mid, Y=side)
      this.goniometerData.push({ x: left, y: right, mid, side });
    }
    
    // Limit data points for performance
    while (this.goniometerData.length > this.maxGoniometerPoints) {
      this.goniometerData.shift();
    }
  }
  
  /**
   * Get current correlation value (-1 to +1)
   */
  getCorrelation() {
    return this.smoothedCorrelation;
  }
  
  /**
   * Get correlation as percentage (0-100%)
   */
  getCorrelationPercentage() {
    return ((this.smoothedCorrelation + 1) / 2) * 100;
  }
  
  /**
   * Get correlation classification
   */
  getCorrelationStatus() {
    const corr = this.smoothedCorrelation;
    
    if (corr > 0.9) return { status: 'MONO', color: '#ff6666', description: 'Mono/In-Phase' };
    if (corr > 0.3) return { status: 'GOOD', color: '#66ff66', description: 'Good Stereo' };
    if (corr > -0.3) return { status: 'WIDE', color: '#ffff66', description: 'Wide Stereo' };
    if (corr > -0.9) return { status: 'PHASE', color: '#ff8866', description: 'Phase Issues' };
    return { status: 'ANTI', color: '#ff3333', description: 'Anti-Phase' };
  }
  
  /**
   * Get goniometer data for visualization
   */
  getGoniometerData() {
    return this.goniometerData.slice(); // Return copy
  }
  
  /**
   * Get correlation history for graphing
   */
  getCorrelationHistory() {
    return this.correlationHistory.slice(); // Return copy
  }
  
  /**
   * Get stereo width measurement
   */
  getStereoWidth() {
    // Calculate RMS of side channel relative to mid channel
    let midRMS = 0;
    let sideRMS = 0;
    
    for (const point of this.goniometerData) {
      midRMS += point.mid * point.mid;
      sideRMS += point.side * point.side;
    }
    
    if (this.goniometerData.length > 0) {
      midRMS = Math.sqrt(midRMS / this.goniometerData.length);
      sideRMS = Math.sqrt(sideRMS / this.goniometerData.length);
    }
    
    // Stereo width as ratio of side to mid
    return midRMS > 0 ? (sideRMS / midRMS) : 0;
  }
  
  /**
   * Detect potential mono compatibility issues
   */
  getMonoCompatibility() {
    const correlation = this.smoothedCorrelation;
    const width = this.getStereoWidth();
    
    // Mono compatibility warning conditions
    const warnings = [];
    
    if (correlation < -0.5) {
      warnings.push('Severe phase cancellation in mono');
    } else if (correlation < 0) {
      warnings.push('Phase cancellation possible in mono');
    }
    
    if (width > 2.0) {
      warnings.push('Very wide stereo image');
    }
    
    return {
      compatible: correlation > -0.3 && width < 1.5,
      warnings,
      score: Math.max(0, Math.min(100, (correlation + 1) * 50))
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    
    if (newConfig.windowSize && newConfig.windowSize !== this.leftAnalyzer.fftSize) {
      this.leftAnalyzer.fftSize = newConfig.windowSize;
      this.rightAnalyzer.fftSize = newConfig.windowSize;
      this.bufferLength = this.leftAnalyzer.frequencyBinCount;
      this.leftData = new Float32Array(this.bufferLength);
      this.rightData = new Float32Array(this.bufferLength);
    }
    
    if (newConfig.updateRate) {
      this.updateInterval = 1000 / newConfig.updateRate;
    }
  }
}
