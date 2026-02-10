/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TimelineRuler.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef } from 'react';
import './TimelineRuler.css';
import { useTimelineRulerController } from '../hooks/useTimelineRulerController';

/**
 * Professional Timeline Ruler with Markers & Loop Regions
 * Adobe Premiere Pro / Pro Tools style timeline navigation
 * Fixed React hook dependency errors
 */
const TimelineRuler = ({ 
  duration = 0, // Changed from 100 to 0 to better detect missing duration
  currentTime = 0, 
  viewportStart = 0,
  zoomLevel = 1,
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

  // Interaction state & handlers from hook
  const {
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
  } = useTimelineRulerController({
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
  });

  return (
    <div 
      className="timeline-ruler" 
      ref={rulerRef} 
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        height: '80px',
        background: 'linear-gradient(to bottom, #2A2A2A, #1E1E1E)',
        borderBottom: '1px solid #444',
        overflow: 'hidden', // Changed from 'auto' to 'hidden' since scrolling is handled by parent
        cursor: 'crosshair',
        userSelect: 'none'
      }}
    >
      {/* Ruler Background */}
      <div 
        className="ruler-background" 
        style={{ 
          width: `${timelineWidth}px`, // Full timeline width for scrolling
          position: 'relative',
          height: '100%'
        }}
      >
        
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
          style={{
            position: 'absolute',
            left: playheadPosition,
            top: 0,
            width: '2px',
            height: '100%',
            backgroundColor: '#00D4FF',
            pointerEvents: 'none',
            zIndex: 100,
            boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-6px',
              width: '14px',
              height: '14px',
              backgroundColor: '#00D4FF',
              borderRadius: '2px',
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.8)'
            }}
          />
        </div>
        
        {/* Loop Creation Preview */}
        {isCreatingLoop && loopStart !== null && (
          <div
            className="loop-preview"
            style={{
              left: timeToPixel(loopStart),
              width: Math.max(0, timeToPixel(pixelToTime(currentMouseX)) - timeToPixel(loopStart))
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
