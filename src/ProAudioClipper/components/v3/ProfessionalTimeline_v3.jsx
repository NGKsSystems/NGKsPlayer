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
import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
      onTrackDeleteFile,
      onTrackRemove,
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
    const clipboardRef = useRef(null); // holds copied/cut clip data
    const [scrollLeft, setScrollLeft] = useState(0);
    const [ctxMenu, setCtxMenu] = useState(null); // { trackId, trackName, idx, x, y, clip? }
    const [renaming, setRenaming] = useState(null); // { trackId, name }
    const [deleteConfirm, setDeleteConfirm] = useState(null); // { trackId, trackName }

    /* ── close context menu on any outside click / scroll / Escape ── */
    const ctxMenuRef = useRef(null);
    useEffect(() => {
      if (!ctxMenu) return;
      const dismiss = (e) => {
        // Don't dismiss if clicking inside the context menu itself
        if (ctxMenuRef.current && ctxMenuRef.current.contains(e.target)) return;
        setCtxMenu(null);
      };
      const onKey = (e) => { if (e.key === 'Escape') setCtxMenu(null); };
      // Use timeout so the initial right-click event doesn't immediately dismiss
      const timer = setTimeout(() => {
        window.addEventListener('mousedown', dismiss);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('keydown', onKey);
      }, 0);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('mousedown', dismiss);
        window.removeEventListener('scroll', dismiss, true);
        window.removeEventListener('keydown', onKey);
      };
    }, [ctxMenu]);

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
                  <div key={`hdr-${track.id}`} className="ptv3-track-hdr" style={{ height: TRACK_HEIGHT }}
                    onClick={() => onTrackSelect?.(track.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('[PTv3] RIGHT-CLICK on track header:', track.id, track.name, e.clientX, e.clientY);
                      setCtxMenu({ trackId: track.id, trackName: track.name, idx, x: e.clientX, y: e.clientY });
                    }}
                  >
                    <span className="ptv3-track-hdr__name" title={track.name}>{track.name}</span>
                    <div className="ptv3-track-hdr__btns">
                      <button
                        className={`ptv3-track-hdr__btn ${track.muted ? 'ptv3-track-hdr__btn--active' : ''}`}
                        onClick={() => onTrackMute?.(track.id)}
                        title={track.muted ? 'Unmute' : 'Mute'}
                      >▶</button>
                      <button
                        className={`ptv3-track-hdr__btn ${track.muted ? 'ptv3-track-hdr__btn--active' : ''}`}
                        onClick={() => onTrackMute?.(track.id)}
                        title={track.muted ? 'Unmute' : 'Mute'}
                      >M</button>
                      <button
                        className={`ptv3-track-hdr__btn ${track.solo ? 'ptv3-track-hdr__btn--solo' : ''}`}
                        onClick={() => onTrackSolo?.(track.id)}
                        title={track.solo ? 'Unsolo' : 'Solo'}
                      >S</button>
                    </div>
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
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('[PTv3] RIGHT-CLICK on track row:', track.id, track.name, e.clientX, e.clientY);
                            setCtxMenu({ trackId: track.id, trackName: track.name, idx, x: e.clientX, y: e.clientY });
                          }}
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
                                  cursor: selectedTool === 'razor' ? 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><text y=\'18\' font-size=\'16\'>✂</text></svg>") 12 12, crosshair' : 'grab',
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (selectedTool === 'razor') {
                                    // Razor tool: split clip at click position
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const relativeTime = pxToTime(x, zoomLevel);
                                    const splitTime = clip.startTime + relativeTime;
                                    onClipSplit?.(clip.id, splitTime);
                                  } else {
                                    // Selection tool: select clip
                                    onClipSelect?.(clip);
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCtxMenu({ trackId: track.id, trackName: track.name, idx, x: e.clientX, y: e.clientY, clip });
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

        {/* ── Context Menu (portal to body to avoid overflow clipping) ── */}
        {ctxMenu && createPortal(
          <div
            ref={ctxMenuRef}
            className="ptv3-ctx-menu"
            style={{ top: ctxMenu.y, left: ctxMenu.x }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Edit actions ── */}
            <button className="ptv3-ctx-menu__item" onClick={() => {
              if (ctxMenu.clip) { clipboardRef.current = { ...ctxMenu.clip, _cut: false }; }
              setCtxMenu(null);
            }} disabled={!ctxMenu.clip}>✂ Copy</button>
            <button className="ptv3-ctx-menu__item" onClick={() => {
              if (ctxMenu.clip) {
                clipboardRef.current = { ...ctxMenu.clip, _cut: true, _srcTrackId: ctxMenu.trackId };
                onClipDelete?.(ctxMenu.clip.id);
              }
              setCtxMenu(null);
            }} disabled={!ctxMenu.clip}>✂ Cut</button>
            <button className="ptv3-ctx-menu__item" onClick={() => {
              if (clipboardRef.current && ctxMenu.trackId) {
                const cb = clipboardRef.current;
                const newClip = { ...cb, id: `clip-${Date.now()}`, startTime: currentTime, _cut: undefined, _srcTrackId: undefined };
                onClipMove?.(newClip, ctxMenu.trackId);
                if (!cb._cut) clipboardRef.current = { ...cb }; // keep for re-paste if copy
                else clipboardRef.current = null;
              }
              setCtxMenu(null);
            }} disabled={!clipboardRef.current}>📋 Paste</button>

            <div className="ptv3-ctx-menu__divider" />

            {/* ── Tool switches ── */}
            <button className={`ptv3-ctx-menu__item ${selectedTool === 'selection' ? 'ptv3-ctx-menu__item--active' : ''}`} onClick={() => { onToolChange?.('selection'); setCtxMenu(null); }}>☞ Select Tool</button>
            <button className={`ptv3-ctx-menu__item ${selectedTool === 'razor' ? 'ptv3-ctx-menu__item--active' : ''}`} onClick={() => { onToolChange?.('razor'); setCtxMenu(null); }}>✂ Razor Tool</button>

            <div className="ptv3-ctx-menu__divider" />

            {/* ── Track actions ── */}
            <button className="ptv3-ctx-menu__item" onClick={() => { onTrackMoveUp?.(ctxMenu.idx); setCtxMenu(null); }} disabled={ctxMenu.idx === 0}>⬆ Move Up</button>
            <button className="ptv3-ctx-menu__item" onClick={() => { onTrackMoveDown?.(ctxMenu.idx); setCtxMenu(null); }} disabled={ctxMenu.idx >= tracks.length - 1}>⬇ Move Down</button>
            <button className="ptv3-ctx-menu__item" onClick={() => { onOpenEffects?.(ctxMenu.trackId); setCtxMenu(null); }}>🎛 Effects</button>
            <button className="ptv3-ctx-menu__item" onClick={() => { setRenaming({ trackId: ctxMenu.trackId, name: ctxMenu.trackName }); setCtxMenu(null); }}>✏ Rename</button>
            <button className="ptv3-ctx-menu__item" onClick={() => { onTrackRemove?.(ctxMenu.trackId); setCtxMenu(null); }}>✖ Remove from Timeline</button>
            <button className="ptv3-ctx-menu__item ptv3-ctx-menu__item--danger" onClick={() => { setDeleteConfirm({ trackId: ctxMenu.trackId, trackName: ctxMenu.trackName }); setCtxMenu(null); }}>🗑 Delete Permanently</button>
          </div>,
          document.body
        )}

        {/* ── Inline Rename Dialog (portal) ── */}
        {renaming && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setRenaming(null)}
          >
            <div style={{ background: '#2c2c2c', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: 16, minWidth: 260 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ color: '#ccc', fontSize: 13, marginBottom: 8 }}>Rename Track</div>
              <input
                autoFocus
                style={{ width: '100%', padding: '6px 10px', fontSize: 14, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#fff', boxSizing: 'border-box' }}
                value={renaming.name}
                onChange={(e) => setRenaming({ ...renaming, name: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renaming.name.trim()) {
                    onTrackNameChange?.(renaming.trackId, renaming.name.trim());
                    setRenaming(null);
                  }
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                <button style={{ padding: '4px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
                  onClick={() => setRenaming(null)}>Cancel</button>
                <button style={{ padding: '4px 14px', background: '#ff6b35', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { if (renaming.name.trim()) { onTrackNameChange?.(renaming.trackId, renaming.name.trim()); } setRenaming(null); }}>Rename</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Delete Confirmation Dialog (portal) ── */}
        {deleteConfirm && createPortal(
          <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setDeleteConfirm(null)}
          >
            <div style={{ background: '#2c2c2c', border: '1px solid rgba(231,76,60,0.4)', borderRadius: 8, padding: 20, minWidth: 300, maxWidth: 400 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ color: '#e74c3c', fontSize: 15, fontWeight: 600, marginBottom: 10 }}>🗑 Delete Permanently</div>
              <div style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                This will <strong style={{ color: '#e74c3c' }}>permanently delete</strong> the file for
                <strong> "{deleteConfirm.trackName}"</strong> from your computer. This cannot be undone.
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
                  onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button style={{ padding: '6px 16px', background: '#e74c3c', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { onTrackDeleteFile?.(deleteConfirm.trackId); setDeleteConfirm(null); }}>Delete Forever</button>
              </div>
            </div>
          </div>,
          document.body
        )}

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
