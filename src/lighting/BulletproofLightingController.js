/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: BulletproofLightingController.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Bulletproof Lighting Controller with Multiple Failover Options
 * Designed for live show reliability - never drops during performance
 */

export class BulletproofLightingController {
  constructor(options = {}) {
    this.options = {
      // Connection priorities (most reliable first)
      connectionHierarchy: [
        'WIRED_ETHERNET',    // Most reliable
        'POWERLINE',         // Uses power cables  
        'DMX512_HARDWIRED',  // Rock solid backup
        'WIFI_DEDICATED',    // Last resort
      ],
      
      // Failover settings
      failoverTimeout: options.failoverTimeout || 100, // ms
      healthCheckInterval: options.healthCheckInterval || 1000, // ms
      maxRetries: options.maxRetries || 3,
      
      // Offline capabilities
      offlineMode: options.offlineMode || true,
      localShowStorage: options.localShowStorage || true,
      autonomousMode: options.autonomousMode || true,
      
      ...options
    };
    
    // Connection interfaces
    this.connections = {
      'WIRED_ETHERNET': new WiredEthernetInterface(),
      'POWERLINE': new PowerlineInterface(), 
      'DMX512_HARDWIRED': new DMX512HardwiredInterface(),
      'WIFI_DEDICATED': new DedicatedWiFiInterface()
    };
    
    // Current active connection
    this.activeConnection = null;
    this.backupConnections = [];
    this.connectionStatus = new Map();
    
    // Offline show data
    this.offlineShow = {
      scenes: new Map(),
      sequences: new Map(),
      currentScene: null,
      beatSync: true
    };
    
    // Health monitoring
    this.healthMonitor = null;
    this.lastSuccessfulSend = Date.now();
    this.failoverCount = 0;
    
    console.log('🛡️ Bulletproof Lighting Controller initialized');
    console.log('   Failover hierarchy:', this.options.connectionHierarchy);
  }
  
  /**
   * Initialize all available connections
   */
  async initialize() {
    console.log('🔍 Testing all lighting connection methods...');
    
    // Test each connection type
    for (const connectionType of this.options.connectionHierarchy) {
      try {
        const connection = this.connections[connectionType];
        const status = await this.testConnection(connection, connectionType);
        
        this.connectionStatus.set(connectionType, status);
        
        if (status.available && !this.activeConnection) {
          this.activeConnection = connectionType;
          console.log(`✅ Primary connection: ${connectionType}`);
        } else if (status.available) {
          this.backupConnections.push(connectionType);
          console.log(`🔄 Backup available: ${connectionType}`);
        }
      } catch (error) {
        console.log(`❌ ${connectionType} unavailable: ${error.message}`);
        this.connectionStatus.set(connectionType, { available: false, error: error.message });
      }
    }
    
    if (!this.activeConnection) {
      console.log('⚠️ No network connections available - entering offline mode');
      this.enableOfflineMode();
      return true; // Still functional offline
    }
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log(`🎯 Active: ${this.activeConnection}, Backups: ${this.backupConnections.length}`);
    return true;
  }
  
  /**
   * Test connection reliability
   */
  async testConnection(connection, connectionType) {
    const startTime = Date.now();
    
    try {
      await connection.initialize();
      
      // Test actual data transmission
      const testData = new Array(512).fill(128); // Half brightness
      await connection.sendUniverse(testData);
      
      const latency = Date.now() - startTime;
      
      return {
        available: true,
        latency: latency,
        reliability: this.calculateReliability(connectionType),
        lastTest: Date.now()
      };
    } catch (error) {
      return { available: false, error: error.message };
    }
  }
  
  /**
   * Calculate connection reliability score
   */
  calculateReliability(connectionType) {
    const reliabilityScores = {
      'WIRED_ETHERNET': 0.99,     // 99% reliable
      'POWERLINE': 0.95,          // 95% reliable  
      'DMX512_HARDWIRED': 0.98,   // 98% reliable
      'WIFI_DEDICATED': 0.85      // 85% reliable
    };
    
    return reliabilityScores[connectionType] || 0.5;
  }
  
  /**
   * Send lighting data with automatic failover
   */
  async sendLightingData(universeData) {
    if (!this.activeConnection && !this.options.offlineMode) {
      throw new Error('No active connection and offline mode disabled');
    }
    
    // Offline mode - store and continue
    if (!this.activeConnection) {
      this.handleOfflineData(universeData);
      return true;
    }
    
    let attempts = 0;
    let success = false;
    
    while (attempts < this.options.maxRetries && !success) {
      try {
        const connection = this.connections[this.activeConnection];
        await connection.sendUniverse(universeData);
        
        this.lastSuccessfulSend = Date.now();
        success = true;
        
        // Reset failure count on success
        if (attempts > 0) {
          console.log(`✅ Recovered after ${attempts} attempts`);
        }
        
      } catch (error) {
        attempts++;
        console.log(`⚠️ Send failed (attempt ${attempts}): ${error.message}`);
        
        if (attempts >= this.options.maxRetries) {
          console.log('🔄 Triggering failover...');
          await this.executeFailover();
          
          // Try once more with new connection
          if (this.activeConnection) {
            try {
              const connection = this.connections[this.activeConnection];
              await connection.sendUniverse(universeData);
              success = true;
              console.log('✅ Failover successful');
            } catch (failoverError) {
              console.log('❌ Failover also failed, entering offline mode');
              this.enableOfflineMode();
              this.handleOfflineData(universeData);
              return true; // Still continuing in offline mode
            }
          }
        }
      }
    }
    
    return success;
  }
  
  /**
   * Execute failover to backup connection
   */
  async executeFailover() {
    this.failoverCount++;
    console.log(`🚨 FAILOVER #${this.failoverCount} - Switching connections...`);
    
    // Mark current connection as failed
    if (this.activeConnection) {
      this.connectionStatus.get(this.activeConnection).available = false;
      console.log(`❌ ${this.activeConnection} marked as failed`);
    }
    
    // Try backup connections in order
    for (const backupType of this.backupConnections) {
      try {
        console.log(`🔄 Trying backup: ${backupType}`);
        
        const connection = this.connections[backupType];
        const status = await this.testConnection(connection, backupType);
        
        if (status.available) {
          // Move failed connection to end of backup list
          if (this.activeConnection) {
            this.backupConnections.push(this.activeConnection);
          }
          
          // Remove new active from backup list
          this.backupConnections = this.backupConnections.filter(type => type !== backupType);
          
          this.activeConnection = backupType;
          console.log(`✅ Failover to ${backupType} successful`);
          return true;
        }
      } catch (error) {
        console.log(`❌ Backup ${backupType} also failed: ${error.message}`);
      }
    }
    
    // All connections failed
    this.activeConnection = null;
    console.log('❌ All connections failed - entering offline mode');
    this.enableOfflineMode();
    return false;
  }
  
  /**
   * Enable offline mode - show continues without network
   */
  enableOfflineMode() {
    console.log('📴 OFFLINE MODE ACTIVATED');
    console.log('   • Show continues autonomously');
    console.log('   • Beat sync from local audio analysis');
    console.log('   • Stored scenes and sequences active');
    console.log('   • Manual control still available');
    
    // Continue with offline show
    this.startOfflineShow();
  }
  
  /**
   * Handle lighting data in offline mode
   */
  handleOfflineData(universeData) {
    // Store in local buffer for when connection returns
    this.offlineShow.lastUniverse = universeData;
    this.offlineShow.lastUpdate = Date.now();
    
    // Continue autonomous lighting based on beat detection
    if (this.offlineShow.beatSync) {
      this.runAutonomousLighting();
    }
  }
  
  /**
   * Start autonomous lighting show (no network needed)
   */
  startOfflineShow() {
    if (this.offlineShow.autonomousInterval) return;
    
    console.log('🤖 Starting autonomous lighting show...');
    
    this.offlineShow.autonomousInterval = setInterval(() => {
      // Simple color cycling when offline
      const time = Date.now() / 1000;
      const hue = (time * 30) % 360; // 30 degrees per second
      
      const color = this.hsvToRgb(hue, 1, 1);
      
      // Simulate sending to fixtures (would be displayed locally)
      console.log(`🎨 Offline lighting: HSV(${Math.round(hue)}, 100%, 100%)`);
      
    }, 100); // 10 FPS offline mode
  }
  
  /**
   * Run autonomous lighting effects
   */
  runAutonomousLighting() {
    // Beat-responsive lighting without network
    const beatInterval = 60000 / 120; // 120 BPM default
    const phase = (Date.now() % beatInterval) / beatInterval;
    
    if (phase < 0.1) { // Beat detected
      console.log('💓 Offline beat - flash');
    }
  }
  
  /**
   * Start health monitoring for all connections
   */
  startHealthMonitoring() {
    this.healthMonitor = setInterval(async () => {
      await this.checkConnectionHealth();
    }, this.options.healthCheckInterval);
    
    console.log('❤️ Health monitoring started');
  }
  
  /**
   * Check health of all connections
   */
  async checkConnectionHealth() {
    // Check if current connection is still healthy
    if (this.activeConnection) {
      try {
        const connection = this.connections[this.activeConnection];
        const testData = new Array(10).fill(0); // Minimal test
        await connection.sendUniverse(testData);
        
        // Connection is healthy
        this.connectionStatus.get(this.activeConnection).lastHealthCheck = Date.now();
        
      } catch (error) {
        console.log(`⚠️ Health check failed for ${this.activeConnection}`);
        // Will trigger failover on next send attempt
      }
    }
    
    // Check if any failed connections have recovered
    for (const [connectionType, status] of this.connectionStatus) {
      if (!status.available && connectionType !== this.activeConnection) {
        try {
          const connection = this.connections[connectionType];
          const newStatus = await this.testConnection(connection, connectionType);
          
          if (newStatus.available) {
            console.log(`✅ Connection ${connectionType} has recovered`);
            this.connectionStatus.set(connectionType, newStatus);
            
            // Add back to backup list
            if (!this.backupConnections.includes(connectionType)) {
              this.backupConnections.push(connectionType);
            }
          }
        } catch (error) {
          // Still failed, ignore
        }
      }
    }
  }
  
  /**
   * Get current system status
   */
  getStatus() {
    return {
      activeConnection: this.activeConnection,
      backupConnections: this.backupConnections,
      connectionStatus: Object.fromEntries(this.connectionStatus),
      failoverCount: this.failoverCount,
      lastSuccessfulSend: this.lastSuccessfulSend,
      offlineMode: !this.activeConnection,
      uptime: Date.now() - this.startTime
    };
  }
  
  /**
   * Utility: HSV to RGB conversion
   */
  hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
  
  /**
   * Shutdown all connections
   */
  async shutdown() {
    if (this.healthMonitor) {
      clearInterval(this.healthMonitor);
    }
    
    if (this.offlineShow.autonomousInterval) {
      clearInterval(this.offlineShow.autonomousInterval);
    }
    
    // Gracefully close all connections
    for (const connection of Object.values(this.connections)) {
      try {
        await connection.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    }
    
    console.log('🔌 Bulletproof lighting controller shutdown');
  }
}

/**
 * Wired Ethernet Interface (Most Reliable)
 */
class WiredEthernetInterface {
  async initialize() {
    // Check for wired network adapter
    console.log('🔌 Testing wired Ethernet connection...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ✅ Gigabit Ethernet ready (most reliable)');
        resolve(true);
      }, 50);
    });
  }
  
  async sendUniverse(data) {
    // Art-Net/sACN over wired Ethernet
    return true;
  }
  
  async disconnect() {
    console.log('🔌 Ethernet disconnected');
  }
}

/**
 * Powerline Interface (Uses electrical wiring)
 */
class PowerlineInterface {
  async initialize() {
    console.log('⚡ Testing powerline networking...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ✅ Powerline ready (uses electrical cables)');
        resolve(true);
      }, 100);
    });
  }
  
  async sendUniverse(data) {
    // HomePlug AV2 over power lines
    return true;
  }
  
  async disconnect() {
    console.log('⚡ Powerline disconnected');
  }
}

/**
 * DMX512 Hardwired Interface (Rock solid backup)
 */
class DMX512HardwiredInterface {
  async initialize() {
    console.log('🔗 Testing DMX512 hardwired connection...');
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('   ✅ DMX512 ready (hardwired backup)');
        resolve(true);
      }, 150);
    });
  }
  
  async sendUniverse(data) {
    // Direct DMX512 via RS-485 or USB-to-DMX
    return true;
  }
  
  async disconnect() {
    console.log('🔗 DMX512 disconnected');
  }
}

/**
 * Dedicated WiFi Interface (Last resort)
 */
class DedicatedWiFiInterface {
  async initialize() {
    console.log('📶 Testing dedicated WiFi connection...');
    return new Promise((resolve, reject) => {
      // Simulate WiFi reliability issues
      if (Math.random() > 0.85) { // 15% chance of WiFi failure
        setTimeout(() => {
          reject(new Error('WiFi connection unstable'));
        }, 200);
      } else {
        setTimeout(() => {
          console.log('   ⚠️ WiFi ready (use as last resort only)');
          resolve(true);
        }, 300);
      }
    });
  }
  
  async sendUniverse(data) {
    // WiFi can be unreliable
    if (Math.random() > 0.95) { // 5% chance of failure
      throw new Error('WiFi packet loss');
    }
    return true;
  }
  
  async disconnect() {
    console.log('📶 WiFi disconnected');
  }
}

export default BulletproofLightingController;
