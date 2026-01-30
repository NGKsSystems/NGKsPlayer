import React, { useState, useCallback, useEffect, useRef } from 'react';
import './styles.css';

const DeckB = ({ 
  id,
  track = null, 
  isPlaying = false, 
  position = 0, 
  duration = 0,
  onPlayPause = () => {},
  onSeek = () => {},
  onSkip = () => {},
  onCue = () => {},
  audioManager = null,
  style = {},
  ...props 
}) => {
  const [isCued, setIsCued] = useState(false);
  const [waveformData, setWaveformData] = useState([]);
  const [vuLevel, setVuLevel] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
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
    setCurrentStyle(style);
  }, [style]);

  useEffect(() => {
    if (!audioManager || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const updateVisualization = () => {
      const frequencyData = audioManager.getFrequencyData('B');
      if (frequencyData) {
        const barCount = 32;
        const dataPerBar = Math.floor(frequencyData.length / barCount);
        const newWaveformData = [];
        
        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          for (let j = 0; j < dataPerBar; j++) {
            sum += frequencyData[i * dataPerBar + j];
          }
          const average = sum / dataPerBar;
          newWaveformData.push((average / 255) * 100);
        }
        
        setWaveformData(newWaveformData);
      }

      const level = audioManager.getVULevel('B');
      setVuLevel(level);

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
    if (e.target.closest('.transport-controls') || e.target.closest('.quick-controls') || e.target.closest('.track-info')) {
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

  return (
    <div 
      ref={elementRef}
      className={`deck-b-widget ${isDragging ? 'dragging' : ''}`}
      style={currentStyle}
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="deck-b-header">
        <h3>DECK B</h3>
        <div className="deck-info">
          <span>BPM: {track?.bpm || '--'}</span>
          <span>Key: {track?.key || '--'}</span>
        </div>
      </div>

      <div className="deck-b-content">
        {/* Track Info */}
        <div className="track-info" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '8px', borderRadius: '8px', marginBottom: '8px', width: '100%', boxSizing: 'border-box'}}>
          <div className="track-title" style={{color: 'white', fontSize: '14px', fontWeight: 'bold', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%'}}>
            {(() => {
              if (track?.title) return track.title;
              if (track?.fileName) return track.fileName.replace(/\.[^/.]+$/, "");
              if (audioManager) {
                const audioManagerTrack = audioManager.getCurrentTrack('B');
                if (audioManagerTrack?.title) return audioManagerTrack.title;
                if (audioManagerTrack?.fileName) return audioManagerTrack.fileName.replace(/\.[^/.]+$/, "");
                if (audioManagerTrack?.filePath) {
                  const filename = audioManagerTrack.filePath.split(/[\\/]/).pop();
                  return filename ? filename.replace(/\.[^/.]+$/, "") : 'Unknown Track';
                }
              }
              if (audioManager) {
                const audioElement = audioManager.decks?.B?.audio;
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
          <div className="track-time" style={{color: '#94a3b8', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace'}}>
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
          <div className="vu-waveform-label">VU & WAVEFORM B</div>
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
                  height = Math.max(5, waveformData[i] || 5);
                } else if (track) {
                  height = Math.sin(i * 0.3) * 15 + Math.random() * 20 + 15;
                } else {
                  height = 5;
                }
                
                return (
                  <div 
                    key={i} 
                    className="waveform-bar"
                    style={{ 
                      height: `${height}%`,
                      opacity: isPlaying ? 0.8 : (track ? 0.4 : 0.2),
                      backgroundColor: isPlaying ? '#10b981' : (track ? '#64748b' : '#374151')
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
    </div>
  );
};

export default DeckB;
