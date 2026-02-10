/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalTimeline.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef } from 'react';
import { timeToPixels, snapTime, calculateTimelineWidth } from '../timeline/timelineMath.js';
import TrackHeader from './TrackHeader';
import SimpleWaveform from './SimpleWaveform';
import TimelineRuler from './TimelineRuler';
import './MultiTrackTimeline.css';
import { useProfessionalTimelineController } from '../hooks/useProfessionalTimelineController';

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
  onClipDelete,
  onTrackSelect,
  onTrackMute,
  onTrackSolo,
  onTrackVolumeChange,
  onTrackPanChange,
  onTrackPlaybackRateChange,
  onTrackReverseToggle,
  onTrackNameChange,
  onAddTrack,
  onTrackDelete,
  onTrackMoveUp,
  onTrackMoveDown,
  onOpenEffects,
  onViewportChange, // Add viewport change handler
  onTrackContextMenu, // Add context menu handler
  onToolChange,
  onZoomChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  nextUndoDescription,
  nextRedoDescription,
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

  // Interaction state & handlers from hook
  const {
    isDraggingClip, draggedClip, dragPreview,
    contextMenu, contextMenuTrack, contextMenuClip,
    handleScroll, handleClipMouseDown, handleMouseMove, handleMouseUp,
    handleTrackContextMenu, handleClipContextMenu, closeContextMenu,
    handleContextMenuAction, handleTimelineClick, handleClipClick
  } = useProfessionalTimelineController({
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
    onToolChange,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  });

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
        padding: '4px 8px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        minHeight: '32px',
        gap: '6px'
      }}>
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#00d4ff',
          whiteSpace: 'nowrap'
        }}>
          🎵 PMTT
        </span>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Add Track */}
        <button
          onClick={onAddTrack}
          style={{
            background: '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            padding: '2px 6px',
            fontSize: '10px',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
          title="Add Audio Track"
        >
          + Track
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Tools */}
        <button
          onClick={() => onToolChange && onToolChange('selection')}
          title="Selection Tool (V)"
          style={{
            padding: '2px 6px',
            background: selectedTool === 'selection' ? '#00d4ff' : 'rgba(255,255,255,0.08)',
            color: selectedTool === 'selection' ? '#000' : '#999',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: selectedTool === 'selection' ? '600' : '400'
          }}
        >
          ☞ Sel
        </button>
        <button
          onClick={() => onToolChange && onToolChange('razor')}
          title="Razor Tool (C)"
          style={{
            padding: '2px 6px',
            background: selectedTool === 'razor' ? '#00d4ff' : 'rgba(255,255,255,0.08)',
            color: selectedTool === 'razor' ? '#000' : '#999',
            border: 'none',
            borderRadius: '3px',
            fontSize: '10px',
            cursor: 'pointer',
            fontWeight: selectedTool === 'razor' ? '600' : '400'
          }}
        >
          ✂ Cut
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Zoom */}
        <button
          onClick={() => onZoomChange && onZoomChange(Math.max(0.1, zoomLevel / 1.5))}
          title="Zoom Out (−)"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)',
            color: '#999',
            border: 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          −
        </button>
        <span style={{ fontSize: '10px', color: '#888', minWidth: '28px', textAlign: 'center' }}>
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          onClick={() => onZoomChange && onZoomChange(Math.min(20, zoomLevel * 1.5))}
          title="Zoom In (+)"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.08)',
            color: '#999',
            border: 'none',
            borderRadius: '3px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          +
        </button>

        <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Precision */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#888', cursor: 'pointer', fontSize: '10px' }}>
          <input type="checkbox" defaultChecked style={{ accentColor: '#00d4ff', width: '11px', height: '11px' }} />
          Snap
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#888', cursor: 'pointer', fontSize: '10px' }}>
          <input type="checkbox" style={{ accentColor: '#00d4ff', width: '11px', height: '11px' }} />
          Grid
        </label>
        <select defaultValue="0.1" style={{
          padding: '1px 2px',
          background: 'rgba(255,255,255,0.08)',
          border: 'none',
          borderRadius: '3px',
          color: '#999',
          fontSize: '10px'
        }}>
          <option value="0.01">10ms</option>
          <option value="0.1">100ms</option>
          <option value="1">1s</option>
          <option value="5">5s</option>
        </select>

        {/* Stats - right aligned */}
        <div style={{
          marginLeft: 'auto',
          display: 'flex',
          gap: '10px',
          fontSize: '10px',
          color: 'rgba(255, 255, 255, 0.5)',
          whiteSpace: 'nowrap'
        }}>
          <span>{tracks.length}T</span>
          <span>{markers.length}M</span>
          <span>{loopRegions.length}L</span>
          <span>{(currentTime || 0).toFixed(1)}s</span>
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
            pixelsPerSecond={50}
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
                  key={`header-${track.id}-${trackIndex}`}
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
                    onPlaybackRateChange={onTrackPlaybackRateChange}
                    onReverseToggle={onTrackReverseToggle}
                    onNameChange={onTrackNameChange}
                    onDelete={onTrackDelete}
                    onOpenEffects={onOpenEffects}
                    onMoveUp={() => onTrackMoveUp(trackIndex)}
                    onMoveDown={() => onTrackMoveDown(trackIndex)}
                    onContextMenu={(e) => onTrackContextMenu && onTrackContextMenu(e, track.id)}
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
            width: `${calculateTimelineWidth(Math.max(duration, 2000/PIXELS_PER_SECOND), 50, zoomLevel)}px`, // Ensure minimum width
            minHeight: '100%',
            position: 'relative'
          }}>
            {/* Playhead */}
            <div style={{
              position: 'absolute',
              left: `${timeToPixels(currentTime || 0, 50, zoomLevel)}px`,
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
                    key={`content-${track.id}-${trackIndex}`}
                    style={{
                      height: TRACK_HEIGHT,
                      background: isDraggingClip && dragPreview?.targetTrackId === track.id 
                        ? 'rgba(255, 107, 53, 0.1)' 
                        : (trackIndex % 2 === 0 ? '#2c2c2c' : '#333'),
                      borderBottom: isDraggingClip && dragPreview?.targetTrackId === track.id
                        ? '1px solid #ff6b35'
                        : '1px solid #444',
                      position: 'relative',
                      cursor: selectedTool === 'razor' ? 'crosshair' : 'default'
                    }}
                    onContextMenu={(e) => handleTrackContextMenu(e, track)}
                  >
                    {/* Track Background Line */}
                    <div style={{
                      position: 'absolute',
                      left: '0',
                      top: '50%',
                      width: `${timeToPixels(duration, 50, zoomLevel)}px`,
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-50%)'
                    }} />

                    {/* Snap Guide */}
                    {isDraggingClip && dragPreview?.targetTrackId === track.id && dragPreview.snapTime !== undefined && (
                      <div style={{
                        position: 'absolute',
                        left: `${timeToPixels(dragPreview.snapTime, 50, zoomLevel)}px`,
                        top: '0',
                        width: '2px',
                        height: '100%',
                        background: '#ff6b35',
                        zIndex: 50,
                        pointerEvents: 'none'
                      }} />
                    )}

                    {/* Clips */}
                    {track.clips && track.clips.map(clip => {
                      // Calculate visual duration based on track's playback rate
                      const trackPlaybackRate = track.playbackRate || 1.0;
                      const visualDuration = clip.duration / trackPlaybackRate; // Slower = longer visual, Faster = shorter visual
                      const clipWidthPixels = timeToPixels(visualDuration, 50, zoomLevel);
                      
                      return (
                      <div
                        key={clip.id}
                        style={{
                          position: 'absolute',
                          left: `${timeToPixels(clip.startTime, 50, zoomLevel)}px`,
                          top: '2px',
                          width: `${clipWidthPixels}px`,
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
                        onContextMenu={(e) => handleClipContextMenu(e, clip)}
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
                            width={clipWidthPixels}
                            height={TRACK_HEIGHT - 4}
                            color="rgba(255,255,255,0.3)"
                            backgroundColor="transparent"
                            audioOffset={clip.audioOffset || 0}
                            clipDuration={clip.duration}
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
                      );
                    })}

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

      {/* Drag Preview Overlay */}
      {isDraggingClip && dragPreview && (
        <div
          style={{
            position: 'fixed',
            left: dragPreview.x,
            top: dragPreview.y,
            width: dragPreview.width,
            height: dragPreview.height,
            background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
            border: '2px solid #ff6b35',
            borderRadius: '6px',
            opacity: 0.8,
            pointerEvents: 'none',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 4px 20px rgba(255, 107, 53, 0.4)'
          }}
        >
          {dragPreview.snapTime !== undefined && (
            <div style={{ textAlign: 'center' }}>
              <div>{dragPreview.clip.name || 'Audio Clip'}</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>
                {dragPreview.snapTime.toFixed(1)}s
              </div>
            </div>
          )}
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (contextMenuTrack || contextMenuClip) && (
        <div
          data-context-menu
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            background: 'linear-gradient(135deg, #2a2a2a 0%, #1e1e1e 100%)',
            border: '1px solid #ff6b35',
            borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
            zIndex: 2000,
            minWidth: '180px',
            padding: '4px 0',
            color: 'white',
            fontSize: '13px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid #404040',
            fontSize: '11px',
            color: '#ff6b35',
            fontWeight: 'bold'
          }}>
            {contextMenuClip 
              ? (contextMenuClip.name || 'Audio Clip')
              : (contextMenuTrack?.name || `Track ${tracks.indexOf(contextMenuTrack) + 1}`)
            }
          </div>

          {/* Tool Selection */}
          <div
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              background: selectedTool === 'selection' ? 'rgba(0, 212, 255, 0.15)' : 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.background = selectedTool === 'selection' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 107, 53, 0.1)'}
            onMouseLeave={(e) => e.target.style.background = selectedTool === 'selection' ? 'rgba(0, 212, 255, 0.15)' : 'transparent'}
            onClick={() => { onToolChange && onToolChange('selection'); closeContextMenu(); }}
          >
            ☞ Selection Tool {selectedTool === 'selection' ? '✓' : ''}
          </div>
          <div
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              transition: 'background 0.2s',
              background: selectedTool === 'razor' ? 'rgba(0, 212, 255, 0.15)' : 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.background = selectedTool === 'razor' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(255, 107, 53, 0.1)'}
            onMouseLeave={(e) => e.target.style.background = selectedTool === 'razor' ? 'rgba(0, 212, 255, 0.15)' : 'transparent'}
            onClick={() => { onToolChange && onToolChange('razor'); closeContextMenu(); }}
          >
            ✂️ Razor Tool {selectedTool === 'razor' ? '✓' : ''}
          </div>
          <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

          {/* Clip Menu Items */}
          {contextMenuClip && (
            <>
              {/* Undo/Redo Section */}
              {(canUndo || canRedo) && (
                <>
                  {canUndo && (
                    <div
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      onClick={() => handleContextMenuAction('undo')}
                    >
                      ↶ Undo{nextUndoDescription ? ` ${nextUndoDescription}` : ''}
                    </div>
                  )}
                  
                  {canRedo && (
                    <div
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      onClick={() => handleContextMenuAction('redo')}
                    >
                      ↷ Redo{nextRedoDescription ? ` ${nextRedoDescription}` : ''}
                    </div>
                  )}
                  
                  <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />
                </>
              )}

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('cut')}
              >
                ✂️ Cut Clip
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('copy')}
              >
                📋 Copy Clip
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('duplicate')}
              >
                📄 Duplicate Clip
              </div>

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('fadeIn')}
              >
                📈 Fade In
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('fadeOut')}
              >
                📉 Fade Out
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('normalize')}
              >
                📊 Normalize
              </div>

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  color: '#4CAF50'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(76, 175, 80, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('extractStems')}
              >
                🎵 Extract Stems
              </div>

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  color: '#ff4757'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 71, 87, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('delete')}
              >
                🗑️ Delete Clip
              </div>
            </>
          )}

          {/* Track Menu Items */}
          {contextMenuTrack && (
            <>
              {/* Undo/Redo Section */}
              {(canUndo || canRedo) && (
                <>
                  {canUndo && (
                    <div
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      onClick={() => handleContextMenuAction('undo')}
                    >
                      ↶ Undo{nextUndoDescription ? ` ${nextUndoDescription}` : ''}
                    </div>
                  )}
                  
                  {canRedo && (
                    <div
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      onClick={() => handleContextMenuAction('redo')}
                    >
                      ↷ Redo{nextRedoDescription ? ` ${nextRedoDescription}` : ''}
                    </div>
                  )}
                  
                  <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />
                </>
              )}

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('rename')}
              >
                ✏️ Rename Track
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('duplicate')}
              >
                📋 Duplicate Track
              </div>

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('mute')}
              >
                🔇 {contextMenuTrack.muted ? 'Unmute' : 'Mute'} Track
              </div>

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('solo')}
              >
                🎧 {contextMenuTrack.solo ? 'Unsolo' : 'Solo'} Track
              </div>

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              {tracks.indexOf(contextMenuTrack) > 0 && (
                <div
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  onClick={() => handleContextMenuAction('moveUp')}
                >
                  ⬆️ Move Up
                </div>
              )}

              {tracks.indexOf(contextMenuTrack) < tracks.length - 1 && (
                <div
                  style={{
                    padding: '6px 12px',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgba(255, 107, 53, 0.1)'}
                  onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  onClick={() => handleContextMenuAction('moveDown')}
                >
                  ⬇️ Move Down
                </div>
              )}

              <div style={{ height: '1px', background: '#404040', margin: '4px 0' }} />

              <div
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  color: '#ff4757'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgba(255, 71, 87, 0.1)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                onClick={() => handleContextMenuAction('delete')}
              >
                🗑️ Delete Track
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

ProfessionalTimeline.displayName = 'ProfessionalTimeline';

export default ProfessionalTimeline;
