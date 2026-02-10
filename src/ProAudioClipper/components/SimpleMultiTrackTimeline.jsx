/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SimpleMultiTrackTimeline.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { timeToPixels, pixelsToTime } from '../timeline/timelineMath.js';
import './MultiTrackTimeline.css';

/**
 * Simplified MultiTrackTimeline - Guaranteed to Work
 * 
 * This is a simplified version that focuses on core functionality:
 * - Visible track rendering
 * - Basic waveform display
 * - Clip visualization
 * - Mouse interaction
 */
const SimpleMultiTrackTimeline = React.forwardRef(({
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

  // Constants
  const TRACK_HEIGHT = 80;
  const RULER_HEIGHT = 30;
  const PIXELS_PER_SECOND = 100 * zoomLevel;

  // Simple render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Clear with visible background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw ruler
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, rect.width, RULER_HEIGHT);
    
    // Draw ruler text
    ctx.fillStyle = '#ecf0f1';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 10; i++) {
      const x = (i * rect.width) / 10;
      const time = (i * 10).toString() + 's';
      ctx.fillText(time, x, 20);
    }

    // Draw tracks
    tracks.forEach((track, index) => {
      const trackY = RULER_HEIGHT + (index * TRACK_HEIGHT);
      
      // Track background
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(0, trackY, rect.width, TRACK_HEIGHT);
      
      // Track border
      ctx.strokeStyle = '#1a252f';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, trackY, rect.width, TRACK_HEIGHT);
      
      // Track name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(track.name, 10, trackY + 25);
      
      // Draw waveform if audio exists
      if (track.audioBuffer) {
        const samples = track.audioBuffer.getChannelData(0);
        const samplesPerPixel = samples.length / rect.width;
        
        ctx.strokeStyle = track.color || '#4CAF50';
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        for (let x = 0; x < rect.width; x += 2) {
          const sampleIndex = Math.floor(x * samplesPerPixel);
          if (sampleIndex < samples.length) {
            const sample = samples[sampleIndex];
            const y = trackY + (TRACK_HEIGHT / 2) + (sample * (TRACK_HEIGHT / 4));
            
            if (x === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      }
      
      // Draw clips
      if (track.clips && track.clips.length > 0) {
        track.clips.forEach(clip => {
          const clipX = timeToPixels(clip.startTime, PIXELS_PER_SECOND, 1);
          const clipWidth = timeToPixels(clip.duration, PIXELS_PER_SECOND, 1);
          const clipY = trackY + 10;
          const clipHeight = TRACK_HEIGHT - 20;
          
          // Clip background
          ctx.fillStyle = 'rgba(52, 152, 219, 0.6)';
          ctx.fillRect(clipX, clipY, clipWidth, clipHeight);
          
          // Clip border
          ctx.strokeStyle = '#3498db';
          ctx.lineWidth = 2;
          ctx.strokeRect(clipX, clipY, clipWidth, clipHeight);
          
          // Clip name
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(clip.name, clipX + 5, clipY + 20);
        });
      }
    });

    // Draw playhead
    const playheadX = timeToPixels(currentTime, PIXELS_PER_SECOND, 1);
    if (playheadX >= 0 && playheadX <= rect.width) {
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, rect.height);
      ctx.stroke();
    }

    console.log('SimpleTimeline rendered:', {
      tracks: tracks.length,
      canvasSize: { width: rect.width, height: rect.height },
      tracksData: tracks.map(t => ({ 
        name: t.name, 
        clips: t.clips?.length || 0, 
        hasAudio: !!t.audioBuffer,
        audioDuration: t.audioBuffer?.duration || 0
      }))
    });

  }, [tracks, currentTime, PIXELS_PER_SECOND, TRACK_HEIGHT, RULER_HEIGHT]);

  // Mouse click handler
  const handleClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Ruler click - seek
    if (y <= RULER_HEIGHT) {
      const time = pixelsToTime(x, 0, 0, PIXELS_PER_SECOND, 1, 0);
      onSeek?.(time);
      return;
    }

    // Track click
    const trackIndex = Math.floor((y - RULER_HEIGHT) / TRACK_HEIGHT);
    if (trackIndex >= 0 && trackIndex < tracks.length) {
      const track = tracks[trackIndex];
      const time = pixelsToTime(x, 0, 0, PIXELS_PER_SECOND, 1, 0);
      
      if (selectedTool === 'razor') {
        // Find clips at this position and split them
        if (track.clips) {
          track.clips.forEach(clip => {
            if (time >= clip.startTime && time <= clip.endTime) {
              onClipSplit?.(clip.id, time);
            }
          });
        }
      }
    }
  }, [tracks, selectedTool, PIXELS_PER_SECOND, TRACK_HEIGHT, RULER_HEIGHT, onSeek, onClipSplit]);

  // Update canvas size and render
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      render();
    };

    // Initial render
    updateSize();
    
    // Observe resize on canvas container
    if (typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver(() => updateSize());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
    };
  }, [render]);

  // Render when props change
  useEffect(() => {
    render();
  }, [render]);

  const containerHeight = Math.max(RULER_HEIGHT + (tracks.length * TRACK_HEIGHT), 300);

  return (
    <div 
      ref={ref || containerRef}
      className={`multi-track-timeline ${className}`}
      style={{
        width: '100%',
        height: containerHeight,
        minHeight: '300px',
        background: '#1a1a1a',
        border: '2px solid #333',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style
      }}
    >
      <div style={{
        position: 'absolute',
        top: '5px',
        left: '5px',
        color: '#00d4ff',
        fontSize: '12px',
        background: 'rgba(0,0,0,0.8)',
        padding: '2px 6px',
        borderRadius: '3px',
        zIndex: 10
      }}>
        📊 Timeline: {tracks.length} tracks | Tool: {selectedTool} | Time: {currentTime.toFixed(1)}s
      </div>
      
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          cursor: selectedTool === 'razor' ? 'crosshair' : 'pointer'
        }}
      />
    </div>
  );
});

SimpleMultiTrackTimeline.displayName = 'SimpleMultiTrackTimeline';

export default SimpleMultiTrackTimeline;
