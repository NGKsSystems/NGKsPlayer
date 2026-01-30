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
        <h3>DECK A</h3>
        <div className="deck-info">
          <span>BPM: {track?.bpm || '--'}</span>
          <span>Key: {track?.key || '--'}</span>
        </div>
      </div>

      <div className="deck-a-content">
        {/* Track Info */}
        <div className="track-info" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '8px', borderRadius: '8px', marginBottom: '8px', width: '100%', boxSizing: 'border-box'}}>
          <div className="track-title" style={{color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'}}>
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

        {/* Track Time */}
        <div style={{color: '#94a3b8', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace', textAlign: 'center', padding: '4px', marginTop: '4px'}}>
          {formatTime(position)} / {formatTime(duration)}
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

        {/* Fine Tuning Slider */}
        <div className="fine-tune-section">
          <div className="fine-tune-header">
            <label className="fine-tune-label">FINE TUNE</label>
            <span className="fine-tune-value">{fineTune > 0 ? '+' : ''}{fineTune.toFixed(2)}s</span>
          </div>
          <input 
            type="range" 
            min="-200"
            max="200"
            step="10"
            value={fineTune * 1000}
            onChange={(e) => {
              const offset = parseInt(e.target.value) / 1000;
              setFineTune(offset);
              const newPosition = Math.max(0, Math.min(duration, position + offset));
              onSeek(newPosition);
            }}
            className="fine-tune-slider"
            title="Fine position adjustment (±0.20 seconds)"
          />
          
          {/* Quick Time Adjustment Buttons */}
          <div className="quick-adjustments">
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.max(0, position - 5))}
              title="Back 5 sec"
            >
              -5s
            </button>
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.max(0, position - 1))}
              title="Back 1 sec"
            >
              -1s
            </button>
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.max(0, position - 0.5))}
              title="Back 0.5 sec"
            >
              -0.5s
            </button>
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.min(duration, position + 0.5))}
              title="Forward 0.5 sec"
            >
              +0.5s
            </button>
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.min(duration, position + 1))}
              title="Forward 1 sec"
            >
              +1s
            </button>
            <button 
              className="adjust-btn"
              onClick={() => onSeek(Math.min(duration, position + 5))}
              title="Forward 5 sec"
            >
              +5s
            </button>
          </div>
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
