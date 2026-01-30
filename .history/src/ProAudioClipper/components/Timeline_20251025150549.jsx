import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * Professional Timeline Component - Simplified for initial load
 */
const Timeline = forwardRef(({
  audioBuffer,
  duration = 0,
  currentTime = 0,
  zoomLevel = 1,
  viewportStart = 0,
  selectionStart,
  selectionEnd,
  clips = [],
  selectedClips = new Set(),
  selectedTool = 'selection',
  onTimelineClick,
  onTimelineDrag,
  onViewportChange,
  onSeek
}, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    redraw: () => {
      console.log('Timeline redraw called');
    },
    scrollToTime: (time) => {
      console.log('Scroll to time:', time);
    }
  }));

  // Simple click handler
  const handleClick = useCallback((e) => {
    if (!onTimelineClick) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / rect.width) * duration;
    
    onTimelineClick(time, e);
  }, [duration, onTimelineClick]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: '100%',
        height: '200px',
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        margin: '16px',
        position: 'relative',
        cursor: 'crosshair'
      }}
      onClick={handleClick}
    >
      <div style={{
        padding: '12px 16px',
        background: '#2a2a2a',
        borderBottom: '1px solid #444',
        color: '#00d4ff',
        fontSize: '16px',
        fontWeight: '600'
      }}>
        Timeline - {selectedTool === 'selection' ? 'Selection Tool' : 'Razor Tool'} | Zoom: {zoomLevel.toFixed(1)}x
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '16px',
        color: '#b0b0b0',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        Duration: {duration.toFixed(2)}s | Current: {currentTime.toFixed(2)}s
        {selectionStart !== null && selectionEnd !== null && (
          ` | Selection: ${(selectionEnd - selectionStart).toFixed(2)}s`
        )}
      </div>
      
      {/* Simple progress bar */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '16px',
        right: '16px',
        height: '4px',
        background: '#333',
        borderRadius: '2px'
      }}>
        <div style={{
          width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
          height: '100%',
          background: '#ff5722',
          borderRadius: '2px',
          transition: 'width 0.1s ease'
        }} />
      </div>
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;