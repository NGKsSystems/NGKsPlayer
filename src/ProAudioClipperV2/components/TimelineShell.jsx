/* ───────────────────────────────────────────────────────
   TimelineShell – V2 combined ruler + track area
   Composes: TimelineRuler, TrackList, toolbar, zoom
   ─────────────────────────────────────────────────────── */
import React, { useRef, useCallback } from 'react';
import TimelineRuler from './TimelineRuler.jsx';
import TrackList from './TrackList.jsx';
import { HEADER_WIDTH, RULER_HEIGHT, DEFAULT_ZOOM } from '../math/layoutConstants.js';
import { zoomIn, zoomOut, clampZoom } from '../math/timelineMath.js';

export default function TimelineShell({
  tracks,
  activeTrackId,
  zoom = DEFAULT_ZOOM,
  viewportStart = 0,
  selectedTool = 'selection',
  currentTime = 0,
  duration = 0,
  onZoomChange,
  onToolChange,
  onAddTrack,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
  onTimelineClick,
}) {
  const laneRef = useRef(null);
  const bodyWidth = laneRef.current?.clientWidth || 800;

  const handleZoomIn  = useCallback(() => onZoomChange?.(zoomIn(zoom)), [zoom, onZoomChange]);
  const handleZoomOut = useCallback(() => onZoomChange?.(zoomOut(zoom)), [zoom, onZoomChange]);

  return (
    <div className="v2-timeline-area">
      {/* Timeline toolbar strip */}
      <div className="v2-timeline-toolbar">
        <span className="v2-timeline-toolbar__label">🎵 Multi-Track Timeline</span>

        <button className="v2-timeline-toolbar__btn" onClick={onAddTrack} title="Add Audio Track">
          + Track
        </button>

        <div className="v2-toolbar__sep" />

        {/* Tool select */}
        <button
          className={`v2-timeline-toolbar__tool-btn${selectedTool === 'selection' ? ' v2-timeline-toolbar__tool-btn--active' : ''}`}
          onClick={() => onToolChange?.('selection')}
          title="Selection Tool (V)"
        >
          ☞ Select
        </button>
        <button
          className={`v2-timeline-toolbar__tool-btn${selectedTool === 'razor' ? ' v2-timeline-toolbar__tool-btn--active' : ''}`}
          onClick={() => onToolChange?.('razor')}
          title="Razor Tool (C)"
        >
          ✂ Cut
        </button>

        <div className="v2-toolbar__sep" />

        {/* Precision */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: '#00d4ff' }} />
          Snap
        </label>

        <div className="v2-timeline-toolbar__spacer" />

        {/* Zoom controls */}
        <div className="v2-zoom-group">
          <button className="v2-zoom-group__btn" onClick={handleZoomOut} title="Zoom Out">−</button>
          <span className="v2-zoom-group__label">{Math.round(zoom)}px/s</span>
          <button className="v2-zoom-group__btn" onClick={handleZoomIn} title="Zoom In">+</button>
        </div>

        {/* Stats */}
        <span style={{ fontSize: 11, color: '#666', marginLeft: 8 }}>
          {tracks.length}T &middot; {(currentTime || 0).toFixed(1)}s / {(duration || 0).toFixed(1)}s
        </span>
      </div>

      {/* Timeline body: ruler row + scrollable tracks */}
      <div className="v2-timeline-body">
        {/* Ruler row */}
        <div className="v2-ruler-row">
          <div className="v2-ruler-header">TIMELINE</div>
          <div className="v2-ruler-lane" ref={laneRef}>
            <TimelineRuler
              viewportStart={viewportStart}
              viewportWidth={bodyWidth}
              zoom={zoom}
            />
          </div>
        </div>

        {/* Scrollable track rows */}
        <div className="v2-track-scroll">
          <TrackList
            tracks={tracks}
            activeTrackId={activeTrackId}
            zoom={zoom}
            viewportStart={viewportStart}
            onSelectTrack={onSelectTrack}
            onToggleMute={onToggleMute}
            onToggleSolo={onToggleSolo}
          />
        </div>
      </div>
    </div>
  );
}
