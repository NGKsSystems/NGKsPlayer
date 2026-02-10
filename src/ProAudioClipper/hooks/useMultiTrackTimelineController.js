/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useMultiTrackTimelineController.js
 * Purpose: Interaction handlers extracted from MultiTrackTimeline
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useCallback, useState } from 'react';
import { timeToPixels } from '../timeline/timelineMath.js';

export function useMultiTrackTimelineController({
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
}) {
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [selection, setSelection] = useState(null);
  const [hoveredTrack, setHoveredTrack] = useState(null);

  // Clip drag & drop state
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dropTarget, setDropTarget] = useState(null);
  const [snapGuides, setSnapGuides] = useState([]);

  // File drag & drop state
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverTrack, setDragOverTrack] = useState(null);

  // Razor tool state
  const [razorGuideX, setRazorGuideX] = useState(null);

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
              // Implement razor tool for cutting clips
              if (onClipSplit) {
                onClipSplit(clip.id, timelineTime);
              }
              return;
            }
          }
        }
      }
      
      if (selectedTool === 'selection') {
        setIsDragging(true);
        setDragStart({ x, y, time: timelineTime, trackId: track.id });
      } else if (selectedTool === 'razor') {
        // Razor tool on empty space - look for any clips at this time across all tracks
        let foundClip = false;
        tracks.forEach(track => {
          if (track.clips) {
            track.clips.forEach(clip => {
              if (timelineTime >= clip.startTime && timelineTime <= clip.endTime) {
                if (onClipSplit) {
                  onClipSplit(clip.id, timelineTime);
                  foundClip = true;
                }
              }
            });
          }
        });
        
        if (!foundClip) {
          console.log('Razor tool: No clip found at time:', timelineTime);
        }
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

    // Handle razor tool guide line
    if (selectedTool === 'razor') {
      setRazorGuideX(x);
    } else {
      setRazorGuideX(null);
    }

    // Handle clip dragging
    if (isDraggingClip && draggedClip) {
      // Calculate new position with viewport offset
      const timelineX = x + (viewportStart * PIXELS_PER_SECOND);
      const newStartTime = Math.max(0, (timelineX - dragOffset.x) / PIXELS_PER_SECOND);
      const snappedTime = snapTimeToPoints(newStartTime, draggedClip.id);
      
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

  // File drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const y = e.clientY - rect.top;
    
    if (y > RULER_HEIGHT) {
      const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
      if (trackIndex >= 0 && trackIndex < tracks.length) {
        setIsDragOver(true);
        setDragOverTrack(tracks[trackIndex].id);
      }
    }
  }, [RULER_HEIGHT, TRACK_HEIGHT, tracks]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear if leaving the timeline container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setDragOverTrack(null);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    
    if (audioFiles.length > 0 && dragOverTrack) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const x = e.clientX - rect.left;
      const timelineX = x + (viewportStart * PIXELS_PER_SECOND);
      const dropTime = Math.max(0, timelineX / PIXELS_PER_SECOND);
      const snappedTime = snapTimeToPoints(dropTime);
      
      if (onFileImport) {
        onFileImport(audioFiles[0], dragOverTrack, snappedTime);
      }
    }
    
    setIsDragOver(false);
    setDragOverTrack(null);
  }, [dragOverTrack, viewportStart, PIXELS_PER_SECOND, snapTimeToPoints, onFileImport]);

  return {
    // State (needed by renderer)
    isDragging,
    selection,
    hoveredTrack,
    isDraggingClip,
    draggedClip,
    dropTarget,
    snapGuides,
    isDragOver,
    dragOverTrack,
    razorGuideX,
    // Handlers
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
