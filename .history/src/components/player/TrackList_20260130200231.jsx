import React from 'react';
import { TrackItem } from './TrackItem';

/**
 * Scrollable track list component with search and sort controls
 */
export function TrackList({ 
  tracks,
  filteredTracks, 
  currentIndex, 
  onPlay, 
  onContextMenu, 
  formatTime,
  searchQuery,
  setSearchQuery,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  onRefresh
}) {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Search Bar - Sticky */}
      <div className="sticky top-0 z-10 bg-gray-900 px-4 py-3 border-b border-gray-700">
        {/* Search and Sort on single row */}
        <div className="flex gap-3 items-center">
          <input
            type="text"
            placeholder="🔍 Search tracks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          
          <span className="text-xs text-gray-400 whitespace-nowrap">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="bpm">BPM</option>
            <option value="duration">Duration</option>
            <option value="dateAdded">Date Added</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm flex items-center gap-1 whitespace-nowrap"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
          </button>
        </div>
      </div>

      {/* Scrollable Track List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
        <h3 className="text-md font-semibold mb-3 mt-3">
          Track List ({filteredTracks.length}{searchQuery && ` of ${tracks.length}`} tracks)
        </h3>
        {filteredTracks.length > 0 ? (
          <div className="space-y-2">
            {filteredTracks.map((track, index) => {
              const actualIndex = tracks.indexOf(track);
              return (
                <TrackItem
                  key={track.id || index}
                  track={track}
                  actualIndex={actualIndex}
                  currentIndex={currentIndex}
                  onPlay={onPlay}
                  onContextMenu={onContextMenu}
                  formatTime={formatTime}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400">
            {searchQuery ? 'No tracks match your search' : 'No tracks found. Please scan your music library.'}
          </p>
        )}
      </div>
    </div>
  );
}
