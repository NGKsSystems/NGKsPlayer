/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useWaveform.js
 * Purpose: Real-time frequency spectrum analyzer with 3 visualisation modes
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/hooks/useWaveform.js

import { useState, useRef, useEffect } from 'react';

/**
 * useWaveform — real-time audio visualiser for the single-track NowPlaying view.
 *
 * Three Frequency Spectrum Analyzers:
 *   1. Line   — time-domain oscilloscope waveform
 *   2. Bars   — frequency spectrum with per-bin bars, 3-zone colours, peak dots
 *   3. Circle — circular radial frequency visualizer
 *
 * Signature matches what NowPlaying.jsx destructures:
 *   const { waveformCanvasRef, analyzerRef, waveformType, setWaveformType } = useWaveform(
 *     audioRef, isPlaying, beatPulseEnabledRef, beatConfig,
 *     setBeatPulse, setPeakRotation, setDebugValues, useEssentiaBeats
 *   );
 */
export function useWaveform(audioRef, isPlaying, beatPulseEnabledRef, beatDetectionConfig, setBeatPulse, setPeakRotation, setDebugValues, useEssentiaBeats) {
  const [waveformType, setWaveformType] = useState('line'); // 'line', 'bars', 'circle', 'none'

  const waveformCanvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const essentiaSourceNodeRef = useRef(null);
  const peakDotsRef = useRef([]);
  const beatDetectionRef = useRef({
    lastBeat: 0,
    threshold: 165,
    bassHistory: [],
    midHistory: [],
    highHistory: [],
    lastPeak: 0,
    adaptiveThreshold: 165,
    beatStrength: 0,
    debugCounter: 0
  });

  // ── Connect analyser to the <audio> element's existing Web Audio chain ──
  // NowPlaying already calls createMediaElementSource and stores nodes on the
  // element as __ngksMainSourceNode / __ngksMainGainNode / __ngksMainAudioContext.
  // We MUST NOT call createMediaElementSource again (throws InvalidStateError).
  // Instead, tap the existing gain node with a passive analyser branch.
  useEffect(() => {
    const setupWaveform = async () => {
      if (!audioRef.current || !waveformCanvasRef.current) return;

      try {
        if (!audioContextRef.current) {
          const audio = audioRef.current;

          // Try to use the existing NowPlaying audio chain first
          const existingCtx = audio.__ngksMainAudioContext;
          const existingGain = audio.__ngksMainGainNode;

          if (existingCtx && existingGain) {
            // Tap into existing chain — no duplicate createMediaElementSource
            audioContextRef.current = existingCtx;
            analyzerRef.current = existingCtx.createAnalyser();
            analyzerRef.current.fftSize = 2048;
            analyzerRef.current.smoothingTimeConstant = 0.6;

            // Passive tap: gainNode → analyser (analyser not routed to destination)
            existingGain.connect(analyzerRef.current);
            essentiaSourceNodeRef.current = audio.__ngksMainSourceNode;
          } else {
            // Fallback: chain not ready yet — retry shortly
            const retryInterval = setInterval(() => {
              const ctx2 = audio.__ngksMainAudioContext;
              const gain2 = audio.__ngksMainGainNode;
              if (ctx2 && gain2) {
                clearInterval(retryInterval);
                audioContextRef.current = ctx2;
                analyzerRef.current = ctx2.createAnalyser();
                analyzerRef.current.fftSize = 2048;
                analyzerRef.current.smoothingTimeConstant = 0.6;
                gain2.connect(analyzerRef.current);
                essentiaSourceNodeRef.current = audio.__ngksMainSourceNode;
                drawWaveform();
              }
            }, 200);
            return;
          }
        }

        // Cancel previous animation loop
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Start animation loop
        drawWaveform();
      } catch (err) {
        console.warn('[Waveform] Setup failed:', err);
      }
    };

    const drawWaveform = () => {
      if (!waveformCanvasRef.current || !analyzerRef.current) return;

      const canvas = waveformCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const analyzer = analyzerRef.current;

      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const frequencyData = new Uint8Array(bufferLength);

      const draw = () => {
        animationFrameRef.current = requestAnimationFrame(draw);

        // Set canvas size to match container
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
          canvas.width = rect.width;
          canvas.height = rect.height;
        }

        const width = canvas.width;
        const height = canvas.height;

        // Clear with dark background
        ctx.fillStyle = 'rgb(31, 41, 55)'; // gray-800
        ctx.fillRect(0, 0, width, height);

        // Only draw waveform if playing
        if (!isPlaying || waveformType === 'none') {
          return;
        }

        analyzer.getByteTimeDomainData(dataArray);
        analyzer.getByteFrequencyData(frequencyData);

        // Beat detection with multi-frequency analysis
        const bassEnd = Math.floor(bufferLength * 0.1);
        const midStart = bassEnd;
        const midEnd = Math.floor(bufferLength * 0.4);
        const highStart = midEnd;

        let bassSum = 0, midSum = 0, highSum = 0;

        for (let i = 0; i < bassEnd; i++) {
          bassSum += frequencyData[i];
        }
        for (let i = midStart; i < midEnd; i++) {
          midSum += frequencyData[i];
        }
        for (let i = highStart; i < bufferLength; i++) {
          highSum += frequencyData[i];
        }

        const bassAverage = bassSum / bassEnd;
        const midAverage = midSum / (midEnd - midStart);
        const highAverage = highSum / (bufferLength - highStart);

        if (!beatDetectionRef.current.bassHistory) {
          beatDetectionRef.current.bassHistory = [];
          beatDetectionRef.current.midHistory = [];
          beatDetectionRef.current.highHistory = [];
        }

        beatDetectionRef.current.bassHistory.push(bassAverage);
        beatDetectionRef.current.midHistory.push(midAverage);
        beatDetectionRef.current.highHistory.push(highAverage);

        if (beatDetectionRef.current.bassHistory.length > (beatDetectionConfig?.beatHistoryLength || 30)) {
          beatDetectionRef.current.bassHistory.shift();
          beatDetectionRef.current.midHistory.shift();
          beatDetectionRef.current.highHistory.shift();
        }

        const avgBass = beatDetectionRef.current.bassHistory.reduce((a, b) => a + b, 0) / beatDetectionRef.current.bassHistory.length;

        const threshold = beatDetectionConfig?.beatThresholdRef?.current ?? 1.5;
        const minimum = beatDetectionConfig?.beatMinRef?.current ?? 80;
        const gate = beatDetectionConfig?.beatGateRef?.current ?? 200;

        const bassSpike = bassAverage > avgBass * threshold;
        const aboveMin = bassAverage > minimum;

        const now = Date.now();
        const timeSinceLastBeat = now - beatDetectionRef.current.lastBeat;

        // Update debug display every 10 frames
        beatDetectionRef.current.debugCounter++;
        if (beatDetectionRef.current.debugCounter % 10 === 0) {
          setDebugValues({
            bass: Math.round(bassAverage),
            avgBass: Math.round(avgBass),
            spike: bassSpike,
            min: aboveMin,
            gate: timeSinceLastBeat > gate
          });
        }

        // Skip custom beat detection if Essentia is enabled
        if (!useEssentiaBeats && beatPulseEnabledRef?.current && bassSpike && aboveMin && timeSinceLastBeat > gate) {
          beatDetectionRef.current.lastBeat = now;
          beatDetectionRef.current.beatStrength = Math.min((bassAverage / avgBass), 2);

          setBeatPulse(true);
          setTimeout(() => setBeatPulse(false), 150);

          // Detect SUPER PEAK beats
          if (bassAverage > avgBass * 1.6 && timeSinceLastBeat > 1500) {
            beatDetectionRef.current.lastPeak = now;
            setPeakRotation(true);
            setTimeout(() => setPeakRotation(false), 1500);
          }
        }

        // ── Theme colour helpers ──
        const getThemeColor = (varName) => {
          return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        };

        const getDynamicColor = () => {
          const waveformColor = getThemeColor('--waveform-line') || '#fc6323';
          return waveformColor;
        };

        // ══════════════════════════════════════════════
        //  DRAW: LINE — time-domain oscilloscope
        // ══════════════════════════════════════════════
        if (waveformType === 'line') {
          ctx.lineWidth = 2;
          ctx.strokeStyle = getDynamicColor();
          ctx.beginPath();

          const sliceWidth = width / bufferLength;
          let x = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(width, height / 2);
          ctx.stroke();

        // ══════════════════════════════════════════════
        //  DRAW: BARS — frequency spectrum analyser
        // ══════════════════════════════════════════════
        } else if (waveformType === 'bars') {
          const barWidth = (width / bufferLength) * 2.5;
          let x = 0;

          const bassColor = getThemeColor('--accent-primary') || '#fc6323';
          const midColor = getThemeColor('--accent-secondary') || '#a03c88';
          const highColor = getThemeColor('--accent-success') || '#00ff9f';
          const peakColor = getThemeColor('--waveform-line') || '#ffffff';

          if (peakDotsRef.current.length !== bufferLength) {
            peakDotsRef.current = Array(bufferLength).fill(null).map(() => ({
              height: 0,
              timestamp: now
            }));
          }

          for (let i = 0; i < bufferLength; i++) {
            const barHeight = (frequencyData[i] / 255) * height * 0.85;
            const intensity = frequencyData[i] / 255;

            let barColor;
            if (i < bufferLength * 0.15) {
              barColor = bassColor;
              ctx.globalAlpha = 0.8 + (intensity * 0.2);
            } else if (i < bufferLength * 0.5) {
              barColor = midColor;
              ctx.globalAlpha = 0.7 + (intensity * 0.3);
            } else {
              barColor = highColor;
              ctx.globalAlpha = 0.6 + (intensity * 0.4);
            }

            ctx.fillStyle = barColor;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            // ── Peak dots — hold at peak for 2s then slowly fall ──
            const peak = peakDotsRef.current[i];
            if (barHeight > peak.height) {
              peak.height = barHeight;
              peak.timestamp = now;
            } else {
              const timeSincePeak = now - peak.timestamp;
              const fallDelay = 2000;
              if (timeSincePeak > fallDelay) {
                const fallSpeed = 0.5;
                peak.height = Math.max(barHeight, peak.height - fallSpeed);
              }
            }

            if (peak.height > 5) {
              const dotY = height - peak.height;
              const dotSize = 3;

              ctx.globalAlpha = 1;
              ctx.fillStyle = peakColor;
              ctx.fillRect(x, dotY - dotSize, barWidth, dotSize);
            }

            x += barWidth + 1;
          }
          ctx.globalAlpha = 1;

        // ══════════════════════════════════════════════
        //  DRAW: CIRCLE — circular radial frequency
        // ══════════════════════════════════════════════
        } else if (waveformType === 'circle') {
          ctx.lineWidth = 2;
          ctx.strokeStyle = getDynamicColor();
          ctx.beginPath();

          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) * 0.3;

          for (let i = 0; i < bufferLength; i++) {
            const angle = (i / bufferLength) * Math.PI * 2;
            const amplitude = (dataArray[i] / 128.0 - 1) * radius * 0.6;
            const px = centerX + Math.cos(angle) * (radius + amplitude);
            const py = centerY + Math.sin(angle) * (radius + amplitude);

            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }

          ctx.closePath();
          ctx.stroke();
        }
      };

      draw();
    };

    setupWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [waveformType, isPlaying, beatPulseEnabledRef, beatDetectionConfig, setBeatPulse, setPeakRotation, setDebugValues, useEssentiaBeats, audioRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Don't close the audio context — it belongs to NowPlaying
    };
  }, []);

  return {
    waveformType,
    setWaveformType,
    waveformCanvasRef,
    audioContextRef,
    analyzerRef,
    essentiaSourceNodeRef
  };
}

export default useWaveform;
