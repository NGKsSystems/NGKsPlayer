import React, { useState, useCallback, useEffect, useRef } from "react";
import './styles.css';

const EQA = ({ audioContext, gainNode, pannerNode, style, onPositionChange, onSizeChange, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  // 8-band EQ frequencies (Hz) - more manageable
  const frequencies = [
    '60', '170', '310', '600', '1K', '3K', '6K', '12K'
  ];
  
  // Actual frequency values for Web Audio API
  const frequencyValues = [
    60, 170, 310, 600, 1000, 3000, 6000, 12000
  ];
  
  // EQ presets for 8 bands
  const presets = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0],
    'Rock': [3, 2, -1, 1, 4, 3, 2, 1],
    'Pop': [1, 2, 3, 0, -1, 1, 2, 1],
    'Hip-Hop': [5, 4, 2, -1, 1, 2, 3, 2],
    'Electronic': [2, 3, 1, 2, 4, 3, 5, 4],
    'Jazz': [2, 1, 1, 2, 1, 1, 0, -1],
    'Classical': [0, 0, 0, 1, 1, 2, 1, 0],
    'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0],
    'Treble Boost': [0, 0, 0, 0, 1, 3, 5, 4],
    'Vocal': [0, -1, 1, 3, 4, 3, 1, 0],
    'Dance': [4, 3, 2, 0, 1, 2, 3, 2],
    'Loudness': [3, 2, 0, 0, 0, 1, 2, 1]
  };
  
  const [eqValues, setEqValues] = useState(presets['Flat']);
  const [selectedPreset, setSelectedPreset] = useState('Flat');
  const [bypassEQ, setBypassEQ] = useState(false);
  const [eqFilters, setEqFilters] = useState([]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.eq-header') && !e.target.closest('.eq-presets, .eq-controls-header')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialPosition({
        x: parseInt(style?.left) || 0,
        y: parseInt(style?.top) || 0
      });
      e.preventDefault();
    }
  }, [style]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newX = initialPosition.x + deltaX;
      const newY = initialPosition.y + deltaY;
      
      if (onPositionChange) {
        onPositionChange({ x: newX, y: newY });
      }
    }
  }, [isDragging, dragStart, initialPosition, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({
      width: parseInt(style?.width) || 250,
      height: parseInt(style?.height) || 300
    });
    e.preventDefault();
    e.stopPropagation();
  }, [style]);

  const handleResizeMouseMove = useCallback((e) => {
    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newWidth = Math.max(200, initialSize.width + deltaX);
      const newHeight = Math.max(250, initialSize.height + deltaY);
      
      if (onSizeChange) {
        onSizeChange({ width: newWidth, height: newHeight });
      }
    }
  }, [isResizing, dragStart, initialSize, onSizeChange]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse events
  useEffect(() => {
    if (isDragging || isResizing) {
      const handleMove = isDragging ? handleMouseMove : handleResizeMouseMove;
      const handleUp = isDragging ? handleMouseUp : handleResizeMouseUp;
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleResizeMouseMove, handleResizeMouseUp]);
  
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
  }, [audioContext, gainNode, pannerNode, eqFilters.length, frequencyValues]);
  
  // Update EQ when values change
  useEffect(() => {
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        const gainValue = bypassEQ ? 0 : eqValues[index];
        filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
      });
    }
  }, [eqValues, bypassEQ, eqFilters, audioContext]);
  
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
    <div className="eq-a-widget" style={style} {...props}>
      <div className="eq-a-header">
        <h3>EQ A</h3>
      </div>
      <div className={`eq-content eq-a`}>
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
    </div>
  );
};

export default EQA;