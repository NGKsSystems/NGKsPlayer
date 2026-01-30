/**
 * Comprehensive Memory Management and Performance Optimization System
 * 
 * Advanced memory pooling, garbage collection optimization, and performance monitoring
 * for professional audio applications
 */

/**
 * Advanced Memory Pool Manager
 */
class AdvancedMemoryPool {
  constructor() {
    this.pools = new Map();
    this.usageTracking = new Map();
    this.gcCallbacks = [];
    this.memoryPressureHandlers = [];
    
    // Configuration
    this.config = {
      maxPoolSize: 50,
      maxTotalMemory: 200 * 1024 * 1024, // 200MB
      gcThreshold: 0.8, // Trigger cleanup at 80% usage
      monitoringInterval: 5000, // 5 seconds
      enableMetrics: true
    };
    
    this.metrics = {
      allocations: 0,
      deallocations: 0,
      poolHits: 0,
      poolMisses: 0,
      memoryUsage: 0,
      peakMemoryUsage: 0,
      gcTriggers: 0
    };
    
    this.startMonitoring();
    this.setupMemoryPressureDetection();
  }

  /**
   * Get typed array from pool
   */
  getTypedArray(type, length) {
    const key = `${type}_${length}`;
    
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
      this.usageTracking.set(key, { 
        size: this.getTypedArrayByteSize(type, length),
        inUse: 0,
        total: 0
      });
    }
    
    const pool = this.pools.get(key);
    const usage = this.usageTracking.get(key);
    
    let array;
    if (pool.length > 0) {
      array = pool.pop();
      this.metrics.poolHits++;
    } else {
      array = this.createTypedArray(type, length);
      this.metrics.poolMisses++;
      this.metrics.allocations++;
      usage.total++;
    }
    
    usage.inUse++;
    this.updateMemoryUsage();
    
    return array;
  }

  /**
   * Return typed array to pool
   */
  returnTypedArray(array, type, length) {
    const key = `${type}_${length}`;
    const pool = this.pools.get(key);
    const usage = this.usageTracking.get(key);
    
    if (!pool || !usage) return;
    
    // Clear array data for security
    array.fill(0);
    
    if (pool.length < this.config.maxPoolSize) {
      pool.push(array);
    } else {
      // Pool is full, let GC handle it
      this.metrics.deallocations++;
      usage.total--;
    }
    
    usage.inUse--;
    this.updateMemoryUsage();
  }

  /**
   * Get Float32Array specifically (most common for audio)
   */
  getFloat32Array(length) {
    return this.getTypedArray('Float32Array', length);
  }

  /**
   * Return Float32Array to pool
   */
  returnFloat32Array(array) {
    this.returnTypedArray(array, 'Float32Array', array.length);
  }

  /**
   * Get AudioBuffer from pool
   */
  getAudioBuffer(channels, length, sampleRate) {
    const key = `AudioBuffer_${channels}_${length}_${sampleRate}`;
    
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
      this.usageTracking.set(key, { 
        size: channels * length * 4, // 4 bytes per float32
        inUse: 0,
        total: 0
      });
    }
    
    const pool = this.pools.get(key);
    const usage = this.usageTracking.get(key);
    
    let buffer;
    if (pool.length > 0) {
      buffer = pool.pop();
      this.metrics.poolHits++;
      
      // Clear existing data
      for (let i = 0; i < channels; i++) {
        buffer.getChannelData(i).fill(0);
      }
    } else {
      try {
        buffer = new AudioBuffer({
          numberOfChannels: channels,
          length: length,
          sampleRate: sampleRate
        });
        this.metrics.poolMisses++;
        this.metrics.allocations++;
        usage.total++;
      } catch (error) {
        console.error('Failed to create AudioBuffer:', error);
        this.triggerMemoryCleanup();
        return null;
      }
    }
    
    usage.inUse++;
    this.updateMemoryUsage();
    
    return buffer;
  }

  /**
   * Return AudioBuffer to pool
   */
  returnAudioBuffer(buffer) {
    const channels = buffer.numberOfChannels;
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const key = `AudioBuffer_${channels}_${length}_${sampleRate}`;
    
    const pool = this.pools.get(key);
    const usage = this.usageTracking.get(key);
    
    if (!pool || !usage) return;
    
    if (pool.length < this.config.maxPoolSize) {
      pool.push(buffer);
    } else {
      this.metrics.deallocations++;
      usage.total--;
    }
    
    usage.inUse--;
    this.updateMemoryUsage();
  }

  /**
   * Create typed array by type
   */
  createTypedArray(type, length) {
    switch (type) {
      case 'Float32Array':
        return new Float32Array(length);
      case 'Float64Array':
        return new Float64Array(length);
      case 'Int16Array':
        return new Int16Array(length);
      case 'Int32Array':
        return new Int32Array(length);
      case 'Uint8Array':
        return new Uint8Array(length);
      case 'Uint16Array':
        return new Uint16Array(length);
      case 'Uint32Array':
        return new Uint32Array(length);
      default:
        throw new Error(`Unsupported typed array type: ${type}`);
    }
  }

  /**
   * Get byte size for typed array
   */
  getTypedArrayByteSize(type, length) {
    const bytesPerElement = {
      'Float32Array': 4,
      'Float64Array': 8,
      'Int16Array': 2,
      'Int32Array': 4,
      'Uint8Array': 1,
      'Uint16Array': 2,
      'Uint32Array': 4
    };
    
    return length * (bytesPerElement[type] || 4);
  }

  /**
   * Update memory usage tracking
   */
  updateMemoryUsage() {
    let totalMemory = 0;
    
    for (const [key, usage] of this.usageTracking) {
      totalMemory += usage.size * usage.total;
    }
    
    this.metrics.memoryUsage = totalMemory;
    this.metrics.peakMemoryUsage = Math.max(this.metrics.peakMemoryUsage, totalMemory);
    
    // Check if cleanup is needed
    if (totalMemory > this.config.maxTotalMemory * this.config.gcThreshold) {
      this.triggerMemoryCleanup();
    }
  }

  /**
   * Trigger memory cleanup
   */
  triggerMemoryCleanup() {
    this.metrics.gcTriggers++;
    
    console.log('Memory cleanup triggered:', {
      usage: (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      threshold: (this.config.maxTotalMemory / 1024 / 1024).toFixed(2) + 'MB'
    });
    
    // Reduce pool sizes
    for (const [key, pool] of this.pools) {
      const targetSize = Math.floor(pool.length * 0.5);
      const removed = pool.splice(0, pool.length - targetSize);
      
      const usage = this.usageTracking.get(key);
      if (usage) {
        usage.total -= removed.length;
        this.metrics.deallocations += removed.length;
      }
    }
    
    // Call registered cleanup callbacks
    this.gcCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('GC callback error:', error);
      }
    });
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    this.updateMemoryUsage();
  }

  /**
   * Setup memory pressure detection
   */
  setupMemoryPressureDetection() {
    // Use Performance Observer for memory info if available
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        const pressureRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
        
        if (pressureRatio > 0.85) {
          this.handleMemoryPressure('high', memInfo);
        } else if (pressureRatio > 0.7) {
          this.handleMemoryPressure('medium', memInfo);
        }
      }, this.config.monitoringInterval);
    }
    
    // Listen for memory pressure events (if supported)
    if ('onmemorypressure' in window) {
      window.addEventListener('memorypressure', (event) => {
        this.handleMemoryPressure(event.detail.level, event.detail);
      });
    }
  }

  /**
   * Handle memory pressure
   */
  handleMemoryPressure(level, details) {
    console.warn(\`Memory pressure detected: \${level}\`, details);
    
    this.memoryPressureHandlers.forEach(handler => {
      try {
        handler(level, details);
      } catch (error) {
        console.error('Memory pressure handler error:', error);
      }
    });
    
    if (level === 'high') {
      this.triggerMemoryCleanup();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (!this.config.enableMetrics) return;
    
    setInterval(() => {
      this.reportMetrics();
    }, this.config.monitoringInterval);
  }

  /**
   * Report performance metrics
   */
  reportMetrics() {
    const hitRate = this.metrics.poolHits / (this.metrics.poolHits + this.metrics.poolMisses) * 100;
    
    console.log('Memory Pool Metrics:', {
      hitRate: hitRate.toFixed(1) + '%',
      memoryUsage: (this.metrics.memoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      peakUsage: (this.metrics.peakMemoryUsage / 1024 / 1024).toFixed(2) + 'MB',
      allocations: this.metrics.allocations,
      deallocations: this.metrics.deallocations,
      gcTriggers: this.metrics.gcTriggers,
      activePools: this.pools.size
    });
  }

  /**
   * Register GC callback
   */
  onGarbageCollection(callback) {
    this.gcCallbacks.push(callback);
  }

  /**
   * Register memory pressure handler
   */
  onMemoryPressure(handler) {
    this.memoryPressureHandlers.push(handler);
  }

  /**
   * Get current statistics
   */
  getStats() {
    const hitRate = this.metrics.poolHits / (this.metrics.poolHits + this.metrics.poolMisses) * 100;
    
    return {
      ...this.metrics,
      hitRate: hitRate || 0,
      memoryUsageMB: this.metrics.memoryUsage / 1024 / 1024,
      peakMemoryUsageMB: this.metrics.peakMemoryUsage / 1024 / 1024,
      activePools: this.pools.size,
      poolDetails: Array.from(this.usageTracking.entries()).map(([key, usage]) => ({
        key,
        ...usage,
        sizeMB: usage.size / 1024 / 1024
      }))
    };
  }

  /**
   * Clear all pools
   */
  clearAll() {
    this.pools.clear();
    this.usageTracking.clear();
    this.metrics.memoryUsage = 0;
    console.log('All memory pools cleared');
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.clearAll();
    this.gcCallbacks = [];
    this.memoryPressureHandlers = [];
  }
}

/**
 * Performance Profiler for audio operations
 */
class AudioPerformanceProfiler {
  constructor() {
    this.profiles = new Map();
    this.activeTimers = new Map();
    this.frameRateMonitor = null;
    this.isMonitoring = false;
    
    this.metrics = {
      frameRate: 0,
      averageFrameTime: 0,
      droppedFrames: 0,
      cpuUsage: 0,
      memoryUsage: 0
    };
  }

  /**
   * Start profiling a function or operation
   */
  startProfile(name) {
    this.activeTimers.set(name, {
      startTime: performance.now(),
      startMemory: this.getCurrentMemoryUsage()
    });
  }

  /**
   * End profiling and record results
   */
  endProfile(name) {
    const timer = this.activeTimers.get(name);
    if (!timer) return null;
    
    const endTime = performance.now();
    const endMemory = this.getCurrentMemoryUsage();
    
    const duration = endTime - timer.startTime;
    const memoryDelta = endMemory - timer.startMemory;
    
    if (!this.profiles.has(name)) {
      this.profiles.set(name, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        totalMemory: 0,
        avgMemory: 0
      });
    }
    
    const profile = this.profiles.get(name);
    profile.count++;
    profile.totalTime += duration;
    profile.minTime = Math.min(profile.minTime, duration);
    profile.maxTime = Math.max(profile.maxTime, duration);
    profile.avgTime = profile.totalTime / profile.count;
    profile.totalMemory += memoryDelta;
    profile.avgMemory = profile.totalMemory / profile.count;
    
    this.activeTimers.delete(name);
    
    return {
      name,
      duration,
      memoryDelta,
      profile
    };
  }

  /**
   * Profile a function call
   */
  profile(name, fn) {
    this.startProfile(name);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.endProfile(name);
        });
      } else {
        this.endProfile(name);
        return result;
      }
    } catch (error) {
      this.endProfile(name);
      throw error;
    }
  }

  /**
   * Get current memory usage
   */
  getCurrentMemoryUsage() {
    if ('memory' in performance) {
      return performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Start frame rate monitoring
   */
  startFrameRateMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    let lastTime = performance.now();
    let frameCount = 0;
    let frameTimes = [];
    let droppedFrames = 0;
    
    const monitor = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const frameTime = currentTime - lastTime;
      
      frameCount++;
      frameTimes.push(frameTime);
      
      // Check for dropped frames (> 16.67ms for 60fps)
      if (frameTime > 16.67) {
        droppedFrames++;
      }
      
      // Update metrics every second
      if (frameTimes.length >= 60) {
        this.metrics.frameRate = 1000 / (frameTimes.reduce((a, b) => a + b) / frameTimes.length);
        this.metrics.averageFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
        this.metrics.droppedFrames = droppedFrames;
        this.metrics.memoryUsage = this.getCurrentMemoryUsage();
        
        frameTimes = [];
        droppedFrames = 0;
      }
      
      lastTime = currentTime;
      requestAnimationFrame(monitor);
    };
    
    this.frameRateMonitor = requestAnimationFrame(monitor);
  }

  /**
   * Stop frame rate monitoring
   */
  stopFrameRateMonitoring() {
    this.isMonitoring = false;
    if (this.frameRateMonitor) {
      cancelAnimationFrame(this.frameRateMonitor);
      this.frameRateMonitor = null;
    }
  }

  /**
   * Get all profiles
   */
  getProfiles() {
    return Array.from(this.profiles.entries()).map(([name, profile]) => ({
      name,
      ...profile
    }));
  }

  /**
   * Get specific profile
   */
  getProfile(name) {
    return this.profiles.get(name);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Clear all profiles
   */
  clearProfiles() {
    this.profiles.clear();
    this.activeTimers.clear();
  }

  /**
   * Generate performance report
   */
  generateReport() {
    const profiles = this.getProfiles();
    const metrics = this.getMetrics();
    
    return {
      timestamp: new Date().toISOString(),
      frameMetrics: metrics,
      operationProfiles: profiles.sort((a, b) => b.avgTime - a.avgTime),
      summary: {
        totalOperations: profiles.reduce((sum, p) => sum + p.count, 0),
        slowestOperation: profiles.reduce((max, p) => p.maxTime > max.maxTime ? p : max, profiles[0]),
        mostFrequentOperation: profiles.reduce((max, p) => p.count > max.count ? p : max, profiles[0])
      }
    };
  }
}

// Create global instances
const globalMemoryPool = new AdvancedMemoryPool();
const globalProfiler = new AudioPerformanceProfiler();

// Setup automatic cleanup on page unload
window.addEventListener('beforeunload', () => {
  globalMemoryPool.cleanup();
  globalProfiler.stopFrameRateMonitoring();
});

export { 
  AdvancedMemoryPool, 
  AudioPerformanceProfiler, 
  globalMemoryPool, 
  globalProfiler 
};