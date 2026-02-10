/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: RoutingControlPanel.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Routing Control Panel
 * Provides interface for managing audio modules, connections, and signal chains
 */

import React, { useState, useEffect, useCallback } from 'react';
import { routingEngine } from '../audio/RoutingEngine';
import { ModuleFactory } from '../audio/AudioModules';

const RoutingControlPanel = ({ 
  audioContext,
  onModuleCreate,
  onModuleSelect,
  selectedModule,
  className = ""
}) => {
  const [modules, setModules] = useState([]);
  const [connections, setConnections] = useState([]);
  const [signalChains, setSignalChains] = useState([]);
  const [stats, setStats] = useState({});
  const [showModuleLibrary, setShowModuleLibrary] = useState(false);
  const [showChainBuilder, setShowChainBuilder] = useState(false);
  const [selectedModules, setSelectedModules] = useState(new Set());

  // Update state when routing changes
  useEffect(() => {
    const updateRouting = () => {
      setModules(routingEngine.getAllModules());
      setConnections(routingEngine.getAllConnections());
      setSignalChains(Array.from(routingEngine.signalChains.values()));
      setStats(routingEngine.getStats());
    };

    updateRouting();
    routingEngine.addListener(updateRouting);
    return () => routingEngine.removeListener(updateRouting);
  }, []);

  // Module creation
  const createModule = useCallback((type, subtype) => {
    if (!audioContext) {
      console.error('No audio context available');
      return;
    }

    try {
      const module = ModuleFactory.createModule(type, subtype, audioContext);
      
      // Position module in a grid layout
      const gridSize = 150;
      const cols = Math.floor(1200 / gridSize);
      const moduleCount = modules.length;
      module.setPosition(
        (moduleCount % cols) * gridSize + 50,
        Math.floor(moduleCount / cols) * gridSize + 50
      );

      routingEngine.addModule(module);
      
      if (onModuleCreate) {
        onModuleCreate(module);
      }

      setShowModuleLibrary(false);
    } catch (error) {
      console.error('Failed to create module:', error);
    }
  }, [audioContext, modules.length, onModuleCreate]);

  // Module selection
  const toggleModuleSelection = useCallback((moduleId) => {
    setSelectedModules(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(moduleId)) {
        newSelection.delete(moduleId);
      } else {
        newSelection.add(moduleId);
      }
      return newSelection;
    });
  }, []);

  const selectAllModules = useCallback(() => {
    setSelectedModules(new Set(modules.map(m => m.id)));
  }, [modules]);

  const clearSelection = useCallback(() => {
    setSelectedModules(new Set());
  }, []);

  // Signal chain management
  const createSignalChain = useCallback(() => {
    const name = prompt('Signal chain name:');
    if (name && selectedModules.size > 0) {
      const chain = routingEngine.createSignalChain(name, Array.from(selectedModules));
      routingEngine.autoConnectChain(chain.id);
    }
  }, [selectedModules]);

  const createParallelChain = useCallback(() => {
    const selectedArray = Array.from(selectedModules);
    if (selectedArray.length < 3) {
      alert('Select at least 3 modules: input, parallel modules, and output');
      return;
    }

    const name = prompt('Parallel chain name:');
    if (name) {
      const inputModule = selectedArray[0];
      const outputModule = selectedArray[selectedArray.length - 1];
      const parallelModules = selectedArray.slice(1, -1);
      
      routingEngine.createParallelChain(name, inputModule, outputModule, parallelModules);
    }
  }, [selectedModules]);

  // Connection management
  const removeConnection = useCallback((connectionId) => {
    if (confirm('Remove this connection?')) {
      routingEngine.removeConnection(connectionId);
    }
  }, []);

  const adjustConnectionGain = useCallback((connectionId, gain) => {
    const connection = routingEngine.connections.get(connectionId);
    if (connection) {
      connection.setGain(gain);
    }
  }, []);

  // Module parameter controls
  const updateModuleParameter = useCallback((moduleId, paramName, value) => {
    const module = routingEngine.getModule(moduleId);
    if (module) {
      module.setParameter(paramName, value);
    }
  }, []);

  // Utility functions
  const exportRouting = useCallback(() => {
    const data = routingEngine.exportRouting();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'routing_configuration.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const clearAll = useCallback(() => {
    if (confirm('Clear all modules and connections? This cannot be undone.')) {
      routingEngine.clearAll();
    }
  }, []);

  // Module Library Component
  const ModuleLibrary = () => {
    const availableModules = ModuleFactory.getAvailableModules();

    return (
      <div className="module-library bg-gray-800 rounded p-4">
        <h4 className="font-bold text-white mb-3">Module Library</h4>
        
        {Object.entries(availableModules).map(([category, types]) => (
          <div key={category} className="mb-4">
            <h5 className="font-medium text-gray-300 mb-2 capitalize">{category}</h5>
            <div className="grid grid-cols-2 gap-2">
              {types.map(type => (
                <button
                  key={type}
                  onClick={() => createModule(category, type)}
                  className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-white transition-colors"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Module Parameter Editor
  const ModuleParameterEditor = ({ module }) => {
    if (!module) return null;

    return (
      <div className="module-parameters bg-gray-800 rounded p-4">
        <h4 className="font-bold text-white mb-3">{module.name} Parameters</h4>
        
        <div className="space-y-3">
          {Array.from(module.parameters.entries()).map(([name, value]) => (
            <div key={name} className="flex items-center justify-between">
              <label className="text-sm text-gray-300 capitalize">
                {name.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              
              {typeof value === 'boolean' ? (
                <button
                  onClick={() => updateModuleParameter(module.id, name, !value)}
                  className={`px-3 py-1 rounded text-sm ${
                    value ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {value ? 'On' : 'Off'}
                </button>
              ) : typeof value === 'number' ? (
                <input
                  type="range"
                  min={name.includes('frequency') ? 20 : 0}
                  max={name.includes('frequency') ? 20000 : name.includes('Q') ? 30 : 1}
                  step={name.includes('frequency') ? 1 : 0.01}
                  value={value}
                  onChange={(e) => updateModuleParameter(module.id, name, parseFloat(e.target.value))}
                  className="w-24"
                />
              ) : (
                <select
                  value={value}
                  onChange={(e) => updateModuleParameter(module.id, name, e.target.value)}
                  className="px-2 py-1 bg-gray-700 rounded text-sm"
                >
                  {name === 'waveform' && ['sine', 'square', 'sawtooth', 'triangle'].map(wave => (
                    <option key={wave} value={wave}>{wave}</option>
                  ))}
                  {name === 'type' && ['lowpass', 'highpass', 'bandpass', 'notch'].map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              )}
              
              <span className="text-xs text-gray-400 w-16 text-right">
                {typeof value === 'number' ? value.toFixed(2) : value.toString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`routing-control-panel bg-gray-900 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Routing Control</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowModuleLibrary(!showModuleLibrary)}
            className="px-3 py-1 bg-blue-600 rounded text-sm"
          >
            Add Module
          </button>
          <button
            onClick={() => setShowChainBuilder(!showChainBuilder)}
            className="px-3 py-1 bg-green-600 rounded text-sm"
          >
            Chains
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-4 p-3 bg-gray-800 rounded">
        <div className="text-center">
          <div className="text-lg font-bold text-white">{stats.moduleCount || 0}</div>
          <div className="text-xs text-gray-400">Modules</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">{stats.connectionCount || 0}</div>
          <div className="text-xs text-gray-400">Connections</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">{signalChains.length}</div>
          <div className="text-xs text-gray-400">Chains</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white">{(stats.cpuUsage || 0).toFixed(1)}%</div>
          <div className="text-xs text-gray-400">CPU</div>
        </div>
      </div>

      {/* Module Library */}
      {showModuleLibrary && <ModuleLibrary />}

      {/* Chain Builder */}
      {showChainBuilder && (
        <div className="chain-builder bg-gray-800 rounded p-4 mb-4">
          <h4 className="font-bold text-white mb-3">Signal Chain Builder</h4>
          
          <div className="flex gap-2 mb-3">
            <button
              onClick={createSignalChain}
              disabled={selectedModules.size < 2}
              className="px-3 py-1 bg-green-600 rounded text-sm disabled:bg-gray-600"
            >
              Create Series Chain
            </button>
            <button
              onClick={createParallelChain}
              disabled={selectedModules.size < 3}
              className="px-3 py-1 bg-yellow-600 rounded text-sm disabled:bg-gray-600"
            >
              Create Parallel Chain
            </button>
          </div>

          <div className="text-sm text-gray-400 mb-3">
            Selected: {selectedModules.size} modules
          </div>

          {signalChains.map(chain => (
            <div key={chain.id} className="p-2 bg-gray-700 rounded mb-2">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{chain.name}</span>
                <span className="text-xs text-gray-400">
                  {chain.modules.length} modules • {chain.parallel ? 'Parallel' : 'Series'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Module List */}
      <div className="module-list mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-white">Modules</h4>
          <div className="flex gap-1">
            <button
              onClick={selectAllModules}
              className="px-2 py-1 bg-gray-600 rounded text-xs"
            >
              All
            </button>
            <button
              onClick={clearSelection}
              className="px-2 py-1 bg-gray-600 rounded text-xs"
            >
              None
            </button>
          </div>
        </div>

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {modules.map(module => (
            <div
              key={module.id}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                selectedModules.has(module.id) ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              onClick={() => {
                toggleModuleSelection(module.id);
                if (onModuleSelect) onModuleSelect(module);
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: module.enabled ? '#4CAF50' : '#666' }}
                />
                <span className="text-sm text-white">{module.name}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{module.type}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    module.enabled ? module.disable() : module.enable();
                    setModules([...modules]); // Force re-render
                  }}
                  className={`w-6 h-6 rounded text-xs ${
                    module.enabled ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {module.enabled ? '●' : '○'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Module Parameters */}
      {selectedModule && (
        <ModuleParameterEditor module={selectedModule} />
      )}

      {/* Connection List */}
      <div className="connection-list mb-4">
        <h4 className="font-medium text-white mb-2">Connections</h4>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {connections.map(connection => {
            const sourceModule = modules.find(m => m.id === connection.source.moduleId);
            const destModule = modules.find(m => m.id === connection.destination.moduleId);
            
            return (
              <div
                key={connection.id}
                className="flex items-center justify-between p-2 bg-gray-700 rounded"
              >
                <div className="text-xs text-white">
                  {sourceModule?.name} → {destModule?.name}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.01"
                    value={connection.gain}
                    onChange={(e) => adjustConnectionGain(connection.id, parseFloat(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-xs text-gray-400 w-12">
                    {connection.gain.toFixed(2)}
                  </span>
                  <button
                    onClick={() => removeConnection(connection.id)}
                    className="w-5 h-5 bg-red-600 rounded text-xs"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Utility Controls */}
      <div className="utility-controls">
        <h4 className="font-medium text-white mb-2">Utilities</h4>
        <div className="flex gap-2">
          <button
            onClick={exportRouting}
            className="px-3 py-1 bg-green-600 rounded text-sm"
          >
            Export
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 bg-red-600 rounded text-sm"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoutingControlPanel;
