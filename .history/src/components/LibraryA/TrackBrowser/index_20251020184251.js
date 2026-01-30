import React, { useState, useCallback, useEffect, useMemo } from 'react';

const TrackBrowser = ({
  tracks = [],
  currentPath = '',
  onPathChange = () => {},
  onTrackSelect = () => {},
  onTrackLoad = () => {},
  selectedTrack = null,
  isLoading = false
}) => {
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

  // Parse directory structure from track paths
  const directoryStructure = useMemo(() => {
    const dirs = new Set();
    tracks.forEach(track => {
      if (track.filePath) {
        const pathParts = track.filePath.split(/[\\/]/);
        let currentDir = '';
        pathParts.slice(0, -1).forEach(part => {
          currentDir = currentDir ? `${currentDir}/${part}` : part;
          dirs.add(currentDir);
        });
      }
    });
    return Array.from(dirs).sort();
  }, [tracks]);

  // Filter tracks by current path
  const filteredTracks = useMemo(() => {
    if (!currentPath) return tracks;
    
    return tracks.filter(track => {
      if (!track.filePath) return false;
      const trackDir = track.filePath.split(/[\\/]/).slice(0, -1).join('/');
      return trackDir.startsWith(currentPath);
    });
  }, [tracks, currentPath]);

  // Sort tracks
  const sortedTracks = useMemo(() => {
    const sorted = [...filteredTracks].sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      
      // Handle duration specially (convert to seconds for comparison)
      if (sortBy === 'duration') {
        aVal = a.duration || 0;
        bVal = b.duration || 0;
      }
      
      // Handle file size
      if (sortBy === 'fileSize') {
        aVal = a.fileSize || 0;
        bVal = b.fileSize || 0;
      }
      
      // String comparison for text fields
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return sorted;
  }, [filteredTracks, sortBy, sortOrder]);

  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  }, [sortBy, sortOrder]);

  const handleDirectoryClick = useCallback((dirPath) => {
    onPathChange(dirPath);
  }, [onPathChange]);

  const handleTrackClick = useCallback((track) => {
    onTrackSelect(track);
  }, [onTrackSelect]);

  const handleTrackDoubleClick = useCallback((track) => {
    onTrackLoad(track);
  }, [onTrackLoad]);

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const getBreadcrumbs = () => {
    if (!currentPath) return ['Root'];
    return ['Root', ...currentPath.split('/')];
  };

  return (
    <div className="track-browser bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="browser-header mb-3">
        <div className="text-xs text-white mb-2 text-center font-bold">
          LIBRARY A - TRACK BROWSER
        </div>
        
        {/* Breadcrumb Navigation */}
        <div className="breadcrumbs flex items-center space-x-2 mb-2 text-xs">
          {getBreadcrumbs().map((crumb, index) => (
            <React.Fragment key={index}>
              <button
                onClick={() => {
                  if (index === 0) {
                    onPathChange('');
                  } else {
                    const path = getBreadcrumbs().slice(1, index + 1).join('/');
                    onPathChange(path);
                  }
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                {crumb}
              </button>
              {index < getBreadcrumbs().length - 1 && (
                <span className="text-gray-500">></span>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Controls */}
        <div className="controls flex justify-between items-center mb-2">
          <div className="view-controls flex space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`view-btn p-1 rounded text-xs ${
                viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`view-btn p-1 rounded text-xs ${
                viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              ⊞ Grid
            </button>
          </div>
          
          <div className="track-count text-xs text-gray-400">
            {filteredTracks.length} tracks
          </div>
        </div>
      </div>

      {/* Directory List */}
      {currentPath === '' && directoryStructure.length > 0 && (
        <div className="directories mb-3">
          <div className="text-xs text-gray-400 mb-1">Folders:</div>
          <div className="directory-list max-h-24 overflow-y-auto space-y-1">
            {directoryStructure
              .filter(dir => !dir.includes('/') || dir.split('/').length === 1)
              .map(dir => (
                <button
                  key={dir}
                  onClick={() => handleDirectoryClick(dir)}
                  className="directory-item w-full text-left p-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-white transition-colors"
                >
                  📁 {dir.split('/').pop()}
                </button>
              ))
            }
          </div>
        </div>
      )}

      {/* Track List */}
      <div className="track-list flex-1 overflow-hidden">
        {viewMode === 'list' ? (
          <div className="list-view h-full flex flex-col">
            {/* Table Header */}
            <div className="table-header bg-gray-800 p-2 rounded-t border-b border-gray-600">
              <div className="grid grid-cols-12 gap-2 text-xs text-gray-300 font-medium">
                <button
                  onClick={() => handleSort('title')}
                  className="col-span-4 text-left hover:text-white transition-colors"
                >
                  Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('artist')}
                  className="col-span-3 text-left hover:text-white transition-colors"
                >
                  Artist {sortBy === 'artist' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('genre')}
                  className="col-span-2 text-left hover:text-white transition-colors"
                >
                  Genre {sortBy === 'genre' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('duration')}
                  className="col-span-1 text-center hover:text-white transition-colors"
                >
                  Time {sortBy === 'duration' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('bpm')}
                  className="col-span-1 text-center hover:text-white transition-colors"
                >
                  BPM {sortBy === 'bpm' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSort('fileSize')}
                  className="col-span-1 text-center hover:text-white transition-colors"
                >
                  Size {sortBy === 'fileSize' && (sortOrder === 'asc' ? '↑' : '↓')}
                </button>
              </div>
            </div>
            
            {/* Track Rows */}
            <div className="table-body flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="loading-state p-4 text-center text-gray-400">
                  Loading tracks...
                </div>
              ) : sortedTracks.length === 0 ? (
                <div className="empty-state p-4 text-center text-gray-400">
                  No tracks found in this location
                </div>
              ) : (
                sortedTracks.map((track, index) => (
                  <div
                    key={track.filePath || index}
                    onClick={() => handleTrackClick(track)}
                    onDoubleClick={() => handleTrackDoubleClick(track)}
                    className={`track-row grid grid-cols-12 gap-2 p-2 text-xs cursor-pointer border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                      selectedTrack === track ? 'bg-blue-900' : ''
                    }`}
                  >
                    <div className="col-span-4 text-white truncate">
                      {track.title || 'Unknown Title'}
                    </div>
                    <div className="col-span-3 text-gray-300 truncate">
                      {track.artist || 'Unknown Artist'}
                    </div>
                    <div className="col-span-2 text-gray-400 truncate">
                      {track.genre || '--'}
                    </div>
                    <div className="col-span-1 text-gray-400 text-center">
                      {formatDuration(track.duration)}
                    </div>
                    <div className="col-span-1 text-gray-400 text-center">
                      {track.bpm || '--'}
                    </div>
                    <div className="col-span-1 text-gray-400 text-center">
                      {formatFileSize(track.fileSize)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="grid-view h-full overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {sortedTracks.map((track, index) => (
                <div
                  key={track.filePath || index}
                  onClick={() => handleTrackClick(track)}
                  onDoubleClick={() => handleTrackDoubleClick(track)}
                  className={`track-card p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition-colors ${
                    selectedTrack === track ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="track-title text-sm text-white font-medium truncate mb-1">
                    {track.title || 'Unknown Title'}
                  </div>
                  <div className="track-artist text-xs text-gray-300 truncate mb-2">
                    {track.artist || 'Unknown Artist'}
                  </div>
                  <div className="track-info flex justify-between text-xs text-gray-400">
                    <span>{formatDuration(track.duration)}</span>
                    <span>{track.bpm ? `${track.bpm} BPM` : '--'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="status-bar mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>
            Sorted by: {sortBy} ({sortOrder})
          </span>
          <span>
            {selectedTrack ? `Selected: ${selectedTrack.title || 'Unknown'}` : 'No selection'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrackBrowser;