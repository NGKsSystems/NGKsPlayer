/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TransportControls.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react';
import './TransportControls.css';

/**
 * Professional Transport Controls Component
 * 
 * Features:
 * - Play/Pause/Stop controls
 * - Playback rate control
 * - Time display with frame accuracy
 * - Loop and shuffle modes
 * - Keyboard shortcut indicators
 */
const TransportControls = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  autoScroll = true,
  masterVolume = 1,
  onPlayPause,
  onStop,
  onSeek,
  onPlaybackRateChange,
  onAutoScrollToggle,
  onMasterVolumeChange
}) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Format time to MM:SS.fff
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // Handle playback rate changes
  const handleRateChange = (newRate) => {
    onPlaybackRateChange(newRate);
  };

  // Skip backward/forward by 10 seconds
  const skipBackward = () => {
    onSeek(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    onSeek(Math.min(duration, currentTime + 10));
  };

  // Common playback rates
  const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="transport-controls">
      <div className="transport-section">
        {/* Main Transport Controls */}
        <div className="main-controls">
          <button
            className="transport-btn skip-btn"
            onClick={skipBackward}
            title="Skip Back 10s (Shift+Left)"
          >
            <SkipBack size={20} />
          </button>

          <button
            className="transport-btn play-pause-btn"
            onClick={onPlayPause}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className="transport-btn stop-btn"
            onClick={onStop}
            title="Stop (S)"
          >
            <Square size={20} />
          </button>

          <button
            className="transport-btn skip-btn"
            onClick={skipForward}
            title="Skip Forward 10s (Shift+Right)"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Time Display */}
        <div className="time-display">
          <div className="current-time">
            {formatTime(currentTime)}
          </div>
          <div className="time-separator">/</div>
          <div className="total-time">
            {formatTime(duration)}
          </div>
        </div>

        {/* Playback Rate Control */}
        <div className="playback-rate-section">
          <label className="rate-label">Speed:</label>
          <div className="rate-buttons">
            {playbackRates.map(rate => (
              <button
                key={rate}
                className={`rate-btn ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => handleRateChange(rate)}
                title={`${rate}x Speed`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Scroll Toggle */}
        <div className="auto-scroll-section">
          <button
            className={`transport-btn auto-scroll-btn ${autoScroll ? 'active' : ''}`}
            onClick={onAutoScrollToggle}
            title={`Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'} - Follows playhead automatically`}
          >
            <span className="auto-scroll-icon">📜</span>
            <span className="auto-scroll-text">{autoScroll ? 'Auto' : 'Manual'}</span>
          </button>
        </div>

        {/* Additional Controls */}
        <div className="additional-controls">
          <button
            className="transport-btn loop-btn"
            title="Loop Selection (L)"
          >
            <Repeat size={18} />
          </button>

          <div className="volume-section">
            <Volume2 size={18} />
            <input
              type="range"
              min="0"
              max="200"
              value={Math.round(masterVolume * 100)}
              onChange={(e) => onMasterVolumeChange && onMasterVolumeChange(parseInt(e.target.value) / 100)}
              className="volume-slider"
              title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="seek-slider"
            title="Seek Position"
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Info - Collapsible */}
      <div className="shortcuts-info">
        <button
          className="shortcuts-toggle-btn"
          onClick={() => setShortcutsOpen(prev => !prev)}
          title={shortcutsOpen ? 'Hide Keyboard Shortcuts' : 'Show Keyboard Shortcuts'}
        >
          <span className={`shortcuts-toggle-arrow ${shortcutsOpen ? 'open' : ''}`}>▶</span>
          <span>Keyboard Shortcuts</span>
        </button>
        {shortcutsOpen && <div className="shortcuts-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px 24px', 
          width: '100%',
          fontSize: '12px',
          color: '#aaa'
        }}>
          {/* Row 1 */}
          <span>🎵 <strong>Playback:</strong> Space: Play/Pause | S: Stop</span>
          <span>🎛️ <strong>Mixing:</strong> Track Headers: Solo/Mute/Volume/Pan</span>
          <span>⚡ <strong>Quick Actions:</strong> Double-Click: Zoom to Fit</span>
          {/* Row 2 */}
          <span>⏭️ <strong>Navigation:</strong> Shift+←/→: Skip 10s | ←/→: Fine Seek</span>
          <span>🎚️ <strong>Track Speed:</strong> Drag slider 0.1x-4x | Click presets</span>
          <span>🎪 <strong>Loop Regions:</strong> Shift+Drag: Create Loop</span>
          {/* Row 3 */}
          <span>✂️ <strong>Editing:</strong> R: Razor Tool | Delete: Remove</span>
          <span>🔄 <strong>Reverse:</strong> Click reverse button per track</span>
          <span>🔧 <strong>Tools:</strong> Click tool buttons or use hotkeys</span>
          {/* Row 4 */}
          <span>📋 <strong>Clipboard:</strong> X: Cut | C: Copy | V: Paste</span>
          <span>📥 <strong>Import:</strong> Multi-select files | Drag & Drop</span>
          <span>⚙️ <strong>Project:</strong> Ctrl+N: New | Ctrl+S: Save</span>
          {/* Row 5 */}
          <span>🔍 <strong>View:</strong> Ctrl+Plus/Minus: Zoom | Ctrl+0: Fit All</span>
          <span>🚀 <strong>Selection:</strong> Ctrl+Click: Multi-Select</span>
          <span>🎵 <strong>Multi-Track:</strong> Each track independent controls</span>
          {/* Row 6 */}
          <span>🎯 <strong>Precision:</strong> Hold Shift: Snap to Grid</span>
          <span>📍 <strong>Markers:</strong> Alt+Click Timeline: Add Marker</span>
          <span>🎬 <strong>Timeline:</strong> Scroll to navigate | Click to seek</span>
          {/* Row 7 */}
          <span>↩️ <strong>History:</strong> Ctrl+Z: Undo | Ctrl+Y: Redo</span>
          <span>🎨 <strong>Workflow:</strong> Right-click clips for context menu</span>
          <span>🏆 <strong>Pro Tip:</strong> Use speed/reverse for creative effects!</span>
        </div>}
      </div>
    </div>
  );
};

export default TransportControls;
