/**
 * Professional Routing Dashboard
 * Combines patch bay interface and routing control panel for comprehensive
 * modular audio routing management
 */

import React, { useState, useEffect, useCallback } from 'react';
import PatchBayInterface from './PatchBayInterface';
import RoutingControlPanel from './RoutingControlPanel';
import { routingEngine } from '../audio/RoutingEngine';

const RoutingDashboard = ({ 
  audioContext,
  onParameterChange,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('patchbay');
  const [selectedModule, setSelectedModule] = useState(null);
  const [showControlPanel, setShowControlPanel] = useState(true);
  const [isCompact, setIsCompact] = useState(false);
  const [routingStats, setRoutingStats] = useState({});

  // Initialize routing engine with audio context
  useEffect(() => {
    if (audioContext && routingEngine.audioContext !== audioContext) {
      routingEngine.audioContext = audioContext;
    }
  }, [audioContext]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setRoutingStats(routingEngine.getStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle module creation
  const handleModuleCreate = useCallback((module) => {
    console.log('Module created:', module.name);
    setSelectedModule(module);
  }, []);

  // Handle module selection
  const handleModuleSelect = useCallback((module) => {
    setSelectedModule(module);
  }, []);

  // Handle connection creation
  const handleConnectionCreate = useCallback((connection) => {
    console.log('Connection created:', connection.id);
    
    // Apply parameter changes if needed
    if (onParameterChange) {
      onParameterChange(`connection.${connection.id}.gain`, connection.gain);
    }
  }, [onParameterChange]);

  // Handle connection removal
  const handleConnectionRemove = useCallback((connectionId) => {
    console.log('Connection removed:', connectionId);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;

      switch (e.key) {
        case 'Tab':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveTab(activeTab === 'patchbay' ? 'control' : 'patchbay');
          }
          break;

        case 'h':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowControlPanel(!showControlPanel);
          }
          break;

        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsCompact(!isCompact);
          }
          break;

        case 'Escape':
          setSelectedModule(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, showControlPanel, isCompact]);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'patchbay':
        return (
          <PatchBayInterface
            width={1200}
            height={600}
            onConnectionCreate={handleConnectionCreate}
            onConnectionRemove={handleConnectionRemove}
            onModuleSelect={handleModuleSelect}
            className="flex-1"
          />
        );

      case 'control':
        return (
          <div className="flex-1 p-4 overflow-auto">
            <RoutingControlPanel
              audioContext={audioContext}
              onModuleCreate={handleModuleCreate}
              onModuleSelect={handleModuleSelect}
              selectedModule={selectedModule}
              className="h-full"
            />
          </div>
        );

      case 'monitor':
        return (
          <RoutingMonitor
            routingStats={routingStats}
            selectedModule={selectedModule}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`routing-dashboard flex flex-col bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white">Professional Routing System</h2>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2 text-sm">
            <div className="px-2 py-1 bg-gray-600 rounded">
              {routingStats.moduleCount || 0} Modules
            </div>
            <div className="px-2 py-1 bg-gray-600 rounded">
              {routingStats.connectionCount || 0} Connections
            </div>
            <div className={`px-2 py-1 rounded ${
              (routingStats.cpuUsage || 0) > 80 ? 'bg-red-600' : 
              (routingStats.cpuUsage || 0) > 60 ? 'bg-yellow-600' : 'bg-green-600'
            }`}>
              CPU: {(routingStats.cpuUsage || 0).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
            title="Toggle Compact Mode (Ctrl+C)"
          >
            {isCompact ? '⛶' : '⚏'}
          </button>
          
          <button
            onClick={() => setShowControlPanel(!showControlPanel)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
            title="Toggle Control Panel (Ctrl+H)"
          >
            {showControlPanel ? '◧' : '◨'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-1 ${isCompact ? 'flex-col' : 'flex-row'}`}>
        {/* Left Panel / Top Panel in compact mode */}
        {showControlPanel && (
          <div className={`bg-gray-800 border-r ${isCompact ? 'border-r-0 border-b' : ''}`}>
            <div className="flex border-b">
              {['patchbay', 'control', 'monitor'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 capitalize ${
                    activeTab === tab 
                      ? 'bg-gray-700 text-white border-b-2 border-blue-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab === 'patchbay' ? 'Patch Bay' : tab}
                </button>
              ))}
            </div>

            <div className={`${isCompact ? 'h-64' : 'w-96 h-full'} overflow-auto`}>
              {activeTab !== 'patchbay' && renderTabContent()}
              {activeTab === 'patchbay' && (
                <div className="p-4">
                  <RoutingControlPanel
                    audioContext={audioContext}
                    onModuleCreate={handleModuleCreate}
                    onModuleSelect={handleModuleSelect}
                    selectedModule={selectedModule}
                    className="h-full"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Routing Area */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'patchbay' || !showControlPanel ? (
            <PatchBayInterface
              width={1200}
              height={600}
              onConnectionCreate={handleConnectionCreate}
              onConnectionRemove={handleConnectionRemove}
              onModuleSelect={handleModuleSelect}
              className="flex-1"
            />
          ) : (
            <div className="flex-1 overflow-auto">
              {renderTabContent()}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-t text-xs text-gray-400">
        <div className="flex gap-4">
          <span>Modules: {routingStats.moduleCount || 0}</span>
          <span>Connections: {routingStats.connectionCount || 0}</span>
          <span>Latency: {(routingStats.averageLatency || 0).toFixed(1)}ms</span>
          <span>CPU: {(routingStats.cpuUsage || 0).toFixed(1)}%</span>
        </div>
        
        <div className="flex gap-4">
          <span>Ctrl+Tab: Switch tabs</span>
          <span>Ctrl+H: Toggle panel</span>
          <span>Ctrl+C: Compact mode</span>
          <span>Esc: Clear selection</span>
        </div>
      </div>
    </div>
  );
};

// Routing Monitor Component
const RoutingMonitor = ({ routingStats, selectedModule }) => {
  const [performanceData, setPerformanceData] = useState([]);
  const [maxDataPoints] = useState(50);

  // Collect performance data over time
  useEffect(() => {
    const interval = setInterval(() => {
      setPerformanceData(prev => {
        const newData = [...prev, {
          timestamp: Date.now(),
          cpuUsage: routingStats.cpuUsage || 0,
          moduleCount: routingStats.moduleCount || 0,
          connectionCount: routingStats.connectionCount || 0,
          latency: routingStats.averageLatency || 0
        }];
        
        // Keep only recent data points
        return newData.slice(-maxDataPoints);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [routingStats, maxDataPoints]);

  return (
    <div className="routing-monitor p-4 h-full overflow-auto bg-gray-900">
      <h4 className="font-bold text-white mb-4">Routing Performance Monitor</h4>
      
      {/* Real-time Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800 rounded p-4">
          <h5 className="font-medium text-white mb-2">System Load</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">CPU Usage:</span>
              <span className="text-white">{(routingStats.cpuUsage || 0).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (routingStats.cpuUsage || 0) > 80 ? 'bg-red-500' :
                  (routingStats.cpuUsage || 0) > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, routingStats.cpuUsage || 0)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded p-4">
          <h5 className="font-medium text-white mb-2">Audio Latency</h5>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Average:</span>
              <span className="text-white">{(routingStats.averageLatency || 0).toFixed(1)}ms</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  (routingStats.averageLatency || 0) > 20 ? 'bg-red-500' :
                  (routingStats.averageLatency || 0) > 10 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (routingStats.averageLatency || 0) * 5)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Module Overview */}
      <div className="bg-gray-800 rounded p-4 mb-6">
        <h5 className="font-medium text-white mb-3">Module Overview</h5>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{routingStats.moduleCount || 0}</div>
            <div className="text-xs text-gray-400">Total Modules</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{routingStats.connectionCount || 0}</div>
            <div className="text-xs text-gray-400">Active Connections</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {routingEngine.signalChains ? routingEngine.signalChains.size : 0}
            </div>
            <div className="text-xs text-gray-400">Signal Chains</div>
          </div>
        </div>
      </div>

      {/* Selected Module Details */}
      {selectedModule && (
        <div className="bg-gray-800 rounded p-4 mb-6">
          <h5 className="font-medium text-white mb-3">Selected Module: {selectedModule.name}</h5>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white capitalize">{selectedModule.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className={`${selectedModule.enabled ? 'text-green-400' : 'text-red-400'}`}>
                {selectedModule.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Bypassed:</span>
              <span className={`${selectedModule.bypassed ? 'text-yellow-400' : 'text-green-400'}`}>
                {selectedModule.bypassed ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Input Ports:</span>
              <span className="text-white">{selectedModule.getAllPorts('input').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Output Ports:</span>
              <span className="text-white">{selectedModule.getAllPorts('output').length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Parameters:</span>
              <span className="text-white">{selectedModule.parameters.size}</span>
            </div>
          </div>
        </div>
      )}

      {/* Performance History Graph */}
      <div className="bg-gray-800 rounded p-4">
        <h5 className="font-medium text-white mb-3">Performance History</h5>
        
        {performanceData.length > 0 ? (
          <div className="relative h-32 bg-gray-900 rounded p-2">
            <svg width="100%" height="100%" className="absolute inset-0">
              {/* CPU Usage Line */}
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                points={performanceData.map((point, index) => {
                  const x = (index / (maxDataPoints - 1)) * 100;
                  const y = 100 - (point.cpuUsage || 0);
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
              
              {/* Latency Line */}
              <polyline
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                points={performanceData.map((point, index) => {
                  const x = (index / (maxDataPoints - 1)) * 100;
                  const y = 100 - ((point.latency || 0) * 5); // Scale latency
                  return `${x}%,${y}%`;
                }).join(' ')}
              />
            </svg>
            
            <div className="absolute bottom-2 left-2 text-xs text-gray-400">
              <span className="text-red-400">●</span> CPU Usage
              <span className="ml-4 text-blue-400">●</span> Latency (5x)
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No performance data available yet...
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingDashboard;