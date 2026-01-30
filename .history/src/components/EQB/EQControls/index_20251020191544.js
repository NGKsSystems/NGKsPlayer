import React, { useState, useCallback } from 'react';

const EQControls = ({ 
  isEnabled = true,
  onToggle = () => {},
  onReset = () => {},
  onPresetLoad = () => {},
  eqValues = new Array(10).fill(0),
  currentPreset = null
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Calculate RMS (Root Mean Square) of EQ values for overall level indication
  const calculateRMS = useCallback(() => {
    const sum = eqValues.reduce((acc, val) => acc + (val * val), 0);
    return Math.sqrt(sum / eqValues.length);
  }, [eqValues]);

  const handleReset = useCallback(() => {
    onReset();
  }, [onReset]);

  const handleToggle = useCallback(() => {
    onToggle(!isEnabled);
  }, [isEnabled, onToggle]);

  const rmsLevel = calculateRMS();
  const hasChanges = eqValues.some(val => Math.abs(val) > 0.1);

  return (
    <div className="eq-controls bg-gray-800 p-3 rounded-lg">
      <div className="controls-header text-xs text-white mb-3 text-center font-bold">
        EQ B - CONTROLS
      </div>
      
      <div className="control-grid space-y-3">
        {/* Main Controls */}
        <div className="main-controls flex justify-between items-center">
          <button
            onClick={handleToggle}
            className={`eq-toggle px-4 py-2 rounded font-medium transition-all ${
              isEnabled 
                ? 'bg-green-600 hover:bg-green-500 text-white' 
                : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
            }`}
          >
            {isEnabled ? 'EQ ON' : 'EQ OFF'}
          </button>
          
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className={`reset-btn px-3 py-2 rounded text-sm transition-all ${
              hasChanges
                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            RESET
          </button>
        </div>

        {/* RMS Level Indicator */}
        <div className="rms-indicator">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>EQ Activity</span>
            <span>{rmsLevel.toFixed(1)} dB RMS</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                rmsLevel < 2 ? 'bg-green-500' :
                rmsLevel < 5 ? 'bg-yellow-500' :
                rmsLevel < 8 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, (rmsLevel / 10) * 100)}%` }}
            />
          </div>
        </div>

        {/* Quick EQ Buttons */}
        <div className="quick-eq-buttons">
          <div className="text-xs text-gray-400 mb-2">Quick EQ:</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => onPresetLoad('bass_boost')}
              className="quick-btn px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors"
            >
              BASS+
            </button>
            <button
              onClick={() => onPresetLoad('vocal_enhance')}
              className="quick-btn px-2 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
            >
              VOCAL
            </button>
            <button
              onClick={() => onPresetLoad('treble_boost')}
              className="quick-btn px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded transition-colors"
            >
              TREBLE+
            </button>
            <button
              onClick={() => onPresetLoad('warm')}
              className="quick-btn px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded transition-colors"
            >
              WARM
            </button>
            <button
              onClick={() => onPresetLoad('bright')}
              className="quick-btn px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs rounded transition-colors"
            >
              BRIGHT
            </button>
            <button
              onClick={() => onPresetLoad('club')}
              className="quick-btn px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
            >
              CLUB
            </button>
          </div>
        </div>

        {/* Advanced Controls Toggle */}
        <div className="advanced-toggle">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full text-xs text-gray-400 hover:text-white transition-colors py-1"
          >
            {showAdvanced ? '▼' : '▶'} Advanced Controls
          </button>
        </div>

        {/* Advanced Controls Panel */}
        {showAdvanced && (
          <div className="advanced-controls bg-gray-900 p-2 rounded space-y-2">
            <div className="text-xs text-gray-400 mb-2">Advanced EQ Settings:</div>
            
            {/* Q Factor Control */}
            <div className="q-control">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Q Factor</span>
                <span>1.0</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="30"
                step="0.1"
                defaultValue="1.0"
                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* EQ Curve Display */}
            <div className="eq-curve bg-black rounded p-2 h-16 flex items-center justify-center">
              <span className="text-xs text-gray-500">EQ Response Curve</span>
            </div>
            
            {/* Analyzer Toggle */}
            <div className="analyzer-controls flex justify-between items-center">
              <span className="text-xs text-gray-400">Real-time Analyzer</span>
              <button className="toggle-btn w-8 h-4 bg-gray-600 rounded-full relative">
                <div className="toggle-handle w-3 h-3 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform"></div>
              </button>
            </div>
          </div>
        )}

        {/* EQ Status Info */}
        <div className="eq-status-info text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Current Preset:</span>
            <span className="text-white">{currentPreset || 'Custom'}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={isEnabled ? 'text-green-400' : 'text-red-400'}>
              {isEnabled ? 'Active' : 'Bypassed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EQControls;