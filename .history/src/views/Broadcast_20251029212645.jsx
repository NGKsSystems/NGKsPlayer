import React, { useState, useEffect } from 'react';
import './Broadcast.css';

/**
 * Broadcast Output View - Designed for OBS capture
 * Shows current playing track with customizable themes
 */
export default function Broadcast() {
  const [deckData, setDeckData] = useState({
    artist: '',
    title: '',
    album: '',
    albumArt: '',
    bpm: '',
    key: '',
    position: 0,
    duration: 0,
    isPlaying: false,
    deckName: 'A'
  });

  const [theme, setTheme] = useState('default');

  useEffect(() => {
    // Get theme from URL params
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    if (themeParam) {
      setTheme(themeParam);
    }

    // Listen for deck updates from main process
    const handleDeckUpdate = (event, data) => {
      setDeckData(data);
    };

    window.electron?.on('broadcast:deckUpdate', handleDeckUpdate);

    return () => {
      window.electron?.off('broadcast:deckUpdate', handleDeckUpdate);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = deckData.duration > 0 
    ? (deckData.position / deckData.duration) * 100 
    : 0;

  return (
    <div className={`broadcast-container theme-${theme}`}>
      {/* Default Theme - Clean Professional Layout */}
      {theme === 'default' && (
        <div className="broadcast-default">
          <div className="broadcast-main">
            {deckData.albumArt && (
              <div className="broadcast-artwork">
                <img src={deckData.albumArt} alt="Album Art" />
              </div>
            )}
            <div className="broadcast-info">
              <div className="broadcast-now-playing">NOW PLAYING</div>
              <div className="broadcast-title">{deckData.title || 'No Track Loaded'}</div>
              <div className="broadcast-artist">{deckData.artist || ''}</div>
              {deckData.album && (
                <div className="broadcast-album">{deckData.album}</div>
              )}
              <div className="broadcast-meta">
                {deckData.bpm && <span className="broadcast-bpm">{deckData.bpm} BPM</span>}
                {deckData.key && <span className="broadcast-key">Key: {deckData.key}</span>}
              </div>
            </div>
          </div>
          <div className="broadcast-progress-bar">
            <div className="broadcast-progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="broadcast-time">
            <span>{formatTime(deckData.position)}</span>
            <span>{formatTime(deckData.duration)}</span>
          </div>
        </div>
      )}

      {/* Minimal Theme - Just Track Info */}
      {theme === 'minimal' && (
        <div className="broadcast-minimal">
          <div className="minimal-title">{deckData.title || 'No Track'}</div>
          <div className="minimal-artist">{deckData.artist || ''}</div>
        </div>
      )}

      {/* Bar Theme - Bottom Bar Overlay */}
      {theme === 'bar' && (
        <div className="broadcast-bar">
          <div className="bar-content">
            {deckData.albumArt && (
              <img src={deckData.albumArt} alt="" className="bar-art" />
            )}
            <div className="bar-info">
              <span className="bar-title">{deckData.title || 'No Track'}</span>
              <span className="bar-artist">{deckData.artist || ''}</span>
            </div>
            <div className="bar-meta">
              {deckData.bpm && <span>{deckData.bpm} BPM</span>}
              {deckData.key && <span>{deckData.key}</span>}
            </div>
          </div>
          <div className="bar-progress" style={{ width: `${progress}%` }}></div>
        </div>
      )}

      {/* Vinyl Theme - Retro Style */}
      {theme === 'vinyl' && (
        <div className="broadcast-vinyl">
          <div className="vinyl-disc">
            {deckData.albumArt && (
              <img src={deckData.albumArt} alt="Album Art" />
            )}
            <div className={`vinyl-spin ${deckData.isPlaying ? 'spinning' : ''}`}></div>
          </div>
          <div className="vinyl-info">
            <div className="vinyl-label">NOW SPINNING</div>
            <div className="vinyl-title">{deckData.title || 'No Track'}</div>
            <div className="vinyl-artist">{deckData.artist || ''}</div>
            <div className="vinyl-details">
              {deckData.bpm && <span>{deckData.bpm} BPM</span>}
              {deckData.key && <span>{deckData.key}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
