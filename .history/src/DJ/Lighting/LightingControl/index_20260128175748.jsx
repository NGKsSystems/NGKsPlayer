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

  // Connection settings
  const [showSettings, setShowSettings] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState({
    method: 'usb', // usb, artnet, sacn, wifi
    interface: 'DMXKing ultraDMX Micro',
    universe: 1,
    ipAddress: '192.168.1.100',
    port: 6454,
    connected: false,
    availableDevices: [
      'DMXKing ultraDMX Micro',
      'Enttec DMX USB Pro',
      'Enttec Open DMX USB',
      'DMXKing ultraDMX Pro',
      'Chauvet DJ Xpress',
      'ADJ MyDMX GO'
    ]
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

  const handleBankChange = (bank) => {
    setLightingState(prev => ({ ...prev, activeBank: bank }));
  };

  const handlePositionClick = (position) => {
    setLightingState(prev => ({ ...prev, activePosition: position }));
    // Activate scene
    setBanks(prev => ({
      ...prev,
      [lightingState.activeBank]: prev[lightingState.activeBank].map((scene, idx) => ({
        ...scene,
        active: idx === position - 1
      }))
    }));
  };

  const handleBPMTap = () => {
    // BPM tap implementation
    console.log('BPM Tap');pro-controller ${isDragging ? 'dragging' : ''}`}
      style={currentStyle} 
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="lighting-header">
        <h3>PROFESSIONAL LIGHTING CONTROLLER</h3>
        <button 
          className={`power-btn ${lightingState.enabled ? 'active' : ''}`}
          onClick={toggleEnabled}
        >
          {lightingState.enabled ? 'ON' : 'OFF'}
        </button>
      </div>
      
      <div className="lighting-content">
        {/* Top Control Section */}
        <div className="top-controls">
          {/* Display */}
          <div className="lcd-display">
            <div className="display-line">MODE: {lightingState.mode.toUpperCase()}</div>
            <div className="display-line">BANK {lightingState.activeBank} / POS {lightingState.activePosition}</div>
            <div className="display-line">BPM: {lightingState.bpm}</div>
          </div>

          {/* Knobs */}
          <div className="knob-section">
            <div className="knob-group">
              <label>SPEED</label>
              <div className="knob">{lightingState.speed}</div>
              <input type="range" min="0" max="100" value={lightingState.speed} 
                onChange={(e) => setLightingState(prev => ({ ...prev, speed: parseInt(e.target.value) }))} />
            </div>
            <div className="knob-group">
              <label>COLOR</label>
              <div className="knob">{lightingState.color}</div>
              <input type="range" min="0" max="100" value={lightingState.color}
                onChange={(e) => setLightingState(prev => ({ ...prev, color: parseInt(e.target.value) }))} />
            </div>
          </div>

          {/* Top Buttons */}
          <div className="top-buttons">
            <button className="func-btn" onClick={handleBPMTap}>BPM TAP</button>
            <button className={`func-btn ${lightingState.autoLoopEnabled ? 'active' : ''}`} 
              onClick={() => toggleFeature('autoLoopEnabled')}>AUTO-LOOP</button>
          </div>
        </div>

        {/* Function Buttons Row */}
        <div className="function-row">
          <button className="func-btn secondary">▶/⏸</button>
          <button className="func-btn secondary">SHIFT</button>
          <button className={`func-btn ${lightingState.movementEnabled ? 'active' : ''}`}
            onClick={() => toggleFeature('movementEnabled')}>MOVEMENT</button>
          <button className={`func-btn ${lightingState.strobeEnabled ? 'active' : ''}`}
            onClick={() => toggleFeature('strobeEnabled')}>STROBE</button>
          <button className={`func-btn ${lightingState.hueEnabled ? 'active' : ''}`}
            onClick={() => toggleFeature('hueEnabled')}>HUE</button>
          <button className={`func-btn ${lightingState.smokeEnabled ? 'active' : ''}`}
            onClick={() => toggleFeature('smokeEnabled')}>SMOKE</button>
        </div>

        {/* Position Buttons - Color Coded */}
        <div className="position-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(pos => {
            const colors = ['red', 'yellow', 'white', 'white', 'green', 'cyan', 'magenta', 'blue'];
            const labels = ['RED', 'YELLOW', 'WHITE COLD', 'WHITE HOLD', 'BLACK', 'BLACK HOLD', '', 'UV HOLD'];
            return (
              <button 
                key={pos}
                className={`position-btn color-${colors[pos-1]} ${lightingState.activePosition === pos ? 'active' : ''}`}
                onClick={() => handlePositionClick(pos)}
              >
                <div className="pos-label">POSITION {pos}</div>
                <div className="pos-color">{labels[pos-1]}</div>
              </button>
            );
          })}
        </div>

        {/* Bank Scene Grid */}
        <div className="bank-controls">
          {/* Bank Headers */}
          <div className="bank-headers">
            {[1, 2, 3, 4].map(bank => (
              <button 
                key={bank}
                className={`bank-btn ${lightingState.activeBank === bank ? 'active' : ''}`}
                onClick={() => handleBankChange(bank)}
              >
                BANK {bank}
              </button>
            ))}
          </div>

          {/* Scene Grid - 8 rows x 4 columns */}
          <div className="scene-grid">
            {Array(8).fill(null).map((_, row) => (
              <div key={row} className="scene-row">
                {[1, 2, 3, 4].map(bank => {
                  const scene = banks[bank][row];
                  return (
                    <button 
                      key={`${bank}-${row}`}
                      className={`scene-btn color-${scene.color} ${scene.active ? 'active' : ''}`}
                      onClick={() => {
                        handleBankChange(bank);
                        handlePositionClick(row + 1);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Controls */}
        <div className="right-controls">
          <div className="auto-loop-section">
            <button className="func-btn small">AUTO LOOP</button>
            <div className="loop-intensity">
              <label>INTENSITY</label>
              <input 
                type="range" 
                orient="vertical"
                min="0" 
                max="100" 
                value={lightingState.autoLoopIntensity}
                onChange={(e) => setLightingState(prev => ({ ...prev, autoLoopIntensity: parseInt(e.target.value) }))}
                className="vertical-slider"
              />
              <div className="intensity-value">{lightingState.autoLoopIntensity}%</div>
            </div>
          </div>

          {/* Groups */}
          <div className="groups-section">
            {[1, 2, 3, 4].map(groupNum => (
              <button 
                key={groupNum}
                className={`group-btn ${groups[groupNum].active ? 'active' : ''}`}
                onClick={() => handleGroupToggle(groupNum)}
              >
                GROUP {groupNum}
              </button>
            ))}
          </div>

          {/* Master Fader */}
          <div className="master-fader">
            <div className="fader-track">
              <div className="fader-indicators">
                {Array(10).fill(null).map((_, i) => (
                  <div key={i} className="fader-led" />
                ))}
              </div>
            </divn value="rainbow">Rainbow</option>
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
