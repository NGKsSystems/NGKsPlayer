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
  const [zoom, setZoom] = useState(1);
  const [inPointInput, setInPointInput] = useState('');
  const [outPointInput, setOutPointInput] = useState('');

  const duration = audioBuffer?.duration || 0;

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    const ctx = canvas.getContext('2d');
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    // Background
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const x = (canvas.width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Waveform
    ctx.fillStyle = '#3b82f6';
    for (let i = 0; i < canvas.width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        let datum = data[i * step + j];
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
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();

    // In/Out points
    if (inPoint !== null) {
      const inX = (inPoint / (duration * 1000)) * canvas.width;
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(inX, 0);
      ctx.lineTo(inX, canvas.height);
      ctx.stroke();
    }

    if (outPoint !== null) {
      const outX = (outPoint / (duration * 1000)) * canvas.width;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(outX, 0);
      ctx.lineTo(outX, canvas.height);
      ctx.stroke();
    }

    // Current playhead
    const playX = (currentTime / (duration * 1000)) * canvas.width;
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playX, 0);
    ctx.lineTo(playX, canvas.height);
    ctx.stroke();
  }, [audioBuffer, currentTime, inPoint, outPoint, zoom]);

  // Handle canvas click for timeline scrub
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newTime = (x / canvas.width) * (duration * 1000);
    onTimeChange(Math.max(0, Math.min(newTime, duration * 1000)));
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
          ref={canvasRef}
          className="waveform-canvas"
          onClick={handleCanvasClick}
        />
      </div>

      <div className="editor-controls">
        <div className="playback-controls">
          <button className="btn-ctrl btn-play" onClick={onPlayPause} title="Play/Pause">
            {isPlaying ? '⏹' : '▶'}
          </button>
        </div>

        <div className="point-controls">
          <button className="btn-ctrl btn-in" onClick={onSetInPoint} title="Set In Point">
            🟢 In
          </button>

          <button className="btn-ctrl btn-out" onClick={onSetOutPoint} title="Set Out Point">
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
            <label>In Adjust:</label>
            <button className="btn-tune" onClick={() => {
              if (inPoint !== null) onTimeChange(Math.max(0, currentTime - 100));
            }} title="Move 100ms back">-100ms</button>
            <button className="btn-tune" onClick={() => {
              if (inPoint !== null) onTimeChange(Math.max(0, currentTime - 10));
            }} title="Move 10ms back">-10ms</button>
            <button className="btn-tune" onClick={() => {
              if (inPoint !== null) onTimeChange(Math.min(duration * 1000, currentTime + 10));
            }} title="Move 10ms forward">+10ms</button>
            <button className="btn-tune" onClick={() => {
              if (inPoint !== null) onTimeChange(Math.min(duration * 1000, currentTime + 100));
            }} title="Move 100ms forward">+100ms</button>
          </div>

          <div className="tune-input">
            <label>In (ms):</label>
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

      <div className="zoom-control">
        <label>Zoom:</label>
        <input
          type="range"
          min="0.5"
          max="5"
          step="0.5"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
        />
        <span>{zoom.toFixed(1)}x</span>
      </div>
    </div>
  );
};

export default WaveformEditor;
