import React, { useState, useEffect } from 'react';
import './MasterSection.css';

const MasterSection = ({ 
  audioManager = null,
  onMasterVolumeChange,
  onHeadphoneVolumeChange,
  onHeadphoneMixChange
}) => {
  const [masterVolume, setMasterVolume] = useState(80);
  const [headphoneVolume, setHeadphoneVolume] = useState(60);
  const [headphoneMix, setHeadphoneMix] = useState(50); // 0 = Cue only, 100 = Master only
  const [limiter, setLimiter] = useState(true);
  const [vuMeterLeft, setVuMeterLeft] = useState(0);
  const [vuMeterRight, setVuMeterRight] = useState(0);

  useEffect(() => {
    if (audioManager) {
      audioManager.setMasterVolume(masterVolume / 100);
      onMasterVolumeChange?.(masterVolume / 100);
    }
  }, [masterVolume, audioManager, onMasterVolumeChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setHeadphoneVolume(headphoneVolume / 100);
      onHeadphoneVolumeChange?.(headphoneVolume / 100);
    }
  }, [headphoneVolume, audioManager, onHeadphoneVolumeChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setHeadphoneMix(headphoneMix / 100);
      onHeadphoneMixChange?.(headphoneMix / 100);
    }
  }, [headphoneMix, audioManager, onHeadphoneMixChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setLimiter(limiter);
    }
  }, [limiter, audioManager]);

  // Simulate VU meter updates (in real implementation, this would come from AudioManager)
  useEffect(() => {
    const updateVuMeters = () => {
      if (audioManager) {
        const levels = audioManager.getMasterLevels?.() || { left: 0, right: 0 };
        setVuMeterLeft(levels.left * 100);
        setVuMeterRight(levels.right * 100);
      }
    };

    const interval = setInterval(updateVuMeters, 50);
    return () => clearInterval(interval);
  }, [audioManager]);

  return (
    <DraggableWidget
      id="master-section"
      title="Master Section"
      className="mixer-sub-widget master-section-widget"
      {...widgetProps}
    >
      <div className="master-section">
        {/* VU Meters */}
        <div className="vu-meters">
          <div className="vu-meter">
            <div className="vu-bar">
              <div 
                className="vu-fill left"
                style={{ height: `${vuMeterLeft}%` }}
              />
            </div>
            <label>L</label>
          </div>
          <div className="vu-meter">
            <div className="vu-bar">
              <div 
                className="vu-fill right"
                style={{ height: `${vuMeterRight}%` }}
              />
            </div>
            <label>R</label>
          </div>
          <div className="vu-scale">
            <span>0</span>
            <span>-6</span>
            <span>-12</span>
            <span>-18</span>
            <span>-∞</span>
          </div>
        </div>

        {/* Master Volume */}
        <div className="master-volume-section">
          <label>MASTER</label>
          <div className="volume-fader-container">
            <input
              type="range"
              min="0"
              max="100"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseInt(e.target.value))}
              className="master-volume-fader"
              orient="vertical"
            />
            <div className="volume-scale">
              <span>+6</span>
              <span>0</span>
              <span>-12</span>
              <span>-∞</span>
            </div>
          </div>
          <div className="volume-value">{masterVolume}%</div>
        </div>

        {/* Headphone Section */}
        <div className="headphone-section">
          <label>HEADPHONES</label>
          
          <div className="headphone-volume">
            <label>Volume</label>
            <input
              type="range"
              min="0"
              max="100"
              value={headphoneVolume}
              onChange={(e) => setHeadphoneVolume(parseInt(e.target.value))}
              className="headphone-knob"
            />
            <span className="hp-value">{headphoneVolume}%</span>
          </div>

          <div className="headphone-mix">
            <label>Cue/Master Mix</label>
            <input
              type="range"
              min="0"
              max="100"
              value={headphoneMix}
              onChange={(e) => setHeadphoneMix(parseInt(e.target.value))}
              className="mix-knob"
            />
            <div className="mix-labels">
              <span>CUE</span>
              <span>MST</span>
            </div>
          </div>
        </div>

        {/* Limiter */}
        <div className="limiter-section">
          <button 
            className={`limiter-btn ${limiter ? 'active' : ''}`}
            onClick={() => setLimiter(!limiter)}
            title="Master Limiter"
          >
            <span className="limiter-icon">⚡</span>
            <span>LIMITER</span>
          </button>
        </div>

        {/* Output Level Display */}
        <div className="output-display">
          <div className="output-value">
            <span className="db-value">
              {(20 * Math.log10(masterVolume / 100) || -Infinity).toFixed(1)}dB
            </span>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default MasterSection;