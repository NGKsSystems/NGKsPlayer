/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: MasterSection.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState } from 'react';
import './MasterSection.css';

const MasterSection = ({ 
  audioManager = null,
  onMasterVolumeChange,
  onHeadphoneVolumeChange,
  onHeadphoneMixChange
}) => {
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [headphoneVolume, setHeadphoneVolume] = useState(0.6);
  const [headphoneMix, setHeadphoneMix] = useState(0.5);
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [monoEnabled, setMonoEnabled] = useState(false);

  const handleMasterVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    setMasterVolume(value);
    onMasterVolumeChange?.(value);
    if (audioManager) {
      audioManager.setMasterVolume(value);
    }
  };

  const handleHeadphoneVolumeChange = (e) => {
    const value = parseFloat(e.target.value);
    setHeadphoneVolume(value);
    onHeadphoneVolumeChange?.(value);
    if (audioManager) {
      audioManager.setHeadphoneVolume(value);
    }
  };

  const handleHeadphoneMixChange = (e) => {
    const value = parseFloat(e.target.value);
    setHeadphoneMix(value);
    onHeadphoneMixChange?.(value);
    if (audioManager) {
      audioManager.setHeadphoneMix(value);
    }
  };

  const toggleLimiter = () => {
    setLimiterEnabled(!limiterEnabled);
    if (audioManager) {
      audioManager.setLimiter(!limiterEnabled);
    }
  };

  const toggleMono = () => {
    setMonoEnabled(!monoEnabled);
    if (audioManager) {
      audioManager.setMono(!monoEnabled);
    }
  };

  return (
    <div className="master-section">
      <div className="master-header">
        <h3>MASTER</h3>
      </div>

      <div className="master-controls">
        <div className="master-volume-control">
          <label>MASTER</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={masterVolume}
            onChange={handleMasterVolumeChange}
            className="master-volume-slider"
            orient="vertical"
          />
          <div className="volume-value">{Math.round(masterVolume * 100)}%</div>
        </div>

        <div className="headphone-controls">
          <div className="headphone-volume-control">
            <label>PHONES</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={headphoneVolume}
              onChange={handleHeadphoneVolumeChange}
              className="headphone-volume-slider"
              orient="vertical"
            />
            <div className="volume-value">{Math.round(headphoneVolume * 100)}%</div>
          </div>

          <div className="headphone-mix-control">
            <label>CUE MIX</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={headphoneMix}
              onChange={handleHeadphoneMixChange}
              className="headphone-mix-slider"
            />
            <div className="mix-labels">
              <span>CUE</span>
              <span>MIX</span>
            </div>
          </div>
        </div>
      </div>

      <div className="master-options">
        <button 
          className={`option-btn ${limiterEnabled ? 'active' : ''}`}
          onClick={toggleLimiter}
          title="Master Limiter"
        >
          LIMIT
        </button>
        <button 
          className={`option-btn ${monoEnabled ? 'active' : ''}`}
          onClick={toggleMono}
          title="Mono Output"
        >
          MONO
        </button>
      </div>

      <div className="level-meters">
        <div className="meter-pair">
          <div className="meter left">
            <div className="meter-bar"></div>
          </div>
          <div className="meter right">
            <div className="meter-bar"></div>
          </div>
        </div>
        <div className="meter-labels">
          <span>L</span>
          <span>R</span>
        </div>
      </div>
    </div>
  );
};

export default MasterSection;
