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
    <div className={`eq-content eq-${deck.toLowerCase()}`}>
      {/* EQ Header with Presets */}
      <div className="eq-header" onMouseDown={handleControlMouseDown}>
        <div className="eq-presets">
          <label>Preset:</label>
          <select 
            value={selectedPreset} 
            onChange={(e) => handlePresetChange(e.target.value)}
            className="eq-preset-select"
            onMouseDown={handleControlMouseDown}
          >
            {Object.keys(presets).map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </div>
        <div className="eq-controls-header">
          <button 
            className={`eq-bypass-btn ${bypassEQ ? 'active' : ''}`}
            onClick={() => setBypassEQ(!bypassEQ)}
            onMouseDown={handleControlMouseDown}
          >
            {bypassEQ ? 'BYPASSED' : 'ACTIVE'}
          </button>
          <button 
            className="eq-reset-btn" 
            onClick={handleReset}
            onMouseDown={handleControlMouseDown}
          >
            RESET
          </button>
        </div>
      </div>
      
      {/* 16-Band EQ Sliders */}
      <div className="eq-bands-container">
        <div className="eq-bands">
          {frequencies.map((freq, index) => (
            <div key={index} className="eq-band-vertical">
              <div className="eq-gain-value">
                {eqValues[index] > 0 ? '+' : ''}{eqValues[index].toFixed(1)}
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqValues[index]}
                onChange={(e) => handleBandChange(index, e.target.value)}
                onMouseDown={handleSliderMouseDown}
                className={`eq-slider ${bypassEQ ? 'bypassed' : ''}`}
                orient="vertical"
                disabled={bypassEQ}
              />
              <div className="eq-frequency">{freq}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* EQ Status */}
      <div className="eq-analyzer" onMouseDown={handleControlMouseDown}>
        <div style={{ 
          fontSize: '10px', 
          color: audioContext && eqFilters.length > 0 ? '#00ff88' : '#ff4444',
          textAlign: 'center',
          padding: '4px'
        }}>
          {audioContext && eqFilters.length > 0 ? 
            `🎛️ EQ Active (${eqFilters.length} bands)` : 
            '⚠️ EQ Not Connected'
          }
        </div>
      </div>
    </div>
  );
};

export default EQWidget;