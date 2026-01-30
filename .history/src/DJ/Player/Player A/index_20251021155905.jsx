import React, { useState, useCallback, useEffect, useRef } from 'react';
import './styles.css';

const PlayerA = ({ 
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
  const [waveformData, setWaveformData] = useState([]);
  const [vuLevel, setVuLevel] = useState(0);
  const animationFrameRef = useRef(null);

  // Format time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds) || !seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.player-a-header') && !e.target.closest('button, input, .transport-controls')) {
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
  }, [isDragging, isResizing]);

  // Real-time audio visualization
  useEffect(() => {
    if (!audioManager || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updateVisualization = () => {
      // Get frequency data for waveform
      const frequencyData = audioManager.getFrequencyData('A');
      if (frequencyData) {
        // Convert frequency data to waveform bars (32 bars)
        const barCount = 32;
        const dataPerBar = Math.floor(frequencyData.length / barCount);
        const newWaveformData = [];
        
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < dataPerBar; j++) {
            sum += frequencyData[i * dataPerBar + j];
          }
          const average = sum / dataPerBar;
          newWaveformData.push((average / 255) * 100); // Convert to percentage
        }
        
        setWaveformData(newWaveformData);
      }

      // Get VU level
      const level = audioManager.getVULevel('A');
      setVuLevel(level);

      // Continue animation
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };

    updateVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [audioManager, isPlaying]);

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
      className={`player-a-widget ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={style}
      onMouseDown={handleMouseDown}
      ref={playerRef}
      {...props}
    >
      <div className="player-a-header">
        <h3>DECK A</h3>
        <div className="deck-info">
          <span>BPM: {track?.bpm || '--'}</span>
          <span>Key: {track?.key || '--'}</span>
        </div>
      </div>

      <div className="player-a-content">
        {/* Track Info */}
        <div className="track-info" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '8px', borderRadius: '8px', marginBottom: '8px', width: '100%', boxSizing: 'border-box'}}>
          <div className="track-title" style={{color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'}}>
            {(() => {
              // Try multiple sources for track title
              if (track?.title) {
                return track.title;
              }
              if (track?.fileName) {
                return track.fileName.replace(/\.[^/.]+$/, "");
              }
              
              // Fallback to AudioManager track
              if (audioManager) {
                const audioManagerTrack = audioManager.getCurrentTrack('A');
                if (audioManagerTrack?.title) {
                  return audioManagerTrack.title;
                }
                if (audioManagerTrack?.fileName) {
                  return audioManagerTrack.fileName.replace(/\.[^/.]+$/, "");
                }
                if (audioManagerTrack?.filePath) {
                  const filename = audioManagerTrack.filePath.split(/[\\/]/).pop();
                  return filename ? filename.replace(/\.[^/.]+$/, "") : 'Unknown Track';
                }
              }
              
              // Last resort: Extract filename from audio src
              if (audioManager) {
                const audioElement = audioManager.decks?.A?.audio;
                if (audioElement && audioElement.src) {
                  const srcUrl = audioElement.src;
                  const match = srcUrl.match(/[^\/\\]+(?=\.[^.]*$)/);
                  if (match) {
                    return decodeURIComponent(match[0]);
                  }
                  return 'Playing Track';
                }
              }
              
              if (track?.filePath) {
                const filename = track.filePath.split(/[\\/]/).pop();
                return filename ? filename.replace(/\.[^/.]+$/, "") : 'Unknown Track';
              }
              
              return track ? 'Track Loaded (No Title)' : 'No Track Loaded';
            })()}
          </div>
          <div className="track-artist">{track?.artist || (audioManager?.getCurrentTrack('A')?.artist) || ''}</div>
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

        {/* Integrated VU & Waveform */}
        <div className="vu-waveform-container">
          <div className="vu-waveform-label">VU & WAVEFORM A</div>
          <div className="vu-waveform-display">
            {/* Compact VU Meter */}
            <div className="vu-meter">
              <div 
                className="vu-meter-bar"
                style={{ 
                  height: `${vuLevel}%`,
                  backgroundColor: vuLevel > 85 ? '#ef4444' : vuLevel > 70 ? '#f59e0b' : '#22c55e'
                }}
              />
            </div>
            
            {/* Waveform */}
            <div className="waveform">
              {Array.from({ length: 32 }, (_, i) => {
                let height;
                if (waveformData.length > 0) {
                  // Use real audio data
                  height = Math.max(5, waveformData[i] || 5);
                } else if (track) {
                  // Static waveform representation when track is loaded but not playing
                  height = Math.sin(i * 0.3) * 15 + Math.random() * 20 + 15;
                } else {
                  // No track loaded
                  height = 5;
                }
                
                return (
                  <div 
                    key={i} 
                    className="waveform-bar"
                    style={{ 
                      height: `${height}%`,
                      opacity: isPlaying ? 0.8 : (track ? 0.4 : 0.2),
                      backgroundColor: isPlaying ? '#3b82f6' : (track ? '#64748b' : '#374151')
                    }}
                  />
                );
              })}
            </div>
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

export default PlayerA;