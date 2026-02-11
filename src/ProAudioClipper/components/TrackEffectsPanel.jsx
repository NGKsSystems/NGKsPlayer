/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TrackEffectsPanel.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Track Effects Panel - Professional Effects Interface
 * 
 * A comprehensive effects panel for managing professional audio effects
 * on individual tracks, similar to Pro Tools or Logic Pro insert slots.
 * 
 * Features:
 * - Drag-and-drop effects ordering
 * - Real-time parameter control
 * - Visual feedback and metering
 * - Preset management
 * - Bypass and wet/dry controls
 * - Professional knob and slider controls
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Plus, X, Power, MoreVertical, RotateCcw, Save, Menu } from 'lucide-react';
import './TrackEffectsPanel.css';

const TrackEffectsPanel = ({ 
  trackId, 
  trackName, 
  effectsEngine,
  onClose 
}) => {
  const [effects, setEffects] = useState([]);
  const [availableEffects, setAvailableEffects] = useState([]);
  const [showEffectBrowser, setShowEffectBrowser] = useState(false);
  const [selectedEffect, setSelectedEffect] = useState(null);
  const [engineStats, setEngineStats] = useState({ cpuUsage: 0, latency: 0 });

  // Load effects and available effects on mount
  useEffect(() => {
    if (effectsEngine) {
      const trackEffects = effectsEngine.getTrackEffects(trackId);
      const available = effectsEngine.getAvailableEffects();
      setEffects(trackEffects);
      setAvailableEffects(available);
    }
  }, [effectsEngine, trackId]);

  // Update engine stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (effectsEngine) {
        const stats = effectsEngine.getEffectsEngineStats();
        setEngineStats(stats);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [effectsEngine]);

  const handleAddEffect = useCallback((effectType) => {
    if (effectsEngine) {
      const effect = effectsEngine.addEffectToTrack(trackId, effectType);
      if (effect) {
        const updatedEffects = effectsEngine.getTrackEffects(trackId);
        setEffects(updatedEffects);
        setSelectedEffect(effect);
      }
    }
    setShowEffectBrowser(false);
  }, [effectsEngine, trackId]);

  const handleRemoveEffect = useCallback((effectId) => {
    if (effectsEngine) {
      effectsEngine.removeEffectFromTrack(trackId, effectId);
      const updatedEffects = effectsEngine.getTrackEffects(trackId);
      setEffects(updatedEffects);
      
      if (selectedEffect && selectedEffect.id === effectId) {
        setSelectedEffect(null);
      }
    }
  }, [effectsEngine, trackId, selectedEffect]);

  const handleParameterChange = useCallback((effectId, parameterName, value) => {
    if (effectsEngine) {
      effectsEngine.setEffectParameter(trackId, effectId, parameterName, value);
      
      // Update local state to trigger re-render
      const updatedEffects = effectsEngine.getTrackEffects(trackId);
      setEffects(updatedEffects);
    }
  }, [effectsEngine, trackId]);

  const handleBypassEffect = useCallback((effectId) => {
    const effect = effects.find(e => e.id === effectId);
    if (effect && effectsEngine) {
      const newBypassState = !effect.bypass;
      effectsEngine.setEffectParameter(trackId, effectId, 'bypass', newBypassState ? 1 : 0);
      
      const updatedEffects = effectsEngine.getTrackEffects(trackId);
      setEffects(updatedEffects);
    }
  }, [effects, effectsEngine, trackId]);

  const handleReorderEffect = useCallback((effectId, newIndex) => {
    if (effectsEngine) {
      effectsEngine.reorderTrackEffect(trackId, effectId, newIndex);
      const updatedEffects = effectsEngine.getTrackEffects(trackId);
      setEffects(updatedEffects);
    }
  }, [effectsEngine, trackId]);

  // Group available effects by category
  const effectsByCategory = availableEffects.reduce((acc, effect) => {
    const category = effect.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(effect);
    return acc;
  }, {});

  return (
    <div className="track-effects-panel">
      {/* Collapse bar */}
      <button className="collapse-bar" onClick={onClose} title="Collapse Effects Panel">
        COLLAPSE
      </button>

      {/* Header */}
      <div className="effects-panel-header">
        <div className="track-info">
          <h3>{trackName} FX</h3>
          <div className="engine-stats">
            <span className="cpu-usage">CPU: {engineStats.cpuUsage.toFixed(1)}%</span>
            <span className="latency">{engineStats.latency.toFixed(1)}ms</span>
          </div>
        </div>
      </div>

      <div className="effects-panel-content">
        {/* Effects Chain */}
        <div className="effects-chain">
          <div className="chain-header">
            <h4>Effects Chain</h4>
            <button 
              className="add-effect-btn"
              onClick={() => {/* Available Effects always visible below */}}
              title="Available Effects shown below"
            >
              <Plus size={16} />
              Add Effect
            </button>
          </div>

          <div className="effects-slots">
            {effects.map((effect, index) => (
              <EffectSlot
                key={effect.id}
                effect={effect}
                index={index}
                isSelected={selectedEffect?.id === effect.id}
                onSelect={() => setSelectedEffect(effect)}
                onRemove={() => handleRemoveEffect(effect.id)}
                onBypass={() => handleBypassEffect(effect.id)}
                onParameterChange={(paramName, value) => 
                  handleParameterChange(effect.id, paramName, value)
                }
                onReorder={handleReorderEffect}
              />
            ))}
            
            {effects.length === 0 && (
              <div className="empty-chain">
                <p>No effects loaded</p>
                <button 
                  className="add-first-effect"
                  onClick={() => handleAddEffect(availableEffects[0]?.type)}
                >
                  Add your first effect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Always Visible Available Effects */}
        <div className="effect-browser">
          <div className="browser-header">
            <h4>Available Effects</h4>
          </div>
          
          <div className="effect-categories">
            {Object.entries(effectsByCategory).map(([category, categoryEffects]) => (
              <div key={category} className="effect-category">
                <h5>{category}</h5>
                <div className="category-effects">
                  {categoryEffects.map(effect => (
                    <button
                      key={effect.type}
                      className="effect-item"
                      onClick={() => handleAddEffect(effect.type)}
                      title={effect.description}
                    >
                      <span className="effect-name">{effect.name}</span>
                      <span className="effect-description">{effect.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Effect Parameters */}
        {selectedEffect && (
          <div className="effect-parameters">
            <div className="parameters-header">
              <h4>{selectedEffect.constructor.displayName || 'Effect'} Parameters</h4>
              <div className="parameter-actions">
                <button 
                  className="reset-params-btn"
                  title="Reset to Default"
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  className="save-preset-btn"
                  title="Save Preset"
                >
                  <Save size={16} />
                </button>
              </div>
            </div>
            
            <div className="parameters-grid">
              {Array.from(selectedEffect.parameters.entries()).map(([paramName, paramConfig]) => (
                <ParameterControl
                  key={paramName}
                  name={paramName}
                  config={paramConfig}
                  value={paramConfig.value}
                  onChange={(value) => handleParameterChange(selectedEffect.id, paramName, value)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Individual Effect Slot Component
 */
const EffectSlot = ({ 
  effect, 
  index, 
  isSelected, 
  onSelect, 
  onRemove, 
  onBypass,
  onParameterChange,
  onReorder 
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const displayName = effect.constructor.displayName || 'Effect';
  const category = effect.constructor.category || 'Other';

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('text/plain', effect.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const draggedEffectId = e.dataTransfer.getData('text/plain');
    if (draggedEffectId !== effect.id) {
      onReorder(draggedEffectId, index);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div 
      className={`effect-slot ${isSelected ? 'selected' : ''} ${effect.bypass ? 'bypassed' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={onSelect}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="effect-header">
        <div className="effect-info">
          <div className="effect-name">{displayName}</div>
          <div className="effect-category">{category}</div>
        </div>
        
        <div className="effect-controls">
          <button 
            className={`bypass-btn ${effect.bypass ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onBypass();
            }}
            title="Bypass Effect"
          >
            <Power size={14} />
          </button>
          
          <button 
            className="remove-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            title="Remove Effect"
          >
            <X size={14} />
          </button>
          
          <button className="drag-handle" title="Drag to Reorder">
            <Menu size={14} />
          </button>
        </div>
      </div>
      
      {/* Quick Parameter Controls */}
      <div className="quick-params">
        {Array.from(effect.parameters.entries()).slice(0, 3).map(([paramName, paramConfig]) => (
          <div key={paramName} className="quick-param">
            <label>{paramName}</label>
            <input
              type="range"
              min={paramConfig.min}
              max={paramConfig.max}
              step={(paramConfig.max - paramConfig.min) / 100}
              value={paramConfig.value}
              onChange={(e) => onParameterChange(paramName, parseFloat(e.target.value))}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="param-value">
              {paramConfig.value.toFixed(1)}{paramConfig.unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Parameter Control Component
 */
const ParameterControl = ({ name, config, value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const getDisplayValue = () => {
    if (config.unit === 'boolean') {
      return localValue > 0.5 ? 'On' : 'Off';
    }
    if (config.unit === 'enum') {
      return Math.floor(localValue).toString();
    }
    return `${localValue.toFixed(1)}${config.unit}`;
  };

  if (config.unit === 'boolean') {
    return (
      <div className="parameter-control boolean">
        <label>{name}</label>
        <button 
          className={`toggle-btn ${localValue > 0.5 ? 'active' : ''}`}
          onClick={() => handleChange(localValue > 0.5 ? 0 : 1)}
        >
          {localValue > 0.5 ? 'On' : 'Off'}
        </button>
      </div>
    );
  }

  return (
    <div className="parameter-control">
      <label>{name}</label>
      <div className="control-wrapper">
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={(config.max - config.min) / 100}
          value={localValue}
          onChange={(e) => handleChange(parseFloat(e.target.value))}
          className="param-slider"
        />
        <div className="param-display">
          {getDisplayValue()}
        </div>
      </div>
    </div>
  );
};

export default TrackEffectsPanel;
