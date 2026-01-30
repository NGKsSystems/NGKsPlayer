import { useState } from 'react';

export default function BeatDetectionPanel({
  // Panel state
  show,
  onClose,
  
  // Debug values
  debugValues,
  
  // Essentia state
  useEssentiaBeats,
  setUseEssentiaBeats,
  essentiaReady,
  currentTrack,
  
  // Advanced Essentia controls
  showAdvanced,
  setShowAdvanced,
  onsetMethod,
  setOnsetMethod,
  onsetThreshold,
  setOnsetThreshold,
  silenceThreshold,
  setSilenceThreshold,
  confidenceGate,
  setConfidenceGate,
  lowFreqWeight,
  setLowFreqWeight,
  minBeatInterval,
  setMinBeatInterval,
  postProcessMode,
  setPostProcessMode,
  
  // Basic controls
  beatSpikeThreshold,
  setBeatSpikeThreshold,
  beatMinimum,
  setBeatMinimum,
  beatGate,
  setBeatGate,
  beatHistoryLength,
  setBeatHistoryLength
}) {
  const [panelPos, setPanelPos] = useState({ x: 20, y: 80 });
  const [panelSize, setPanelSize] = useState({ width: 320, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panelExpanded, setPanelExpanded] = useState(true);

  if (!show) return null;

  return (
    <div 
      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl"
      style={{ 
        left: `${panelPos.x}px`, 
        top: `${panelPos.y}px`,
        width: `${panelSize.width}px`,
        height: `${panelSize.height}px`,
        zIndex: 9999,
        cursor: isDragging ? 'grabbing' : 'default'
      }}
      onMouseMove={(e) => {
        if (isDragging) {
          setPanelPos({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
          });
        }
        if (isResizing) {
          const deltaX = e.clientX - resizeStart.x;
          const deltaY = e.clientY - resizeStart.y;
          setPanelSize({
            width: Math.max(280, resizeStart.width + deltaX),
            height: Math.max(300, resizeStart.height + deltaY)
          });
        }
      }}
      onMouseUp={() => {
        setIsDragging(false);
        setIsResizing(false);
      }}
      onMouseLeave={() => {
        setIsDragging(false);
        setIsResizing(false);
      }}
    >
      {/* Drag Handle */}
      <div 
        className="bg-gray-700 px-4 py-2 rounded-t-lg cursor-grab active:cursor-grabbing flex justify-between items-center"
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStart({
            x: e.clientX - panelPos.x,
            y: e.clientY - panelPos.y
          });
        }}
      >
        <h3 className="text-lg font-bold text-gray-200">⚙️ Beat Detection</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPanelExpanded(!panelExpanded);
            }}
            className="text-gray-400 hover:text-white text-base leading-none"
          >
            {panelExpanded ? '▼' : '▶'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>
      
      {panelExpanded && (
      <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
        {/* LIVE DEBUG DISPLAY */}
        <div className="mb-4 p-3 bg-gray-900 rounded border border-purple-500">
          <div className="text-sm font-mono space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Current Bass:</span>
              <span className="text-purple-300 font-bold">{debugValues.bass}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Average Bass:</span>
              <span className="text-purple-300">{debugValues.avgBass}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-gray-700">
              <div className={`text-center p-1 rounded ${debugValues.spike ? 'bg-green-600' : 'bg-red-900'}`}>
                <div className="text-xs">Spike</div>
                <div className="font-bold">{debugValues.spike ? '✓' : '✗'}</div>
              </div>
              <div className={`text-center p-1 rounded ${debugValues.min ? 'bg-green-600' : 'bg-red-900'}`}>
                <div className="text-xs">Min</div>
                <div className="font-bold">{debugValues.min ? '✓' : '✗'}</div>
              </div>
              <div className={`text-center p-1 rounded ${debugValues.gate ? 'bg-green-600' : 'bg-red-900'}`}>
                <div className="text-xs">Gate</div>
                <div className="font-bold">{debugValues.gate ? '✓' : '✗'}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Essentia.js Toggle */}
        <div className="mb-4 p-3 bg-gray-900 rounded border border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-bold text-blue-400">Essentia.js Beat Detection</h4>
              <p className="text-sm text-gray-400 mt-1">Professional ML-based beat tracking</p>
              {essentiaReady && <p className="text-sm text-green-400 mt-1">✓ WASM Loaded</p>}
            </div>
            <button
              onClick={() => setUseEssentiaBeats(!useEssentiaBeats)}
              className={`px-4 py-2 rounded font-bold transition-all ${
                useEssentiaBeats 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {useEssentiaBeats ? 'ON' : 'OFF'}
            </button>
          </div>
          {useEssentiaBeats && (
            <div className="mt-2 text-xs text-gray-400">
              Genre: <span className="font-mono text-purple-400">{currentTrack?.genre || 'rock'}</span>
            </div>
          )}
        </div>
        
        {/* Advanced Essentia.js Controls */}
        {useEssentiaBeats && essentiaReady && (
          <div className="mb-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-2 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-left flex items-center justify-between"
            >
              <span className="text-base font-bold text-blue-300">⚡ Advanced (Essentia ML)</span>
              <span className="text-gray-400">{showAdvanced ? '▼' : '▶'}</span>
            </button>
            
            {showAdvanced && (
              <div className="mt-3 p-3 bg-gray-900 rounded border border-blue-500 space-y-3 text-sm">
                {/* Onset Method */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Onset Algorithm</span>
                    <span className="font-mono text-blue-400">{onsetMethod}</span>
                  </label>
                  <select
                    value={onsetMethod}
                    onChange={(e) => setOnsetMethod(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-600"
                  >
                    <option value="complex">complex (default)</option>
                    <option value="hfc">hfc (high-freq)</option>
                    <option value="energy">energy</option>
                    <option value="spectral_flux">spectral_flux</option>
                    <option value="highfreq">highfreq</option>
                  </select>
                  <p className="text-gray-500 text-xs mt-1">complex/hfc best for rock</p>
                </div>
                
                {/* Onset Threshold */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Onset Sensitivity</span>
                    <span className="font-mono text-blue-400">{onsetThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.02"
                    max="0.20"
                    step="0.01"
                    value={onsetThreshold}
                    onChange={(e) => setOnsetThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-500 text-xs mt-1">Lower = more sensitive</p>
                </div>
                
                {/* Silence Threshold */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Silence Gate</span>
                    <span className="font-mono text-blue-400">{silenceThreshold.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.20"
                    step="0.01"
                    value={silenceThreshold}
                    onChange={(e) => setSilenceThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-500 text-xs mt-1">Ignore quiet sections</p>
                </div>
                
                {/* Confidence Gate */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Confidence Threshold</span>
                    <span className="font-mono text-blue-400">{confidenceGate.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.4"
                    max="0.9"
                    step="0.05"
                    value={confidenceGate}
                    onChange={(e) => setConfidenceGate(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-500 text-xs mt-1">Higher = fewer false positives</p>
                </div>
                
                {/* Low Freq Weight */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Kick Drum Boost</span>
                    <span className="font-mono text-blue-400">{lowFreqWeight.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={lowFreqWeight}
                    onChange={(e) => setLowFreqWeight(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-500 text-xs mt-1">Emphasize low frequencies (&lt;200Hz)</p>
                </div>
                
                {/* Min Beat Interval */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Min Beat Interval</span>
                    <span className="font-mono text-blue-400">{minBeatInterval}ms</span>
                  </label>
                  <input
                    type="range"
                    min="200"
                    max="600"
                    step="10"
                    value={minBeatInterval}
                    onChange={(e) => setMinBeatInterval(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-gray-500 text-xs mt-1">Prevents rapid-fire triggers</p>
                </div>
                
                {/* Post-Process Mode */}
                <div>
                  <label className="flex justify-between text-gray-300 mb-1">
                    <span>Post-Processing</span>
                    <span className="font-mono text-blue-400">{postProcessMode}</span>
                  </label>
                  <select
                    value={postProcessMode}
                    onChange={(e) => setPostProcessMode(e.target.value)}
                    className="w-full bg-gray-800 text-white rounded px-2 py-1 border border-gray-600"
                  >
                    <option value="none">none (raw)</option>
                    <option value="comb">comb filter</option>
                    <option value="grid">grid lock (BPM sync)</option>
                  </select>
                  <p className="text-gray-500 text-xs mt-1">Grid lock snaps to tempo</p>
                </div>
                
                {/* Reset Advanced */}
                <button
                  onClick={() => {
                    setOnsetMethod('complex');
                    setOnsetThreshold(0.08);
                    setSilenceThreshold(0.10);
                    setConfidenceGate(0.65);
                    setLowFreqWeight(1.8);
                    setMinBeatInterval(350);
                    setPostProcessMode('none');
                  }}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                >
                  Reset Advanced Defaults
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Basic Controls */}
        <div className="mb-4 p-3 bg-gray-900 rounded border border-gray-600">
          <h4 className="text-base font-bold text-gray-300 mb-3">Basic Controls</h4>
          
          {/* Spike Threshold */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-300 mb-1 text-sm">
              <span>Spike Threshold</span>
              <span className="font-mono text-green-400">{beatSpikeThreshold.toFixed(2)}x</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBeatSpikeThreshold(Math.max(1.0, beatSpikeThreshold - 0.1))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▼</button>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={beatSpikeThreshold}
                onChange={(e) => setBeatSpikeThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setBeatSpikeThreshold(Math.min(3.0, beatSpikeThreshold + 0.1))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▲</button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Higher = only strong drum hits</p>
          </div>
          
          {/* Bass Minimum */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-300 mb-1 text-sm">
              <span>Bass Minimum</span>
              <span className="font-mono text-green-400">{beatMinimum}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBeatMinimum(Math.max(20, beatMinimum - 5))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▼</button>
              <input
                type="range"
                min="20"
                max="200"
                step="5"
                value={beatMinimum}
                onChange={(e) => setBeatMinimum(parseInt(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setBeatMinimum(Math.min(200, beatMinimum + 5))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▲</button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Higher = ignores quiet sections</p>
          </div>
          
          {/* Time Gate */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-300 mb-1 text-sm">
              <span>Time Gate</span>
              <span className="font-mono text-green-400">{beatGate}ms</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBeatGate(Math.max(100, beatGate - 10))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▼</button>
              <input
                type="range"
                min="100"
                max="500"
                step="10"
                value={beatGate}
                onChange={(e) => setBeatGate(parseInt(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setBeatGate(Math.min(500, beatGate + 10))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▲</button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Higher = prevents rapid triggers</p>
          </div>
          
          {/* History Frames */}
          <div className="mb-3">
            <label className="flex justify-between text-gray-300 mb-1 text-sm">
              <span>History Frames</span>
              <span className="font-mono text-green-400">{beatHistoryLength}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBeatHistoryLength(Math.max(10, beatHistoryLength - 1))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▼</button>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={beatHistoryLength}
                onChange={(e) => setBeatHistoryLength(parseInt(e.target.value))}
                className="flex-1"
              />
              <button
                onClick={() => setBeatHistoryLength(Math.min(100, beatHistoryLength + 1))}
                className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-sm"
              >▲</button>
            </div>
            <p className="text-gray-500 text-xs mt-1">Lower = faster adaptation</p>
          </div>
          
          {/* Reset Button */}
          <button
            onClick={() => {
              setBeatSpikeThreshold(1.4);
              setBeatMinimum(100);
              setBeatGate(250);
              setBeatHistoryLength(60);
            }}
            className="w-full mt-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-white text-base font-semibold"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
      )}
      
      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
        style={{
          background: 'linear-gradient(135deg, transparent 50%, rgba(156, 163, 175, 0.5) 50%)',
          borderBottomRightRadius: '0.5rem'
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizing(true);
          setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: panelSize.width,
            height: panelSize.height
          });
        }}
      />
    </div>
  );
}
