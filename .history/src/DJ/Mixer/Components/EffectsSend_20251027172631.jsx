import React, { useState, useEffect, useRef } from 'react';
import { Power, RotateCcw, Zap, Clock, Sliders, Filter, Waves, Volume2 } from 'lucide-react';
import AdvancedAudioFXEngine from '../../../audio/AdvancedAudioFXEngine';
import './EffectsSend.css';

const EffectsSend = ({ 
  audioManager = null,
  sendNumber = 1,
  onSendLevelChange,
  onEffectChange,
  currentBPM = 128,
  audioContext = null
}) => {
  // Professional FX state
  const [fxEngine, setFxEngine] = useState(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [effectType, setEffectType] = useState('filter');
  const [parameters, setParameters] = useState({
    mix: 0.0,
    param1: 0.5,
    param2: 0.5,
    bpmSync: true
  });
  const [bpmSynced, setBpmSynced] = useState(true);

  const handleSendLevelChange = (e) => {
    const value = parseFloat(e.target.value);
    setSendLevel(value);
    onSendLevelChange?.(sendNumber, value);
    if (audioManager) {
      audioManager.setEffectSend(sendNumber, value);
    }
  };

  const handleEffectTypeChange = (newType) => {
    setEffectType(newType);
    onEffectChange?.(sendNumber, newType, effectParams);
    if (audioManager) {
      audioManager.setEffectType(sendNumber, newType);
    }
  };

  const handleParamChange = (param, value) => {
    const newParams = { ...effectParams, [param]: value };
    setEffectParams(newParams);
    onEffectChange?.(sendNumber, effectType, newParams);
    if (audioManager) {
      audioManager.setEffectParam(sendNumber, param, value);
    }
  };

  const effectTypes = [
    { id: 'reverb', name: 'REVERB' },
    { id: 'delay', name: 'DELAY' },
    { id: 'filter', name: 'FILTER' },
    { id: 'flanger', name: 'FLANGER' },
    { id: 'phaser', name: 'PHASER' }
  ];

  return (
    <div className="effects-send">
      <div className="effects-header">
        <h4>FX SEND {sendNumber}</h4>
      </div>

      <div className="effect-type-selector">
        <select 
          value={effectType} 
          onChange={(e) => handleEffectTypeChange(e.target.value)}
          className="effect-type-select"
        >
          {effectTypes.map(type => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      <div className="effect-controls">
        <div className="send-level-control">
          <label>SEND</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={sendLevel}
            onChange={handleSendLevelChange}
            className="send-level-slider"
            orient="vertical"
          />
          <div className="level-value">{Math.round(sendLevel * 100)}%</div>
        </div>

        <div className="effect-params">
          <div className="param-control">
            <label>TIME</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectParams.time}
              onChange={(e) => handleParamChange('time', parseFloat(e.target.value))}
              className="param-slider"
            />
            <span className="param-value">{Math.round(effectParams.time * 100)}%</span>
          </div>

          <div className="param-control">
            <label>FDBK</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectParams.feedback}
              onChange={(e) => handleParamChange('feedback', parseFloat(e.target.value))}
              className="param-slider"
            />
            <span className="param-value">{Math.round(effectParams.feedback * 100)}%</span>
          </div>

          <div className="param-control">
            <label>MIX</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={effectParams.mix}
              onChange={(e) => handleParamChange('mix', parseFloat(e.target.value))}
              className="param-slider"
            />
            <span className="param-value">{Math.round(effectParams.mix * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="effect-status">
        <div className={`effect-indicator ${sendLevel > 0 ? 'active' : ''}`}>
          {effectType.toUpperCase()}
        </div>
      </div>
    </div>
  );
};

export default EffectsSend;