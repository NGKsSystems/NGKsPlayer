import React from 'react';

/**
 * Player controls component (playback buttons, progress, volume)
 */
export function PlayerControls({
  isPlaying,
  position,
  duration,
  volume,
  playMode,
  tracks,
  onTogglePlayPause,
  onPrevTrack,
  onNextTrack,
  onSeek,
  onVolumeChange,
  onPlayModeChange,
  formatTime
}) {
  return (
    <div className="p-4 bg-gray-800 border-b border-gray-700">
      {/* Progress Bar */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={position}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-base text-gray-400 mt-1 font-semibold">
          <span>{formatTime(position)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Combined Playback Controls and Mode Buttons */}
      <div className="flex items-center justify-between gap-4 mb-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevTrack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-2xl"
            disabled={tracks.length === 0}
          >
            ⏮ Previous
          </button>
          <button
            onClick={onTogglePlayPause}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold text-2xl"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={onNextTrack}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold text-2xl"
            disabled={tracks.length === 0}
          >
            Next ⏭
          </button>
        </div>

        {/* Playback Mode Controls */}
        <div className="flex items-center gap-2">
          <span className="text-base text-gray-400 font-semibold">Mode:</span>
          <button
            className={`px-3 py-2 rounded text-3xl ${playMode === 'stop' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            onClick={() => onPlayModeChange('stop')}
            title="Stop After Current (Play once)"
          >
            ⏹️
          </button>
          <button
            className={`px-3 py-2 rounded text-3xl ${playMode === 'inOrder' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            onClick={() => onPlayModeChange('inOrder')}
            title="In Order"
          >
            🔄
          </button>
          <button
            className={`px-3 py-2 rounded text-3xl ${playMode === 'repeatAll' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            onClick={() => onPlayModeChange('repeatAll')}
            title="Repeat All"
          >
            🔁
          </button>
          <button
            className={`px-3 py-2 rounded text-3xl ${playMode === 'shuffle' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            onClick={() => onPlayModeChange('shuffle')}
            title="Shuffle"
          >
            🔀
          </button>
          <button
            className={`px-3 py-2 rounded text-3xl ${playMode === 'randomNoRepeat' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
            onClick={() => onPlayModeChange('randomNoRepeat')}
            title="Random (No Repeat)"
          >
            🎲
          </button>
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-4">
        <span className="text-base font-semibold">🔊 Volume:</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="text-base font-semibold w-12">{Math.round(volume * 100)}%</span>
      </div>
    </div>
  );
}
