import React, { useCallback } from 'react';

const Transport = ({ 
  isPlaying, 
  isPaused, 
  currentTrack, 
  currentTime, 
  duration, 
  isCueMode, 
  onPlay, 
  onPause, 
  onStop, 
  onCue, 
  onPrevious, 
  onNext, 
  onSeek 
}) => {
  
  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get track info for display
  const trackInfo = currentTrack?.track;
  const trackName = trackInfo ? `${trackInfo.title || 'Unknown'} - ${trackInfo.artist || 'Unknown'}` : 'No track loaded';
  const trackDetails = trackInfo ? `BPM: ${Math.round(trackInfo.bpm || 0)} | Key: ${trackInfo.key || '--'}` : 'BPM: -- | Key: --';

  return (
    <div className="transport-control">
      <div className="track-info">
        <div className="track-name" title={trackName}>{trackName}</div>
        <div className="track-details">{trackDetails}</div>
      </div>
      
      {/* Progress Bar */}
      <div className="progress-container">
        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="duration">{formatTime(duration)}</span>
        </div>
        <div 
          className="progress-bar" 
          onClick={onSeek}
          title="Click to seek"
        >
          <div 
            className="progress-fill"
            style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
          ></div>
        </div>
      </div>
      
      <div className="transport-buttons">
        <button 
          className="nav-btn back"
          onClick={onPrevious}
          disabled={!currentTrack?.track}
          title="Jump back 10 seconds"
        >
          ⏮
        </button>
        <button 
          className={`play-btn ${isPlaying ? 'active' : ''}`}
          onClick={onPlay}
          disabled={!currentTrack?.track}
          title="Play"
        >
          ▶
        </button>
        <button 
          className={`pause-btn ${isPaused ? 'active' : ''}`}
          onClick={onPause}
          disabled={!currentTrack?.track}
          title="Pause"
        >
          ⏸
        </button>
        <button 
          className="stop-btn"
          onClick={onStop}
          disabled={!currentTrack?.track}
          title="Stop"
        >
          ⏹
        </button>
        <button 
          className={`cue-btn ${isCueMode ? 'active' : ''}`}
          onClick={onCue}
          disabled={!currentTrack?.track}
          title={isCueMode ? "Exit Cue (Left Ear)" : "Enter Cue (Right Ear)"}
        >
          {isCueMode ? 'LIVE' : 'CUE'}
        </button>
        <button 
          className="nav-btn forward"
          onClick={onNext}
          disabled={!currentTrack?.track}
          title="Jump forward 10 seconds"
        >
          ⏭
        </button>
      </div>
    </div>
  );
};

export default Transport;