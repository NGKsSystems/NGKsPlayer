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
  const autoTuneCalibrationRef = useRef({
    samples: [],
    startTime: 0,
    calibrated: false,
    calibrationDuration: 3000, // 3 seconds of sampling
  });
  const beatDetectionRef = useRef({
    lastBeat: 0,
    threshold: 165,
    bassHistory: [],
    kickHistory: [],        // isolated 40-150Hz kick energy history
    kickEnvelope: 0,        // smoothed kick energy (envelope follower)
    beatIntervals: [],      // last N beat intervals for smoothing
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

        // ══════════════════════════════════════════════
        //  BEAT DETECTION — kick-band isolated (40-150 Hz)
        // ══════════════════════════════════════════════
        // With sampleRate ≈ 44100 and fftSize = 2048:
        //   bin resolution = 44100 / 2048 ≈ 21.53 Hz
        //   40 Hz  → bin 2
        //   150 Hz → bin 7
        //   200 Hz → bin 9   (upper safety margin)
        //   2 kHz  → bin 93  (old bassEnd — way too wide, catches hats/snare)
        //
        // We isolate kick energy (40-150 Hz) for beat detection,
        // but still compute full bass/mid/high for the spectrum display.

        const sampleRate = audioContextRef.current?.sampleRate || 44100;
        const binHz = sampleRate / (analyzerRef.current?.fftSize || 2048);

        // ── Kick-isolated band (40-150 Hz) ──
        const kickLowBin = Math.max(1, Math.round(40 / binHz));
        const kickHighBin = Math.min(bufferLength - 1, Math.round(150 / binHz));
        let kickSum = 0;
        const kickBinCount = kickHighBin - kickLowBin + 1;
        for (let i = kickLowBin; i <= kickHighBin; i++) {
          kickSum += frequencyData[i];
        }
        const kickEnergy = kickSum / kickBinCount;

        // ── Full-range bands for spectrum display only ──
        const bassEnd = Math.floor(bufferLength * 0.1);
        const midStart = bassEnd;
        const midEnd = Math.floor(bufferLength * 0.4);
        const highStart = midEnd;

        let bassSum = 0, midSum = 0, highSum = 0;
        for (let i = 0; i < bassEnd; i++) bassSum += frequencyData[i];
        for (let i = midStart; i < midEnd; i++) midSum += frequencyData[i];
        for (let i = highStart; i < bufferLength; i++) highSum += frequencyData[i];

        const bassAverage = bassSum / bassEnd;
        const midAverage = midSum / (midEnd - midStart);
        const highAverage = highSum / (bufferLength - highStart);

        // ── Envelope follower — smooths kick energy to reject noise ──
        // Attack fast (0.3), release slow (0.05) — tracks transients, ignores tails
        const bd = beatDetectionRef.current;
        const attackCoeff = 0.3;
        const releaseCoeff = 0.05;
        if (kickEnergy > bd.kickEnvelope) {
          bd.kickEnvelope = bd.kickEnvelope + attackCoeff * (kickEnergy - bd.kickEnvelope);
        } else {
          bd.kickEnvelope = bd.kickEnvelope + releaseCoeff * (kickEnergy - bd.kickEnvelope);
        }

        // ── Kick history + adaptive average ──
        if (!bd.kickHistory) bd.kickHistory = [];
        bd.kickHistory.push(bd.kickEnvelope);
        const historyLen = beatDetectionConfig?.beatHistoryLength || 30;
        if (bd.kickHistory.length > historyLen) bd.kickHistory.shift();

        // Also maintain full-bass history for spectrum/auto-tune
        if (!bd.bassHistory) bd.bassHistory = [];
        bd.bassHistory.push(bassAverage);
        if (bd.bassHistory.length > historyLen) bd.bassHistory.shift();

        const avgKick = bd.kickHistory.reduce((a, b) => a + b, 0) / bd.kickHistory.length;
        const avgBass = bd.bassHistory.reduce((a, b) => a + b, 0) / bd.bassHistory.length;

        // ── AUTO-TUNE CALIBRATION ──
        // Samples bass energy for ~3 seconds, then computes optimal parameters
        const autoTuneRef = beatDetectionConfig?.autoTuneEnabledRef;
        const setAutoTuneStatus = beatDetectionConfig?.setAutoTuneStatus;
        const isAutoTuning = autoTuneRef?.current;

        if (isAutoTuning) {
          const cal = autoTuneCalibrationRef.current;
          if (!cal.calibrated) {
            if (cal.startTime === 0) {
              // Begin calibration
              cal.startTime = Date.now();
              cal.samples = [];
              cal.calibrated = false;
              if (setAutoTuneStatus) setAutoTuneStatus('calibrating');
            }

            // Collect kick energy samples (isolated 40-150Hz, not full bass)
            cal.samples.push(bd.kickEnvelope);

            const elapsed = Date.now() - cal.startTime;
            if (elapsed >= cal.calibrationDuration && cal.samples.length > 30) {
              // ── Compute optimal parameters from collected data ──
              const sorted = [...cal.samples].sort((a, b) => a - b);
              const len = sorted.length;
              const mean = sorted.reduce((a, b) => a + b, 0) / len;
              const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / len;
              const stddev = Math.sqrt(variance);

              // Percentiles for robust estimation
              const p25 = sorted[Math.floor(len * 0.25)];
              const p75 = sorted[Math.floor(len * 0.75)];
              const p90 = sorted[Math.floor(len * 0.90)];

              // ── Auto-set threshold ──
              // Threshold = ratio where a spike stands out from average
              // For dynamic music: ~1.2-1.4x, for compressed: ~1.1-1.2x
              const dynamicRange = (p90 - p25) / Math.max(mean, 1);
              let optimalThreshold;
              if (dynamicRange > 0.6) {
                // Dynamic music (rock, metal) — spikes are pronounced
                optimalThreshold = 1.25;
              } else if (dynamicRange > 0.3) {
                // Moderate dynamics (pop, hip-hop)
                optimalThreshold = 1.15;
              } else {
                // Heavily compressed (EDM, modern pop)
                optimalThreshold = 1.08;
              }
              optimalThreshold = Math.max(1.05, Math.min(2.0, optimalThreshold));

              // ── Auto-set minimum ──
              // Minimum = noise floor filter — use 25th percentile
              const optimalMinimum = Math.max(20, Math.round(p25 * 0.8));

              // ── Auto-set gate (ms between beats) ──
              // Use BPM if available: gate = half a beat interval
              const bpm = beatDetectionConfig?.detectedBPM;
              let optimalGate;
              if (bpm && bpm > 0) {
                const msPerBeat = 60000 / bpm;
                optimalGate = Math.round(msPerBeat * 0.45); // slightly less than half-beat
              } else {
                // No BPM — estimate from dynamic range
                optimalGate = dynamicRange > 0.5 ? 200 : 150;
              }
              optimalGate = Math.max(80, Math.min(500, optimalGate));

              // ── Auto-set history length ──
              // Shorter history = faster adaptation, longer = smoother
              const optimalHistory = dynamicRange > 0.5 ? 40 : 25;

              // Apply computed values via the setter functions
              if (beatDetectionConfig?.setBeatSpikeThreshold) {
                beatDetectionConfig.setBeatSpikeThreshold(parseFloat(optimalThreshold.toFixed(2)));
              }
              if (beatDetectionConfig?.setBeatMinimum) {
                beatDetectionConfig.setBeatMinimum(optimalMinimum);
              }
              if (beatDetectionConfig?.setBeatGate) {
                beatDetectionConfig.setBeatGate(optimalGate);
              }
              if (beatDetectionConfig?.setBeatHistoryLength) {
                beatDetectionConfig.setBeatHistoryLength(optimalHistory);
              }

              cal.calibrated = true;
              if (setAutoTuneStatus) setAutoTuneStatus('tuned');

              console.log('[AutoTune] Calibration complete:', {
                samples: len,
                mean: mean.toFixed(1),
                stddev: stddev.toFixed(1),
                dynamicRange: dynamicRange.toFixed(3),
                p25: p25.toFixed(1),
                p75: p75.toFixed(1),
                p90: p90.toFixed(1),
                bpm: bpm || 'N/A',
                result: { threshold: optimalThreshold, minimum: optimalMinimum, gate: optimalGate, history: optimalHistory }
              });
            }
          }
        } else {
          // Auto-tune disabled — reset calibration state so it can re-run
          const cal = autoTuneCalibrationRef.current;
          if (cal.calibrated || cal.startTime > 0) {
            cal.samples = [];
            cal.startTime = 0;
            cal.calibrated = false;
          }
        }

        const threshold = beatDetectionConfig?.beatThresholdRef?.current ?? 1.5;
        const minimum = beatDetectionConfig?.beatMinRef?.current ?? 80;
        const gate = beatDetectionConfig?.beatGateRef?.current ?? 200;

        // ── Beat detection uses KICK energy (40-150Hz), not full bass ──
        const kickSpike = bd.kickEnvelope > avgKick * threshold;
        const aboveMin = bd.kickEnvelope > minimum;

        const now = Date.now();
        const timeSinceLastBeat = now - bd.lastBeat;

        // Update debug display every 10 frames
        bd.debugCounter++;
        if (bd.debugCounter % 10 === 0) {
          setDebugValues({
            bass: Math.round(bd.kickEnvelope),    // show kick energy, not full bass
            avgBass: Math.round(avgKick),          // show kick average
            spike: kickSpike,
            min: aboveMin,
            gate: timeSinceLastBeat > gate
          });
        }

        // Skip custom beat detection if Essentia is enabled
        if (!useEssentiaBeats && beatPulseEnabledRef?.current && kickSpike && aboveMin && timeSinceLastBeat > gate) {
          // ── Interval smoothing — reject outlier intervals ──
          if (!bd.beatIntervals) bd.beatIntervals = [];
          if (bd.lastBeat > 0) {
            bd.beatIntervals.push(timeSinceLastBeat);
            if (bd.beatIntervals.length > 8) bd.beatIntervals.shift();
          }

          // Median-filter: only fire if this interval is within 50% of median
          // This rejects double-triggers and half-time hits
          let intervalOk = true;
          if (bd.beatIntervals.length >= 4) {
            const sorted = [...bd.beatIntervals].sort((a, b) => a - b);
            const median = sorted[Math.floor(sorted.length / 2)];
            const ratio = timeSinceLastBeat / median;
            // Accept if within 0.5x–2.0x of median (allows some swing)
            intervalOk = ratio > 0.5 && ratio < 2.0;
          }

          if (intervalOk) {
            bd.lastBeat = now;
            bd.beatStrength = Math.min((bd.kickEnvelope / avgKick), 2);

            setBeatPulse(true);
            setTimeout(() => setBeatPulse(false), 150);

            // Detect SUPER PEAK beats
            if (bd.kickEnvelope > avgKick * 1.6 && timeSinceLastBeat > 1500) {
              bd.lastPeak = now;
              setPeakRotation(true);
              setTimeout(() => setPeakRotation(false), 1500);
            }
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
