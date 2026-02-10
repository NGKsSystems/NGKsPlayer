/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useTimelineRulerController.js
 * Purpose: Interaction state & handlers extracted from TimelineRuler.jsx
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { timeToPixels, pixelsToTime, calculateTimelineWidth, generateTicks } from '../timeline/timelineMath.js';

/**
 * Hook encapsulating all interaction state, coordinate conversion,
 * tick generation, and drag/mouse handlers for TimelineRuler.
 */
export function useTimelineRulerController({
  rulerRef,
  duration,
  currentTime,
  viewportStart,
  zoom,
  pixelsPerSecond,
  markers,
  loopRegions,
  onTimeChange,
  onAddMarker,
  onSelectMarker,
  onMoveMarker,
  onSelectLoopRegion,
  onAddLoopRegion,
  onResizeLoopRegion,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'playhead', 'marker', 'loop-start', 'loop-end'
  const [dragTarget, setDragTarget] = useState(null);
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);
  const [loopStart, setLoopStart] = useState(null);
  const [currentMouseX, setCurrentMouseX] = useState(0);

  const timelineWidth = calculateTimelineWidth(duration, pixelsPerSecond, zoom);

  // Time formatting
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Convert pixel position to time using math helper
  const pixelToTime = useCallback((pixelX) => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    return pixelsToTime(pixelX, rect.left, viewportStart, pixelsPerSecond, zoom, duration);
  }, [rulerRef, viewportStart, pixelsPerSecond, zoom, duration]);

  // Convert time to pixel position using math helper
  const timeToPixel = useCallback((time) => {
    return timeToPixels(time, pixelsPerSecond, zoom);
  }, [pixelsPerSecond, zoom]);

  // Calculate playhead position after timeToPixel is defined
  const playheadPosition = useMemo(() => {
    return timeToPixel(currentTime);
  }, [timeToPixel, currentTime]);

  // Generate ruler tick marks using math helper
  const ticks = useMemo(() => {
    const majorTickInterval = Math.max(1, Math.floor(10 / zoom));
    const minorTickInterval = Math.max(0.1, majorTickInterval / 10);
    
    return generateTicks(duration, majorTickInterval, minorTickInterval, timeToPixel, formatTime);
  }, [zoom, duration, timeToPixel, formatTime]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    if (!rulerRef.current) return;
    
    const clickTime = pixelToTime(e.clientX);
    
    // Check if clicking on a marker
    const clickedMarker = markers.find(marker => {
      const markerPixel = timeToPixel(marker.time);
      return Math.abs(e.clientX - rulerRef.current.getBoundingClientRect().left - markerPixel) < 8;
    });
    
    if (clickedMarker) {
      setDragType('marker');
      setDragTarget(clickedMarker.id);
      setIsDragging(true);
      onSelectMarker?.(clickedMarker.id);
      return;
    }
    
    // Check if clicking on loop region handles
    const clickedLoop = loopRegions.find(loop => {
      const startPixel = timeToPixel(loop.startTime);
      const endPixel = timeToPixel(loop.endTime);
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      return (Math.abs(clickX - startPixel) < 8) || (Math.abs(clickX - endPixel) < 8);
    });
    
    if (clickedLoop) {
      const startPixel = timeToPixel(clickedLoop.startTime);
      const endPixel = timeToPixel(clickedLoop.endTime);
      const rect = rulerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      
      if (Math.abs(clickX - startPixel) < 8) {
        setDragType('loop-start');
      } else {
        setDragType('loop-end');
      }
      
      setDragTarget(clickedLoop.id);
      setIsDragging(true);
      onSelectLoopRegion?.(clickedLoop.id);
      return;
    }
    
    // Check if shift+click to create loop region
    if (e.shiftKey) {
      setIsCreatingLoop(true);
      setLoopStart(clickTime);
      return;
    }
    
    // Check if alt+click to add marker
    if (e.altKey) {
      onAddMarker?.(clickTime);
      return;
    }
    
    // Regular playhead movement
    setDragType('playhead');
    setIsDragging(true);
    onTimeChange?.(clickTime);
  }, [rulerRef, markers, loopRegions, pixelToTime, timeToPixel, onSelectMarker, onSelectLoopRegion, onAddMarker, onTimeChange]);

  const handleMouseMove = useCallback((e) => {
    // Track mouse position for loop creation preview
    if (isCreatingLoop) {
      setCurrentMouseX(e.clientX);
    }
    
    if (!isDragging || !rulerRef.current) return;
    
    const currentMouseTime = pixelToTime(e.clientX);
    
    switch (dragType) {
      case 'playhead':
        onTimeChange?.(currentMouseTime);
        break;
        
      case 'marker':
        onMoveMarker?.(dragTarget, currentMouseTime);
        break;
        
      case 'loop-start':
        const loop = loopRegions.find(l => l.id === dragTarget);
        if (loop && currentMouseTime < loop.endTime) {
          onResizeLoopRegion?.(dragTarget, currentMouseTime, loop.endTime);
        }
        break;
        
      case 'loop-end':
        const loopEnd = loopRegions.find(l => l.id === dragTarget);
        if (loopEnd && currentMouseTime > loopEnd.startTime) {
          onResizeLoopRegion?.(dragTarget, loopEnd.startTime, currentMouseTime);
        }
        break;
    }
  }, [isDragging, isCreatingLoop, dragType, dragTarget, rulerRef, pixelToTime, onTimeChange, onMoveMarker, onResizeLoopRegion, loopRegions]);

  const handleMouseUp = useCallback((e) => {
    if (isCreatingLoop && loopStart !== null) {
      const endTime = pixelToTime(e.clientX);
      if (endTime > loopStart) {
        onAddLoopRegion?.(loopStart, endTime);
      }
      setIsCreatingLoop(false);
      setLoopStart(null);
    }
    
    setIsDragging(false);
    setDragType(null);
    setDragTarget(null);
  }, [isCreatingLoop, loopStart, pixelToTime, onAddLoopRegion]);

  // Event listeners
  useEffect(() => {
    if (isDragging || isCreatingLoop) {
      if (typeof document === 'undefined') return;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isCreatingLoop, handleMouseMove, handleMouseUp]);

  return {
    timelineWidth,
    playheadPosition,
    ticks,
    formatTime,
    pixelToTime,
    timeToPixel,
    handleMouseDown,
    isCreatingLoop,
    loopStart,
    currentMouseX,
  };
}
