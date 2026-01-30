import React, { useState, useCallback, useEffect, useRef } from 'react';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const Transport = ({
  isPlaying = false,
  isPaused = false,
  currentTrack = null,
  currentTime = 0,
  duration = 0,
  isCueMode = false,
  onPlay = () => {},
  onPause = () => {},
  onStop = () => {},
  onCue = () => {},
  onPrevious = () => {},
  onNext = () => {},
  onSeek = () => {}
}) => {
  const [showFullTitle, setShowFullTitle] = useState(false);
  const progressBarRef = useRef();

  // Click handler for progress bar seeking
  const handleProgressClick = useCallback((e) => {
    if (duration > 0) {
      onSeek(e);
    }
  }, [duration, onSeek]);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Track info display
  const trackTitle = currentTrack?.track?.title || 'No Track Loaded';
  const trackArtist = currentTrack?.track?.artist || '';
  const displayTitle = trackTitle.length > 25 && !showFullTitle 
    ? `${trackTitle.substring(0, 22)}...` 
    : trackTitle;

  return (
    <div className="transport-control bg-gray-800 text-white p-4 rounded-lg">
      {/* Track Info */}
      <div className="track-info mb-3">
        <div 
          className="track-title text-sm font-medium cursor-pointer hover:bg-gray-700 p-1 rounded"
          onClick={() => setShowFullTitle(!showFullTitle)}
          title="Click to toggle full title"
        >
          Deck B: {displayTitle}
        </div>
        {trackArtist && (
          <div className="track-artist text-xs text-gray-400 mt-1">
            {trackArtist}
          </div>
        )}
      </div>

      {/* Time Display */}
      <div className="time-display flex justify-between text-xs text-gray-300 mb-2">
        <span>{formatTime(currentTime)}</span>
        <span>-{formatTime(duration - currentTime)}</span>
      </div>

      {/* Progress Bar */}
      <div 
        ref={progressBarRef}
        className="progress-bar bg-gray-600 h-2 rounded-full mb-4 cursor-pointer hover:bg-gray-500 transition-colors"
        onClick={handleProgressClick}
      >
        <div 
          className="progress-fill bg-blue-500 h-full rounded-full transition-all duration-100"
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>

      {/* Transport Controls */}
      <div className="transport-buttons flex justify-center space-x-3">
        <button
          onClick={onPrevious}
          className="control-btn p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Previous (-10s)"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M6.271 5.055a.5.5 0 0 1 .52.038L11 7.055a.5.5 0 0 1 0 .89L6.791 9.907a.5.5 0 0 1-.791-.389V5.5a.5.5 0 0 1 .271-.445z"/>
          </svg>
        </button>

        <button
          onClick={isPlaying ? onPause : onPlay}
          className={`control-btn p-3 rounded transition-colors ${
            isPlaying ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'
          }`}
          disabled={!currentTrack?.track}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M6 3.5a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5zm4 0a.5.5 0 0 1 .5.5v8a.5.5 0 0 1-1 0V4a.5.5 0 0 1 .5-.5z"/>
            </svg>
          ) : (
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>

        <button
          onClick={onStop}
          className="control-btn p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Stop"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/>
          </svg>
        </button>

        <button
          onClick={onNext}
          className="control-btn p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
          title="Next (+10s)"
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="m5.238 5.072.022-.012a.5.5 0 0 1 .482.002L10 7.055a.5.5 0 0 1 0 .89L5.742 9.907a.5.5 0 0 1-.804-.389V5.5a.5.5 0 0 1 .3-.428z"/>
          </svg>
        </button>

        <button
          onClick={onCue}
          className={`control-btn p-2 rounded transition-colors ${
            isCueMode ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isCueMode ? 'Exit Cue Mode' : 'Cue'}
        >
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zM11 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm-4.5-8a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zM8 1a2.5 2.5 0 0 1 2.5 2.5V11h-5V3.5A2.5 2.5 0 0 1 8 1z"/>
          </svg>
        </button>
      </div>

      {/* Status Indicators */}
      <div className="status-indicators flex justify-between mt-3 text-xs">
        <div className="deck-status flex space-x-2">
          {isPlaying && (
            <span className="text-green-400">▶ PLAYING</span>
          )}
          {isPaused && (
            <span className="text-yellow-400">⏸ PAUSED</span>
          )}
          {isCueMode && (
            <span className="text-yellow-400">🎧 CUE</span>
          )}
        </div>
        <div className="duration-display text-gray-400">
          {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default Transport;