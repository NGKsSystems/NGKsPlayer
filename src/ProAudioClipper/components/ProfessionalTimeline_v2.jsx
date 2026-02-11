/**
 * NGKsSystems – NGKsPlayer
 *
 * Module: ProfessionalTimeline_v2.jsx
 * Purpose: Clean V2 rewrite of ProfessionalTimeline.
 *          Single playhead overlay, DaVinci-style ruler-anchored cap.
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 * - ONE playhead DOM element in ONE coordinate space
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useMemo, useCallback } from 'react';
import {
  timeToPixels,
  calculateTimelineWidth,
  generateTicks,
} from '../timeline/timelineMath.js';
import {
  HEADER_WIDTH,
  TRACK_HEIGHT,
  RULER_HEIGHT,
  BASE_PPS,
  pps,
  MIN_TIMELINE_SECONDS,
} from '../timeline/v2/layoutConstants.js';
import { useProfessionalTimelineController_v2 } from '../hooks/useProfessionalTimelineController_v2';
import TrackHeader from './TrackHeader';
import SimpleWaveform from './SimpleWaveform';
import './ProfessionalTimeline_v2.css';

/* ═══════════════════════════════════════════════════════════
   Sub-components (co-located, zero-dep, render-only)
   ═══════════════════════════════════════════════════════════ */

/** Ruler ticks — renders inside .ptv2-canvas, so shares coordinate space */
const Ruler_v2 = React.memo(({ duration, zoomLevel, onTimeChange }) => {
  const ticks = useMemo(() => {
    const majorInterval = Math.max(1, Math.floor(10 / zoomLevel));
    const minorInterval = Math.max(0.1, majorInterval / 10);
    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 100);
      return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };
    const toPixel = (t) => timeToPixels(t, BASE_PPS, zoomLevel);
    return generateTicks(duration, majorInterval, minorInterval, toPixel, fmt);
  }, [duration, zoomLevel]);

  const handleClick = useCallback(
    (e) => {
      if (!onTimeChange) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = x / pps(zoomLevel);
      onTimeChange(Math.max(0, Math.min(time, duration)));
    },
    [onTimeChange, zoomLevel, duration],
  );

  return (
    <div
      className="ptv2-ruler"
      style={{ width: '100%', cursor: 'crosshair' }}
      onClick={handleClick}
    >
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <div
            className={`ptv2-ruler__tick ${
              t.isMajor ? 'ptv2-ruler__tick--major' : 'ptv2-ruler__tick--minor'
            }`}
            style={{ left: t.position }}
          />
          {t.label && (
            <span className="ptv2-ruler__label" style={{ left: t.position }}>
              {t.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});
Ruler_v2.displayName = 'Ruler_v2';

/** Single playhead overlay — ONE element, ONE coordinate space */
const Playhead_v2 = React.memo(({ currentTime, zoomLevel }) => {
  const px = timeToPixels(currentTime || 0, BASE_PPS, zoomLevel);
  return (
    <div
      className="ptv2-playhead"
      style={{ transform: `translateX(${px}px)` }}
    >
      <div className="ptv2-playhead__cap" />
      <div className="ptv2-playhead__line" />
    </div>
  );
});
Playhead_v2.displayName = 'Playhead_v2';

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */

const ProfessionalTimeline_v2 = React.forwardRef(
  (
    {
      tracks = [],
      currentTime = 0,
      duration = 0,
      zoomLevel = 1,
      viewportStart = 0,
      selectedTool = 'selection',
      isPlaying = false,
      onTimelineClick,
      onClipSelect,
      onClipMove,
      onClipSplit,
      onClipDelete,
      onTrackSelect,
      onTrackMute,
      onTrackSolo,
      onTrackVolumeChange,
      onTrackPanChange,
      onTrackPlaybackRateChange,
      onTrackReverseToggle,
      onTrackNameChange,
      onAddTrack,
      onTrackDelete,
      onTrackMoveUp,
      onTrackMoveDown,
      onOpenEffects,
      onViewportChange,
      onTrackContextMenu,
      onToolChange,
      onZoomChange,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
      nextUndoDescription,
      nextRedoDescription,
      activeTrackId,
      markers = [],
      loopRegions = [],
      selectedMarkerId = null,
      selectedLoopId = null,
      activeLoopRegion = null,
      onAddMarker,
      onSelectMarker,
      onMoveMarker,
      onSelectLoopRegion,
      onAddLoopRegion,
      onResizeLoopRegion,
      ...rest
    },
    ref,
  ) => {
    const scrollRef = useRef(null);
    const PIXELS_PER_SECOND = pps(zoomLevel);

    /* controller hook */
    const {
      isDraggingClip,
      draggedClip,
      dragPreview,
      contextMenu,
      contextMenuTrack,
      contextMenuClip,
      handleScroll,
      handleClipMouseDown,
      handleTrackContextMenu,
      handleClipContextMenu,
      closeContextMenu,
      handleContextMenuAction,
      handleTimelineClick,
      handleClipClick,
    } = useProfessionalTimelineController_v2({
      scrollRef,
      tracks,
      duration,
      zoomLevel,
      viewportStart,
      selectedTool,
      PIXELS_PER_SECOND,
      TRACK_HEIGHT,
      onViewportChange,
      onTimelineClick,
      onClipSelect,
      onClipMove,
      onClipSplit,
      onClipDelete,
      onTrackSelect,
      onTrackMute,
      onTrackSolo,
      onTrackNameChange,
      onTrackDelete,
      onTrackMoveUp,
      onTrackMoveDown,
      onTrackContextMenu,
      onToolChange,
      onUndo,
      onRedo,
      canUndo,
      canRedo,
    });

    /* derived geometry */
    const timelineWidth = calculateTimelineWidth(
      Math.max(duration, MIN_TIMELINE_SECONDS),
      BASE_PPS,
      zoomLevel,
    );

    /* ─── render ──────────────────────────────────────── */
    return (
      <div ref={ref} className="ptv2-root">
        {/* ── Toolbar ───────────────────────────────────── */}
        <div className="ptv2-toolbar">
          <span className="ptv2-toolbar__title">
            🎵 Professional Multi-Track Timeline
          </span>
          <button
            className="ptv2-toolbar__btn ptv2-toolbar__btn--add"
            onClick={onAddTrack}
            title="Add Audio Track"
          >
            + Track
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Tools */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`ptv2-toolbar__btn ${selectedTool === 'selection' ? 'ptv2-toolbar__btn--active' : ''}`}
                onClick={() => onToolChange?.('selection')}
                title="Selection Tool (V)"
              >
                ☞ Select
              </button>
              <button
                className={`ptv2-toolbar__btn ${selectedTool === 'razor' ? 'ptv2-toolbar__btn--active' : ''}`}
                onClick={() => onToolChange?.('razor')}
                title="Razor Tool (C)"
              >
                ✂ Cut
              </button>
            </div>

            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }} />

            {/* Zoom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                className="ptv2-toolbar__btn"
                onClick={() => onZoomChange?.(Math.max(0.1, zoomLevel / 1.5))}
                title="Zoom Out"
                style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                −
              </button>
              <span style={{ fontSize: 14, color: '#aaa', minWidth: 40, textAlign: 'center', fontWeight: 500 }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                className="ptv2-toolbar__btn"
                onClick={() => onZoomChange?.(Math.min(20, zoomLevel * 1.5))}
                title="Zoom In"
                style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                +
              </button>
            </div>

            <div style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.15)' }} />

            {/* Snap / Grid */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#00d4ff', width: 16, height: 16 }} />
                Snap
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#aaa', cursor: 'pointer', fontSize: 14 }}>
                <input type="checkbox" style={{ accentColor: '#00d4ff', width: 16, height: 16 }} />
                Grid
              </label>
              <select
                defaultValue="0.1"
                style={{
                  padding: '5px 8px',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 4,
                  color: '#ccc',
                  fontSize: 14,
                }}
              >
                <option value="0.01">10ms</option>
                <option value="0.1">100ms</option>
                <option value="1">1s</option>
                <option value="5">5s</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            <span>{tracks.length}T</span>
            <span>{markers.length}M</span>
            <span>{loopRegions.length}L</span>
            <span>{(currentTime || 0).toFixed(1)}s</span>
          </div>
        </div>

        {/* ── Two-column viewport ───────────────────────── */}
        <div className="ptv2-viewport">
          {/* LEFT COLUMN — fixed track headers */}
          <div className="ptv2-headers">
            <div className="ptv2-headers__ruler-spacer">TIMELINE</div>
            <div className="ptv2-headers__tracks">
              {tracks.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6b35', fontSize: 14, textAlign: 'center', padding: 20, fontWeight: 600 }}>
                  No tracks yet.<br />Click "+ Track" to start!
                </div>
              ) : (
                tracks.map((track, idx) => (
                  <div key={`hdr-${track.id}`} style={{ height: TRACK_HEIGHT, position: 'relative' }}>
                    <TrackHeader
                      track={track}
                      isActive={track.id === activeTrackId}
                      onSelect={onTrackSelect}
                      onMute={onTrackMute}
                      onSolo={onTrackSolo}
                      onVolumeChange={onTrackVolumeChange}
                      onPanChange={onTrackPanChange}
                      onPlaybackRateChange={onTrackPlaybackRateChange}
                      onReverseToggle={onTrackReverseToggle}
                      onNameChange={onTrackNameChange}
                      onDelete={onTrackDelete}
                      onOpenEffects={onOpenEffects}
                      onMoveUp={() => onTrackMoveUp(idx)}
                      onMoveDown={() => onTrackMoveDown(idx)}
                      onContextMenu={(e) => onTrackContextMenu?.(e, track.id)}
                      canMoveUp={idx > 0}
                      canMoveDown={idx < tracks.length - 1}
                      style={{ height: '100%' }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — scrollable ruler + tracks + playhead */}
          <div
            ref={scrollRef}
            className="ptv2-scroll"
            onScroll={handleScroll}
            onClick={handleTimelineClick}
            style={{ cursor: selectedTool === 'razor' ? 'crosshair' : 'default' }}
          >
            {/*
              Everything in .ptv2-canvas shares ONE coordinate space.
              timelineWidth = duration * BASE_PPS * zoom.
              Ruler ticks, track waveforms, AND the playhead all live
              inside this single div so they never drift.
            */}
            <div className="ptv2-canvas" style={{ width: timelineWidth }}>
              {/* 1) Ruler */}
              <Ruler_v2
                duration={duration}
                zoomLevel={zoomLevel}
                onTimeChange={onTimelineClick}
              />

              {/* 2) Playhead — one element, ruler-anchored cap + full-height line */}
              <Playhead_v2 currentTime={currentTime} zoomLevel={zoomLevel} />

              {/* 3) Tracks */}
              {tracks.length === 0 ? (
                <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                  <div>Timeline is ready for audio clips!</div>
                </div>
              ) : (
                tracks.map((track, idx) => {
                  const isActive = track.id === activeTrackId;
                  const isDropTarget = isDraggingClip && dragPreview?.targetTrackId === track.id;
                  const rowCls = [
                    'ptv2-track-row',
                    idx % 2 === 0 ? 'ptv2-track-row--even' : 'ptv2-track-row--odd',
                    isActive && 'ptv2-track-row--active',
                    isDropTarget && 'ptv2-track-row--drop-target',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  return (
                    <div
                      key={`row-${track.id}`}
                      className={rowCls}
                      style={{
                        height: TRACK_HEIGHT,
                        cursor: selectedTool === 'razor' ? 'crosshair' : 'default',
                      }}
                      onContextMenu={(e) => handleTrackContextMenu(e, track)}
                    >
                      {/* center line */}
                      <div
                        className="ptv2-track-row__center-line"
                        style={{ width: timeToPixels(duration, BASE_PPS, zoomLevel) }}
                      />

                      {/* clips */}
                      {track.clips?.map((clip) => {
                        const rate = track.playbackRate || 1;
                        const visDur = clip.duration / rate;
                        const clipW = timeToPixels(visDur, BASE_PPS, zoomLevel);

                        return (
                          <div
                            key={clip.id}
                            data-clip
                            className={`ptv2-clip ${isDraggingClip && draggedClip?.id === clip.id ? 'ptv2-clip--dragging' : ''}`}
                            style={{
                              left: timeToPixels(clip.startTime, BASE_PPS, zoomLevel),
                              width: clipW,
                              height: TRACK_HEIGHT - 4,
                              cursor: selectedTool === 'razor' ? 'crosshair' : 'grab',
                              pointerEvents: isDraggingClip && draggedClip?.id !== clip.id ? 'none' : 'auto',
                            }}
                            onMouseDown={(e) => handleClipMouseDown(e, clip)}
                            onClick={(e) => handleClipClick(e, clip)}
                            onContextMenu={(e) => handleClipContextMenu(e, clip)}
                          >
                            {clip.audioBuffer && (
                              <SimpleWaveform
                                audioBuffer={clip.audioBuffer}
                                width={clipW}
                                height={TRACK_HEIGHT - 4}
                                color="rgba(255,255,255,0.3)"
                                backgroundColor="transparent"
                                audioOffset={clip.audioOffset || 0}
                                clipDuration={clip.duration}
                              />
                            )}
                            <span className="ptv2-clip__duration">
                              {(clip.duration || 0).toFixed(1)}s
                            </span>
                          </div>
                        );
                      })}

                      {/* empty hint */}
                      {(!track.clips || track.clips.length === 0) && (
                        <span className="ptv2-clip__empty-hint">
                          Drop audio files here
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="ptv2-footer">
          <div>
            Zoom: {(zoomLevel || 1).toFixed(1)}x | Viewport:{' '}
            {(viewportStart || 0).toFixed(1)}s | Duration:{' '}
            {(duration || 0).toFixed(1)}s
            {activeLoopRegion && (
              <span style={{ color: '#FF6B35', marginLeft: 8 }}>
                • Loop Active: {activeLoopRegion.name}
              </span>
            )}
          </div>
          <div>Professional Multi-Track Timeline V2 • {tracks.length} tracks</div>
        </div>

        {/* ── Drag preview ──────────────────────────────── */}
        {isDraggingClip && dragPreview && (
          <div
            className="ptv2-drag-preview"
            style={{
              left: dragPreview.x,
              top: dragPreview.y,
              width: dragPreview.width,
              height: dragPreview.height,
            }}
          >
            {dragPreview.snapTime !== undefined && (
              <div style={{ textAlign: 'center' }}>
                <div>{dragPreview.clip.name || 'Audio Clip'}</div>
                <div style={{ fontSize: 10, opacity: 0.8 }}>
                  {dragPreview.snapTime.toFixed(1)}s
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Context menu ──────────────────────────────── */}
        {contextMenu && (contextMenuTrack || contextMenuClip) && (
          <div
            data-context-menu
            className="ptv2-ctx"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ptv2-ctx__header">
              {contextMenuClip
                ? contextMenuClip.name || 'Audio Clip'
                : contextMenuTrack?.name || `Track ${tracks.indexOf(contextMenuTrack) + 1}`}
            </div>

            {/* Tool switch */}
            <div className="ptv2-ctx__item" onClick={() => { onToolChange?.('selection'); closeContextMenu(); }}>
              ☞ Selection Tool {selectedTool === 'selection' ? '✓' : ''}
            </div>
            <div className="ptv2-ctx__item" onClick={() => { onToolChange?.('razor'); closeContextMenu(); }}>
              ✂️ Razor Tool {selectedTool === 'razor' ? '✓' : ''}
            </div>
            <div className="ptv2-ctx__sep" />

            {/* Undo / Redo */}
            {canUndo && (
              <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('undo')}>
                ↶ Undo{nextUndoDescription ? ` ${nextUndoDescription}` : ''}
              </div>
            )}
            {canRedo && (
              <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('redo')}>
                ↷ Redo{nextRedoDescription ? ` ${nextRedoDescription}` : ''}
              </div>
            )}
            {(canUndo || canRedo) && <div className="ptv2-ctx__sep" />}

            {/* Clip actions */}
            {contextMenuClip && (
              <>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('cut')}>✂️ Cut Clip</div>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('copy')}>📋 Copy Clip</div>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('duplicate')}>📄 Duplicate Clip</div>
                <div className="ptv2-ctx__sep" />
                <div className="ptv2-ctx__item ptv2-ctx__item--danger" onClick={() => handleContextMenuAction('delete')}>🗑️ Delete Clip</div>
              </>
            )}

            {/* Track actions */}
            {contextMenuTrack && (
              <>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('rename')}>✏️ Rename Track</div>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('mute')}>
                  🔇 {contextMenuTrack.muted ? 'Unmute' : 'Mute'} Track
                </div>
                <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('solo')}>
                  🎧 {contextMenuTrack.solo ? 'Unsolo' : 'Solo'} Track
                </div>
                <div className="ptv2-ctx__sep" />
                {tracks.indexOf(contextMenuTrack) > 0 && (
                  <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('moveUp')}>⬆️ Move Up</div>
                )}
                {tracks.indexOf(contextMenuTrack) < tracks.length - 1 && (
                  <div className="ptv2-ctx__item" onClick={() => handleContextMenuAction('moveDown')}>⬇️ Move Down</div>
                )}
                <div className="ptv2-ctx__sep" />
                <div className="ptv2-ctx__item ptv2-ctx__item--danger" onClick={() => handleContextMenuAction('delete')}>🗑️ Delete Track</div>
              </>
            )}
          </div>
        )}
      </div>
    );
  },
);

ProfessionalTimeline_v2.displayName = 'ProfessionalTimeline_v2';

export default ProfessionalTimeline_v2;
