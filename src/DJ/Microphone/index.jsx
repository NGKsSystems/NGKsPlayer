/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import VerticalSlider from '../Common/VerticalSlider';
import Knob from '../Common/Knob';
import './microphone.css';

const Microphone = ({ audioManager, micSettings = {}, onMicChange = () => {} }) => {
  const [micState, setMicState] = useState({
    enabled: micSettings.enabled || false,
    volume: micSettings.volume || 75,
    gain: micSettings.gain || 50,
    reverb: micSettings.reverb || 0,
    // Microphone routing - send to left channel (main)
    routing: 'left'
  });

  // Update parent when mic state changes
  useEffect(() => {
    onMicChange(micState);
  }, [micState, onMicChange]);

  const handleMicToggle = () => {
    setMicState(prev => ({
      ...prev,
      enabled: !prev.enabled
    }));
  };

  const handleVolumeChange = (value) => {
    setMicState(prev => ({
      ...prev,
      volume: value
    }));
  };

  const handleGainChange = (value) => {
    setMicState(prev => ({
      ...prev,
      gain: value
    }));
  };

  const handleReverbChange = (value) => {
    setMicState(prev => ({
      ...prev,
      reverb: value
    }));
  };

  return (
    <div className="microphone-widget">
      <div className="mic-header">
        <h3>MICROPHONE</h3>
        <div className="mic-status">
          <span className={`status-indicator ${micState.enabled ? 'active' : 'inactive'}`}>
            {micState.enabled ? 'LIVE' : 'MUTED'}
          </span>
        </div>
      </div>

      {/* Row 1: Mic Volume and On/Off */}
      <div className="mic-row mic-row-1">
        <div className="mic-volume-section">
          <div className="mic-volume-container">
            <label>MIC VOL</label>
            <VerticalSlider
              id="mic-volume"
              value={micState.volume}
              min={0}
              max={100}
              onChange={handleVolumeChange}
              disabled={!micState.enabled}
              className="mic-volume-slider"
            />
            <div className="volume-value">{micState.volume}%</div>
          </div>
        </div>

        <div className="mic-toggle-section">
          <button
            className={`mic-toggle-btn ${micState.enabled ? 'enabled' : 'disabled'}`}
            onClick={handleMicToggle}
          >
            <div className="toggle-icon">
              {micState.enabled ? '🎤' : '🔇'}
            </div>
            <div className="toggle-label">
              {micState.enabled ? 'ON' : 'OFF'}
            </div>
          </button>
        </div>
      </div>

      {/* Row 2: Mic Gain and Reverb */}
      <div className="mic-row mic-row-2">
        <div className="mic-gain-section">
          <label>GAIN</label>
          <Knob
            id="mic-gain"
            value={micState.gain}
            min={0}
            max={100}
            onChange={handleGainChange}
            disabled={!micState.enabled}
            controlType="gain"
          />
          <div className="control-value">{micState.gain}%</div>
        </div>

        <div className="mic-reverb-section">
          <label>REVERB</label>
          <Knob
            id="mic-reverb"
            value={micState.reverb}
            min={0}
            max={100}
            onChange={handleReverbChange}
            disabled={!micState.enabled}
            controlType="reverb"
          />
          <div className="control-value">{micState.reverb}%</div>
        </div>
      </div>

      {/* Routing Info */}
      <div className="mic-routing-info">
        <span className="routing-label">→ LEFT CHANNEL</span>
      </div>
    </div>
  );
};

export default Microphone;
