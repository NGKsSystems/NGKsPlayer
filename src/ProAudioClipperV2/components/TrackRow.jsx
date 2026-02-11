/* ───────────────────────────────────────────────────────
   TrackRow – V2 single track render row
   Combines TrackHeaderCell + TrackLaneCell in one flex row.
   Single render loop – one component per track.
   ─────────────────────────────────────────────────────── */
import React from 'react';
import TrackHeaderCell from './TrackHeaderCell.jsx';
import TrackLaneCell from './TrackLaneCell.jsx';
import { TRACK_HEIGHT, COLORS } from '../math/layoutConstants.js';

export default function TrackRow({
  track,
  index,
  isActive,
  zoom,
  viewportStart,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
}) {
  const bgColor = isActive
    ? COLORS.accentDim
    : (index % 2 === 0 ? COLORS.trackEven : COLORS.trackOdd);

  return (
    <div
      className={`v2-track-row${isActive ? ' v2-track-row--active' : ''}`}
      style={{ height: TRACK_HEIGHT, background: bgColor }}
    >
      <TrackHeaderCell
        track={track}
        isActive={isActive}
        onSelect={onSelectTrack}
        onToggleMute={onToggleMute}
        onToggleSolo={onToggleSolo}
      />
      <TrackLaneCell
        track={track}
        zoom={zoom}
        viewportStart={viewportStart}
      />
    </div>
  );
}
