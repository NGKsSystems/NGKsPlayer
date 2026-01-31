import React from 'react';

/**
 * Single track item component for the track list
 */
export function TrackItem({ track, actualIndex, currentIndex, onPlay, onContextMenu, formatTime }) {
  const isCurrentTrack = currentIndex === actualIndex;

  return (
    <div
      onClick={() => onPlay(track, actualIndex)}
      onContextMenu={(e) => onContextMenu(e, track)}
      className={`p-3 border border-gray-700 rounded cursor-pointer hover:bg-gray-700 transition ${
        isCurrentTrack ? 'bg-blue-900 border-blue-600' : 'bg-gray-800'
      }`}
    >
      {/* Single Row Layout */}
      <div className="flex items-center gap-3">
        {/* Album Art */}
        {track.albumArt && (
          <img
            src={track.albumArt}
            alt="Album Art"
            className="w-10 h-10 rounded object-cover flex-shrink-0"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
        
        {/* Left Side: File Name, Album, Genre in aligned columns */}
        <div className="flex-1 flex items-center min-w-0">
          {/* File Name - Fixed width column with scroll on hover */}
          <div 
            className="font-medium text-white overflow-hidden relative" 
            style={{ width: '350px', minWidth: '350px' }}
          >
            <div 
              className="transition-transform duration-1000 ease-in-out whitespace-nowrap"
              style={{
                transform: 'translateX(0)',
                width: 'max-content'
              }}
              onMouseEnter={(e) => {
                const element = e.target;
                const container = element.parentElement;
                const scrollDistance = element.offsetWidth - container.offsetWidth;
                if (scrollDistance > 0) {
                  element.style.transform = `translateX(-${scrollDistance + 20}px)`;
                }
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateX(0)';
              }}
            >
              {track.title || 'Unknown Title'}
            </div>
          </div>
          
          {/* Album - Fixed width column */}
          <div className="text-sm text-gray-300 truncate" style={{ width: '300px', minWidth: '300px' }}>
            {track.album ? `Album: ${track.album}` : 'Album: Unknown'}
          </div>
          
          {/* Genre - Fixed width column */}
          <div className="text-sm text-gray-400 truncate" style={{ width: '120px', minWidth: '120px' }}>
            {track.genre || 'Unknown'}
          </div>
        </div>
        
        {/* Right Side: Metadata badges */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {track.hasPlaybackError === 1 && (
            <div 
              className="text-xs text-red-200 bg-red-900 px-2 py-1 rounded border border-red-600"
              title="This track has playback errors and may need to be redownloaded"
            >
              ⚠️ Corrupted
            </div>
          )}
          {track.duration && (
            <div className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {formatTime(track.duration)}
            </div>
          )}
          {track.bpm && (
            <div className="text-xs text-blue-200 bg-blue-900 px-2 py-1 rounded border border-blue-600">
              ♩ {track.bpm}
            </div>
          )}
          {track.key && (
            <div className="text-xs text-green-200 bg-green-900 px-2 py-1 rounded border border-green-600">
              {track.key}{track.mode?.charAt(0) || ''}
            </div>
          )}
          {track.energy !== null && track.energy !== undefined && (
            <div className="text-xs text-orange-200 bg-orange-900 px-2 py-1 rounded border border-orange-600">
              ⚡ {Math.round(track.energy)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
