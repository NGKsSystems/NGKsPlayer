/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXSettings.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import './FXSettings.css';

const FXSettings = ({ onSettingsChange, currentSettings = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    // Tier 1 - Always visible (can't be disabled)
    basicControls: true,
    
    // Tier 2 - Optional Advanced Features
    advancedParameters: currentSettings.advancedParameters ?? false,
    outputMetering: currentSettings.outputMetering ?? false,
    presetManagement: currentSettings.presetManagement ?? false,
    routingSelector: currentSettings.routingSelector ?? false,
    
    // Tier 3 - Pro/Studio Features
    visualFeedback: currentSettings.visualFeedback ?? false,
    routingDisplay: currentSettings.routingDisplay ?? false,
    midiLearn: currentSettings.midiLearn ?? false,
    automation: currentSettings.automation ?? false
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('fxSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load FX settings:', e);
      }
    }
  }, []);

  const handleToggle = (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    // Save to localStorage
    localStorage.setItem('fxSettings', JSON.stringify(newSettings));
    
    // Notify parent
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };

  const handlePresetMode = (mode) => {
    let presetSettings = {};
    
    switch (mode) {
      case 'simple':
        presetSettings = {
          basicControls: true,
          advancedParameters: false,
          outputMetering: false,
          presetManagement: false,
          routingSelector: false,
          visualFeedback: false,
          routingDisplay: false,
          midiLearn: false,
          automation: false
        };
        break;
      case 'advanced':
        presetSettings = {
          basicControls: true,
          advancedParameters: true,
          outputMetering: true,
          presetManagement: true,
          routingSelector: true,
          visualFeedback: false,
          routingDisplay: false,
          midiLearn: false,
          automation: false
        };
        break;
      case 'studio':
        presetSettings = {
          basicControls: true,
          advancedParameters: true,
          outputMetering: true,
          presetManagement: true,
          routingSelector: true,
          visualFeedback: true,
          routingDisplay: true,
          midiLearn: true,
          automation: true
        };
        break;
    }
    
    setSettings(presetSettings);
    localStorage.setItem('fxSettings', JSON.stringify(presetSettings));
    if (onSettingsChange) {
      onSettingsChange(presetSettings);
    }
  };

  return (
    <div className="fx-settings-container">
      {/* Settings Icon Button */}
      <button 
        className="fx-settings-toggle"
        onClick={() => setIsOpen(!isOpen)}
        title="FX Display Settings"
      >
        <Settings size={14} />
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <div className="fx-settings-panel">
          <div className="fx-settings-header">
            <h4>FX Display Options</h4>
            <button className="fx-settings-close" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {/* Quick Preset Modes */}
          <div className="fx-settings-presets">
            <button onClick={() => handlePresetMode('simple')} className="preset-btn simple">
              Simple
            </button>
            <button onClick={() => handlePresetMode('advanced')} className="preset-btn advanced">
              Advanced
            </button>
            <button onClick={() => handlePresetMode('studio')} className="preset-btn studio">
              Studio
            </button>
          </div>

          <div className="fx-settings-divider" />

          {/* Individual Feature Toggles */}
          <div className="fx-settings-section">
            <div className="fx-settings-section-title">Core Features</div>
            <label className="fx-settings-item disabled">
              <input type="checkbox" checked={true} disabled />
              <span>Basic Controls</span>
              <span className="fx-settings-tag always">Always On</span>
            </label>
          </div>

          <div className="fx-settings-section">
            <div className="fx-settings-section-title">Advanced Features</div>
            
            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.advancedParameters}
                onChange={() => handleToggle('advancedParameters')}
              />
              <span>Per-Effect Parameters</span>
              <span className="fx-settings-desc">Detailed controls for each effect type</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.routingSelector}
                onChange={() => handleToggle('routingSelector')}
              />
              <span>Routing Selector</span>
              <span className="fx-settings-desc">Choose which deck(s) to apply FX to</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.outputMetering}
                onChange={() => handleToggle('outputMetering')}
              />
              <span>Output Metering</span>
              <span className="fx-settings-desc">Visual level meter for FX output</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.presetManagement}
                onChange={() => handleToggle('presetManagement')}
              />
              <span>Preset Management</span>
              <span className="fx-settings-desc">Save and recall FX configurations</span>
            </label>
          </div>

          <div className="fx-settings-section">
            <div className="fx-settings-section-title">Pro/Studio Features</div>
            
            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.visualFeedback}
                onChange={() => handleToggle('visualFeedback')}
              />
              <span>Visual Feedback</span>
              <span className="fx-settings-desc">Graphs and waveform displays</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.routingDisplay}
                onChange={() => handleToggle('routingDisplay')}
              />
              <span>Routing Display</span>
              <span className="fx-settings-desc">Show FX chain and signal flow</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.midiLearn}
                onChange={() => handleToggle('midiLearn')}
              />
              <span>MIDI Learn Mode</span>
              <span className="fx-settings-desc">Map MIDI controllers to FX</span>
            </label>

            <label className="fx-settings-item">
              <input 
                type="checkbox" 
                checked={settings.automation}
                onChange={() => handleToggle('automation')}
              />
              <span>Automation</span>
              <span className="fx-settings-desc">Record and playback parameter changes</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default FXSettings;

