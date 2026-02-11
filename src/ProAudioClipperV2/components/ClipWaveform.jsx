/* ───────────────────────────────────────────────────────
   ClipWaveform – V2 canvas waveform for a single clip
   Renders min/max amplitude bars from AudioBuffer data.
   ─────────────────────────────────────────────────────── */
import React, { useEffect, useRef, memo } from 'react';

const ClipWaveform = memo(function ClipWaveform({
  audioBuffer,
  width,
  height,
  color = 'rgba(0, 212, 255, 0.6)',
  audioOffset = 0,
  clipDuration = null,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioBuffer || !canvasRef.current || width <= 0 || height <= 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Use devicePixelRatio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Audio data (first channel)
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const sampleRate = audioBuffer.sampleRate;

    const startSample = Math.floor(audioOffset * sampleRate);
    const actualDuration = clipDuration || (audioBuffer.duration - audioOffset);
    const endSample = Math.min(totalSamples, Math.floor((audioOffset + actualDuration) * sampleRate));
    const relevantSamples = endSample - startSample;

    if (relevantSamples <= 0 || startSample >= totalSamples) return;

    const samplesPerPixel = relevantSamples / width;
    const midY = height / 2;

    // Draw waveform bars
    ctx.fillStyle = color;

    for (let x = 0; x < width; x++) {
      const pixelStart = Math.floor(x * samplesPerPixel);
      const pixelEnd = Math.floor((x + 1) * samplesPerPixel);

      let min = 1;
      let max = -1;

      for (let i = pixelStart; i < pixelEnd && (startSample + i) < endSample; i++) {
        const idx = startSample + i;
        if (idx >= 0 && idx < totalSamples) {
          const sample = channelData[idx];
          if (sample < min) min = sample;
          if (sample > max) max = sample;
        }
      }

      // Convert [-1,1] to pixel coords centered on midY
      const topY = midY - max * midY;
      const botY = midY - min * midY;
      const barH = Math.max(1, botY - topY);

      ctx.fillRect(x, topY, 1, barH);
    }
  }, [audioBuffer, width, height, color, audioOffset, clipDuration]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    />
  );
});

export default ClipWaveform;
