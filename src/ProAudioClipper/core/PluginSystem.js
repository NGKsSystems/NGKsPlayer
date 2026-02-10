/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PluginSystem.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Plugin Architecture System for ProAudioClipper
 * 
 * Provides extensible plugin system for third-party effects and instruments
 * Supports VST3-style plugins, custom effects, and MIDI instruments
 */

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.categories = new Map();
    this.activeInstances = new Map();
    this.pluginPath = '/plugins/';
    
    // Initialize built-in plugin categories
    this.categories.set('effects', new Set());
    this.categories.set('instruments', new Set());
    this.categories.set('analyzers', new Set());
    this.categories.set('utilities', new Set());
  }

  /**
   * Register a plugin with the system
   */
  registerPlugin(plugin) {
    if (!this.validatePlugin(plugin)) {
      throw new Error(`Invalid plugin: ${plugin.name}`);
    }

    this.plugins.set(plugin.id, plugin);
    
    // Add to category
    if (!this.categories.has(plugin.category)) {
      this.categories.set(plugin.category, new Set());
    }
    this.categories.get(plugin.category).add(plugin.id);

    console.log(`Plugin registered: ${plugin.name} (${plugin.id})`);
    return true;
  }

  /**
   * Validate plugin structure
   */
  validatePlugin(plugin) {
    const required = ['id', 'name', 'version', 'category', 'process'];
    return required.every(prop => plugin.hasOwnProperty(prop)) &&
           typeof plugin.process === 'function';
  }

  /**
   * Load plugin from URL/file
   */
  async loadPlugin(url) {
    try {
      const response = await fetch(url);
      const pluginCode = await response.text();
      
      // Create sandboxed environment for plugin
      const sandbox = this.createPluginSandbox();
      
      // Execute plugin code in sandbox
      const pluginFactory = new Function('sandbox', `
        with(sandbox) {
          ${pluginCode}
          return createPlugin;
        }
      `)(sandbox);
      
      const plugin = pluginFactory();
      
      if (plugin) {
        this.registerPlugin(plugin);
        return plugin;
      }
      
      throw new Error('Plugin did not return valid factory function');
    } catch (error) {
      console.error(`Failed to load plugin from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Create secure sandbox for plugin execution
   */
  createPluginSandbox() {
    return {
      console: {
        log: (...args) => console.log('[Plugin]', ...args),
        warn: (...args) => console.warn('[Plugin]', ...args),
        error: (...args) => console.error('[Plugin]', ...args)
      },
      Math,
      Date,
      Array,
      Float32Array,
      Int16Array,
      JSON,
      // Audio API subset
      AudioContext: typeof window !== 'undefined' ? window.AudioContext : null,
      AudioWorkletNode: typeof window !== 'undefined' ? window.AudioWorkletNode : null,
      // Plugin utilities
      createAudioBuffer: (channels, length, sampleRate) => {
        const AC = typeof window !== 'undefined' ? window.AudioContext : null;
        if (!AC) return null;
        const audioContext = new AC();
        return audioContext.createBuffer(channels, length, sampleRate);
      }
    };
  }

  /**
   * Create plugin instance
   */
  createInstance(pluginId, audioContext, config = {}) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const instanceId = `${pluginId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const instance = {
      id: instanceId,
      plugin,
      audioContext,
      config: { ...plugin.defaultConfig, ...config },
      parameters: new Map(),
      isActive: false,
      
      // Plugin methods
      process: plugin.process.bind(instance),
      setParameter: (name, value) => {
        if (plugin.parameters && plugin.parameters[name]) {
          const param = plugin.parameters[name];
          const clampedValue = Math.max(param.min, Math.min(param.max, value));
          instance.parameters.set(name, clampedValue);
          
          if (plugin.onParameterChange) {
            plugin.onParameterChange.call(instance, name, clampedValue);
          }
        }
      },
      getParameter: (name) => instance.parameters.get(name),
      activate: () => {
        instance.isActive = true;
        if (plugin.onActivate) {
          plugin.onActivate.call(instance);
        }
      },
      deactivate: () => {
        instance.isActive = false;
        if (plugin.onDeactivate) {
          plugin.onDeactivate.call(instance);
        }
      },
      getLatency: () => plugin.latency || 0
    };

    // Initialize default parameters
    if (plugin.parameters) {
      Object.entries(plugin.parameters).forEach(([name, param]) => {
        instance.parameters.set(name, param.default);
      });
    }

    this.activeInstances.set(instanceId, instance);
    return instance;
  }

  /**
   * Destroy plugin instance
   */
  destroyInstance(instanceId) {
    const instance = this.activeInstances.get(instanceId);
    if (instance) {
      instance.deactivate();
      this.activeInstances.delete(instanceId);
      return true;
    }
    return false;
  }

  /**
   * Get all plugins by category
   */
  getPluginsByCategory(category) {
    const pluginIds = this.categories.get(category) || new Set();
    return Array.from(pluginIds).map(id => this.plugins.get(id));
  }

  /**
   * Get all available plugins
   */
  getAllPlugins() {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin by ID
   */
  getPlugin(pluginId) {
    return this.plugins.get(pluginId);
  }

  /**
   * Scan and load plugins from directory
   */
  async scanPluginDirectory(path = this.pluginPath) {
    try {
      // This would typically scan a directory structure
      // For web environment, we need a plugin manifest
      const manifestResponse = await fetch(`${path}manifest.json`);
      const manifest = await manifestResponse.json();
      
      const loadPromises = manifest.plugins.map(async (pluginInfo) => {
        try {
          return await this.loadPlugin(`${path}${pluginInfo.file}`);
        } catch (error) {
          console.warn(`Failed to load plugin ${pluginInfo.name}:`, error);
          return null;
        }
      });
      
      const results = await Promise.allSettled(loadPromises);
      const loaded = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`Loaded ${loaded} plugins from ${manifest.plugins.length} found`);
      return loaded;
    } catch (error) {
      console.error('Failed to scan plugin directory:', error);
      return 0;
    }
  }
}

/**
 * Plugin Host - integrates plugins into audio processing chain
 */
class PluginHost {
  constructor(audioContext, pluginManager) {
    this.audioContext = audioContext;
    this.pluginManager = pluginManager;
    this.pluginChain = [];
    this.bypassStates = new Map();
  }

  /**
   * Add plugin to processing chain
   */
  addPlugin(pluginId, config = {}) {
    const instance = this.pluginManager.createInstance(pluginId, this.audioContext, config);
    
    this.pluginChain.push(instance);
    this.bypassStates.set(instance.id, false);
    
    instance.activate();
    return instance;
  }

  /**
   * Remove plugin from chain
   */
  removePlugin(instanceId) {
    const index = this.pluginChain.findIndex(p => p.id === instanceId);
    if (index !== -1) {
      const instance = this.pluginChain[index];
      instance.deactivate();
      this.pluginChain.splice(index, 1);
      this.bypassStates.delete(instanceId);
      this.pluginManager.destroyInstance(instanceId);
      return true;
    }
    return false;
  }

  /**
   * Process audio through plugin chain
   */
  process(inputBuffer, outputBuffer) {
    let currentBuffer = inputBuffer;
    
    for (const plugin of this.pluginChain) {
      if (!this.bypassStates.get(plugin.id) && plugin.isActive) {
        try {
          currentBuffer = plugin.process(currentBuffer);
        } catch (error) {
          console.error(`Plugin ${plugin.plugin.name} processing error:`, error);
          // Bypass plugin on error
          this.bypassStates.set(plugin.id, true);
        }
      }
    }
    
    // Copy to output buffer
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const input = currentBuffer.getChannelData(channel);
      const output = outputBuffer.getChannelData(channel);
      output.set(input);
    }
  }

  /**
   * Toggle plugin bypass
   */
  bypassPlugin(instanceId, bypass = true) {
    this.bypassStates.set(instanceId, bypass);
  }

  /**
   * Reorder plugins in chain
   */
  reorderPlugin(instanceId, newIndex) {
    const currentIndex = this.pluginChain.findIndex(p => p.id === instanceId);
    if (currentIndex !== -1 && newIndex >= 0 && newIndex < this.pluginChain.length) {
      const plugin = this.pluginChain.splice(currentIndex, 1)[0];
      this.pluginChain.splice(newIndex, 0, plugin);
      return true;
    }
    return false;
  }

  /**
   * Get total processing latency
   */
  getTotalLatency() {
    return this.pluginChain.reduce((total, plugin) => {
      return total + (this.bypassStates.get(plugin.id) ? 0 : plugin.getLatency());
    }, 0);
  }
}

/**
 * Built-in example plugins
 */
const BuiltInPlugins = {
  // Simple Gain Plugin
  gain: {
    id: 'builtin.gain',
    name: 'Simple Gain',
    version: '1.0.0',
    category: 'utilities',
    author: 'ProAudioClipper',
    description: 'Basic gain/volume control',
    latency: 0,
    parameters: {
      gain: { min: 0, max: 2, default: 1, unit: 'linear' }
    },
    process(inputBuffer) {
      const gain = this.getParameter('gain');
      const outputBuffer = this.audioContext.createBuffer(
        inputBuffer.numberOfChannels,
        inputBuffer.length,
        inputBuffer.sampleRate
      );
      
      for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
        const input = inputBuffer.getChannelData(channel);
        const output = outputBuffer.getChannelData(channel);
        
        for (let i = 0; i < input.length; i++) {
          output[i] = input[i] * gain;
        }
      }
      
      return outputBuffer;
    }
  },

  // Simple Delay Plugin
  delay: {
    id: 'builtin.delay',
    name: 'Simple Delay',
    version: '1.0.0',
    category: 'effects',
    author: 'ProAudioClipper',
    description: 'Basic delay effect',
    latency: 0,
    parameters: {
      delayTime: { min: 0, max: 1000, default: 250, unit: 'ms' },
      feedback: { min: 0, max: 0.95, default: 0.3, unit: 'ratio' },
      wetDryMix: { min: 0, max: 1, default: 0.3, unit: 'ratio' }
    },
    onActivate() {
      const maxDelay = 1; // 1 second
      const bufferSize = Math.ceil(maxDelay * this.audioContext.sampleRate);
      this.delayBuffer = new Float32Array(bufferSize);
      this.writeIndex = 0;
    },
    process(inputBuffer) {
      const delayTime = this.getParameter('delayTime') / 1000; // Convert to seconds
      const feedback = this.getParameter('feedback');
      const wetDryMix = this.getParameter('wetDryMix');
      
      const outputBuffer = this.audioContext.createBuffer(
        inputBuffer.numberOfChannels,
        inputBuffer.length,
        inputBuffer.sampleRate
      );
      
      const delaySamples = Math.floor(delayTime * this.audioContext.sampleRate);
      
      // Process first channel only for simplicity
      const input = inputBuffer.getChannelData(0);
      const output = outputBuffer.getChannelData(0);
      
      for (let i = 0; i < input.length; i++) {
        const readIndex = (this.writeIndex - delaySamples + this.delayBuffer.length) % this.delayBuffer.length;
        const delayedSample = this.delayBuffer[readIndex];
        
        const outputSample = input[i] + delayedSample * feedback;
        this.delayBuffer[this.writeIndex] = outputSample;
        
        output[i] = input[i] * (1 - wetDryMix) + delayedSample * wetDryMix;
        
        this.writeIndex = (this.writeIndex + 1) % this.delayBuffer.length;
      }
      
      // Copy first channel to other channels
      for (let channel = 1; channel < outputBuffer.numberOfChannels; channel++) {
        outputBuffer.getChannelData(channel).set(output);
      }
      
      return outputBuffer;
    }
  }
};

// Create global plugin manager instance
const globalPluginManager = new PluginManager();

// Register built-in plugins
Object.values(BuiltInPlugins).forEach(plugin => {
  globalPluginManager.registerPlugin(plugin);
});

export { PluginManager, PluginHost, BuiltInPlugins, globalPluginManager };
