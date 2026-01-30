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
        <button className="btn-ctrl" onClick={onPlayPause}>
          {isPlaying ? '⏹ Stop' : '▶ Play'}
        </button>

        <button className="btn-ctrl btn-in" onClick={onSetInPoint}>
          🟢 In Point
        </button>

        <button className="btn-ctrl btn-out" onClick={onSetOutPoint}>
          🔴 Out Point
        </button>

        <input
          type="text"
          placeholder="Clip name..."
          value={clipName}
          onChange={(e) => setClipName(e.target.value)}
          className="clip-name-input"
        />

        <button
          className="btn-ctrl btn-create"
          onClick={() => {
            onCreateClip(clipName || `Clip ${new Date().getTime()}`);
            setClipName('');
          }}
        >
          ✂️ Create Clip
        </button>
      </div>

      <div className="point-display">
        {inPoint !== null && (
          <div className="point-info in-point">
            <label>In:</label>
            <span>{formatTime(inPoint)}</span>
          </div>
        )}
        {outPoint !== null && (
          <div className="point-info out-point">
            <label>Out:</label>
            <span>{formatTime(outPoint)}</span>
          </div>
        )}
        {inPoint !== null && outPoint !== null && (
          <div className="point-info duration-info">
            <label>Duration:</label>
            <span>{formatTime(outPoint - inPoint)}</span>
          </div>
        )}
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
