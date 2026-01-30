/**
 * Professional Audio Routing Engine
 * Provides advanced signal routing capabilities including patch bay interface,
 * modular signal chains, parallel processing, and side-chain routing
 */

export class AudioConnection {
  constructor(source, destination, type = 'audio', gain = 1.0) {
    this.id = this.generateId();
    this.source = source;        // Source node/port
    this.destination = destination; // Destination node/port
    this.type = type;            // 'audio', 'sidechain', 'control'
    this.gain = gain;            // Connection gain
    this.enabled = true;
    this.color = this.generateColor();
    this.created = Date.now();
    this.gainNode = null;        // Web Audio GainNode for this connection
  }

  generateId() {
    return 'conn_' + Math.random().toString(36).substr(2, 9);
  }

  generateColor() {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
      '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  setGain(gain) {
    this.gain = Math.max(0, Math.min(2, gain));
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.gain, this.gainNode.context.currentTime);
    }
  }

  enable() {
    this.enabled = true;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(this.gain, this.gainNode.context.currentTime);
    }
  }

  disable() {
    this.enabled = false;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(0, this.gainNode.context.currentTime);
    }
  }
}

export class AudioPort {
  constructor(id, name, type, direction, nodeRef = null) {
    this.id = id;
    this.name = name;           // Display name
    this.type = type;           // 'audio', 'sidechain', 'control'
    this.direction = direction; // 'input', 'output'
    this.nodeRef = nodeRef;     // Reference to Web Audio node
    this.connections = new Set(); // Connected AudioConnection objects
    this.position = { x: 0, y: 0 }; // Visual position
    this.color = this.getTypeColor();
  }

  getTypeColor() {
    const colors = {
      audio: '#4CAF50',
      sidechain: '#FF9800',
      control: '#2196F3'
    };
    return colors[this.type] || '#666';
  }

  addConnection(connection) {
    this.connections.add(connection);
  }

  removeConnection(connection) {
    this.connections.delete(connection);
  }

  getConnections() {
    return Array.from(this.connections);
  }

  canConnectTo(targetPort) {
    // Basic connection rules
    if (this.direction === targetPort.direction) return false; // Can't connect same direction
    if (this.direction === 'input') return false; // This should be output to connect
    if (targetPort.direction === 'output') return false; // Target should be input
    
    // Type compatibility
    if (this.type === 'audio' && targetPort.type === 'audio') return true;
    if (this.type === 'audio' && targetPort.type === 'sidechain') return true;
    if (this.type === 'control' && targetPort.type === 'control') return true;
    
    return false;
  }
}

export class AudioModule {
  constructor(id, name, type, audioContext) {
    this.id = id;
    this.name = name;
    this.type = type;           // 'effect', 'mixer', 'generator', 'analyzer'
    this.audioContext = audioContext;
    this.ports = new Map();     // Map of port ID to AudioPort
    this.position = { x: 0, y: 0 }; // Visual position in patch bay
    this.size = { width: 120, height: 80 }; // Visual size
    this.enabled = true;
    this.bypassed = false;
    this.parameters = new Map(); // Module parameters
    this.audioNode = null;      // Main Web Audio node
    this.created = Date.now();
  }

  addPort(port) {
    this.ports.set(port.id, port);
    return port;
  }

  removePort(portId) {
    const port = this.ports.get(portId);
    if (port) {
      // Disconnect all connections to this port
      port.getConnections().forEach(conn => {
        this.removeConnection(conn);
      });
      this.ports.delete(portId);
    }
  }

  getPort(portId) {
    return this.ports.get(portId);
  }

  getAllPorts(direction = null, type = null) {
    let ports = Array.from(this.ports.values());
    if (direction) ports = ports.filter(p => p.direction === direction);
    if (type) ports = ports.filter(p => p.type === type);
    return ports;
  }

  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;
  }

  setParameter(name, value) {
    this.parameters.set(name, value);
    this.onParameterChange(name, value);
  }

  getParameter(name) {
    return this.parameters.get(name);
  }

  // Override in subclasses
  onParameterChange(name, value) {
    // Handle parameter changes
  }

  // Override in subclasses
  process(inputs, outputs, parameters) {
    // Process audio
    return true;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  bypass() {
    this.bypassed = true;
  }

  unbypass() {
    this.bypassed = false;
  }
}

export class RoutingEngine {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.modules = new Map();        // Map of module ID to AudioModule
    this.connections = new Map();    // Map of connection ID to AudioConnection
    this.signalChains = new Map();   // Map of chain ID to signal chain
    this.listeners = new Set();
    this.nextModuleId = 1;
    this.nextChainId = 1;

    // Performance monitoring
    this.stats = {
      moduleCount: 0,
      connectionCount: 0,
      averageLatency: 0,
      cpuUsage: 0
    };
  }

  // Module management
  addModule(module) {
    this.modules.set(module.id, module);
    this.stats.moduleCount = this.modules.size;
    this.notifyListeners('moduleAdded', { module });
    return module;
  }

  removeModule(moduleId) {
    const module = this.modules.get(moduleId);
    if (!module) return false;

    // Remove all connections to/from this module
    const connectionsToRemove = [];
    this.connections.forEach((conn, connId) => {
      if (conn.source.moduleId === moduleId || conn.destination.moduleId === moduleId) {
        connectionsToRemove.push(connId);
      }
    });

    connectionsToRemove.forEach(connId => this.removeConnection(connId));

    this.modules.delete(moduleId);
    this.stats.moduleCount = this.modules.size;
    this.notifyListeners('moduleRemoved', { moduleId, module });
    return true;
  }

  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  getAllModules(type = null) {
    let modules = Array.from(this.modules.values());
    if (type) modules = modules.filter(m => m.type === type);
    return modules;
  }

  // Connection management
  createConnection(sourceModuleId, sourcePortId, destModuleId, destPortId, type = 'audio') {
    const sourceModule = this.modules.get(sourceModuleId);
    const destModule = this.modules.get(destModuleId);
    
    if (!sourceModule || !destModule) {
      console.error('Invalid modules for connection');
      return null;
    }

    const sourcePort = sourceModule.getPort(sourcePortId);
    const destPort = destModule.getPort(destPortId);

    if (!sourcePort || !destPort) {
      console.error('Invalid ports for connection');
      return null;
    }

    if (!sourcePort.canConnectTo(destPort)) {
      console.error('Incompatible ports for connection');
      return null;
    }

    // Check for existing connection
    const existingConn = this.findConnection(sourceModuleId, sourcePortId, destModuleId, destPortId);
    if (existingConn) {
      console.warn('Connection already exists');
      return existingConn;
    }

    // Create Web Audio connection
    const connection = new AudioConnection(
      { moduleId: sourceModuleId, portId: sourcePortId },
      { moduleId: destModuleId, portId: destPortId },
      type
    );

    // Create gain node for connection control
    connection.gainNode = this.audioContext.createGain();
    connection.gainNode.gain.setValueAtTime(connection.gain, this.audioContext.currentTime);

    // Connect Web Audio nodes
    try {
      if (sourcePort.nodeRef && destPort.nodeRef) {
        sourcePort.nodeRef.connect(connection.gainNode);
        connection.gainNode.connect(destPort.nodeRef);
      }
    } catch (error) {
      console.error('Failed to connect Web Audio nodes:', error);
      return null;
    }

    // Register connection
    this.connections.set(connection.id, connection);
    sourcePort.addConnection(connection);
    destPort.addConnection(connection);

    this.stats.connectionCount = this.connections.size;
    this.notifyListeners('connectionCreated', { connection });
    return connection;
  }

  removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return false;

    // Disconnect Web Audio nodes
    if (connection.gainNode) {
      try {
        connection.gainNode.disconnect();
        // Find source node and disconnect
        const sourceModule = this.modules.get(connection.source.moduleId);
        const sourcePort = sourceModule?.getPort(connection.source.portId);
        if (sourcePort?.nodeRef) {
          sourcePort.nodeRef.disconnect(connection.gainNode);
        }
      } catch (error) {
        console.warn('Error disconnecting Web Audio nodes:', error);
      }
    }

    // Remove from ports
    const sourceModule = this.modules.get(connection.source.moduleId);
    const destModule = this.modules.get(connection.destination.moduleId);
    
    if (sourceModule) {
      const sourcePort = sourceModule.getPort(connection.source.portId);
      sourcePort?.removeConnection(connection);
    }

    if (destModule) {
      const destPort = destModule.getPort(connection.destination.portId);
      destPort?.removeConnection(connection);
    }

    this.connections.delete(connectionId);
    this.stats.connectionCount = this.connections.size;
    this.notifyListeners('connectionRemoved', { connectionId, connection });
    return true;
  }

  findConnection(sourceModuleId, sourcePortId, destModuleId, destPortId) {
    for (const connection of this.connections.values()) {
      if (connection.source.moduleId === sourceModuleId &&
          connection.source.portId === sourcePortId &&
          connection.destination.moduleId === destModuleId &&
          connection.destination.portId === destPortId) {
        return connection;
      }
    }
    return null;
  }

  getAllConnections() {
    return Array.from(this.connections.values());
  }

  // Signal chain management
  createSignalChain(name, moduleIds = []) {
    const chainId = `chain_${this.nextChainId++}`;
    const chain = {
      id: chainId,
      name: name,
      modules: [...moduleIds],
      connections: [],
      enabled: true,
      parallel: false,
      created: Date.now()
    };

    this.signalChains.set(chainId, chain);
    this.notifyListeners('signalChainCreated', { chain });
    return chain;
  }

  addModuleToChain(chainId, moduleId, position = -1) {
    const chain = this.signalChains.get(chainId);
    if (!chain) return false;

    if (position === -1) {
      chain.modules.push(moduleId);
    } else {
      chain.modules.splice(position, 0, moduleId);
    }

    this.notifyListeners('signalChainModified', { chain });
    return true;
  }

  removeModuleFromChain(chainId, moduleId) {
    const chain = this.signalChains.get(chainId);
    if (!chain) return false;

    const index = chain.modules.indexOf(moduleId);
    if (index > -1) {
      chain.modules.splice(index, 1);
      this.notifyListeners('signalChainModified', { chain });
      return true;
    }
    return false;
  }

  autoConnectChain(chainId) {
    const chain = this.signalChains.get(chainId);
    if (!chain || chain.modules.length < 2) return false;

    // Automatically connect modules in series
    for (let i = 0; i < chain.modules.length - 1; i++) {
      const currentModule = this.modules.get(chain.modules[i]);
      const nextModule = this.modules.get(chain.modules[i + 1]);

      if (currentModule && nextModule) {
        const outputPort = currentModule.getAllPorts('output', 'audio')[0];
        const inputPort = nextModule.getAllPorts('input', 'audio')[0];

        if (outputPort && inputPort) {
          const connection = this.createConnection(
            currentModule.id, outputPort.id,
            nextModule.id, inputPort.id
          );
          if (connection) {
            chain.connections.push(connection.id);
          }
        }
      }
    }

    this.notifyListeners('signalChainConnected', { chain });
    return true;
  }

  // Parallel processing
  createParallelChain(name, inputModuleId, outputModuleId, parallelModuleIds) {
    const chainId = this.createSignalChain(name, [inputModuleId, ...parallelModuleIds, outputModuleId]);
    const chain = this.signalChains.get(chainId);
    chain.parallel = true;

    // Connect input to all parallel modules
    const inputModule = this.modules.get(inputModuleId);
    const outputModule = this.modules.get(outputModuleId);

    if (inputModule && outputModule) {
      const inputOutputPort = inputModule.getAllPorts('output', 'audio')[0];
      const outputInputPort = outputModule.getAllPorts('input', 'audio')[0];

      // Connect input to each parallel module and each parallel module to output
      parallelModuleIds.forEach(moduleId => {
        const parallelModule = this.modules.get(moduleId);
        if (parallelModule) {
          const parallelInputPort = parallelModule.getAllPorts('input', 'audio')[0];
          const parallelOutputPort = parallelModule.getAllPorts('output', 'audio')[0];

          if (inputOutputPort && parallelInputPort) {
            this.createConnection(inputModule.id, inputOutputPort.id, parallelModule.id, parallelInputPort.id);
          }
          if (parallelOutputPort && outputInputPort) {
            this.createConnection(parallelModule.id, parallelOutputPort.id, outputModule.id, outputInputPort.id);
          }
        }
      });
    }

    return chain;
  }

  // Side-chain routing
  createSidechainConnection(sourceModuleId, destModuleId, sidechainParam = 'sidechain') {
    const sourceModule = this.modules.get(sourceModuleId);
    const destModule = this.modules.get(destModuleId);

    if (!sourceModule || !destModule) return null;

    const sourcePort = sourceModule.getAllPorts('output', 'audio')[0];
    const destSidechainPort = destModule.getAllPorts('input', 'sidechain')[0];

    if (sourcePort && destSidechainPort) {
      return this.createConnection(
        sourceModule.id, sourcePort.id,
        destModule.id, destSidechainPort.id,
        'sidechain'
      );
    }

    return null;
  }

  // Utility methods
  getRoutingMatrix() {
    const matrix = {
      modules: Array.from(this.modules.values()),
      connections: Array.from(this.connections.values()),
      chains: Array.from(this.signalChains.values())
    };
    return matrix;
  }

  exportRouting() {
    return {
      version: '1.0',
      modules: Array.from(this.modules.values()).map(module => ({
        id: module.id,
        name: module.name,
        type: module.type,
        position: module.position,
        parameters: Object.fromEntries(module.parameters),
        enabled: module.enabled,
        bypassed: module.bypassed
      })),
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        source: conn.source,
        destination: conn.destination,
        type: conn.type,
        gain: conn.gain,
        enabled: conn.enabled,
        color: conn.color
      })),
      signalChains: Array.from(this.signalChains.values())
    };
  }

  importRouting(data) {
    try {
      // Clear existing routing
      this.clearAll();

      // Import modules (would need specific module factories)
      // Import connections
      data.connections.forEach(connData => {
        // Recreate connections based on data
        // This would need to be implemented based on specific module types
      });

      // Import signal chains
      data.signalChains.forEach(chainData => {
        this.signalChains.set(chainData.id, chainData);
      });

      this.notifyListeners('routingImported', { data });
      return true;
    } catch (error) {
      console.error('Failed to import routing:', error);
      return false;
    }
  }

  clearAll() {
    // Disconnect all Web Audio connections
    this.connections.forEach((conn, connId) => {
      this.removeConnection(connId);
    });

    // Clear all data structures
    this.modules.clear();
    this.connections.clear();
    this.signalChains.clear();

    // Reset stats
    this.stats = {
      moduleCount: 0,
      connectionCount: 0,
      averageLatency: 0,
      cpuUsage: 0
    };

    this.notifyListeners('routingCleared');
  }

  // Performance monitoring
  updateStats() {
    this.stats.moduleCount = this.modules.size;
    this.stats.connectionCount = this.connections.size;
    // CPU usage would be calculated from Web Audio performance metrics
    // Latency would be calculated from buffer sizes and processing time
  }

  getStats() {
    this.updateStats();
    return { ...this.stats };
  }

  // Event system
  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data = {}) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Routing listener error:', error);
      }
    });
  }
}

// Global routing engine instance
export const routingEngine = new RoutingEngine();