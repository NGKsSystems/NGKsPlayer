/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: NavigationControls.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef } from 'react';
import './NavigationControls.css';
import { useNavigationControlsController } from '../hooks/useNavigationControlsController';

/**
 * Professional Navigation Controls
 * Jog/Shuttle, Timeline Scrubbing, Marker Navigation
 */
const NavigationControls = ({
  currentTime = 0,
  duration = 0,
  isPlaying = false,
  onTimeChange,
  onPlay,
  onPause,
  onStop,
  markers = [],
  onJumpToMarker,
  onJumpToNext,
  onJumpToPrevious,
  playbackRate = 1,
  onPlaybackRateChange
}) => {
  const jogRef = useRef(null);
  const shuttleRef = useRef(null);
  const scrubRef = useRef(null);

  // Interaction state & handlers from hook
  const {
    isJogging, isShuttling, shuttleSpeed, isScrubbing,
    formatTime,
    handleJogStart, handleShuttleStart, handleScrubStart
  } = useNavigationControlsController({
    jogRef,
    shuttleRef,
    scrubRef,
    currentTime,
    duration,
    isPlaying,
    onTimeChange,
    onPlay,
    onPause,
    onPlaybackRateChange,
    onJumpToNext,
    onJumpToPrevious,
  });

  return (
    <div className="navigation-controls">
      {/* Time Display */}
      <div className="time-display">
        <div className="current-time">{formatTime(currentTime)}</div>
        <div className="duration-time">{formatTime(duration)}</div>
      </div>

      {/* Transport Controls */}
      <div className="transport-controls">
        <button 
          className="transport-btn stop"
          onClick={() => {
            onStop?.();
            onTimeChange?.(0);
          }}
          title="Stop (Enter)"
        >
          ⏹
        </button>
        
        <button 
          className="transport-btn play-pause"
          onClick={isPlaying ? onPause : onPlay}
          title="Play/Pause (Space)"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        
        <button 
          className="transport-btn previous-marker"
          onClick={() => onJumpToPrevious?.(currentTime)}
          title="Previous Marker (Ctrl+←)"
        >
          ⏮
        </button>
        
        <button 
          className="transport-btn next-marker"
          onClick={() => onJumpToNext?.(currentTime)}
          title="Next Marker (Ctrl+→)"
        >
          ⏭
        </button>
      </div>

      {/* Jog Wheel */}
      <div className="jog-section">
        <label>JOG</label>
        <div 
          ref={jogRef}
          className={`jog-wheel ${isJogging ? 'active' : ''}`}
          onMouseDown={handleJogStart}
        >
          <div className="jog-inner">
            <div className="jog-indicator" />
          </div>
        </div>
      </div>

      {/* Shuttle */}
      <div className="shuttle-section">
        <label>SHUTTLE</label>
        <div 
          ref={shuttleRef}
          className={`shuttle-control ${isShuttling ? 'active' : ''}`}
          onMouseDown={handleShuttleStart}
        >
          <div className="shuttle-track">
            <div 
              className="shuttle-handle"
              style={{ 
                left: `${((shuttleSpeed / 5) + 1) * 50}%`,
                transform: 'translateX(-50%)'
              }}
            />
          </div>
          <div className="shuttle-labels">
            <span>-5x</span>
            <span>0</span>
            <span>+5x</span>
          </div>
        </div>
        <div className="shuttle-speed">{shuttleSpeed.toFixed(1)}x</div>
      </div>

      {/* Timeline Scrub Bar */}
      <div className="scrub-section">
        <label>SCRUB</label>
        <div 
          ref={scrubRef}
          className={`scrub-bar ${isScrubbing ? 'active' : ''}`}
          onMouseDown={handleScrubStart}
        >
          <div 
            className="scrub-progress"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <div 
            className="scrub-handle"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      {/* Playback Rate */}
      <div className="rate-section">
        <label>RATE</label>
        <div className="rate-buttons">
          {[0.25, 0.5, 1, 1.5, 2].map(rate => (
            <button
              key={rate}
              className={`rate-btn ${playbackRate === rate ? 'active' : ''}`}
              onClick={() => onPlaybackRateChange?.(rate)}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Marker Quick Access */}
      {markers.length > 0 && (
        <div className="markers-section">
          <label>MARKERS</label>
          <div className="marker-buttons">
            {markers.slice(0, 8).map((marker, index) => (
              <button
                key={marker.id}
                className="marker-btn"
                onClick={() => onJumpToMarker?.(marker.id)}
                title={`${marker.name} - ${formatTime(marker.time)}`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Info */}
      <div className="shortcuts-info">
        <div className="shortcut">Space: Play/Pause</div>
        <div className="shortcut">←/→: Frame Step</div>
        <div className="shortcut">Ctrl+←/→: Markers</div>
        <div className="shortcut">Home/End: Start/End</div>
      </div>
    </div>
  );
};

export default NavigationControls;
