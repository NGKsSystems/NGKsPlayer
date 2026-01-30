import React, { useRef, useEffect, useCallback, useState } from 'react';
import { formatTime } from '../utils/timeUtils';

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
const MultiTrackTimeline = ({
  tracks = [],
  currentTime = 0,
  isPlaying = false,
  zoomLevel = 1,
  viewportStart = 0,
  onSeek,
  onSelectionChange,
  onClipMove,
  onClipCreate,
  onFileImport,
  selectedTool = 'selection',
  className = '',
  style = {}
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selection, setSelection] = useState(null);
  const [hoveredTrack, setHoveredTrack] = useState(null);
  
  // Drag & Drop state
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState(null);
  const [snapGuides, setSnapGuides] = useState([]);
  
  // File drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverTrack, setDragOverTrack] = useState(null);
  
  // Timeline dimensions and settings
  const TRACK_HEIGHT = 80;
  const TRACK_PADDING = 4;
  const RULER_HEIGHT = 30;
  const PIXELS_PER_SECOND = 100 * zoomLevel;
  const WAVEFORM_HEIGHT = TRACK_HEIGHT - (TRACK_PADDING * 2);
  const SNAP_THRESHOLD = 8; // pixels
  const GRID_SNAP_INTERVAL = 1; // seconds

  // Calculate timeline dimensions
  const maxDuration = Math.max(...tracks.filter(t => t.audioBuffer).map(t => t.audioBuffer.duration), 0);
  const timelineWidth = Math.max(maxDuration * PIXELS_PER_SECOND, 1000);
  const timelineHeight = RULER_HEIGHT + (tracks.length * TRACK_HEIGHT);

  // Snap to grid helper
  const snapToGrid = useCallback((time) => {
    const gridInterval = GRID_SNAP_INTERVAL / zoomLevel; // Smaller intervals when zoomed in
    return Math.round(time / gridInterval) * gridInterval;
  }, [zoomLevel, GRID_SNAP_INTERVAL]);

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
  const snapTime = useCallback((time, excludeClipId = null) => {
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
      const clipX = clip.startTime * PIXELS_PER_SECOND - (viewportStart * PIXELS_PER_SECOND);
      const clipWidth = clip.duration * PIXELS_PER_SECOND;
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
      const x = (second * PIXELS_PER_SECOND) - (viewportStart * PIXELS_PER_SECOND);
      
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
            const minorX = (minorSecond * PIXELS_PER_SECOND) - (viewportStart * PIXELS_PER_SECOND);
            
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
    const playheadX = (currentTime * PIXELS_PER_SECOND) - (viewportStart * PIXELS_PER_SECOND);
    
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
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw time ruler
    drawTimeRuler(ctx, rect.width);

    // Draw tracks
    tracks.forEach((track, index) => {
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
        
        drawWaveform(
          ctx, 
          track.audioBuffer, 
          waveformX, 
          trackY + TRACK_PADDING, 
          waveformWidth, 
          WAVEFORM_HEIGHT, 
          track.color
        );
      }

      // Draw track clips
      drawTrackClips(ctx, track, trackY);

      // Track name overlay
      ctx.fillStyle = 'rgba(44, 62, 80, 0.9)';
      ctx.fillRect(4, trackY + 4, 120, 20);
      ctx.fillStyle = '#ecf0f1';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(track.name, 8, trackY + 16);
    });

    // Draw selection if active
    if (selection) {
      ctx.fillStyle = 'rgba(52, 152, 219, 0.3)';
      ctx.strokeStyle = '#3498db';
      ctx.lineWidth = 1;
      ctx.fillRect(selection.startX, selection.startY, selection.width, selection.height);
      ctx.strokeRect(selection.startX, selection.startY, selection.width, selection.height);
    }

    // Draw playhead last (on top)
    drawPlayhead(ctx, timelineHeight);

  }, [
    tracks, currentTime, viewportStart, PIXELS_PER_SECOND, RULER_HEIGHT, TRACK_HEIGHT,
    TRACK_PADDING, WAVEFORM_HEIGHT, timelineHeight, hoveredTrack, selection,
    drawTimeRuler, drawWaveform, drawTrackClips, drawPlayhead
  ]);

  // Handle mouse events
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to timeline coordinates
    const timelineX = x + (viewportStart * PIXELS_PER_SECOND);
    const timelineTime = timelineX / PIXELS_PER_SECOND;

    // Check if clicking on ruler for seeking
    if (y <= RULER_HEIGHT) {
      onSeek?.(timelineTime);
      return;
    }

    // Handle track interaction
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
    if (trackIndex >= 0 && trackIndex < tracks.length) {
      const track = tracks[trackIndex];
      
      // Check if clicking on a clip for dragging (for all tools)
      if (track.clips) {
        for (const clip of track.clips) {
          const clipX = (clip.startTime * PIXELS_PER_SECOND) - (viewportStart * PIXELS_PER_SECOND);
          const clipWidth = (clip.endTime - clip.startTime) * PIXELS_PER_SECOND;
          
          if (x >= clipX && x <= clipX + clipWidth) {
            if (selectedTool === 'selection') {
              // Start dragging this clip
              setIsDraggingClip(true);
              setDraggedClip({
                ...clip,
                trackId: track.id,
                originalTrackId: track.id,
                originalStartTime: clip.startTime
              });
              setDragOffset({
                x: x - clipX,
                y: y - (RULER_HEIGHT + (trackIndex * TRACK_HEIGHT))
              });
              
              // Prevent other interactions
              return;
            } else if (selectedTool === 'razor') {
              // TODO: Implement razor tool for cutting clips
              console.log('Razor tool at:', timelineTime, 'on clip:', clip.id);
              return;
            }
          }
        }
      }
      
      if (selectedTool === 'selection') {
        setIsDragging(true);
        setDragStart({ x, y, time: timelineTime, trackId: track.id });
      } else if (selectedTool === 'razor') {
        // TODO: Implement razor tool for cutting clips
        console.log('Razor tool at:', timelineTime, 'on track:', track.name);
      }
    }
  }, [onSeek, viewportStart, PIXELS_PER_SECOND, RULER_HEIGHT, TRACK_HEIGHT, tracks, selectedTool]);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update hovered track
    if (y > RULER_HEIGHT) {
      const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
      if (trackIndex >= 0 && trackIndex < tracks.length) {
        setHoveredTrack(tracks[trackIndex].id);
      } else {
        setHoveredTrack(null);
      }
    } else {
      setHoveredTrack(null);
    }

    // Handle clip dragging
    if (isDraggingClip && draggedClip) {
      // Calculate new position with viewport offset
      const timelineX = x + (viewportStart * PIXELS_PER_SECOND);
      const newStartTime = Math.max(0, (timelineX - dragOffset.x) / PIXELS_PER_SECOND);
      const snappedTime = snapTime(newStartTime, draggedClip.id);
      
      // Determine which track we're over
      let targetTrackIndex = -1;
      if (y > RULER_HEIGHT) {
        targetTrackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
        if (targetTrackIndex >= tracks.length) targetTrackIndex = -1;
      }
      
      // Update drag state
      setDraggedClip(prev => ({
        ...prev,
        startTime: snappedTime,
        endTime: snappedTime + (prev.endTime - prev.originalStartTime)
      }));
      
      if (targetTrackIndex >= 0) {
        setDragOverTrack(tracks[targetTrackIndex].id);
        setDropTarget({
          trackId: tracks[targetTrackIndex].id,
          time: snappedTime
        });
      } else {
        setDragOverTrack(null);
        setDropTarget(null);
      }
      
      // Update snap guides
      const snapPoints = findSnapPoints(draggedClip.id);
      const activeSnaps = snapPoints.filter(point => 
        Math.abs((point - snappedTime) * PIXELS_PER_SECOND) < SNAP_THRESHOLD
      );
      setSnapGuides(activeSnaps);
      
      return; // Skip selection handling when dragging clips
    }

    // Handle dragging for selection
    if (isDragging && dragStart) {
      const startX = Math.min(dragStart.x, x);
      const endX = Math.max(dragStart.x, x);
      const startY = Math.min(dragStart.y, y);
      const endY = Math.max(dragStart.y, y);

      setSelection({
        startX,
        startY,
        width: endX - startX,
        height: endY - startY
      });
    }
  }, [isDragging, dragStart, RULER_HEIGHT, TRACK_HEIGHT, tracks]);

  const handleMouseUp = useCallback((e) => {
    // Handle clip dragging completion
    if (isDraggingClip && draggedClip && dropTarget) {
      // Apply the drag operation
      const updatedClip = {
        ...draggedClip,
        startTime: dropTarget.time,
        endTime: dropTarget.time + (draggedClip.endTime - draggedClip.originalStartTime)
      };
      
      if (dropTarget.trackId !== draggedClip.originalTrackId) {
        // Move clip to different track
        if (onClipMove) {
          onClipMove(draggedClip.id, draggedClip.originalTrackId, dropTarget.trackId, updatedClip);
        }
      } else {
        // Same track, just reposition
        if (onClipUpdate) {
          onClipUpdate(draggedClip.id, updatedClip);
        }
      }
    }

    // Reset clip drag state
    if (isDraggingClip) {
      setIsDraggingClip(false);
      setDraggedClip(null);
      setDragOffset({ x: 0, y: 0 });
      setDropTarget(null);
      setSnapGuides([]);
      setDragOverTrack(null);
      return; // Skip selection handling
    }

    // Handle selection completion
    if (isDragging && dragStart && selection) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      
      // Convert selection to time range
      const startTime = Math.min(dragStart.time, (endX + viewportStart * PIXELS_PER_SECOND) / PIXELS_PER_SECOND);
      const endTime = Math.max(dragStart.time, (endX + viewportStart * PIXELS_PER_SECOND) / PIXELS_PER_SECOND);

      onSelectionChange?.({
        startTime,
        endTime,
        duration: endTime - startTime,
        trackId: dragStart.trackId
      });
    }

    setIsDragging(false);
    setDragStart(null);
    setSelection(null);
  }, [isDraggingClip, draggedClip, dropTarget, onClipMove, onClipUpdate, 
      isDragging, dragStart, selection, onSelectionChange, viewportStart, PIXELS_PER_SECOND]);

  // Set up event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Render when props change
  useEffect(() => {
    renderTimeline();
  }, [renderTimeline]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      setTimeout(renderTimeline, 10);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderTimeline]);

  return (
    <div 
      ref={containerRef}
      className={`multi-track-timeline ${className}`}
      style={{
        width: '100%',
        height: timelineHeight,
        overflow: 'hidden',
        cursor: selectedTool === 'razor' ? 'crosshair' : 'default',
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
};

export default MultiTrackTimeline;