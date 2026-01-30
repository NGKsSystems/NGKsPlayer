import React, { useState, useEffect, useRef } from 'react';
import { Power, RotateCcw, Zap, Clock, Sliders, Filter, Waves, Volume2 } from 'lucide-react';
import AdvancedAudioFXEngine from '../../../audio/AdvancedAudioFXEngine';
import FXSettings from './FXSettings';
import FXRoutingSelector from './FXRoutingSelector';
import FXOutputMeter from './FXOutputMeter';
import FXPresetManager from './FXPresetManager';
import FXVisualFeedback from './FXVisualFeedback';
import FXMIDILearn from './FXMIDILearn';
import FXAutomation from './FXAutomation';
import './EffectsSend.css';

const EffectsSend = ({ 
  channel,
  audioManager = null,
  sendNumber = 1,
  unitId,
  onSendLevelChange,
  onEffectChange,
  currentBPM = 128,
  bpm,
  audioContext = null
}) => {
  // Use bpm prop if provided, otherwise fall back to currentBPM
  const effectiveBPM = bpm || currentBPM;
  // Professional FX state
  const [fxEngine, setFxEngine] = useState(null);
  const [chainId, setChainId] = useState(null); // Numeric chain ID (1-4)
  const [isEnabled, setIsEnabled] = useState(true);
  const [effectType, setEffectType] = useState('filter');
  const [parameters, setParameters] = useState({
    mix: 0.0,
    param1: 0.5,
    param2: 0.5,
    bpmSync: true
  });
  const [bpmSynced, setBpmSynced] = useState(true);
  
  // FX Display Settings
  const [fxSettings, setFxSettings] = useState({
    basicControls: true,
    advancedParameters: true,  // Show effect parameters by default (professional mode)
    outputMetering: false,
    presetManagement: false,
    routingSelector: false,
    visualFeedback: false,
    routingDisplay: false,
    midiLearn: false,
    automation: false
  });

  // Routing state
  const [routingTarget, setRoutingTarget] = useState(sendNumber === 0 ? 'MASTER' : ['A', 'B', 'C', 'D'][sendNumber - 1]);
  
  // Output metering
  const [outputLevel, setOutputLevel] = useState(0);

  // Initialize FX Engine and connect to AudioManager
  useEffect(() => {
    // Get audio context from audioManager if not provided
    const ctx = audioContext || audioManager?.getAudioContext?.();
    
    if (ctx && !fxEngine && audioManager && channel) {
      console.log(`🎛️ Initializing FX Unit for Deck ${channel}...`);
      
      const engine = new AdvancedAudioFXEngine(ctx);
      
      // Map deck letter to chain ID (A→1, B→2, C→3, D→4)
      // FX chains are already created in the engine constructor
      const chainId = { A: 1, B: 2, C: 3, D: 4 }[channel] || 1;
      console.log(`🔗 Using chain ID ${chainId} for Deck ${channel}`);
      
      // Get the specific chain for this deck
      const chain = engine.fxChains.get(chainId);
      if (!chain) {
        console.error(`❌ Chain ${chainId} not found!`);
        return;
      }
      
      // Route engine input/output through this specific chain (guarded)
      try {
        if (engine.input && chain.input) {
          engine.input.connect(chain.input);
        } else {
          console.warn(`EffectsSend: missing engine.input or chain.input for chain ${chainId}`);
        }

        if (chain.output && engine.output) {
          chain.output.connect(engine.output);
        } else {
          console.warn(`EffectsSend: missing chain.output or engine.output for chain ${chainId}`);
        }
      } catch (err) {
        console.error('EffectsSend: error routing engine <-> chain:', err);
      }
      console.log(`🔗 Engine routed through chain ${chainId}`);
      
      // Add default filter effect
      engine.addEffect(chainId, 'filter', {
        frequency: 1000,
        resonance: 1.0,
        mix: 0.0
      });
      
      // Connect FX chain to deck's audio path via AudioManager
      const connected = audioManager.connectFXChain(
        channel,
        engine.input,
        engine.output
      );
      
      if (connected) {
        console.log(`✅ FX Unit connected to Deck ${channel} audio chain`);
        setFxEngine(engine);
        setChainId(chainId); // Store chain ID for later use
      } else {
        console.error(`❌ Failed to connect FX Unit to Deck ${channel}`);
      }
    }
    
    // Cleanup: disconnect FX chain when component unmounts
    return () => {
      if (fxEngine && audioManager && channel) {
        audioManager.disconnectFXChain(channel, fxEngine.input, fxEngine.output);
        console.log(`🔌 FX Unit disconnected from Deck ${channel}`);
      }
    };
  }, [audioContext, fxEngine, audioManager, channel]);

  // Update BPM for synced effects
  useEffect(() => {
    if (fxEngine && bpmSynced && typeof fxEngine.setBPM === 'function') {
      fxEngine.setBPM(effectiveBPM);
    }
  }, [fxEngine, effectiveBPM, bpmSynced]);

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
    
    if (fxEngine && chainId) {
      fxEngine.setChainEnabled(chainId, newEnabled);
      console.log(`🎛️ FX on Deck ${channel} (chain ${chainId}) ${newEnabled ? 'ENABLED' : 'DISABLED'}`);
    }
    
    onSendLevelChange?.(sendNumber, newEnabled ? parameters.mix : 0);
  };

  // Handle effect type change
  const handleEffectTypeChange = (newType) => {
    setEffectType(newType);
    
    if (fxEngine && chainId) {
      // Remove old effect and add new one
      fxEngine.clearChain(chainId);
      fxEngine.addEffect(chainId, newType, {
        bpmSync: bpmSynced,
        ...parameters
      });
      console.log(`🎚️ FX type changed to ${newType} on Deck ${channel}`);
    }
    
    onEffectChange?.(sendNumber, newType, parameters);
  };

  // Handle parameter changes
  const handleParameterChange = (paramName, value) => {
    const newParams = { ...parameters, [paramName]: value };
    setParameters(newParams);
    
    if (fxEngine && chainId) {
      fxEngine.setEffectParameter(chainId, paramName, value);
    }
    
    if (paramName === 'mix') {
      onSendLevelChange?.(sendNumber, isEnabled ? value : 0);
      // Update output metering
      setOutputLevel(isEnabled ? value * 100 : 0);
    }
  };

  // Handle routing target change
  const handleRoutingChange = (newTarget) => {
    setRoutingTarget(newTarget);
    console.log(`FX Unit ${sendNumber} routing to: ${newTarget}`);
    // TODO: Implement actual routing in AudioManager
  };

  // Handle preset load
  const handlePresetLoad = (effectType, params) => {
    setEffectType(effectType);
    setParameters(params);
    if (fxEngine && isEnabled) {
      fxEngine.clearChain(`unit_${sendNumber}`);
      fxEngine.addEffect(`unit_${sendNumber}`, effectType, params);
    }
    onEffectChange?.(sendNumber, effectType, params);
  };

  // Handle MIDI mapping
  const handleMIDIMapping = (paramName, mapping, value) => {
    if (value !== undefined) {
      // MIDI value received - update parameter
      handleParameterChange(paramName, value);
    } else {
      // Mapping changed - just log it
      console.log(`MIDI mapped: ${paramName} to`, mapping);
    }
  };

  // Handle automation playback
  const handleAutomationChange = (automatedParams) => {
    setParameters(automatedParams);
    if (fxEngine && isEnabled) {
      Object.entries(automatedParams).forEach(([param, value]) => {
        fxEngine.setEffectParameter(`unit_${sendNumber}`, param, value);
      });
    }
  };

  return (
    <div className={`effects-send professional-fx ${isEnabled ? 'fx-active' : ''}`}>
      {/* FX Header with power button - compact */}
      <div className="fx-header-compact">
        <div className="fx-unit-label">{channel === 'MASTER' ? 'MASTER FX' : `FX ${sendNumber}`}</div>
        <button
          onClick={toggleEffect}
          className={`fx-power-btn ${isEnabled ? 'fx-enabled' : ''}`}
          style={{ backgroundColor: isEnabled ? currentEffect.color : '#374151' }}
        >
          <Power className="w-3 h-3" />
        </button>
      </div>

      {/* Effect Type Selection */}
      <div className="fx-type-grid">
        {effectTypes.map(type => (
          <button
            key={type.id}
            onClick={() => handleEffectTypeChange(type.id)}
            className={`fx-type-btn ${effectType === type.id ? 'selected' : ''}`}
            style={{
              backgroundColor: effectType === type.id ? type.color : '#374151',
              color: effectType === type.id ? 'white' : '#9ca3af'
            }}
            disabled={!isEnabled}
          >
            <div className="fx-type-icon">{type.icon}</div>
            <div className="fx-type-name">{type.name}</div>
          </button>
        ))}
      </div>

      {/* Current Effect Display */}
      <div 
        className="fx-current-effect"
        style={{ 
          backgroundColor: `${currentEffect.color}20`,
          borderColor: isEnabled ? currentEffect.color : '#374151'
        }}
      >
        <div className="fx-effect-info">
          {currentEffect.icon}
          <span>{currentEffect.name}</span>
        </div>
        {bpmSynced && (
          <div className="fx-bpm-indicator">
            <Clock className="w-3 h-3" />
            <span>{currentBPM}</span>
          </div>
        )}
      </div>

      {/* Effect Parameters - Always visible (Basic Controls) */}
      <div className="fx-controls">
        {/* Mix/Send Level */}
        <div className="fx-param-control">
          <label className="fx-param-label">MIX</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={parameters.mix}
            onChange={(e) => handleParameterChange('mix', parseFloat(e.target.value))}
            className="fx-param-slider"
            disabled={!isEnabled}
            style={{
              background: isEnabled ? 
                `linear-gradient(to right, ${currentEffect.color} 0%, ${currentEffect.color} ${parameters.mix * 100}%, #374151 ${parameters.mix * 100}%, #374151 100%)` :
                '#374151'
            }}
          />
          <div className="fx-param-value">{Math.round(parameters.mix * 100)}%</div>
        </div>

        {/* Advanced Parameters - Conditional */}
        {fxSettings.advancedParameters && (
          <>
            {/* Parameter 1 */}
            <div className="fx-param-control">
              <label className="fx-param-label">{currentEffect.params.param1.name}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={parameters.param1}
                onChange={(e) => handleParameterChange('param1', parseFloat(e.target.value))}
                className="fx-param-slider"
                disabled={!isEnabled}
                style={{
                  background: isEnabled ? 
                    `linear-gradient(to right, ${currentEffect.color} 0%, ${currentEffect.color} ${parameters.param1 * 100}%, #374151 ${parameters.param1 * 100}%, #374151 100%)` :
                    '#374151'
                }}
              />
              <div className="fx-param-value">
                {Math.round(parameters.param1 * (currentEffect.params.param1.max - currentEffect.params.param1.min) + currentEffect.params.param1.min)}
                {currentEffect.params.param1.unit}
              </div>
            </div>

            {/* Parameter 2 */}
            <div className="fx-param-control">
              <label className="fx-param-label">{currentEffect.params.param2.name}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={parameters.param2}
                onChange={(e) => handleParameterChange('param2', parseFloat(e.target.value))}
                className="fx-param-slider"
                disabled={!isEnabled}
                style={{
                  background: isEnabled ? 
                    `linear-gradient(to right, ${currentEffect.color} 0%, ${currentEffect.color} ${parameters.param2 * 100}%, #374151 ${parameters.param2 * 100}%, #374151 100%)` :
                    '#374151'
                }}
              />
              <div className="fx-param-value">
                {Math.round(parameters.param2 * (currentEffect.params.param2.max - currentEffect.params.param2.min) + currentEffect.params.param2.min)}
                {currentEffect.params.param2.unit}
              </div>
            </div>
          </>
        )}

        {/* BPM Sync Toggle */}
        <div className="fx-bpm-sync">
          <button
            onClick={() => setBpmSynced(!bpmSynced)}
            className={`fx-sync-btn ${bpmSynced ? 'sync-active' : ''}`}
            disabled={!isEnabled}
          >
            <Clock className="w-3 h-3" />
            <span>SYNC</span>
          </button>
        </div>
      </div>

      {/* Visual Feedback */}
      {isEnabled && parameters.mix > 0 && (
        <div className="fx-activity-indicator">
          <div 
            className="fx-activity-bar"
            style={{ 
              width: `${parameters.mix * 100}%`,
              backgroundColor: currentEffect.color
            }}
          />
        </div>
      )}

      {/* Routing Selector - Conditional */}
      {fxSettings.routingSelector && (
        <FXRoutingSelector
          currentTarget={routingTarget}
          onTargetChange={handleRoutingChange}
          availableTargets={sendNumber <= 4 ? ['A', 'B', 'C', 'D', 'MASTER'] : ['A', 'B', 'C', 'D']}
          color={currentEffect.color}
        />
      )}

      {/* Output Metering - Conditional */}
      {fxSettings.outputMetering && (
        <FXOutputMeter
          level={outputLevel}
          color={currentEffect.color}
          isActive={isEnabled}
        />
      )}

      {/* Preset Management - Conditional */}
      {fxSettings.presetManagement && (
        <FXPresetManager
          effectType={effectType}
          currentParams={parameters}
          onLoadPreset={handlePresetLoad}
          color={currentEffect.color}
        />
      )}

      {/* Visual Feedback Canvas - Conditional */}
      {fxSettings.visualFeedback && isEnabled && (
        <FXVisualFeedback
          effectType={effectType}
          param1={parameters.param1}
          param2={parameters.param2}
          isActive={isEnabled && parameters.mix > 0}
          color={currentEffect.color}
        />
      )}

      {/* MIDI Learn - Conditional */}
      {fxSettings.midiLearn && (
        <FXMIDILearn
          effectType={effectType}
          parameters={parameters}
          onMIDIMapping={handleMIDIMapping}
          color={currentEffect.color}
        />
      )}

      {/* Automation - Conditional */}
      {fxSettings.automation && (
        <FXAutomation
          effectType={effectType}
          parameters={parameters}
          onAutomationChange={handleAutomationChange}
          color={currentEffect.color}
        />
      )}
    </div>
  );
};

export default EffectsSend;