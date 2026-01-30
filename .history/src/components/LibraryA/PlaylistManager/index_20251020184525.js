import React, { useState, useCallback, useEffect } from 'react';

const PlaylistManager = ({
  playlists = [],
  currentPlaylist = null,
  onPlaylistCreate = () => {},
  onPlaylistLoad = () => {},
  onPlaylistDelete = () => {},
  onPlaylistRename = () => {},
  onTrackAdd = () => {},
  onTrackRemove = () => {},
  selectedTrack = null,
  deck = 'A'
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [renameValue, setRenameValue] = useState('');

  const handleCreatePlaylist = useCallback(() => {
    if (newPlaylistName.trim()) {
      onPlaylistCreate(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateDialog(false);
    }
  }, [newPlaylistName, onPlaylistCreate]);

  const handleRenamePlaylist = useCallback((playlist) => {
    if (renameValue.trim() && renameValue !== playlist.name) {
      onPlaylistRename(playlist, renameValue.trim());
    }
    setShowRenameDialog(null);
    setRenameValue('');
  }, [renameValue, onPlaylistRename]);

  const handleDeletePlaylist = useCallback((playlist) => {
    if (window.confirm(`Delete playlist "${playlist.name}"?`)) {
      onPlaylistDelete(playlist);
    }
  }, [onPlaylistDelete]);

  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlaylistStats = (playlist) => {
    if (!playlist.tracks || playlist.tracks.length === 0) {
      return { count: 0, duration: 0 };
    }
    
    const count = playlist.tracks.length;
    const duration = playlist.tracks.reduce((total, track) => total + (track.duration || 0), 0);
    
    return { count, duration };
  };

  return (
    <div className="playlist-manager bg-gray-800 p-3 rounded-lg h-full flex flex-col">
      <div className="manager-header text-xs text-white mb-3 text-center font-bold">
        LIBRARY {deck} - PLAYLISTS
      </div>

      {/* Create Playlist Button */}
      <div className="create-section mb-3">
        <button
          onClick={() => setShowCreateDialog(true)}
          className="create-btn w-full p-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors flex items-center justify-center space-x-2"
        >
          <span>➕</span>
          <span>New Playlist</span>
        </button>
      </div>

      {/* Playlist List */}
      <div className="playlist-list flex-1 overflow-y-auto space-y-2">
        {playlists.length === 0 ? (
          <div className="empty-state text-center text-gray-400 py-8">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-sm">No playlists yet</div>
            <div className="text-xs mt-1">Create your first playlist to get started</div>
          </div>
        ) : (
          playlists.map((playlist, index) => {
            const stats = getPlaylistStats(playlist);
            const isActive = currentPlaylist?.id === playlist.id;
            
            return (
              <div
                key={playlist.id || index}
                className={`playlist-item p-3 rounded cursor-pointer transition-all ${
                  isActive 
                    ? 'bg-blue-900 border border-blue-600' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                onClick={() => onPlaylistLoad(playlist)}
              >
                <div className="playlist-header flex items-center justify-between mb-2">
                  <div className="playlist-info flex-1">
                    {showRenameDialog === playlist.id ? (
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => handleRenamePlaylist(playlist)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleRenamePlaylist(playlist);
                          } else if (e.key === 'Escape') {
                            setShowRenameDialog(null);
                            setRenameValue('');
                          }
                        }}
                        className="w-full p-1 bg-gray-600 text-white text-sm rounded"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="playlist-name text-sm text-white font-medium truncate"
                        onDoubleClick={() => {
                          setShowRenameDialog(playlist.id);
                          setRenameValue(playlist.name);
                        }}
                      >
                        {playlist.name}
                        {isActive && <span className="ml-2 text-xs">▶</span>}
                      </div>
                    )}
                  </div>
                  
                  <div className="playlist-actions flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRenameDialog(playlist.id);
                        setRenameValue(playlist.name);
                      }}
                      className="action-btn p-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded"
                      title="Rename"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaylist(playlist);
                      }}
                      className="action-btn p-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className="playlist-stats flex justify-between text-xs text-gray-400">
                  <span>{stats.count} tracks</span>
                  <span>{formatDuration(stats.duration)}</span>
                </div>

                {/* Recent Tracks Preview */}
                {playlist.tracks && playlist.tracks.length > 0 && (
                  <div className="recent-tracks mt-2 text-xs text-gray-500">
                    <div className="truncate">
                      Recent: {playlist.tracks.slice(-3).map(t => t.title || 'Unknown').join(', ')}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Actions */}
      {selectedTrack && (
        <div className="quick-actions mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-2">
            Add "{selectedTrack.title || 'Unknown'}" to:
          </div>
          <div className="action-buttons space-y-1">
            {playlists.slice(0, 3).map(playlist => (
              <button
                key={playlist.id}
                onClick={() => onTrackAdd(playlist, selectedTrack)}
                className="playlist-add-btn w-full p-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded text-left transition-colors"
              >
                ➕ {playlist.name}
              </button>
            ))}
            {playlists.length > 3 && (
              <div className="text-xs text-gray-500 text-center">
                ... and {playlists.length - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="create-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="dialog-content bg-gray-800 p-4 rounded-lg border border-gray-600 w-80">
            <div className="dialog-header text-white font-medium mb-3">
              Create New Playlist
            </div>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Enter playlist name..."
              className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 mb-3"
              maxLength={50}
              autoFocus
            />
            <div className="dialog-actions flex space-x-2">
              <button
                onClick={handleCreatePlaylist}
                disabled={!newPlaylistName.trim()}
                className="flex-1 p-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white text-sm rounded"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 p-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="status-bar mt-3 pt-2 border-t border-gray-700 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>{playlists.length} playlists</span>
          <span>
            {currentPlaylist 
              ? `Active: ${currentPlaylist.name}` 
              : 'No active playlist'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlaylistManager;