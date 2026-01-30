import React, { useState } from 'react';
import './VisualDisplaySettings.css';

/**
 * Visual Display Settings Panel
 * 
 * Allows DJs to customize the visual display:
 * - Upload custom images/logos
 * - Set DJ/Event name
 * - Choose visual mode & layout
 * - Customize colors & theme
 * - Toggle display elements
 */
const VisualDisplaySettings = ({ onApply, onClose }) => {
  const [settings, setSettings] = useState({
    // Branding
    djName: '',
    eventName: '',
    logoImage: null,
    customImage: null,
    
    // Display
    visualMode: 'album-art',
    layout: 'center',
    theme: 'default',
    
    // Colors
    primaryColor: '#00D4FF',
    secondaryColor: '#FF6B35',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    
    // Elements
    showTrackInfo: true,
    showProgress: true,
    showTime: true,
    showClock: false,
    showLogo: false,
    
    // Effects
    animationStyle: 'fade'
  });

  const handleFileUpload = (type) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({
          ...prev,
          [type]: event.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleApply = () => {
    onApply(settings);
  };

  return (
    <div className="visual-settings-overlay" onClick={onClose}>
      <div className="visual-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="visual-settings-header">
          <h2>🎨 Visual Display Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="visual-settings-content">
          {/* Branding Section */}
          <div className="settings-section">
            <h3>🎭 Branding</h3>
            
            <div className="setting-row">
              <label>DJ Name</label>
              <input
                type="text"
                value={settings.djName}
                onChange={(e) => handleChange('djName', e.target.value)}
                placeholder="e.g., DJ Awesome"
              />
            </div>

            <div className="setting-row">
              <label>Event Name</label>
              <input
                type="text"
                value={settings.eventName}
                onChange={(e) => handleChange('eventName', e.target.value)}
                placeholder="e.g., Summer Nights 2025"
              />
            </div>

            <div className="setting-row">
              <label>Logo Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload('logoImage')}
              />
              {settings.logoImage && <img src={settings.logoImage} alt="Logo Preview" className="preview-image" />}
              <label className="setting-checkbox">
                <input
                  type="checkbox"
                  checked={settings.showLogo}
                  onChange={(e) => handleChange('showLogo', e.target.checked)}
                />
                Show Logo
              </label>
            </div>

            <div className="setting-row">
              <label>Custom Background Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload('customImage')}
              />
              {settings.customImage && <img src={settings.customImage} alt="Background Preview" className="preview-image" />}
            </div>
          </div>

          {/* Display Mode Section */}
          <div className="settings-section">
            <h3>📺 Display Mode</h3>
            
            <div className="setting-row">
              <label>Visual Mode</label>
              <select
                value={settings.visualMode}
                onChange={(e) => handleChange('visualMode', e.target.value)}
              >
                <option value="album-art">Album Art</option>
                <option value="minimal">Minimal</option>
                <option value="dj-mode">DJ Mode</option>
                <option value="waveform">Waveform</option>
                <option value="spectrum">Spectrum Analyzer</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Layout</label>
              <select
                value={settings.layout}
                onChange={(e) => handleChange('layout', e.target.value)}
              >
                <option value="center">Center</option>
                <option value="bottom-bar">Bottom Bar</option>
                <option value="corner">Corner</option>
                <option value="side-panel">Side Panel</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Theme</label>
              <select
                value={settings.theme}
                onChange={(e) => handleChange('theme', e.target.value)}
              >
                <option value="default">Default (Cyan)</option>
                <option value="neon">Neon (Pink/Purple)</option>
                <option value="club">Club (Gold/Red)</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </div>

            <div className="setting-row">
              <label>Animation Style</label>
              <select
                value={settings.animationStyle}
                onChange={(e) => handleChange('animationStyle', e.target.value)}
              >
                <option value="fade">Fade In</option>
                <option value="slide">Slide Up</option>
                <option value="zoom">Zoom In</option>
                <option value="pulse">Pulse</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Colors Section */}
          <div className="settings-section">
            <h3>🎨 Colors</h3>
            
            <div className="setting-row color-row">
              <label>Primary Color</label>
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => handleChange('primaryColor', e.target.value)}
              />
              <span>{settings.primaryColor}</span>
            </div>

            <div className="setting-row color-row">
              <label>Secondary Color</label>
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => handleChange('secondaryColor', e.target.value)}
              />
              <span>{settings.secondaryColor}</span>
            </div>
          </div>

          {/* Display Elements Section */}
          <div className="settings-section">
            <h3>✨ Display Elements</h3>
            
            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.showTrackInfo}
                onChange={(e) => handleChange('showTrackInfo', e.target.checked)}
              />
              Show Track Info (Title/Artist)
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.showProgress}
                onChange={(e) => handleChange('showProgress', e.target.checked)}
              />
              Show Progress Bar
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.showTime}
                onChange={(e) => handleChange('showTime', e.target.checked)}
              />
              Show Time Display
            </label>

            <label className="setting-checkbox">
              <input
                type="checkbox"
                checked={settings.showClock}
                onChange={(e) => handleChange('showClock', e.target.checked)}
              />
              Show Clock
            </label>
          </div>

          {/* Presets Section */}
          <div className="settings-section">
            <h3>⚡ Quick Presets</h3>
            <div className="preset-buttons">
              <button onClick={() => setSettings({
                ...settings,
                visualMode: 'album-art',
                layout: 'center',
                theme: 'default',
                showTrackInfo: true,
                showProgress: true
              })}>
                🎵 Classic
              </button>
              <button onClick={() => setSettings({
                ...settings,
                visualMode: 'dj-mode',
                layout: 'side-panel',
                theme: 'club',
                showTrackInfo: true,
                showClock: true
              })}>
                🎧 DJ Set
              </button>
              <button onClick={() => setSettings({
                ...settings,
                visualMode: 'minimal',
                layout: 'center',
                theme: 'dark',
                showTrackInfo: true,
                showProgress: false
              })}>
                ✨ Minimal
              </button>
              <button onClick={() => setSettings({
                ...settings,
                visualMode: 'spectrum',
                layout: 'bottom-bar',
                theme: 'neon',
                showTrackInfo: true,
                showProgress: true
              })}>
                🔊 Club Party
              </button>
            </div>
          </div>
        </div>

        <div className="visual-settings-footer">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="apply-btn" onClick={handleApply}>
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default VisualDisplaySettings;
