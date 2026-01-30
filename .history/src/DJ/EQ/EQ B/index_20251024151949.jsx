import React, { useState, useCallback, useEffect, useRef } from "react";
import './styles.css';

const EQB = ({ id, audioContext, gainNode, pannerNode, onStyleChange = () => {}, style = {}, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState(style);
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
    if (e.target.closest('.eq-b-header') && !e.target.closest('.eq-presets, .eq-controls-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - (currentStyle.left || 0),
        y: e.clientY - (currentStyle.top || 0)
      });
      e.preventDefault();
    }
  }, [currentStyle]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setCurrentStyle(prev => ({
      ...prev,
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y
    }));
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    setCurrentStyle(prev => ({
      ...prev,
      width: Math.max(200, (prev.width || 300) + deltaX),
      height: Math.max(250, (prev.height || 300) + deltaY)
    }));
    
    setResizeStart({ x: e.clientX, y: e.clientY });
  }, [isResizing, resizeStart]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    // Only update style from props when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

  // Notify parent of style changes
  useEffect(() => {
    if (onStyleChange && (isDragging || isResizing)) {
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
  }, [currentStyle, isDragging, isResizing, id, onStyleChange]);
  
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
      
      // Store filters for later manipulation
      setEqFilters(filters);
      
      // Insert EQ chain into AudioManager if available (with delay to ensure track is loaded)
      setTimeout(() => {
        if (window.audioManagerRef?.current) {
          window.audioManagerRef.current.insertEQChain('B', filters);
        }
      }, 500);
    }
  }, [audioContext, gainNode, pannerNode, eqFilters.length]);
  
  // Update EQ when values or bypass state changes
  useEffect(() => {
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            const gainValue = bypassEQ ? 0 : eqValues[index];
            filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
          } catch (error) {
            console.error(`[EQB] Failed to update filter ${index}:`, error);
          }
        }
      });
    }
  }, [eqValues, bypassEQ, audioContext]);
  
  const handleBandChange = useCallback((bandIndex, value) => {
    const newValues = [...eqValues];
    newValues[bandIndex] = parseFloat(value);
    setEqValues(newValues);
    setSelectedPreset('Custom'); // Switch to custom when manually adjusted
    
    // Update the actual filter gain in real-time
    if (eqFilters[bandIndex] && audioContext) {
      try {
        const gainValue = bypassEQ ? 0 : newValues[bandIndex];
        eqFilters[bandIndex].gain.setValueAtTime(gainValue, audioContext.currentTime);
      } catch (error) {
        console.error(`[EQB] Failed to update band ${bandIndex}:`, error);
      }
    }
  }, [eqValues, eqFilters, audioContext, bypassEQ]);
  
  const handlePresetChange = useCallback((presetName) => {
    setSelectedPreset(presetName);
    const presetValues = [...presets[presetName]];
    setEqValues(presetValues);
    
    // Apply preset to all filters immediately
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            const gainValue = bypassEQ ? 0 : presetValues[index];
            filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
          } catch (error) {
            console.error(`[EQB] Failed to apply preset to band ${index}:`, error);
          }
        }
      });
    }
  }, [eqFilters, audioContext, bypassEQ, presets]);
  
  const handleReset = useCallback(() => {
    setSelectedPreset('Flat');
    setEqValues([...presets['Flat']]);
    
    // Reset all filter gains to 0
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            filter.gain.setValueAtTime(0, audioContext.currentTime);
          } catch (error) {
            console.error(`[EQB] Failed to reset band ${index}:`, error);
          }
        }
      });
    }
  }, [eqFilters, audioContext, presets]);
  
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
      className={`eq-b-widget ${isDragging ? 'dragging' : ''}`} 
      style={currentStyle} 
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="eq-b-header" onMouseDown={handleMouseDown}>
        <h3>EQ B</h3>
        <div className="widget-controls">
          <span className="drag-handle">⋮⋮</span>
        </div>
      </div>
      <div className={`eq-content eq-b`}>
        {/* Compact Control Bar - Preset + Buttons */}
        <div className="eq-control-bar" onMouseDown={handleControlMouseDown}>
          <select 
            value={selectedPreset} 
            onChange={(e) => handlePresetChange(e.target.value)}
            className="eq-preset-select-compact"
            onMouseDown={handleControlMouseDown}
            title="EQ Presets"
          >
            {Object.keys(presets).map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
          <button 
            className={`eq-bypass-btn-compact ${bypassEQ ? 'active' : ''}`}
            onClick={() => setBypassEQ(!bypassEQ)}
            onMouseDown={handleControlMouseDown}
            title={bypassEQ ? 'EQ Bypassed - Click to activate' : 'EQ Active - Click to bypass'}
          >
            {bypassEQ ? '⊘' : '●'}
          </button>
          <button 
            className="eq-reset-btn-compact" 
            onClick={handleReset}
            onMouseDown={handleControlMouseDown}
            title="Reset to Flat"
          >
            ⟲
          </button>
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
      </div>
      
      {/* Resize Handle */}
      <div 
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      >
        ⟲
      </div>
    </div>
  );
};

export default EQB;