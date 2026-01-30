import React, { useState, useCallback, useEffect, useRef } from "react";
import './styles.css';

const LightingControl = ({ id, onStyleChange = () => {}, style = {}, audioManager, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState({
    ...style,
    height: Math.max(600, style.height || 800)
  });

  // Professional lighting state
  const [lightingState, setLightingState] = useState({
    enabled: false,
    mode: 'manual', // manual, auto, audio
    activeBank: 1,
    activePosition: 1,
    bpm: 128,
    speed: 50,
    color: 50,
    autoLoopEnabled: false,
    autoLoopIntensity: 75,
    strobeEnabled: false,
    movementEnabled: false,
    hueEnabled: false,
    smokeEnabled: false
  });

  // Banks - each bank has 8 positions with scenes
  const [banks, setBanks] = useState({
    1: Array(8).fill(null).map((_, i) => ({ 
      name: `Scene ${i + 1}`, 
      color: ['red', 'yellow', 'white', 'white', 'green', 'cyan', 'magenta', 'blue'][i],
      fixtures: [],
      active: false
    })),
    2: Array(8).fill(null).map((_, i) => ({ 
      name: `Scene ${i + 9}`, 
      color: ['red', 'yellow', 'white', 'white', 'green', 'cyan', 'magenta', 'blue'][i],
      fixtures: [],
      active: false
    })),
    3: Array(8).fill(null).map((_, i) => ({ 
      name: `Scene ${i + 17}`, 
      color: ['red', 'yellow', 'white', 'white', 'green', 'cyan', 'magenta', 'blue'][i],
      fixtures: [],
      active: false
    })),
    4: Array(8).fill(null).map((_, i) => ({ 
      name: `Scene ${i + 25}`, 
      color: ['red', 'yellow', 'white', 'white', 'green', 'cyan', 'magenta', 'blue'][i],
      fixtures: [],
      active: false
    }))
  });

  // Fixture groups
  const [groups, setGroups] = useState({
    1: { name: 'Group 1', fixtures: [], active: false },
    2: { name: 'Group 2', fixtures: [], active: false },
    3: { name: 'Group 3', fixtures: [], active: false },
    4: { name: 'Group 4', fixtures: [], active: false }
  });

  // Active fixtures
  const [fixtures, setFixtures] = useState([]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.lighting-header') && !e.target.closest('button, input, select')) {
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
      width: Math.max(300, (prev.width || 400) + deltaX),
      height: Math.max(300, (prev.height || 400) + deltaY)
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
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

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

  const toggleEnabled = () => {
    setLightingState(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleModeChange = (mode) => {
    setLightingState(prev => ({ ...prev, mode }));
  };

  const handleBrightnessChange = (e) => {
    setLightingState(prev => ({ ...prev, brightness: parseInt(e.target.value) }));
  };

  const handleSpeedChange = (e) => {
    setLightingState(prev => ({ ...prev, speed: parseInt(e.target.value) }));
  };

  const handleColorSchemeChange = (e) => {
    setLightingState(prev => ({ ...prev, colorScheme: e.target.value }));
  };

  return (
    <div 
      className={`lighting-widget ${isDragging ? 'dragging' : ''}`}
      style={currentStyle} 
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="lighting-header">
        <h3>🎭 Lighting Control</h3>
        <button 
          className={`power-btn ${lightingState.enabled ? 'active' : ''}`}
          onClick={toggleEnabled}
        >
          {lightingState.enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      
      <div className="lighting-content">
        {/* Mode Selection */}
        <div className="control-section">
          <label>Mode</label>
          <div className="mode-buttons">
            {['auto', 'manual', 'audio'].map(mode => (
              <button
                key={mode}
                className={`mode-btn ${lightingState.mode === mode ? 'active' : ''}`}
                onClick={() => handleModeChange(mode)}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Brightness Control */}
        <div className="control-section">
          <label>Brightness: {lightingState.brightness}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={lightingState.brightness}
            onChange={handleBrightnessChange}
            className="slider"
          />
        </div>

        {/* Speed Control */}
        <div className="control-section">
          <label>Speed: {lightingState.speed}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={lightingState.speed}
            onChange={handleSpeedChange}
            className="slider"
          />
        </div>

        {/* Color Scheme */}
        <div className="control-section">
          <label>Color Scheme</label>
          <select 
            value={lightingState.colorScheme}
            onChange={handleColorSchemeChange}
            className="color-select"
          >
            <option value="rainbow">Rainbow</option>
            <option value="red">Red</option>
            <option value="blue">Blue</option>
            <option value="green">Green</option>
            <option value="purple">Purple</option>
            <option value="strobe">Strobe</option>
            <option value="pulse">Pulse</option>
          </select>
        </div>

        {/* Status */}
        <div className="status-section">
          <div className="status-indicator">
            <span className={`status-dot ${lightingState.enabled ? 'active' : ''}`}></span>
            <span className="status-text">
              {lightingState.enabled ? 'Active' : 'Standby'}
            </span>
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

export default LightingControl;
