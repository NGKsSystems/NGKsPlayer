import React, { useState, useCallback, useRef, useEffect } from 'react';
import './NavigationControls.css';

/**
 * Professional Navigation Controls
 * Jog/Shuttle, Timeline Scrubbing, Marker Navigation
 */
const NavigationControls = ({
  currentTime = 0,
  duration = 100,
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
  const [isJogging, setIsJogging] = useState(false);
  const [isShuttling, setIsShuttling] = useState(false);
  const [shuttleSpeed, setShuttleSpeed] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  
  const jogRef = useRef(null);
  const shuttleRef = useRef(null);
  const scrubRef = useRef(null);
  const animationRef = useRef(null);

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // 30fps equivalent
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  }, []);

  // Jog Wheel Controls
  const handleJogStart = useCallback((e) => {
    setIsJogging(true);
    if (isPlaying) onPause?.();
    
    const startAngle = Math.atan2(
      e.clientY - jogRef.current.getBoundingClientRect().top - 30,
      e.clientX - jogRef.current.getBoundingClientRect().left - 30
    );
    
    const handleJogMove = (moveEvent) => {
      const currentAngle = Math.atan2(
        moveEvent.clientY - jogRef.current.getBoundingClientRect().top - 30,
        moveEvent.clientX - jogRef.current.getBoundingClientRect().left - 30
      );
      
      let angleDiff = currentAngle - startAngle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      const sensitivity = 0.5; // Adjust for jog sensitivity
      const timeChange = (angleDiff / (Math.PI * 2)) * sensitivity;
      const newTime = Math.max(0, Math.min(duration, currentTime + timeChange));
      
      onTimeChange?.(newTime);
    };
    
    const handleJogEnd = () => {
      setIsJogging(false);
      document.removeEventListener('mousemove', handleJogMove);
      document.removeEventListener('mouseup', handleJogEnd);
    };
    
    document.addEventListener('mousemove', handleJogMove);
    document.addEventListener('mouseup', handleJogEnd);
  }, [currentTime, duration, isPlaying, onTimeChange, onPause]);

  // Shuttle Wheel Controls
  const handleShuttleStart = useCallback((e) => {
    setIsShuttling(true);
    const rect = shuttleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    
    const handleShuttleMove = (moveEvent) => {
      const distance = (moveEvent.clientX - centerX) / (rect.width / 2);
      const clampedDistance = Math.max(-1, Math.min(1, distance));
      const speed = clampedDistance * 5; // Max 5x speed
      
      setShuttleSpeed(speed);
      
      if (Math.abs(speed) > 0.1) {
        onPlaybackRateChange?.(speed);
        if (!isPlaying && speed !== 0) onPlay?.();
      } else {
        onPlaybackRateChange?.(1);
        if (isPlaying) onPause?.();
      }
    };
    
    const handleShuttleEnd = () => {
      setIsShuttling(false);
      setShuttleSpeed(0);
      onPlaybackRateChange?.(1);
      document.removeEventListener('mousemove', handleShuttleMove);
      document.removeEventListener('mouseup', handleShuttleEnd);
    };
    
    document.addEventListener('mousemove', handleShuttleMove);
    document.addEventListener('mouseup', handleShuttleEnd);
  }, [isPlaying, onPlay, onPause, onPlaybackRateChange]);

  // Timeline Scrubbing
  const handleScrubStart = useCallback((e) => {
    setIsScrubbing(true);
    if (isPlaying) onPause?.();
    
    const rect = scrubRef.current.getBoundingClientRect();
    const handleScrubMove = (moveEvent) => {
      const x = moveEvent.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const newTime = ratio * duration;
      onTimeChange?.(newTime);
    };
    
    const handleScrubEnd = () => {
      setIsScrubbing(false);
      document.removeEventListener('mousemove', handleScrubMove);
      document.removeEventListener('mouseup', handleScrubEnd);
    };
    
    // Initial scrub
    handleScrubMove(e);
    
    document.addEventListener('mousemove', handleScrubMove);
    document.addEventListener('mouseup', handleScrubEnd);
  }, [duration, isPlaying, onTimeChange, onPause]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? onPause?.() : onPlay?.();
          break;
        case 'Home':
          e.preventDefault();
          onTimeChange?.(0);
          break;
        case 'End':
          e.preventDefault();
          onTimeChange?.(duration);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.ctrlKey) {
            // Jump to previous marker
            onJumpToPrevious?.(currentTime);
          } else {
            // Frame step backward
            const frameStep = 1 / 30; // 30fps
            onTimeChange?.(Math.max(0, currentTime - frameStep));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey) {
            // Jump to next marker
            onJumpToNext?.(currentTime);
          } else {
            // Frame step forward
            const frameStep = 1 / 30; // 30fps
            onTimeChange?.(Math.min(duration, currentTime + frameStep));
          }
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, onPlay, onPause, onTimeChange, onJumpToNext, onJumpToPrevious]);

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