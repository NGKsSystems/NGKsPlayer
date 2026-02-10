/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
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
    width: style.width || 1100,
    height: Math.max(800, style.height || 900)
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
  const [showHardwareGuide, setShowHardwareGuide] = useState(false);
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
    
    // Send to DMX controller
    if (lightingControllerRef.current && connectionSettings.connected) {
      const scene = banks[lightingState.activeBank][position - 1];
      console.log(`[LightingControl] Activating scene: Bank ${lightingState.activeBank}, Position ${position} (${scene.color})`);
      
      // Create DMX universe data for this scene
      const universeData = new Array(512).fill(0);
      
      // Example: Map scene colors to DMX channels
      // This is where you'd program actual fixture control
      const colorMap = {
        red: [255, 0, 0],
        yellow: [255, 255, 0],
        white: [255, 255, 255],
        green: [0, 255, 0],
        cyan: [0, 255, 255],
        magenta: [255, 0, 255],
        blue: [0, 0, 255]
      };
      
      const rgb = colorMap[scene.color] || [255, 255, 255];
      
      // Set first fixture (channels 1-3 = RGB)
      universeData[0] = rgb[0];
      universeData[1] = rgb[1];
      universeData[2] = rgb[2];
      
      // Set intensity based on speed slider
      universeData[3] = Math.floor((lightingState.speed / 100) * 255);
      
      // Send to DMX
      lightingControllerRef.current.sendUniverse(universeData);
    }
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
    const newState = !lightingState[feature];
    setLightingState(prev => ({ ...prev, [feature]: newState }));
    
    // Send feature control to DMX
    if (lightingControllerRef.current && connectionSettings.connected) {
      console.log(`[LightingControl] ${feature}: ${newState ? 'ON' : 'OFF'}`);
      
      const universeData = new Array(512).fill(0);
      
      // Map features to DMX channels (example mapping)
      if (feature === 'strobeEnabled') {
        universeData[10] = newState ? 255 : 0; // Strobe channel
      } else if (feature === 'movementEnabled') {
        universeData[11] = newState ? 128 : 0; // Movement channel
      } else if (feature === 'smokeEnabled') {
        universeData[12] = newState ? 255 : 0; // Smoke machine channel
      }
      
      lightingControllerRef.current.sendUniverse(universeData);
    }
  };

  const scanDevices = async () => {
    console.log('[LightingControl] ðŸ” Scanning for DMX interfaces...');
    
    // Simulate device scan
    const foundDevices = [];
    
    // Check for USB devices
    foundDevices.push('DMXKing ultraDMX Micro (USB)');
    
    // Check for network devices (Art-Net/sACN)
    try {
      // In real implementation, would scan network for Art-Net nodes
      foundDevices.push('Art-Net Node at 192.168.1.50');
      foundDevices.push('sACN Device at 192.168.1.100');
    } catch (err) {
      console.log('No network devices found');
    }
    
    const deviceList = foundDevices.join('\nâ€¢ ');
    alert(`Scanning for devices...\n\nFound:\nâ€¢ ${deviceList}`);
    
    console.log('[LightingControl] Found devices:', foundDevices);
  };

  const handleConnect = async () => {
    if (connectionSettings.connected) {
      // Disconnect
      if (lightingControllerRef.current) {
        await lightingControllerRef.current.disconnect();
        lightingControllerRef.current = null;
      }
      setConnectionSettings(prev => ({ ...prev, connected: false }));
      console.log('[LightingControl] Disconnected from DMX');
    } else {
      // Connect
      try {
        console.log('[LightingControl] Connecting to DMX...', connectionSettings);
        
        // Initialize the lighting controller
        const controller = new ModernLightingController();
        
        const config = {
          protocol: connectionSettings.method === 'artnet' ? 'artnet' : 
                     connectionSettings.method === 'sacn' ? 'sacn' : 'dmx512',
          universe: connectionSettings.universe,
          targetIP: connectionSettings.ipAddress,
          port: connectionSettings.port
        };
        
        await controller.initialize(config);
        lightingControllerRef.current = controller;
        
        setConnectionSettings(prev => ({ ...prev, connected: true }));
        console.log('[LightingControl] âœ“ Connected to DMX successfully');
        
        // Get performance stats
        const stats = controller.getPerformanceStats();
        console.log('[LightingControl] Performance:', stats);
      } catch (error) {
        console.error('[LightingControl] Connection failed:', error);
        alert(`Failed to connect: ${error.message}`);
      }
    }
  };

  const downloadHardwareGuide = () => {
    const guideText = `DMX LIGHTING HARDWARE SETUP GUIDE
========================================

âš ï¸ IMPORTANT NOTE:
Hardware controllers like SoundSwitch are OPTIONAL and do NOT connect to lights!
They only give you physical buttons to control this software.

ðŸ”Œ COMPLETE SIGNAL CHAIN:

1. ðŸŽ›ï¸ Hardware Controller (SoundSwitch - OPTIONAL)
   â†“ USB (optional)
   
2. ðŸ’» Laptop - "THE BRAIN"
   Your laptop running this software
   â†“ USB Cable (Circled in pic)
   
3. ðŸ“¦ DMX Interface - "THE TRANSLATOR"
   Small DMX interface box (where lights actually connect)
   â†“ DMX Cables (Daisy-chain)
   
4. ðŸ’¡ðŸ’¡ðŸ’¡ All Lights
   Plug here!

========================================
WHAT ACTUALLY CONNECTS TO THE LIGHTS:
========================================

The DMX Interface is a small box (about the size of a deck of cards) 
that converts computer signals to DMX. This is where all your lights plug in!

DMX INTERFACE OPTIONS (Required!):
â€¢ Enttec Open DMX USB ($65) - Simple, single universe
â€¢ DMXKing ultraDMX Micro ($89) - Compact, reliable
â€¢ Enttec DMX USB Pro Mk2 ($299) - Professional, 2 universes

========================================
HARDWARE CONTROLLER (Optional):
========================================

SoundSwitch, Chauvet Xpress, etc. are physical controllers with buttons 
and knobs. They DON'T connect to lights - they connect to your laptop 
to control this software.

You can use this app with just a mouse - no hardware controller needed!

========================================
MINIMUM SETUP:
========================================

1. This app (free - already have it!)
2. DMX Interface ($65-300) â† Lights plug into this
3. DMX cables ($10-25 each)
4. DMX lights

Hardware controller is NOT required! 
It just gives you physical buttons instead of clicking with a mouse.

========================================
CONNECTION METHODS:
========================================

â€¢ USB DMX Interface - Most common, plug and play
â€¢ Art-Net (Ethernet) - Network-based, supports multiple universes
â€¢ sACN / E1.31 (Ethernet) - Industry standard network protocol
â€¢ WiFi DMX - Wireless connection

========================================
Generated by NGKsPlayer Professional Lighting Controller
${new Date().toLocaleString()}
`;
    
    const blob = new Blob([guideText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DMX_Hardware_Setup_Guide.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('[LightingControl] Downloaded hardware setup guide');
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
            âš™ï¸
          </button>
          <div className={`connection-indicator ${connectionSettings.connected ? 'connected' : 'disconnected'}`}>
            {connectionSettings.connected ? 'ðŸ”—' : 'âš ï¸'}
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
        {/* Hardware Guide Modal */}
        {showHardwareGuide && (
          <div className="modal-overlay" onClick={() => setShowHardwareGuide(false)}>
            <div className="hardware-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>ðŸ’¡ DMX Hardware Setup Guide</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="download-btn" onClick={downloadHardwareGuide}>
                    ðŸ“¥ Download Guide
                  </button>
                  <button className="close-btn" onClick={() => setShowHardwareGuide(false)}>
                    âœ•
                  </button>
                </div>
              </div>
              
              <div className="modal-content">
                <div className="important-note">
                  <strong>âš ï¸ IMPORTANT NOTE:</strong><br/>
                  Hardware controllers like SoundSwitch are <strong>OPTIONAL</strong> and do NOT connect to lights!<br/>
                  They only give you physical buttons to control this software.<br/><br/>
                  <strong>What actually connects to your lights:</strong><br/>
                  A small DMX interface box (USB â†’ DMX converter, ~$65-300)<br/>
                  This is the ONLY required hardware besides this app!
                </div>

                <div className="connection-diagram">
                  <strong>ðŸ”Œ Complete Signal Chain:</strong>
                  <div className="wiring-flow">
                    <div className="wire-step">
                      <div className="wire-icon">ðŸŽ›ï¸</div>
                      <div className="wire-label">Hardware Controller<br/>(SoundSwitch - OPTIONAL)</div>
                    </div>
                    <div className="wire-arrow">âžœ<br/><span className="cable-type">USB (optional)</span></div>
                    <div className="wire-step">
                      <div className="wire-icon">ðŸ’»</div>
                      <div className="wire-label">Laptop<br/><strong>"THE BRAIN"</strong></div>
                    </div>
                    <div className="wire-arrow">âžœ<br/><span className="cable-type">USB Cable<br/>(Circled in pic)</span></div>
                    <div className="wire-step highlight">
                      <div className="wire-icon">ðŸ“¦</div>
                      <div className="wire-label">DMX Interface<br/>"Translator Box"</div>
                    </div>
                    <div className="wire-arrow">âžœ<br/><span className="cable-type">DMX Cables<br/>Daisy-chain</span></div>
                    <div className="wire-step">
                      <div className="wire-icon">ðŸ’¡ðŸ’¡ðŸ’¡</div>
                      <div className="wire-label">All Lights<br/>(Plug here!)</div>
                    </div>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11px', padding: '12px', background: 'rgba(0,200,100,0.15)', borderRadius: '6px', borderLeft: '3px solid #00ff66' }}>
                    <strong style={{ color: '#00ff66' }}>âœ“ THE BRAIN:</strong> Your laptop running this software<br/>
                    <strong style={{ color: '#00ccff' }}>âœ“ THE TRANSLATOR:</strong> Small DMX interface box (where lights actually connect)<br/>
                    <strong style={{ color: '#ffaa00' }}>âœ“ OPTIONAL:</strong> Physical controller (SoundSwitch) - just gives you knobs/buttons
                  </div>
                </div>

                <div className="hardware-guide">
                  <strong>ðŸ“¦ What Actually Connects to the Lights:</strong>
                  <p style={{ fontSize: '11px', margin: '8px 0', color: 'rgba(255,255,255,0.9)' }}>
                    The <strong>DMX Interface</strong> is a small box (about the size of a deck of cards) that converts computer signals to DMX. <strong>This is where all your lights plug in!</strong>
                  </p>
                  
                  <strong>DMX Interface Options (Required!):</strong>
                  <ul>
                    <li><strong>Enttec Open DMX USB ($65)</strong> - Simple, single universe</li>
                    <li><strong>DMXKing ultraDMX Micro ($89)</strong> - Compact, reliable</li>
                    <li><strong>Enttec DMX USB Pro Mk2 ($299)</strong> - Professional, 2 universes</li>
                  </ul>

                  <strong style={{ marginTop: '12px', display: 'block' }}>ðŸŽ›ï¸ Hardware Controller (Optional - Like in Your Pic):</strong>
                  <p style={{ fontSize: '11px', margin: '8px 0', color: 'rgba(255,255,255,0.9)' }}>
                    SoundSwitch, Chauvet Xpress, etc. are physical controllers with buttons and knobs. They DON'T connect to lights - they connect to your laptop to control this software. <strong>You can use this app with just a mouse - no hardware controller needed!</strong>
                  </p>
                  
                  <p style={{ marginTop: '12px', fontSize: '11px', color: 'rgba(255,255,255,0.8)', background: 'rgba(255,100,0,0.15)', padding: '12px', borderRadius: '4px', borderLeft: '3px solid #ff6600' }}>
                    <strong>ðŸŽ¯ Minimum Setup:</strong><br/>
                    1. This app (free - already have it!)<br/>
                    2. DMX Interface ($65-300) â† Lights plug into this<br/>
                    3. DMX cables ($10-25 each)<br/>
                    4. DMX lights<br/><br/>
                    <strong>Hardware controller is NOT required!</strong> It just gives you physical buttons instead of clicking with a mouse.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Settings Panel */}
        {showSettings && (
          <div className="settings-panel compact">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4>DMX Connection</h4>
              <button className="help-btn" onClick={() => setShowHardwareGuide(true)}>
                ðŸ“– Setup Guide
              </button>
            </div>
            
            <div className="settings-grid">
              <div className="setting-row">
                <label>Method:</label>
                <select 
                  value={connectionSettings.method} 
                  onChange={(e) => setConnectionSettings(prev => ({ ...prev, method: e.target.value }))}
                >
                  <option value="usb">USB DMX</option>
                  <option value="artnet">Art-Net</option>
                  <option value="sacn">sACN</option>
                  <option value="wifi">WiFi DMX</option>
                </select>
              </div>

              {connectionSettings.method === 'usb' && (
                <div className="setting-row">
                  <label>Interface:</label>
                  <select 
                    value={connectionSettings.interface}
                    onChange={(e) => setConnectionSettings(prev => ({ ...prev, interface: e.target.value }))}
                  >
                    {connectionSettings.availableDevices.map(dev => (
                      <option key={dev} value={dev}>{dev}</option>
                    ))}
                  </select>
                </div>
              )}

              {(connectionSettings.method === 'artnet' || connectionSettings.method === 'sacn') && (
                <>
                  <div className="setting-row">
                    <label>IP:</label>
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
                </>
              )}

              <div className="setting-row">
                <label>Universe:</label>
                <input 
                  type="number" 
                  min="1" 
                  max="512"
                  value={connectionSettings.universe}
                  onChange={(e) => setConnectionSettings(prev => ({ ...prev, universe: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="settings-actions">
              <button className="scan-btn" onClick={scanDevices}>
                ðŸ” Scan
              </button>
              <button 
                className={`connect-btn ${connectionSettings.connected ? 'connected' : ''}`}
                onClick={handleConnect}
              >
                {connectionSettings.connected ? 'âœ“ Connected' : 'Connect'}
              </button>
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
          <button className="func-btn secondary">â–¶/â¸</button>
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
        âŸ²
      </div>
    </div>
  );
};

export default LightingControl;

