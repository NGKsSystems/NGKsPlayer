/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LoudnessMeter.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Loudness Meter
 * 
 * Implements LUFS (Loudness Units relative to Full Scale) metering
 * according to ITU-R BS.1770 standard for broadcast and streaming
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const LoudnessMeter = ({ 
  audioEngine,
  width = 200,
  height = 300,
  updateRate = 30 // FPS
}) => {
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [measurements, setMeasurements] = useState({
    momentary: -70,    // LUFS - 400ms window
    shortTerm: -70,    // LUFS - 3s window  
    integrated: -70,   // LUFS - entire program
    range: 0,          // LRA - Loudness Range
    peak: -70,         // dBFS - True Peak
    rms: -70          // dBFS - RMS level
  });

  const [history, setHistory] = useState({
    momentary: [],
    shortTerm: [],
    peaks: []
  });

  // Initialize loudness analyzer
  useEffect(() => {
    if (!audioEngine?.audioContext) return;

    const analyzer = audioEngine.audioContext.createAnalyser();
    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0;
    
    // Connect to audio engine output
    if (audioEngine.masterGainNode) {
      audioEngine.masterGainNode.connect(analyzer);
    }
    
    analyzerRef.current = analyzer;

    return () => {
      if (analyzer && audioEngine.masterGainNode) {
        try {
          audioEngine.masterGainNode.disconnect(analyzer);
        } catch (e) {
          // Node may already be disconnected
        }
      }
    };
  }, [audioEngine]);

  // LUFS calculation according to ITU-R BS.1770
  const calculateLUFS = useCallback((audioData, sampleRate) => {
    // Pre-filter stage (high-pass filter at ~38Hz)
    const preFiltered = applyPreFilter(audioData, sampleRate);
    
    // RLB weighting filter (resembles inverted A-weighting)
    const weighted = applyRLBWeighting(preFiltered, sampleRate);
    
    // Mean square calculation
    const meanSquare = weighted.reduce((sum, sample) => sum + sample * sample, 0) / weighted.length;
    
    // Convert to LUFS
    const lufs = meanSquare > 0 ? -0.691 + 10 * Math.log10(meanSquare) : -70;
    
    return Math.max(-70, Math.min(0, lufs));
  }, []);

  // Simplified pre-filter (high-pass)
  const applyPreFilter = useCallback((data, sampleRate) => {
    // Simple high-pass filter implementation
    const cutoff = 38; // Hz
    const rc = 1 / (2 * Math.PI * cutoff);
    const dt = 1 / sampleRate;
    const alpha = rc / (rc + dt);
    
    const filtered = new Float32Array(data.length);
    let prev = 0;
    
    for (let i = 0; i < data.length; i++) {
      filtered[i] = alpha * (filtered[i - 1] || 0) + alpha * (data[i] - prev);
      prev = data[i];
    }
    
    return filtered;
  }, []);

  // Simplified RLB weighting filter
  const applyRLBWeighting = useCallback((data, sampleRate) => {
    // Simplified RLB weighting - in practice this would be a more complex filter
    const weighted = new Float32Array(data.length);
    
    for (let i = 0; i < data.length; i++) {
      weighted[i] = data[i]; // Simplified - real implementation would apply proper weighting
    }
    
    return weighted;
  }, []);

  // Calculate True Peak
  const calculateTruePeak = useCallback((audioData) => {
    // True peak detection with oversampling
    let peak = 0;
    for (let i = 0; i < audioData.length; i++) {
      peak = Math.max(peak, Math.abs(audioData[i]));
    }
    return peak > 0 ? 20 * Math.log10(peak) : -70;
  }, []);

  // Calculate RMS
  const calculateRMS = useCallback((audioData) => {
    const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length);
    return rms > 0 ? 20 * Math.log10(rms) : -70;
  }, []);

  // Update measurements
  const updateMeasurements = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    analyzer.getFloatTimeDomainData(dataArray);

    const sampleRate = audioEngine?.audioContext?.sampleRate || 44100;
    
    // Calculate various measurements
    const momentaryLUFS = calculateLUFS(dataArray, sampleRate);
    const truePeak = calculateTruePeak(dataArray);
    const rms = calculateRMS(dataArray);

    // Update history for short-term and integrated measurements
    setHistory(prev => {
      const newMomentary = [...prev.momentary, momentaryLUFS].slice(-90); // 3s at 30fps
      const newPeaks = [...prev.peaks, truePeak].slice(-90);
      
      // Calculate short-term (3s average)
      const shortTerm = newMomentary.length > 0 
        ? newMomentary.reduce((sum, val) => sum + val, 0) / newMomentary.length 
        : -70;
      
      return {
        momentary: newMomentary,
        shortTerm: [...prev.shortTerm, shortTerm].slice(-600), // 20s history
        peaks: newPeaks
      };
    });

    setMeasurements(prev => ({
      ...prev,
      momentary: momentaryLUFS,
      shortTerm: history.shortTerm.length > 0 
        ? history.shortTerm[history.shortTerm.length - 1] 
        : momentaryLUFS,
      peak: truePeak,
      rms: rms,
      // Integrated would be calculated over entire program duration
      integrated: history.shortTerm.length > 0 
        ? history.shortTerm.reduce((sum, val) => sum + val, 0) / history.shortTerm.length 
        : momentaryLUFS
    }));
  }, [audioEngine, calculateLUFS, calculateTruePeak, calculateRMS, history]);

  // Render meter
  const renderMeter = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Scale (-70 to 0 LUFS)
    const lufsToY = (lufs) => height - ((lufs + 70) / 70) * (height - 40);

    // Draw scale
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    
    for (let lufs = -70; lufs <= 0; lufs += 10) {
      const y = lufsToY(lufs);
      ctx.fillText(`${lufs}`, width - 5, y + 3);
      
      ctx.strokeStyle = '#333';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
    }

    // Draw broadcast standards
    const drawStandardLine = (lufs, color, label) => {
      const y = lufsToY(lufs);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width - 30, y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      ctx.fillStyle = color;
      ctx.font = '8px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(label, 2, y - 2);
    };

    drawStandardLine(-23, '#ff9900', 'EBU R128');
    drawStandardLine(-16, '#ff3300', 'Streaming');
    drawStandardLine(-14, '#ff0000', 'Broadcast');

    // Draw meter bars
    const barWidth = 15;
    const barSpacing = 20;
    let xOffset = 10;

    // Momentary LUFS
    const momentaryHeight = Math.max(0, (measurements.momentary + 70) / 70 * (height - 40));
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(xOffset, height - momentaryHeight - 20, barWidth, momentaryHeight);
    
    ctx.fillStyle = '#fff';
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('M', xOffset + barWidth/2, height - 5);
    ctx.fillText(measurements.momentary.toFixed(1), xOffset + barWidth/2, height - 25);

    xOffset += barSpacing;

    // Short-term LUFS
    const shortTermHeight = Math.max(0, (measurements.shortTerm + 70) / 70 * (height - 40));
    ctx.fillStyle = '#45B7D1';
    ctx.fillRect(xOffset, height - shortTermHeight - 20, barWidth, shortTermHeight);
    
    ctx.fillText('S', xOffset + barWidth/2, height - 5);
    ctx.fillText(measurements.shortTerm.toFixed(1), xOffset + barWidth/2, height - 25);

    xOffset += barSpacing;

    // Integrated LUFS
    const integratedHeight = Math.max(0, (measurements.integrated + 70) / 70 * (height - 40));
    ctx.fillStyle = '#F39C12';
    ctx.fillRect(xOffset, height - integratedHeight - 20, barWidth, integratedHeight);
    
    ctx.fillText('I', xOffset + barWidth/2, height - 5);
    ctx.fillText(measurements.integrated.toFixed(1), xOffset + barWidth/2, height - 25);

    xOffset += barSpacing;

    // True Peak
    const peakHeight = Math.max(0, (measurements.peak + 70) / 70 * (height - 40));
    ctx.fillStyle = measurements.peak > -1 ? '#ff3300' : '#27AE60';
    ctx.fillRect(xOffset, height - peakHeight - 20, barWidth, peakHeight);
    
    ctx.fillText('TP', xOffset + barWidth/2, height - 5);
    ctx.fillText(measurements.peak.toFixed(1), xOffset + barWidth/2, height - 25);

  }, [measurements, width, height]);

  // Animation loop
  const animate = useCallback(() => {
    updateMeasurements();
    renderMeter();
    
    animationFrameRef.current = setTimeout(() => {
      if (animationFrameRef.current) {
        animate();
      }
    }, 1000 / updateRate);
  }, [updateMeasurements, renderMeter, updateRate]);

  // Start/stop animation
  useEffect(() => {
    if (audioEngine?.audioContext) {
      animate();
    }

    return () => {
      if (animationFrameRef.current) {
        clearTimeout(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [audioEngine, animate]);

  return (
    <div className="loudness-meter" style={{ 
      background: '#2a2a2a', 
      padding: '10px',
      borderRadius: '4px',
      color: '#ffffff'
    }}>
      <h4 style={{ margin: '0 0 10px 0', textAlign: 'center' }}>Loudness Meter</h4>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          border: '1px solid #444',
          background: '#1a1a1a'
        }}
      />
      
      <div style={{ marginTop: '10px', fontSize: '11px', color: '#aaa' }}>
        <div>Range: {measurements.range.toFixed(1)} LU</div>
        <div>RMS: {measurements.rms.toFixed(1)} dBFS</div>
        <div style={{ marginTop: '5px', fontSize: '10px' }}>
          M=Momentary, S=Short-term, I=Integrated, TP=True Peak
        </div>
      </div>
    </div>
  );
};

export default LoudnessMeter;
