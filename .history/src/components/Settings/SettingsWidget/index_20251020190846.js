import React, { useState, useCallback, useEffect } from 'react';
import DraggableWidget from '../../DraggableWidget';
import VisibilityControls from '../VisibilityControls';
import PresetManager from '../PresetManager';
import ConfigPanel from '../ConfigPanel';

const SettingsWidget = ({
  id = 'settings-widget',
  isVisible = true,
  onVisibilityChange = () => {},
  settings = {},
  onToggleSetting = () => {},
  onResetSettings = () => {}
}) => {
  // Settings state
  const [presets, setPresets] = useState([]);
  const [currentPreset, setCurrentPreset] = useState(null);
  const [config, setConfig] = useState({
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
  });

  // UI state
  const [activeTab, setActiveTab] = useState('visibility');
  const [showInfo, setShowInfo] = useState(false);

  // Storage keys
  const PRESETS_STORAGE_KEY = 'djsimple-presets';
  const CONFIG_STORAGE_KEY = 'djsimple-config';

  // Load data from localStorage
  useEffect(() => {
    try {
      // Load presets
      const savedPresets = localStorage.getItem(PRESETS_STORAGE_KEY);
      if (savedPresets) {
        setPresets(JSON.parse(savedPresets));
      }

      // Load config
      const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      console.warn('Failed to load settings data:', error);
    }
  }, []);

  // Save data to localStorage
  const savePresets = useCallback((newPresets) => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets));
    } catch (error) {
      console.error('Failed to save presets:', error);
    }
  }, []);

  const saveConfig = useCallback((newConfig) => {
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }, []);

  // Preset management
  const handleSavePreset = useCallback((preset) => {
    const newPreset = {
      ...preset,
      id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const newPresets = [...presets, newPreset];
    setPresets(newPresets);
    savePresets(newPresets);
  }, [presets, savePresets]);

  const handleLoadPreset = useCallback((presetSettings) => {
    // Apply preset settings to visibility controls
    Object.entries(presetSettings).forEach(([key, value]) => {
      if (settings[key] !== value) {
        onToggleSetting(key);
      }
    });
    
    setCurrentPreset(presetSettings);
  }, [settings, onToggleSetting]);

  const handleDeletePreset = useCallback((presetId) => {
    const newPresets = presets.filter(p => p.id !== presetId);
    setPresets(newPresets);
    savePresets(newPresets);
  }, [presets, savePresets]);

  const handleExportPreset = useCallback((preset) => {
    // Export functionality is handled within PresetManager
  }, []);

  const handleImportPreset = useCallback(() => {
    // Import functionality is handled within PresetManager
  }, []);

  // Apply quick preset
  const handleApplyPreset = useCallback((presetSettings) => {
    handleLoadPreset(presetSettings);
  }, [handleLoadPreset]);

  // Config management
  const handleConfigChange = useCallback((newConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
  }, [saveConfig]);

  const handleResetConfig = useCallback(() => {
    const defaultConfig = {
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
    
    setConfig(defaultConfig);
    saveConfig(defaultConfig);
  }, [saveConfig]);

  const handleExportConfig = useCallback((configToExport) => {
    const exportData = {
      config: configToExport,
      presets: presets,
      settings: settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `djsimple_settings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [presets, settings]);

  const handleImportConfig = useCallback((importedData) => {
    try {
      if (importedData.config) {
        setConfig(importedData.config);
        saveConfig(importedData.config);
      }
      
      if (importedData.presets) {
        setPresets(importedData.presets);
        savePresets(importedData.presets);
      }
      
      if (importedData.settings) {
        // Apply imported settings
        Object.entries(importedData.settings).forEach(([key, value]) => {
          if (settings[key] !== value) {
            onToggleSetting(key);
          }
        });
      }
      
      alert('Settings imported successfully!');
    } catch (error) {
      alert('Failed to import settings. Please check the file format.');
    }
  }, [settings, onToggleSetting, saveConfig, savePresets]);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'visibility':
        return (
          <div className="visibility-section h-full">
            <VisibilityControls
              settings={settings}
              onToggleSetting={onToggleSetting}
              onResetSettings={onResetSettings}
              onApplyPreset={handleApplyPreset}
            />
          </div>
        );
      
      case 'presets':
        return (
          <div className="presets-section h-full">
            <PresetManager
              presets={presets}
              currentPreset={currentPreset}
              onSavePreset={handleSavePreset}
              onLoadPreset={handleLoadPreset}
              onDeletePreset={handleDeletePreset}
              onExportPreset={handleExportPreset}
              onImportPreset={handleImportPreset}
              settings={settings}
            />
          </div>
        );
      
      case 'config':
        return (
          <div className="config-section h-full">
            <ConfigPanel
              config={config}
              onConfigChange={handleConfigChange}
              onResetConfig={handleResetConfig}
              onExportConfig={handleExportConfig}
              onImportConfig={handleImportConfig}
            />
          </div>
        );
      
      case 'about':
        return (
          <div className="about-section h-full p-4 bg-gray-900 rounded-lg overflow-y-auto">
            <div className="about-content space-y-4">
              <div className="app-info text-center">
                <div className="app-logo text-4xl mb-2">🎧</div>
                <h2 className="text-xl text-white font-bold">DJ Simple Player</h2>
                <p className="text-sm text-gray-400">Professional DJ Software</p>
                <p className="text-xs text-gray-500 mt-1">Version 2.0.0</p>
              </div>

              <div className="features-info">
                <h3 className="text-sm text-white font-bold mb-2">🎵 Features:</h3>
                <ul className="text-xs text-gray-400 space-y-1">
                  <li>• Dual deck mixing with crossfader</li>
                  <li>• 10-band parametric EQ per deck</li>
                  <li>• Professional sample pads with sequencing</li>
                  <li>• Comprehensive music library management</li>
                  <li>• Real-time waveform visualization</li>
                  <li>• Advanced effects and filters</li>
                  <li>• Customizable widget layout</li>
                  <li>• Keyboard shortcuts support</li>
                </ul>
              </div>

              <div className="stats-info">
                <h3 className="text-sm text-white font-bold mb-2">📊 Statistics:</h3>
                <div className="stats-grid grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div>Widgets: {Object.keys(settings).length}</div>
                  <div>Visible: {Object.values(settings).filter(Boolean).length}</div>
                  <div>Presets: {presets.length}</div>
                  <div>Audio: {config.audio?.sampleRate || 44100}Hz</div>
                </div>
              </div>

              <div className="shortcuts-info">
                <h3 className="text-sm text-white font-bold mb-2">⌨️ Quick Shortcuts:</h3>
                <div className="shortcuts-list text-xs text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Play/Pause A:</span>
                    <span className="text-white">{config.shortcuts?.playPauseA || 'Space'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Play/Pause B:</span>
                    <span className="text-white">{config.shortcuts?.playPauseB || 'Shift+Space'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cue A/B:</span>
                    <span className="text-white">{config.shortcuts?.cueA || 'Q'} / {config.shortcuts?.cueB || 'W'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Loop A/B:</span>
                    <span className="text-white">{config.shortcuts?.loopA || 'Z'} / {config.shortcuts?.loopB || 'X'}</span>
                  </div>
                </div>
              </div>

              <div className="support-info">
                <h3 className="text-sm text-white font-bold mb-2">🛠️ Support:</h3>
                <p className="text-xs text-gray-400">
                  For technical support and updates, check the application documentation.
                  Built with React and Web Audio API for professional audio performance.
                </p>
              </div>

              <div className="build-info mt-4 pt-4 border-t border-gray-700 text-center">
                <p className="text-xs text-gray-500">
                  Built: {new Date().toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500">
                  Modular Architecture • Professional Audio • Cross-Platform
                </p>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <DraggableWidget 
      id={id}
      title="SETTINGS & CONFIGURATION"
      onClose={() => onVisibilityChange(false)}
      width={520}
      height={640}
      className="settings-widget"
    >
      <div className="settings-content h-full flex flex-col bg-gray-900">
        {/* Tab Navigation */}
        <div className="tab-nav flex bg-gray-800 border-b border-gray-700">
          {[
            { id: 'visibility', label: '👁️ Widgets', title: 'Widget Visibility' },
            { id: 'presets', label: '📋 Presets', title: 'Layout Presets' },
            { id: 'config', label: '⚙️ Config', title: 'Configuration' },
            { id: 'about', label: 'ℹ️ About', title: 'About Application' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn flex-1 p-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={tab.title}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Bar */}
        <div className="status-bar bg-gray-800 px-3 py-1 text-xs border-b border-gray-700">
          <div className="flex justify-between items-center text-gray-400">
            <div className="status-left">
              {activeTab === 'visibility' && `${Object.values(settings).filter(Boolean).length}/${Object.keys(settings).length} widgets visible`}
              {activeTab === 'presets' && `${presets.length} custom presets saved`}
              {activeTab === 'config' && `Audio: ${config.audio?.sampleRate || 44100}Hz • Buffer: ${config.audio?.bufferSize || 2048}`}
              {activeTab === 'about' && 'DJ Simple Player v2.0.0'}
            </div>
            <div className="status-right">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className={`info-btn p-1 rounded text-xs ${showInfo ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                title="Toggle help info"
              >
                ?
              </button>
            </div>
          </div>
        </div>

        {/* Help Info */}
        {showInfo && (
          <div className="help-info bg-blue-900 border-b border-blue-700 p-2 text-xs text-blue-200">
            <div className="help-content">
              {activeTab === 'visibility' && 'Control which widgets are visible in your DJ interface. Use categories and presets for quick layouts.'}
              {activeTab === 'presets' && 'Save and load custom widget layouts. Export presets to share with others or backup your configurations.'}
              {activeTab === 'config' && 'Adjust audio settings, performance options, and keyboard shortcuts. Changes apply immediately.'}
              {activeTab === 'about' && 'Application information, version details, and quick reference for keyboard shortcuts.'}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="tab-content flex-1 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </DraggableWidget>
  );
};

export default SettingsWidget;