/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutomationControlPanel.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Automation Control Panel
 * Provides automation recording controls, parameter management,
 * and real-time automation status monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { automationEngine } from '../audio/AutomationEngine';

const AutomationControlPanel = ({ 
  audioContext,
  effects,
  mixingConsole,
  onParameterChange,
  className = ""
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [lanes, setLanes] = useState([]);
  const [selectedLanes, setSelectedLanes] = useState(new Set());
  const [recordingMode, setRecordingMode] = useState('touch'); // 'touch', 'latch', 'write'
  const [automationEnabled, setAutomationEnabled] = useState(true);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Initialize automation lanes for available parameters
  useEffect(() => {
    const initializeLanes = () => {
      // Add effect parameters
      if (effects) {
        Object.entries(effects).forEach(([effectId, effect]) => {
          if (effect.parameters) {
            Object.entries(effect.parameters).forEach(([paramName, paramConfig]) => {
              const laneId = `${effectId}.${paramName}`;
              if (!automationEngine.getLane(laneId)) {
                automationEngine.addLane(
                  laneId,
                  `${effect.name} ${paramName}`,
                  paramConfig.min || 0,
                  paramConfig.max || 1,
                  paramConfig.value || paramConfig.default || 0.5
                );
              }
            });
          }
        });
      }

      // Add mixing console parameters
      if (mixingConsole) {
        // Master volume
        if (!automationEngine.getLane('master.volume')) {
          automationEngine.addLane('master.volume', 'Master Volume', 0, 1, 0.8);
        }

        // Bus parameters
        for (let i = 0; i < 8; i++) {
          const busId = `bus.${i}`;
          if (!automationEngine.getLane(`${busId}.volume`)) {
            automationEngine.addLane(`${busId}.volume`, `Bus ${i + 1} Volume`, 0, 1, 0.8);
          }
          if (!automationEngine.getLane(`${busId}.pan`)) {
            automationEngine.addLane(`${busId}.pan`, `Bus ${i + 1} Pan`, -1, 1, 0);
          }
        }

        // Auxiliary sends
        for (let i = 0; i < 4; i++) {
          const auxId = `aux.${i}`;
          if (!automationEngine.getLane(`${auxId}.send`)) {
            automationEngine.addLane(`${auxId}.send`, `Aux ${i + 1} Send`, 0, 1, 0);
          }
        }
      }

      updateLanes();
    };

    initializeLanes();
  }, [effects, mixingConsole]);

  // Update lanes state
  const updateLanes = useCallback(() => {
    setLanes(automationEngine.getAllLanes());
  }, []);

  // Listen for automation changes
  useEffect(() => {
    const handleAutomationEvent = (event, data) => {
      switch (event) {
        case 'laneAdded':
        case 'laneRemoved':
        case 'automationChanged':
          updateLanes();
          break;
        case 'recordingStarted':
          setIsRecording(true);
          break;
        case 'recordingStopped':
          setIsRecording(false);
          break;
      }
    };

    automationEngine.addListener(handleAutomationEvent);
    return () => automationEngine.removeListener(handleAutomationEvent);
  }, [updateLanes]);

  // Recording controls
  const startRecording = useCallback(() => {
    const selectedLaneIds = Array.from(selectedLanes);
    automationEngine.startRecording(selectedLaneIds.length > 0 ? selectedLaneIds : null);
  }, [selectedLanes]);

  const stopRecording = useCallback(() => {
    automationEngine.stopRecording();
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Parameter automation
  const handleParameterAutomation = useCallback((parameterId, value) => {
    if (isRecording && selectedLanes.has(parameterId)) {
      automationEngine.recordParameterChange(parameterId, value);
    }
    
    if (onParameterChange) {
      onParameterChange(parameterId, value);
    }
  }, [isRecording, selectedLanes, onParameterChange]);

  // Lane selection
  const toggleLaneSelection = useCallback((laneId) => {
    setSelectedLanes(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(laneId)) {
        newSelection.delete(laneId);
      } else {
        newSelection.add(laneId);
      }
      return newSelection;
    });
  }, []);

  const selectAllLanes = useCallback(() => {
    setSelectedLanes(new Set(lanes.map(lane => lane.id)));
  }, [lanes]);

  const clearLaneSelection = useCallback(() => {
    setSelectedLanes(new Set());
  }, []);

  // Group management
  const createGroup = useCallback(() => {
    const name = prompt('Group name:');
    if (name && selectedLanes.size > 0) {
      const groupId = automationEngine.createGroup(name, Array.from(selectedLanes));
      setGroups(prev => [...prev, { id: groupId, name }]);
    }
  }, [selectedLanes]);

  const deleteGroup = useCallback((groupId) => {
    if (confirm('Delete automation group?')) {
      automationEngine.removeGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
    }
  }, [selectedGroup]);

  // Utility functions
  const clearAllAutomation = useCallback(() => {
    if (confirm('Clear all automation data? This cannot be undone.')) {
      automationEngine.clearAllAutomation();
    }
  }, []);

  const exportAutomation = useCallback(() => {
    const data = automationEngine.exportAutomation();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'automation_data.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importAutomation = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (automationEngine.importAutomation(data)) {
          alert('Automation data imported successfully');
          updateLanes();
        } else {
          alert('Failed to import automation data');
        }
      } catch (error) {
        alert('Invalid automation file');
      }
    };
    reader.readAsText(file);
  }, [updateLanes]);

  // Render lane item
  const renderLaneItem = useCallback((lane) => {
    const isSelected = selectedLanes.has(lane.id);
    const currentValue = lane.getValueAtTime(automationEngine.playbackPosition);

    return (
      <div
        key={lane.id}
        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
          ${isSelected ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
        onClick={() => toggleLaneSelection(lane.id)}
      >
        {/* Color indicator */}
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: lane.color }}
        />

        {/* Lane info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{lane.name}</div>
          <div className="text-xs text-gray-400">
            {currentValue.toFixed(3)} ({lane.points.length} points)
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              lane.enabled = !lane.enabled;
              updateLanes();
            }}
            className={`w-6 h-6 rounded text-xs ${
              lane.enabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
            title="Enable/Disable"
          >
            {lane.enabled ? 'âœ“' : 'âœ—'}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              lane.visible = !lane.visible;
              updateLanes();
            }}
            className={`w-6 h-6 rounded text-xs ${
              lane.visible ? 'bg-blue-600' : 'bg-gray-600'
            }`}
            title="Show/Hide"
          >
            ðŸ‘
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              lane.locked = !lane.locked;
              updateLanes();
            }}
            className={`w-6 h-6 rounded text-xs ${
              lane.locked ? 'bg-red-600' : 'bg-gray-600'
            }`}
            title="Lock/Unlock"
          >
            ðŸ”’
          </button>

          {isRecording && isSelected && (
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="Recording" />
          )}
        </div>
      </div>
    );
  }, [selectedLanes, toggleLaneSelection, updateLanes, isRecording]);

  return (
    <div className={`automation-control-panel bg-gray-800 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Automation</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
          >
            {showAdvanced ? 'Simple' : 'Advanced'}
          </button>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="mb-4 p-3 bg-gray-900 rounded">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={toggleRecording}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-white'}`} />
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          <select
            value={recordingMode}
            onChange={(e) => setRecordingMode(e.target.value)}
            className="px-3 py-2 bg-gray-700 rounded"
          >
            <option value="touch">Touch</option>
            <option value="latch">Latch</option>
            <option value="write">Write</option>
          </select>

          <button
            onClick={() => setAutomationEnabled(!automationEnabled)}
            className={`px-3 py-2 rounded ${
              automationEnabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            Auto {automationEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="text-sm text-gray-400">
          {selectedLanes.size > 0 
            ? `${selectedLanes.size} lane(s) selected for recording`
            : 'Select lanes to record automation'
          }
        </div>
      </div>

      {/* Lane Selection */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-white">Automation Lanes</h4>
          <div className="flex gap-1">
            <button
              onClick={selectAllLanes}
              className="px-2 py-1 bg-gray-600 rounded text-xs"
            >
              All
            </button>
            <button
              onClick={clearLaneSelection}
              className="px-2 py-1 bg-gray-600 rounded text-xs"
            >
              None
            </button>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {lanes.map(renderLaneItem)}
        </div>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4">
          {/* Groups */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">Groups</h4>
              <button
                onClick={createGroup}
                disabled={selectedLanes.size === 0}
                className="px-2 py-1 bg-blue-600 rounded text-xs disabled:bg-gray-600"
              >
                Create Group
              </button>
            </div>

            <div className="space-y-1">
              {groups.map(group => (
                <div
                  key={group.id}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer
                    ${selectedGroup === group.id ? 'bg-blue-600' : 'bg-gray-700'}`}
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <span className="text-sm">{group.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                    }}
                    className="px-2 py-1 bg-red-600 rounded text-xs"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Quantization */}
          <div>
            <h4 className="font-medium text-white mb-2">Quantization</h4>
            <div className="flex items-center gap-2">
              <button
                onClick={() => automationEngine.setQuantize(!automationEngine.quantizeEnabled)}
                className={`px-3 py-1 rounded text-sm ${
                  automationEngine.quantizeEnabled ? 'bg-blue-600' : 'bg-gray-600'
                }`}
              >
                Quantize
              </button>
              <select
                value={automationEngine.quantizeValue}
                onChange={(e) => automationEngine.setQuantize(true, parseFloat(e.target.value))}
                className="px-2 py-1 bg-gray-700 rounded text-sm"
              >
                <option value={0.01}>10ms</option>
                <option value={0.05}>50ms</option>
                <option value={0.1}>100ms</option>
                <option value={0.25}>250ms</option>
                <option value={0.5}>500ms</option>
                <option value={1}>1s</option>
              </select>
            </div>
          </div>

          {/* Undo/Redo */}
          <div>
            <h4 className="font-medium text-white mb-2">Edit</h4>
            <div className="flex gap-2">
              <button
                onClick={() => automationEngine.undo()}
                className="px-3 py-1 bg-gray-600 rounded text-sm"
              >
                Undo
              </button>
              <button
                onClick={() => automationEngine.redo()}
                className="px-3 py-1 bg-gray-600 rounded text-sm"
              >
                Redo
              </button>
              <button
                onClick={clearAllAutomation}
                className="px-3 py-1 bg-red-600 rounded text-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Import/Export */}
          <div>
            <h4 className="font-medium text-white mb-2">Data</h4>
            <div className="flex gap-2">
              <button
                onClick={exportAutomation}
                className="px-3 py-1 bg-green-600 rounded text-sm"
              >
                Export
              </button>
              <label className="px-3 py-1 bg-blue-600 rounded text-sm cursor-pointer">
                Import
                <input
                  type="file"
                  accept=".json"
                  onChange={importAutomation}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 space-y-1">
          <div>Lanes: {lanes.length} total, {lanes.filter(l => l.enabled).length} enabled</div>
          <div>Points: {lanes.reduce((sum, lane) => sum + lane.points.length, 0)} total</div>
          <div>Recording: {isRecording ? 'Active' : 'Stopped'}</div>
          <div>Mode: {recordingMode}</div>
        </div>
      </div>
    </div>
  );
};

export default AutomationControlPanel;
