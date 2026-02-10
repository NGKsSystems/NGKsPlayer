/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useProfessionalTimelineController.js
 * Purpose: Interaction state + handlers extracted from ProfessionalTimeline.jsx
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useCallback, useEffect, useState } from 'react';
import { timeToPixels, snapTime } from '../timeline/timelineMath.js';

/**
 * Hook that owns all interaction state and handlers for ProfessionalTimeline.
 * The component retains rendering/layout only.
 */
export function useProfessionalTimelineController({
  timelineRef,
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
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  contextMenu: contextMenuPos,
}) {
  // Drag state for clips
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMenuTrack, setContextMenuTrack] = useState(null);
  const [contextMenuClip, setContextMenuClip] = useState(null);

  // Handle horizontal scrolling for viewport changes
  const handleScroll = useCallback((e) => {
    if (onViewportChange) {
      const scrollLeft = e.target.scrollLeft;
      const newViewportStart = scrollLeft / PIXELS_PER_SECOND;
      onViewportChange(newViewportStart);
    }
  }, [PIXELS_PER_SECOND, onViewportChange]);

  // Sync scroll position when viewport changes programmatically (e.g., from zoom)
  useEffect(() => {
    if (timelineRef.current) {
      const targetScrollLeft = timeToPixels(viewportStart, 50, zoomLevel);
      timelineRef.current.scrollLeft = targetScrollLeft;
    }
  }, [viewportStart, PIXELS_PER_SECOND]);

  // Clip drag handlers
  const handleClipMouseDown = useCallback((e, clip) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectedTool === 'razor') {
      // Handle razor tool
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clipTime = x / PIXELS_PER_SECOND;
      const globalTime = clip.startTime + clipTime;
      
      if (onClipSplit) {
        onClipSplit(clip.id, globalTime);
      }
      return;
    }
    
    // Start dragging
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setIsDraggingClip(true);
    setDraggedClip(clip);
    setDragOffset({ x: offsetX, y: offsetY });
    
    // Set up drag preview
    setDragPreview({
      x: e.clientX - offsetX,
      y: e.clientY - offsetY,
      width: rect.width,
      height: rect.height,
      clip
    });
    
    // Select the clip
    if (onClipSelect) {
      onClipSelect(clip);
    }
  }, [selectedTool, PIXELS_PER_SECOND, onClipSplit, onClipSelect]);

  // Handle mouse move for clip dragging
  const handleMouseMove = useCallback((e) => {
    if (!isDraggingClip || !draggedClip || !timelineRef.current) return;
    
    const timelineRect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    
    // Calculate new position
    const x = e.clientX - timelineRect.left + scrollLeft - dragOffset.x;
    const y = e.clientY - timelineRect.top - dragOffset.y;
    
    // Update drag preview
    setDragPreview(prev => ({
      ...prev,
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    }));
    
    // Calculate snap position (every 0.1 seconds)
    const newStartTime = snapTime(x / PIXELS_PER_SECOND, 0.1);
    
    // Determine target track
    const trackIndex = Math.floor(y / TRACK_HEIGHT);
    const targetTrack = tracks[trackIndex];
    
    if (targetTrack) {
      // Update drag preview with snap time
      setDragPreview(prev => ({
        ...prev,
        snapTime: newStartTime,
        targetTrackId: targetTrack.id
      }));
    }
  }, [isDraggingClip, draggedClip, dragOffset, PIXELS_PER_SECOND, TRACK_HEIGHT, tracks]);

  // Handle mouse up for clip dragging
  const handleMouseUp = useCallback((e) => {
    if (!isDraggingClip || !draggedClip) {
      setIsDraggingClip(false);
      setDraggedClip(null);
      setDragOffset({ x: 0, y: 0 });
      setDragPreview(null);
      return;
    }

    if (dragPreview && dragPreview.snapTime !== undefined && dragPreview.targetTrackId) {
      const { snapTime, targetTrackId } = dragPreview;
      
      if (snapTime !== undefined && targetTrackId) {
        // Calculate new clip timing
        const clipDuration = draggedClip.endTime - draggedClip.startTime;
        const updatedClip = {
          ...draggedClip,
          startTime: snapTime,
          endTime: snapTime + clipDuration
        };
        
        // Find original track
        const originalTrack = tracks.find(track => 
          track.clips?.some(clip => clip.id === draggedClip.id)
        );
        
        if (originalTrack && originalTrack.id !== targetTrackId) {
          // Moving to different track
          if (onClipMove) {
            onClipMove(draggedClip.id, originalTrack.id, targetTrackId, updatedClip);
          }
        } else if (snapTime !== draggedClip.startTime) {
          // Same track, different position
          if (onClipMove) {
            onClipMove(draggedClip.id, targetTrackId, targetTrackId, updatedClip);
          }
        }
      }
    }
    
    // Reset drag state
    setIsDraggingClip(false);
    setDraggedClip(null);
    setDragOffset({ x: 0, y: 0 });
    setDragPreview(null);
  }, [isDraggingClip, draggedClip, dragPreview, tracks, onClipMove]);

  // Set up global mouse events for dragging
  useEffect(() => {
    if (isDraggingClip) {
      if (typeof document === 'undefined') return;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingClip, handleMouseMove, handleMouseUp]);

  // Handle track right-click context menu
  const handleTrackContextMenu = useCallback((e, track) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate optimal position to prevent off-screen menu
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 300; // Approximate menu height
    const viewportWidth = typeof document !== 'undefined' ? document.documentElement.clientWidth : 1920;
    const viewportHeight = typeof document !== 'undefined' ? document.documentElement.clientHeight : 1080;
    
    let x = e.pageX;
    let y = e.pageY;
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins from edges
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenu({ x, y });
    setContextMenuTrack(track);
    setContextMenuClip(null); // Clear clip context menu
  }, []);

  // Handle clip right-click context menu
  const handleClipContextMenu = useCallback((e, clip) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate optimal position to prevent off-screen menu
    const menuWidth = 200; // Approximate menu width
    const menuHeight = 400; // Approximate menu height (clips have more options)
    const viewportWidth = typeof document !== 'undefined' ? document.documentElement.clientWidth : 1920;
    const viewportHeight = typeof document !== 'undefined' ? document.documentElement.clientHeight : 1080;
    
    let x = e.pageX;
    let y = e.pageY;
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    // Ensure minimum margins from edges
    x = Math.max(10, x);
    y = Math.max(10, y);
    
    setContextMenu({ x, y });
    setContextMenuClip(clip);
    setContextMenuTrack(null); // Clear track context menu
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setContextMenuTrack(null);
    setContextMenuClip(null);
  }, []);

  // Context menu actions
  const handleContextMenuAction = useCallback((action) => {
    // Handle global actions first
    if (action === 'undo') {
      if (onUndo && canUndo) {
        onUndo();
      }
      closeContextMenu();
      return;
    }
    
    if (action === 'redo') {
      if (onRedo && canRedo) {
        onRedo();
      }
      closeContextMenu();
      return;
    }

    // Handle clip actions
    if (contextMenuClip) {
      switch (action) {
        case 'delete':
          if (onClipDelete) {
            onClipDelete(contextMenuClip.id);
          }
          break;
        case 'cut':
          // TODO: Implement clip cutting at current playhead position
          console.log('Cut clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'copy':
          // TODO: Implement clip copying
          console.log('Copy clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'duplicate':
          // TODO: Implement clip duplication
          console.log('Duplicate clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'fadeIn':
          // TODO: Implement fade in effect
          console.log('Add fade in to clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'fadeOut':
          // TODO: Implement fade out effect
          console.log('Add fade out to clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'normalize':
          // TODO: Implement audio normalization
          console.log('Normalize clip:', contextMenuClip.name || 'Audio Clip');
          break;
        case 'extractStems':
          // Trigger stem extraction from clip's source file
          if (contextMenuClip?.originalFile?.path && onTrackContextMenu) {
            // Find the track that contains this clip
            const track = tracks.find(t => t.clips.some(c => c.id === contextMenuClip.id));
            if (track) {
              // Create a fake event with the file path
              const fakeEvent = {
                preventDefault: () => {},
                clientX: contextMenu.x,
                clientY: contextMenu.y
              };
              onTrackContextMenu(fakeEvent, track.id);
            }
          } else {
            alert('No source file available for stem extraction. The clip must have an original audio file.');
          }
          break;
      }
    }
    
    // Handle track actions  
    if (contextMenuTrack) {
      switch (action) {
        case 'delete':
          if (onTrackDelete) {
            onTrackDelete(contextMenuTrack.id);
          }
          break;
        case 'rename':
          const newName = prompt('Enter new track name:', contextMenuTrack.name || 'Track');
          if (newName && newName !== contextMenuTrack.name && onTrackNameChange) {
            onTrackNameChange(contextMenuTrack.id, newName);
          }
          break;
        case 'duplicate':
          // Create a duplicate track
          if (onTrackSelect) {
            // This would need to be implemented in the parent component
            console.log('Duplicate track:', contextMenuTrack.name);
          }
          break;
        case 'mute':
          if (onTrackMute) {
            onTrackMute(contextMenuTrack.id);
          }
          break;
        case 'solo':
          if (onTrackSolo) {
            onTrackSolo(contextMenuTrack.id);
          }
          break;
        case 'moveUp':
          if (onTrackMoveUp) {
            const trackIndex = tracks.findIndex(t => t.id === contextMenuTrack.id);
            onTrackMoveUp(trackIndex);
          }
          break;
        case 'moveDown':
          if (onTrackMoveDown) {
            const trackIndex = tracks.findIndex(t => t.id === contextMenuTrack.id);
            onTrackMoveDown(trackIndex);
          }
          break;
      }
    }
    
    closeContextMenu();
  }, [contextMenuClip, contextMenuTrack, onClipDelete, onTrackDelete, onTrackNameChange, onTrackMute, onTrackSolo, onTrackMoveUp, onTrackMoveDown, onTrackSelect, tracks, closeContextMenu, onUndo, onRedo, canUndo, canRedo]);

  // Close context menu on click outside
  useEffect(() => {
    if (contextMenu) {
      if (typeof document === 'undefined') return;

      const handleClickOutside = (e) => {
        // Don't close if clicking inside the context menu
        if (!e.target.closest('[data-context-menu]')) {
          closeContextMenu();
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu, closeContextMenu]);
  
  // Handle timeline click for playhead positioning
  const handleTimelineClick = useCallback((e) => {
    if (selectedTool === 'razor' || isDraggingClip) return; // Don't move playhead in razor mode or when dragging
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    // Account for scroll position directly since we're using native scrolling
    const scrollLeft = e.currentTarget.scrollLeft || 0;
    const time = (x + scrollLeft) / PIXELS_PER_SECOND;
    const clampedTime = Math.max(0, Math.min(time, duration));
    
    if (onTimelineClick) {
      onTimelineClick(clampedTime);
    }
  }, [selectedTool, isDraggingClip, PIXELS_PER_SECOND, duration, onTimelineClick]);

  // Handle clip click
  const handleClipClick = useCallback((e, clip) => {
    // Handled by mousedown for better drag performance
  }, []);

  return {
    // Drag state
    isDraggingClip,
    draggedClip,
    dragPreview,
    // Context menu state
    contextMenu,
    contextMenuTrack,
    contextMenuClip,
    // Handlers
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
