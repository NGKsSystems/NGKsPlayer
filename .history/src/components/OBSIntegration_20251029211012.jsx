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
          <h2>OBS Integration</h2>
          <button className="obs-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="obs-content">
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
            <h3>Quick Setup Guide</h3>
            <ol>
              <li>
                <strong>Open Broadcast Window:</strong> Click the button above to open a window for OBS to capture
              </li>
              <li>
                <strong>In OBS Studio:</strong>
                <ul>
                  <li>Add a new source → Window Capture</li>
                  <li>Select "NGKs Player - Broadcast Output" from the window list</li>
                  <li>Adjust size and position as needed</li>
                </ul>
              </li>
              <li>
                <strong>Audio Routing:</strong>
                <ul>
                  <li>Install VB-Cable or similar virtual audio device</li>
                  <li>Set NGKs Player output to virtual cable</li>
                  <li>Add virtual cable as audio source in OBS</li>
                </ul>
              </li>
              <li>
                <strong>Go Live:</strong> Start your stream! The broadcast window updates automatically as tracks play
              </li>
            </ol>
          </div>

          {/* Tips */}
          <div className="obs-section obs-tips">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li>Use "Bar" theme as a transparent overlay on your video content</li>
              <li>1080p resolution works best for most streaming platforms</li>
              <li>Position the broadcast window on a second monitor for easy monitoring</li>
              <li>The window updates in real-time as you mix - no manual updates needed!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
