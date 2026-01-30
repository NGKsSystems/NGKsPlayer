import React, { useRef, useEffect, useState } from 'react';
import { formatTime } from '../utils/timeUtils';

const WaveformEditor = ({
  audioBuffer,
  currentTime,
  onTimeChange,
  isPlaying,
  onPlayPause,
  inPoint,
  outPoint,
  onSetInPoint,
  onSetOutPoint,
  onCreateClip,
  clipName,
  onClipNameChange,
  onResetPoints,
  audioFile
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [zoom, setZoom] = useState(0.5); // Start at 0.5x to see full song
  const [inPointInput, setInPointInput] = useState('');
  const [outPointInput, setOutPointInput] = useState('');
  const [tuneMode, setTuneMode] = useState(null); // 'in' or 'out' or null
  const [scrollOffset, setScrollOffset] = useState(0);

  const duration = audioBuffer?.duration || 0;
  const viewDuration = 60000 / zoom; // milliseconds visible (60 seconds at zoom 0.5)

  // Draw waveform with zoom and ruler
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight - 40; // Leave room for ruler

    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const amp = canvasHeight / 2;

    // Calculate visible time range
    const visibleStart = scrollOffset;
    const visibleEnd = Math.min(scrollOffset + viewDuration, duration * 1000);
    
    // How many samples correspond to the visible range
    const totalSamples = data.length;
    const sampleRate = audioBuffer.sampleRate;
    const startSample = (visibleStart / 1000) * sampleRate;
    const endSample = (visibleEnd / 1000) * sampleRate;

    // Background
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid (vertical lines at time intervals)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    const pixelsPerMs = canvasWidth / viewDuration;
    const timeInterval = zoom < 1 ? 5000 : zoom < 2 ? 2000 : 1000; // ms between grid lines

    for (let time = Math.floor(visibleStart / timeInterval) * timeInterval; 
         time <= visibleEnd; 
         time += timeInterval) {
      const x = (time - visibleStart) * pixelsPerMs;
      if (x >= 0 && x <= canvasWidth) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
    }

    // Draw waveform scaled to zoom level
    const step = Math.max(1, Math.ceil((endSample - startSample) / canvasWidth));
    ctx.fillStyle = '#3b82f6';

    for (let i = 0; i < canvasWidth; i++) {
      const sampleIndex = Math.floor(startSample + (i * (endSample - startSample)) / canvasWidth);
      let min = 1.0;
      let max = -1.0;

      for (let j = 0; j < step && sampleIndex + j < totalSamples; j++) {
        const datum = data[sampleIndex + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }

      ctx.fillRect(i, amp - max * amp, 1, (max - min) * amp);
    }

    // Center line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.lineTo(canvasWidth, amp);
    ctx.stroke();

    // In/Out points (only if visible)
    if (inPoint !== null && inPoint >= visibleStart && inPoint <= visibleEnd) {
      const inX = (inPoint - visibleStart) * pixelsPerMs;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(inX, 0);
      ctx.lineTo(inX, canvasHeight);
      ctx.stroke();
    }

    if (outPoint !== null && outPoint >= visibleStart && outPoint <= visibleEnd) {
      const outX = (outPoint - visibleStart) * pixelsPerMs;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(outX, 0);
      ctx.lineTo(outX, canvasHeight);
      ctx.stroke();
    }

    // Current playhead (only if visible)
    if (currentTime >= visibleStart && currentTime <= visibleEnd) {
      const playX = (currentTime - visibleStart) * pixelsPerMs;
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, canvasHeight);
      ctx.stroke();
    }

    // Draw time ruler
    const rulerCanvas = containerRef.current.querySelector('.ruler-canvas');
    if (rulerCanvas) {
      const rulerCtx = rulerCanvas.getContext('2d');
      rulerCanvas.width = canvasWidth;
      rulerCanvas.height = 40;

      rulerCtx.fillStyle = '#1a1a1a';
      rulerCtx.fillRect(0, 0, canvasWidth, 40);
      rulerCtx.strokeStyle = '#333';
      rulerCtx.lineWidth = 1;
      rulerCtx.beginPath();
      rulerCtx.moveTo(0, 39);
      rulerCtx.lineTo(canvasWidth, 39);
      rulerCtx.stroke();

      // Time markers
      rulerCtx.fillStyle = '#888';
      rulerCtx.font = '11px monospace';
      rulerCtx.textAlign = 'center';

      for (let time = Math.floor(visibleStart / timeInterval) * timeInterval;
           time <= visibleEnd;
           time += timeInterval) {
        const x = (time - visibleStart) * pixelsPerMs;
        if (x >= 0 && x <= canvasWidth) {
          rulerCtx.beginPath();
          rulerCtx.moveTo(x, 35);
          rulerCtx.lineTo(x, 39);
          rulerCtx.stroke();
          rulerCtx.fillText(formatTime(time), x, 20);
        }
      }
    }
  }, [audioBuffer, currentTime, inPoint, outPoint, zoom, scrollOffset, viewDuration, duration]);

  // Handle canvas click for timeline scrub
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedTime = scrollOffset + (x / canvas.width) * viewDuration;
    onTimeChange(Math.max(0, Math.min(clickedTime, duration * 1000)));
  };

  // Handle fine-tuning buttons
  const handleFineTune = (deltaMs, pointType) => {
    let targetTime = currentTime;
    if (pointType === 'in' && inPoint !== null) {
      targetTime = inPoint;
    } else if (pointType === 'out' && outPoint !== null) {
      targetTime = outPoint;
    }

    const newTime = Math.max(0, Math.min(targetTime + deltaMs, duration * 1000));

    if (pointType === 'in' && inPoint !== null) {
      onSetInPoint();
      onTimeChange(newTime);
      setTuneMode('in');
    } else if (pointType === 'out' && outPoint !== null) {
      onSetOutPoint();
      onTimeChange(newTime);
      setTuneMode('out');
    }
  };

  return (
    <div className="waveform-editor">
      <div className="editor-header">
        <h3>🎵 Waveform Editor</h3>
        <div className="editor-stats">
          <span>{formatTime(currentTime)} / {formatTime(duration * 1000)}</span>
        </div>
      </div>

      <div className="canvas-container" ref={containerRef}>
        <canvas
          className="ruler-canvas"
          style={{ display: 'block', borderBottom: '1px solid #333' }}
        />
        <canvas
          ref={canvasRef}
          className="waveform-canvas"
          onClick={handleCanvasClick}
        />
        <div 
          className="scroll-indicator"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: '#333'
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#00d9ff',
              width: `${Math.min(100, (viewDuration / (duration * 1000)) * 100)}%`,
              marginLeft: `${(scrollOffset / (duration * 1000)) * 100}%`,
              transition: 'margin-left 0.1s'
            }}
          />
        </div>
      </div>

      {/* Zoom and Scroll Controls */}
      <div className="zoom-scroll-controls">
        <div className="zoom-control">
          <label>Zoom:</label>
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={zoom}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              setZoom(newZoom);
              // Auto-center scroll when zoomed out far
              if (newZoom < 0.5) {
                setScrollOffset(Math.max(0, (duration * 1000 - viewDuration) / 2));
              }
            }}
          />
          <span>{zoom.toFixed(1)}x</span>
        </div>

        {zoom > 0.5 && (
          <div className="scroll-control">
            <label>Scroll:</label>
            <input
              type="range"
              min="0"
              max={Math.max(0, duration * 1000 - viewDuration)}
              step="100"
              value={scrollOffset}
              onChange={(e) => setScrollOffset(Math.max(0, Math.min(parseFloat(e.target.value), duration * 1000 - viewDuration)))}
              style={{ flex: 1 }}
            />
            <span>{formatTime(scrollOffset)}</span>
          </div>
        )}

        <div style={{ flex: 1 }}></div>
      </div>

      <div className="editor-controls">
        <div className="playback-controls">
          <button className="btn-ctrl btn-play" onClick={onPlayPause} title="Play/Pause">
            {isPlaying ? '⏹' : '▶'}
          </button>
        </div>

        <div className="point-controls">
          <button className="btn-ctrl btn-in" onClick={onSetInPoint} title="Set In Point at current time">
            🟢 In
          </button>

          <button className="btn-ctrl btn-out" onClick={onSetOutPoint} title="Set Out Point at current time">
            🔴 Out
          </button>

          <button 
            className="btn-ctrl btn-reset" 
            onClick={onResetPoints}
            disabled={inPoint === null && outPoint === null}
            title="Reset points and name"
          >
            ↻ Reset
          </button>
        </div>

        <div className="fine-tune-controls">
          <div className="tune-group">
            <label>Fine-tune In:</label>
            <button 
              className={`btn-tune ${tuneMode === 'in' ? 'active' : ''}`}
              onClick={() => {
                if (inPoint !== null) {
                  const newTime = Math.max(0, inPoint - 100);
                  onTimeChange(newTime);
                  onSetInPoint(); // Update parent state
                  setTuneMode('in');
                }
              }}
              disabled={inPoint === null}
              title="Move In-point 100ms back"
            >-100ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'in' ? 'active' : ''}`}
              onClick={() => {
                if (inPoint !== null) {
                  const newTime = Math.max(0, inPoint - 10);
                  onTimeChange(newTime);
                  onSetInPoint(); // Update parent state
                  setTuneMode('in');
                }
              }}
              disabled={inPoint === null}
              title="Move In-point 10ms back"
            >-10ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'in' ? 'active' : ''}`}
              onClick={() => {
                if (inPoint !== null) {
                  const newTime = Math.min(duration * 1000, inPoint + 10);
                  onTimeChange(newTime);
                  onSetInPoint(); // Update parent state
                  setTuneMode('in');
                }
              }}
              disabled={inPoint === null}
              title="Move In-point 10ms forward"
            >+10ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'in' ? 'active' : ''}`}
              onClick={() => {
                if (inPoint !== null) {
                  const newTime = Math.min(duration * 1000, inPoint + 100);
                  onTimeChange(newTime);
                  onSetInPoint(); // Update parent state
                  setTuneMode('in');
                }
              }}
              disabled={inPoint === null}
              title="Move In-point 100ms forward"
            >+100ms</button>
          </div>

          <div className="tune-group">
            <label>Fine-tune Out:</label>
            <button 
              className={`btn-tune ${tuneMode === 'out' ? 'active' : ''}`}
              onClick={() => {
                if (outPoint !== null) {
                  const newTime = Math.max(0, outPoint - 100);
                  onTimeChange(newTime);
                  onSetOutPoint(); // Update parent state
                  setTuneMode('out');
                }
              }}
              disabled={outPoint === null}
              title="Move Out-point 100ms back"
            >-100ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'out' ? 'active' : ''}`}
              onClick={() => {
                if (outPoint !== null) {
                  const newTime = Math.max(0, outPoint - 10);
                  onTimeChange(newTime);
                  onSetOutPoint(); // Update parent state
                  setTuneMode('out');
                }
              }}
              disabled={outPoint === null}
              title="Move Out-point 10ms back"
            >-10ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'out' ? 'active' : ''}`}
              onClick={() => {
                if (outPoint !== null) {
                  const newTime = Math.min(duration * 1000, outPoint + 10);
                  onTimeChange(newTime);
                  onSetOutPoint(); // Update parent state
                  setTuneMode('out');
                }
              }}
              disabled={outPoint === null}
              title="Move Out-point 10ms forward"
            >+10ms</button>
            <button 
              className={`btn-tune ${tuneMode === 'out' ? 'active' : ''}`}
              onClick={() => {
                if (outPoint !== null) {
                  const newTime = Math.min(duration * 1000, outPoint + 100);
                  onTimeChange(newTime);
                  onSetOutPoint(); // Update parent state
                  setTuneMode('out');
                }
              }}
              disabled={outPoint === null}
              title="Move Out-point 100ms forward"
            >+100ms</button>
          </div>

          <div className="tune-input">
            <label>Jump to (ms):</label>
            <input 
              type="number" 
              value={inPointInput}
              onChange={(e) => setInPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inPointInput) {
                  const val = Math.max(0, Math.min(duration * 1000, parseInt(inPointInput)));
                  onTimeChange(val);
                  setInPointInput('');
                }
              }}
              placeholder="Enter ms"
              className="input-ms"
            />
            <button 
              className="btn-tune-go"
              onClick={() => {
                if (inPointInput) {
                  const val = Math.max(0, Math.min(duration * 1000, parseInt(inPointInput)));
                  onTimeChange(val);
                  setInPointInput('');
                }
              }}
            >Go</button>
          </div>
        </div>

        <div className="clip-creation">
          <input
            type="text"
            placeholder="Clip name (optional)..."
            value={clipName}
            onChange={(e) => onClipNameChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onCreateClip?.();
                onClipNameChange?.('');
              }
            }}
            className="clip-name-input"
          />

          <button
            className="btn-ctrl btn-create"
            onClick={() => {
              onCreateClip?.();
              onClipNameChange?.('');
            }}
            disabled={inPoint === null || outPoint === null}
            title="Create clip with current in/out points"
          >
            ✂️ Create
          </button>
        </div>
      </div>

      <div className="point-display-enhanced">
        <div className="point-badges">
          <div className={`badge in-badge ${inPoint !== null ? 'active' : ''}`}>
            <span className="badge-label">🟢 IN</span>
            <span className="badge-value">{inPoint !== null ? formatTime(inPoint) : '—'}</span>
          </div>

          <div className={`badge out-badge ${outPoint !== null ? 'active' : ''}`}>
            <span className="badge-label">🔴 OUT</span>
            <span className="badge-value">{outPoint !== null ? formatTime(outPoint) : '—'}</span>
          </div>

          <div className={`badge duration-badge ${inPoint !== null && outPoint !== null ? 'active' : ''}`}>
            <span className="badge-label">⏱ DURATION</span>
            <span className="badge-value">{inPoint !== null && outPoint !== null ? formatTime(outPoint - inPoint) : '—'}</span>
          </div>

          <div className={`badge current-badge`}>
            <span className="badge-label">▶ CURRENT</span>
            <span className="badge-value">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaveformEditor;
