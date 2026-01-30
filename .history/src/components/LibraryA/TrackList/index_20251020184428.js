import React, { useState, useCallback, useRef, useEffect } from 'react';

const TrackList = ({
  tracks = [],
  selectedTrack = null,
  onTrackSelect = () => {},
  onTrackLoad = () => {},
  onTrackPreview = () => {},
  isLoading = false,
  deck = 'A'
}) => {
  const [draggedTrack, setDraggedTrack] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const listRef = useRef();

  const formatTime = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '--';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)}KB` : `${mb.toFixed(1)}MB`;
  };

  const getAudioQualityIcon = (track) => {
    if (!track.sampleRate || !track.bitRate) return '🎵';
    
    const sampleRate = parseInt(track.sampleRate);
    const bitRate = parseInt(track.bitRate);
    
    if (sampleRate >= 96000 && bitRate >= 1000) return '💎'; // High-res
    if (sampleRate >= 44100 && bitRate >= 320) return '🔥'; // High quality
    if (bitRate >= 192) return '✨'; // Good quality
    return '🎵'; // Standard
  };

  const handleTrackClick = useCallback((track, event) => {
    event.preventDefault();
    onTrackSelect(track);
  }, [onTrackSelect]);

  const handleTrackDoubleClick = useCallback((track, event) => {
    event.preventDefault();
    onTrackLoad(track);
  }, [onTrackLoad]);

  const handleContextMenu = useCallback((track, event) => {
    event.preventDefault();
    setContextMenu({
      track,
      x: event.clientX,
      y: event.clientY
    });
  }, []);

  const handleDragStart = useCallback((track, event) => {
    setDraggedTrack(track);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', JSON.stringify({
      type: 'track',
      track: track,
      sourceDeck: deck
    }));
  }, [deck]);

  const handleDragEnd = useCallback(() => {
    setDraggedTrack(null);
    setDropTarget(null);
  }, []);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((targetTrack, event) => {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData('text/plain'));
    
    if (data.type === 'track' && data.track !== targetTrack) {
      // Handle track reordering or playlist creation
      console.log('Track dropped:', data.track, 'onto:', targetTrack);
    }
    
    setDropTarget(null);
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const contextMenuActions = [
    {
      label: `Load to Deck ${deck}`,
      icon: '▶️',
      action: (track) => onTrackLoad(track)
    },
    {
      label: 'Preview',
      icon: '👂',
      action: (track) => onTrackPreview(track)
    },
    {
      label: 'Add to Playlist',
      icon: '➕',
      action: (track) => console.log('Add to playlist:', track)
    },
    {
      label: 'Track Info',
      icon: 'ℹ️',
      action: (track) => console.log('Show info:', track)
    },
    {
      label: 'Locate File',
      icon: '📁',
      action: (track) => {
        if (window.api && window.api.showItemInFolder) {
          window.api.showItemInFolder(track.filePath);
        }
      }
    }
  ];

  return (
    <div className="track-list bg-gray-900 p-3 rounded-lg h-full flex flex-col">
      <div className="list-header text-xs text-white mb-3 text-center font-bold">
        LIBRARY {deck} - TRACK LIST
      </div>

      {isLoading ? (
        <div className="loading-container flex-1 flex items-center justify-center">
          <div className="loading-spinner text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className="mt-2 text-xs">Loading tracks...</div>
          </div>
        </div>
      ) : tracks.length === 0 ? (
        <div className="empty-container flex-1 flex items-center justify-center">
          <div className="empty-state text-center text-gray-400">
            <div className="text-2xl mb-2">📁</div>
            <div className="text-sm">No tracks found</div>
            <div className="text-xs mt-1">Try adjusting your search or filters</div>
          </div>
        </div>
      ) : (
        <div 
          ref={listRef}
          className="track-items flex-1 overflow-y-auto space-y-1"
        >
          {tracks.map((track, index) => (
            <div
              key={track.filePath || index}
              draggable
              onClick={(e) => handleTrackClick(track, e)}
              onDoubleClick={(e) => handleTrackDoubleClick(track, e)}
              onContextMenu={(e) => handleContextMenu(track, e)}
              onDragStart={(e) => handleDragStart(track, e)}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(track, e)}
              className={`track-item p-2 rounded cursor-pointer transition-all duration-150 ${
                selectedTrack === track 
                  ? 'bg-blue-900 border border-blue-600' 
                  : 'bg-gray-800 hover:bg-gray-700'
              } ${
                draggedTrack === track ? 'opacity-50' : ''
              } ${
                dropTarget === track ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="track-content flex items-center space-x-3">
                {/* Track Number */}
                <div className="track-number text-xs text-gray-400 w-6 text-right">
                  {index + 1}
                </div>

                {/* Quality Icon */}
                <div className="quality-icon text-sm">
                  {getAudioQualityIcon(track)}
                </div>

                {/* Track Info */}
                <div className="track-info flex-1 min-w-0">
                  <div className="track-title text-sm text-white font-medium truncate">
                    {track.title || 'Unknown Title'}
                  </div>
                  <div className="track-subtitle text-xs text-gray-400 truncate">
                    {track.artist || 'Unknown Artist'}
                    {track.album && ` • ${track.album}`}
                  </div>
                </div>

                {/* Track Details */}
                <div className="track-details flex items-center space-x-4 text-xs text-gray-400">
                  {track.genre && (
                    <div className="genre bg-gray-700 px-2 py-1 rounded">
                      {track.genre}
                    </div>
                  )}
                  
                  {track.bpm && (
                    <div className="bpm">
                      {track.bpm} BPM
                    </div>
                  )}
                  
                  <div className="duration">
                    {formatTime(track.duration)}
                  </div>
                  
                  <div className="file-size">
                    {formatFileSize(track.fileSize)}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="track-actions flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackPreview(track);
                    }}
                    className="action-btn p-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                    title="Preview"
                  >
                    👂
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTrackLoad(track);
                    }}
                    className="action-btn p-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                    title={`Load to Deck ${deck}`}
                  >
                    ▶️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="context-menu fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y
          }}
        >
          {contextMenuActions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.action(contextMenu.track);
                setContextMenu(null);
              }}
              className="context-menu-item w-full text-left px-3 py-2 text-xs text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar mt-3 pt-2 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>
            {tracks.length.toLocaleString()} tracks
          </span>
          <span>
            {selectedTrack ? (
              <>Selected: {selectedTrack.title || 'Unknown'}</>
            ) : (
              'Double-click to load • Right-click for options'
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrackList;