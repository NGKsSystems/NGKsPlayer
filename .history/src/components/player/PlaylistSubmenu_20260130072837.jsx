import React from 'react';

/**
 * Playlist submenu for context menu
 */
export function PlaylistSubmenu({ 
  playlists,
  showNewPlaylistInput,
  setShowNewPlaylistInput,
  newPlaylistName,
  setNewPlaylistName,
  onCreatePlaylist,
  onAddToPlaylist,
  onMouseLeave
}) {
  return (
    <div
      className="absolute left-full top-0 ml-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto"
      onMouseLeave={onMouseLeave}
    >
      <div className="py-1">
        {/* New Playlist */}
        {!showNewPlaylistInput ? (
          <button
            onClick={() => setShowNewPlaylistInput(true)}
            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2 font-semibold text-green-400"
          >
            <span>➕</span> New Playlist
          </button>
        ) : (
          <div className="px-4 py-2">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreatePlaylist();
                } else if (e.key === 'Escape') {
                  setShowNewPlaylistInput(false);
                  setNewPlaylistName('');
                }
              }}
              placeholder="Playlist name..."
              autoFocus
              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={onCreatePlaylist}
                className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-1 text-xs"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowNewPlaylistInput(false);
                  setNewPlaylistName('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Existing Playlists */}
        {playlists.length > 0 && (
          <>
            <div className="border-t border-gray-700 my-1"></div>
            {playlists.map(playlist => (
              <button
                key={playlist.id}
                onClick={() => onAddToPlaylist(playlist.id)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
              >
                {playlist.name}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
