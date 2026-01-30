import React, { useState, useCallback, useEffect, useRef } from "react";
import { ModernLightingController } from '../../../lighting/ModernLightingController';
import './styles.css';

const LightingControl = ({ id, onStyleChange = () => {}, style = {}, audioManager, ...props }) => {
  const widgetRef = useRef(null);
  const lightingControllerRef = useRef(null);
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
    console.log('BPM Tap');
  };

  const handleGroupToggle = (groupNum) => {
    setGroups(prev => ({
      ...prev,
      [groupNum]: { ...prev[groupNum], active: !prev[groupNum].active }
    }));
  };

  const toggleFeature = (feature) => {
    setLightingState(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  return (
    <div 
      className={`lighting-widget pro-controller ${isDragging ? 'dragging' : ''}`}
      style={currentStyle} 
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="lighting-header">
        <h3>PROFESSIONAL LIGHTING CONTROLLER</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            className="settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Connection Settings"
          >
            ⚙️
          </button>
          <div className={`connection-indicator ${connectionSettings.connected ? 'connected' : 'disconnected'}`}>
            {connectionSettings.connected ? '🔗' : '⚠️'}
          </div>
          <button 
            className={`power-btn ${lightingState.enabled ? 'active' : ''}`}
            onClick={toggleEnabled}
          >
            {lightingState.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
      
      <div className="lighting-content">
        {/* Connection Settings Panel */}
        {showSettings && (
          <div className="settings-panel">
            <h4>DMX Connection Settings</h4>
            
            <div className="important-note">
              <strong>⚠️ IMPORTANT NOTE:</strong><br/>
              Hardware controllers like SoundSwitch are <strong>OPTIONAL</strong> and do NOT connect to lights!<br/>
              They only give you physical buttons to control this software.<br/><br/>
              <strong>What actually connects to your lights:</strong><br/>
              A small DMX interface box (USB → DMX converter, ~$65-300)<br/>
              This is the ONLY required hardware besides this app!
            </div>
            
            <div className="setting-row">
              <label>Connection Method:</label>
              <select 
                value={connectionSettings.method} 
                onChange={(e) => setConnectionSettings(prev => ({ ...prev, method: e.target.value }))}
              >
                <option value="usb">USB DMX Interface</option>
                <option value="artnet">Art-Net (Ethernet)</option>
                <option value="sacn">sACN / E1.31 (Ethernet)</option>
                <option value="wifi">WiFi DMX</option>
              </select>
            </div>

            {connectionSettings.method === 'usb' && (
              <>
                <div className="setting-row">
                  <label>USB Interface:</label>
                  <select 
                    value={connectionSettings.interface}
                    onChange={(e) => setConnectionSettings(prev => ({ ...prev, interface: e.target.value }))}
                  >
                    {connectionSettings.availableDevices.map(dev => (
                      <option key={dev} value={dev}>{dev}</option>
                    ))}
                  </select>
                </div>
                <div className="info-box">
                  <strong>ℹ️ USB Connection:</strong><br/>
                  Connect your USB DMX interface to a USB port.<br/>
                  Supported: DMXKing, Enttec, Chauvet, ADJ
                </div>
              </>
            )}

            {(connectionSettings.method === 'artnet' || connectionSettings.method === 'sacn') && (
              <>
                <div className="setting-row">
                  <label>IP Address:</label>
                  <input 
                    type="text" 
                    value={connectionSettings.ipAddress}
                    onChange={(e) => setConnectionSettings(prev => ({ ...prev, ipAddress: e.target.value }))}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="setting-row">
                  <label>Port:</label>
                  <input 
                    type="number" 
                    value={connectionSettings.port}
                    onChange={(e) => setConnectionSettings(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="info-box">
                  <strong>ℹ️ Network Connection:</strong><br/>
                  {connectionSettings.method === 'artnet' ? 'Art-Net Default Port: 6454' : 'sACN Default Port: 5568'}<br/>
                  Make sure your computer and DMX node are on the same network.
                </div>
              </>
            )}

            <div className="setting-row">
              <label>DMX Universe:</label>
              <input 
                type="number" 
                min="1" 
                max="512"
                value={connectionSettings.universe}
                onChange={(e) => setConnectionSettings(prev => ({ ...prev, universe: parseInt(e.target.value) }))}
              />
            </div>

            <div className="settings-actions">
              <button className="scan-btn" onClick={scanDevices}>
                🔍 Scan Devices
              </button>
              <button 
                className={`connect-btn ${connectionSettings.connected ? 'connected' : ''}`}
                onClick={handleConnect}
              >
                {connectionSettings.connected ? '✓ Connected' : 'Connect'}
              </button>
            </div>

            <div className="connection-diagram">
              <strong>🔌 Complete Signal Chain:</strong>
              <div className="wiring-flow">
                <div className="wire-step">
                  <div className="wire-icon">🎛️</div>
                  <div className="wire-label">Hardware Controller<br/>(SoundSwitch - OPTIONAL)</div>
                </div>
                <div className="wire-arrow">➜<br/><span className="cable-type">USB (optional)</span></div>
                <div className="wire-step">
                  <div className="wire-icon">💻</div>
                  <div className="wire-label">Laptop<br/><strong>"THE BRAIN"</strong></div>
                </div>
                <div className="wire-arrow">➜<br/><span className="cable-type">USB Cable<br/>(Circled in pic)</span></div>
                <div className="wire-step highlight">
                  <div className="wire-icon">📦</div>
                  <div className="wire-label">DMX Interface<br/>"Translator Box"</div>
                </div>
                <div className="wire-arrow">➜<br/><span className="cable-type">DMX Cables<br/>Daisy-chain</span></div>
                <div className="wire-step">
                  <div className="wire-icon">💡💡💡</div>
                  <div className="wire-label">All Lights<br/>(Plug here!)</div>
                </div>
              </div>
              <div style={{ marginTop: '12px', fontSize: '10px', padding: '10px', background: 'rgba(0,200,100,0.15)', borderRadius: '6px', borderLeft: '3px solid #00ff66' }}>
                <strong style={{ color: '#00ff66' }}>✓ THE BRAIN:</strong> Your laptop running this software<br/>
                <strong style={{ color: '#00ccff' }}>✓ THE TRANSLATOR:</strong> Small DMX interface box (where lights actually connect)<br/>
                <strong style={{ color: '#ffaa00' }}>✓ OPTIONAL:</strong> Physical controller (SoundSwitch) - just gives you knobs/buttons
              </div>
            </div>

            <div className="hardware-guide">
              <strong>📦 What Actually Connects to the Lights:</strong>
              <p style={{ fontSize: '10px', margin: '8px 0', color: 'rgba(255,255,255,0.9)' }}>
                The <strong>DMX Interface</strong> is a small box (about the size of a deck of cards) that converts computer signals to DMX. <strong>This is where all your lights plug in!</strong>
              </p>
              
              <strong>DMX Interface Options (Required!):</strong>
              <ul>
                <li><strong>Enttec Open DMX USB ($65)</strong> - Simple, single universe</li>
                <li><strong>DMXKing ultraDMX Micro ($89)</strong> - Compact, reliable</li>
                <li><strong>Enttec DMX USB Pro Mk2 ($299)</strong> - Professional, 2 universes</li>
              </ul>

              <strong style={{ marginTop: '12px', display: 'block' }}>🎛️ Hardware Controller (Optional - Like in Your Pic):</strong>
              <p style={{ fontSize: '10px', margin: '8px 0', color: 'rgba(255,255,255,0.9)' }}>
                SoundSwitch, Chauvet Xpress, etc. are physical controllers with buttons and knobs. They DON'T connect to lights - they connect to your laptop to control this software. <strong>You can use this app with just a mouse - no hardware controller needed!</strong>
              </p>
              
              <p style={{ marginTop: '12px', fontSize: '10px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,100,0,0.15)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #ff6600' }}>
                <strong>🎯 Minimum Setup:</strong><br/>
                1. This app (free - already have it!)<br/>
                2. DMX Interface ($65-300) ← Lights plug into this<br/>
                3. DMX cables ($10-25 each)<br/>
                4. DMX lights<br/><br/>
                <strong>Hardware controller is NOT required!</strong> It just gives you physical buttons instead of clicking with a mouse.
              </p>
            </div>
          </div>
        )}

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
            </div>
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
