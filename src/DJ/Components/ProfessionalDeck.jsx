import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, RotateCcw, Volume2, Headphones } from 'lucide-react';
import './ProfessionalDeck.css';

/**
 * Professional DJ Deck Component
 * Supports all 4 decks (A, B, C, D) with full DJ functionality
 */
const ProfessionalDeck = ({ 
  deckId, 
  audioManager, 
  track, 
  onTrackLoad,
  layoutConfig,
  compactMode = false,
  className = '',
  ...props 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [pitch, setPitch] = useState(0);
  const [cue, setCue] = useState(false);
  const [sync, setSync] = useState(false);
  const [bpm, setBpm] = useState(128);
  const [keyLock, setKeyLock] = useState(false);
  const [loop, setLoop] = useState({ enabled: false, start: 0, end: 0 });
  
  // Hot cues (8 hot cue points)
  const [hotCues, setHotCues] = useState(Array(8).fill(null));
  
  // Waveform data
  const [waveformData, setWaveformData] = useState(null);
  const canvasRef = useRef(null);
  
  // BPM detection and sync
  const [autoBPM, setAutoBPM] = useState(128);
  const [beatPhase, setBeatPhase] = useState(0);

  // Initialize deck
  useEffect(() => {
    if (audioManager && deckId) {
      // Set up audio manager callbacks for this deck
      audioManager.setOnPositionUpdate((deckData) => {
        if (deckData[deckId]) {
          setPosition(deckData[deckId].position || 0);
          setIsPlaying(deckData[deckId].playing || false);
        }
      });
    }
  }, [audioManager, deckId]);

  // Handle track loading
  useEffect(() => {
    if (track && audioManager) {
      loadTrack(track);
    }
  }, [track]);

  const loadTrack = async (trackData) => {
    try {
      await audioManager.loadTrack(deckId, trackData);
      setDuration(audioManager.getDuration(deckId) || 0);
      
      // Auto-detect BPM if available
      if (trackData.bpm) {
        setAutoBPM(trackData.bpm);
        setBpm(trackData.bpm);
      }
      
      // Generate waveform data
      generateWaveform(trackData);
      
      console.log(`🎵 Track loaded to Deck ${deckId}:`, trackData.title);
    } catch (error) {
      console.error(`Failed to load track to Deck ${deckId}:`, error);
    }
  };

  // Generate waveform visualization
  const generateWaveform = async (trackData) => {
    if (!trackData.file_path) return;
    
    try {
      // This would typically involve audio analysis
      // For now, generate a mock waveform
      const points = 200;
      const mockWaveform = Array.from({ length: points }, (_, i) => 
        Math.sin(i * 0.1) * 0.5 + Math.random() * 0.5
      );
      setWaveformData(mockWaveform);
    } catch (error) {
      console.error('Failed to generate waveform:', error);
    }
  };

  // Playback controls
  const handlePlayPause = async () => {
    if (audioManager) {
      await audioManager.playPause(deckId);
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (audioManager) {
      audioManager.stop(deckId);
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const handleCue = () => {
    if (audioManager) {
      audioManager.setCue(deckId, !cue);
      setCue(!cue);
    }
  };

  // Seek to position
  const handleSeek = (newPosition) => {
    if (audioManager) {
      audioManager.seek(deckId, newPosition);
      setPosition(newPosition);
    }
  };

  // Volume control
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioManager) {
      audioManager.setVolume(deckId, newVolume / 100);
    }
  };

  // Pitch control
  const handlePitchChange = (newPitch) => {
    setPitch(newPitch);
    if (audioManager) {
      audioManager.setPitch(deckId, newPitch);
    }
  };

  // Hot cue functions
  const setHotCue = (index) => {
    const newHotCues = [...hotCues];
    newHotCues[index] = position;
    setHotCues(newHotCues);
  };

  const triggerHotCue = (index) => {
    if (hotCues[index] !== null) {
      handleSeek(hotCues[index]);
    }
  };

  const deleteHotCue = (index) => {
    const newHotCues = [...hotCues];
    newHotCues[index] = null;
    setHotCues(newHotCues);
  };

  // Sync and BPM functions
  const handleSync = () => {
    setSync(!sync);
    if (audioManager && audioManager.syncBPM) {
      audioManager.syncBPM(deckId, !sync);
    }
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progressPercent = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <div 
      className={`professional-deck deck-${deckId.toLowerCase()} ${compactMode ? 'compact' : ''} ${className}`}
      data-deck={deckId}
    >
      {/* Deck Header */}
      <div className="deck-header">
        <div className="deck-label">DECK {deckId}</div>
        <div className="deck-status">
          {isPlaying && <div className="playing-indicator">●</div>}
          {cue && <div className="cue-indicator">CUE</div>}
          {sync && <div className="sync-indicator">SYNC</div>}
        </div>
      </div>

      {/* Track Info */}
      <div className="track-info">
        {track ? (
          <>
            <div className="track-title">{track.title || 'Unknown Title'}</div>
            <div className="track-artist">{track.artist || 'Unknown Artist'}</div>
            <div className="track-bpm">{bpm} BPM</div>
          </>
        ) : (
          <div className="no-track">No Track Loaded</div>
        )}
      </div>

      {/* Waveform Display */}
      <div className="waveform-container">
        <canvas 
          ref={canvasRef} 
          className="waveform-canvas"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            handleSeek(duration * percent);
          }}
        />
        <div 
          className="playhead" 
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="time-display">
        <span className="current-time">{formatTime(position)}</span>
        <span className="remaining-time">-{formatTime(duration - position)}</span>
      </div>

      {/* Main Controls */}
      <div className="main-controls">
        <button 
          className={`control-btn cue-btn ${cue ? 'active' : ''}`}
          onClick={handleCue}
        >
          <Headphones size={16} />
          CUE
        </button>
        
        <button 
          className="control-btn play-btn"
          onClick={handlePlayPause}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        
        <button 
          className="control-btn stop-btn"
          onClick={handleStop}
        >
          <Square size={16} />
        </button>
        
        <button 
          className={`control-btn sync-btn ${sync ? 'active' : ''}`}
          onClick={handleSync}
        >
          <RotateCcw size={16} />
          SYNC
        </button>
      </div>

      {/* Hot Cues */}
      <div className="hot-cues">
        {hotCues.map((cuePoint, index) => (
          <button
            key={index}
            className={`hot-cue-btn ${cuePoint !== null ? 'set' : ''}`}
            onClick={() => triggerHotCue(index)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (cuePoint !== null) {
                deleteHotCue(index);
              } else {
                setHotCue(index);
              }
            }}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Volume Fader */}
      <div className="volume-section">
        <label className="volume-label">VOLUME</label>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="volume-fader"
          orient="vertical"
        />
        <div className="volume-value">{volume}%</div>
      </div>

      {/* Pitch Control */}
      <div className="pitch-section">
        <label className="pitch-label">PITCH</label>
        <input
          type="range"
          min="-20"
          max="20"
          value={pitch}
          onChange={(e) => handlePitchChange(parseInt(e.target.value))}
          className="pitch-fader"
        />
        <div className="pitch-value">{pitch > 0 ? '+' : ''}{pitch}%</div>
        <button 
          className="pitch-reset"
          onClick={() => handlePitchChange(0)}
        >
          0
        </button>
      </div>

      {/* BPM Display */}
      <div className="bpm-section">
        <div className="bpm-display">{bpm.toFixed(1)}</div>
        <div className="beat-indicator" style={{
          opacity: Math.abs(Math.sin(beatPhase)) * 0.8 + 0.2
        }} />
      </div>
    </div>
  );
};

export default ProfessionalDeck;