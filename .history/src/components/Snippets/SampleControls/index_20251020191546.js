import React, { useState, useCallback, useRef, useEffect } from 'react';

const SampleControls = ({
  selectedPad = null,
  pads = [],
  onPadUpdate = () => {},
  onPadClear = () => {},
  onRecordStart = () => {},
  onRecordStop = () => {},
  isRecording = false,
  audioContext = null
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sampleSettings, setSampleSettings] = useState({
    volume: 1.0,
    pitch: 0,
    startPoint: 0,
    endPoint: 1,
    loop: false,
    reverse: false,
    fadeIn: 0,
    fadeOut: 0
  });

  const volumeRef = useRef();
  const pitchRef = useRef();
  const startRef = useRef();
  const endRef = useRef();

  const selectedPadData = selectedPad !== null ? pads[selectedPad] : null;

  // Update settings when pad selection changes
  useEffect(() => {
    if (selectedPadData?.settings) {
      setSampleSettings(selectedPadData.settings);
    } else {
      setSampleSettings({
        volume: 1.0,
        pitch: 0,
        startPoint: 0,
        endPoint: 1,
        loop: false,
        reverse: false,
        fadeIn: 0,
        fadeOut: 0
      });
    }
  }, [selectedPadData]);

  const handleSettingChange = useCallback((setting, value) => {
    const newSettings = { ...sampleSettings, [setting]: value };
    setSampleSettings(newSettings);
    
    if (selectedPad !== null) {
      onPadUpdate(selectedPad, { settings: newSettings });
    }
  }, [sampleSettings, selectedPad, onPadUpdate]);

  const handleClearPad = useCallback(() => {
    if (selectedPad !== null) {
      onPadClear(selectedPad);
    }
  }, [selectedPad, onPadClear]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      onRecordStop();
    } else if (selectedPad !== null) {
      onRecordStart(selectedPad);
    }
  }, [isRecording, selectedPad, onRecordStart, onRecordStop]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  const getPitchLabel = (semitones) => {
    if (semitones === 0) return '0';
    return semitones > 0 ? `+${semitones}` : `${semitones}`;
  };

  return (
    <div className="sample-controls bg-gray-800 p-3 rounded-lg">
      <div className="controls-header text-xs text-white mb-3 text-center font-bold">
        SAMPLE CONTROLS
      </div>

      {selectedPad === null ? (
        <div className="no-selection text-center text-gray-400 py-8">
          <div className="text-2xl mb-2">🎛️</div>
          <div className="text-sm">Select a pad to edit</div>
          <div className="text-xs mt-1">Click any pad in the grid</div>
        </div>
      ) : (
        <div className="control-sections space-y-4">
          {/* Pad Info */}
          <div className="pad-info bg-gray-900 p-3 rounded">
            <div className="flex justify-between items-start mb-2">
              <div className="pad-details">
                <div className="text-sm text-white font-medium">
                  Pad {selectedPad + 1}
                </div>
                {selectedPadData?.sample && (
                  <div className="text-xs text-gray-400 mt-1">
                    {selectedPadData.sample.name || 'Unnamed Sample'}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleClearPad}
                disabled={!selectedPadData?.sample}
                className={`clear-btn p-1 rounded text-xs transition-colors ${
                  selectedPadData?.sample
                    ? 'bg-red-600 hover:bg-red-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                🗑️ Clear
              </button>
            </div>

            {selectedPadData?.sample && (
              <div className="sample-stats text-xs text-gray-400 space-y-1">
                <div>Duration: {formatTime(selectedPadData.sample.duration / 1000)}</div>
                <div>Type: {selectedPadData.sample.type || 'Unknown'}</div>
                {selectedPadData.sample.bpm && (
                  <div>BPM: {selectedPadData.sample.bpm}</div>
                )}
              </div>
            )}
          </div>

          {/* Recording Controls */}
          <div className="recording-section">
            <div className="text-xs text-gray-400 mb-2">Recording:</div>
            <button
              onClick={handleRecordToggle}
              className={`record-btn w-full p-3 rounded font-medium transition-all ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                  : 'bg-green-600 hover:bg-green-500 text-white'
              }`}
            >
              {isRecording ? '⏹️ Stop Recording' : '🔴 Record to Pad'}
            </button>
            {isRecording && (
              <div className="recording-info text-xs text-red-400 mt-2 text-center">
                Recording to Pad {selectedPad + 1}...
              </div>
            )}
          </div>

          {/* Basic Controls */}
          {selectedPadData?.sample && (
            <>
              {/* Volume Control */}
              <div className="volume-control">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Volume</span>
                  <span>{Math.round(sampleSettings.volume * 100)}%</span>
                </div>
                <input
                  ref={volumeRef}
                  type="range"
                  min="0"
                  max="2"
                  step="0.01"
                  value={sampleSettings.volume}
                  onChange={(e) => handleSettingChange('volume', parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Pitch Control */}
              <div className="pitch-control">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Pitch</span>
                  <span>{getPitchLabel(sampleSettings.pitch)} semitones</span>
                </div>
                <input
                  ref={pitchRef}
                  type="range"
                  min="-24"
                  max="24"
                  step="1"
                  value={sampleSettings.pitch}
                  onChange={(e) => handleSettingChange('pitch', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>

              {/* Loop & Reverse Toggles */}
              <div className="toggle-controls flex space-x-4">
                <label className="toggle-control flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sampleSettings.loop}
                    onChange={(e) => handleSettingChange('loop', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="text-xs text-gray-300">Loop</span>
                </label>
                
                <label className="toggle-control flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sampleSettings.reverse}
                    onChange={(e) => handleSettingChange('reverse', e.target.checked)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="text-xs text-gray-300">Reverse</span>
                </label>
              </div>
            </>
          )}

          {/* Advanced Controls Toggle */}
          <div className="advanced-toggle">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-xs text-gray-400 hover:text-white transition-colors py-2 border-t border-gray-600"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Controls
            </button>
          </div>

          {/* Advanced Controls */}
          {showAdvanced && selectedPadData?.sample && (
            <div className="advanced-controls bg-gray-900 p-3 rounded space-y-3">
              {/* Sample Start/End Points */}
              <div className="sample-trimming">
                <div className="text-xs text-gray-400 mb-2">Sample Trimming:</div>
                
                <div className="trim-control mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Start Point</span>
                    <span>{Math.round(sampleSettings.startPoint * 100)}%</span>
                  </div>
                  <input
                    ref={startRef}
                    type="range"
                    min="0"
                    max="0.9"
                    step="0.01"
                    value={sampleSettings.startPoint}
                    onChange={(e) => handleSettingChange('startPoint', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="trim-control">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>End Point</span>
                    <span>{Math.round(sampleSettings.endPoint * 100)}%</span>
                  </div>
                  <input
                    ref={endRef}
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.01"
                    value={sampleSettings.endPoint}
                    onChange={(e) => handleSettingChange('endPoint', parseFloat(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Fade Controls */}
              <div className="fade-controls">
                <div className="text-xs text-gray-400 mb-2">Fade Settings:</div>
                
                <div className="fade-control mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Fade In</span>
                    <span>{sampleSettings.fadeIn}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={sampleSettings.fadeIn}
                    onChange={(e) => handleSettingChange('fadeIn', parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="fade-control">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Fade Out</span>
                    <span>{sampleSettings.fadeOut}ms</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="10"
                    value={sampleSettings.fadeOut}
                    onChange={(e) => handleSettingChange('fadeOut', parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div className="preset-controls">
                <div className="text-xs text-gray-400 mb-2">Quick Presets:</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleSettingChange('volume', 0.8);
                      handleSettingChange('pitch', -12);
                      handleSettingChange('reverse', true);
                    }}
                    className="preset-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    🔄 Reverse Bass
                  </button>
                  <button
                    onClick={() => {
                      handleSettingChange('volume', 1.2);
                      handleSettingChange('pitch', 12);
                      handleSettingChange('loop', true);
                    }}
                    className="preset-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    🔥 High Energy
                  </button>
                  <button
                    onClick={() => {
                      handleSettingChange('fadeIn', 200);
                      handleSettingChange('fadeOut', 500);
                      handleSettingChange('volume', 0.6);
                    }}
                    className="preset-btn px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
                  >
                    🌊 Smooth
                  </button>
                  <button
                    onClick={() => {
                      setSampleSettings({
                        volume: 1.0,
                        pitch: 0,
                        startPoint: 0,
                        endPoint: 1,
                        loop: false,
                        reverse: false,
                        fadeIn: 0,
                        fadeOut: 0
                      });
                    }}
                    className="preset-btn px-2 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                  >
                    🔄 Reset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SampleControls;