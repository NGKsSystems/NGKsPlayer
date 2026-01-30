import React, { useState, useEffect } from 'react';
import './ChannelStrip.css';

const ChannelStrip = ({ 
  channel = 'A', 
  audioManager = null,
  onGainChange,
  onEQChange,
  onFilterChange
}) => {
  const [gain, setGain] = useState(75);
  const [highEQ, setHighEQ] = useState(50);
  const [midEQ, setMidEQ] = useState(50);
  const [lowEQ, setLowEQ] = useState(50);
  const [highPassFilter, setHighPassFilter] = useState(0);
  const [lowPassFilter, setLowPassFilter] = useState(100);
  const [cue, setCue] = useState(false);

  // Apply changes to AudioManager
  useEffect(() => {
    if (audioManager) {
      audioManager.setGain(channel, gain / 100);
      onGainChange?.(channel, gain / 100);
    }
  }, [gain, channel, audioManager, onGainChange]);

  useEffect(() => {
    if (audioManager) {
      const eqValues = {
        high: ((highEQ - 50) / 50) * 12, // -12dB to +12dB
        mid: ((midEQ - 50) / 50) * 12,
        low: ((lowEQ - 50) / 50) * 12
      };
      audioManager.setEQ(channel, eqValues);
      onEQChange?.(channel, eqValues);
    }
  }, [highEQ, midEQ, lowEQ, channel, audioManager, onEQChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setFilter(channel, {
        highPass: highPassFilter,
        lowPass: lowPassFilter
      });
      onFilterChange?.(channel, { highPass: highPassFilter, lowPass: lowPassFilter });
    }
  }, [highPassFilter, lowPassFilter, channel, audioManager, onFilterChange]);

  const handleCueToggle = () => {
    setCue(!cue);
    if (audioManager) {
      audioManager.setCue(channel, !cue);
    }
  };

  return (
    <div className="channel-strip">
      <div className="channel-header">
        <div className="channel-label">CH {channel}</div>
        <button 
          className={`cue-btn ${cue ? 'active' : ''}`}
          onClick={handleCueToggle}
          title="Cue"
        >
            CUE
          </button>
        </div>

        {/* High Pass Filter */}
        <div className="filter-section">
          <label>Hi-Pass</label>
          <input
            type="range"
            min="0"
            max="100"
            value={highPassFilter}
            onChange={(e) => setHighPassFilter(parseInt(e.target.value))}
            className="filter-knob"
          />
          <span className="filter-value">{highPassFilter}%</span>
        </div>

        {/* EQ Section */}
        <div className="eq-section">
          <div className="eq-knob-group">
            <label>HIGH</label>
            <input
              type="range"
              min="0"
              max="100"
              value={highEQ}
              onChange={(e) => setHighEQ(parseInt(e.target.value))}
              className="eq-knob eq-high"
            />
            <span className="eq-value">{((highEQ - 50) / 50 * 12).toFixed(1)}dB</span>
          </div>

          <div className="eq-knob-group">
            <label>MID</label>
            <input
              type="range"
              min="0"
              max="100"
              value={midEQ}
              onChange={(e) => setMidEQ(parseInt(e.target.value))}
              className="eq-knob eq-mid"
            />
            <span className="eq-value">{((midEQ - 50) / 50 * 12).toFixed(1)}dB</span>
          </div>

          <div className="eq-knob-group">
            <label>LOW</label>
            <input
              type="range"
              min="0"
              max="100"
              value={lowEQ}
              onChange={(e) => setLowEQ(parseInt(e.target.value))}
              className="eq-knob eq-low"
            />
            <span className="eq-value">{((lowEQ - 50) / 50 * 12).toFixed(1)}dB</span>
          </div>
        </div>

        {/* Low Pass Filter */}
        <div className="filter-section">
          <label>Lo-Pass</label>
          <input
            type="range"
            min="0"
            max="100"
            value={lowPassFilter}
            onChange={(e) => setLowPassFilter(parseInt(e.target.value))}
            className="filter-knob"
          />
          <span className="filter-value">{lowPassFilter}%</span>
        </div>

        {/* Gain Fader */}
        <div className="gain-section">
          <div className="gain-fader-container">
            <input
              type="range"
              min="0"
              max="100"
              value={gain}
              onChange={(e) => setGain(parseInt(e.target.value))}
              className="gain-fader"
              orient="vertical"
            />
            <div className="gain-scale">
              <span>+12</span>
              <span>0</span>
              <span>-∞</span>
            </div>
          </div>
          <label>GAIN</label>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default ChannelStrip;