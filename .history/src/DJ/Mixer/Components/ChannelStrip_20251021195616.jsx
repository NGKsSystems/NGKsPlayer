import React, { useState, useEffect } from 'react';
import './ChannelStrip.css';

const ChannelStrip = ({ 
  channel = 'A', 
  audioManager = null,
  channelNumber = 1,
  onGainChange,
  onEQChange,
  onFilterChange,
  onCueChange,
  initialValues = {}
}) => {
  const [gain, setGain] = useState(initialValues.gain || 75);
  const [eqHigh, setEqHigh] = useState(initialValues.eq?.high || 0);
  const [eqMid, setEqMid] = useState(initialValues.eq?.mid || 0);
  const [eqLow, setEqLow] = useState(initialValues.eq?.low || 0);
  const [highPassFilter, setHighPassFilter] = useState(false);
  const [lowPassFilter, setLowPassFilter] = useState(false);
  const [cue, setCue] = useState(initialValues.cue || false);

  const handleGainChange = (e) => {
    const value = parseFloat(e.target.value);
    setGain(value);
    onGainChange?.(value);
    if (audioManager) {
      audioManager.setChannelGain(channel, value / 100);
    }
  };

  const handleEQChange = (band, value) => {
    const eqValue = parseFloat(value);
    if (band === 'high') setEqHigh(eqValue);
    if (band === 'mid') setEqMid(eqValue);
    if (band === 'low') setEqLow(eqValue);
    
    onEQChange?.(band, eqValue);
    if (audioManager) {
      audioManager.setChannelEQ(channel, band, eqValue);
    }
  };

  const handleFilterToggle = (filterType) => {
    if (filterType === 'highpass') {
      setHighPassFilter(!highPassFilter);
    } else if (filterType === 'lowpass') {
      setLowPassFilter(!lowPassFilter);
    }
  };

  useEffect(() => {
    if (audioManager) {
      onFilterChange?.(channel, { highPass: highPassFilter, lowPass: lowPassFilter });
    }
  }, [highPassFilter, lowPassFilter, channel, audioManager, onFilterChange]);

  const handleCueToggle = () => {
    setCue(!cue);
    onCueChange?.(!cue);
    if (audioManager) {
      audioManager.setCue(channel, !cue);
    }
  };

  return (
    <div className="channel-strip">
      <div className="channel-header">
        <div className="channel-label">CH {channelNumber}</div>
        <button 
          className={`cue-btn ${cue ? 'active' : ''}`}
          onClick={handleCueToggle}
          title="Cue"
        >
          CUE
        </button>
      </div>

      <div className="eq-section">
        <div className="eq-control">
          <label>HIGH</label>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={eqHigh}
            onChange={(e) => handleEQChange('high', e.target.value)}
            className="eq-slider"
          />
          <span className="eq-value">{eqHigh.toFixed(1)}dB</span>
        </div>
        
        <div className="eq-control">
          <label>MID</label>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={eqMid}
            onChange={(e) => handleEQChange('mid', e.target.value)}
            className="eq-slider"
          />
          <span className="eq-value">{eqMid.toFixed(1)}dB</span>
        </div>
        
        <div className="eq-control">
          <label>LOW</label>
          <input
            type="range"
            min="-12"
            max="12"
            step="0.1"
            value={eqLow}
            onChange={(e) => handleEQChange('low', e.target.value)}
            className="eq-slider"
          />
          <span className="eq-value">{eqLow.toFixed(1)}dB</span>
        </div>
      </div>

      <div className="filter-section">
        <button 
          className={`filter-btn ${highPassFilter ? 'active' : ''}`}
          onClick={() => handleFilterToggle('highpass')}
          title="High Pass Filter"
        >
          HPF
        </button>
        <button 
          className={`filter-btn ${lowPassFilter ? 'active' : ''}`}
          onClick={() => handleFilterToggle('lowpass')}
          title="Low Pass Filter"
        >
          LPF
        </button>
      </div>

      <div className="gain-section">
        <div className="gain-control">
          <input
            type="range"
            min="0"
            max="100"
            value={gain}
            onChange={handleGainChange}
            className="gain-slider"
            orient="vertical"
          />
          <div className="gain-value">{gain}%</div>
          <label>GAIN</label>
        </div>
      </div>
    </div>
  );
};

export default ChannelStrip;