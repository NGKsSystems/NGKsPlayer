/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutomationSystem.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Automation System
 * 
 * Manages automation for all parameters across the ProAudioClipper system.
 * Features Phase 5 automation capabilities that were previously missing.
 */

import React, { useState, useCallback, useRef } from 'react';
import AutomationLane from './AutomationLane.jsx';

const AutomationSystem = ({
  tracks = [],
  audioEngine,
  timeRange = { start: 0, end: 10 },
  onAutomationChange
}) => {
  const [automationData, setAutomationData] = useState(new Map());
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [visibleParameters, setVisibleParameters] = useState(new Set());
  const [isRecording, setIsRecording] = useState(false);
  const [automationMode, setAutomationMode] = useState('off'); // off, read, write, touch, latch

  // Common automatable parameters
  const commonParameters = [
    { name: 'volume', range: { min: 0, max: 1 }, unit: '' },
    { name: 'pan', range: { min: -1, max: 1 }, unit: '' },
    { name: 'eq-high', range: { min: -12, max: 12 }, unit: 'dB' },
    { name: 'eq-mid', range: { min: -12, max: 12 }, unit: 'dB' },
    { name: 'eq-low', range: { min: -12, max: 12 }, unit: 'dB' },
    { name: 'compressor-threshold', range: { min: -60, max: 0 }, unit: 'dB' },
    { name: 'compressor-ratio', range: { min: 1, max: 20 }, unit: ':1' },
    { name: 'reverb-send', range: { min: 0, max: 1 }, unit: '' }
  ];

  const handleAutomationChange = useCallback((parameter, points) => {
    const key = `${selectedTrack}-${parameter}`;
    const newAutomationData = new Map(automationData);
    newAutomationData.set(key, points);
    setAutomationData(newAutomationData);
    
    if (onAutomationChange) {
      onAutomationChange(selectedTrack, parameter, points);
    }
  }, [selectedTrack, automationData, onAutomationChange]);

  const toggleParameterVisibility = useCallback((parameter) => {
    const newVisible = new Set(visibleParameters);
    if (newVisible.has(parameter)) {
      newVisible.delete(parameter);
    } else {
      newVisible.add(parameter);
    }
    setVisibleParameters(newVisible);
  }, [visibleParameters]);

  const clearAllAutomation = useCallback(() => {
    setAutomationData(new Map());
    if (onAutomationChange) {
      onAutomationChange(null, null, null); // Signal to clear all
    }
  }, [onAutomationChange]);

  const toggleAutomationMode = useCallback((mode) => {
    setAutomationMode(prev => prev === mode ? 'off' : mode);
  }, []);

  return (
    <div className="automation-system" style={{ 
      background: '#1a1a1a', 
      color: '#ffffff',
      padding: '10px'
    }}>
      {/* Automation Control Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '15px',
        padding: '10px',
        background: '#2a2a2a',
        borderRadius: '4px'
      }}>
        <h3 style={{ margin: 0, marginRight: '20px' }}>Professional Automation</h3>
        
        {/* Track Selection */}
        <select 
          value={selectedTrack || ''}
          onChange={(e) => setSelectedTrack(e.target.value || null)}
          style={{ 
            marginRight: '15px',
            padding: '5px',
            background: '#333',
            color: '#fff',
            border: '1px solid #555'
          }}
        >
          <option value="">Select Track</option>
          {tracks.map((track, index) => (
            <option key={track.id || index} value={track.id || index}>
              {track.name || `Track ${index + 1}`}
            </option>
          ))}
        </select>

        {/* Automation Mode Buttons */}
        <div style={{ display: 'flex', gap: '5px', marginRight: '15px' }}>
          {['read', 'write', 'touch', 'latch'].map(mode => (
            <button
              key={mode}
              onClick={() => toggleAutomationMode(mode)}
              style={{
                padding: '5px 10px',
                background: automationMode === mode ? '#4A90E2' : '#444',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                textTransform: 'uppercase'
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Recording Control */}
        <button
          onClick={() => setIsRecording(prev => !prev)}
          style={{
            padding: '8px 15px',
            background: isRecording ? '#ff4444' : '#444',
            color: '#fff',
            border: 'none',
            borderRadius: '3px',
            marginRight: '15px'
          }}
        >
          {isRecording ? '● Stop Recording' : '○ Start Recording'}
        </button>

        {/* Clear All */}
        <button
          onClick={clearAllAutomation}
          style={{
            padding: '5px 10px',
            background: '#ff6666',
            color: '#fff',
            border: 'none',
            borderRadius: '3px'
          }}
        >
          Clear All
        </button>
      </div>

      {selectedTrack && (
        <div>
          {/* Parameter Selection */}
          <div style={{ 
            marginBottom: '15px',
            padding: '10px',
            background: '#252525',
            borderRadius: '4px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Automation Parameters</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {commonParameters.map(param => (
                <button
                  key={param.name}
                  onClick={() => toggleParameterVisibility(param.name)}
                  style={{
                    padding: '5px 10px',
                    background: visibleParameters.has(param.name) ? '#4A90E2' : '#333',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '11px'
                  }}
                >
                  {param.name} {param.unit}
                </button>
              ))}
            </div>
          </div>

          {/* Automation Lanes */}
          <div className="automation-lanes">
            {commonParameters
              .filter(param => visibleParameters.has(param.name))
              .map(param => (
                <AutomationLane
                  key={param.name}
                  parameter={param.name}
                  automationData={automationData.get(`${selectedTrack}-${param.name}`) || []}
                  timeRange={timeRange}
                  parameterRange={param.range}
                  isRecording={isRecording && automationMode !== 'off'}
                  onAutomationChange={handleAutomationChange}
                />
              ))
            }
          </div>

          {visibleParameters.size === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px',
              color: '#666',
              fontStyle: 'italic'
            }}>
              Select parameters above to show automation lanes
            </div>
          )}
        </div>
      )}

      {!selectedTrack && (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          color: '#666',
          fontStyle: 'italic'
        }}>
          Select a track to view automation parameters
        </div>
      )}

      {/* Status Bar */}
      <div style={{ 
        marginTop: '15px',
        padding: '8px 10px',
        background: '#222',
        borderRadius: '3px',
        fontSize: '11px',
        color: '#aaa'
      }}>
        Mode: {automationMode.toUpperCase()} | 
        Recording: {isRecording ? 'ON' : 'OFF'} | 
        Visible Lanes: {visibleParameters.size} | 
        Total Points: {Array.from(automationData.values()).reduce((sum, points) => sum + points.length, 0)}
      </div>
    </div>
  );
};

export default AutomationSystem;
