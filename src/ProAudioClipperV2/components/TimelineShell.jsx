/* ───────────────────────────────────────────────────────
   TimelineShell – V2 combined ruler + track area
   Two-column layout: headers (left, orange border) | lanes (right)
   Matches the V1 visual structure from screenshots.
   ─────────────────────────────────────────────────────── */
import React, { useRef, useCallback } from 'react';
import TimelineRuler from './TimelineRuler.jsx';
import TrackHeaderCell from './TrackHeaderCell.jsx';
import TrackLaneCell from './TrackLaneCell.jsx';
import { HEADER_WIDTH, TRACK_HEIGHT, COLORS } from '../math/layoutConstants.js';
import { zoomIn, zoomOut, timeToPx } from '../math/timelineMath.js';
import { DEFAULT_ZOOM } from '../math/layoutConstants.js';

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
  onPlayTrack,
  soloPlayingTrackId,
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
      {/* ── Timeline toolbar strip ─────────────────────── */}
      <div className="v2-timeline-toolbar">
        <span className="v2-timeline-toolbar__label">🎵 Professional Multi-Track Timeline</span>

        <button className="v2-timeline-toolbar__btn--add" onClick={onAddTrack} title="Add Audio Track">
          + Track
        </button>

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

        {/* Zoom controls */}
        <div className="v2-zoom-group">
          <button className="v2-zoom-group__btn" onClick={handleZoomOut} title="Zoom Out">−</button>
          <span className="v2-zoom-group__label">{Math.round(zoom * (100 / DEFAULT_ZOOM))}%</span>
          <button className="v2-zoom-group__btn" onClick={handleZoomIn} title="Zoom In">+</button>
        </div>

        <div className="v2-toolbar__sep" />

        {/* Precision */}
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
          <input type="checkbox" defaultChecked style={{ accentColor: '#00d4ff' }} />
          Snap
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
          <input type="checkbox" style={{ accentColor: '#00d4ff' }} />
          Grid
        </label>
        <select defaultValue="0.1" style={{
          padding: '3px 6px', background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4,
          color: '#ccc', fontSize: 12
        }}>
          <option value="0.01">10ms</option>
          <option value="0.1">100ms</option>
          <option value="1">1s</option>
          <option value="5">5s</option>
        </select>

        <div className="v2-timeline-toolbar__spacer" />

        {/* Stats */}
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
          {tracks.length}T &middot; {(currentTime || 0).toFixed(1)}s
        </span>
      </div>

      {/* ── Timeline body: two-column split ────────────── */}
      <div className="v2-timeline-body">

        {/* ── Ruler row ────────────────────────────────── */}
        <div className="v2-ruler-row">
          <div className="v2-ruler-header">TIMELINE RULER</div>
          <div className="v2-ruler-lane" ref={laneRef}>
            <TimelineRuler
              viewportStart={viewportStart}
              viewportWidth={bodyWidth}
              zoom={zoom}
            />
          </div>
        </div>

        {/* ── Track area: headers left | lanes right ───── */}
        <div className="v2-track-area">
          {/* Left column: track headers */}
          <div className="v2-track-headers">
            <div className="v2-track-headers__gradient" />
            <div className="v2-track-headers__content">
              {tracks.length === 0 ? (
                <div className="v2-header-empty">
                  No tracks yet.<br />Click "+ Track" to start!
                </div>
              ) : (
                tracks.map((track, i) => (
                  <TrackHeaderCell
                    key={track.id}
                    track={track}
                    isActive={track.id === activeTrackId}
                    isTrackPlaying={soloPlayingTrackId === track.id}
                    onSelect={onSelectTrack}
                    onPlayTrack={onPlayTrack}
                    onToggleMute={onToggleMute}
                    onToggleSolo={onToggleSolo}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right column: track lanes / timeline content */}
          <div className="v2-track-lanes">
            {tracks.length === 0 ? (
              <div className="v2-lane-empty">
                <div className="v2-lane-empty__icon">🎵</div>
                <div>Timeline is ready for audio clips!</div>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                {/* Playhead */}
                {currentTime > 0 && (
                  <div
                    className="v2-playhead"
                    style={{ left: `${timeToPx(currentTime, zoom)}px` }}
                  />
                )}
                {tracks.map((track, i) => {
                  const isActive = track.id === activeTrackId;
                  return (
                    <div
                      key={track.id}
                      className="v2-track-lane-row"
                      style={{
                        height: TRACK_HEIGHT,
                        background: isActive
                          ? COLORS.accentDim
                          : (i % 2 === 0 ? '#2c2c2c' : '#333'),
                        borderBottom: '1px solid #444',
                      }}
                      onClick={() => onSelectTrack?.(track.id)}
                    >
                      <TrackLaneCell
                        track={track}
                        zoom={zoom}
                        viewportStart={viewportStart}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer status ──────────────────────────────── */}
      <div className="v2-timeline-footer">
        <span>
          Zoom: {(zoom * (1 / DEFAULT_ZOOM)).toFixed(1)}x | Viewport: {(viewportStart || 0).toFixed(1)}s | Duration: {(duration || 0).toFixed(1)}s
        </span>
        <span>Professional Multi-Track Timeline &bull; {tracks.length} tracks loaded</span>
      </div>
    </div>
  );
}
