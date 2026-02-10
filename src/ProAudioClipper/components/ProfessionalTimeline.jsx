/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalTimeline.jsx
 * Purpose: TODO â€“ describe responsibility
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
          ðŸŽµ Professional Multi-Track Timeline
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
          
          <button
            onClick={onAddTrack}
            style={{
              background: '#ff6b35',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Add Audio Track"
          >
            + Add Track
          </button>
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
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>ðŸŽµ</div>
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
              â€¢ Loop Active: {activeLoopRegion.name}
            </span>
          )}
        </div>
        <div>
          Professional Multi-Track Timeline â€¢ {tracks.length} tracks loaded
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
                      â†¶ Undo{nextUndoDescription ? ` ${nextUndoDescription}` : ''}
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
                      â†· Redo{nextRedoDescription ? ` ${nextRedoDescription}` : ''}
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
                âœ‚ï¸ Cut Clip
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
                ðŸ“‹ Copy Clip
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
                ðŸ“„ Duplicate Clip
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
                ðŸ“ˆ Fade In
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
                ðŸ“‰ Fade Out
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
                ðŸ“Š Normalize
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
                ðŸŽµ Extract Stems
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
                ðŸ—‘ï¸ Delete Clip
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
                      â†¶ Undo{nextUndoDescription ? ` ${nextUndoDescription}` : ''}
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
                      â†· Redo{nextRedoDescription ? ` ${nextRedoDescription}` : ''}
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
                âœï¸ Rename Track
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
                ðŸ“‹ Duplicate Track
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
                ðŸ”‡ {contextMenuTrack.muted ? 'Unmute' : 'Mute'} Track
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
                ðŸŽ§ {contextMenuTrack.solo ? 'Unsolo' : 'Solo'} Track
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
                  â¬†ï¸ Move Up
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
                  â¬‡ï¸ Move Down
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
                ðŸ—‘ï¸ Delete Track
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
