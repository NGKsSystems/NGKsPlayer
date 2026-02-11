/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useWaveform.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/hooks/useWaveform.js

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * useWaveform — real-time audio visualiser for the single-track NowPlaying view.
 *
 * Signature matches what NowPlaying.jsx destructures:
 *   const { waveformCanvasRef, analyzerRef, waveformType, setWaveformType } = useWaveform(
 *     audioRef, isPlaying, beatPulseEnabledRef, beatConfig,
 *     setBeatPulse, setPeakRotation, setDebugValues, useEssentiaBeats
 *   );
 */
const useWaveform = (
  audioRef,
  isPlaying,
  beatPulseEnabledRef,
  beatConfig = {},
  setBeatPulse = () => {},
  setPeakRotation = () => {},
  setDebugValues = () => {},
  useEssentiaBeats = false
) => {
  const waveformCanvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const audioContextRef = useRef(null);
  const isMounted = useRef(true);
  const beatHistoryRef = useRef([]);
  const lastBeatTimeRef = useRef(0);

  const [waveformType, setWaveformType] = useState('bars');

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // ── Connect analyser to the <audio> element ──
  useEffect(() => {
    const audio = audioRef?.current;
    if (!audio) return;

    // Only create source once per <audio> element
    if (sourceNodeRef.current) return;

    try {
      if (!audioContextRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AC();
      }
      const ctx = audioContextRef.current;

      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;

      source.connect(analyser);
      analyser.connect(ctx.destination);

      sourceNodeRef.current = source;
      analyzerRef.current = analyser;
    } catch (err) {
      console.error('[useWaveform] Setup failed:', err);
    }

    return () => {
      // Don't disconnect — MediaElementSource can only be created once
    };
  }, [audioRef]);

  // ── Simple beat detection from frequency data ──
  const detectBeat = useCallback((freqData) => {
    if (!beatPulseEnabledRef?.current) return;

    const config = beatConfig || {};
    const threshold = config.threshold ?? 1.5;
    const gate = config.gate ?? 200;
    const minimum = config.minimum ?? 0.3;

    // Sum low-frequency bins (bass)
    let bass = 0;
    const bassEnd = Math.min(10, freqData.length);
    for (let i = 0; i < bassEnd; i++) {
      bass += freqData[i] / 255;
    }
    bass /= bassEnd;

    // History average
    const history = beatHistoryRef.current;
    history.push(bass);
    if (history.length > 30) history.shift();
    const avg = history.reduce((a, b) => a + b, 0) / history.length;

    const now = performance.now();
    const isBeat = bass > avg * threshold && bass > minimum && (now - lastBeatTimeRef.current) > gate;

    if (isBeat) {
      lastBeatTimeRef.current = now;
      try { setBeatPulse(true); } catch (_) {}
      setTimeout(() => {
        try { setBeatPulse(false); } catch (_) {}
      }, 120);
    }

    try {
      setDebugValues(prev => ({
        ...prev,
        bass: bass.toFixed(3),
        avg: avg.toFixed(3),
        isBeat,
      }));
    } catch (_) {}
  }, [beatPulseEnabledRef, beatConfig, setBeatPulse, setDebugValues]);

  // ── Animation loop ──
  useEffect(() => {
    if (!isPlaying || !analyzerRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Draw idle state
      drawIdle();
      return;
    }

    // Resume context if suspended (Chromium autoplay policy)
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    const analyser = analyzerRef.current;
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    const timeData = new Uint8Array(analyser.frequencyBinCount);

    const draw = () => {
      if (!isMounted.current) return;

      const canvas = waveformCanvasRef.current;
      if (!canvas) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== Math.floor(rect.width) || canvas.height !== Math.floor(rect.height)) {
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
      }

      const ctx = canvas.getContext('2d');
      const w = canvas.width;
      const h = canvas.height;
      const mid = h / 2;

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // Beat detection
      detectBeat(freqData);

      // Clear
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(0, 0, w, h);

      if (waveformType === 'bars') {
        drawBars(ctx, freqData, w, h, mid);
      } else if (waveformType === 'line') {
        drawLine(ctx, timeData, w, h, mid);
      } else if (waveformType === 'circle') {
        drawCircle(ctx, freqData, w, h, mid);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, waveformType, detectBeat]);

  // ── Drawing helpers ──
  function drawIdle() {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    }
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  function drawBars(ctx, freqData, w, h, mid) {
    const binCount = freqData.length;
    const barWidth = Math.max(1, Math.floor(w / binCount));
    const gap = 1;

    for (let i = 0; i < binCount; i++) {
      const x = Math.floor((i / binCount) * w);
      const val = freqData[i] / 255;
      const barH = val * mid * 0.92;

      const hue = 180 + (i / binCount) * 100;
      const lightness = 50 + val * 20;
      const alpha = 0.5 + val * 0.5;

      ctx.fillStyle = `hsla(${hue}, 90%, ${lightness}%, ${alpha})`;
      ctx.fillRect(x, mid - barH, Math.max(barWidth - gap, 1), barH);
      ctx.fillRect(x, mid, Math.max(barWidth - gap, 1), barH);
    }
  }

  function drawLine(ctx, timeData, w, h, mid) {
    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.8)';
    const sliceWidth = w / timeData.length;
    let x = 0;
    for (let i = 0; i < timeData.length; i++) {
      const v = timeData[i] / 128.0;
      const y = v * mid;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
  }

  function drawCircle(ctx, freqData, w, h, mid) {
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.3;
    const binCount = freqData.length;

    ctx.beginPath();
    for (let i = 0; i < binCount; i++) {
      const val = freqData[i] / 255;
      const angle = (i / binCount) * Math.PI * 2 - Math.PI / 2;
      const r = radius + val * radius * 0.8;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner glow
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius);
    grad.addColorStop(0, 'rgba(0, 212, 255, 0.06)');
    grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }

  return {
    waveformCanvasRef,
    analyzerRef,
    waveformType,
    setWaveformType,
  };
};

export default useWaveform;
