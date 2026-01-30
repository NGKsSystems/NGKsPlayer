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

  // Initialize FX Engine
  useEffect(() => {
    if (audioContext && !fxEngine) {
      console.log(`🎛️ Initializing FX Unit ${sendNumber}...`);
      const engine = new AdvancedAudioFXEngine(audioContext);
      engine.createEffectChain(`unit_${sendNumber}`);
      setFxEngine(engine);
    }
  }, [audioContext, sendNumber, fxEngine]);

  // Update BPM for synced effects
  useEffect(() => {
    if (fxEngine && bpmSynced) {
      fxEngine.setBPM(currentBPM);
    }
  }, [fxEngine, currentBPM, bpmSynced]);

  // Professional effect library with DJ focus
  const effectTypes = [
    { 
      id: 'filter', 
      name: 'FILTER', 
      icon: <Filter className="w-3 h-3" />,
      color: '#3b82f6',
      params: {
        param1: { name: 'FREQ', unit: 'Hz', min: 20, max: 20000 },
        param2: { name: 'RES', unit: 'Q', min: 0.1, max: 30 }
      }
    },
    { 
      id: 'delay', 
      name: 'DELAY', 
      icon: <Waves className="w-3 h-3" />,
      color: '#10b981',
      params: {
        param1: { name: 'TIME', unit: 'ms', min: 1, max: 2000 },
        param2: { name: 'FDBK', unit: '%', min: 0, max: 95 }
      }
    },
    { 
      id: 'reverb', 
      name: 'REVERB', 
      icon: <Volume2 className="w-3 h-3" />,
      color: '#8b5cf6',
      params: {
        param1: { name: 'SIZE', unit: '%', min: 0, max: 100 },
        param2: { name: 'DECAY', unit: 's', min: 0.1, max: 10 }
      }
    },
    { 
      id: 'roll', 
      name: 'ROLL', 
      icon: <RotateCcw className="w-3 h-3" />,
      color: '#ef4444',
      params: {
        param1: { name: 'RATE', unit: 'div', min: 1, max: 32 },
        param2: { name: 'GATE', unit: '%', min: 0, max: 100 }
      }
    },
    { 
      id: 'transform', 
      name: 'TRANS', 
      icon: <Zap className="w-3 h-3" />,
      color: '#f59e0b',
      params: {
        param1: { name: 'DEPTH', unit: '%', min: 0, max: 100 },
        param2: { name: 'RATE', unit: 'Hz', min: 0.1, max: 20 }
      }
    },
    { 
      id: 'bitcrusher', 
      name: 'CRUSH', 
      icon: <Sliders className="w-3 h-3" />,
      color: '#f97316',
      params: {
        param1: { name: 'BITS', unit: 'bit', min: 1, max: 16 },
        param2: { name: 'RATE', unit: 'kHz', min: 1, max: 48 }
      }
    }
  ];

  const currentEffect = effectTypes.find(e => e.id === effectType) || effectTypes[0];

  // Handle effect enable/disable
  const toggleEffect = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    
    if (fxEngine) {
      fxEngine.setChainEnabled(`unit_${sendNumber}`, newEnabled);
    }
    
    onSendLevelChange?.(sendNumber, newEnabled ? parameters.mix : 0);
  };

  // Handle effect type change
  const handleEffectTypeChange = (newType) => {
    setEffectType(newType);
    
    if (fxEngine && isEnabled) {
      // Remove old effect and add new one
      fxEngine.clearChain(`unit_${sendNumber}`);
      fxEngine.addEffect(`unit_${sendNumber}`, newType, {
        bpmSync: bpmSynced,
        ...parameters
      });
    }
    
    onEffectChange?.(sendNumber, newType, parameters);
  };

  // Handle parameter changes
  const handleParameterChange = (paramName, value) => {
    const newParams = { ...parameters, [paramName]: value };
    setParameters(newParams);
    
    if (fxEngine && isEnabled) {
      fxEngine.setEffectParameter(`unit_${sendNumber}`, paramName, value);
    }
    
    if (paramName === 'mix') {
      onSendLevelChange?.(sendNumber, isEnabled ? value : 0);
    }
  };

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