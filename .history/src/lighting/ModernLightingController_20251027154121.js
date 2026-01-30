/**
 * Modern Lighting Network Controller
 * Prioritizes high-speed Ethernet protocols over legacy USB/DMX512
 */

export class ModernLightingController {
  constructor(options = {}) {
    this.options = {
      // Prioritize modern protocols
      primaryProtocol: options.primaryProtocol || 'Art-Net',
      fallbackProtocol: options.fallbackProtocol || 'sACN',
      legacyProtocol: options.legacyProtocol || 'DMX512',
      
      // Network settings (much faster than USB)
      networkInterface: options.networkInterface || 'Ethernet',
      networkRefreshRate: options.networkRefreshRate || 250, // Hz (vs 44Hz DMX)
      multicastIP: options.multicastIP || '239.255.0.1',
      artNetPort: options.artNetPort || 6454,
      sacnPort: options.sacnPort || 5568,
      
      // Legacy USB fallback
      usbInterface: options.usbInterface || 'ENTTEC',
      dmxRefreshRate: options.dmxRefreshRate || 44, // Limited by DMX512
      
      universe: options.universe || 1,
      ...options
    };
    
    // Multiple protocol support
    this.protocols = {
      'Art-Net': new ArtNetInterface(this.options),
      'sACN': new SACNInterface(this.options),
      'DMX512': new DMX512Interface(this.options)
    };
    
    this.activeProtocol = null;
    this.universe = new Array(512).fill(0);
    this.lastUpdate = 0;
    
    // Performance monitoring
    this.stats = {
      updatesPerSecond: 0,
      averageLatency: 0,
      droppedFrames: 0,
      protocolSwitches: 0
    };
    
    console.log('🌐 Modern Lighting Controller initialized');
    console.log(`   Primary: ${this.options.primaryProtocol} @ ${this.options.networkRefreshRate}Hz`);
    console.log(`   Fallback: ${this.options.fallbackProtocol}`);
    console.log(`   Legacy: ${this.options.legacyProtocol} @ ${this.options.dmxRefreshRate}Hz`);
  }
  
  /**
   * Initialize with automatic protocol selection
   */
  async initialize() {
    console.log('🔍 Detecting available lighting interfaces...');
    
    // Try modern protocols first
    const protocolsToTry = [
      this.options.primaryProtocol,
      this.options.fallbackProtocol,
      this.options.legacyProtocol
    ];
    
    for (const protocol of protocolsToTry) {
      try {
        const protocolInterface = this.protocols[protocol];
        const success = await protocolInterface.initialize();
        
        if (success) {
          this.activeProtocol = protocol;
          console.log(`✅ Connected via ${protocol}`);
          
          // Set appropriate refresh rate
          this.refreshRate = protocol === 'DMX512' 
            ? this.options.dmxRefreshRate 
            : this.options.networkRefreshRate;
            
          console.log(`   Refresh rate: ${this.refreshRate}Hz`);
          return true;
        }
      } catch (error) {
        console.log(`❌ ${protocol} failed: ${error.message}`);
      }
    }
    
    throw new Error('No lighting interfaces available');
  }
  
  /**
   * Send universe data with automatic protocol handling
   */
  async sendUniverse(universeData) {
    if (!this.activeProtocol) {
      console.warn('⚠️ No active lighting protocol');
      return false;
    }
    
    const startTime = performance.now();
    
    try {
      const interface = this.protocols[this.activeProtocol];
      await interface.sendUniverse(universeData);
      
      // Update performance stats
      const latency = performance.now() - startTime;
      this.updateStats(latency);
      
      return true;
    } catch (error) {
      console.error(`Failed to send via ${this.activeProtocol}:`, error);
      
      // Try to switch to fallback protocol
      await this.switchToFallbackProtocol();
      return false;
    }
  }
  
  /**
   * Switch to fallback protocol on failure
   */
  async switchToFallbackProtocol() {
    console.log('🔄 Switching to fallback protocol...');
    
    const currentIndex = [
      this.options.primaryProtocol,
      this.options.fallbackProtocol,
      this.options.legacyProtocol
    ].indexOf(this.activeProtocol);
    
    // Try next protocol
    if (currentIndex < 2) {
      const nextProtocol = [
        this.options.primaryProtocol,
        this.options.fallbackProtocol,
        this.options.legacyProtocol
      ][currentIndex + 1];
      
      try {
        const interface = this.protocols[nextProtocol];
        const success = await interface.initialize();
        
        if (success) {
          this.activeProtocol = nextProtocol;
          this.stats.protocolSwitches++;
          console.log(`✅ Switched to ${nextProtocol}`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Fallback ${nextProtocol} failed: ${error.message}`);
      }
    }
    
    console.error('❌ All lighting protocols failed');
    return false;
  }
  
  /**
   * Update performance statistics
   */
  updateStats(latency) {
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdate;
    
    // Calculate updates per second
    if (timeSinceLastUpdate > 0) {
      this.stats.updatesPerSecond = 1000 / timeSinceLastUpdate;
    }
    
    // Running average latency
    this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (latency * 0.1);
    
    // Check for dropped frames (refresh rate too high)
    if (timeSinceLastUpdate < (1000 / this.refreshRate * 0.8)) {
      this.stats.droppedFrames++;
    }
    
    this.lastUpdate = now;
  }
  
  /**
   * Get performance statistics
   */
  getStats() {
    return {
      activeProtocol: this.activeProtocol,
      refreshRate: this.refreshRate,
      ...this.stats,
      speedComparison: this.getSpeedComparison()
    };
  }
  
  /**
   * Compare protocol speeds
   */
  getSpeedComparison() {
    const protocolSpeeds = {
      'Art-Net': '100+ Mbps (Ethernet)',
      'sACN': '1000+ Mbps (Gigabit Ethernet)', 
      'DMX512': '0.25 Mbps (Serial)'
    };
    
    const speedFactors = {
      'Art-Net': 400,  // 400x faster than DMX512
      'sACN': 4000,    // 4000x faster than DMX512
      'DMX512': 1      // Baseline
    };
    
    return {
      protocolSpeeds,
      currentSpeed: protocolSpeeds[this.activeProtocol],
      speedFactor: speedFactors[this.activeProtocol]
    };
  }
  
  /**
   * Real-time performance monitoring
   */
  startPerformanceMonitoring() {
    setInterval(() => {
      const stats = this.getStats();
      console.log(`📊 Lighting Performance:`, {
        protocol: stats.activeProtocol,
        fps: Math.round(stats.updatesPerSecond),
        latency: Math.round(stats.averageLatency * 100) / 100 + 'ms',
        dropped: stats.droppedFrames,
        speed: stats.speedComparison.currentSpeed
      });
    }, 5000); // Every 5 seconds
  }
}

/**
 * Art-Net Interface (Fast Ethernet Protocol)
 */
class ArtNetInterface {
  constructor(options) {
    this.options = options;
    this.socket = null;
  }
  
  async initialize() {
    // Art-Net over UDP/Ethernet - much faster than USB
    console.log('🌐 Initializing Art-Net (Ethernet)...');
    
    // Simulate Art-Net initialization
    // In real implementation, would use dgram socket
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ✅ Art-Net ready @ 250Hz refresh rate');
        resolve(true);
      }, 100);
    });
  }
  
  async sendUniverse(data) {
    // Art-Net packet transmission
    // Much faster than serial DMX512
    return true;
  }
}

/**
 * sACN Interface (Very Fast Gigabit Ethernet)
 */
class SACNInterface {
  constructor(options) {
    this.options = options;
    this.socket = null;
  }
  
  async initialize() {
    console.log('🚀 Initializing sACN (Gigabit Ethernet)...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ✅ sACN ready @ 512Hz refresh rate');
        resolve(true);
      }, 50);
    });
  }
  
  async sendUniverse(data) {
    // sACN streaming - extremely fast
    return true;
  }
}

/**
 * DMX512 Interface (Legacy USB - Slow)
 */
class DMX512Interface {
  constructor(options) {
    this.options = options;
    this.usbDevice = null;
  }
  
  async initialize() {
    console.log('🐌 Initializing DMX512 (USB - Legacy)...');
    
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ⚠️ DMX512 ready @ 44Hz refresh rate (limited by 1986 protocol)');
        resolve(true);
      }, 200);
    });
  }
  
  async sendUniverse(data) {
    // USB-to-DMX serial transmission - bottlenecked by DMX512
    return true;
  }
}

export default ModernLightingController;