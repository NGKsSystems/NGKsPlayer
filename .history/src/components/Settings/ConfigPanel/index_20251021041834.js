import React, { useState, useCallback, useEffect } from 'react';

const ConfigPanel = ({
  config = {},
  onConfigChange = () => {},
  onResetConfig = () => {},
  onExportConfig = () => {},
  onImportConfig = () => {}
}) => {
  const [activeSection, setActiveSection] = useState('audio');
  const [tempConfig, setTempConfig] = useState(config);
  const [hasChanges, setHasChanges] = useState(false);

  // Update temp config when prop changes
  useEffect(() => {
    setTempConfig(config);
    setHasChanges(false);
  }, [config]);

  // Check for changes
  useEffect(() => {
    const changed = JSON.stringify(tempConfig) !== JSON.stringify(config);
    setHasChanges(changed);
  }, [tempConfig, config]);

  const handleTempConfigChange = useCallback((section, key, value) => {
    setTempConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  }, []);

  const handleApplyChanges = useCallback(() => {
    onConfigChange(tempConfig);
    setHasChanges(false);
  }, [tempConfig, onConfigChange]);

  const handleRevertChanges = useCallback(() => {
    setTempConfig(config);
    setHasChanges(false);
  }, [config]);

  const handleSectionReset = useCallback((section) => {
    if (window.confirm(`Reset ${section} settings to defaults?`)) {
      const defaultConfigs = {
        audio: {
          sampleRate: 44100,
          bufferSize: 2048,
          masterVolume: 0.8,
          crossfaderCurve: 'linear',
          eqEnabled: true,
          limiterEnabled: true,
          limiterThreshold: -3,
          latencyCompensation: 0
        },
        ui: {
          theme: 'dark',
          compactMode: false,
          showTooltips: true,
          animationsEnabled: true,
          widgetOpacity: 0.95,
          gridSnap: true,
          autoSave: true,
          confirmActions: true
        },
        performance: {
          maxConcurrentSamples: 64,
          analyzerFftSize: 2048,
          waveformResolution: 512,
          vuMeterUpdateRate: 30,
          enableGpuAcceleration: true,
          reducedAnimations: false,
          lowPowerMode: false
        },
        shortcuts: {
          playPauseA: 'Space',
          playPauseB: 'Shift+Space',
          cueA: 'Q',
          cueB: 'W',
          crossfaderLeft: 'A',
          crossfaderRight: 'S',
          loopA: 'Z',
          loopB: 'X',
          recordSequence: 'R'
        }
      };

      setTempConfig(prev => ({
        ...prev,
        [section]: defaultConfigs[section] || {}
      }));
    }
  }, []);

  // Configuration sections
  const configSections = {
    audio: {
      title: 'Audio Settings',
      icon: '🔊',
      fields: [
        { key: 'sampleRate', label: 'Sample Rate', type: 'select', options: [22050, 44100, 48000, 96000], unit: 'Hz' },
        { key: 'bufferSize', label: 'Buffer Size', type: 'select', options: [512, 1024, 2048, 4096], unit: 'samples' },
        { key: 'masterVolume', label: 'Master Volume', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'crossfaderCurve', label: 'Crossfader Curve', type: 'select', options: ['linear', 'logarithmic', 'exponential'] },
        { key: 'eqEnabled', label: 'EQ Enabled', type: 'checkbox' },
        { key: 'limiterEnabled', label: 'Limiter Enabled', type: 'checkbox' },
        { key: 'limiterThreshold', label: 'Limiter Threshold', type: 'range', min: -20, max: 0, step: 0.5, unit: 'dB' },
        { key: 'latencyCompensation', label: 'Latency Compensation', type: 'range', min: -50, max: 50, step: 1, unit: 'ms' }
      ]
    },
    ui: {
      title: 'User Interface',
      icon: '🎨',
      fields: [
        { key: 'theme', label: 'Theme', type: 'select', options: ['dark', 'light', 'auto'] },
        { key: 'compactMode', label: 'Compact Mode', type: 'checkbox' },
        { key: 'showTooltips', label: 'Show Tooltips', type: 'checkbox' },
        { key: 'animationsEnabled', label: 'Enable Animations', type: 'checkbox' },
        { key: 'widgetOpacity', label: 'Widget Opacity', type: 'range', min: 0.5, max: 1, step: 0.05 },
        { key: 'gridSnap', label: 'Grid Snap', type: 'checkbox' },
        { key: 'autoSave', label: 'Auto Save', type: 'checkbox' },
        { key: 'confirmActions', label: 'Confirm Destructive Actions', type: 'checkbox' }
      ]
    },
    performance: {
      title: 'Performance',
      icon: '⚡',
      fields: [
        { key: 'maxConcurrentSamples', label: 'Max Concurrent Samples', type: 'number', min: 16, max: 128 },
        { key: 'analyzerFftSize', label: 'Analyzer FFT Size', type: 'select', options: [512, 1024, 2048, 4096] },
        { key: 'waveformResolution', label: 'Waveform Resolution', type: 'select', options: [256, 512, 1024, 2048] },
        { key: 'vuMeterUpdateRate', label: 'VU Meter Update Rate', type: 'range', min: 10, max: 60, step: 5, unit: 'fps' },
        { key: 'enableGpuAcceleration', label: 'GPU Acceleration', type: 'checkbox' },
        { key: 'reducedAnimations', label: 'Reduced Animations', type: 'checkbox' },
        { key: 'lowPowerMode', label: 'Low Power Mode', type: 'checkbox' }
      ]
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      icon: '⌨️',
      fields: [
        { key: 'playPauseA', label: 'Play/Pause A', type: 'text' },
        { key: 'playPauseB', label: 'Play/Pause B', type: 'text' },
        { key: 'cueA', label: 'Cue A', type: 'text' },
        { key: 'cueB', label: 'Cue B', type: 'text' },
        { key: 'crossfaderLeft', label: 'Crossfader Left', type: 'text' },
        { key: 'crossfaderRight', label: 'Crossfader Right', type: 'text' },
        { key: 'loopA', label: 'Loop A', type: 'text' },
        { key: 'loopB', label: 'Loop B', type: 'text' },
        { key: 'recordSequence', label: 'Record Sequence', type: 'text' }
      ]
    }
  };

  const renderField = (section, field) => {
    const value = tempConfig[section]?.[field.key];
    const fieldId = `${section}-${field.key}`;

    switch (field.type) {
      case 'checkbox':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleTempConfigChange(section, field.key, e.target.checked)}
              className="accent-blue-500"
            />
            <span className="text-sm text-white">{field.label}</span>
          </label>
        );

      case 'range':
        return (
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor={fieldId} className="text-sm text-white">{field.label}</label>
              <span className="text-sm text-gray-400">
                {(value || field.min) + (field.unit ? ` ${field.unit}` : '')}
              </span>
            </div>
            <input
              id={fieldId}
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={value || field.min}
              onChange={(e) => handleTempConfigChange(section, field.key, parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>
        );

      case 'select':
        return (
          <div className="space-y-1">
            <label htmlFor={fieldId} className="text-sm text-white">{field.label}</label>
            <select
              id={fieldId}
              value={value || field.options[0]}
              onChange={(e) => {
                const newValue = field.options.includes(parseInt(e.target.value)) 
                  ? parseInt(e.target.value) 
                  : e.target.value;
                handleTempConfigChange(section, field.key, newValue);
              }}
              className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {field.options.map(option => (
                <option key={option} value={option}>
                  {option}{field.unit ? ` ${field.unit}` : ''}
                </option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div className="space-y-1">
            <label htmlFor={fieldId} className="text-sm text-white">{field.label}</label>
            <input
              id={fieldId}
              type="number"
              min={field.min}
              max={field.max}
              value={value || field.min}
              onChange={(e) => handleTempConfigChange(section, field.key, parseInt(e.target.value))}
              className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
        );

      case 'text':
        return (
          <div className="space-y-1">
            <label htmlFor={fieldId} className="text-sm text-white">{field.label}</label>
            <input
              id={fieldId}
              type="text"
              value={value || ''}
              onChange={(e) => handleTempConfigChange(section, field.key, e.target.value)}
              className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              placeholder="Press key combination..."
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="config-panel bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="panel-header text-xs text-white mb-3 text-center font-bold">
        CONFIGURATION
      </div>

      {/* Changes Bar */}
      {hasChanges && (
        <div className="changes-bar mb-4 p-2 bg-yellow-900 border border-yellow-600 rounded">
          <div className="flex justify-between items-center">
            <span className="text-yellow-300 text-sm">You have unsaved changes</span>
            <div className="flex space-x-2">
              <button
                onClick={handleApplyChanges}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded"
              >
                Apply
              </button>
              <button
                onClick={handleRevertChanges}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Tabs */}
      <div className="section-tabs flex mb-4 bg-gray-800 rounded">
        {Object.entries(configSections).map(([key, section]) => (
          <button
            key={key}
            onClick={() => setActiveSection(key)}
            className={`tab-btn flex-1 p-2 text-xs font-medium rounded transition-colors ${
              activeSection === key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {section.icon} {section.title}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="section-content flex-1 overflow-y-auto">
        {Object.entries(configSections).map(([key, section]) => {
          if (activeSection !== key) return null;

          return (
            <div key={key} className="section">
              <div className="section-header flex justify-between items-center mb-4">
                <h3 className="text-sm text-white font-medium">
                  {section.icon} {section.title}
                </h3>
                <button
                  onClick={() => handleSectionReset(key)}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                >
                  Reset
                </button>
              </div>

              <div className="section-fields space-y-4">
                {section.fields.map(field => (
                  <div key={field.key} className="field-group">
                    {renderField(key, field)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons mt-4 pt-3 border-t border-gray-700">
        <div className="buttons-grid grid grid-cols-2 gap-2">
          <button
            onClick={() => onExportConfig(tempConfig)}
            className="p-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded"
          >
            Export Config
          </button>
          <button
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json';
              input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const importedConfig = JSON.parse(event.target.result);
                      onImportConfig(importedConfig);
                    } catch (error) {
                      alert('Invalid configuration file');
                    }
                  };
                  reader.readAsText(file);
                }
              };
              input.click();
            }}
            className="p-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded"
          >
            Import Config
          </button>
          <button
            onClick={() => {
              if (window.confirm('Reset all settings to defaults? This cannot be undone.')) {
                onResetConfig();
              }
            }}
            className="col-span-2 p-2 bg-red-700 hover:bg-red-600 text-white text-sm rounded"
          >
            Reset All to Defaults
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;