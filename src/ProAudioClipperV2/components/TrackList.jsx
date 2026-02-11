/* ───────────────────────────────────────────────────────
   TrackList – V2 scrollable list of TrackRows
   ─────────────────────────────────────────────────────── */
import React from 'react';
import TrackRow from './TrackRow.jsx';

export default function TrackList({
  tracks,
  activeTrackId,
  zoom,
  viewportStart,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
}) {
  if (!tracks || tracks.length === 0) {
    return (
      <div className="v2-empty-state">
        <div className="v2-empty-state__icon">🎵</div>
        <div className="v2-empty-state__text">
          No tracks yet — click <strong>+ Track</strong> above or drop audio files here
        </div>
      </div>
    );
  }

  return (
    <>
      {tracks.map((track, i) => (
        <TrackRow
          key={track.id}
          track={track}
          index={i}
          isActive={track.id === activeTrackId}
          zoom={zoom}
          viewportStart={viewportStart}
          onSelectTrack={onSelectTrack}
          onToggleMute={onToggleMute}
          onToggleSolo={onToggleSolo}
        />
      ))}
    </>
  );
}
