import React, { useState, useEffect } from 'react';
import './EffectsSend.css';

const EffectsSend = ({ 
  audioManager = null,
  sendNumber = 1,
  onSendLevelChange,
  onEffectChange
}) => {
  const [sendLevel, setSendLevel] = useState(0);
  const [effectType, setEffectType] = useState('reverb');
  const [effectParams, setEffectParams] = useState({
    time: 50,    // Reverb time / Delay time
    feedback: 30, // Delay feedback / Reverb decay
    mix: 50,     // Wet/Dry mix
    filter: 50   // Filter cutoff
  });
  const [bypass, setBypass] = useState(false);
  const [sendMeter, setSendMeter] = useState(0);

  const effectTypes = [
    { value: 'reverb', label: 'Reverb' },
    { value: 'delay', label: 'Delay' },
    { value: 'filter', label: 'Filter' },
    { value: 'phaser', label: 'Phaser' },
    { value: 'flanger', label: 'Flanger' },
    { value: 'chorus', label: 'Chorus' }
  ];

  useEffect(() => {
    if (audioManager) {
      audioManager.setEffectSend(sendNumber, sendLevel / 100);
      onSendLevelChange?.(sendNumber, sendLevel / 100);
    }
  }, [sendLevel, sendNumber, audioManager, onSendLevelChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setEffectType(sendNumber, effectType, effectParams);
      onEffectChange?.(sendNumber, effectType, effectParams);
    }
  }, [effectType, effectParams, sendNumber, audioManager, onEffectChange]);

  useEffect(() => {
    if (audioManager) {
      audioManager.setEffectBypass(sendNumber, bypass);
    }
  }, [bypass, sendNumber, audioManager]);

  // Simulate send meter updates
  useEffect(() => {
    const updateMeter = () => {
      if (audioManager && !bypass) {
        const level = audioManager.getEffectSendLevel?.(sendNumber) || 0;
        setSendMeter(level * 100);
      } else {
        setSendMeter(0);
      }
    };

    const interval = setInterval(updateMeter, 50);
    return () => clearInterval(interval);
  }, [audioManager, sendNumber, bypass]);

  const handleParamChange = (param, value) => {
    setEffectParams(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const getParamLabel = (param) => {
    switch (effectType) {
      case 'reverb':
        return {
          time: 'Room Size',
          feedback: 'Decay',
          mix: 'Wet/Dry',
          filter: 'Damping'
        }[param];
      case 'delay':
        return {
          time: 'Delay Time',
          feedback: 'Feedback',
          mix: 'Wet/Dry',
          filter: 'Filter'
        }[param];
      case 'filter':
        return {
          time: 'Cutoff',
          feedback: 'Resonance',
          mix: 'Mix',
          filter: 'Type'
        }[param];
      default:
        return {
          time: 'Rate',
          feedback: 'Depth',
          mix: 'Mix',
          filter: 'Feedback'
        }[param];
    }
  };

  return (
    <div className="effects-send">
      {/* Effect Type Selector */}
      <div className="effect-type-section">
        <label>Effect Type</label>
        <select
          value={effectType}
          onChange={(e) => setEffectType(e.target.value)}
          className="effect-type-select"
          >
            {effectTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bypass Button */}
        <div className="bypass-section">
          <button
            className={`bypass-btn ${bypass ? 'active' : ''}`}
            onClick={() => setBypass(!bypass)}
            title="Bypass Effect"
          >
            <span className="bypass-icon">⊘</span>
            <span>BYPASS</span>
          </button>
        </div>

        {/* Effect Parameters */}
        <div className="effect-params">
          {Object.entries(effectParams).map(([param, value]) => (
            <div key={param} className="param-control">
              <label>{getParamLabel(param)}</label>
              <div className="knob-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={value}
                  onChange={(e) => handleParamChange(param, parseInt(e.target.value))}
                  className="effect-knob"
                  disabled={bypass}
                />
                <div className="knob-value">{value}%</div>
              </div>
            </div>
          ))}
        </div>

        {/* Send Level Fader */}
        <div className="send-level-section">
          <label>Send Level</label>
          <div className="send-fader-container">
            <div className="send-meter">
              <div 
                className="send-meter-fill"
                style={{ height: `${sendMeter}%` }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sendLevel}
              onChange={(e) => setSendLevel(parseInt(e.target.value))}
              className="send-level-fader"
              orient="vertical"
            />
            <div className="send-scale">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
          </div>
          <div className="send-value">{sendLevel}%</div>
        </div>

        {/* Return Level */}
        <div className="return-section">
          <label>Return</label>
          <div className="return-knob-container">
            <input
              type="range"
              min="0"
              max="100"
              value={effectParams.mix}
              onChange={(e) => handleParamChange('mix', parseInt(e.target.value))}
              className="return-knob"
              disabled={bypass}
            />
            <div className="return-value">{effectParams.mix}%</div>
          </div>
        </div>

        {/* Effect Info Display */}
        <div className="effect-info">
          <div className="effect-status">
            <span className={`status-indicator ${!bypass ? 'active' : ''}`} />
            <span className="effect-name">{effectTypes.find(t => t.value === effectType)?.label}</span>
          </div>
          <div className="send-number">FX{sendNumber}</div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default EffectsSend;