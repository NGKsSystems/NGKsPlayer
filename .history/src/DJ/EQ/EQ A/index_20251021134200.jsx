import React, { useState, useCallback, useEffect, useRef } from "react";
import './styles.css';

const EQA = ({ audioContext, gainNode, pannerNode, style, onPositionChange, onSizeChange, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  // 16-band EQ frequencies (Hz) - full professional range
  const frequencies = [
    '31', '62', '125', '250', '500', '1K', '2K', '4K', 
    '8K', '16K', '31K', '62K', '125K', '250K', '500K', '1M'
  ];
  
  // Actual frequency values for Web Audio API
  const frequencyValues = [
    31, 62, 125, 250, 500, 1000, 2000, 4000,
    8000, 16000, 31000, 62000, 125000, 250000, 500000, 1000000
  ];
  
  // EQ presets for 16 bands
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

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.eq-a-header') && !e.target.closest('.eq-presets, .eq-controls-header')) {
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
      console.log('[EQA] Initializing EQ filters...');
      
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
      
      // Store filters for later manipulation
      setEqFilters(filters);
      
      // Insert EQ chain into AudioManager if available
      if (window.audioManagerRef?.current) {
        window.audioManagerRef.current.insertEQChain('A', filters);
      }
      
      console.log(`[EQA] Created ${filters.length} EQ filters for Deck A`);
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
    <div 
      ref={widgetRef}
      className={`eq-a-widget ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`} 
      style={style} 
      {...props}
    >
      <div className="eq-a-header" onMouseDown={handleMouseDown}>
        <h3>EQ A</h3>
        <div className="widget-controls">
          <span className="drag-handle">⋮⋮</span>
        </div>
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
      
      {/* Resize Handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
      >
        ⟲
      </div>
    </div>
  );
};

export default EQA;