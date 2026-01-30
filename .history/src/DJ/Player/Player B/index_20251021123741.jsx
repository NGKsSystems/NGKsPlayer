import React, { useState, useCallback, useEffect, useRef } from 'react';
import './styles.css';

const PlayerB = ({ 
  track = null, 
  isPlaying = false, 
  position = 0, 
  duration = 0,
  onTrackLoad = () => {},
  onPlayPause = () => {},
  onSeek = () => {},
  onSkip = () => {},
  onCue = () => {},
  style,
  onPositionChange,
  onSizeChange,
  audioManager = null,
  ...props 
}) => {
  // Drag and resize state
  const playerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  // Player state
  const [isCued, setIsCued] = useState(false);
  const [seeking, setSeeking] = useState(false);

  // Format time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds) || !seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.player-b-header') && !e.target.closest('button, input, .transport-controls')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      setInitialPosition({
        x: parseInt(style?.left) || 0,
        y: parseInt(style?.top) || 0
      });
      e.preventDefault();
    }
  }, [style]);

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newX = initialPosition.x + deltaX;
      const newY = initialPosition.y + deltaY;
      
      if (onPositionChange) {
        onPositionChange({ x: newX, y: newY });
      }
    }
  }, [isDragging, dragStart, initialPosition, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Resize handlers
  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialSize({
      width: parseInt(style?.width) || 350,
      height: parseInt(style?.height) || 400
    });
    e.preventDefault();
    e.stopPropagation();
  }, [style]);

  const handleResizeMouseMove = useCallback((e) => {
    if (isResizing) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      const newWidth = Math.max(300, initialSize.width + deltaX);
      const newHeight = Math.max(350, initialSize.height + deltaY);
      
      if (onSizeChange) {
        onSizeChange({ width: newWidth, height: newHeight });
      }
    }
  }, [isResizing, dragStart, initialSize, onSizeChange]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Global mouse events
  useEffect(() => {
    if (isDragging || isResizing) {
      const handleMove = isDragging ? handleMouseMove : handleResizeMouseMove;
      const handleUp = isDragging ? handleMouseUp : handleResizeMouseUp;
      
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp, handleResizeMouseMove, handleResizeMouseUp]);

  // Progress bar handlers
  const handleProgressClick = useCallback((e) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressPercent = clickX / rect.width;
    const newTime = progressPercent * duration;
    
    onSeek(newTime);
  }, [duration, onSeek]);

  // Transport control handlers
  const handlePlayPause = useCallback(() => {
    onPlayPause();
  }, [onPlayPause]);

  const handleSkipBackward = useCallback(() => {
    onSkip(-30); // Skip backward 30 seconds
  }, [onSkip]);

  const handleSkipForward = useCallback(() => {
    onSkip(30); // Skip forward 30 seconds
  }, [onSkip]);

  const handleCueToggle = useCallback(() => {
    setIsCued(!isCued);
    onCue(!isCued);
  }, [isCued, onCue]);

  return (
    <div 
      className={`player-b-widget ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      ref={playerRef}
      {...props}
    >
      <div className="player-b-header">
        <h3>DECK B</h3>
        <div className="deck-info">
          <span>BPM: {track?.bpm || '--'}</span>
          <span>Key: {track?.key || '--'}</span>
        </div>
      </div>

      <div className="player-b-content">
        {/* Track Info */}
        <div className="track-info">
          <div className="track-title">{track?.title || 'No Track Loaded'}</div>
          <div className="track-artist">{track?.artist || ''}</div>
          <div className="track-time">
            {formatTime(position)} / {formatTime(duration)}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div 
            className="progress-bar"
            onClick={handleProgressClick}
          >
            <div 
              className="progress-fill"
              style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
            <div 
              className="progress-handle"
              style={{ left: `${duration > 0 ? (position / duration) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Transport Controls */}
        <div className="transport-controls">
          <button 
            className="transport-btn skip-backward"
            onClick={handleSkipBackward}
            title="Skip backward 30s"
          >
            ⏮️
          </button>
          
          <button 
            className={`transport-btn play-pause ${isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸️' : '▶️'}
          </button>
          
          <button 
            className="transport-btn skip-forward"
            onClick={handleSkipForward}
            title="Skip forward 30s"
          >
            ⏭️
          </button>

          <button 
            className={`transport-btn cue-btn ${isCued ? 'active' : ''}`}
            onClick={handleCueToggle}
            title="Cue (Monitor)"
          >
            CUE
          </button>
        </div>

        {/* Waveform Placeholder */}
        <div className="waveform-container">
          <div className="waveform-label">WAVEFORM</div>
          <div className="waveform">
            {Array.from({ length: 32 }, (_, i) => (
              <div 
                key={i} 
                className="waveform-bar"
                style={{ 
                  height: `${Math.random() * 80 + 20}%`,
                  opacity: isPlaying ? 0.8 : 0.3
                }}
              />
            ))}
          </div>
        </div>

        {/* Quick Controls */}
        <div className="quick-controls">
          <button className="quick-btn" title="Loop">🔄</button>
          <button className="quick-btn" title="Sync">⚡</button>
          <button className="quick-btn" title="Hot Cue">🔥</button>
          <button className="quick-btn" title="FX">✨</button>
        </div>
      </div>

      <div 
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
      />
    </div>
  );
};

export default PlayerB;