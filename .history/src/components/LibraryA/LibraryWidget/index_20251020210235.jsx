import React, { useState, useCallback, useEffect, useMemo } from "react";

const LibraryWidget = ({
  deck = 'A',
  onTrackLoad = () => {},
  onTrackPreview = () => {},
  tracks = [],
  isLoading = false
}) => {
  const [libraryState, setLibraryState] = useState(() => {
    try {
      const saved = localStorage.getItem(`library-${deck}-state`);
      if (saved) return JSON.parse(saved);
    } catch (error) {}
    
    return {
      searchQuery: '',
      selectedTrack: null,
      currentPath: '',
      sortBy: 'name',
      sortOrder: 'asc',
      viewMode: 'list'
    };
  });

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(`library-${deck}-state`, JSON.stringify(libraryState));
    } catch (error) {}
  }, [libraryState, deck]);

  // Filter and sort tracks based on search and sort settings
  const filteredTracks = useMemo(() => {
    let filtered = tracks.filter(track => {
      if (!libraryState.searchQuery) return true;
      const query = libraryState.searchQuery.toLowerCase();
      return (
        track.artist?.toLowerCase().includes(query) ||
        track.title?.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query)
      );
    });

    // Sort tracks
    filtered.sort((a, b) => {
      let aVal = a[libraryState.sortBy] || '';
      let bVal = b[libraryState.sortBy] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return libraryState.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [tracks, libraryState.searchQuery, libraryState.sortBy, libraryState.sortOrder]);

  const handleSearchChange = useCallback((e) => {
    setLibraryState(prev => ({
      ...prev,
      searchQuery: e.target.value
    }));
  }, []);

  const handleTrackSelect = useCallback((track) => {
    setLibraryState(prev => ({
      ...prev,
      selectedTrack: track
    }));
  }, []);

  const handleTrackDoubleClick = useCallback((track) => {
    onTrackLoad(track);
  }, [onTrackLoad]);

  const handleSortChange = useCallback((sortBy) => {
    setLibraryState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const formatDuration = (duration) => {
    if (!duration) return '--:--';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (size) => {
    if (!size) return '--';
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
    return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="library-container h-full bg-gray-900 text-white flex flex-col">
      {/* Header with Search */}
      <div className="library-header p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold">Library {deck}</span>
            <span className="text-xs text-gray-400">
              {filteredTracks.length} tracks
            </span>
          </div>
          
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search tracks..."
              value={libraryState.searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
            />
          </div>
        </div>

        {/* Track List Header */}
        <div className="track-list-header bg-gray-800 px-3 py-2 border-b border-gray-600">
          <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-medium">
            <button 
              className="col-span-5 text-left hover:text-white transition-colors"
              onClick={() => handleSortChange('title')}
            >
              TRACK {libraryState.sortBy === 'title' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className="col-span-3 text-left hover:text-white transition-colors"
              onClick={() => handleSortChange('artist')}
            >
              ARTIST {libraryState.sortBy === 'artist' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className="col-span-2 text-left hover:text-white transition-colors"
              onClick={() => handleSortChange('duration')}
            >
              TIME {libraryState.sortBy === 'duration' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              className="col-span-2 text-left hover:text-white transition-colors"
              onClick={() => handleSortChange('bpm')}
            >
              BPM {libraryState.sortBy === 'bpm' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </div>

        {/* Track List */}
        <div className="track-list flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Loading tracks...</div>
            </div>
          ) : filteredTracks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">
                {libraryState.searchQuery ? 'No tracks found' : 'No tracks loaded'}
              </div>
            </div>
          ) : (
            <div className="tracks">
              {filteredTracks.map((track, index) => (
                <div
                  key={track.id || index}
                  className={`track-row grid grid-cols-12 gap-2 px-3 py-2 text-sm hover:bg-gray-800 cursor-pointer transition-colors ${
                    libraryState.selectedTrack?.id === track.id ? 'bg-blue-900' : ''
                  }`}
                  onClick={() => handleTrackSelect(track)}
                  onDoubleClick={() => handleTrackDoubleClick(track)}
                >
                  <div className="col-span-5 truncate" title={track.title}>
                    {track.title || 'Unknown Title'}
                  </div>
                  <div className="col-span-3 truncate text-gray-400" title={track.artist}>
                    {track.artist || 'Unknown Artist'}
                  </div>
                  <div className="col-span-2 text-gray-400">
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