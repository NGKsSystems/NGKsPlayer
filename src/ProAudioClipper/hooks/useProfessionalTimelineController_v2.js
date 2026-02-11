/**
 * NGKsSystems – NGKsPlayer
 *
 * Module: useProfessionalTimelineController_v2.js
 * Purpose: Interaction state + handlers for ProfessionalTimeline_v2
 *          Surface-compatible with V1 controller; V1 is NOT modified.
 *
 * Owner: NGKsSystems
 */
import { useCallback, useEffect, useState, useRef } from 'react';
import { timeToPixels, pixelsToTime, snapTime } from '../timeline/timelineMath.js';
import { BASE_PPS } from '../timeline/v2/layoutConstants.js';

/**
 * V2 controller hook.
 * Owns all interaction state (drag, context-menu, scroll sync) and
 * exposes the same surface the V2 component needs.
 */
export function useProfessionalTimelineController_v2({
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
}) {
  /* ── drag state ─────────────────────────────────────── */
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState(null);

  /* ── context-menu state ─────────────────────────────── */
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTrack, setContextMenuTrack] = useState(null);
  const [contextMenuClip, setContextMenuClip] = useState(null);

  /* ── scroll sync ────────────────────────────────────── */
  const handleScroll = useCallback((e) => {
    if (onViewportChange) {
      const scrollLeft = e.target.scrollLeft;
      const newViewportStart = scrollLeft / PIXELS_PER_SECOND;
      onViewportChange(newViewportStart);
    }
  }, [PIXELS_PER_SECOND, onViewportChange]);

  useEffect(() => {
    if (scrollRef.current) {
      const targetScrollLeft = timeToPixels(viewportStart, BASE_PPS, zoomLevel);
      scrollRef.current.scrollLeft = targetScrollLeft;
    }
  }, [viewportStart, PIXELS_PER_SECOND, scrollRef, zoomLevel]);

  /* ── clip interaction handlers ──────────────────────── */
  const handleClipMouseDown = useCallback((e, clip) => {
    e.preventDefault();
    e.stopPropagation();

    if (selectedTool === 'razor') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clipTime = x / PIXELS_PER_SECOND;
      const globalTime = clip.startTime + clipTime;
      if (onClipSplit) onClipSplit(clip.id, globalTime);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDraggedClip(clip);
    setIsDraggingClip(true);
    if (onClipSelect) onClipSelect(clip);
  }, [selectedTool, PIXELS_PER_SECOND, onClipSplit, onClipSelect]);

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingClip || !draggedClip) return;

    const newLeft = e.clientX - dragOffset.x;
    const newTop = e.clientY - dragOffset.y;
    const timeAtMouse = (newLeft + (scrollRef.current?.scrollLeft || 0)) / PIXELS_PER_SECOND;
    const snappedTime = snapTime(timeAtMouse, 0.1, 8, BASE_PPS);

    const trackArea = scrollRef.current?.getBoundingClientRect();
    let targetTrackId = null;
    if (trackArea) {
      const relY = e.clientY - trackArea.top + (scrollRef.current?.scrollTop || 0);
      const trackIdx = Math.floor(relY / TRACK_HEIGHT);
      if (trackIdx >= 0 && trackIdx < tracks.length) {
        targetTrackId = tracks[trackIdx].id;
      }
    }

    setDragPreview({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y,
      width: timeToPixels(draggedClip.duration || 1, BASE_PPS, zoomLevel),
      height: TRACK_HEIGHT - 4,
      clip: draggedClip,
      snapTime: snappedTime,
      targetTrackId,
    });
  }, [isDraggingClip, draggedClip, dragOffset, scrollRef, PIXELS_PER_SECOND, TRACK_HEIGHT, tracks, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    if (isDraggingClip && draggedClip && dragPreview) {
      if (onClipMove) {
        onClipMove(draggedClip.id, {
          startTime: dragPreview.snapTime,
          trackId: dragPreview.targetTrackId,
        });
      }
    }
    setIsDraggingClip(false);
    setDraggedClip(null);
    setDragPreview(null);
  }, [isDraggingClip, draggedClip, dragPreview, onClipMove]);

  /* ── global mouse listeners for drag ────────────────── */
  useEffect(() => {
    if (isDraggingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingClip, handleMouseMove, handleMouseUp]);

  /* ── context-menu handlers ──────────────────────────── */
  const handleTrackContextMenu = useCallback((e, track) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setContextMenuTrack(track);
    setContextMenuClip(null);
  }, []);

  const handleClipContextMenu = useCallback((e, clip) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    setContextMenuClip(clip);
    setContextMenuTrack(null);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setContextMenuTrack(null);
    setContextMenuClip(null);
  }, []);

  /* close on outside click */
  useEffect(() => {
    if (!contextMenu) return;
    const close = (e) => {
      if (!e.target.closest('[data-context-menu]')) closeContextMenu();
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [contextMenu, closeContextMenu]);

  const handleContextMenuAction = useCallback((action) => {
    switch (action) {
      case 'delete':
        if (contextMenuClip && onClipDelete) onClipDelete(contextMenuClip.id);
        if (contextMenuTrack && onTrackDelete) onTrackDelete(contextMenuTrack.id);
        break;
      case 'mute':
        if (contextMenuTrack && onTrackMute) onTrackMute(contextMenuTrack.id);
        break;
      case 'solo':
        if (contextMenuTrack && onTrackSolo) onTrackSolo(contextMenuTrack.id);
        break;
      case 'rename':
        if (contextMenuTrack && onTrackNameChange) {
          const newName = prompt('Track name:', contextMenuTrack.name);
          if (newName) onTrackNameChange(contextMenuTrack.id, newName);
        }
        break;
      case 'moveUp':
        if (contextMenuTrack) {
          const idx = tracks.indexOf(contextMenuTrack);
          if (idx > 0 && onTrackMoveUp) onTrackMoveUp(idx);
        }
        break;
      case 'moveDown':
        if (contextMenuTrack) {
          const idx = tracks.indexOf(contextMenuTrack);
          if (idx < tracks.length - 1 && onTrackMoveDown) onTrackMoveDown(idx);
        }
        break;
      case 'cut':
        if (contextMenuClip && onClipSplit) {
          /* split at midpoint */
          const mid = contextMenuClip.startTime + (contextMenuClip.duration || 0) / 2;
          onClipSplit(contextMenuClip.id, mid);
        }
        break;
      case 'undo': if (onUndo) onUndo(); break;
      case 'redo': if (onRedo) onRedo(); break;
      default: break;
    }
    closeContextMenu();
  }, [contextMenuClip, contextMenuTrack, tracks, onClipDelete, onClipSplit,
      onTrackDelete, onTrackMute, onTrackSolo, onTrackNameChange,
      onTrackMoveUp, onTrackMoveDown, onUndo, onRedo, closeContextMenu]);

  /* ── timeline click (seek / razor) ──────────────────── */
  const handleTimelineClick = useCallback((e) => {
    if (isDraggingClip) return;
    if (e.target.closest('[data-clip]')) return;

    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clickTime = pixelsToTime(e.clientX, rect.left, 0, BASE_PPS, zoomLevel, duration);

    if (onTimelineClick) onTimelineClick(clickTime);
  }, [isDraggingClip, scrollRef, zoomLevel, duration, onTimelineClick]);

  const handleClipClick = useCallback((e, clip) => {
    e.stopPropagation();
    if (onClipSelect) onClipSelect(clip);
  }, [onClipSelect]);

  /* ── return surface ─────────────────────────────────── */
  return {
    isDraggingClip,
    draggedClip,
    dragPreview,
    contextMenu,
    contextMenuTrack,
    contextMenuClip,
    handleScroll,
    handleClipMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTrackContextMenu,
    handleClipContextMenu,
    closeContextMenu,
    handleContextMenuAction,
    handleTimelineClick,
    handleClipClick,
  };
}
