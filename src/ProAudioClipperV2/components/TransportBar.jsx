/* ───────────────────────────────────────────────────────
   TransportBar – V2 playback controls row
   ─────────────────────────────────────────────────────── */
import React from 'react';
import { formatTime } from '../math/timelineMath.js';

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export default function TransportBar({
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  playbackRate = 1,
  masterVolume = 0.8,
  onPlay,
  onStop,
  onSkipBack,
  onSkipForward,
  onSetRate,
  onSetVolume,
}) {
  return (
    <div className="v2-transport">
      {/* Playback buttons */}
      <div className="v2-transport__group">
        <button className="v2-transport__btn" onClick={onSkipBack} title="Skip Back">
          ⏮
        </button>
        <button
          className={`v2-transport__btn${isPlaying ? ' v2-transport__btn--playing' : ''}`}
          onClick={onPlay}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="v2-transport__btn" onClick={onStop} title="Stop">
          ⏹
        </button>
        <button className="v2-transport__btn" onClick={onSkipForward} title="Skip Forward">
          ⏭
        </button>
      </div>

      {/* Time display */}
      <div className="v2-transport__time">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>

      {/* Speed buttons */}
      <div className="v2-transport__speed-group">
        {SPEED_OPTIONS.map((spd) => (
          <button
            key={spd}
            className={`v2-transport__speed-btn${playbackRate === spd ? ' v2-transport__speed-btn--active' : ''}`}
            onClick={() => onSetRate?.(spd)}
          >
            {spd}x
          </button>
        ))}
      </div>

      <div className="v2-transport__spacer" />

      {/* Volume */}
      <div className="v2-transport__volume">
        <span>🔊</span>
        <input
          type="range"
          className="v2-transport__volume-slider"
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={(e) => onSetVolume?.(parseFloat(e.target.value))}
        />
        <span style={{ fontSize: 11, color: '#999', minWidth: 32 }}>
          {Math.round(masterVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
