import React, { useCallback, useEffect, useRef } from 'react';
import TrackHeader from './TrackHeader';
import SimpleWaveform from './SimpleWaveform';
import TimelineRuler from './TimelineRuler';
import './MultiTrackTimeline.css';

/**
 * Professional Multi-Track Timeline
 * 
 * Full-featured timeline with proper track headers, waveform visualization,
 * markers, loop regions, and professional navigation
 */
const ProfessionalTimeline = React.forwardRef(({
  tracks = [],
  currentTime = 0,
  duration = 0,
  zoomLevel = 1,
  viewportStart = 0,
  selectedTool = 'selection',
  isPlaying = false,
  onTimelineClick,
  onClipSelect,
  onClipMove,
  onClipSplit,
  onTrackSelect,
  onTrackMute,
  onTrackSolo,
  onTrackVolumeChange,
  onTrackPanChange,
  onTrackNameChange,
  onTrackDelete,
  onTrackMoveUp,
  onTrackMoveDown,
  onViewportChange, // Add viewport change handler
  activeTrackId,
  // Marker and loop region props
  markers = [],
  loopRegions = [],
  selectedMarkerId = null,
  selectedLoopId = null,
  activeLoopRegion = null,
  onAddMarker,
  onSelectMarker,
  onMoveMarker,
  onSelectLoopRegion,
  onAddLoopRegion,
  onResizeLoopRegion,
  ...props
}, ref) => {
  const timelineRef = useRef(null);
  
  // Constants
  const PIXELS_PER_SECOND = 50 * zoomLevel;
  const TRACK_HEIGHT = 80; // Taller to properly fit content
  const HEADER_WIDTH = 250; // Wider header width for song titles
  
  // Drag state for clips
  const [isDraggingClip, setIsDraggingClip] = useState(false);
  const [draggedClip, setDraggedClip] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPreview, setDragPreview] = useState(null);
  
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
      const targetScrollLeft = viewportStart * PIXELS_PER_SECOND;
      timelineRef.current.scrollLeft = targetScrollLeft;
    }
  }, [viewportStart, PIXELS_PER_SECOND]);

  // Clip drag handlers
  const handleClipMouseDown = useCallback((e, clip) => {
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
    const newStartTime = Math.max(0, Math.round((x / PIXELS_PER_SECOND) * 10) / 10);
    
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
    if (isDraggingClip && draggedClip && dragPreview) {
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
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingClip, handleMouseMove, handleMouseUp]);
  
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

  return (
    <div 
      ref={ref}
      className="professional-timeline"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#1a1a1a',
        overflow: 'hidden'
      }}
    >
      {/* Timeline Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: '40px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#00d4ff',
          margin: 0
        }}>
          🎵 Professional Multi-Track Timeline
        </h3>
        
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: '16px',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.7)'
        }}>
          <span>Tracks: {tracks.length}</span>
          <span>Markers: {markers.length}</span>
          <span>Loops: {loopRegions.length}</span>
          <span className="tool-indicator">Tool: {selectedTool}</span>
          <span>Time: {(currentTime || 0).toFixed(2)}s</span>
        </div>
      </div>

      {/* Timeline Ruler */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Ruler Header Spacer */}
        <div style={{
          width: HEADER_WIDTH,
          height: '80px',
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)',
          borderRight: '2px solid #ff6b35',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ff6b35',
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '1px',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.1) 95%, rgba(255,107,53,0.2) 100%)',
            pointerEvents: 'none'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            TIMELINE RULER
          </div>
        </div>
        
        {/* Timeline Ruler */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <TimelineRuler
            duration={duration}
            currentTime={currentTime}
            viewportStart={viewportStart}
            zoomLevel={zoomLevel}
            onTimeChange={onTimelineClick}
            markers={markers}
            loopRegions={loopRegions}
            activeLoopRegion={activeLoopRegion}
            onAddMarker={onAddMarker}
            onSelectMarker={onSelectMarker}
            onMoveMarker={onMoveMarker}
            onSelectLoopRegion={onSelectLoopRegion}
            onAddLoopRegion={onAddLoopRegion}
            onResizeLoopRegion={onResizeLoopRegion}
            selectedMarkerId={selectedMarkerId}
            selectedLoopId={selectedLoopId}
            zoom={zoomLevel}
            pixelsPerSecond={PIXELS_PER_SECOND}
          />
        </div>
      </div>

      {/* Main Timeline Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Track Headers */}
        <div style={{
          width: HEADER_WIDTH,
          background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)',
          borderRight: '2px solid #ff6b35',
          overflow: 'auto',
          position: 'relative'
        }}>
          {/* Header border gradient effect */}
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,107,53,0.1) 95%, rgba(255,107,53,0.2) 100%)',
            pointerEvents: 'none',
            zIndex: 0
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            {tracks.length === 0 ? (
              <div style={{
                height: '200px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff6b35',
                fontSize: '14px',
                textAlign: 'center',
                padding: '20px',
                fontWeight: '600'
              }}>
                No tracks yet.<br/>Click "Add Audio Track" to start!
              </div>
            ) : (
              tracks.map((track, trackIndex) => (
                <div
                  key={track.id}
                  style={{ height: TRACK_HEIGHT }}
                >
                  <TrackHeader
                    track={track}
                    isActive={track.id === activeTrackId}
                    onSelect={onTrackSelect}
                    onMute={onTrackMute}
                    onSolo={onTrackSolo}
                    onVolumeChange={onTrackVolumeChange}
                    onPanChange={onTrackPanChange}
                    onNameChange={onTrackNameChange}
                    onDelete={onTrackDelete}
                    onMoveUp={() => onTrackMoveUp(trackIndex)}
                    onMoveDown={() => onTrackMoveDown(trackIndex)}
                    canMoveUp={trackIndex > 0}
                    canMoveDown={trackIndex < tracks.length - 1}
                    style={{ height: '100%' }}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Timeline Content */}
        <div 
          ref={timelineRef}
          style={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            cursor: selectedTool === 'razor' ? 'crosshair' : 'default'
          }}
          onClick={handleTimelineClick}
          onScroll={handleScroll}
        >
          {/* Timeline content with proper width for scrolling */}
          <div style={{
            width: `${Math.max(duration * PIXELS_PER_SECOND, 2000)}px`, // Ensure minimum width
            minHeight: '100%',
            position: 'relative'
          }}>
            {/* Playhead */}
            <div style={{
              position: 'absolute',
              left: `${(currentTime || 0) * PIXELS_PER_SECOND}px`,
              top: 0,
              width: '3px',
              height: '100%',
              background: '#e74c3c',
              zIndex: 100,
              pointerEvents: 'none'
            }}>
              <div style={{
                position: 'absolute',
                top: '-6px',
                left: '-6px',
                width: '0',
                height: '0',
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '12px solid #e74c3c'
              }} />
            </div>

            {/* Tracks */}
            <div style={{ position: 'relative' }}>
              {tracks.length === 0 ? (
                <div style={{
                  height: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#666',
                  fontSize: '16px'
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎵</div>
                  <div>Timeline is ready for audio clips!</div>
                </div>
              ) : (
                tracks.map((track, trackIndex) => (
                  <div 
                    key={track.id}
                    style={{
                      height: TRACK_HEIGHT,
                      background: trackIndex % 2 === 0 ? '#2c2c2c' : '#333',
                      borderBottom: '1px solid #444',
                      position: 'relative',
                      cursor: selectedTool === 'razor' ? 'crosshair' : 'default'
                    }}
                  >
                    {/* Track Background Line */}
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '50%',
                      width: `${duration * PIXELS_PER_SECOND}px`,
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-50%)'
                    }} />

                    {/* Clips */}
                    {track.clips && track.clips.map(clip => (
                      <div
                        key={clip.id}
                        style={{
                          position: 'absolute',
                          left: `${clip.startTime * PIXELS_PER_SECOND}px`,
                          top: '2px',
                          width: `${clip.duration * PIXELS_PER_SECOND}px`,
                          height: `${TRACK_HEIGHT - 4}px`,
                          background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                          border: '2px solid #2980b9',
                          borderRadius: '6px',
                          cursor: selectedTool === 'razor' ? 'crosshair' : 'grab',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          padding: '0 8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          transition: 'all 0.2s ease',
                          overflow: 'hidden',
                          opacity: isDraggingClip && draggedClip?.id === clip.id ? 0.5 : 1,
                          pointerEvents: isDraggingClip && draggedClip?.id !== clip.id ? 'none' : 'auto'
                        }}
                        onMouseDown={(e) => handleClipMouseDown(e, clip)}
                        onClick={(e) => handleClipClick(e, clip)}
                        onMouseEnter={(e) => {
                          if (!isDraggingClip) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.4)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isDraggingClip) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                          }
                        }}
                      >
                        {/* Waveform Background */}
                        {clip.audioBuffer && (
                          <SimpleWaveform
                            audioBuffer={clip.audioBuffer}
                            width={clip.duration * PIXELS_PER_SECOND}
                            height={TRACK_HEIGHT - 4}
                            color="rgba(255,255,255,0.3)"
                            backgroundColor="transparent"
                          />
                        )}
                        
                        {/* Clip Duration */}
                        <div style={{
                          position: 'absolute',
                          right: '6px',
                          bottom: '4px',
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: '10px',
                          zIndex: 2,
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {(clip.duration || 0).toFixed(1)}s
                        </div>
                      </div>
                    ))}

                    {/* Track Drop Zone Hint */}
                    {track.clips && track.clips.length === 0 && (
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#666',
                        fontSize: '12px',
                        textAlign: 'center',
                        pointerEvents: 'none'
                      }}>
                        Drop audio files here
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Status */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: 'rgba(0, 0, 0, 0.5)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.7)'
      }}>
        <div>
          Zoom: {(zoomLevel || 1).toFixed(1)}x | 
          Viewport: {(viewportStart || 0).toFixed(1)}s | 
          Duration: {(duration || 0).toFixed(1)}s
          {activeLoopRegion && (
            <span style={{ color: '#FF6B35', marginLeft: '8px' }}>
              • Loop Active: {activeLoopRegion.name}
            </span>
          )}
        </div>
        <div>
          Professional Multi-Track Timeline • {tracks.length} tracks loaded
        </div>
      </div>
    </div>
  );
});

ProfessionalTimeline.displayName = 'ProfessionalTimeline';

export default ProfessionalTimeline;