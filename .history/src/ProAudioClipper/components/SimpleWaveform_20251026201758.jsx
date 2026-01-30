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
    const totalSamples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;
    
    // Calculate the portion of audio data to display
    const startSample = Math.floor(audioOffset * sampleRate);
    const actualClipDuration = clipDuration || (audioBuffer.duration - audioOffset);
    const endSample = Math.min(totalSamples, Math.floor((audioOffset + actualClipDuration) * sampleRate));
    const relevantSamples = endSample - startSample;
    
    // Ensure we have valid range
    if (relevantSamples <= 0 || startSample >= totalSamples) {
      return; // No valid audio data to display
    }
    
    const samplesPerPixel = relevantSamples / width;
    
    // Draw waveform
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    
    for (let x = 0; x < effectiveWidth; x++) {
      const pixelStart = Math.floor(x * samplesPerPixel);
      const pixelEnd = Math.floor((x + 1) * samplesPerPixel);
      
      let min = 1;
      let max = -1;
      
      // Find min/max in this pixel range, offset by the clip's start position
      for (let i = pixelStart; i < pixelEnd && (startSample + i) < endSample; i++) {
        const sampleIndex = startSample + i;
        if (sampleIndex >= 0 && sampleIndex < totalSamples) {
          const sample = channelData[sampleIndex];
          min = Math.min(min, sample);
          max = Math.max(max, sample);
        }
      }
      
      // Convert to pixel coordinates
      const minY = ((min + 1) / 2) * height;
      const maxY = ((max + 1) / 2) * height;
      const barHeight = Math.max(1, maxY - minY);
      
      // Draw vertical line with margin offset
      const drawX = x + marginWidth;
      ctx.fillRect(drawX, height - maxY, 1, barHeight);
    }
    
  }, [audioBuffer, width, height, color, backgroundColor, audioOffset, clipDuration, playbackRate]);

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