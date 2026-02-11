/* ───────────────────────────────────────────────────────
   TrackLaneCell – V2 right column for a single track
   Will host clip blocks + waveform canvas in later phases.
   ─────────────────────────────────────────────────────── */
import React from 'react';

export default function TrackLaneCell({ track, zoom, viewportStart }) {
  // PHASE 3+ will render <Clip> and <WaveformCanvas> here
  return (
    <div className="v2-track-lane">
      {(!track.clips || track.clips.length === 0) && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          fontSize: 11,
          pointerEvents: 'none',
        }}>
          Drop audio here
        </div>
      )}
    </div>
  );
}
