/* ───────────────────────────────────────────────────────
   TrackLaneCell – V2 right column for a single track
   Renders clip blocks with waveform canvas overlays.
   ─────────────────────────────────────────────────────── */
import React from 'react';
import ClipWaveform from './ClipWaveform.jsx';
import { timeToPx } from '../math/timelineMath.js';
import { TRACK_HEIGHT } from '../math/layoutConstants.js';

const CLIP_PADDING = 2; // top/bottom padding inside lane row

export default function TrackLaneCell({ track, zoom, viewportStart }) {
  const clipHeight = TRACK_HEIGHT - CLIP_PADDING * 2;

  return (
    <div className="v2-track-lane">
      {(!track.clips || track.clips.length === 0) ? (
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
      ) : (
        track.clips.map((clip) => {
          const leftPx = timeToPx(clip.startTime, zoom);
          const widthPx = Math.max(4, timeToPx(clip.duration, zoom));

          return (
            <div
              key={clip.id}
              className="v2-clip"
              style={{
                position: 'absolute',
                left: `${leftPx}px`,
                top: `${CLIP_PADDING}px`,
                width: `${widthPx}px`,
                height: `${clipHeight}px`,
              }}
              title={`${clip.name || 'Clip'} — ${(clip.duration || 0).toFixed(1)}s`}
            >
              {/* Waveform canvas */}
              {clip.audioBuffer && (
                <ClipWaveform
                  audioBuffer={clip.audioBuffer}
                  width={widthPx}
                  height={clipHeight}
                  color="rgba(0, 212, 255, 0.55)"
                  audioOffset={clip.audioOffset || 0}
                  clipDuration={clip.duration}
                />
              )}

              {/* Clip name label */}
              <span className="v2-clip__name">{clip.name || 'Clip'}</span>

              {/* Duration label */}
              <span className="v2-clip__duration">{(clip.duration || 0).toFixed(1)}s</span>
            </div>
          );
        })
      )}
    </div>
  );
}
