import React, { useState, useCallback, useMemo } from 'react';

const PresetManager = ({
  presets = [],
  currentPreset = null,
  onSavePreset = () => {},
  onLoadPreset = () => {},
  onDeletePreset = () => {},
  onExportPreset = () => {},
  onImportPreset = () => {},
  settings = {}
}) => {
  const [presetName, setPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importData, setImportData] = useState('');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [sortBy, setSortBy] = useState('name');

  // Built-in preset templates
  const builtInPresets = {
    'Minimal DJ': {
      name: 'Minimal DJ',
      description: 'Essential controls only',
      settings: {
        transport: true,
        jogWheel: true,
        crossfader: true,
        masterVol: true,
        eqA: true,
        eqB: true
      },
      isBuiltIn: true
    },
    'Full Professional': {
      name: 'Full Professional',
      description: 'Complete DJ setup with all features',
      settings: {
        transport: true,
        navigation: true,
        pitchFader: true,
        fineTune: true,
        jogWheel: true,
        crossfader: true,
        volumeLeft: true,
        volumeRight: true,
        gainA: true,
        gainB: true,
        reverbA: true,
        reverbB: true,
        filterA: true,
        filterB: true,
        eqA: true,
        eqB: true,
        libraryA: true,
        libraryB: true,
        snippets: true,
        visualizersA: true,
        visualizersB: true,
        masterVol: true,
        cueVol: true,
        micInput: true,
        micGain: true
      },
      isBuiltIn: true
    },
    'Producer Focus': {
      name: 'Producer Focus',
      description: 'For music production and sampling',
      settings: {
        snippets: true,
        eqA: true,
        eqB: true,
        libraryA: true,
        libraryB: true,
        reverbA: true,
        reverbB: true,
        filterA: true,
        filterB: true,
        visualizersA: true,
        visualizersB: true,
        masterVol: true,
        transport: true,
        jogWheel: true
      },
      isBuiltIn: true
    },
    'Live Performance': {
      name: 'Live Performance',
      description: 'Optimized for live DJ sets',
      settings: {
        transport: true,
        jogWheel: true,
        crossfader: true,
        volumeLeft: true,
        volumeRight: true,
        gainA: true,
        gainB: true,
        eqA: true,
        eqB: true,
        libraryA: true,
        libraryB: true,
        pitchFader: true,
        fineTune: true,
        cueVol: true,
        masterVol: true,
        loopControls: true,
        cuePoints: true
      },
      isBuiltIn: true
    }
  };

  // Combine built-in and user presets
  const allPresets = useMemo(() => {
    const combined = [
      ...Object.values(builtInPresets),
      ...presets.map(preset => ({ ...preset, isBuiltIn: false }))
    ];

    // Sort presets
    combined.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0);
        case 'type':
          return a.isBuiltIn === b.isBuiltIn ? 0 : a.isBuiltIn ? -1 : 1;
        default:
          return 0;
      }
    });

    return combined;
  }, [presets, sortBy]);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const preset = {
      name: presetName.trim(),
      description: `Custom preset created ${new Date().toLocaleDateString()}`,
      settings: { ...settings },
      dateCreated: new Date().toISOString(),
      widgetCount: Object.values(settings).filter(Boolean).length
    };

    onSavePreset(preset);
    setPresetName('');
    setShowSaveDialog(false);
  }, [presetName, settings, onSavePreset]);

  const handleLoadPreset = useCallback((preset) => {
    onLoadPreset(preset.settings);
    setSelectedPreset(preset);
  }, [onLoadPreset]);

  const handleDeletePreset = useCallback((preset) => {
    if (preset.isBuiltIn) {
      alert('Cannot delete built-in presets');
      return;
    }

    if (window.confirm(`Delete preset "${preset.name}"? This action cannot be undone.`)) {
      onDeletePreset(preset.id);
      if (selectedPreset === preset) {
        setSelectedPreset(null);
      }
    }
  }, [onDeletePreset, selectedPreset]);

  const handleExportPreset = useCallback((preset) => {
    const exportData = {
      name: preset.name,
      description: preset.description,
      settings: preset.settings,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${preset.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_preset.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleImportPreset = useCallback(() => {
    try {
      const data = JSON.parse(importData);
      
      if (!data.name || !data.settings) {
        throw new Error('Invalid preset format');
      }

      const preset = {
        name: data.name,
        description: data.description || 'Imported preset',
        settings: data.settings,
        dateCreated: new Date().toISOString(),
        widgetCount: Object.values(data.settings).filter(Boolean).length
      };

      onSavePreset(preset);
      setImportData('');
      setShowImportDialog(false);
    } catch (error) {
      alert('Invalid preset data. Please check the format and try again.');
    }
  }, [importData, onSavePreset]);

  const handleImportFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setImportData(event.target.result);
          setShowImportDialog(true);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const getPresetStats = (preset) => {
    const totalWidgets = Object.keys(preset.settings).length;
    const visibleWidgets = Object.values(preset.settings).filter(Boolean).length;
    return { total: totalWidgets, visible: visibleWidgets };
  };

  const isCurrentPreset = (preset) => {
    if (!currentPreset) return false;
    return JSON.stringify(preset.settings) === JSON.stringify(currentPreset);
  };

  return (
    <div className="preset-manager bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="manager-header text-xs text-white mb-3 text-center font-bold">
        PRESET MANAGER
      </div>

      {/* Actions Bar */}
      <div className="actions-bar mb-4">
        <div className="action-buttons flex space-x-2 mb-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex-1 p-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded"
          >
            Save Current
          </button>
          <button
            onClick={handleImportFile}
            className="flex-1 p-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded"
          >
            Import
          </button>
        </div>

        {/* Sort Controls */}
        <div className="sort-controls flex items-center space-x-2">
          <label className="text-xs text-gray-400">Sort:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="flex-1 p-1 bg-gray-700 text-white text-xs rounded border border-gray-600"
          >
            <option value="name">Name</option>
            <option value="date">Date Created</option>
            <option value="type">Type (Built-in first)</option>
          </select>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog mb-4 p-3 bg-gray-800 border border-gray-600 rounded">
          <div className="text-sm text-white mb-2">Save Current Setup</div>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name..."
            className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
            autoFocus
          />
          <div className="text-xs text-gray-400 mb-3">
            Current setup: {Object.values(settings).filter(Boolean).length} widgets visible
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleSavePreset}
              className="flex-1 p-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded"
            >
              Save
            </button>
            <button
              onClick={() => setShowSaveDialog(false)}
              className="flex-1 p-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="import-dialog mb-4 p-3 bg-gray-800 border border-gray-600 rounded">
          <div className="text-sm text-white mb-2">Import Preset</div>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste preset JSON data here..."
            rows="4"
            className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
          />
          <div className="flex space-x-2">
            <button
              onClick={handleImportPreset}
              className="flex-1 p-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded"
            >
              Import
            </button>
            <button
              onClick={() => setShowImportDialog(false)}
              className="flex-1 p-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preset List */}
      <div className="preset-list flex-1 overflow-y-auto">
        <div className="text-xs text-gray-400 mb-2">
          Presets ({allPresets.length}):
        </div>

        {allPresets.length === 0 ? (
          <div className="empty-state text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm">No presets available</div>
            <div className="text-xs mt-1">Save your current setup to create a preset</div>
          </div>
        ) : (
          <div className="preset-items space-y-2">
            {allPresets.map((preset, index) => {
              const stats = getPresetStats(preset);
              const isCurrent = isCurrentPreset(preset);
              
              return (
                <div
                  key={preset.id || `builtin-${index}`}
                  className={`preset-item p-3 rounded cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-blue-900 border border-blue-600'
                      : selectedPreset === preset
                      ? 'bg-gray-700 border border-gray-600'
                      : 'bg-gray-800 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  <div className="preset-header flex justify-between items-start mb-2">
                    <div className="preset-info flex-1">
                      <div className="preset-name text-sm text-white font-medium flex items-center space-x-2">
                        <span>{preset.name}</span>
                        {preset.isBuiltIn && (
                          <span className="built-in-badge px-1 py-0.5 bg-blue-600 text-xs rounded">
                            Built-in
                          </span>
                        )}
                        {isCurrent && (
                          <span className="current-badge px-1 py-0.5 bg-green-600 text-xs rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="preset-description text-xs text-gray-400">
                        {preset.description}
                      </div>
                    </div>
                  </div>

                  <div className="preset-stats text-xs text-gray-400 mb-2">
                    <span>{stats.visible}/{stats.total} widgets visible</span>
                    {preset.dateCreated && (
                      <span className="ml-3">
                        Created: {new Date(preset.dateCreated).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="preset-actions flex space-x-2">
                    <button
                      onClick={() => handleLoadPreset(preset)}
                      className="flex-1 p-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleExportPreset(preset)}
                      className="px-2 p-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                      title="Export preset"
                    >
                      📤
                    </button>
                    {!preset.isBuiltIn && (
                      <button
                        onClick={() => handleDeletePreset(preset)}
                        className="px-2 p-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                        title="Delete preset"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="summary mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Built-in: {Object.keys(builtInPresets).length}</span>
          <span>Custom: {presets.length}</span>
        </div>
      </div>
    </div>
  );
};

export default PresetManager;