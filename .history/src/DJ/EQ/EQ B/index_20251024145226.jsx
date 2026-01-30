import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

const EQB = ({ id, audioContext, gainNode, pannerNode, onStyleChange = () => {}, style = {}, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState(style);
  
  const [eqValues, setEqValues] = useState(presets['Flat']);
  const [selectedPreset, setSelectedPreset] = useState('Flat');
  const [bypassEQ, setBypassEQ] = useState(false);
  const [eqFilters, setEqFilters] = useState([]);
  
  const filtersRef = useRef([]);
  const analyzerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

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

  // Initialize gains array
  useEffect(() => {
    const initialGains = new Array(16).fill(0);
    setGains(initialGains);
  }, []);

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

  // Initialize Web Audio API filters
  useEffect(() => {
    if (!audioContext || !gainNode) return;

    try {
      
      // Clear existing filters
      filtersRef.current.forEach(filter => {
        if (filter && filter.disconnect) {
          filter.disconnect();
        }
      });
      filtersRef.current = [];

      // Create 16 biquad filters for each frequency band
      const filters = expandedFrequencies.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        
        // Set filter type based on position
        if (index === 0) {
          filter.type = 'lowshelf';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
        } else if (index === expandedFrequencies.length - 1) {
          filter.type = 'highshelf';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
        } else {
          filter.type = 'peaking';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
          filter.Q.setValueAtTime(1.0, audioContext.currentTime);
        }
        
        filter.gain.setValueAtTime(gains[index] || 0, audioContext.currentTime);
        
        return filter;
      });

      // Store filters for later manipulation
      filtersRef.current = filters;

      // Insert EQ chain into AudioManager if available (with delay to ensure track is loaded)
      setTimeout(() => {
        if (window.audioManagerRef?.current) {
          window.audioManagerRef.current.insertEQChain('B', filters);
        }
      }, 500);

      // Create analyzer for visualization
      if (!analyzerRef.current) {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 2048;
        analyzerRef.current.smoothingTimeConstant = 0.8;
        
        if (filters.length > 0) {
          filters[filters.length - 1].connect(analyzerRef.current);
        }
      }

    } catch (error) {
      console.error('Error setting up EQ filters:', error);
    }
  }, [audioContext, gainNode, pannerNode]);

  // Handle gain change
  const handleGainChange = (index, value) => {
    const newGains = [...gains];
    newGains[index] = parseFloat(value);
    setGains(newGains);
    setPreset('custom'); // Switch to custom when manually adjusted

    // Update filter gain in real-time
    if (filtersRef.current[index] && audioContext) {
      try {
        const gainValue = bypassed ? 0 : newGains[index];
        filtersRef.current[index].gain.setValueAtTime(gainValue, audioContext.currentTime);
      } catch (error) {
        console.error(`[EQB] Error updating filter gain for band ${index}:`, error);
      }
    }
  };

  // Handle preset change
  const handlePresetChange = (presetName) => {
    setPreset(presetName);
    const presetGains = presets[presetName] || presets.flat;
    setGains([...presetGains]);

    // Update all filter gains immediately
    if (filtersRef.current.length > 0 && audioContext) {
      filtersRef.current.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            const gainValue = bypassed ? 0 : presetGains[index];
            filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
          } catch (error) {
            console.error(`[EQB] Error updating preset gain for band ${index}:`, error);
          }
        }
      });
    }
  };

  // Handle bypass toggle
  const handleBypass = () => {
    const newBypassed = !bypassed;
    setBypassed(newBypassed);

    if (filtersRef.current.length > 0 && audioContext) {
      filtersRef.current.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            const gainValue = newBypassed ? 0 : gains[index];
            filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
          } catch (error) {
            console.error(`[EQB] Error updating bypass state for band ${index}:`, error);
          }
        }
      });
    }
  };

  // Handle reset
  const handleReset = () => {
    handlePresetChange('flat');
  };

  // Format frequency display
  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
    }
    return `${freq}`;
  };

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
      
      <div className="eq-content eq-b">
        {/* Compact Control Bar - Single row with preset and buttons */}
        <div className="eq-control-bar">
          <select 
            className="eq-preset-select-compact"
            value={preset}
            onChange={(e) => handlePresetChange(e.target.value)}
            title="EQ Presets"
          >
            <option value="flat">Flat</option>
            <option value="bassBoost">Bass+</option>
            <option value="vocal">Vocal</option>
            <option value="trebleBoost">Treble+</option>
            <option value="vShape">V-Shape</option>
            <option value="loudness">Loudness</option>
            <option value="dance">Dance</option>
            <option value="rock">Rock</option>
            <option value="custom">Custom</option>
          </select>
          
          <button
            className={`eq-bypass-btn-compact ${bypassed ? 'active' : ''}`}
            onClick={handleBypass}
            title={bypassed ? 'EQ Bypassed - Click to activate' : 'EQ Active - Click to bypass'}
          >
            {bypassed ? '⊘' : '●'}
          </button>
          <button
            className="eq-reset-btn-compact"
            onClick={handleReset}
            title="Reset to Flat"
          >
            ⟲
          </button>
        </div>

        {/* EQ Bands */}
        <div className="eq-bands-container">
          <div className="eq-bands">
            {expandedFrequencies.map((freq, index) => (
              <div key={`eq-b-band-${index}`} className="eq-band-vertical">
                <div className="eq-gain-value">
                  {gains[index] > 0 ? '+' : ''}{gains[index]?.toFixed(1) || '0.0'}dB
                </div>
                
                <input
                  type="range"
                  className={`eq-slider ${bypassed ? 'bypassed' : ''}`}
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gains[index] || 0}
                  onChange={(e) => handleGainChange(index, e.target.value)}
                  disabled={bypassed}
                  orient="vertical"
                />
                
                <div className="eq-frequency">
                  {formatFrequency(freq)}
                </div>
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