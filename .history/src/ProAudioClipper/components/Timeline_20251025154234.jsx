import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import './Timeline.css';

/**
 * Professional Timeline Component
 * 
 * Features:
 * - High-quality waveform rendering
 * - Precise scrubbing and seeking
 * - Visual selection areas
 * - Clip indicators
 * - Zoom and scroll functionality
 * - Snap-to-grid support
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
  const waveformCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hoveredTime, setHoveredTime] = useState(null);
  
  // Constants
  const TIMELINE_HEIGHT = 200;
  const WAVEFORM_HEIGHT = 120;
  const RULER_HEIGHT = 40;
  const PIXELS_PER_SECOND = 100; // Base scale
  
  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    redraw: () => {
      drawWaveform();
      drawTimeline();
    },
    scrollToTime: (time) => {
      const pixelPosition = time * PIXELS_PER_SECOND * zoomLevel;
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = pixelPosition - (scrollRef.current.clientWidth / 2);
      }
    }
  }));

  // Calculate dimensions
  const timelineWidth = duration * PIXELS_PER_SECOND * zoomLevel;
  const viewportWidth = containerRef.current?.clientWidth || 800;
  const viewportDuration = viewportWidth / (PIXELS_PER_SECOND * zoomLevel);

  // Time conversion utilities
  const timeToPixel = useCallback((time) => {
    return (time - viewportStart) * PIXELS_PER_SECOND * zoomLevel;
  }, [viewportStart, zoomLevel]);

  const pixelToTime = useCallback((pixel) => {
    return (pixel / (PIXELS_PER_SECOND * zoomLevel)) + viewportStart;
  }, [viewportStart, zoomLevel]);

  // Draw waveform
  const drawWaveform = useCallback(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas || !audioBuffer) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;
    const totalSamples = channelData.length;
    const audioDuration = totalSamples / sampleRate;
    
    // Calculate time range visible in current viewport
    const viewportDuration = width / (PIXELS_PER_SECOND * zoomLevel);
    const viewportEndTime = viewportStart + viewportDuration;
    
    // Draw waveform
    ctx.strokeStyle = '#4CAF50';
    ctx.fillStyle = '#2E7D32';
    ctx.lineWidth = 1;

    const centerY = height / 2;
    
    for (let x = 0; x < width; x++) {
      // Convert pixel position to actual audio time
      const timeAtPixel = viewportStart + (x / width) * viewportDuration;
      
      // Skip if time is outside audio bounds
      if (timeAtPixel < 0 || timeAtPixel >= audioDuration) {
        continue;
      }
      
      // Convert time to sample index
      const sampleIndex = Math.floor(timeAtPixel * sampleRate);
      const nextSampleIndex = Math.min(
        Math.floor((timeAtPixel + (viewportDuration / width)) * sampleRate),
        totalSamples - 1
      );
      
      let min = 0;
      let max = 0;
      
      // Find min/max in this time range
      for (let i = sampleIndex; i <= nextSampleIndex && i < totalSamples; i++) {
        const sample = channelData[i];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
      
      // Draw waveform bar
      const barHeight = Math.max(1, Math.abs(max - min) * centerY);
      const y = centerY - (barHeight / 2);
      
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(x, y, 1, barHeight);
      
      // Draw center line
      if (x % 10 === 0) {
        ctx.strokeStyle = '#424242';
        ctx.beginPath();
        ctx.moveTo(x, centerY - 1);
        ctx.lineTo(x, centerY + 1);
        ctx.stroke();
      }
    }

    // Draw selection overlay
    if (selectionStart !== null && selectionEnd !== null) {
      const startX = timeToPixel(selectionStart);
      const endX = timeToPixel(selectionEnd);
      
      if (startX >= 0 && startX < width || endX >= 0 && endX < width) {
        ctx.fillStyle = 'rgba(33, 150, 243, 0.3)';
        ctx.fillRect(
          Math.max(0, startX),
          0,
          Math.min(width, endX) - Math.max(0, startX),
          height
        );
        
        // Selection borders
        ctx.strokeStyle = '#2196F3';
        ctx.lineWidth = 2;
        if (startX >= 0 && startX < width) {
          ctx.beginPath();
          ctx.moveTo(startX, 0);
          ctx.lineTo(startX, height);
          ctx.stroke();
        }
        if (endX >= 0 && endX < width) {
          ctx.beginPath();
          ctx.moveTo(endX, 0);
          ctx.lineTo(endX, height);
          ctx.stroke();
        }
      }
    }

    // Draw clips
    clips.forEach(clip => {
      const startX = timeToPixel(clip.startTime);
      const endX = timeToPixel(clip.endTime);
      
      if (startX < width && endX > 0) {
        const isSelected = selectedClips.has(clip.id);
        
        // Clip background
        ctx.fillStyle = isSelected ? 'rgba(255, 193, 7, 0.4)' : 'rgba(96, 125, 139, 0.4)';
        ctx.fillRect(
          Math.max(0, startX),
          height * 0.1,
          Math.min(width, endX) - Math.max(0, startX),
          height * 0.8
        );
        
        // Clip borders
        ctx.strokeStyle = isSelected ? '#FFC107' : '#607D8B';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          Math.max(0, startX),
          height * 0.1,
          Math.min(width, endX) - Math.max(0, startX),
          height * 0.8
        );
        
        // Clip name
        if (endX - startX > 40) {
          ctx.fillStyle = '#fff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(
            clip.name,
            Math.max(5, startX + 5),
            height * 0.2 + 15
          );
        }
      }
    });

    // Draw playhead
    const playheadX = timeToPixel(currentTime);
    if (playheadX >= 0 && playheadX < width) {
      ctx.strokeStyle = '#FF5722';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
      
      // Playhead triangle
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 12);
      ctx.closePath();
      ctx.fill();
    }

  }, [audioBuffer, timeToPixel, selectionStart, selectionEnd, clips, selectedClips, currentTime]);

  // Draw timeline ruler
  const drawTimeline = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#2C2C2C';
    ctx.fillRect(0, 0, width, height);

    // Calculate time markers
    const secondsPerPixel = 1 / (PIXELS_PER_SECOND * zoomLevel);
    const viewStartTime = viewportStart;
    const viewEndTime = viewStartTime + (width * secondsPerPixel);

    // Determine appropriate time intervals
    let interval = 1; // Start with 1 second
    const pixelsPerInterval = interval * PIXELS_PER_SECOND * zoomLevel;
    
    if (pixelsPerInterval < 30) {
      interval = 5;
    } else if (pixelsPerInterval > 200) {
      interval = 0.1;
    }

    // Draw time markers
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#ccc';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';

    const startInterval = Math.floor(viewStartTime / interval) * interval;
    
    for (let time = startInterval; time <= viewEndTime + interval; time += interval) {
      const x = timeToPixel(time);
      
      if (x >= 0 && x < width) {
        // Draw tick
        const isMainTick = time % 1 === 0; // Every second
        const tickHeight = isMainTick ? height * 0.6 : height * 0.3;
        
        ctx.strokeStyle = isMainTick ? '#888' : '#444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, height - tickHeight);
        ctx.lineTo(x, height);
        ctx.stroke();

        // Draw time label
        if (isMainTick && x > 20 && x < width - 20) {
          const minutes = Math.floor(time / 60);
          const seconds = Math.floor(time % 60);
          const milliseconds = Math.floor((time % 1) * 100);
          
          let label;
          if (interval >= 1) {
            label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
          } else {
            label = `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
          }
          
          ctx.fillStyle = '#ccc';
          ctx.fillText(label, x, height - tickHeight - 5);
        }
      }
    }

    // Draw hover time indicator
    if (hoveredTime !== null) {
      const hoverX = timeToPixel(hoveredTime);
      if (hoverX >= 0 && hoverX < width) {
        ctx.strokeStyle = '#FFC107';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(hoverX, 0);
        ctx.lineTo(hoverX, height);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Hover time label
        const minutes = Math.floor(hoveredTime / 60);
        const seconds = Math.floor(hoveredTime % 60);
        const ms = Math.floor((hoveredTime % 1) * 100);
        const hoverLabel = `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
        
        ctx.fillStyle = '#FFC107';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(hoverLabel, hoverX, 15);
      }
    }

  }, [timeToPixel, viewportStart, zoomLevel, hoveredTime]);

  // Handle mouse events
  const handleMouseDown = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    
    setIsDragging(true);
    setDragStart(time);
    
    if (onTimelineClick) {
      onTimelineClick(time, e);
    }
  }, [pixelToTime, onTimelineClick]);

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    
    setHoveredTime(time);
    
    if (isDragging && dragStart !== null && onTimelineDrag) {
      onTimelineDrag(dragStart, time);
    }
  }, [pixelToTime, isDragging, dragStart, onTimelineDrag]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredTime(null);
    setIsDragging(false);
    setDragStart(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (e.ctrlKey) {
      // Zoom
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = pixelToTime(x);
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(20, zoomLevel * zoomFactor));
      
      // Adjust viewport to zoom around mouse position
      const newViewportStart = time - ((time - viewportStart) * (newZoom / zoomLevel));
      
      if (onViewportChange) {
        onViewportChange(newViewportStart);
      }
    } else {
      // Scroll
      const scrollAmount = e.deltaY * 0.01;
      if (onViewportChange) {
        onViewportChange(viewportStart + scrollAmount);
      }
    }
  }, [pixelToTime, zoomLevel, viewportStart, onViewportChange]);

  // Update canvas dimensions
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Waveform canvas
      const waveformCanvas = waveformCanvasRef.current;
      if (waveformCanvas) {
        waveformCanvas.width = rect.width * dpr;
        waveformCanvas.height = WAVEFORM_HEIGHT * dpr;
        waveformCanvas.style.width = rect.width + 'px';
        waveformCanvas.style.height = WAVEFORM_HEIGHT + 'px';
        
        const waveformCtx = waveformCanvas.getContext('2d');
        if (waveformCtx) {
          waveformCtx.scale(dpr, dpr);
        }
      }
      
      // Ruler canvas
      const rulerCanvas = canvasRef.current;
      if (rulerCanvas) {
        rulerCanvas.width = rect.width * dpr;
        rulerCanvas.height = RULER_HEIGHT * dpr;
        rulerCanvas.style.width = rect.width + 'px';
        rulerCanvas.style.height = RULER_HEIGHT + 'px';
        
        const rulerCtx = rulerCanvas.getContext('2d');
        if (rulerCtx) {
          rulerCtx.scale(dpr, dpr);
        }
      }
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Redraw when state changes
  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  useEffect(() => {
    drawTimeline();
  }, [drawTimeline]);

  return (
    <div className="timeline-container" ref={containerRef}>
      <div className="timeline-header">
        <h3>Timeline</h3>
        <div className="timeline-info">
          {selectedTool === 'selection' && <span className="tool-indicator">Selection Tool</span>}
          {selectedTool === 'razor' && <span className="tool-indicator">Razor Tool</span>}
          <span className="zoom-indicator">Zoom: {zoomLevel.toFixed(1)}x</span>
        </div>
      </div>
      
      <div className="timeline-ruler">
        <canvas
          ref={canvasRef}
          className="ruler-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
      </div>
      
      <div className="timeline-waveform">
        <canvas
          ref={waveformCanvasRef}
          className="waveform-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
        />
      </div>
      
      <div className="timeline-controls">
        <div className="timeline-stats">
          Duration: {duration.toFixed(2)}s | 
          Current: {currentTime.toFixed(2)}s |
          {selectionStart !== null && selectionEnd !== null && (
            ` Selection: ${(selectionEnd - selectionStart).toFixed(2)}s`
          )}
        </div>
      </div>
    </div>
  );
});

Timeline.displayName = 'Timeline';

export default Timeline;