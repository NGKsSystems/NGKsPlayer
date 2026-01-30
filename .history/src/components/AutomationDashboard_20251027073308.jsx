/**
 * Professional Automation Dashboard
 * Combines automation timeline, control panel, and parameter monitoring
 * into a comprehensive automation workspace
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import AutomationTimeline from './AutomationTimeline';
import AutomationControlPanel from './AutomationControlPanel';
import { automationEngine } from '../audio/AutomationEngine';

const AutomationDashboard = ({ 
  audioContext,
  effects,
  mixingConsole,
  isPlaying = false,
  currentTime = 0,
  duration = 60,
  onTimeChange,
  onParameterChange,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('timeline');
  const [selectedLanes, setSelectedLanes] = useState([]);
  const [timelineHeight, setTimelineHeight] = useState(400);
  const [isCompact, setIsCompact] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [automationValues, setAutomationValues] = useState(new Map());
  const updateIntervalRef = useRef(null);

  // Real-time automation value updates
  useEffect(() => {
    if (isPlaying) {
      updateIntervalRef.current = setInterval(() => {
        const values = new Map();
        automationEngine.getAllLanes().forEach(lane => {
          if (lane.enabled) {
            const value = lane.getValueAtTime(currentTime);
            values.set(lane.id, value);
          }
        });
        setAutomationValues(values);
      }, 16); // ~60fps updates

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    } else {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    }
  }, [isPlaying, currentTime]);

  // Apply automation values to parameters
  useEffect(() => {
    automationValues.forEach((value, parameterId) => {
      if (onParameterChange) {
        onParameterChange(parameterId, value);
      }
    });
  }, [automationValues, onParameterChange]);

  // Update automation engine playback position
  useEffect(() => {
    automationEngine.setPlaybackPosition(currentTime);
  }, [currentTime]);

  // Handle parameter changes from external sources
  const handleParameterChange = useCallback((parameterId, value) => {
    // Record automation if recording is active
    automationEngine.recordParameterChange(parameterId, value);
    
    // Forward to parent component
    if (onParameterChange) {
      onParameterChange(parameterId, value);
    }
  }, [onParameterChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;

      switch (e.key) {
        case 'r':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Toggle recording
            if (automationEngine.isRecording) {
              automationEngine.stopRecording();
            } else {
              automationEngine.startRecording();
            }
          }
          break;

        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              automationEngine.redo();
            } else {
              automationEngine.undo();
            }
          }
          break;

        case 't':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setActiveTab(activeTab === 'timeline' ? 'control' : 'timeline');
          }
          break;

        case 'h':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowPanel(!showPanel);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, showPanel]);

  // Tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'timeline':
        return (
          <AutomationTimeline
            duration={duration}
            height={timelineHeight}
            selectedLanes={selectedLanes}
            currentTime={currentTime}
            onTimeChange={onTimeChange}
            visible={true}
          />
        );

      case 'control':
        return (
          <AutomationControlPanel
            audioContext={audioContext}
            effects={effects}
            mixingConsole={mixingConsole}
            onParameterChange={handleParameterChange}
            className="h-full"
          />
        );

      case 'monitor':
        return (
          <AutomationMonitor
            automationValues={automationValues}
            lanes={automationEngine.getAllLanes()}
            isPlaying={isPlaying}
            currentTime={currentTime}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={`automation-dashboard flex flex-col bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-white">Professional Automation</h2>
          
          {/* Status indicators */}
          <div className="flex items-center gap-2 text-sm">
            {automationEngine.isRecording && (
              <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Recording
              </div>
            )}
            
            <div className={`px-2 py-1 rounded ${isPlaying ? 'bg-green-600' : 'bg-gray-600'}`}>
              {isPlaying ? '▶ Playing' : '⏸ Stopped'}
            </div>

            <div className="px-2 py-1 bg-gray-600 rounded">
              {automationEngine.getAllLanes().filter(l => l.enabled).length} Active Lanes
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCompact(!isCompact)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
            title="Toggle Compact Mode"
          >
            {isCompact ? '⛶' : '⚏'}
          </button>
          
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
            title="Toggle Panel (Ctrl+H)"
          >
            {showPanel ? '◧' : '◨'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-1 ${isCompact ? 'flex-col' : 'flex-row'}`}>
        {/* Left Panel / Top Panel in compact mode */}
        {showPanel && (
          <div className={`bg-gray-800 border-r ${isCompact ? 'border-r-0 border-b' : ''}`}>
            <div className="flex border-b">
              {['timeline', 'control', 'monitor'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 capitalize ${
                    activeTab === tab 
                      ? 'bg-gray-700 text-white border-b-2 border-blue-500' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className={`${isCompact ? 'h-64' : 'w-80 h-full'} overflow-auto`}>
              {renderTabContent()}
            </div>
          </div>
        )}

        {/* Main Timeline Area */}
        <div className="flex-1 flex flex-col">
          {!showPanel && activeTab === 'timeline' && (
            <AutomationTimeline
              duration={duration}
              height={timelineHeight}
              selectedLanes={selectedLanes}
              currentTime={currentTime}
              onTimeChange={onTimeChange}
              visible={true}
            />
          )}

          {!showPanel && activeTab !== 'timeline' && (
            <div className="flex-1 p-4">
              {renderTabContent()}
            </div>
          )}

          {showPanel && activeTab !== 'timeline' && (
            <div className="flex-1 p-4">
              <AutomationTimeline
                duration={duration}
                height={timelineHeight}
                selectedLanes={selectedLanes}
                currentTime={currentTime}
                onTimeChange={onTimeChange}
                visible={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-t text-xs text-gray-400">
        <div className="flex gap-4">
          <span>Time: {currentTime.toFixed(2)}s</span>
          <span>Duration: {duration.toFixed(2)}s</span>
          <span>Lanes: {automationEngine.getAllLanes().length}</span>
          <span>Points: {automationEngine.getAllLanes().reduce((sum, lane) => sum + lane.points.length, 0)}</span>
        </div>
        
        <div className="flex gap-4">
          <span>Ctrl+R: Record</span>
          <span>Ctrl+Z: Undo</span>
          <span>Ctrl+T: Switch Tab</span>
          <span>Ctrl+H: Toggle Panel</span>
        </div>
      </div>
    </div>
  );
};

// Automation Monitor Component
const AutomationMonitor = ({ automationValues, lanes, isPlaying, currentTime }) => {
  return (
    <div className="automation-monitor p-4 h-full overflow-auto">
      <h4 className="font-bold text-white mb-4">Real-time Automation Monitor</h4>
      
      <div className="space-y-2">
        {lanes.filter(lane => lane.enabled).map(lane => {
          const currentValue = automationValues.get(lane.id) || lane.getValueAtTime(currentTime);
          const percentage = ((currentValue - lane.minValue) / (lane.maxValue - lane.minValue)) * 100;
          
          return (
            <div key={lane.id} className="bg-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{lane.name}</span>
                <span className="text-sm text-gray-300">
                  {currentValue.toFixed(3)} ({lane.minValue.toFixed(1)} - {lane.maxValue.toFixed(1)})
                </span>
              </div>
              
              <div className="relative h-2 bg-gray-600 rounded">
                <div
                  className="absolute h-full rounded transition-all duration-75"
                  style={{
                    backgroundColor: lane.color,
                    width: `${Math.max(0, Math.min(100, percentage))}%`
                  }}
                />
              </div>
              
              <div className="flex items-center justify-between mt-1 text-xs text-gray-400">
                <span>{lane.points.length} points</span>
                <span>{lane.recording ? '🔴 Recording' : ''}</span>
              </div>
            </div>
          );
        })}
        
        {lanes.filter(lane => lane.enabled).length === 0 && (
          <div className="text-center text-gray-400 py-8">
            No automation lanes enabled
          </div>
        )}
      </div>

      {/* Live Values Table */}
      <div className="mt-6">
        <h5 className="font-medium text-white mb-2">Live Values</h5>
        <div className="bg-gray-800 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left p-2">Parameter</th>
                <th className="text-right p-2">Value</th>
                <th className="text-right p-2">%</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(automationValues.entries()).map(([parameterId, value]) => {
                const lane = lanes.find(l => l.id === parameterId);
                if (!lane) return null;
                
                const percentage = ((value - lane.minValue) / (lane.maxValue - lane.minValue)) * 100;
                
                return (
                  <tr key={parameterId} className="border-t border-gray-600">
                    <td className="p-2 text-gray-300">{lane.name}</td>
                    <td className="p-2 text-right text-white font-mono">{value.toFixed(3)}</td>
                    <td className="p-2 text-right text-gray-400">{percentage.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AutomationDashboard;