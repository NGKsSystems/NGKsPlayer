import React, { useState, useCallback, useRef, useEffect } from 'react';
import './TimelineRuler.css';

/**
 * Professional Timeline Ruler with Markers & Loop Regions
 * Adobe Premiere Pro / Pro Tools style timeline navigation
 */
const TimelineRuler = ({ 
  duration = 100, 
  currentTime = 0, 
  onTimeChange,
  markers = [],
  loopRegions = [],
  activeLoopRegion = null,
  onAddMarker,
  onSelectMarker,
  onMoveMarker,
  onSelectLoopRegion,
  onAddLoopRegion,
  onResizeLoopRegion,
  selectedMarkerId = null,
  selectedLoopId = null,
  zoom = 1,
  pixelsPerSecond = 50
}) => {
  const rulerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState(null); // 'playhead', 'marker', 'loop-start', 'loop-end'
  const [dragTarget, setDragTarget] = useState(null);
  const [isCreatingLoop, setIsCreatingLoop] = useState(false);
  const [loopStart, setLoopStart] = useState(null);

  const timelineWidth = duration * pixelsPerSecond * zoom;
  const playheadPosition = (currentTime / duration) * timelineWidth;

  // Time formatting
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Convert pixel position to time
  const pixelToTime = useCallback((pixelX) => {
    if (!rulerRef.current) return 0;
    const rect = rulerRef.current.getBoundingClientRect();
    const relativeX = pixelX - rect.left;
    const timeRatio = relativeX / timelineWidth;
    return Math.max(0, Math.min(duration, timeRatio * duration));
  }, [timelineWidth, duration]);

  // Convert time to pixel position
  const timeToPixel = useCallback((time) => {
    return (time / duration) * timelineWidth;
  }, [duration, timelineWidth]);

  // Generate ruler tick marks
  const generateTicks = useCallback(() => {
    const ticks = [];
    const majorTickInterval = Math.max(1, Math.floor(10 / zoom));
    const minorTickInterval = Math.max(0.1, majorTickInterval / 10);
    
    for (let time = 0; time <= duration; time += minorTickInterval) {
      const isMajor = time % majorTickInterval === 0;
      const position = timeToPixel(time);
      
      ticks.push({
        time,
        position,
        isMajor,
        label: isMajor ? formatTime(time) : null
      });
    }
    
    return ticks;
  }, [duration, zoom, timeToPixel, formatTime]);

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
  }, [markers, loopRegions, pixelToTime, timeToPixel, onSelectMarker, onSelectLoopRegion, onAddMarker, onTimeChange]);

  const handleMouseMove = useCallback((e) => {
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
  }, [isDragging, dragType, dragTarget, pixelToTime, onTimeChange, onMoveMarker, onResizeLoopRegion, loopRegions]);

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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isCreatingLoop, handleMouseMove, handleMouseUp]);

  const ticks = generateTicks();

  return (
    <div className="timeline-ruler" ref={rulerRef} onMouseDown={handleMouseDown}>
      {/* Ruler Background */}
      <div className="ruler-background" style={{ width: timelineWidth }}>
        
        {/* Loop Regions */}
        {loopRegions.map(loop => {
          const startPos = timeToPixel(loop.startTime);
          const width = timeToPixel(loop.endTime) - startPos;
          const isActive = activeLoopRegion?.id === loop.id;
          const isSelected = selectedLoopId === loop.id;
          
          return (
            <div
              key={`loop-${loop.id}`}
              className={`loop-region ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
              style={{
                left: startPos,
                width: width,
                backgroundColor: loop.color + '20',
                borderColor: loop.color
              }}
            >
              <div className="loop-handle loop-start" />
              <div className="loop-label">{loop.name}</div>
              <div className="loop-handle loop-end" />
            </div>
          );
        })}
        
        {/* Tick Marks */}
        {ticks.map((tick, index) => (
          <div
            key={index}
            className={`tick ${tick.isMajor ? 'major' : 'minor'}`}
            style={{ left: tick.position }}
          >
            {tick.label && (
              <span className="tick-label">{tick.label}</span>
            )}
          </div>
        ))}
        
        {/* Markers */}
        {markers.map(marker => {
          const position = timeToPixel(marker.time);
          const isSelected = selectedMarkerId === marker.id;
          
          return (
            <div
              key={`marker-${marker.id}`}
              className={`marker ${isSelected ? 'selected' : ''}`}
              style={{
                left: position,
                borderColor: marker.color
              }}
              title={`${marker.name} - ${formatTime(marker.time)}`}
            >
              <div className="marker-flag" style={{ backgroundColor: marker.color }}>
                <span className="marker-name">{marker.name}</span>
              </div>
            </div>
          );
        })}
        
        {/* Playhead */}
        <div
          className="playhead"
          style={{ left: playheadPosition }}
        >
          <div className="playhead-line" />
          <div className="playhead-handle" />
        </div>
        
        {/* Loop Creation Preview */}
        {isCreatingLoop && loopStart !== null && (
          <div
            className="loop-preview"
            style={{
              left: timeToPixel(loopStart),
              width: Math.max(0, timeToPixel(pixelToTime(window.event?.clientX || 0)) - timeToPixel(loopStart))
            }}
          />
        )}
      </div>
      
      {/* Instructions */}
      <div className="ruler-instructions">
        Alt+Click: Add Marker | Shift+Click+Drag: Create Loop Region
      </div>
    </div>
  );
};

export default TimelineRuler;