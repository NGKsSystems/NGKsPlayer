import React, { useState, useCallback, useEffect, useRef } from 'react';
import './styles.css';

const DeckA = ({ 
  id,
  track = null, 
  isPlaying = false, 
  position = 0, 
  duration = 0,
  onPlayPause = () => {},
  onSeek = () => {},
  onSkip = () => {},
  onCue = () => {},
  onStyleChange = () => {},
  audioManager = null,
  style = {},
  ...props 
}) => {
  const [isCued, setIsCued] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  const [vuLevel, setVuLevel] = useState(0);
  const [fineTune, setFineTune] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState(style);
  const animationFrameRef = useRef(null);
  const elementRef = useRef(null);

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Only update style from props when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

  // Notify parent of style changes
  useEffect(() => {
    if (onStyleChange && (isDragging || isResizing)) {
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
  }, [currentStyle, isDragging, isResizing, id, onStyleChange]);

  useEffect(() => {
    if (!audioManager || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updateVisualization = () => {
      // 1) TIME-DOMAIN "waveform" bars (post-fader, post-EQ analyser)
      const timeData = audioManager.getTimeDomainData?.('A'); // Float32 [−1..1] or Uint8 [0..255]
      if (timeData && timeData.length) {
        const arr = (timeData instanceof Float32Array)
          ? timeData
          : Float32Array.from(timeData, v => (v - 128) / 128); // normalize if Uint8
        const barCount = 48;
        const samplesPerBar = Math.floor(arr.length / barCount);
        const bars = new Array(barCount).fill(0).map((_, i) => {
          let peak = 0;
          for (let j = 0; j < samplesPerBar; j++) {
            const s = Math.abs(arr[i * samplesPerBar + j] || 0);
            if (s > peak) peak = s;
          }
          // map peak (0..1) → percent height
          return Math.min(100, Math.max(2, peak * 100));
        });
        setWaveformData(bars);
      }

      // 2) VU: accept 0..1 or 0..100, convert to percent and clamp (post-fader, post-EQ)
      let vu = audioManager.getVULevel('A');
      if (vu <= 1) vu *= 100;
      vu = Math.max(0, Math.min(100, vu));
      setVuLevel(vu);

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

  const handleProgressClick = useCallback((e) => {
    if (!duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressPercent = clickX / rect.width;
    const newTime = progressPercent * duration;
    
    onSeek(newTime);
  }, [duration, onSeek]);

  const handlePlayPause = useCallback(() => {
    onPlayPause();
  }, [onPlayPause]);

  const handleSkipBackward = useCallback(() => {
    onSkip(-30);
  }, [onSkip]);

  const handleSkipForward = useCallback(() => {
    onSkip(30);
  }, [onSkip]);

  const handleCueToggle = useCallback(() => {
    setIsCued(!isCued);
    onCue(!isCued);
  }, [isCued, onCue]);

  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.transport-controls') || e.target.closest('.quick-controls') || e.target.closest('.track-info') || e.target.closest('.fine-tune-section')) {
      return;
    }
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - (currentStyle.left || 0),
      y: e.clientY - (currentStyle.top || 0)
    });
  }, [currentStyle]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setCurrentStyle(prev => ({
      ...prev,
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y
    }));
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    setCurrentStyle(prev => ({
      ...prev,
      width: Math.max(200, (prev.width || 300) + deltaX),
      height: Math.max(250, (prev.height || 350) + deltaY)
    }));
    
    setResizeStart({ x: e.clientX, y: e.clientY });
  }, [isResizing, resizeStart]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  return (
    <div 
      ref={elementRef}
      className={`deck-a-widget ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        ...currentStyle
      }}
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="deck-a-header">
        <div className="deck-title">DECK A</div>
        <div className="deck-info">
          <div className="info-item">
            <span>BPM:</span>
            <span>{track?.bpm || '--'}</span>
          </div>
          <div className="info-item">
            <span>Key:</span>
            <span>{track?.key || '--'}</span>
          </div>
        </div>
      </div>

      <div className="deck-a-content">
        {/* Track Info Container - holds title, controls, and time */}
        <div className="track-info" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '2px 8px 8px 8px', borderRadius: '8px', marginBottom: '8px', width: '100%', boxSizing: 'border-box'}}>
          <div className="track-title" style={{color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '-15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'}}>
            {(() => {
              if (track?.title) return track.title;
              if (track?.fileName) return track.fileName.replace(/\.[^/.]+$/, "");
              if (audioManager) {
                const audioManagerTrack = audioManager.getCurrentTrack('A');
                if (audioManagerTrack?.title) return audioManagerTrack.title;
                if (audioManagerTrack?.fileName) return audioManagerTrack.fileName.replace(/\.[^/.]+$/, "");
                if (audioManagerTrack?.filePath) {
                  const filename = audioManagerTrack.filePath.split(/[\\/]/).pop();
                  return filename ? filename.replace(/\.[^/.]+$/, "") : 'Unknown Track';
                }
              }
              if (audioManager) {
                const audioElement = audioManager.decks?.A?.audio;
                if (audioElement && audioElement.src) {
                  const srcUrl = audioElement.src;
                  const match = srcUrl.match(/[^\/\\]+(?=\.[^.]*$)/);
                  if (match) return decodeURIComponent(match[0]);
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

          {/* Transport Controls inside track-info */}
          <div className="transport-controls" style={{marginBottom: '4px'}}>
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

          {/* Progress Bar */}
          <div className="progress-container" style={{marginTop: '-8px', marginBottom: '-3px'}}>
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

          {/* Track Time inside track-info */}
          <div className="track-time" style={{color: '#94a3b8', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center'}}>
            {formatTime(position)} / {formatTime(duration)}
          </div>
        </div>

        {/* Fine Tuning Slider */}
        <div className="fine-tune-section">
          <div className="fine-tune-header">
            <div className="fine-tune-label">FINE TUNE</div>
            <div className="fine-tune-value">{fineTune > 0 ? '+' : ''}{fineTune.toFixed(2)}s</div>
          </div>
          <div 
            className="fine-tune-slider"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const percent = clickX / rect.width;
              const newOffset = (percent - 0.5) * 0.4; // -0.2 to +0.2 seconds
              setFineTune(newOffset);
              const newPosition = Math.max(0, Math.min(duration, position + newOffset));
              onSeek(newPosition);
            }}
          >
            <div 
              className="fine-tune-handle"
              style={{ left: `${((fineTune + 0.2) / 0.4) * 100}%` }}
            />
          </div>
          <div className="fine-tune-buttons">
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.max(0, position - 5))}
            >
              -5s
            </button>
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.max(0, position - 1))}
            >
              -1s
            </button>
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.max(0, position - 0.5))}
            >
              -0.5s
            </button>
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.min(duration, position + 0.5))}
            >
              +0.5s
            </button>
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.min(duration, position + 1))}
            >
              +1s
            </button>
            <button 
              className="fine-tune-btn"
              onClick={() => onSeek(Math.min(duration, position + 5))}
            >
              +5s
            </button>
          </div>
        </div>

        {/* VU & Waveform */}
        <div className="vu-waveform-container">
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
            {Array.from({ length: 48 }, (_, i) => {
              let height;
              if (waveformData.length > 0) {
                height = Math.max(2, waveformData[i] ?? 2);
              } else if (track) {
                height = 8;
              } else {
                height = 2;
              }
              return (
                <div 
                  key={i} 
                  className="waveform-bar"
                  style={{ 
                    height: `${height}%`,
                    opacity: isPlaying ? 0.9 : 0.5
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div 
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      >
        ⟲
      </div>
    </div>
  );
};

export default DeckA;
