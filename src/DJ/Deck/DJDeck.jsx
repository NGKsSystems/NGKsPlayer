/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DJDeck.jsx
 * Purpose: Unified DJ deck component — renders any deck (A/B/C/D) from a single
 *          parameterized source. Deck identity is driven by the `deckId` prop.
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import './DJDeck.css';

/** Per-deck accent colour map (CSS custom-property values). */
const DECK_ACCENTS = {
  A: { r: 255, g: 140, b: 0,   hex: '#ff8c00' },
  B: { r: 139, g: 0,   b: 255, hex: '#8b00ff' },
  C: { r: 0,   g: 200, b: 255, hex: '#00c8ff' },
  D: { r: 0,   g: 255, b: 100, hex: '#00ff64' },
};

const DJDeck = ({
  deckId = 'A',
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

  const accent = DECK_ACCENTS[deckId] || DECK_ACCENTS.A;

  const formatTime = (seconds) => {
    if (isNaN(seconds) || !seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

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
      const timeData = audioManager.getTimeDomainData?.(deckId);
      if (timeData && timeData.length) {
        const arr = (timeData instanceof Float32Array)
          ? timeData
          : Float32Array.from(timeData, v => (v - 128) / 128);
        const barCount = 48;
        const samplesPerBar = Math.floor(arr.length / barCount);
        const bars = new Array(barCount).fill(0).map((_, i) => {
          let peak = 0;
          for (let j = 0; j < samplesPerBar; j++) {
            const s = Math.abs(arr[i * samplesPerBar + j] || 0);
            if (s > peak) peak = s;
          }
          return Math.min(100, Math.max(2, peak * 100));
        });
        setWaveformData(bars);
      }

      let vu = audioManager.getVULevel(deckId);
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
  }, [audioManager, isPlaying, deckId]);

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

  /* ---- Drag ---- */
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

  /* ---- Resize ---- */
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

  /* ---- CSS custom-property style block ---- */
  const accentVars = {
    '--deck-r': accent.r,
    '--deck-g': accent.g,
    '--deck-b': accent.b,
    '--deck-hex': accent.hex,
  };

  return (
    <div
      ref={elementRef}
      className={`dj-deck-widget ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'absolute',
        ...accentVars,
        ...currentStyle
      }}
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className="dj-deck-header">
        <div className="deck-title">DECK {deckId}</div>
        <div className="deck-info">
          <div className="info-item">
            <span>BPM:</span>
            <input
              type="number"
              value={track?.bpm || ''}
              onChange={async (e) => {
                const newBpm = parseInt(e.target.value);
                if (track && newBpm && newBpm > 0 && newBpm <= 300) {
                  await window.api.invoke('library:updateAnalysis', { trackId: track.id, bpm: newBpm, key: track.key });
                  audioManager.decks[deckId].track = {
                    ...audioManager.decks[deckId].track,
                    bpm: newBpm
                  };
                  if (audioManager.onTrackLoaded) {
                    audioManager.onTrackLoaded(deckId, audioManager.decks[deckId].track);
                  }
                }
              }}
              disabled={!track}
              placeholder="--"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                color: track ? '#00ff00' : '#666',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '2px 4px',
                fontSize: '12px',
                borderRadius: '3px',
                width: '50px',
                textAlign: 'center'
              }}
            />
          </div>
          <div className="info-item">
            <span>KEY:</span>
            <select
              value={track?.key || ''}
              onChange={async (e) => {
                const newKey = e.target.value;
                if (track && newKey) {
                  await window.api.invoke('library:updateAnalysis', { trackId: track.id, bpm: track.bpm, key: newKey });
                  audioManager.decks[deckId].track = {
                    ...audioManager.decks[deckId].track,
                    key: newKey
                  };
                  if (audioManager.onTrackLoaded) {
                    audioManager.onTrackLoaded(deckId, audioManager.decks[deckId].track);
                  }
                }
              }}
              disabled={!track}
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                color: track ? '#00ff00' : '#666',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                padding: '2px 4px',
                fontSize: '12px',
                borderRadius: '3px',
                cursor: track ? 'pointer' : 'default',
                minWidth: '50px'
              }}
            >
              <option value="">--</option>
              <option value="C">C</option>
              <option value="Cm">Cm</option>
              <option value="Db">Db</option>
              <option value="Dbm">Dbm</option>
              <option value="D">D</option>
              <option value="Dm">Dm</option>
              <option value="Eb">Eb</option>
              <option value="Ebm">Ebm</option>
              <option value="E">E</option>
              <option value="Em">Em</option>
              <option value="F">F</option>
              <option value="Fm">Fm</option>
              <option value="F#">F#</option>
              <option value="F#m">F#m</option>
              <option value="G">G</option>
              <option value="Gm">Gm</option>
              <option value="Ab">Ab</option>
              <option value="Abm">Abm</option>
              <option value="A">A</option>
              <option value="Am">Am</option>
              <option value="Bb">Bb</option>
              <option value="Bbm">Bbm</option>
              <option value="B">B</option>
              <option value="Bm">Bm</option>
            </select>
          </div>
          {track && audioManager && (
            <button
              className="reanalyze-button"
              onClick={async () => {
                console.log(`[Deck ${deckId}] Re-analyzing track:`, track.title);
                const trackToAnalyze = { ...track, bpm: null, key: null };
                const result = await audioManager.analyzeTrack(trackToAnalyze);
                console.log(`[Deck ${deckId}] Re-analysis complete:`, result);
                if (result && result.analyzed) {
                  audioManager.decks[deckId].track = {
                    ...audioManager.decks[deckId].track,
                    bpm: result.bpm,
                    key: result.key,
                    analyzed: true
                  };
                  if (audioManager.onTrackLoaded) {
                    audioManager.onTrackLoaded(deckId, audioManager.decks[deckId].track);
                  }
                }
              }}
              title="Re-analyze BPM and Key"
              style={{
                padding: '2px 6px',
                fontSize: '10px',
                background: 'rgba(255, 165, 0, 0.2)',
                border: '1px solid rgba(255, 165, 0, 0.5)',
                borderRadius: '3px',
                color: '#ffa500',
                cursor: 'pointer',
                marginLeft: '4px'
              }}
            >
              ↻
            </button>
          )}
        </div>
      </div>

      <div className="dj-deck-content">
        <div className={`integrated-track-control ${
          isPlaying ? 'state-playing' :
          isCued ? 'state-cued' :
          track ? 'state-ready' :
          'state-empty'
        }`}>
          <div
            className="itc-track-title"
            onClick={() => {
              if (track?.id && window.api?.invoke) {
                window.api.invoke('tag-editor:open', track.id);
              }
            }}
            style={{ cursor: track?.id ? 'pointer' : 'default' }}
            title={track?.id ? 'Click to edit metadata' : ''}
          >
            <div className="track-title-text">
              {(() => {
                if (track?.title) return track.title;
                if (track?.fileName) return track.fileName.replace(/\.[^/.]+$/, "");
                if (audioManager) {
                  const audioManagerTrack = audioManager.getCurrentTrack(deckId);
                  if (audioManagerTrack?.title) return audioManagerTrack.title;
                  if (audioManagerTrack?.fileName) return audioManagerTrack.fileName.replace(/\.[^/.]+$/, "");
                  if (audioManagerTrack?.filePath) {
                    const filename = audioManagerTrack.filePath.split(/[\\/]/).pop();
                    return filename ? filename.replace(/\.[^/.]+$/, "") : 'Unknown Track';
                  }
                }
                if (audioManager) {
                  const audioElement = audioManager.decks?.[deckId]?.audio;
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
            {track && (track.bpm || track.key || track.loudness || track.gainRecommendation) && (
              <div className="track-metadata">
                {track.bpm && <span className="metadata-bpm" title="BPM">♩ {Math.round(track.bpm)}</span>}
                {track.key && <span className="metadata-key" title="Key">{track.key}{track.mode?.charAt(0) || ''}</span>}
                {track.loudness && <span className="metadata-loudness" title="Loudness (0-100)">🔊 {track.loudness}</span>}
                {track.gainRecommendation && <span className="metadata-gain" title="Gain adjustment">{track.gainRecommendation}</span>}
              </div>
            )}
          </div>

          <div className="itc-transport-controls">
            <button className="itc-btn itc-skip-backward" onClick={handleSkipBackward} title="Skip backward 30s">
              ⏮️
            </button>
            <button className={`itc-btn itc-play-pause ${isPlaying ? 'playing' : ''}`} onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button className="itc-btn itc-skip-forward" onClick={handleSkipForward} title="Skip forward 30s">
              ⭮️
            </button>
            <button className={`itc-btn itc-cue-btn ${isCued ? 'active' : ''}`} onClick={handleCueToggle} title="Cue (Monitor)">
              CUE
            </button>
          </div>

          <div className="itc-progress-container">
            <div className="itc-progress-bar" onClick={handleProgressClick}>
              <div className="itc-progress-fill" style={{ width: `${duration > 0 ? (position / duration) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="itc-track-time">
            {formatTime(position)} / {formatTime(duration)}
          </div>

          <div className="itc-fine-tune">
            <div className="itc-fine-tune-header">
              <span className="itc-fine-tune-label">FINE TUNE</span>
              <span className="itc-fine-tune-value">{fineTune > 0 ? '+' : ''}{fineTune.toFixed(2)}s</span>
            </div>
            <div
              className="itc-fine-tune-slider"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const percent = clickX / rect.width;
                const newOffset = (percent - 0.5) * 0.4;
                setFineTune(newOffset);
                const newPosition = Math.max(0, Math.min(duration, position + newOffset));
                onSeek(newPosition);
              }}
            >
              <div className="itc-fine-tune-handle" style={{ left: `${((fineTune + 0.2) / 0.4) * 100}%` }} />
            </div>
            <div className="itc-fine-tune-buttons">
              <button className="itc-fine-btn" onClick={() => onSeek(Math.max(0, position - 5))}>-5s</button>
              <button className="itc-fine-btn" onClick={() => onSeek(Math.max(0, position - 1))}>-1s</button>
              <button className="itc-fine-btn" onClick={() => onSeek(Math.max(0, position - 0.5))}>-.5s</button>
              <button className="itc-fine-btn" onClick={() => onSeek(Math.min(duration, position + 0.5))}>+.5s</button>
              <button className="itc-fine-btn" onClick={() => onSeek(Math.min(duration, position + 1))}>+1s</button>
              <button className="itc-fine-btn" onClick={() => onSeek(Math.min(duration, position + 5))}>+5s</button>
            </div>
          </div>
        </div>

        <div className="vu-waveform-container">
          <div className="vu-meter">
            <div
              className="vu-meter-bar"
              style={{
                height: `${vuLevel}%`,
                backgroundColor: vuLevel > 85 ? '#ef4444' : vuLevel > 70 ? '#f59e0b' : '#22c55e'
              }}
            />
          </div>
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

export default DJDeck;
