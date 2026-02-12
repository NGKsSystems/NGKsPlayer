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
    bassHistory: [],
    midHistory: [],
    highHistory: [],
    lastPeak: 0,
    beatStrength: 0,
    debugCounter: 0,
    // Spectral flux onset detection
    prevFrequencyData: null,   // previous frame for flux calculation
    onsetHistory: [],           // rolling window for μ+kσ
    lastOnsetValue: 0,          // for local maxima detection
    wasRising: false,           // was onset rising last frame?
    wasAboveThreshold: false,   // was onset above threshold last frame?
    // Debug statistics (rolling 20s window)
    debugStats: null
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
            analyzerRef.current.smoothingTimeConstant = 0.3;

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
                analyzerRef.current.smoothingTimeConstant = 0.3;
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
        //  BEAT DETECTION — Two-band spectral flux
        // ══════════════════════════════════════════════
        // Spectral flux measures frame-to-frame CHANGE in magnitude.
        // This detects transients (drum hits) even in compressed mixes
        // where raw energy doesn't spike enough.
        //
        // Two bands:
        //   Body:   50–180 Hz  (kick drum fundamental)
        //   Attack: 2–6 kHz   (beater click / stick attack)
        //   Combined onset = 0.7*body + 0.3*attack
        //
        // Adaptive threshold: μ + k*σ (rolling ~1.5s window)
        // Peak picking: local maxima (rising→falling while above threshold)

        const sampleRate = audioContextRef.current?.sampleRate || 44100;
        const binHz = sampleRate / (analyzerRef.current?.fftSize || 2048);

        // ── Full-range bands for spectrum display ──
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

        // ── Spectral flux onset detection ──
        const bd = beatDetectionRef.current;

        // Initialize previous frame buffer on first run
        if (!bd.prevFrequencyData) {
          bd.prevFrequencyData = new Uint8Array(bufferLength);
          bd.prevFrequencyData.set(frequencyData);
        }

        // Two-band spectral flux
        //   Body band: 50–180 Hz (kick fundamental)
        const bodyLow = Math.max(1, Math.round(50 / binHz));
        const bodyHigh = Math.min(bufferLength - 1, Math.round(180 / binHz));
        //   Attack band: 2–6 kHz (beater click)
        const attackLow = Math.round(2000 / binHz);
        const attackHigh = Math.min(bufferLength - 1, Math.round(6000 / binHz));

        let bodyFlux = 0;
        for (let i = bodyLow; i <= bodyHigh; i++) {
          const diff = frequencyData[i] - bd.prevFrequencyData[i];
          if (diff > 0) bodyFlux += diff;
        }

        let attackFlux = 0;
        for (let i = attackLow; i <= attackHigh; i++) {
          const diff = frequencyData[i] - bd.prevFrequencyData[i];
          if (diff > 0) attackFlux += diff;
        }

        // Store current frame for next iteration
        bd.prevFrequencyData.set(frequencyData);

        // Combine body + attack, log-compress for dynamic range
        const rawOnset = 0.7 * bodyFlux + 0.3 * attackFlux;
        const onset = Math.log1p(rawOnset);

        // ── Rolling μ+kσ adaptive threshold ──
        // ~90 frames ≈ 1.5s at 60fps
        const historyLen = beatDetectionConfig?.beatHistoryLength || 90;
        if (!bd.onsetHistory) bd.onsetHistory = [];
        bd.onsetHistory.push(onset);
        if (bd.onsetHistory.length > historyLen) bd.onsetHistory.shift();

        let onsetMean = 0;
        for (let i = 0; i < bd.onsetHistory.length; i++) onsetMean += bd.onsetHistory[i];
        onsetMean /= bd.onsetHistory.length;

        let onsetVariance = 0;
        for (let i = 0; i < bd.onsetHistory.length; i++) {
          onsetVariance += (bd.onsetHistory[i] - onsetMean) ** 2;
        }
        onsetVariance /= bd.onsetHistory.length;
        const onsetStd = Math.sqrt(onsetVariance);

        // k = user's threshold slider (0.5–3.0, default 1.5)
        const k = beatDetectionConfig?.beatThresholdRef?.current ?? 1.5;
        const minimum = beatDetectionConfig?.beatMinRef?.current ?? 0.5;
        const gate = beatDetectionConfig?.beatGateRef?.current ?? 120;

        const adaptiveThreshold = onsetMean + k * onsetStd;

        // ── Debug statistics (rolling 20s window) ──
        const now = Date.now();
        if (!bd.debugStats) {
          bd.debugStats = {
            onsetMin: Infinity, onsetMax: 0, onsetSum: 0, onsetCount: 0,
            peaksFound: 0, peaksKept: 0, windowStart: now
          };
        }
        const stats = bd.debugStats;
        if (now - stats.windowStart > 20000) {
          stats.onsetMin = Infinity;
          stats.onsetMax = 0;
          stats.onsetSum = 0;
          stats.onsetCount = 0;
          stats.peaksFound = 0;
          stats.peaksKept = 0;
          stats.windowStart = now;
        }
        stats.onsetMin = Math.min(stats.onsetMin, onset);
        stats.onsetMax = Math.max(stats.onsetMax, onset);
        stats.onsetSum += onset;
        stats.onsetCount++;

        // ── AUTO-TUNE CALIBRATION ──
        // Samples onset values for ~3 seconds, then computes optimal k, gate, etc.
        const autoTuneRef = beatDetectionConfig?.autoTuneEnabledRef;
        const setAutoTuneStatus = beatDetectionConfig?.setAutoTuneStatus;
        const isAutoTuning = autoTuneRef?.current;

        if (isAutoTuning) {
          const cal = autoTuneCalibrationRef.current;
          if (!cal.calibrated) {
            if (cal.startTime === 0) {
              cal.startTime = Date.now();
              cal.samples = [];
              cal.calibrated = false;
              if (setAutoTuneStatus) setAutoTuneStatus('calibrating');
            }

            // Sample onset values (spectral flux, not raw energy)
            cal.samples.push(onset);

            const elapsed = Date.now() - cal.startTime;
            if (elapsed >= cal.calibrationDuration && cal.samples.length > 30) {
              const sorted = [...cal.samples].sort((a, b) => a - b);
              const len = sorted.length;
              const mean = sorted.reduce((a, b) => a + b, 0) / len;
              const variance = sorted.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / len;
              const stddev = Math.sqrt(variance);

              const p25 = sorted[Math.floor(len * 0.25)];
              const p75 = sorted[Math.floor(len * 0.75)];
              const p90 = sorted[Math.floor(len * 0.90)];

              // Dynamic range in spectral-flux onset units
              const dynamicRange = (p90 - p25) / Math.max(mean, 0.1);

              // ── Optimal k (threshold multiplier for μ+kσ) ──
              let optimalK;
              if (dynamicRange > 1.0) {
                optimalK = 1.8;   // Very dynamic — higher k avoids noise
              } else if (dynamicRange > 0.5) {
                optimalK = 1.4;   // Moderate dynamics
              } else {
                optimalK = 1.1;   // Compressed — low k to catch beats
              }
              optimalK = Math.max(0.8, Math.min(2.5, optimalK));

              // ── Optimal minimum (onset floor) ──
              const optimalMinimum = Math.max(0.1, parseFloat((p25 * 0.5).toFixed(1)));

              // ── Optimal gate from BPM ──
              const bpm = beatDetectionConfig?.detectedBPM;
              let optimalGate;
              if (bpm && bpm > 0) {
                const msPerBeat = 60000 / bpm;
                optimalGate = Math.round(msPerBeat * 0.35);
              } else {
                optimalGate = 120;
              }
              optimalGate = Math.max(80, Math.min(400, optimalGate));

              const optimalHistory = dynamicRange > 0.8 ? 120 : 90;

              if (beatDetectionConfig?.setBeatSpikeThreshold) {
                beatDetectionConfig.setBeatSpikeThreshold(parseFloat(optimalK.toFixed(2)));
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
                mean: mean.toFixed(2),
                stddev: stddev.toFixed(2),
                dynamicRange: dynamicRange.toFixed(3),
                p25: p25.toFixed(2),
                p75: p75.toFixed(2),
                p90: p90.toFixed(2),
                bpm: bpm || 'N/A',
                result: { k: optimalK, minimum: optimalMinimum, gate: optimalGate, history: optimalHistory }
              });
            }
          }
        } else {
          const cal = autoTuneCalibrationRef.current;
          if (cal.calibrated || cal.startTime > 0) {
            cal.samples = [];
            cal.startTime = 0;
            cal.calibrated = false;
          }
        }

        // ── Local maxima peak picking ──
        // Instead of triggering on first threshold crossing, detect when
        // onset rises above threshold then starts falling — that's the peak.
        const isAboveThreshold = onset > adaptiveThreshold && onset > minimum;
        const currentlyRising = onset >= (bd.lastOnsetValue || 0);

        // Local maximum = was rising + above threshold, now falling
        const isLocalMax = bd.wasRising && !currentlyRising && bd.wasAboveThreshold;

        bd.wasRising = currentlyRising;
        bd.wasAboveThreshold = isAboveThreshold;
        bd.lastOnsetValue = onset;

        const timeSinceLastBeat = now - bd.lastBeat;

        // Update debug display every 10 frames
        bd.debugCounter++;
        if (bd.debugCounter % 10 === 0) {
          const onsetAvg = stats.onsetCount > 0 ? stats.onsetSum / stats.onsetCount : 0;
          setDebugValues({
            bass: onset.toFixed(1),                // onset value (spectral flux)
            avgBass: adaptiveThreshold.toFixed(1),  // adaptive threshold (μ+kσ)
            spike: isAboveThreshold,
            min: onset > minimum,
            gate: timeSinceLastBeat > gate,
            // Extended 20s diagnostic stats
            onsetMin: stats.onsetMin === Infinity ? '0.0' : stats.onsetMin.toFixed(1),
            onsetMax: stats.onsetMax.toFixed(1),
            onsetAvg: onsetAvg.toFixed(1),
            peaksFound: stats.peaksFound,
            peaksKept: stats.peaksKept,
          });
        }

        // ── Fire beat on local maximum (skip if Essentia is active) ──
        if (!useEssentiaBeats && beatPulseEnabledRef?.current && isLocalMax) {
          stats.peaksFound++;

          if (timeSinceLastBeat > gate) {
            stats.peaksKept++;
            bd.lastBeat = now;
            bd.beatStrength = Math.min(onset / Math.max(adaptiveThreshold, 0.1), 2);

            setBeatPulse(true);
            setTimeout(() => setBeatPulse(false), 150);

            // Detect SUPER PEAK beats (very strong onset after a long gap)
            if (onset > adaptiveThreshold * 1.8 && timeSinceLastBeat > 1500) {
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
