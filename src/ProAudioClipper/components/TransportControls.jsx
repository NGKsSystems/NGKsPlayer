/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TransportControls.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react';
import './TransportControls.css';

/**
 * Master Waveform Component — ACTIVE real-time visualiser
 * Connects an AnalyserNode to the engine's masterGainNode so the bars
 * bounce in real-time with the actual audio output.
 * Falls back to buffer overview when paused or when masterGainNode is unavailable.
 */
const MasterWaveform = ({ tracks, currentTime, duration, onSeek, isPlaying, audioContext, masterGainNode }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animFrameRef = useRef(null);
  const analyserRef = useRef(null);
  const freqDataRef = useRef(null);
  const timeDataRef = useRef(null);
  const connectedRef = useRef(false);

  // ── Create & connect AnalyserNode to masterGainNode ──
  useEffect(() => {
    if (!audioContext || !masterGainNode) {
      connectedRef.current = false;
      return;
    }

    // Re-use if already connected to same node
    if (analyserRef.current && connectedRef.current) return;

    try {
      // Disconnect old analyser if context changed
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch (_) {}
      }

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;           // 128 frequency bins — good for bars
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      // Tap masterGain → analyser (passive — analyser doesn't route to destination)
      masterGainNode.connect(analyser);

      analyserRef.current = analyser;
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      timeDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      connectedRef.current = true;
    } catch (e) {
      console.warn('[MasterWaveform] analyser setup failed:', e);
      connectedRef.current = false;
    }

    return () => {
      try { analyserRef.current?.disconnect(); } catch (_) {}
      connectedRef.current = false;
    };
  }, [audioContext, masterGainNode]);

  // ── Draw frame ──
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const w = Math.floor(rect.width);
    const h = 96;
    if (w <= 0) return;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    const mid = h / 2;

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, h);

    const hasAnalyser = connectedRef.current && analyserRef.current;
    const hasLiveData = hasAnalyser && isPlaying;

    // ═══════════════════════════════════════════
    // LIVE MODE — real-time bouncing frequency bars
    // ═══════════════════════════════════════════
    if (hasLiveData) {
      const analyser = analyserRef.current;
      const freqData = freqDataRef.current;
      analyser.getByteFrequencyData(freqData);

      const binCount = analyser.frequencyBinCount;
      const barWidth = Math.max(2, Math.floor(w / binCount) - 1);
      const gap = 1;

      for (let i = 0; i < binCount; i++) {
        const x = Math.floor((i / binCount) * w);
        const val = freqData[i] / 255;            // 0..1
        const barH = val * h * 0.95;

        // Amplitude-based colour: green → yellow → orange → red
        const barGrad = ctx.createLinearGradient(x, h, x, h - barH);
        barGrad.addColorStop(0, 'rgb(0, 200, 0)');       // green (bottom)
        barGrad.addColorStop(0.5, 'rgb(200, 200, 0)');    // yellow (mid)
        barGrad.addColorStop(0.8, 'rgb(255, 140, 0)');    // orange
        barGrad.addColorStop(1, 'rgb(255, 30, 0)');       // red (top)

        ctx.fillStyle = barGrad;
        // Bars grow upward from bottom
        ctx.fillRect(x, h - barH, Math.max(barWidth - gap, 1), barH);
      }
    } else {
      // ═══════════════════════════════════════════
      // STATIC MODE — buffer overview (paused / no analyser)
      // ═══════════════════════════════════════════
      if (!tracks || tracks.length === 0 || duration <= 0) {
        ctx.strokeStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(0, mid);
        ctx.lineTo(w, mid);
        ctx.stroke();
        return;
      }

      const buffers = [];
      tracks.forEach(track => {
        if (track.clips) {
          track.clips.forEach(clip => {
            if (clip.audioBuffer) {
              buffers.push({
                buffer: clip.audioBuffer,
                startTime: clip.startTime || 0,
                audioOffset: clip.audioOffset || 0,
                clipDuration: clip.duration || clip.audioBuffer.duration,
              });
            }
          });
        }
      });

      const playedPx = duration > 0 ? (currentTime / duration) * w : 0;
      const secondsPerPixel = duration / w;

      for (let x = 0; x < w; x++) {
        const t = x * secondsPerPixel;
        let maxAmp = 0;
        for (const b of buffers) {
          const clipEnd = b.startTime + b.clipDuration;
          if (t < b.startTime || t >= clipEnd) continue;
          const timeInClip = t - b.startTime + b.audioOffset;
          const data = b.buffer.getChannelData(0);
          const centerIdx = Math.floor(timeInClip * b.buffer.sampleRate);
          const windowSize = Math.max(1, Math.floor(b.buffer.sampleRate * secondsPerPixel));
          const start = Math.max(0, centerIdx);
          const end = Math.min(data.length, start + windowSize);
          for (let i = start; i < end; i++) {
            maxAmp = Math.max(maxAmp, Math.abs(data[i]));
          }
        }
        const barH = maxAmp * mid * 0.88;
        ctx.fillStyle = x < playedPx
          ? 'rgba(0, 212, 255, 0.7)'
          : 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, mid - barH, 1, barH * 2 || 1);
      }

      // Playhead
      if (playedPx > 0) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.floor(playedPx), 0, 2, h);
      }
    }

    // Center line (both modes)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
  }, [tracks, currentTime, duration, isPlaying]);

  // ── Animation loop — always runs during playback ──
  useEffect(() => {
    if (!isPlaying) {
      drawFrame();
      return;
    }

    let running = true;
    const loop = () => {
      if (!running) return;
      drawFrame();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, drawFrame]);

  // Redraw on tracks/time change when paused
  useEffect(() => {
    if (!isPlaying) drawFrame();
  }, [tracks, currentTime, duration, isPlaying, drawFrame]);

  // Resize observer
  useEffect(() => {
    const obs = new ResizeObserver(() => drawFrame());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [drawFrame]);

  const handleClick = (e) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div ref={containerRef} className="master-waveform" onClick={handleClick}>
      <canvas ref={canvasRef} className="master-waveform__canvas" />
    </div>
  );
};

/**
 * Professional Transport Controls Component
 * 
 * Layout:
 *   Row 1: Master waveform overview
 *   Row 2: Transport buttons + time display (centered)
 *   Row 3: Speed | Auto-scroll | Loop | Volume (centered)
 */
const TransportControls = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  autoScroll = true,
  masterVolume = 1,
  tracks = [],
  audioContext = null,
  masterGainNode = null,
  onPlayPause,
  onStop,
  onSeek,
  onPlaybackRateChange,
  onAutoScrollToggle,
  onMasterVolumeChange
}) => {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Format time to MM:SS.fff
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
  };

  // Handle playback rate changes
  const handleRateChange = (newRate) => {
    onPlaybackRateChange(newRate);
  };

  // Skip backward/forward by 10 seconds
  const skipBackward = () => {
    onSeek(Math.max(0, currentTime - 10));
  };

  const skipForward = () => {
    onSeek(Math.min(duration, currentTime + 10));
  };

  // Common playback rates
  const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="transport-controls">
      {/* Master Waveform Overview */}
      <MasterWaveform
        tracks={tracks}
        currentTime={currentTime}
        duration={duration}
        onSeek={onSeek}
        isPlaying={isPlaying}
        audioContext={audioContext}
        masterGainNode={masterGainNode}
      />

      {/* Row 1: Main transport + time (centered) */}
      <div className="transport-row transport-row--main">
        <div className="main-controls">
          <button
            className="transport-btn skip-btn"
            onClick={skipBackward}
            title="Skip Back 10s (Shift+Left)"
          >
            <SkipBack size={20} />
          </button>

          <button
            className="transport-btn play-pause-btn"
            onClick={onPlayPause}
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>

          <button
            className="transport-btn stop-btn"
            onClick={onStop}
            title="Stop (S)"
          >
            <Square size={20} />
          </button>

          <button
            className="transport-btn skip-btn"
            onClick={skipForward}
            title="Skip Forward 10s (Shift+Right)"
          >
            <SkipForward size={20} />
          </button>
        </div>

        {/* Time Display */}
        <div className="time-display">
          <div className="current-time">
            {formatTime(currentTime)}
          </div>
          <div className="time-separator">/</div>
          <div className="total-time">
            {formatTime(duration)}
          </div>
        </div>
      </div>

      {/* Row 2: Secondary controls (centered) */}
      <div className="transport-row transport-row--secondary">
        {/* Playback Rate Control */}
        <div className="playback-rate-section">
          <label className="rate-label">Speed:</label>
          <div className="rate-buttons">
            {playbackRates.map(rate => (
              <button
                key={rate}
                className={`rate-btn ${playbackRate === rate ? 'active' : ''}`}
                onClick={() => handleRateChange(rate)}
                title={`${rate}x Speed`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Scroll Toggle */}
        <button
          className={`transport-btn auto-scroll-btn ${autoScroll ? 'active' : ''}`}
          onClick={onAutoScrollToggle}
          title={`Auto-Scroll: ${autoScroll ? 'ON' : 'OFF'}`}
        >
          <span className="auto-scroll-icon">📜</span>
          <span className="auto-scroll-text">{autoScroll ? 'Auto' : 'Manual'}</span>
        </button>

        {/* Loop */}
        <button
          className="transport-btn loop-btn"
          title="Loop Selection (L)"
        >
          <Repeat size={18} />
        </button>

        {/* Volume */}
        <div className="volume-section">
          <Volume2 size={18} />
          <input
            type="range"
            min="0"
            max="200"
            value={Math.round(masterVolume * 100)}
            onChange={(e) => onMasterVolumeChange && onMasterVolumeChange(parseInt(e.target.value) / 100)}
            className="volume-slider"
            title={`Master Volume: ${Math.round(masterVolume * 100)}%`}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Info - Collapsible */}
      <div className="shortcuts-info">
        <button
          className="shortcuts-toggle-btn"
          onClick={() => setShortcutsOpen(prev => !prev)}
          title={shortcutsOpen ? 'Hide Keyboard Shortcuts' : 'Show Keyboard Shortcuts'}
        >
          <span className={`shortcuts-toggle-arrow ${shortcutsOpen ? 'open' : ''}`}>▶</span>
          <span>Keyboard Shortcuts</span>
        </button>
        {shortcutsOpen && <div className="shortcuts-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '4px 24px', 
          width: '100%',
          fontSize: '12px',
          color: '#aaa'
        }}>
          {/* Row 1 */}
          <span>🎵 <strong>Playback:</strong> Space: Play/Pause | S: Stop</span>
          <span>🎛️ <strong>Mixing:</strong> Track Headers: Solo/Mute/Volume/Pan</span>
          <span>⚡ <strong>Quick Actions:</strong> Double-Click: Zoom to Fit</span>
          {/* Row 2 */}
          <span>⏭️ <strong>Navigation:</strong> Shift+←/→: Skip 10s | ←/→: Fine Seek</span>
          <span>🎚️ <strong>Track Speed:</strong> Drag slider 0.1x-4x | Click presets</span>
          <span>🎪 <strong>Loop Regions:</strong> Shift+Drag: Create Loop</span>
          {/* Row 3 */}
          <span>✂️ <strong>Editing:</strong> R: Razor Tool | Delete: Remove</span>
          <span>🔄 <strong>Reverse:</strong> Click reverse button per track</span>
          <span>🔧 <strong>Tools:</strong> Click tool buttons or use hotkeys</span>
          {/* Row 4 */}
          <span>📋 <strong>Clipboard:</strong> X: Cut | C: Copy | V: Paste</span>
          <span>📥 <strong>Import:</strong> Multi-select files | Drag & Drop</span>
          <span>⚙️ <strong>Project:</strong> Ctrl+N: New | Ctrl+S: Save</span>
          {/* Row 5 */}
          <span>🔍 <strong>View:</strong> Ctrl+Plus/Minus: Zoom | Ctrl+0: Fit All</span>
          <span>🚀 <strong>Selection:</strong> Ctrl+Click: Multi-Select</span>
          <span>🎵 <strong>Multi-Track:</strong> Each track independent controls</span>
          {/* Row 6 */}
          <span>🎯 <strong>Precision:</strong> Hold Shift: Snap to Grid</span>
          <span>📍 <strong>Markers:</strong> Alt+Click Timeline: Add Marker</span>
          <span>🎬 <strong>Timeline:</strong> Scroll to navigate | Click to seek</span>
          {/* Row 7 */}
          <span>↩️ <strong>History:</strong> Ctrl+Z: Undo | Ctrl+Y: Redo</span>
          <span>🎨 <strong>Workflow:</strong> Right-click clips for context menu</span>
          <span>🏆 <strong>Pro Tip:</strong> Use speed/reverse for creative effects!</span>
        </div>}
      </div>
    </div>
  );
};

export default TransportControls;
