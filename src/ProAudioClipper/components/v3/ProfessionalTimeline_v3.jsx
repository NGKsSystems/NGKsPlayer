/**
 * NGKsSystems – NGKsPlayer
 *
 * Module: ProfessionalTimeline_v3.jsx
 * Purpose: V3 timeline — playhead-first, Resolve-style anchored.
 *
 * Architecture (LOCKED):
 *   Layer A (SCROLL CONTENT): ruler ticks + tracks/waveforms in one scroll container.
 *   Layer B (VIEWPORT OVERLAY): single playhead in viewport space using
 *     viewportX = timeToPx(currentTime) - scrollLeft
 *
 * The playhead is NOT inside the scroll container.
 * The ruler IS inside the scroll content (ticks scroll with timeline).
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - ONE playhead DOM element in ONE coordinate space
 * - Uses shared math from timelineMath.js via geometry.js wrappers
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useMemo, useCallback, useState } from 'react';
import {
  HEADER_WIDTH,
  TRACK_HEIGHT,
  RULER_HEIGHT,
  BASE_PPS,
  CAP_SIZE,
  MIN_TIMELINE_SECONDS,
} from '../../timeline/v3/layoutConstants.js';
import {
  timeToPx,
  pxToTime,
  clamp,
  timelineWidth as calcTimelineWidth,
  generateTicks,
} from '../../timeline/v3/geometry.js';
import TrackHeader from '../TrackHeader';
import SimpleWaveform from '../SimpleWaveform';
import './ProfessionalTimeline_v3.css';

/* ═══════════════════════════════════════════════════════════
   Sub-components (co-located, zero-dep, render-only)
   ═══════════════════════════════════════════════════════════ */

/** Ruler ticks — inside scroll content, shares coordinate space with tracks */
const Ruler_v3 = React.memo(({ duration, zoomLevel, onTimeChange }) => {
  const ticks = useMemo(() => {
    const majorInterval = Math.max(1, Math.floor(10 / zoomLevel));
    const minorInterval = Math.max(0.1, majorInterval / 10);
    const fmt = (s) => {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 100);
      return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };
    const toPixel = (t) => timeToPx(t, zoomLevel);
    return generateTicks(duration, majorInterval, minorInterval, toPixel, fmt);
  }, [duration, zoomLevel]);

  const handleClick = useCallback(
    (e) => {
      if (!onTimeChange) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pxToTime(x, zoomLevel);
      onTimeChange(clamp(time, 0, duration));
    },
    [onTimeChange, zoomLevel, duration],
  );

  return (
    <div
      className="ptv3-ruler"
      data-testid="ptv3-ruler"
      style={{ height: RULER_HEIGHT, cursor: 'crosshair' }}
      onClick={handleClick}
    >
      {ticks.map((t, i) => (
        <React.Fragment key={i}>
          <div
            className={`ptv3-ruler__tick ${
              t.isMajor ? 'ptv3-ruler__tick--major' : 'ptv3-ruler__tick--minor'
            }`}
            style={{ left: t.position }}
          />
          {t.label && (
            <span className="ptv3-ruler__label" style={{ left: t.position }}>
              {t.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});
Ruler_v3.displayName = 'Ruler_v3';

/* ═══════════════════════════════════════════════════════════
   Main component
   ═══════════════════════════════════════════════════════════ */

const ProfessionalTimeline_v3 = React.forwardRef(
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
    /* ── refs & state ─────────────────────────────────── */
    const scrollRef = useRef(null);
    const headerTracksRef = useRef(null);
    const [scrollLeft, setScrollLeft] = useState(0);

    /* ── scroll handler (syncs left headers with right tracks) ── */
    const handleScroll = useCallback((e) => {
      setScrollLeft(e.target.scrollLeft);
      // Sync vertical scroll: right → left header column
      if (headerTracksRef.current) {
        headerTracksRef.current.scrollTop = e.target.scrollTop;
      }
      if (onViewportChange && scrollRef.current) {
        const sl = scrollRef.current.scrollLeft;
        const startTime = pxToTime(sl, zoomLevel);
        const visibleWidth = scrollRef.current.clientWidth;
        const endTime = pxToTime(sl + visibleWidth, zoomLevel);
        onViewportChange(startTime, endTime);
      }
    }, [onViewportChange, zoomLevel]);

    /* ── click-to-seek on timeline ────────────────────── */
    const handleTimelineClick = useCallback((e) => {
      if (!onTimelineClick) return;
      // Ignore clicks on clips
      if (e.target.closest('[data-clip]')) return;
      const scrollEl = scrollRef.current;
      if (!scrollEl) return;
      const rect = scrollEl.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollEl.scrollLeft;
      const time = clamp(pxToTime(x, zoomLevel), 0, duration);
      onTimelineClick(time);
    }, [onTimelineClick, zoomLevel, duration]);

    /* ── derived geometry ─────────────────────────────── */
    const contentWidth = calcTimelineWidth(
      Math.max(duration, MIN_TIMELINE_SECONDS),
      zoomLevel,
    );

    /* ── playhead viewport position ───────────────────── */
    const contentX = timeToPx(currentTime, zoomLevel);
    const viewportX = contentX - scrollLeft;

    /* ─── render ──────────────────────────────────────── */
    return (
      <div ref={ref} className="ptv3-root" data-testid="ptv3-root">

        {/* ── Toolbar ───────────────────────────────────── */}
        <div className="ptv3-toolbar" data-testid="ptv3-toolbar">
          <span className="ptv3-toolbar__title">
            🎵 Professional Multi-Track Timeline
          </span>
          <button
            className="ptv3-toolbar__btn ptv3-toolbar__btn--add"
            onClick={onAddTrack}
            title="Add Audio Track"
          >
            + Track
          </button>

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Tools */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className={`ptv3-toolbar__btn ${selectedTool === 'selection' ? 'ptv3-toolbar__btn--active' : ''}`}
                onClick={() => onToolChange?.('selection')}
                title="Selection Tool (V)"
              >
                ☞ Select
              </button>
              <button
                className={`ptv3-toolbar__btn ${selectedTool === 'razor' ? 'ptv3-toolbar__btn--active' : ''}`}
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
                className="ptv3-toolbar__btn"
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
                className="ptv3-toolbar__btn"
                onClick={() => onZoomChange?.(Math.min(20, zoomLevel * 1.5))}
                title="Zoom In"
                style={{ width: 28, height: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
            <span>{tracks.length}T</span>
            <span>{(currentTime || 0).toFixed(1)}s</span>
          </div>
        </div>

        {/* ── Body (two-column) ─────────────────────────── */}
        <div className="ptv3-body">

          {/* LEFT COLUMN — track headers */}
          <div className="ptv3-left" data-testid="ptv3-left">
            <div className="ptv3-left__ruler-spacer">TIMELINE</div>
            <div className="ptv3-left__tracks" ref={headerTracksRef}>
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

          {/* RIGHT COLUMN — timeline viewport */}
          <div className="ptv3-right" data-testid="ptv3-right">

            {/* ── Playhead overlay (VIEWPORT SPACE — NOT inside scroll) ── */}
            <div
              className="ptv3-playhead"
              data-testid="ptv3-playhead"
              style={{
                left: viewportX,
                visibility: viewportX >= -20 ? 'visible' : 'hidden',
              }}
            >
              <div className="ptv3-playhead-cap" data-testid="ptv3-playhead-cap" />
              <div className="ptv3-playhead-line" data-testid="ptv3-playhead-line" />
            </div>

            {/* ── Scroll container (CONTENT SPACE — ruler + tracks) ── */}
            <div
              className="ptv3-scroll"
              data-testid="ptv3-scroll"
              ref={scrollRef}
              onScroll={handleScroll}
              onClick={handleTimelineClick}
              style={{ cursor: selectedTool === 'razor' ? 'crosshair' : 'default' }}
            >
              <div
                className="ptv3-content"
                data-testid="ptv3-content"
                style={{ width: contentWidth }}
              >
                {/* Ruler — inside scroll content, sticky vertically */}
                <Ruler_v3
                  duration={duration}
                  zoomLevel={zoomLevel}
                  onTimeChange={onTimelineClick}
                />

                {/* Tracks */}
                <div className="ptv3-tracks" data-testid="ptv3-tracks">
                  {tracks.length === 0 ? (
                    <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 16 }}>
                      <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                      <div>Timeline is ready for audio clips!</div>
                    </div>
                  ) : (
                    tracks.map((track, idx) => {
                      const isActive = track.id === activeTrackId;
                      const rowCls = [
                        'ptv3-track-row',
                        idx % 2 === 0 ? 'ptv3-track-row--even' : 'ptv3-track-row--odd',
                        isActive && 'ptv3-track-row--active',
                      ].filter(Boolean).join(' ');

                      return (
                        <div
                          key={`row-${track.id}`}
                          className={rowCls}
                          style={{ height: TRACK_HEIGHT }}
                        >
                          {/* center line */}
                          <div
                            className="ptv3-track-row__center-line"
                            style={{ width: timeToPx(duration, zoomLevel) }}
                          />

                          {/* clips */}
                          {track.clips?.map((clip) => {
                            const rate = track.playbackRate || 1;
                            const visDur = clip.duration / rate;
                            const clipW = timeToPx(visDur, zoomLevel);

                            return (
                              <div
                                key={clip.id}
                                data-clip
                                className="ptv3-clip"
                                style={{
                                  left: timeToPx(clip.startTime, zoomLevel),
                                  width: clipW,
                                  height: TRACK_HEIGHT - 4,
                                  cursor: selectedTool === 'razor' ? 'crosshair' : 'grab',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onClipSelect?.(clip);
                                }}
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
                                <span className="ptv3-clip__duration">
                                  {(clip.duration || 0).toFixed(1)}s
                                </span>
                              </div>
                            );
                          })}

                          {/* empty hint */}
                          {(!track.clips || track.clips.length === 0) && (
                            <span className="ptv3-clip__empty-hint">
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
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────── */}
        <div className="ptv3-footer">
          <div>
            Zoom: {(zoomLevel || 1).toFixed(1)}x | Duration:{' '}
            {(duration || 0).toFixed(1)}s
            {activeLoopRegion && (
              <span style={{ color: '#FF6B35', marginLeft: 8 }}>
                • Loop Active: {activeLoopRegion.name}
              </span>
            )}
          </div>
          <div>Professional Timeline V3 • {tracks.length} tracks</div>
        </div>
      </div>
    );
  },
);

ProfessionalTimeline_v3.displayName = 'ProfessionalTimeline_v3';

export default ProfessionalTimeline_v3;
