import React from 'react';
import { PlaylistSubmenu } from './PlaylistSubmenu';

/**
 * Context menu component with all track actions
 */
export function ContextMenu({
  contextMenu,
  setContextMenu,
  tracks,
  playlists,
  showPlaylistSubmenu,
  setShowPlaylistSubmenu,
  showNewPlaylistInput,
  setShowNewPlaylistInput,
  newPlaylistName,
  setNewPlaylistName,
  showRenameInput,
  setShowRenameInput,
  newFileName,
  setNewFileName,
  renameInputRef,
  onPlay,
  onAddToPlaylist,
  onCreatePlaylist,
  onShowInExplorer,
  onCopyFilePath,
  onAnalyze,
  onRename,
  onStartRename,
  onRemoveFromLibrary,
  onDeleteFile
}) {
  if (!contextMenu) return null;

  const handleCreatePlaylist = async () => {
    const success = await onCreatePlaylist(contextMenu.track);
    if (success) {
      setContextMenu(null);
      setShowPlaylistSubmenu(false);
      setShowNewPlaylistInput(false);
      setNewPlaylistName('');
    }
  };

  const handleAddToPlaylist = async (playlistId) => {
    const success = await onAddToPlaylist(contextMenu.track, playlistId);
    if (success) {
      setContextMenu(null);
      setShowPlaylistSubmenu(false);
    }
  };

  return (
    <div
      className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[200px]"
      style={{ top: contextMenu.y, left: contextMenu.x }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="py-1">
        {/* Track Info Header */}
        <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700 font-semibold">
          {contextMenu.track.title}
        </div>
        
        {/* Play Now */}
        <button
          onClick={() => {
            const trackIndex = tracks.findIndex(t => t.id === contextMenu.track.id);
            if (trackIndex >= 0) onPlay(contextMenu.track, trackIndex);
            setContextMenu(null);
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
        >
          <span>▶️</span> Play Now
        </button>
        
        {/* Add to Playlist */}
        <div className="border-t border-gray-700 mt-1 pt-1 relative">
          <button
            onMouseEnter={() => setShowPlaylistSubmenu(true)}
            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span>💾</span> Add to Playlist
            </span>
            <span>▶</span>
          </button>
          
          {/* Playlist Submenu */}
          {showPlaylistSubmenu && (
            <PlaylistSubmenu
              playlists={playlists}
              showNewPlaylistInput={showNewPlaylistInput}
              setShowNewPlaylistInput={setShowNewPlaylistInput}
              newPlaylistName={newPlaylistName}
              setNewPlaylistName={setNewPlaylistName}
              onCreatePlaylist={handleCreatePlaylist}
              onAddToPlaylist={handleAddToPlaylist}
              onMouseLeave={() => setShowPlaylistSubmenu(false)}
            />
          )}
        </div>
        
        {/* Show in Explorer */}
        <div className="border-t border-gray-700 mt-1 pt-1">
          <button
            onClick={() => {
              onShowInExplorer(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
          >
            <span>📁</span> Show in File Explorer
          </button>
          
          {/* Copy File Path */}
          <button
            onClick={() => {
              onCopyFilePath(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
          >
            <span>📋</span> Copy File Path
          </button>
          
          {/* Analyze Track */}
          <button
            onClick={() => {
              onAnalyze(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
          >
            <span>🔍</span> Analyze BPM/Key
          </button>
          
          {/* Rename File */}
          {!showRenameInput ? (
            <button
              onClick={() => onStartRename(contextMenu.track)}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
            >
              <span>✏️</span> Rename File
            </button>
          ) : (
            <div className="px-4 py-2 border-t border-gray-700" onClick={(e) => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    console.log('Enter pressed, track:', contextMenu.track);
                    console.log('New filename:', newFileName);
                    onRename(contextMenu.track);
                    setContextMenu(null);
                    setShowRenameInput(false);
                    setNewFileName('');
                  } else if (e.key === 'Escape') {
                    setShowRenameInput(false);
                    setNewFileName('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                placeholder="New filename..."
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => {
                    console.log('Rename button clicked, track:', contextMenu.track);
                    console.log('New filename:', newFileName);
                    onRename(contextMenu.track);
                    setContextMenu(null);
                    setShowRenameInput(false);
                    setNewFileName('');
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs"
                >
                  Rename
                </button>
                <button
                  onClick={() => {
                    setShowRenameInput(false);
                    setNewFileName('');
                  }}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Dangerous Actions */}
        <div className="border-t border-gray-700 mt-1 pt-1">
          <button
            onClick={() => {
              onRemoveFromLibrary(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-orange-900 text-sm flex items-center gap-2 text-orange-400"
          >
            <span>🗑️</span> Remove from Library
          </button>
          
          <button
            onClick={() => {
              onDeleteFile(contextMenu.track);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 hover:bg-red-900 text-sm flex items-center gap-2 text-red-400"
          >
            <span>⚠️</span> Delete File Permanently
          </button>
        </div>
      </div>
    </div>
  );
}
