/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: MultiTrackTimeline.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { formatTime } from '../utils/timeUtils';
import { snapTime, timeToPixels, calculateTimelineWidth } from '../timeline/timelineMath.js';
import './MultiTrackTimeline.css';
import { useMultiTrackTimelineController } from '../hooks/useMultiTrackTimelineController';

/**
 * MultiTrackTimeline Component
 * 
 * Professional multi-track timeline inspired by Adobe Premiere/DaVinci Resolve:
 * - Vertical track layout with horizontal timeline
 * - Individual track waveform visualization
 * - Track-specific clip display and editing
 * - Synchronized playhead across all tracks
 * - Zoom and pan controls
 * - Selection and editing tools
 */
const MultiTrackTimeline = React.forwardRef(({
  tracks = [],
  currentTime = 0,
  isPlaying = false,
  zoomLevel = 1,
  viewportStart = 0,
  onSeek,
  onSelectionChange,
  onClipMove,
  onClipUpdate,
  onClipSplit,
  onClipCreate,
  onFileImport,
  selectedTool = 'selection',
  className = '',
  style = {}
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const TRACK_HEIGHT = 80;
  const TRACK_PADDING = 4;
  const RULER_HEIGHT = 30;
  const PIXELS_PER_SECOND = 100 * zoomLevel;
  const WAVEFORM_HEIGHT = TRACK_HEIGHT - (TRACK_PADDING * 2);
  const SNAP_THRESHOLD = 8; // pixels
  const GRID_SNAP_INTERVAL = 1; // seconds

  // Calculate timeline dimensions
  const maxDuration = Math.max(...tracks.filter(t => t.audioBuffer).map(t => t.audioBuffer.duration), 0);
  const timelineWidth = calculateTimelineWidth(maxDuration, PIXELS_PER_SECOND, 1);
  const timelineHeight = RULER_HEIGHT + (tracks.length * TRACK_HEIGHT);

  // Find snap points (clip edges, markers, etc.)
  const findSnapPoints = useCallback((excludeClipId = null) => {
    const snapPoints = [];
    
    // Add timeline start
    snapPoints.push(0);
    
    // Add all clip boundaries
    tracks.forEach(track => {
      track.clips?.forEach(clip => {
        if (clip.id !== excludeClipId) {
          snapPoints.push(clip.startTime);
          snapPoints.push(clip.endTime);
        }
      });
    });
    
    // Add playhead position
    snapPoints.push(currentTime);
    
    // Add grid lines (every second)
    for (let i = 0; i <= maxDuration; i += GRID_SNAP_INTERVAL) {
      snapPoints.push(i);
    }
    
    return [...new Set(snapPoints)].sort((a, b) => a - b);
  }, [tracks, currentTime, maxDuration, GRID_SNAP_INTERVAL]);

  // Snap time to nearest snap point
  const snapTimeToPoints = useCallback((time, excludeClipId = null) => {
    const snapPoints = findSnapPoints(excludeClipId);
    let closestSnap = time;
    let minDistance = Infinity;
    
    snapPoints.forEach(snapPoint => {
      const distance = Math.abs((snapPoint - time) * PIXELS_PER_SECOND);
      if (distance < SNAP_THRESHOLD && distance < minDistance) {
        minDistance = distance;
        closestSnap = snapPoint;
      }
    });
    
    return closestSnap;
  }, [findSnapPoints, PIXELS_PER_SECOND, SNAP_THRESHOLD]);

  // Interaction state & handlers from hook
  const {
    isDragging, selection, hoveredTrack,
    isDraggingClip, draggedClip, dropTarget, snapGuides,
    isDragOver, dragOverTrack, razorGuideX,
    handleMouseDown, handleMouseMove, handleMouseUp,
    handleDragOver, handleDragLeave, handleDrop
  } = useMultiTrackTimelineController({
    canvasRef,
    tracks,
    viewportStart,
    zoomLevel,
    selectedTool,
    PIXELS_PER_SECOND,
    RULER_HEIGHT,
    TRACK_HEIGHT,
    SNAP_THRESHOLD,
    snapTimeToPoints,
    findSnapPoints,
    onSeek,
    onSelectionChange,
    onClipMove,
    onClipUpdate,
    onClipSplit,
    onFileImport
  });

  // Draw waveform for a track
  const drawWaveform = useCallback((ctx, audioBuffer, x, y, width, height, color) => {
    if (!audioBuffer) return;

    const samples = audioBuffer.getChannelData(0);
    const samplesPerPixel = samples.length / width;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.8;
    
    ctx.beginPath();
    
    for (let x_pos = 0; x_pos < width; x_pos++) {
      const startSample = Math.floor(x_pos * samplesPerPixel);
      const endSample = Math.floor((x_pos + 1) * samplesPerPixel);
      
      let min = 0;
      let max = 0;
      
      for (let i = startSample; i < endSample && i < samples.length; i++) {
        const sample = samples[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      const yMin = y + height/2 + (min * height/2);
      const yMax = y + height/2 + (max * height/2);
      
      ctx.moveTo(x + x_pos, yMin);
      ctx.lineTo(x + x_pos, yMax);
    }
    
    ctx.stroke();
    ctx.globalAlpha = 1;
  }, []);

  // Draw track clips
  const drawTrackClips = useCallback((ctx, track, trackY) => {
    if (!track.clips || track.clips.length === 0) return;

    track.clips.forEach(clip => {
      const clipX = timeToPixels(clip.startTime - viewportStart, 100, zoomLevel);
      const clipWidth = timeToPixels(clip.duration, 100, zoomLevel);
      const clipY = trackY + TRACK_PADDING;
      const clipHeight = WAVEFORM_HEIGHT;

      // Only draw if clip is visible
      if (clipX + clipWidth > 0 && clipX < timelineWidth) {
        // Clip background
        ctx.fillStyle = track.color + '40'; // Semi-transparent
        ctx.fillRect(clipX, clipY, clipWidth, clipHeight);

        // Clip border
        ctx.strokeStyle = track.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(clipX, clipY, clipWidth, clipHeight);

        // Clip name
        ctx.fillStyle = '#ffffff';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(clip.name, clipX + 4, clipY + 16);

        // Clip duration
        ctx.fillStyle = '#cccccc';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(formatTime(clip.duration), clipX + 4, clipY + clipHeight - 4);
      }
    });
  }, [PIXELS_PER_SECOND, TRACK_PADDING, WAVEFORM_HEIGHT, viewportStart, timelineWidth]);

  // Draw time ruler
  const drawTimeRuler = useCallback((ctx, width) => {
    const rulerY = 0;
    
    // Ruler background
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, rulerY, width, RULER_HEIGHT);

    // Time markers
    ctx.strokeStyle = '#7f8c8d';
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 1;

    const secondInterval = Math.max(1, Math.floor(50 / PIXELS_PER_SECOND));
    const startSecond = Math.floor(viewportStart);
    const endSecond = Math.ceil(viewportStart + (width / PIXELS_PER_SECOND));

    for (let second = startSecond; second <= endSecond; second += secondInterval) {
      const x = timeToPixels(second - viewportStart, 100, zoomLevel);
      
      if (x >= 0 && x <= width) {
        // Major tick
        ctx.beginPath();
        ctx.moveTo(x, rulerY + RULER_HEIGHT - 10);
        ctx.lineTo(x, rulerY + RULER_HEIGHT);
        ctx.stroke();

        // Time label
        ctx.fillText(formatTime(second), x, rulerY + 16);

        // Minor ticks (every 0.2 seconds if zoomed in enough)
        if (PIXELS_PER_SECOND > 100) {
          for (let minor = 1; minor < 5; minor++) {
            const minorSecond = second + (minor * 0.2);
            const minorX = timeToPixels(minorSecond - viewportStart, 100, zoomLevel);
            
            if (minorX >= 0 && minorX <= width) {
              ctx.beginPath();
              ctx.moveTo(minorX, rulerY + RULER_HEIGHT - 5);
              ctx.lineTo(minorX, rulerY + RULER_HEIGHT);
              ctx.stroke();
            }
          }
        }
      }
    }
  }, [RULER_HEIGHT, PIXELS_PER_SECOND, viewportStart]);

  // Draw playhead
  const drawPlayhead = useCallback((ctx, height) => {
    const playheadX = timeToPixels(currentTime - viewportStart, 100, zoomLevel);
    
    if (playheadX >= 0 && playheadX <= timelineWidth) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead top indicator
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 12);
      ctx.closePath();
      ctx.fill();
    }
  }, [currentTime, PIXELS_PER_SECOND, viewportStart, timelineWidth]);

  // Main render function
  const renderTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size with SSR-safe devicePixelRatio access
    const devicePixelRatio = (typeof document !== 'undefined' && document.defaultView && document.defaultView.devicePixelRatio) ? document.defaultView.devicePixelRatio : 1;
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    
    // Clear canvas with a visible background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw time ruler
    drawTimeRuler(ctx, rect.width);

    // Draw tracks
    tracks.forEach((track, index) => {
      try {
        const trackY = RULER_HEIGHT + (index * TRACK_HEIGHT);
        
        // Track background
        const isHovered = hoveredTrack === track.id;
        ctx.fillStyle = isHovered ? '#34495e' : '#2c3e50';
        ctx.fillRect(0, trackY, rect.width, TRACK_HEIGHT);

        // Track separator
        if (index > 0) {
          ctx.strokeStyle = '#1a252f';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, trackY);
          ctx.lineTo(rect.width, trackY);
          ctx.stroke();
        }

        // Draw waveform if track has audio
        if (track.audioBuffer) {
          const waveformX = -(viewportStart * PIXELS_PER_SECOND);
          const waveformWidth = track.audioBuffer.duration * PIXELS_PER_SECOND;
          
          try {
            drawWaveform(
              ctx, 
              track.audioBuffer, 
              waveformX, 
              trackY + TRACK_PADDING, 
              waveformWidth, 
              WAVEFORM_HEIGHT, 
              track.color
            );
          } catch (waveformError) {
            console.error('Error drawing waveform for track', track.name, waveformError);
            // Draw fallback rectangle
            ctx.fillStyle = track.color + '40';
            ctx.fillRect(waveformX, trackY + TRACK_PADDING, waveformWidth, WAVEFORM_HEIGHT);
          }
        }

        // Draw track clips
        try {
          drawTrackClips(ctx, track, trackY);
        } catch (clipsError) {
          console.error('Error drawing clips for track', track.name, clipsError);
        }

        // Track name overlay
        ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
        ctx.fillRect(4, trackY + 4, 120, 20);
        ctx.fillStyle = '#ecf0f1';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(track.name, 8, trackY + 16);
        
      } catch (trackError) {
        console.error('Error rendering track', track.name, trackError);
      }
    });

    // Draw selection if active
    if (selection) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 1;
      ctx.fillRect(selection.startX, selection.startY, selection.width, selection.height);
      ctx.strokeRect(selection.startX, selection.startY, selection.width, selection.height);
    }

    // Draw snap guides
    if (snapGuides.length > 0) {
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      snapGuides.forEach(snapTime => {
        const snapX = timeToPixels(snapTime - viewportStart, 100, zoomLevel);
        if (snapX >= 0 && snapX <= rect.width) {
          ctx.beginPath();
          ctx.moveTo(snapX, RULER_HEIGHT);
          ctx.lineTo(snapX, rect.height);
          ctx.stroke();
        }
      });
      
      ctx.setLineDash([]); // Reset dash pattern
    }

    // Draw razor tool guide line
    if (selectedTool === 'razor' && razorGuideX !== null) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
      
      ctx.beginPath();
      ctx.moveTo(razorGuideX, RULER_HEIGHT);
      ctx.lineTo(razorGuideX, rect.height);
      ctx.stroke();
      
      // Add small scissors icon at the top
      ctx.fillStyle = '#e74c3c';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✂', razorGuideX, RULER_HEIGHT - 5);
    }

    // Draw drag over track highlight
    if (dragOverTrack) {
      const trackIndex = tracks.findIndex(t => t.id === dragOverTrack);
      if (trackIndex >= 0) {
        const trackY = RULER_HEIGHT + (trackIndex * TRACK_HEIGHT);
        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
        ctx.fillRect(0, trackY, rect.width, TRACK_HEIGHT);
        
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, trackY, rect.width, TRACK_HEIGHT);
      }
    }

    // Draw dragged clip preview
    if (isDraggingClip && draggedClip) {
      const clipX = timeToPixels(draggedClip.startTime - viewportStart, 100, zoomLevel);
      const clipWidth = timeToPixels(draggedClip.endTime - draggedClip.startTime, 100, zoomLevel);
      
      // Find target track position
      let targetTrackY = RULER_HEIGHT;
      if (dropTarget) {
        const targetTrackIndex = tracks.findIndex(t => t.id === dropTarget.trackId);
        if (targetTrackIndex >= 0) {
          targetTrackY = RULER_HEIGHT + (targetTrackIndex * TRACK_HEIGHT);
        }
      }
      
      const clipY = targetTrackY + TRACK_PADDING;
      const clipHeight = WAVEFORM_HEIGHT;
      
      // Draw semi-transparent preview
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = draggedClip.trackId ? tracks.find(t => t.id === draggedClip.trackId)?.color + '60' : '#3498db60';
      ctx.fillRect(clipX, clipY, clipWidth, clipHeight);
      
      ctx.strokeStyle = draggedClip.trackId ? tracks.find(t => t.id === draggedClip.trackId)?.color : '#3498db';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(clipX, clipY, clipWidth, clipHeight);
      
      // Draw clip name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(draggedClip.name, clipX + 4, clipY + 16);
      
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
    }

    // Draw playhead last (on top)
    drawPlayhead(ctx, timelineHeight);

  }, [
    tracks, currentTime, viewportStart, PIXELS_PER_SECOND, RULER_HEIGHT, TRACK_HEIGHT,
    TRACK_PADDING, WAVEFORM_HEIGHT, timelineHeight, hoveredTrack, selection,
    snapGuides, dragOverTrack, isDraggingClip, draggedClip, dropTarget,
    selectedTool, razorGuideX,
    drawTimeRuler, drawWaveform, drawTrackClips, drawPlayhead
  ]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (typeof document === 'undefined') return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragleave', handleDragLeave);
    canvas.addEventListener('drop', handleDrop);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('dragleave', handleDragLeave);
      canvas.removeEventListener('drop', handleDrop);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleDragOver, handleDragLeave, handleDrop]);

  // Render when props change
  useEffect(() => {
    renderTimeline();
  }, [renderTimeline]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(renderTimeline, 10);
    };

    if (typeof document === 'undefined') return;

    document.addEventListener('resize', handleResize);
    return () => document.removeEventListener('resize', handleResize);
  }, [renderTimeline]);

  return (
    <div 
      ref={ref || containerRef}
      className={`multi-track-timeline ${className}`}
      style={{
        width: '100%',
        height: Math.max(timelineHeight, 300), // Ensure minimum height
        minHeight: '300px',
        overflow: 'hidden',
        cursor: selectedTool === 'razor' ? 'crosshair' : 'default',
        background: '#1a1a1a', // Ensure visible background
        ...style
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
});

export default MultiTrackTimeline;
