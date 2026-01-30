import React, { useState, useCallback, useEffect } from "react";

const EQWidget = ({ deck = 'B', audioContext, gainNode, pannerNode }) => {
  // 16-band EQ frequencies (Hz)
  const frequencies = [
    '31', '62', '125', '250', '500', '1K', '2K', '4K', 
    '8K', '16K', '31K', '62K', '125K', '250K', '500K', '1M'
  ];
  
  // Actual frequency values for Web Audio API
  const frequencyValues = [
    31, 62, 125, 250, 500, 1000, 2000, 4000,
    8000, 16000, 31000, 62000, 125000, 250000, 500000, 1000000
  ];
  
  // EQ presets
  const presets = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Rock': [3, 2, -1, -2, 1, 4, 5, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    'Pop': [1, 2, 4, 3, 0, -1, -2, 1, 2, 3, 2, 1, 0, 0, 0, 0],
    'Hip-Hop': [5, 4, 2, 1, -1, -2, 1, 2, 1, 3, 4, 3, 2, 1, 0, 0],
    'Electronic': [2, 3, 1, 0, 2, 4, 3, 1, 2, 5, 6, 4, 3, 2, 1, 0],
    'Jazz': [2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0],
    'Classical': [0, 0, 0, 0, 1, 1, 0, 0, 1, 2, 3, 2, 1, 0, 0, 0],
    'Bass Boost': [6, 5, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Treble Boost': [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0],
    'Vocal': [0, 0, -1, 1, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    'Dance': [4, 3, 2, 0, 0, 1, 2, 3, 2, 3, 4, 3, 2, 1, 0, 0],
    'Loudness': [3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0]
  };
  
  const [eqValues, setEqValues] = useState(presets['Flat']);
  const [selectedPreset, setSelectedPreset] = useState('Flat');
  const [bypassEQ, setBypassEQ] = useState(false);
  const [eqFilters, setEqFilters] = useState([]);
  
  // Initialize EQ filters when audio context is available
  useEffect(() => {
    if (audioContext && gainNode && pannerNode && eqFilters.length === 0) {
      
      const filters = frequencyValues.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        
        // Configure filter types based on frequency
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === frequencyValues.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
        }
        
        // Clamp frequency to valid Web Audio API range (10Hz - 24000Hz)
        const clampedFreq = Math.max(10, Math.min(24000, freq));
        filter.frequency.setValueAtTime(clampedFreq, audioContext.currentTime);
        filter.Q.setValueAtTime(1, audioContext.currentTime);
        filter.gain.setValueAtTime(0, audioContext.currentTime);
        
        return filter;
      });
      
      // Chain filters together: gainNode -> filter1 -> filter2 -> ... -> pannerNode
      gainNode.disconnect();
      
      let currentNode = gainNode;
      filters.forEach((filter, index) => {
        currentNode.connect(filter);
        currentNode = filter;
        
        if (index === filters.length - 1) {
          // Last filter connects to panner node to maintain audio routing
          filter.connect(pannerNode);
        }
      });
      
      setEqFilters(filters);
    }
  }, [audioContext, gainNode, pannerNode, deck, eqFilters.length, frequencyValues]);
  
  // Update EQ when values change
  useEffect(() => {
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        const gainValue = bypassEQ ? 0 : eqValues[index];
        filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
      });
    }
  }, [eqValues, bypassEQ, eqFilters, audioContext, deck]);
  
  const handleBandChange = useCallback((bandIndex, value) => {
    const newValues = [...eqValues];
    newValues[bandIndex] = parseFloat(value);
    setEqValues(newValues);
    setSelectedPreset('Custom'); // Switch to custom when manually adjusted
  }, [eqValues]);
  
  const handlePresetChange = useCallback((presetName) => {
    setSelectedPreset(presetName);
    setEqValues([...presets[presetName]]);
  }, []);
  
  const handleReset = useCallback(() => {
    setSelectedPreset('Flat');
    setEqValues([...presets['Flat']]);
  }, []);
  
  // Prevent drag when interacting with EQ controls
  const handleSliderMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  const handleControlMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  return (
    <div className={`eq-content eq-${deck.toLowerCase()}`}>
      {/* EQ Header with Presets */}
      <div className="eq-header" onMouseDown={handleControlMouseDown}>
        <div className="eq-presets">
          <label>Preset:</label>
          <select 
            value={selectedPreset} 
            onChange={(e) => handlePresetChange(e.target.value)}
            className="eq-preset-select"
            onMouseDown={handleControlMouseDown}
          >
            {Object.keys(presets).map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </div>
        <div className="eq-controls-header">
          <button 
            className={`eq-bypass-btn ${bypassEQ ? 'active' : ''}`}
            onClick={() => setBypassEQ(!bypassEQ)}
            onMouseDown={handleControlMouseDown}
          >
            {bypassEQ ? 'BYPASSED' : 'ACTIVE'}
          </button>
          <button 
            className="eq-reset-btn" 
            onClick={handleReset}
            onMouseDown={handleControlMouseDown}
          >
            RESET
          </button>
        </div>
      </div>
      
      {/* 16-Band EQ Sliders */}
      <div className="eq-bands-container">
        <div className="eq-bands">
          {frequencies.map((freq, index) => (
            <div key={index} className="eq-band-vertical">
              <div className="eq-gain-value">
                {eqValues[index] > 0 ? '+' : ''}{eqValues[index].toFixed(1)}
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqValues[index]}
                onChange={(e) => handleBandChange(index, e.target.value)}
                onMouseDown={handleSliderMouseDown}
                className={`eq-slider ${bypassEQ ? 'bypassed' : ''}`}
                orient="vertical"
                disabled={bypassEQ}
              />
              <div className="eq-frequency">{freq}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* EQ Status */}
      <div className="eq-analyzer" onMouseDown={handleControlMouseDown}>
        <div style={{ 
          fontSize: '10px', 
          color: audioContext && eqFilters.length > 0 ? '#00ff88' : '#ff4444',
          textAlign: 'center',
          padding: '4px'
        }}>
          {audioContext && eqFilters.length > 0 ? 
            `🎛️ EQ Active (${eqFilters.length} bands)` : 
            '⚠️ EQ Not Connected'
          }
        </div>
      </div>
    </div>
  );
};

export default EQWidget;

// 16-band EQ frequency bands for professional DJ mixing
const FREQUENCY_BANDS = [
  { id: 0, freq: 16, label: '16Hz', type: 'lowshelf' },
  { id: 1, freq: 25, label: '25Hz', type: 'peaking' },
  { id: 2, freq: 40, label: '40Hz', type: 'peaking' },
  { id: 3, freq: 63, label: '63Hz', type: 'peaking' },
  { id: 4, freq: 100, label: '100Hz', type: 'peaking' },
  { id: 5, freq: 160, label: '160Hz', type: 'peaking' },
  { id: 6, freq: 250, label: '250Hz', type: 'peaking' },
  { id: 7, freq: 400, label: '400Hz', type: 'peaking' },
  { id: 8, freq: 630, label: '630Hz', type: 'peaking' },
  { id: 9, freq: 1000, label: '1kHz', type: 'peaking' },
  { id: 10, freq: 1600, label: '1.6kHz', type: 'peaking' },
  { id: 11, freq: 2500, label: '2.5kHz', type: 'peaking' },
  { id: 12, freq: 4000, label: '4kHz', type: 'peaking' },
  { id: 13, freq: 6300, label: '6.3kHz', type: 'peaking' },
  { id: 14, freq: 10000, label: '10kHz', type: 'peaking' },
  { id: 15, freq: 16000, label: '16kHz', type: 'highshelf' }
];

// Professional DJ EQ presets for 16-band
const EQ_PRESETS = {
  flat: { 
    name: 'Flat', 
    values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] 
  },
  bass_boost: { 
    name: 'Bass+', 
    values: [8, 6, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] 
  },
  vocal: { 
    name: 'Vocal', 
    values: [0, 0, -1, 0, 1, 2, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0] 
  },
  treble_boost: { 
    name: 'Treble+', 
    values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 6, 8, 10] 
  },
  warm: { 
    name: 'Warm', 
    values: [2, 1, 1, 0, 0, -1, -1, 0, 0, 1, 1, 2, 1, 0, 0, -1] 
  },
  bright: { 
    name: 'Bright', 
    values: [-1, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 3, 2, 1, 0] 
  },
  club: { 
    name: 'Club', 
    values: [10, 8, 6, 4, 2, 0, -2, -1, 0, 1, 2, 3, 4, 3, 2, 1] 
  }
};

const EQWidget = ({ 
  deck = 'B',
  audioContext = null,
  sourceNode = null,
  destinationNode = null,
  onEQChange = () => {}
}) => {
  const [eqState, setEQState] = useState(() => {
    try {
      const saved = localStorage.getItem(`eq-${deck}-state`);
      if (saved) return JSON.parse(saved);
    } catch (error) {}
    
    return {
      isEnabled: true,
      eqValues: new Array(16).fill(0), // 16-band EQ
      currentPreset: 'flat'
    };
  });

  const [isDragging, setIsDragging] = useState(null);
  const [eqFilters, setEQFilters] = useState([]);
  const containerRef = useRef();

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`eq-${deck}-state`, JSON.stringify(eqState));
    } catch (error) {}
  }, [eqState, deck]);

  // Initialize EQ filters
  useEffect(() => {
    if (audioContext && sourceNode && destinationNode && eqFilters.length === 0) {
      const filters = FREQUENCY_BANDS.map((band, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.freq;
        filter.Q.value = 1.0;
        filter.gain.value = eqState.eqValues[index] || 0;
        return filter;
      });
      
      let currentNode = sourceNode;
      filters.forEach(filter => {
        currentNode.connect(filter);
        currentNode = filter;
      });
      currentNode.connect(destinationNode);
      
      setEQFilters(filters);
    }
  }, [audioContext, sourceNode, destinationNode, eqState.eqValues, eqFilters.length]);

  // Update filter gains
  useEffect(() => {
    if (eqFilters.length > 0) {
      eqFilters.forEach((filter, index) => {
        if (filter && typeof eqState.eqValues[index] === 'number') {
          filter.gain.value = eqState.eqValues[index];
        }
      });
    }
  }, [eqState.eqValues, eqFilters]);

  const handleEQChange = useCallback((newValues) => {
    setEQState(prev => ({
      ...prev,
      eqValues: newValues,
      currentPreset: 'custom'
    }));
    onEQChange(newValues);
  }, [onEQChange]);

  const handleToggle = useCallback(() => {
    setEQState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  const handleReset = useCallback(() => {
    const newValues = new Array(16).fill(0);
    setEQState(prev => ({
      ...prev,
      eqValues: newValues,
      currentPreset: 'flat'
    }));
    onEQChange(newValues);
  }, [onEQChange]);

  const handlePresetChange = useCallback((e) => {
    const presetKey = e.target.value;
    const preset = EQ_PRESETS[presetKey];
    if (preset) {
      setEQState(prev => ({
        ...prev,
        eqValues: [...preset.values],
        currentPreset: presetKey
      }));
      onEQChange(preset.values);
    }
  }, [onEQChange]);

  // EQ Band interaction handlers
  const handleMouseDown = useCallback((bandIndex, e) => {
    e.preventDefault();
    setIsDragging(bandIndex);
    updateEQValue(bandIndex, e);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging !== null) {
      updateEQValue(isDragging, e);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const updateEQValue = useCallback((bandIndex, e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    const normalizedY = Math.max(0, Math.min(1, y / height));
    const gain = (1 - normalizedY) * 30 - 15; // -15 to +15 dB range
    
    const newEQValues = [...eqState.eqValues];
    newEQValues[bandIndex] = Math.round(gain * 10) / 10;
    
    handleEQChange(newEQValues);
  }, [eqState.eqValues, handleEQChange]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getSliderPosition = (value) => {
    return Math.max(0, Math.min(1, (value + 15) / 30));
  };

  const getSliderColor = (value) => {
    if (Math.abs(value) < 0.5) return '#888';
    if (value > 0) return '#00ff00';
    return '#ff6600';
  };

  return (
    <div className="eq-container h-full bg-gray-900 text-white p-3">
        {/* Top Controls Bar */}
        <div className="eq-header flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold">PRESET:</span>
            <select
              value={eqState.currentPreset}
              onChange={handlePresetChange}
              className="bg-gray-800 text-white px-2 py-1 rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {Object.entries(EQ_PRESETS).map(([key, preset]) => (
                <option key={key} value={key}>
                  {preset.name}
                </option>
              ))}
              {eqState.currentPreset === 'custom' && (
                <option value="custom">Custom</option>
              )}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggle}
              className={`px-4 py-1 rounded text-sm font-medium ${
                eqState.isEnabled 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-600 text-gray-300'
              }`}
            >
              {eqState.isEnabled ? 'ACTIVE' : 'BYPASSED'}
            </button>
            
            <button
              onClick={handleReset}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-sm"
            >
              RESET
            </button>
          </div>
        </div>

        {/* EQ Bands */}
        <div 
          ref={containerRef}
          className={`eq-bands-container flex-1 ${eqState.isEnabled ? '' : 'opacity-50'}`}
        >
          <div className="bands-area flex justify-between items-end h-full relative">
            {/* EQ Scale */}
            <div className="eq-scale absolute left-0 top-0 h-full w-6 flex flex-col justify-between text-xs text-gray-400 z-10">
              <span>+15</span>
              <span>+10</span>
              <span>+5</span>
              <span>0</span>
              <span>-5</span>
              <span>-10</span>
              <span>-15</span>
            </div>
            
            {/* Zero line */}
            <div className="absolute left-6 right-0 top-1/2 h-px bg-gray-600 z-0"></div>
            
            {/* EQ Bands */}
            <div className="bands-grid flex justify-between flex-1 ml-8">
              {FREQUENCY_BANDS.map((band, index) => {
                const value = eqState.eqValues[index] || 0;
                const position = getSliderPosition(value);
                const color = getSliderColor(value);
                
                return (
                  <div key={band.id} className="band-control flex flex-col items-center min-w-0">
                    {/* Frequency Label */}
                    <div className="freq-label text-xs text-gray-400 mb-1 transform -rotate-45 origin-center whitespace-nowrap">
                      {band.label}
                    </div>
                    
                    {/* EQ Slider */}
                    <div 
                      className="eq-slider relative w-4 flex-1 bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700 transition-colors min-h-0"
                      style={{ minHeight: '120px' }}
                      onMouseDown={(e) => handleMouseDown(index, e)}
                    >
                      {/* Slider Handle */}
                      <div
                        className="slider-handle absolute w-4 h-3 rounded-full border border-white transition-all duration-75"
                        style={{
                          backgroundColor: color,
                          bottom: `${position * 100}%`,
                          transform: 'translateY(50%)'
                        }}
                      />
                      
                      {/* Gain Value Display (on hover) */}
                      {isDragging === index && (
                        <div 
                          className="gain-value absolute -right-6 text-xs font-mono bg-black bg-opacity-75 px-1 rounded"
                          style={{
                            bottom: `${position * 100}%`,
                            transform: 'translateY(50%)',
                            color: color
                          }}
                        >
                          {value > 0 ? '+' : ''}{value.toFixed(1)}
                        </div>
                      )}
                    </div>
                    
                    {/* Current Value */}
                    <div className="band-value text-xs text-gray-500 mt-1 text-center">
                      {Math.abs(value) < 0.1 ? '0' : (value > 0 ? '+' : '') + value.toFixed(1)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EQWidget;