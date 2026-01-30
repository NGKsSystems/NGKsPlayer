import React, { useState, useCallback } from 'react';

// Professional DJ EQ presets
const EQ_PRESETS = {
  flat: {
    name: 'Flat',
    description: 'No EQ applied - natural sound',
    values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    category: 'neutral'
  },
  bass_boost: {
    name: 'Bass Boost',
    description: 'Enhanced low frequencies for dance music',
    values: [6, 4, 2, 1, 0, 0, 0, 0, 0, 0],
    category: 'bass'
  },
  vocal_enhance: {
    name: 'Vocal Enhance',
    description: 'Midrange boost for clear vocals',
    values: [0, -1, 0, 2, 4, 3, 2, 0, 0, 0],
    category: 'vocal'
  },
  treble_boost: {
    name: 'Treble Boost',
    description: 'High frequency enhancement',
    values: [0, 0, 0, 0, 0, 1, 2, 4, 6, 8],
    category: 'treble'
  },
  warm: {
    name: 'Warm',
    description: 'Smooth, warm sound character',
    values: [2, 1, 1, 0, -1, -1, 0, 1, 2, 1],
    category: 'tonal'
  },
  bright: {
    name: 'Bright',
    description: 'Crisp, detailed high end',
    values: [-1, 0, 0, 1, 1, 2, 3, 4, 3, 2],
    category: 'tonal'
  },
  club: {
    name: 'Club',
    description: 'Pumping club sound with deep bass',
    values: [8, 6, 3, 1, -2, -1, 1, 2, 4, 3],
    category: 'dance'
  },
  radio: {
    name: 'Radio',
    description: 'Radio-friendly processing',
    values: [2, 1, 0, 3, 4, 3, 2, 1, 2, 3],
    category: 'broadcast'
  },
  live: {
    name: 'Live',
    description: 'Live performance optimization',
    values: [3, 2, 1, 2, 1, 0, 1, 2, 3, 2],
    category: 'live'
  },
  vintage: {
    name: 'Vintage',
    description: 'Classic analog sound',
    values: [2, 1, 0, -1, -2, -1, 0, 1, 0, -1],
    category: 'character'
  }
};

const EQPresets = ({ 
  currentPreset = null,
  onPresetLoad = () => {},
  onPresetSave = () => {},
  eqValues = new Array(10).fill(0)
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const categories = [
    { id: 'all', name: 'All', icon: '🎛️' },
    { id: 'neutral', name: 'Neutral', icon: '⚖️' },
    { id: 'bass', name: 'Bass', icon: '🔊' },
    { id: 'vocal', name: 'Vocal', icon: '🎤' },
    { id: 'treble', name: 'Treble', icon: '✨' },
    { id: 'tonal', name: 'Tonal', icon: '🎵' },
    { id: 'dance', name: 'Dance', icon: '💃' },
    { id: 'broadcast', name: 'Radio', icon: '📻' },
    { id: 'live', name: 'Live', icon: '🎪' },
    { id: 'character', name: 'Character', icon: '🎭' }
  ];

  const getFilteredPresets = useCallback(() => {
    if (selectedCategory === 'all') {
      return Object.entries(EQ_PRESETS);
    }
    return Object.entries(EQ_PRESETS).filter(([_, preset]) => 
      preset.category === selectedCategory
    );
  }, [selectedCategory]);

  const handlePresetLoad = useCallback((presetKey) => {
    const preset = EQ_PRESETS[presetKey];
    if (preset) {
      onPresetLoad(presetKey, preset.values);
    }
  }, [onPresetLoad]);

  const handleSavePreset = useCallback(() => {
    if (newPresetName.trim()) {
      onPresetSave(newPresetName.trim(), eqValues);
      setNewPresetName('');
      setShowSaveDialog(false);
    }
  }, [newPresetName, eqValues, onPresetSave]);

  const isCurrentPreset = useCallback((presetKey) => {
    return currentPreset === presetKey;
  }, [currentPreset]);

  const hasCustomValues = useCallback(() => {
    return !Object.values(EQ_PRESETS).some(preset => 
      preset.values.every((val, idx) => Math.abs(val - eqValues[idx]) < 0.1)
    );
  }, [eqValues]);

  return (
    <div className="eq-presets bg-gray-800 p-3 rounded-lg">
      <div className="presets-header text-xs text-white mb-3 text-center font-bold">
        EQ A - PRESETS
      </div>

      {/* Category Filter */}
      <div className="category-filter mb-3">
        <div className="text-xs text-gray-400 mb-2">Categories:</div>
        <div className="flex flex-wrap gap-1">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`category-btn px-2 py-1 rounded text-xs transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {category.icon} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Presets Grid */}
      <div className="presets-grid max-h-48 overflow-y-auto space-y-2">
        {getFilteredPresets().map(([presetKey, preset]) => (
          <div
            key={presetKey}
            className={`preset-item p-2 rounded cursor-pointer transition-all ${
              isCurrentPreset(presetKey)
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
            onClick={() => handlePresetLoad(presetKey)}
          >
            <div className="flex justify-between items-start">
              <div className="preset-info flex-1">
                <div className="preset-name font-medium text-sm">
                  {preset.name}
                  {isCurrentPreset(presetKey) && (
                    <span className="ml-2 text-xs">✓</span>
                  )}
                </div>
                <div className="preset-description text-xs text-gray-400 mt-1">
                  {preset.description}
                </div>
              </div>
              
              {/* Visual EQ Curve */}
              <div className="preset-curve ml-2 flex items-end space-x-px">
                {preset.values.map((value, index) => {
                  const height = Math.max(2, Math.abs(value) * 2 + 2);
                  const color = value > 0 ? 'bg-green-400' : 
                               value < 0 ? 'bg-red-400' : 'bg-gray-500';
                  return (
                    <div
                      key={index}
                      className={`curve-bar w-1 ${color} opacity-75`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Custom Preset Actions */}
      <div className="preset-actions mt-3 pt-3 border-t border-gray-600">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Custom:</span>
          {hasCustomValues() && (
            <span className="text-xs text-yellow-400">Modified</span>
          )}
        </div>
        
        <div className="action-buttons flex gap-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasCustomValues()}
            className={`save-btn flex-1 px-3 py-2 rounded text-xs transition-all ${
              hasCustomValues()
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            💾 Save Current
          </button>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="save-dialog mt-3 p-3 bg-gray-900 rounded border border-gray-600">
          <div className="text-xs text-white mb-2">Save Custom Preset:</div>
          <input
            type="text"
            value={newPresetName}
            onChange={(e) => setNewPresetName(e.target.value)}
            placeholder="Enter preset name..."
            className="w-full p-2 bg-gray-700 text-white text-xs rounded mb-2"
            maxLength={30}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSavePreset}
              disabled={!newPresetName.trim()}
              className="flex-1 px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-xs rounded"
            >
              Save
            </button>
            <button
              onClick={() => {
                setShowSaveDialog(false);
                setNewPresetName('');
              }}
              className="flex-1 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Preset Info */}
      <div className="preset-info mt-3 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Active:</span>
          <span className="text-white">
            {currentPreset ? EQ_PRESETS[currentPreset]?.name || 'Custom' : 'None'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EQPresets;