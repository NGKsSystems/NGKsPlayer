import React from 'react';
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
  onPlayPause,
  onStop,
  onSeek,
  onPlaybackRateChange
}) => {
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
              max="100"
              defaultValue="80"
              className="volume-slider"
              title="Master Volume"
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

      {/* Keyboard Shortcuts Info */}
      <div className="shortcuts-info">
        <div className="shortcuts-list">
          <span className="shortcut">🎵 <strong>Playback:</strong> Space: Play/Pause | S: Stop | Home/End: Go to Start/End | Enter: Play from Selection</span>
          <span className="shortcut">⏭️ <strong>Navigation:</strong> Shift+←/→: Skip 10s | ←/→: Fine Seek | Ctrl+Home: Reset | Page Up/Down: Zoom In/Out</span>
          <span className="shortcut">✂️ <strong>Editing:</strong> X: Cut | C: Copy | V: Paste | Delete: Remove Selected | Ctrl+A: Select All | Esc: Deselect</span>
          <span className="shortcut">🔧 <strong>Tools:</strong> R: Razor Tool | Q: Selection Tool | Alt+Click: Quick Actions | Tab: Cycle Tools</span>
          <span className="shortcut">📍 <strong>Markers & Regions:</strong> Alt+Click Timeline: Add Marker | Shift+Drag: Create Loop | M: Quick Marker</span>
          <span className="shortcut">📥 <strong>Import & Export:</strong> Click "Add Track" Button | Drag Audio Files to Timeline | Ctrl+S: Save Project</span>
          <span className="shortcut">↩️ <strong>History:</strong> Ctrl+Z: Undo | Ctrl+Y: Redo | Ctrl+Shift+Z: Redo Alternative | See descriptions above</span>
          <span className="shortcut">🎚️ <strong>Track Controls:</strong> Right-Click: Context Menu | Track Headers: Solo/Mute/Settings | Ctrl+D: Duplicate Track</span>
          <span className="shortcut">🎛️ <strong>Mixing:</strong> Ctrl+M: Mute Track | Ctrl+S: Solo Track | Ctrl+L: Lock Track | Alt+Scroll: Volume Adjust</span>
          <span className="shortcut">⚡ <strong>Quick Actions:</strong> Double-Click: Zoom to Fit | Ctrl+Click: Multi-Select | Shift+Click: Range Select</span>
          <span className="shortcut">🔍 <strong>View Controls:</strong> Ctrl+Plus/Minus: Zoom | Ctrl+0: Fit All | Ctrl+1: Actual Size | F: Full Screen Timeline</span>
          <span className="shortcut">🎯 <strong>Precision:</strong> Hold Shift: Snap to Grid | Hold Alt: Bypass Snap | Ctrl+G: Toggle Grid | Ctrl+T: Timeline Settings</span>
          <span className="shortcut">⚙️ <strong>Workflow:</strong> Ctrl+N: New Project | Ctrl+O: Open Project | Ctrl+Shift+S: Save As | Ctrl+W: Close Project</span>
          <span className="shortcut">💡 <strong>Pro Tips:</strong> Multiple files can be selected when adding tracks! | Use right-click menus for more options | Drag waveforms to move clips</span>
          <span className="shortcut">🚀 <strong>Advanced:</strong> Ctrl+Shift+A: Advanced Select | Ctrl+J: Join Clips | Ctrl+U: Ungroup | Ctrl+R: Render Selection</span>
        </div>
      </div>
    </div>
  );
};

export default TransportControls;