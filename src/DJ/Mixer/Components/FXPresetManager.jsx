/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXPresetManager.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import { Save, FolderOpen, Trash2, Plus } from 'lucide-react';
import './FXPresetManager.css';

const FXPresetManager = ({ currentEffect, currentParams, onLoadPreset, color = '#3498db' }) => {
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  useEffect(() => {
    // Load presets from localStorage
    const savedPresets = localStorage.getItem('fxPresets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    }
  }, []);

  const savePreset = () => {
    if (!presetName.trim()) return;

    const newPreset = {
      id: Date.now(),
      name: presetName.trim(),
      effectType: currentEffect,
      parameters: { ...currentParams },
      createdAt: new Date().toISOString()
    };

    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    localStorage.setItem('fxPresets', JSON.stringify(updatedPresets));
    
    setPresetName('');
    setShowSaveDialog(false);
  };

  const loadPreset = (preset) => {
    if (onLoadPreset) {
      onLoadPreset(preset.effectType, preset.parameters);
    }
  };

  const deletePreset = (id) => {
    const updatedPresets = presets.filter(p => p.id !== id);
    setPresets(updatedPresets);
    localStorage.setItem('fxPresets', JSON.stringify(updatedPresets));
  };

  return (
    <div className="fx-preset-manager">
      <div className="fx-preset-header">
        <span className="fx-preset-title">PRESETS</span>
        <button
          className="fx-preset-save-btn"
          onClick={() => setShowSaveDialog(!showSaveDialog)}
          title="Save current settings as preset"
        >
          <Plus size={12} />
        </button>
      </div>

      {showSaveDialog && (
        <div className="fx-preset-save-dialog">
          <input
            type="text"
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && savePreset()}
            className="fx-preset-input"
            autoFocus
          />
          <button onClick={savePreset} className="fx-preset-confirm-btn" style={{ background: color }}>
            <Save size={12} />
          </button>
        </div>
      )}

      <div className="fx-preset-list">
        {presets.length === 0 ? (
          <div className="fx-preset-empty">No saved presets</div>
        ) : (
          presets.map(preset => (
            <div key={preset.id} className="fx-preset-item">
              <button
                onClick={() => loadPreset(preset)}
                className="fx-preset-load-btn"
              >
                <FolderOpen size={12} />
                <span>{preset.name}</span>
                <span className="fx-preset-effect-type">{preset.effectType}</span>
              </button>
              <button
                onClick={() => deletePreset(preset.id)}
                className="fx-preset-delete-btn"
                title="Delete preset"
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FXPresetManager;

