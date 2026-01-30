import React, { useEffect, useRef } from 'react';

/**
 * Simple Waveform Component
 * 
 * Renders a basic waveform visualization for audio clips
 */
const SimpleWaveform = ({ 
  audioBuffer, 
  width, 
  height, 
  color = '#ffffff',
  backgroundColor = 'transparent',
  audioOffset = 0,
  clipDuration = null
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    // Get audio data (use first channel for simplicity)
    const channelData = audioBuffer.getChannelData(0);
    const samples = channelData.length;
    const samplesPerPixel = samples / width;
    
    // Draw waveform
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    
    for (let x = 0; x < width; x++) {
      const start = Math.floor(x * samplesPerPixel);
      const end = Math.floor((x + 1) * samplesPerPixel);
      
      let min = 1;
      let max = -1;
      
      // Find min/max in this pixel range
      for (let i = start; i < end && i < samples; i++) {
        const sample = channelData[i];
        min = Math.min(min, sample);
        max = Math.max(max, sample);
      }
      
      // Convert to pixel coordinates
      const minY = ((min + 1) / 2) * height;
      const maxY = ((max + 1) / 2) * height;
      const barHeight = Math.max(1, maxY - minY);
      
      // Draw vertical line
      ctx.fillRect(x, height - maxY, 1, barHeight);
    }
    
  }, [audioBuffer, width, height, color, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}
    />
  );
};

export default SimpleWaveform;