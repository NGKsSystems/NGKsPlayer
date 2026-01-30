/**
 * Base Audio Effect class - all effects inherit from this
 * 
 * This provides the common functionality that all audio effects need:
 * - Parameter management
 * - Wet/dry mixing
 * - Bypass functionality
 * - Audio routing setup
 * - Resource cleanup
 */

export class BaseAudioEffect {
  constructor(audioContext, parameters = {}) {
    this.audioContext = audioContext;
    this.id = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.bypass = false;
    
    // Create input and output nodes
    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    this.wetNode = audioContext.createGain();
    this.dryNode = audioContext.createGain();
    this.mixNode = audioContext.createGain();
    
    // Set up wet/dry mixing
    this.wetGain = 1.0;
    this.dryGain = 0.0;
    this.updateMix();
    
    // Initialize parameters
    this.parameters = new Map();
    this.initializeParameters();
    this.setParameters(parameters);
    
    // Set up basic signal routing
    this.setupRouting();
  }

  /**
   * Override this method to define effect parameters
   */
  initializeParameters() {
    this.addParameter('wet', { min: 0, max: 1, default: 1, unit: 'ratio' });
    this.addParameter('bypass', { min: 0, max: 1, default: 0, unit: 'boolean' });
  }

  /**
   * Add a parameter definition
   */
  addParameter(name, config) {
    this.parameters.set(name, {
      value: config.default,
      min: config.min,
      max: config.max,
      unit: config.unit || '',
      automatable: config.automatable !== false
    });
  }

  /**
   * Set parameter value
   */
  setParameter(name, value) {
    const param = this.parameters.get(name);
    if (param) {
      param.value = Math.max(param.min, Math.min(param.max, value));
      this.onParameterChange(name, param.value);
    }
  }

  /**
   * Set multiple parameters
   */
  setParameters(parameters) {
    Object.entries(parameters).forEach(([name, value]) => {
      this.setParameter(name, value);
    });
  }

  /**
   * Get parameter value
   */
  getParameter(name) {
    const param = this.parameters.get(name);
    return param ? param.value : undefined;
  }

  /**
   * Override this method to handle parameter changes
   */
  onParameterChange(name, value) {
    switch (name) {
      case 'wet':
        this.wetGain = value;
        this.updateMix();
        break;
      case 'bypass':
        this.setBypass(value > 0.5);
        break;
    }
  }

  /**
   * Update wet/dry mix
   */
  updateMix() {
    this.wetNode.gain.value = this.wetGain;
    this.dryNode.gain.value = this.dryGain;
  }

  /**
   * Override this method to set up audio routing
   */
  setupRouting() {
    // Default: direct connection (no processing)
    this.inputNode.connect(this.outputNode);
  }

  /**
   * Bypass the effect
   */
  setBypass(bypass) {
    this.bypass = bypass;
    // Implementation depends on routing setup
  }

  /**
   * Destroy the effect and clean up resources
   */
  destroy() {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.wetNode.disconnect();
    this.dryNode.disconnect();
    this.mixNode.disconnect();
  }
}

export default BaseAudioEffect;