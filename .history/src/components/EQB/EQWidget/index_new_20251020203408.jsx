import React, { useState, useCallback, useEffect, useRef } from "react";
import DraggableWidget from "../../DraggableWidget";

// Standard EQ frequency bands for professional DJ mixing
const FREQUENCY_BANDS = [
  { id: 0, freq: 32, label: '32Hz', type: 'lowshelf' },
  { id: 1, freq: 64, label: '64Hz', type: 'peaking' },
  { id: 2, freq: 125, label: '125Hz', type: 'peaking' },
  { id: 3, freq: 250, label: '250Hz', type: 'peaking' },
  { id: 4, freq: 500, label: '500Hz', type: 'peaking' },
  { id: 5, freq: 1000, label: '1kHz', type: 'peaking' },
  { id: 6, freq: 2000, label: '2kHz', type: 'peaking' },
  { id: 7, freq: 4000, label: '4kHz', type: 'peaking' },
  { id: 8, freq: 8000, label: '8kHz', type: 'peaking' },
  { id: 9, freq: 16000, label: '16kHz', type: 'highshelf' }
];

// Professional DJ EQ presets
const EQ_PRESETS = {
  flat: { name: 'Flat', values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bass_boost: { name: 'Bass+', values: [6, 4, 2, 1, 0, 0, 0, 0, 0, 0] },
  vocal: { name: 'Vocal', values: [0, -1, 0, 2, 4, 3, 2, 0, 0, 0] },
  treble_boost: { name: 'Treble+', values: [0, 0, 0, 0, 0, 1, 2, 4, 6, 8] },
  warm: { name: 'Warm', values: [2, 1, 1, 0, -1, -1, 0, 1, 2, 1] },
  bright: { name: 'Bright', values: [-1, 0, 0, 1, 1, 2, 3, 4, 3, 2] },
  club: { name: 'Club', values: [8, 6, 3, 1, -2, -1, 1, 2, 4, 3] }
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
      eqValues: new Array(10).fill(0),
      currentPreset: null
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
      currentPreset: null
    }));
    onEQChange(newValues);
  }, [onEQChange]);

  const handleToggle = useCallback(() => {
    setEQState(prev => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  const handleReset = useCallback(() => {
    const newValues = new Array(10).fill(0);
    handleEQChange(newValues);
  }, [handleEQChange]);

  const handlePresetLoad = useCallback((presetKey) => {
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

  const calculateRMS = useCallback(() => {
    const sum = eqState.eqValues.reduce((acc, val) => acc + (val * val), 0);
    return Math.sqrt(sum / eqState.eqValues.length);
  }, [eqState.eqValues]);

  const rmsLevel = calculateRMS();
  const hasChanges = eqState.eqValues.some(val => Math.abs(val) > 0.1);

  return (
    <DraggableWidget 
      id={`eq-${deck}`} 
      title={`EQ ${deck}`}
      defaultWidth={700}
      defaultHeight={450}
      className="eq-widget"
    >
      <div className="eq-container flex h-full bg-gray-900 text-white">
        {/* Left Panel - Presets */}
        <div className="eq-presets w-48 bg-gray-800 p-3 rounded-lg mr-3">
          <div className="text-xs font-bold mb-3 text-center">EQ {deck} - PRESETS</div>
          
          <div className="preset-buttons space-y-2">
            {Object.entries(EQ_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handlePresetLoad(key)}
                className={`w-full px-2 py-1 text-xs rounded transition-colors ${
                  eqState.currentPreset === key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-600">
            <div className="text-xs text-gray-400 mb-2">Custom:</div>
            <button className="w-full px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded">
              Save Current
            </button>
          </div>
        </div>

        {/* Center Panel - EQ Bands */}
        <div 
          ref={containerRef}
          className={`eq-bands flex-1 bg-gray-900 p-3 rounded-lg mr-3 ${eqState.isEnabled ? '' : 'opacity-50'}`}
        >
          <div className="text-xs font-bold mb-2 text-center">EQ {deck} - FREQUENCY BANDS</div>
          
          <div className="bands-container flex justify-between items-end h-48 relative">
            {/* EQ Scale */}
            <div className="eq-scale absolute left-0 top-0 h-full w-8 flex flex-col justify-between text-xs text-gray-400">
              <span>+15</span><span>+10</span><span>+5</span><span>0</span><span>-5</span><span>-10</span><span>-15</span>
            </div>
            
            {/* Zero line */}
            <div className="absolute left-8 right-0 top-1/2 h-px bg-gray-600"></div>
            
            <div className="bands-grid flex justify-between flex-1 ml-10">
              {FREQUENCY_BANDS.map((band, index) => {
                const value = eqState.eqValues[index] || 0;
                const position = getSliderPosition(value);
                const color = getSliderColor(value);
                
                return (
                  <div key={band.id} className="band-control flex flex-col items-center">
                    <div className="freq-label text-xs text-gray-400 mb-1 transform -rotate-45">
                      {band.label}
                    </div>
                    
                    <div 
                      className="eq-slider relative w-6 h-40 bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700"
                      onMouseDown={(e) => handleMouseDown(index, e)}
                    >
                      <div
                        className="slider-handle absolute w-6 h-4 rounded-full border-2 border-white"
                        style={{
                          backgroundColor: color,
                          bottom: `${position * 100}%`,
                          transform: 'translateY(50%)'
                        }}
                      />
                      
                      <div 
                        className="gain-value absolute -right-8 text-xs font-mono whitespace-nowrap"
                        style={{
                          bottom: `${position * 100}%`,
                          transform: 'translateY(50%)',
                          color: color
                        }}
                      >
                        {value > 0 ? '+' : ''}{value.toFixed(1)}
                      </div>
                    </div>
                    
                    <div className="band-type text-xs text-gray-500 mt-1">
                      {band.type === 'lowshelf' ? 'LS' : band.type === 'highshelf' ? 'HS' : 'PK'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel - Controls */}
        <div className="eq-controls w-48 bg-gray-800 p-3 rounded-lg">
          <div className="text-xs font-bold mb-3 text-center">EQ {deck} - CONTROLS</div>
          
          <div className="space-y-3">
            {/* Main Controls */}
            <div className="flex justify-between">
              <button
                onClick={handleToggle}
                className={`px-3 py-2 rounded font-medium text-xs ${
                  eqState.isEnabled 
                    ? 'bg-green-600 hover:bg-green-500' 
                    : 'bg-gray-600 hover:bg-gray-500'
                }`}
              >
                {eqState.isEnabled ? 'ON' : 'OFF'}
              </button>
              
              <button
                onClick={handleReset}
                disabled={!hasChanges}
                className={`px-3 py-2 rounded text-xs ${
                  hasChanges
                    ? 'bg-orange-600 hover:bg-orange-500'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                RESET
              </button>
            </div>

            {/* RMS Level */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Activity</span>
                <span>{rmsLevel.toFixed(1)} dB</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    rmsLevel < 2 ? 'bg-green-500' : rmsLevel < 5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, (rmsLevel / 10) * 100)}%` }}
                />
              </div>
            </div>

            {/* Quick EQ */}
            <div>
              <div className="text-xs text-gray-400 mb-2">Quick EQ:</div>
              <div className="grid grid-cols-2 gap-1">
                <button onClick={() => handlePresetLoad('bass_boost')} className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-xs rounded">BASS+</button>
                <button onClick={() => handlePresetLoad('vocal')} className="px-2 py-1 bg-green-600 hover:bg-green-500 text-xs rounded">VOCAL</button>
                <button onClick={() => handlePresetLoad('warm')} className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-xs rounded">WARM</button>
                <button onClick={() => handlePresetLoad('bright')} className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-xs rounded">BRIGHT</button>
              </div>
            </div>

            {/* Status */}
            <div className="text-xs text-gray-500 space-y-1 pt-2 border-t border-gray-600">
              <div className="flex justify-between">
                <span>Preset:</span>
                <span className="text-white">{eqState.currentPreset || 'Custom'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={eqState.isEnabled ? 'text-green-400' : 'text-red-400'}>
                  {eqState.isEnabled ? 'Active' : 'Bypassed'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default EQWidget;