import React from 'react';
import './MultiTrackTimeline.css';

/**
 * Ultra-Simple HTML Timeline - Zero Canvas Issues
 * 
 * This uses pure HTML/CSS divs instead of canvas to guarantee visibility
 */
const BasicHTMLTimeline = React.forwardRef(({
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

  const TRACK_HEIGHT = 80;
  const RULER_HEIGHT = 40;
  const PIXELS_PER_SECOND = 100 * zoomLevel;

  const handleTimelineClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = x / PIXELS_PER_SECOND;
    onSeek?.(time);
  };

  const handleClipClick = (e, clip) => {
    e.stopPropagation();
    if (selectedTool === 'razor') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const clipTime = (x / rect.width) * clip.duration + clip.startTime;
      onClipSplit?.(clip.id, clipTime);
    }
  };

  return (
    <div 
      ref={ref}
      className={`basic-html-timeline ${className}`}
      style={{
        width: '100%',
        minHeight: '400px',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%)',
        border: '3px solid #00d4ff',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      {/* Header Info */}
      <div style={{
        padding: '10px',
        background: 'rgba(0, 212, 255, 0.1)',
        borderBottom: '1px solid #00d4ff',
        color: '#00d4ff',
        fontWeight: 'bold',
        fontSize: '14px'
      }}>
        🎵 Pro Audio Timeline | Tracks: {tracks.length} | Tool: {selectedTool} | Time: {currentTime.toFixed(2)}s
      </div>

      {/* Time Ruler */}
      <div 
        style={{
          height: RULER_HEIGHT,
          background: 'linear-gradient(180deg, #3c3c3c 0%, #2c2c2c 100%)',
          borderBottom: '2px solid #444',
          position: 'relative',
          cursor: 'pointer'
        }}
        onClick={handleTimelineClick}
      >
        {/* Time markers */}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(second => (
          <div 
            key={second}
            style={{
              position: 'absolute',
              left: `${(second * PIXELS_PER_SECOND)}px`,
              top: '0',
              height: '100%',
              width: '1px',
              background: '#666',
              pointerEvents: 'none'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: '#ccc',
              fontSize: '11px',
              fontWeight: 'bold'
            }}>
              {second}s
            </div>
          </div>
        ))}
        
        {/* Playhead */}
        <div style={{
          position: 'absolute',
          left: `${currentTime * PIXELS_PER_SECOND}px`,
          top: '0',
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
            <div>No tracks yet. Click "Add Audio Track" to get started!</div>
          </div>
        ) : (
          tracks.map((track, trackIndex) => (
            <div 
              key={track.id}
              style={{
                height: TRACK_HEIGHT,
                background: `linear-gradient(90deg, ${track.color || '#4CAF50'}20 0%, #2c2c2c 100%)`,
                borderBottom: '1px solid #444',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                cursor: selectedTool === 'razor' ? 'crosshair' : 'default'
              }}
              onClick={handleTimelineClick}
            >
              {/* Track Background Waveform Representation */}
              {track.audioBuffer && (
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  width: `${track.audioBuffer.duration * PIXELS_PER_SECOND}px`,
                  height: '2px',
                  background: track.color || '#4CAF50',
                  transform: 'translateY(-50%)',
                  opacity: 0.6
                }} />
              )}

              {/* Track Name */}
              <div style={{
                position: 'absolute',
                left: '10px',
                top: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.7)',
                padding: '2px 8px',
                borderRadius: '4px',
                zIndex: 10
              }}>
                {track.name}
              </div>

              {/* Audio Duration Info */}
              {track.audioBuffer && (
                <div style={{
                  position: 'absolute',
                  right: '10px',
                  top: '8px',
                  color: '#ccc',
                  fontSize: '11px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  {track.audioBuffer.duration.toFixed(1)}s
                </div>
              )}

              {/* Clips */}
              {track.clips && track.clips.map(clip => (
                <div
                  key={clip.id}
                  style={{
                    position: 'absolute',
                    left: `${clip.startTime * PIXELS_PER_SECOND}px`,
                    top: '10px',
                    width: `${clip.duration * PIXELS_PER_SECOND}px`,
                    height: `${TRACK_HEIGHT - 20}px`,
                    background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                    border: '2px solid #2980b9',
                    borderRadius: '6px',
                    cursor: selectedTool === 'razor' ? 'crosshair' : 'grab',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: '0 8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={(e) => handleClipClick(e, clip)}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(52, 152, 219, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                  }}
                >
                  <div style={{
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {clip.name}
                  </div>
                  
                  {/* Clip duration */}
                  <div style={{
                    position: 'absolute',
                    right: '6px',
                    bottom: '4px',
                    color: 'rgba(255,255,255,0.8)',
                    fontSize: '10px'
                  }}>
                    {clip.duration.toFixed(1)}s
                  </div>
                </div>
              ))}

              {/* Track controls hint */}
              {track.clips && track.clips.length === 0 && (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#666',
                  fontSize: '12px',
                  textAlign: 'center'
                }}>
                  Drop audio files here or use timeline selection
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer Status */}
      <div style={{
        padding: '8px 12px',
        background: 'rgba(0,0,0,0.3)',
        borderTop: '1px solid #444',
        color: '#999',
        fontSize: '12px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <div>
          Zoom: {zoomLevel.toFixed(1)}x | 
          Viewport: {viewportStart.toFixed(1)}s | 
          Tool: {selectedTool}
        </div>
        <div>
          {tracks.reduce((total, track) => total + (track.clips?.length || 0), 0)} clips total
        </div>
      </div>
    </div>
  );
});

BasicHTMLTimeline.displayName = 'BasicHTMLTimeline';

export default BasicHTMLTimeline;