/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: OBSIntegration.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import './OBSIntegration.css';

/**
 * OBS Integration Panel
 * Provides easy controls for opening broadcast windows for OBS capture
 */
export default function OBSIntegration({ onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [selectedResolution, setSelectedResolution] = useState('1920x1080');
  const [selectedSoftware, setSelectedSoftware] = useState('obs');

  const streamingSoftware = [
    { id: 'obs', name: 'OBS Studio', icon: '🎥', description: 'Free, open-source (Most Popular)' },
    { id: 'streamlabs', name: 'Streamlabs Desktop', icon: '📺', description: 'OBS-based with extra features' },
    { id: 'xsplit', name: 'XSplit Broadcaster', icon: '🎬', description: 'Professional streaming solution' },
    { id: 'vmix', name: 'vMix', icon: '🎞️', description: 'Advanced production software' },
    { id: 'other', name: 'Other Software', icon: '🖥️', description: 'Any software with window capture' }
  ];

  const themes = [
    { id: 'default', name: 'Professional', description: 'Clean layout with album art' },
    { id: 'minimal', name: 'Minimal', description: 'Just track info, transparent' },
    { id: 'bar', name: 'Bottom Bar', description: 'Overlay bar at bottom' },
    { id: 'vinyl', name: 'Vinyl', description: 'Retro record player style' }
  ];

  const resolutions = [
    { id: '1920x1080', name: '1080p (1920x1080)', width: 1920, height: 1080 },
    { id: '1280x720', name: '720p (1280x720)', width: 1280, height: 720 },
    { id: '3840x2160', name: '4K (3840x2160)', width: 3840, height: 2160 },
    { id: '2560x1440', name: '1440p (2560x1440)', width: 2560, height: 1440 }
  ];

  useEffect(() => {
    checkBroadcastStatus();
  }, []);

  const checkBroadcastStatus = async () => {
    try {
      const result = await window.electron.invoke('broadcast:isOpen');
      setIsOpen(result.isOpen);
    } catch (err) {
      console.error('Failed to check broadcast status:', err);
    }
  };

  const handleOpenBroadcast = async () => {
    const resolution = resolutions.find(r => r.id === selectedResolution);
    try {
      await window.electron.invoke('broadcast:open', {
        theme: selectedTheme,
        width: resolution.width,
        height: resolution.height
      });
      setIsOpen(true);
    } catch (err) {
      console.error('Failed to open broadcast window:', err);
    }
  };

  const handleCloseBroadcast = async () => {
    try {
      await window.electron.invoke('broadcast:close');
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to close broadcast window:', err);
    }
  };

  return (
    <div className="obs-integration-overlay" onClick={onClose}>
      <div className="obs-integration-panel" onClick={(e) => e.stopPropagation()}>
        <div className="obs-header">
          <h2>🎥 Live Streaming Setup</h2>
          <button className="obs-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="obs-content">
          {/* Quick Workflow Overview */}
          <div className="obs-section">
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 212, 255, 0.15))',
              padding: '25px',
              borderRadius: '12px',
              border: '2px solid rgba(0, 255, 136, 0.3)',
              display: 'grid',
              gridTemplateColumns: 'auto auto auto',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>1️⃣</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '5px' }}>
                  First Time
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  5 min setup<br/>in your streaming<br/>software
                </div>
              </div>
              
              <div style={{ fontSize: '36px', color: 'rgba(255, 255, 255, 0.3)' }}>→</div>
              
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>2️⃣</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '5px' }}>
                  Every Stream
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  Click "Open"<br/>Start streaming<br/><strong style={{ color: '#00ff88' }}>Done! 🎉</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Streaming Software Selection */}
          <div className="obs-section">
            <h3>Select Your Streaming Software</h3>
            <div className="software-grid">
              {streamingSoftware.map(software => (
                <div
                  key={software.id}
                  className={`software-card ${selectedSoftware === software.id ? 'selected' : ''}`}
                  onClick={() => setSelectedSoftware(software.id)}
                >
                  <div className="software-icon">{software.icon}</div>
                  <div className="software-name">{software.name}</div>
                  <div className="software-description">{software.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Section */}
          <div className="obs-section">
            <h3>Broadcast Window Status</h3>
            <div className={`obs-status ${isOpen ? 'active' : 'inactive'}`}>
              <div className="status-indicator"></div>
              <span>{isOpen ? 'Broadcast window is open' : 'Broadcast window is closed'}</span>
            </div>
          </div>

          {/* Theme Selection */}
          <div className="obs-section">
            <h3>Select Theme</h3>
            <div className="obs-theme-grid">
              {themes.map(theme => (
                <div
                  key={theme.id}
                  className={`obs-theme-card ${selectedTheme === theme.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTheme(theme.id)}
                >
                  <div className="theme-preview">
                    <div className={`preview-${theme.id}`}></div>
                  </div>
                  <div className="theme-name">{theme.name}</div>
                  <div className="theme-description">{theme.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Resolution Selection */}
          <div className="obs-section">
            <h3>Output Resolution</h3>
            <div className="obs-resolution-select">
              {resolutions.map(res => (
                <label key={res.id} className="resolution-option">
                  <input
                    type="radio"
                    name="resolution"
                    value={res.id}
                    checked={selectedResolution === res.id}
                    onChange={(e) => setSelectedResolution(e.target.value)}
                  />
                  <span>{res.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="obs-section">
            <div className="obs-controls">
              {!isOpen ? (
                <button className="obs-btn obs-btn-primary" onClick={handleOpenBroadcast}>
                  <span className="btn-icon">📺</span>
                  Open Broadcast Window
                </button>
              ) : (
                <button className="obs-btn obs-btn-danger" onClick={handleCloseBroadcast}>
                  <span className="btn-icon">⏹️</span>
                  Close Broadcast Window
                </button>
              )}
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="obs-section obs-instructions">
            <h3>Setup Guide for {streamingSoftware.find(s => s.id === selectedSoftware)?.name}</h3>
            
            <div style={{ 
              background: 'rgba(0, 255, 136, 0.1)', 
              padding: '15px', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid rgba(0, 255, 136, 0.3)'
            }}>
              <strong style={{ color: '#00ff88', fontSize: '16px' }}>⚡ After First-Time Setup:</strong>
              <p style={{ margin: '8px 0 0 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                Just click "Open Broadcast Window" and start streaming! Your streaming software will already be configured to capture it.
                Setup below is <strong>ONE-TIME ONLY</strong>.
              </p>
            </div>
            
            {/* OBS Studio Instructions */}
            {selectedSoftware === 'obs' && (
              <div>
                <h4 style={{ color: '#00d4ff', marginBottom: '10px' }}>📋 First-Time Setup (Do Once):</h4>
                <ol>
                  <li>
                    <strong>Open Broadcast Window:</strong> Click the button below to open a window for capture
                  </li>
                <li>
                  <strong>In OBS Studio:</strong>
                  <ul>
                    <li>Click <strong>+</strong> in Sources → Select <strong>Window Capture</strong></li>
                    <li>Choose <strong>"NGKs Player - Broadcast Output"</strong> from the window list</li>
                    <li>Adjust size and position in your scene</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Camera (Optional):</strong>
                  <ul>
                    <li>Add another source → <strong>Video Capture Device</strong></li>
                    <li>Select your webcam or camera</li>
                    <li>Layer broadcast overlay on top or beside camera</li>
                  </ul>
                </li>
                <li>
                  <strong>Audio Routing:</strong>
                  <ul>
                    <li>Install VB-Cable for clean audio routing</li>
                    <li>Set NGKs Player output to virtual cable</li>
                    <li>Add virtual cable as <strong>Audio Input Capture</strong> in OBS</li>
                  </ul>
                </li>
              </ol>
              
              <h4 style={{ color: '#00d4ff', marginTop: '20px', marginBottom: '10px' }}>🚀 Every Stream After That:</h4>
              <ol style={{ fontSize: '15px', fontWeight: '600' }}>
                <li>Click "Open Broadcast Window" in NGKs Player</li>
                <li>Start streaming in OBS - Done! 🎉</li>
              </ol>
              </div>
            )}

            {/* Streamlabs Desktop Instructions */}
            {selectedSoftware === 'streamlabs' && (
              <div>
                <h4 style={{ color: '#00d4ff', marginBottom: '10px' }}>📋 First-Time Setup (Do Once):</h4>
                <ol>
                <li>
                  <strong>Open Broadcast Window:</strong> Click the button below
                </li>
                <li>
                  <strong>In Streamlabs Desktop:</strong>
                  <ul>
                    <li>Click <strong>+</strong> in Sources → Select <strong>Window Capture</strong></li>
                    <li>Find <strong>"NGKs Player - Broadcast Output"</strong></li>
                    <li>Enable <strong>"Capture Cursor"</strong> (optional)</li>
                    <li>Position and resize as needed</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Camera:</strong>
                  <ul>
                    <li>Add <strong>Video Capture Device</strong></li>
                    <li>Use Streamlabs widgets for chat/alerts</li>
                  </ul>
                </li>
              </ol>
              
              <h4 style={{ color: '#00d4ff', marginTop: '20px', marginBottom: '10px' }}>🚀 Every Stream After That:</h4>
              <ol style={{ fontSize: '15px', fontWeight: '600' }}>
                <li>Click "Open Broadcast Window" in NGKs Player</li>
                <li>Start streaming in Streamlabs - Done! 🎉</li>
              </ol>
              </div>
            )}

            {/* XSplit Instructions */}
            {selectedSoftware === 'xsplit' && (
              <div>
                <h4 style={{ color: '#00d4ff', marginBottom: '10px' }}>📋 First-Time Setup (Do Once):</h4>
                <ol>
                <li>
                  <strong>Open Broadcast Window:</strong> Click the button below
                </li>
                <li>
                  <strong>In XSplit Broadcaster:</strong>
                  <ul>
                    <li>Click <strong>Add Source</strong> → <strong>Screen Capture</strong> → <strong>Window</strong></li>
                    <li>Select <strong>"NGKs Player - Broadcast Output"</strong></li>
                    <li>Adjust in scene editor</li>
                  </ul>
                </li>
                <li>
                  <strong>Camera Setup:</strong>
                  <ul>
                    <li>Add Source → <strong>Devices (Webcam)</strong></li>
                    <li>Use XSplit's built-in effects and transitions</li>
                  </ul>
                </li>
              </ol>
              
              <h4 style={{ color: '#00d4ff', marginTop: '20px', marginBottom: '10px' }}>🚀 Every Stream After That:</h4>
              <ol style={{ fontSize: '15px', fontWeight: '600' }}>
                <li>Click "Open Broadcast Window" in NGKs Player</li>
                <li>Start streaming in XSplit - Done! 🎉</li>
              </ol>
              </div>
            )}

            {/* vMix Instructions */}
            {selectedSoftware === 'vmix' && (
              <div>
                <h4 style={{ color: '#00d4ff', marginBottom: '10px' }}>📋 First-Time Setup (Do Once):</h4>
                <ol>
                <li>
                  <strong>Open Broadcast Window:</strong> Click the button below
                </li>
                <li>
                  <strong>In vMix:</strong>
                  <ul>
                    <li><strong>Add Input</strong> → <strong>Desktop Capture</strong></li>
                    <li>Select <strong>"NGKs Player - Broadcast Output"</strong> window</li>
                    <li>Use vMix's powerful mixing capabilities</li>
                  </ul>
                </li>
                <li>
                  <strong>Multi-Camera:</strong>
                  <ul>
                    <li>vMix supports multiple cameras natively</li>
                    <li>Add cameras as separate inputs</li>
                    <li>Switch between them live</li>
                  </ul>
                </li>
              </ol>
              
              <h4 style={{ color: '#00d4ff', marginTop: '20px', marginBottom: '10px' }}>🚀 Every Stream After That:</h4>
              <ol style={{ fontSize: '15px', fontWeight: '600' }}>
                <li>Click "Open Broadcast Window" in NGKs Player</li>
                <li>Start streaming in vMix - Done! 🎉</li>
              </ol>
              </div>
            )}

            {/* Other Software Instructions */}
            {selectedSoftware === 'other' && (
              <div>
                <h4 style={{ color: '#00d4ff', marginBottom: '10px' }}>📋 First-Time Setup (Do Once):</h4>
                <ol>
                <li>
                  <strong>Open Broadcast Window:</strong> Click the button below
                </li>
                <li>
                  <strong>In Your Software:</strong>
                  <ul>
                    <li>Look for <strong>"Window Capture"</strong> or <strong>"Screen Capture"</strong></li>
                    <li>Select window titled <strong>"NGKs Player - Broadcast Output"</strong></li>
                    <li>Most streaming software supports window capture</li>
                  </ul>
                </li>
                <li>
                  <strong>Camera & Audio:</strong>
                  <ul>
                    <li>Add your camera as a video source</li>
                    <li>Capture NGKs audio via virtual audio device or desktop audio</li>
                  </ul>
                </li>
              </ol>
              
              <h4 style={{ color: '#00d4ff', marginTop: '20px', marginBottom: '10px' }}>🚀 Every Stream After That:</h4>
              <ol style={{ fontSize: '15px', fontWeight: '600' }}>
                <li>Click "Open Broadcast Window" in NGKs Player</li>
                <li>Start streaming in your software - Done! 🎉</li>
              </ol>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="obs-section obs-tips">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li><strong>⚡ Super Easy:</strong> After initial setup, just 1 click in NGKs + start streaming = LIVE!</li>
              <li><strong>🔄 Auto-Updates:</strong> Track info updates automatically as you mix - zero manual work</li>
              <li><strong>💾 Saved Scenes:</strong> Your streaming software remembers the setup - just reuse your scenes</li>
              <li><strong>📹 Camera Setup:</strong> Layer "Bar" or "Minimal" theme over your DJ camera for pro broadcasts</li>
              <li><strong>🎥 Multi-Cam:</strong> Use multiple cameras (overhead for decks, face cam) and switch between them</li>
              <li><strong>🎬 Scene Ideas:</strong> "DJ Cam + Overlay", "Full Track Info", "Camera Only", "Split Screen"</li>
              <li><strong>📺 Resolution:</strong> 1080p works best for YouTube, Twitch, Facebook streaming</li>
              <li><strong>🖥️ Monitor Setup:</strong> Second monitor? Put broadcast window there to monitor what viewers see</li>
              <li><strong>💚 Green Screen:</strong> Use "Minimal" theme with green screen for custom backgrounds</li>
              <li><strong>💡 Lighting:</strong> Good lighting beats expensive cameras - invest in lights!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

