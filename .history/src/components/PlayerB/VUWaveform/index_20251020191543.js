import React, { useRef, useEffect, useState } from 'react';

// Convert linear amplitude to dB
const amplitudeToDb = (amplitude) => {
  if (amplitude === 0) return -60;
  return Math.max(-60, 20 * Math.log10(amplitude));
};

// Convert dB to meter position (0-1)
const dbToMeterPosition = (db) => {
  // Professional VU meter scale: -60dB to +6dB
  const minDb = -60;
  const maxDb = 6;
  return Math.max(0, Math.min(1, (db - minDb) / (maxDb - minDb)));
};

// Get color for VU meter based on dB level
const getVuColor = (db) => {
  if (db < -20) return '#00ff00'; // Green
  if (db < -10) return '#ffff00'; // Yellow
  if (db < -3) return '#ff8000';  // Orange
  return '#ff0000'; // Red
};

const VUWaveform = ({
  vuLevels = { left: 0, right: 0 },
  peakHold = { left: 0, right: 0 },
  peakLevels = { left: 0, right: 0 },
  dbLevels = { left: -60, right: -60 },
  waveformData = { left: new Array(128).fill(0), right: new Array(128).fill(0) },
  frequencyData = new Array(64).fill(0),
  currentTime = 0,
  duration = 0
}) => {
  const vuCanvasRef = useRef();
  const waveformCanvasRef = useRef();
  const spectrumCanvasRef = useRef();
  const animationFrameRef = useRef();

  // Draw VU meters
  useEffect(() => {
    const canvas = vuCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw VU meter backgrounds
    const meterWidth = width * 0.4;
    const meterHeight = height * 0.8;
    const leftMeterX = width * 0.05;
    const rightMeterX = width * 0.55;
    const meterY = height * 0.1;

    // Draw meter backgrounds
    ctx.fillStyle = '#333';
    ctx.fillRect(leftMeterX, meterY, meterWidth, meterHeight);
    ctx.fillRect(rightMeterX, meterY, meterWidth, meterHeight);

    // Draw scale markings
    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    const scaleMarks = [-60, -40, -20, -10, -3, 0, 3, 6];
    
    scaleMarks.forEach(db => {
      const y = meterY + meterHeight * (1 - dbToMeterPosition(db));
      
      // Scale lines
      ctx.fillRect(leftMeterX - 10, y - 0.5, 8, 1);
      ctx.fillRect(rightMeterX + meterWidth + 2, y - 0.5, 8, 1);
      
      // Labels
      ctx.fillText(db.toString(), leftMeterX - 25, y + 3);
      ctx.fillText(db.toString(), rightMeterX + meterWidth + 12, y + 3);
    });

    // Draw current levels
    const leftHeight = meterHeight * dbToMeterPosition(dbLevels.left);
    const rightHeight = meterHeight * dbToMeterPosition(dbLevels.right);

    // Left channel
    const leftGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
    leftGradient.addColorStop(0, '#00ff00');
    leftGradient.addColorStop(0.7, '#ffff00');
    leftGradient.addColorStop(0.9, '#ff8000');
    leftGradient.addColorStop(1, '#ff0000');

    ctx.fillStyle = leftGradient;
    ctx.fillRect(leftMeterX, meterY + meterHeight - leftHeight, meterWidth, leftHeight);

    // Right channel
    const rightGradient = ctx.createLinearGradient(0, meterY + meterHeight, 0, meterY);
    rightGradient.addColorStop(0, '#00ff00');
    rightGradient.addColorStop(0.7, '#ffff00');
    rightGradient.addColorStop(0.9, '#ff8000');
    rightGradient.addColorStop(1, '#ff0000');

    ctx.fillStyle = rightGradient;
    ctx.fillRect(rightMeterX, meterY + meterHeight - rightHeight, meterWidth, rightHeight);

    // Draw peak hold indicators
    if (peakHold.left > 0) {
      const leftPeakY = meterY + meterHeight * (1 - dbToMeterPosition(amplitudeToDb(peakHold.left)));
      ctx.fillStyle = getVuColor(amplitudeToDb(peakHold.left));
      ctx.fillRect(leftMeterX, leftPeakY - 1, meterWidth, 2);
    }

    if (peakHold.right > 0) {
      const rightPeakY = meterY + meterHeight * (1 - dbToMeterPosition(amplitudeToDb(peakHold.right)));
      ctx.fillStyle = getVuColor(amplitudeToDb(peakHold.right));
      ctx.fillRect(rightMeterX, rightPeakY - 1, meterWidth, 2);
    }

    // Draw channel labels
    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText('L', leftMeterX + meterWidth/2 - 4, meterY - 5);
    ctx.fillText('R', rightMeterX + meterWidth/2 - 4, meterY - 5);

    // Draw dB values
    ctx.font = '9px monospace';
    ctx.fillText(`${dbLevels.left.toFixed(1)}dB`, leftMeterX, meterY + meterHeight + 15);
    ctx.fillText(`${dbLevels.right.toFixed(1)}dB`, rightMeterX, meterY + meterHeight + 15);

  }, [vuLevels, peakHold, peakLevels, dbLevels]);

  // Draw waveform
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Draw waveforms
    const drawWaveform = (data, yOffset, color) => {
      if (!data || data.length === 0) return;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();

      const step = width / data.length;
      
      data.forEach((value, i) => {
        const x = i * step;
        const y = yOffset + (value * (height / 4));
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    };

    // Draw left channel (top half)
    drawWaveform(waveformData.left, height * 0.25, '#00ffff');
    
    // Draw right channel (bottom half)
    drawWaveform(waveformData.right, height * 0.75, '#ff00ff');

    // Draw progress indicator
    if (duration > 0) {
      const progressX = (currentTime / duration) * width;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
    }

    // Draw channel labels
    ctx.fillStyle = '#00ffff';
    ctx.font = '10px monospace';
    ctx.fillText('L', 5, 15);
    
    ctx.fillStyle = '#ff00ff';
    ctx.fillText('R', 5, height - 5);

  }, [waveformData, currentTime, duration]);

  // Draw spectrum analyzer
  useEffect(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, width, height);

    if (!frequencyData || frequencyData.length === 0) return;

    // Draw spectrum bars
    const barWidth = width / frequencyData.length;
    
    frequencyData.forEach((value, i) => {
      const barHeight = (value / 255) * height;
      const x = i * barWidth;
      const y = height - barHeight;

      // Color based on frequency range
      let color;
      if (i < frequencyData.length * 0.2) {
        color = '#ff0000'; // Bass - Red
      } else if (i < frequencyData.length * 0.6) {
        color = '#00ff00'; // Mids - Green
      } else {
        color = '#0000ff'; // Treble - Blue
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });

    // Draw frequency labels
    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.fillText('BASS', 5, height - 5);
    ctx.fillText('MID', width * 0.4, height - 5);
    ctx.fillText('TREBLE', width * 0.8, height - 5);

  }, [frequencyData]);

  return (
    <div className="vu-waveform-container bg-gray-900 p-2 rounded-lg">
      <div className="deck-label text-xs text-white mb-2 text-center font-bold">
        DECK B - AUDIO ANALYSIS
      </div>
      
      <div className="grid grid-cols-3 gap-2 h-full">
        {/* VU Meters */}
        <div className="vu-section">
          <div className="text-xs text-gray-400 mb-1 text-center">VU METERS</div>
          <canvas
            ref={vuCanvasRef}
            width={100}
            height={80}
            className="bg-black rounded border"
          />
        </div>

        {/* Waveform Display */}
        <div className="waveform-section">
          <div className="text-xs text-gray-400 mb-1 text-center">WAVEFORM</div>
          <canvas
            ref={waveformCanvasRef}
            width={120}
            height={80}
            className="bg-black rounded border"
          />
        </div>

        {/* Spectrum Analyzer */}
        <div className="spectrum-section">
          <div className="text-xs text-gray-400 mb-1 text-center">SPECTRUM</div>
          <canvas
            ref={spectrumCanvasRef}
            width={100}
            height={80}
            className="bg-black rounded border"
          />
        </div>
      </div>
    </div>
  );
};

export default VUWaveform;