import React, { useState, useCallback, useMemo } from 'react';

const VisibilityControls = ({
  settings = {},
  onToggleSetting = () => {},
  onResetSettings = () => {},
  onApplyPreset = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showOnlyVisible, setShowOnlyVisible] = useState(false);

  // Define widget categories for organization
  const widgetCategories = {
    'Mixer': ['crossfader', 'volumeLeft', 'volumeRight', 'gainA', 'gainB', 'reverbA', 'reverbB', 'filterA', 'filterB', 'micInput', 'micGain', 'masterVol', 'cueVol'],
    'Player A': ['transport', 'navigation', 'pitchFader', 'fineTune', 'jogWheel', 'pitchBend', 'loopControls', 'cuePoints', 'syncControls', 'deckSettings'],
    'Player B': ['transportB', 'navigationB', 'pitchFaderB', 'fineTuneB', 'jogWheelB', 'pitchBendB', 'loopControlsB', 'cuePointsB', 'syncControlsB', 'deckSettingsB'],
    'EQ & Audio': ['eqA', 'eqB', 'visualizersA', 'visualizersB'],
    'Library': ['libraryA', 'libraryB'],
    'Sampler': ['snippets']
  };

  // Get friendly names for settings
  const getFriendlyName = (key) => {
    const nameMap = {
      // Mixer
      'crossfader': 'Crossfader',
      'volumeLeft': 'Volume Left',
      'volumeRight': 'Volume Right',
      'gainA': 'Gain A',
      'gainB': 'Gain B',
      'reverbA': 'Reverb A',
      'reverbB': 'Reverb B',
      'filterA': 'Filter A',
      'filterB': 'Filter B',
      'micInput': 'Mic Input',
      'micGain': 'Mic Gain',
      'masterVol': 'Master Volume',
      'cueVol': 'Cue Volume',
      
      // Player A
      'transport': 'Transport Controls',
      'navigation': 'Track Navigation',
      'pitchFader': 'Pitch Fader',
      'fineTune': 'Fine Tune',
      'jogWheel': 'Jog Wheel',
      'pitchBend': 'Pitch Bend',
      'loopControls': 'Loop Controls',
      'cuePoints': 'Cue Points',
      'syncControls': 'Sync Controls',
      'deckSettings': 'Deck Settings',
      
      // Player B
      'transportB': 'Transport Controls B',
      'navigationB': 'Track Navigation B',
      'pitchFaderB': 'Pitch Fader B',
      'fineTuneB': 'Fine Tune B',
      'jogWheelB': 'Jog Wheel B',
      'pitchBendB': 'Pitch Bend B',
      'loopControlsB': 'Loop Controls B',
      'cuePointsB': 'Cue Points B',
      'syncControlsB': 'Sync Controls B',
      'deckSettingsB': 'Deck Settings B',
      
      // EQ & Visualizers
      'eqA': 'EQ A',
      'eqB': 'EQ B',
      'visualizersA': 'Visualizers A',
      'visualizersB': 'Visualizers B',
      
      // Library
      'libraryA': 'Library A',
      'libraryB': 'Library B',
      
      // Sampler
      'snippets': 'Snippets/Sampler'
    };
    
    return nameMap[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Filter settings based on search and category
  const filteredSettings = useMemo(() => {
    let filtered = Object.entries(settings);

    // Filter by category
    if (selectedCategory !== 'all') {
      const categoryKeys = widgetCategories[selectedCategory] || [];
      filtered = filtered.filter(([key]) => categoryKeys.includes(key));
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(([key, value]) => {
        const friendlyName = getFriendlyName(key).toLowerCase();
        return friendlyName.includes(searchLower) || key.toLowerCase().includes(searchLower);
      });
    }

    // Filter by visibility
    if (showOnlyVisible) {
      filtered = filtered.filter(([key, value]) => value === true);
    }

    return filtered;
  }, [settings, selectedCategory, searchTerm, showOnlyVisible]);

  // Count visible widgets per category
  const getCategoryStats = (category) => {
    const categoryKeys = widgetCategories[category] || [];
    const visible = categoryKeys.filter(key => settings[key]).length;
    const total = categoryKeys.length;
    return { visible, total };
  };

  const handleToggleAll = useCallback((visible) => {
    filteredSettings.forEach(([key]) => {
      if (settings[key] !== visible) {
        onToggleSetting(key);
      }
    });
  }, [filteredSettings, settings, onToggleSetting]);

  const handleCategoryToggle = useCallback((category, visible) => {
    const categoryKeys = widgetCategories[category] || [];
    categoryKeys.forEach(key => {
      if (settings[key] !== visible) {
        onToggleSetting(key);
      }
    });
  }, [settings, onToggleSetting]);

  // Quick presets
  const presets = {
    'Minimal': {
      transport: true,
      jogWheel: true,
      crossfader: true,
      masterVol: true,
      eqA: true,
      eqB: true
    },
    'Full DJ Setup': {
      transport: true,
      navigation: true,
      pitchFader: true,
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
      snippets: true,
      masterVol: true
    },
    'Producer Mode': {
      snippets: true,
      eqA: true,
      eqB: true,
      libraryA: true,
      reverbA: true,
      reverbB: true,
      filterA: true,
      filterB: true,
      masterVol: true
    }
  };

  return (
    <div className="visibility-controls bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="controls-header text-xs text-white mb-3 text-center font-bold">
        WIDGET VISIBILITY
      </div>

      {/* Search and Filters */}
      <div className="filters-section mb-4">
        <div className="search-bar mb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search widgets..."
            className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="filter-controls flex space-x-2 mb-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 p-1 bg-gray-700 text-white text-sm rounded border border-gray-600"
          >
            <option value="all">All Categories</option>
            {Object.keys(widgetCategories).map(category => {
              const stats = getCategoryStats(category);
              return (
                <option key={category} value={category}>
                  {category} ({stats.visible}/{stats.total})
                </option>
              );
            })}
          </select>

          <label className="flex items-center space-x-1 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={showOnlyVisible}
              onChange={(e) => setShowOnlyVisible(e.target.checked)}
              className="accent-blue-500"
            />
            <span>Visible only</span>
          </label>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions mb-4">
        <div className="text-xs text-gray-400 mb-2">Quick Actions:</div>
        <div className="action-buttons flex space-x-2 mb-2">
          <button
            onClick={() => handleToggleAll(true)}
            className="flex-1 p-1 bg-green-700 hover:bg-green-600 text-white text-xs rounded"
          >
            Show All
          </button>
          <button
            onClick={() => handleToggleAll(false)}
            className="flex-1 p-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded"
          >
            Hide All
          </button>
          <button
            onClick={onResetSettings}
            className="flex-1 p-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
          >
            Reset
          </button>
        </div>

        {/* Quick Presets */}
        <div className="preset-buttons flex flex-wrap gap-1">
          {Object.entries(presets).map(([name, preset]) => (
            <button
              key={name}
              onClick={() => onApplyPreset(preset)}
              className="preset-btn px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white text-xs rounded"
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Category Toggles */}
      {selectedCategory === 'all' && (
        <div className="category-controls mb-4">
          <div className="text-xs text-gray-400 mb-2">Categories:</div>
          <div className="category-list space-y-1">
            {Object.entries(widgetCategories).map(([category, keys]) => {
              const stats = getCategoryStats(category);
              const allVisible = stats.visible === stats.total;
              const noneVisible = stats.visible === 0;
              
              return (
                <div key={category} className="category-item flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="category-info">
                    <div className="text-sm text-white">{category}</div>
                    <div className="text-xs text-gray-400">{stats.visible}/{stats.total} visible</div>
                  </div>
                  <div className="category-actions flex space-x-1">
                    <button
                      onClick={() => handleCategoryToggle(category, true)}
                      disabled={allVisible}
                      className="px-2 py-1 bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white text-xs rounded"
                    >
                      All
                    </button>
                    <button
                      onClick={() => handleCategoryToggle(category, false)}
                      disabled={noneVisible}
                      className="px-2 py-1 bg-red-700 hover:bg-red-600 disabled:bg-gray-600 text-white text-xs rounded"
                    >
                      None
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Widget List */}
      <div className="widget-list flex-1 overflow-y-auto">
        <div className="text-xs text-gray-400 mb-2">
          Widgets ({filteredSettings.length}):
        </div>
        
        {filteredSettings.length === 0 ? (
          <div className="empty-state text-center text-gray-500 py-8">
            <div className="text-2xl mb-2">🔍</div>
            <div className="text-sm">No widgets found</div>
            <div className="text-xs mt-1">Try adjusting your search or filters</div>
          </div>
        ) : (
          <div className="widget-items space-y-1">
            {filteredSettings.map(([key, value]) => (
              <div
                key={key}
                className={`widget-item flex items-center justify-between p-2 rounded transition-colors ${
                  value ? 'bg-green-900 border border-green-700' : 'bg-gray-800 border border-gray-700'
                }`}
              >
                <div className="widget-info flex-1">
                  <div className="widget-name text-sm text-white">
                    {getFriendlyName(key)}
                  </div>
                  <div className="widget-key text-xs text-gray-400">
                    {key}
                  </div>
                </div>
                
                <div className="widget-controls flex items-center space-x-2">
                  <div className={`status-indicator w-2 h-2 rounded-full ${
                    value ? 'bg-green-500' : 'bg-gray-500'
                  }`}></div>
                  
                  <button
                    onClick={() => onToggleSetting(key)}
                    className={`toggle-btn px-3 py-1 rounded text-xs font-medium transition-colors ${
                      value
                        ? 'bg-green-600 hover:bg-green-500 text-white'
                        : 'bg-gray-600 hover:bg-gray-500 text-white'
                    }`}
                  >
                    {value ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="summary mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>Total: {Object.keys(settings).length} widgets</span>
          <span>Visible: {Object.values(settings).filter(Boolean).length}</span>
        </div>
      </div>
    </div>
  );
};

export default VisibilityControls;