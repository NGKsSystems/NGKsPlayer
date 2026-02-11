/* ───────────────────────────────────────────────────────
   TrackHeaderCell – V2 left column for a single track
   Shows name + mute/solo/volume mini-controls.
   ─────────────────────────────────────────────────────── */
import React from 'react';

export default function TrackHeaderCell({
  track,
  isActive,
  onSelect,
  onToggleMute,
  onToggleSolo,
}) {
  return (
    <div
      className={`v2-track-header${isActive ? ' v2-track-header--active' : ''}`}
      onClick={() => onSelect?.(track.id)}
      style={{ cursor: 'pointer' }}
    >
      <span className="v2-track-header__name">{track.name || `Track ${track.id}`}</span>
      <div className="v2-track-header__controls">
        <button
          className={`v2-track-ctrl-btn${track.muted ? ' v2-track-ctrl-btn--muted' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleMute?.(track.id); }}
          title="Mute"
        >
          M
        </button>
        <button
          className={`v2-track-ctrl-btn${track.solo ? ' v2-track-ctrl-btn--solo' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleSolo?.(track.id); }}
          title="Solo"
        >
          S
        </button>
      </div>
    </div>
  );
}
