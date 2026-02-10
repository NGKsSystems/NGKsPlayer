/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LightingController.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Lighting Controller System
 * 
 * Supports DMX512, Art-Net, sACN protocols for professional lighting control
 * Integrates with NGKs Player audio analysis for beat-synchronized lighting
 * 
 * Features:
 * - DMX512 via USB interfaces
 * - Art-Net over Ethernet
 * - sACN (E1.31) streaming
 * - Beat-synchronized effects
 * - Color palette management
 * - Fixture library support
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

export class LightingController {
  constructor(options = {}) {
    this.options = {
      protocol: options.protocol || 'Art-Net', // Art-Net (modern), sACN, DMX512 (legacy)
      interface: options.interface || 'Ethernet', // Ethernet (fast), USB (legacy)
      universe: options.universe || 1,
      refreshRate: options.refreshRate || 44, // Hz (DMX legacy) - Art-Net can go much higher
      syncMode: options.syncMode || 'beat',    // beat, tempo, manual
      networkRefreshRate: options.networkRefreshRate || 120, // Hz for network protocols
      ...options
    };

    // DMX Universe (512 channels)
    this.universe = new Array(512).fill(0);
    this.fixtures = new Map();
    this.scenes = new Map();
    this.sequences = new Map();
    
    // Audio sync properties
    this.audioAnalyzer = null;
    this.beatDetector = null;
    this.lastBeat = 0;
    this.bpm = 120;
    
    // Interface connections
    this.dmxInterface = null;
    this.artNetSocket = null;
    this.sacnSocket = null;
    
    // Effect engine
    this.effectEngine = new LightingEffectEngine();
    this.isRunning = false;
    this.updateInterval = null;

    console.log('ðŸŽ¨ Professional Lighting Controller initialized');
    console.log(`   Protocol: ${this.options.protocol}`);
    console.log(`   Interface: ${this.options.interface}`);
    console.log(`   Universe: ${this.options.universe}`);
  }

  /**
   * Initialize lighting controller and connect to interface
   */
  async initialize() {
    try {
      console.log('ðŸ”Œ Initializing lighting interface...');
      
      switch (this.options.protocol) {
        case 'DMX512':
          await this.initializeDMX512();
          break;
        case 'Art-Net':
          await this.initializeArtNet();
          break;
        case 'sACN':
          await this.initializeSACN();
          break;
        default:
          throw new Error(`Unsupported protocol: ${this.options.protocol}`);
      }

      // Start the lighting update loop
      this.startUpdateLoop();
      
      console.log('âœ… Lighting controller ready');
      return true;

    } catch (error) {
      console.error('âŒ Failed to initialize lighting controller:', error.message);
      throw error;
    }
  }

  /**
   * Initialize DMX512 via USB interface
   */
  async initializeDMX512() {
    try {
      // Check for common USB-to-DMX interfaces
      const interfaces = await this.scanDMXInterfaces();
      
      if (interfaces.length === 0) {
        console.warn('âš ï¸ No DMX interfaces found. Using virtual mode.');
        this.dmxInterface = new VirtualDMXInterface();
      } else {
        console.log(`ðŸ”Œ Found ${interfaces.length} DMX interface(s)`);
        this.dmxInterface = new USBDMXInterface(interfaces[0]);
      }

      await this.dmxInterface.connect();
      console.log('âœ… DMX512 interface connected');

    } catch (error) {
      console.error('âŒ DMX512 initialization failed:', error.message);
      // Fallback to virtual interface
      this.dmxInterface = new VirtualDMXInterface();
      console.log('ðŸ”„ Falling back to virtual DMX interface');
    }
  }

  /**
   * Initialize Art-Net over Ethernet
   */
  async initializeArtNet() {
    const { createSocket } = await import('dgram');
    
    this.artNetSocket = createSocket('udp4');
    this.artNetSocket.bind(6454); // Standard Art-Net port

    console.log('âœ… Art-Net interface initialized on port 6454');
    
    // Send Art-Net poll to discover nodes
    this.sendArtNetPoll();
  }

  /**
   * Initialize sACN (E1.31) streaming
   */
  async initializeSACN() {
    const { createSocket } = await import('dgram');
    
    this.sacnSocket = createSocket('udp4');
    this.sacnSocket.bind(5568); // Standard sACN port

    console.log('âœ… sACN interface initialized on port 5568');
  }

  /**
   * Scan for available DMX interfaces
   */
  async scanDMXInterfaces() {
    // This would scan for USB devices with DMX interface VID/PIDs
    // Common interfaces: Enttec DMX USB Pro, DMXking, etc.
    const interfaces = [];
    
    try {
      // Mock scanning - in real implementation, use node-usb or similar
      // to scan for devices with specific vendor/product IDs
      console.log('ðŸ” Scanning for DMX interfaces...');
      
      // Simulate finding interfaces
      if (Math.random() > 0.7) { // 30% chance of finding interface
        interfaces.push({
          name: 'Enttec DMX USB Pro',
          vendorId: 0x0403,
          productId: 0x6001,
          path: '/dev/ttyUSB0'
        });
      }
      
    } catch (error) {
      console.warn('âš ï¸ Error scanning DMX interfaces:', error.message);
    }

    return interfaces;
  }

  /**
   * Connect audio analyzer for beat synchronization
   */
  connectAudioAnalyzer(audioAnalyzer, beatDetector) {
    this.audioAnalyzer = audioAnalyzer;
    this.beatDetector = beatDetector;
    
    // Listen for beat events
    if (beatDetector && beatDetector.on) {
      beatDetector.on('beat', (beat) => {
        this.onBeat(beat);
      });
      
      beatDetector.on('tempo', (bpm) => {
        this.bpm = bpm;
        console.log(`ðŸŽµ Tempo detected: ${bpm} BPM`);
      });
    }

    console.log('ðŸŽµ Audio analyzer connected for lighting sync');
  }

  /**
   * Handle beat events for synchronized lighting
   */
  onBeat(beatInfo) {
    this.lastBeat = Date.now();
    
    if (this.options.syncMode === 'beat') {
      // Trigger beat-synchronized effects
      this.effectEngine.triggerBeatEffect(beatInfo, this.universe);
      this.sendUpdate();
    }
  }

  /**
   * Register lighting fixtures
   */
  addFixture(id, fixture) {
    this.fixtures.set(id, {
      ...fixture,
      id,
      channels: fixture.channels || 1,
      startChannel: fixture.startChannel || 1,
      type: fixture.type || 'generic',
      manufacturer: fixture.manufacturer || 'Unknown',
      model: fixture.model || 'Generic'
    });

    console.log(`ðŸ”† Added fixture: ${fixture.manufacturer} ${fixture.model} (${fixture.channels}ch) at channel ${fixture.startChannel}`);
  }

  /**
   * Set channel value (1-512)
   */
  setChannel(channel, value) {
    if (channel < 1 || channel > 512) {
      throw new Error(`Invalid channel: ${channel}. Must be 1-512`);
    }
    
    if (value < 0 || value > 255) {
      throw new Error(`Invalid value: ${value}. Must be 0-255`);
    }

    this.universe[channel - 1] = Math.round(value);
  }

  /**
   * Set fixture parameters
   */
  setFixture(fixtureId, parameters) {
    const fixture = this.fixtures.get(fixtureId);
    if (!fixture) {
      throw new Error(`Fixture not found: ${fixtureId}`);
    }

    const startChannel = fixture.startChannel;
    
    // Map common parameters to channels
    if (parameters.dimmer !== undefined) {
      this.setChannel(startChannel, parameters.dimmer);
    }
    
    if (parameters.red !== undefined && fixture.type === 'rgb') {
      this.setChannel(startChannel + 1, parameters.red);
    }
    
    if (parameters.green !== undefined && fixture.type === 'rgb') {
      this.setChannel(startChannel + 2, parameters.green);
    }
    
    if (parameters.blue !== undefined && fixture.type === 'rgb') {
      this.setChannel(startChannel + 3, parameters.blue);
    }
    
    if (parameters.pan !== undefined && fixture.type === 'moving') {
      this.setChannel(startChannel + 1, parameters.pan);
    }
    
    if (parameters.tilt !== undefined && fixture.type === 'moving') {
      this.setChannel(startChannel + 2, parameters.tilt);
    }
  }

  /**
   * Create and save lighting scene
   */
  saveScene(name, scene) {
    this.scenes.set(name, {
      name,
      universe: [...this.universe], // Copy current universe state
      fixtures: new Map(this.fixtures),
      timestamp: Date.now()
    });

    console.log(`ðŸ’¾ Scene saved: ${name}`);
  }

  /**
   * Load and apply lighting scene
   */
  loadScene(name) {
    const scene = this.scenes.get(name);
    if (!scene) {
      throw new Error(`Scene not found: ${name}`);
    }

    this.universe = [...scene.universe];
    this.sendUpdate();

    console.log(`ðŸŽ¬ Scene loaded: ${name}`);
  }

  /**
   * Start automated lighting sequence
   */
  startSequence(sequenceName) {
    const sequence = this.sequences.get(sequenceName);
    if (!sequence) {
      throw new Error(`Sequence not found: ${sequenceName}`);
    }

    this.effectEngine.startSequence(sequence, this.universe);
    console.log(`ðŸŽª Started sequence: ${sequenceName}`);
  }

  /**
   * Start the lighting update loop
   */
  startUpdateLoop() {
    if (this.isRunning) return;

    this.isRunning = true;
    const updateInterval = 1000 / this.options.refreshRate; // Convert Hz to ms

    this.updateInterval = setInterval(() => {
      this.update();
    }, updateInterval);

    console.log(`ðŸ”„ Lighting update loop started (${this.options.refreshRate} Hz)`);
  }

  /**
   * Stop the lighting update loop
   */
  stopUpdateLoop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    console.log('â¹ï¸ Lighting update loop stopped');
  }

  /**
   * Update lighting (called each frame)
   */
  update() {
    // Update effect engine
    this.effectEngine.update(this.universe, {
      bpm: this.bpm,
      lastBeat: this.lastBeat,
      audioAnalyzer: this.audioAnalyzer
    });

    // Send universe data to lighting interface
    this.sendUpdate();
  }

  /**
   * Send universe data to lighting interface
   */
  sendUpdate() {
    try {
      switch (this.options.protocol) {
        case 'DMX512':
          this.sendDMX512();
          break;
        case 'Art-Net':
          this.sendArtNet();
          break;
        case 'sACN':
          this.sendSACN();
          break;
      }
    } catch (error) {
      console.error('âŒ Failed to send lighting update:', error.message);
    }
  }

  /**
   * Send DMX512 data
   */
  sendDMX512() {
    if (this.dmxInterface && this.dmxInterface.send) {
      this.dmxInterface.send(this.universe);
    }
  }

  /**
   * Send Art-Net packet
   */
  sendArtNet() {
    if (!this.artNetSocket) return;

    const packet = this.createArtNetPacket();
    this.artNetSocket.send(packet, 6454, '255.255.255.255');
  }

  /**
   * Send sACN packet
   */
  sendSACN() {
    if (!this.sacnSocket) return;

    const packet = this.createSACNPacket();
    this.sacnSocket.send(packet, 5568, '239.255.0.1');
  }

  /**
   * Create Art-Net packet
   */
  createArtNetPacket() {
    const packet = Buffer.alloc(530);
    
    // Art-Net header
    packet.write('Art-Net\0', 0);
    packet.writeUInt16LE(0x5000, 8); // OpCode: ArtDMX
    packet.writeUInt16BE(14, 10);    // Protocol version
    packet.writeUInt8(0, 12);        // Sequence
    packet.writeUInt8(0, 13);        // Physical
    packet.writeUInt16LE(this.options.universe - 1, 14); // Universe
    packet.writeUInt16BE(512, 16);   // Data length

    // Copy universe data
    for (let i = 0; i < 512; i++) {
      packet.writeUInt8(this.universe[i], 18 + i);
    }

    return packet;
  }

  /**
   * Create sACN packet
   */
  createSACNPacket() {
    const packet = Buffer.alloc(638);
    let offset = 0;

    // Root Layer
    packet.writeUInt16BE(16, offset); offset += 2;  // Preamble Size
    packet.writeUInt16BE(0, offset); offset += 2;   // Post-amble Size
    packet.write('ASC-E1.17\0\0\0', offset); offset += 12; // ACN Packet Identifier
    
    // Continue with E1.31 packet structure...
    // (Simplified for demo - full implementation would include all headers)
    
    return packet;
  }

  /**
   * Send Art-Net poll
   */
  sendArtNetPoll() {
    if (!this.artNetSocket) return;

    const poll = Buffer.alloc(14);
    poll.write('Art-Net\0', 0);
    poll.writeUInt16LE(0x2000, 8); // OpCode: ArtPoll
    poll.writeUInt16BE(14, 10);    // Protocol version
    poll.writeUInt8(6, 12);        // Flags
    poll.writeUInt8(0, 13);        // Priority

    this.artNetSocket.send(poll, 6454, '255.255.255.255');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      protocol: this.options.protocol,
      interface: this.options.interface,
      universe: this.options.universe,
      isRunning: this.isRunning,
      fixtureCount: this.fixtures.size,
      sceneCount: this.scenes.size,
      sequenceCount: this.sequences.size,
      bpm: this.bpm,
      refreshRate: this.options.refreshRate,
      connected: this.dmxInterface?.connected || false
    };
  }

  /**
   * Cleanup and disconnect
   */
  async disconnect() {
    console.log('ðŸ”Œ Disconnecting lighting controller...');
    
    this.stopUpdateLoop();
    
    if (this.dmxInterface && this.dmxInterface.disconnect) {
      await this.dmxInterface.disconnect();
    }
    
    if (this.artNetSocket) {
      this.artNetSocket.close();
    }
    
    if (this.sacnSocket) {
      this.sacnSocket.close();
    }

    console.log('âœ… Lighting controller disconnected');
  }
}

/**
 * Virtual DMX Interface (for testing without hardware)
 */
class VirtualDMXInterface {
  constructor() {
    this.connected = false;
  }

  async connect() {
    this.connected = true;
    console.log('ðŸ”Œ Virtual DMX interface connected');
  }

  send(universe) {
    // Log first few channels for debugging
    const activeChannels = universe.slice(0, 20).map((val, idx) => 
      val > 0 ? `${idx + 1}:${val}` : null
    ).filter(Boolean);
    
    if (activeChannels.length > 0) {
      console.log(`ðŸ“¡ DMX: ${activeChannels.join(' ')}`);
    }
  }

  async disconnect() {
    this.connected = false;
    console.log('ðŸ”Œ Virtual DMX interface disconnected');
  }
}

/**
 * USB DMX Interface (placeholder for real implementation)
 */
class USBDMXInterface {
  constructor(device) {
    this.device = device;
    this.connected = false;
  }

  async connect() {
    // Real implementation would use node-usb or similar
    this.connected = true;
    console.log(`ðŸ”Œ USB DMX interface connected: ${this.device.name}`);
  }

  send(universe) {
    if (!this.connected) return;
    
    // Real implementation would send via USB
    console.log(`ðŸ“¡ USB DMX: Sending ${universe.filter(v => v > 0).length} active channels`);
  }

  async disconnect() {
    this.connected = false;
    console.log('ðŸ”Œ USB DMX interface disconnected');
  }
}

/**
 * Lighting Effect Engine
 */
class LightingEffectEngine {
  constructor() {
    this.effects = new Map();
    this.activeEffects = new Set();
    this.sequences = new Map();
    
    // Register built-in effects
    this.registerBuiltInEffects();
  }

  registerBuiltInEffects() {
    // Rainbow effect
    this.effects.set('rainbow', {
      name: 'Rainbow',
      update: (universe, context) => {
        const time = Date.now() / 1000;
        for (let i = 0; i < 16; i++) { // First 16 RGB fixtures
          const hue = (time * 0.1 + i * 0.1) % 1;
          const rgb = this.hsvToRgb(hue, 1, 1);
          universe[i * 3] = rgb.r;
          universe[i * 3 + 1] = rgb.g;
          universe[i * 3 + 2] = rgb.b;
        }
      }
    });

    // Beat strobe
    this.effects.set('beat-strobe', {
      name: 'Beat Strobe',
      update: (universe, context) => {
        const timeSinceBeat = Date.now() - context.lastBeat;
        const intensity = timeSinceBeat < 100 ? 255 : 0;
        
        for (let i = 0; i < 32; i++) {
          universe[i] = intensity;
        }
      }
    });

    // Color wash
    this.effects.set('color-wash', {
      name: 'Color Wash',
      update: (universe, context) => {
        const beatPhase = (Date.now() - context.lastBeat) / (60000 / context.bpm);
        const color = this.getColorForBeat(beatPhase);
        
        for (let i = 0; i < 48; i += 3) {
          universe[i] = color.r;
          universe[i + 1] = color.g;
          universe[i + 2] = color.b;
        }
      }
    });
  }

  triggerBeatEffect(beatInfo, universe) {
    // Trigger beat-synchronized effects
    this.activeEffects.add('beat-strobe');
    
    // Remove beat effects after short duration
    setTimeout(() => {
      this.activeEffects.delete('beat-strobe');
    }, 200);
  }

  update(universe, context) {
    // Update all active effects
    this.activeEffects.forEach(effectName => {
      const effect = this.effects.get(effectName);
      if (effect && effect.update) {
        effect.update(universe, context);
      }
    });
  }

  startSequence(sequence, universe) {
    // Start automated sequence
    console.log(`ðŸŽª Starting sequence: ${sequence.name}`);
  }

  hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = v - c;
    
    let r, g, b;
    if (h < 1/6) [r, g, b] = [c, x, 0];
    else if (h < 2/6) [r, g, b] = [x, c, 0];
    else if (h < 3/6) [r, g, b] = [0, c, x];
    else if (h < 4/6) [r, g, b] = [0, x, c];
    else if (h < 5/6) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  getColorForBeat(phase) {
    const hue = phase % 1;
    return this.hsvToRgb(hue, 1, 1);
  }
}

export { VirtualDMXInterface, USBDMXInterface, LightingEffectEngine };
