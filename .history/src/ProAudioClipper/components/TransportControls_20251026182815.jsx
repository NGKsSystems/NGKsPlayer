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
        <div className="shortcuts-list" style={{ 
          display: 'flex !important', 
          flexDirection: 'row !important',
          gap: '20px', 
          justifyContent: 'space-between',
          flexWrap: 'nowrap !important'
        }}>
          <div className="shortcuts-column" style={{ 
            flex: '1', 
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span className="shortcut">🎵 <strong>Playback:</strong> Space: Play/Pause | S: Stop</span>
            <span className="shortcut">⏭️ <strong>Navigation:</strong> Shift+←/→: Skip 10s | ←/→: Fine Seek</span>
            <span className="shortcut">✂️ <strong>Editing:</strong> X: Cut | C: Copy | V: Paste | Delete: Remove</span>
            <span className="shortcut">🔧 <strong>Tools:</strong> R: Razor Tool | Q: Selection Tool</span>
            <span className="shortcut">📍 <strong>Markers:</strong> Alt+Click Timeline: Add Marker</span>
            <span className="shortcut">📥 <strong>Import:</strong> Click "Add Track" Button | Drag Files</span>
            <span className="shortcut">↩️ <strong>History:</strong> Ctrl+Z: Undo | Ctrl+Y: Redo</span>
            <span className="shortcut">🎚️ <strong>Tracks:</strong> Right-Click: Context Menu</span>
            <span className="shortcut">🎛️ <strong>Mixing:</strong> Track Headers: Solo/Mute/Volume</span>
            <span className="shortcut">💡 <strong>Tip:</strong> Multiple files can be selected!</span>
          </div>
          <div className="shortcuts-column" style={{ 
            flex: '1', 
            minWidth: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px'
          }}>
            <span className="shortcut">⚡ <strong>Quick Actions:</strong> Double-Click: Zoom to Fit</span>
            <span className="shortcut">🔍 <strong>View:</strong> Ctrl+Plus/Minus: Zoom | Ctrl+0: Fit All</span>
            <span className="shortcut">🎯 <strong>Precision:</strong> Hold Shift: Snap to Grid</span>
            <span className="shortcut">⚙️ <strong>Project:</strong> Ctrl+N: New | Ctrl+S: Save</span>
            <span className="shortcut">🚀 <strong>Advanced:</strong> Ctrl+A: Select All | Esc: Deselect</span>
            <span className="shortcut">🎨 <strong>Selection:</strong> Ctrl+Click: Multi-Select</span>
            <span className="shortcut">� <strong>Regions:</strong> Shift+Drag: Create Loop Region</span>
            <span className="shortcut">🔄 <strong>Playback Speed:</strong> Use Speed Controls Above</span>
            <span className="shortcut">🎪 <strong>Workflow:</strong> Drag waveforms to move clips</span>
            <span className="shortcut">🏆 <strong>Pro Tip:</strong> Use right-click for more options!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransportControls;