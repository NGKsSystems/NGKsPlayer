import React, { useState, useEffect, useMemo } from 'react';import React, { useState, useCallback, useEffect, useMemo } from "react";



const LibraryWidget = ({ deck = 'A' }) => {const LibraryWidget = ({

  const [tracks, setTracks] = useState([]);  deck = 'A',

  const [loading, setLoading] = useState(true);  onTrackLoad = () => {},

  const [searchTerm, setSearchTerm] = useState('');  onTrackPreview = () => {},

  const [error, setError] = useState(null);  tracks = [],

  isLoading = false

  // Load tracks when component mounts}) => {

  useEffect(() => {  const [libraryState, setLibraryState] = useState(() => {

    loadTracks();    try {

  }, []);      const saved = localStorage.getItem(`library-${deck}-state`);

      if (saved) return JSON.parse(saved);

  const loadTracks = async () => {    } catch (error) {}

    try {    

      setLoading(true);    return {

      setError(null);      searchQuery: '',

            selectedTrack: null,

      // Get all tracks from the database      currentPath: '',

      const allTracks = await window.api.getTracks({});      sortBy: 'name',

      sortOrder: 'asc',

            viewMode: 'list'

      setTracks(allTracks);    };

    } catch (err) {  });

      console.error(`[LibraryWidget ${deck || 'Main'}] Failed to load tracks:`, err);

      setError('Failed to load music library');  // Save state to localStorage

    } finally {  useEffect(() => {

      setLoading(false);    try {

    }      localStorage.setItem(`library-${deck}-state`, JSON.stringify(libraryState));

  };    } catch (error) {}

  }, [libraryState, deck]);

  // Filter tracks based on search term

  const filteredTracks = useMemo(() => {  // Filter and sort tracks based on search and sort settings

    if (!searchTerm.trim()) return tracks;  const filteredTracks = useMemo(() => {

        let filtered = tracks.filter(track => {

    const search = searchTerm.toLowerCase();      if (!libraryState.searchQuery) return true;

    return tracks.filter(track =>       const query = libraryState.searchQuery.toLowerCase();

      track.title?.toLowerCase().includes(search) ||      return (

      track.artist?.toLowerCase().includes(search) ||        track.artist?.toLowerCase().includes(query) ||

      track.album?.toLowerCase().includes(search)        track.title?.toLowerCase().includes(query) ||

    );        track.album?.toLowerCase().includes(query) ||

  }, [tracks, searchTerm]);        track.genre?.toLowerCase().includes(query)

      );

  // Handle track double-click to load in deck    });

  const handleTrackDoubleClick = async (track) => {

    try {    // Sort tracks

    filtered.sort((a, b) => {

            let aVal = a[libraryState.sortBy] || '';

      if (!track.filePath) {      let bVal = b[libraryState.sortBy] || '';

        console.error('[LibraryWidget] ❌ No file path available for track:', track);      

        alert('Cannot load track: No file path available');      if (typeof aVal === 'string') {

        return;        aVal = aVal.toLowerCase();

      }        bVal = bVal.toLowerCase();

      }

      // Send IPC message to load track in specific deck      

      const deckTarget = deck ? deck.toUpperCase() : 'A'; // Default to deck A if no deck specified      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;

      return libraryState.sortOrder === 'asc' ? comparison : -comparison;

          });

      // Check if API is available

      if (!window.api) {    return filtered;

        console.error('[LibraryWidget] ❌ window.api not available');  }, [tracks, libraryState.searchQuery, libraryState.sortBy, libraryState.sortOrder]);

        alert('Cannot load track: API not available');

        return;  const handleSearchChange = useCallback((e) => {

      }    setLibraryState(prev => ({

      ...prev,

      if (!window.api.invoke) {      searchQuery: e.target.value

        console.error('[LibraryWidget] ❌ window.api.invoke not available');    }));

        alert('Cannot load track: IPC invoke not available');  }, []);

        return;

      }  const handleTrackSelect = useCallback((track) => {

          setLibraryState(prev => ({

      ...prev,

            selectedTrack: track

      try {    }));

        const result = await window.api.invoke('deck:loadTrack', {  }, []);

          filePath: track.filePath,

          deck: deckTarget,  const handleTrackDoubleClick = useCallback((track) => {

          track: track    onTrackLoad(track);

        });  }, [onTrackLoad]);

        

  const handleSortChange = useCallback((sortBy) => {

            setLibraryState(prev => ({

      } catch (ipcError) {      ...prev,

        console.error('[LibraryWidget] ❌ IPC call failed:', ipcError);      sortBy,

        alert(`Failed to load track via IPC: ${ipcError.message}`);      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'

      }    }));

        }, []);

    } catch (err) {

      console.error('[LibraryWidget] ❌ Failed to load track:', err);  const formatDuration = (duration) => {

      alert(`Failed to load track: ${err.message}`);    if (!duration) return '--:--';

    }    const minutes = Math.floor(duration / 60);

  };    const seconds = Math.floor(duration % 60);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // Format duration from seconds to MM:SS  };

  const formatDuration = (seconds) => {

    if (!seconds || isNaN(seconds)) return '--:--';  const formatFileSize = (size) => {

    const mins = Math.floor(seconds / 60);    if (!size) return '--';

    const secs = Math.floor(seconds % 60);    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;

    return `${mins}:${secs.toString().padStart(2, '0')}`;    return `${(size / (1024 * 1024)).toFixed(1)}MB`;

  };  };



  return (  return (

    <div className={`library-content library-${deck?.toLowerCase() || 'main'}`}>    <div className="library-container h-full bg-gray-900 text-white flex flex-col">

      <div className="library-header">      {/* Header with Search */}

        <h4>{deck ? `Library ${deck}` : 'Music Library'}</h4>      <div className="library-header p-3 border-b border-gray-700">

        <div className="library-stats">        <div className="flex items-center justify-between mb-2">

          {loading ? 'Loading...' : `${filteredTracks.length} tracks`}            <span className="text-sm font-bold">Library {deck}</span>

        </div>            <span className="text-xs text-gray-400">

      </div>              {filteredTracks.length} tracks

                  </span>

      <div className="library-controls">          </div>

        <input           

          type="text"           <div className="search-bar">

          placeholder="Search tracks..."             <input

          value={searchTerm}              type="text"

          onChange={(e) => setSearchTerm(e.target.value)}              placeholder="Search tracks..."

          className="library-search"              value={libraryState.searchQuery}

        />              onChange={handleSearchChange}

                      className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"

        <div className="library-actions">            />

          <button onClick={loadTracks} disabled={loading} className="refresh-btn">          </div>

            {loading ? '...' : '↻'}        </div>

          </button>

        </div>        {/* Track List Header */}

      </div>        <div className="track-list-header bg-gray-800 px-3 py-2 border-b border-gray-600">

          <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium">

      <div className="track-list">            <button 

        {error && (              className="col-span-5 text-left hover:text-white transition-colors"

          <div className="library-error">              onClick={() => handleSortChange('title')}

            {error}            >

            <button onClick={loadTracks}>Retry</button>              TRACK {libraryState.sortBy === 'title' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}

          </div>            </button>

        )}            <button 

                      className="col-span-3 text-left hover:text-white transition-colors"

        {loading && (              onClick={() => handleSortChange('artist')}

          <div className="library-loading">            >

            Loading music library...              ARTIST {libraryState.sortBy === 'artist' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}

          </div>            </button>

        )}            <button 

                      className="col-span-2 text-left hover:text-white transition-colors"

        {!loading && !error && filteredTracks.length === 0 && !searchTerm && (              onClick={() => handleSortChange('duration')}

          <div className="library-empty">            >

            <p>No tracks in library</p>              TIME {libraryState.sortBy === 'duration' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}

            <p>Use File → Scan Library to add music</p>            </button>

          </div>            <button 

        )}              className="col-span-2 text-left hover:text-white transition-colors"

                      onClick={() => handleSortChange('bpm')}

        {!loading && !error && filteredTracks.length === 0 && searchTerm && (            >

          <div className="library-empty">              BPM {libraryState.sortBy === 'bpm' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}

            <p>No tracks found for "{searchTerm}"</p>            </button>

          </div>          </div>

        )}        </div>

        

        {!loading && !error && filteredTracks.length > 0 && (        {/* Track List */}

          <div className="track-items">        <div className="track-list flex-1 overflow-y-auto">

            {filteredTracks.map((track) => (          {isLoading ? (

              <div             <div className="flex items-center justify-center h-full">

                key={track.id}              <div className="text-gray-400">Loading tracks...</div>

                className="track-item"            </div>

                onDoubleClick={() => handleTrackDoubleClick(track)}          ) : filteredTracks.length === 0 ? (

                title={`Double-click to load in ${deck ? `Deck ${deck}` : 'player'}`}            <div className="flex items-center justify-center h-full">

              >              <div className="text-gray-400">

                <div className="track-info">                {libraryState.searchQuery ? 'No tracks found' : 'No tracks loaded'}

                  <div className="track-title">{track.title || 'Unknown Title'}</div>              </div>

                  <div className="track-details">            </div>

                    <span className="track-artist">{track.artist || 'Unknown Artist'}</span>          ) : (

                    {track.album && <span className="track-album"> • {track.album}</span>}            <div className="tracks">

                  </div>              {filteredTracks.map((track, index) => (

                </div>                <div

                <div className="track-meta">                  key={track.id || index}

                  <div className="track-duration">{formatDuration(track.duration)}</div>                  className={`track-row grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-gray-800 cursor-pointer transition-colors ${

                  {track.bpm && <div className="track-bpm">{Math.round(track.bpm)} BPM</div>}                    libraryState.selectedTrack?.id === track.id ? 'bg-blue-900' : ''

                </div>                  }`}

              </div>                  onClick={() => handleTrackSelect(track)}

            ))}                  onDoubleClick={() => handleTrackDoubleClick(track)}

          </div>                >

        )}                  <div className="col-span-5 truncate" title={track.title}>

      </div>                    {track.title || 'Unknown Title'}

    </div>                  </div>

  );                  <div className="col-span-3 truncate text-gray-400" title={track.artist}>

};                    {track.artist || 'Unknown Artist'}

                  </div>

export default LibraryWidget;                  <div className="col-span-2 text-gray-400">
                    {formatDuration(track.duration)}
                  </div>
                  <div className="col-span-2 text-gray-400">
                    {track.bpm || '--'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="library-footer bg-gray-800 px-3 py-2 border-t border-gray-600">
          <div className="flex justify-between items-center text-xs text-gray-400">
            <div>
              {libraryState.selectedTrack && (
                <span>
                  Selected: {libraryState.selectedTrack.title} - {libraryState.selectedTrack.artist}
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <span>Total: {filteredTracks.length}</span>
              {libraryState.searchQuery && (
                <span>Filtered: {filteredTracks.length}/{tracks.length}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryWidget;