import React, { useState, useEffect, useMemo } from 'react';

const LibraryWidget = ({ deck = 'A' }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Load tracks when component mounts
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all tracks from the database
      const allTracks = await window.api.getTracks({});

      
      setTracks(allTracks);
    } catch (err) {
      console.error(`[LibraryWidget ${deck || 'Main'}] Failed to load tracks:`, err);
      setError('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  // Filter tracks based on search term
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return tracks;
    
    const search = searchTerm.toLowerCase();
    return tracks.filter(track => 
      track.title?.toLowerCase().includes(search) ||
      track.artist?.toLowerCase().includes(search) ||
      track.album?.toLowerCase().includes(search)
    );
  }, [tracks, searchTerm]);

  // Handle track double-click to load in deck
  const handleTrackDoubleClick = async (track) => {
    try {

      
      if (!track.filePath) {
        console.error('[LibraryWidget] ❌ No file path available for track:', track);
        alert('Cannot load track: No file path available');
        return;
      }

      // Send IPC message to load track in specific deck
      const deckTarget = deck ? deck.toUpperCase() : 'A'; // Default to deck A if no deck specified

      
      // Check if API is available
      if (!window.api) {
        console.error('[LibraryWidget] ❌ window.api not available');
        alert('Cannot load track: API not available');
        return;
      }

      if (!window.api.invoke) {
        console.error('[LibraryWidget] ❌ window.api.invoke not available');
        alert('Cannot load track: IPC invoke not available');
        return;
      }
      

      
      try {
        const result = await window.api.invoke('deck:loadTrack', {
          filePath: track.filePath,
          deck: deckTarget,
          track: track
        });
        

        
      } catch (ipcError) {
        console.error('[LibraryWidget] ❌ IPC call failed:', ipcError);
        alert(`Failed to load track via IPC: ${ipcError.message}`);
      }
      
    } catch (err) {
      console.error('[LibraryWidget] ❌ Failed to load track:', err);
      alert(`Failed to load track: ${err.message}`);
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className={`library-content library-${deck?.toLowerCase() || 'main'}`}>
      <div className="library-header">
        <h4>{deck ? `Library ${deck}` : 'Music Library'}</h4>
        <div className="library-stats">
          {loading ? 'Loading...' : `${filteredTracks.length} tracks`}
        </div>
      </div>
      
      <div className="library-controls">
        <input 
          type="text" 
          placeholder="Search tracks..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="library-search"
        />
        
        <div className="library-actions">
          <button onClick={loadTracks} disabled={loading} className="refresh-btn">
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      <div className="track-list">
        {error && (
          <div className="library-error">
            {error}
            <button onClick={loadTracks}>Retry</button>
          </div>
        )}
        
        {loading && (
          <div className="library-loading">
            Loading music library...
          </div>
        )}
        
        {!loading && !error && filteredTracks.length === 0 && !searchTerm && (
          <div className="library-empty">
            <p>No tracks in library</p>
            <p>Use File → Scan Library to add music</p>
          </div>
        )}
        
        {!loading && !error && filteredTracks.length === 0 && searchTerm && (
          <div className="library-empty">
            <p>No tracks found for "{searchTerm}"</p>
          </div>
        )}
        
        {!loading && !error && filteredTracks.length > 0 && (
          <div className="track-items">
            {filteredTracks.map((track) => (
              <div 
                key={track.id}
                className="track-item"
                onDoubleClick={() => handleTrackDoubleClick(track)}
                title={`Double-click to load in ${deck ? `Deck ${deck}` : 'player'}`}
              >
                <div className="track-info">
                  <div className="track-title">{track.title || 'Unknown Title'}</div>
                  <div className="track-details">
                    <span className="track-artist">{track.artist || 'Unknown Artist'}</span>
                    {track.album && <span className="track-album"> • {track.album}</span>}
                  </div>
                </div>
                <div className="track-meta">
                  <div className="track-duration">{formatDuration(track.duration)}</div>
                  {track.bpm && <div className="track-bpm">{Math.round(track.bpm)} BPM</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LibraryWidget;