// src/hooks/useWaveform.js

import { useEffect, useRef } from 'react';

const useWaveform = ({
  audioContext,
  sourceNode,
  enabled = true,
  waveformType = 'line', // 'line', 'bars', 'circle', 'none'
  beatPulseEnabled = true,
  onBeat = () => {},
}) => {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const analyzerRef = useRef(null);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!isMounted.current || !canvasRef.current || !analyzerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const analyzer = analyzerRef.current;

    // Resize canvas to match container
    const rect = canvas.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const width = canvas.width;
    const height = canvas.height;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isMounted.current) return;

      analyzer.getByteTimeDomainData(dataArray);
      analyzer.getByteFrequencyData(frequencyData);

      // Clear canvas with dark background
      ctx.fillStyle = 'rgb(31, 41, 55)'; // gray-800
      ctx.fillRect(0, 0, width, height);

      if (!enabled || waveformType === 'none') {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // Apply Chromatic Chaos effects if active (this is the new wiring)
      if (window.currentThemeEffect) {
        try {
          window.currentThemeEffect(
            canvas,
            ctx,
            beatDetectionRef?.current?.beatStrength || 0,  // adjust ref if needed
            peakRotation || false  // adjust flag if named differently
          );
        } catch (err) {
          console.warn('Chromatic Chaos effect failed:', err);
        }
      }

      // Draw waveform based on type
      if (waveformType === 'line') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(59, 130, 246)'; // blue-500
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
      }

      // ... add bars, circle, or other types here if needed

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  // Setup audio context and analyzer
  useEffect(() => {
    if (!audioContext || !sourceNode) return;

    try {
      analyzerRef.current = audioContext.createAnalyser();
      analyzerRef.current.fftSize = 2048;
      analyzerRef.current.smoothingTimeConstant = 0.6;

      const source = audioContext.createMediaElementSource(sourceNode);
      source.connect(analyzerRef.current);
      analyzerRef.current.connect(audioContext.destination);

      drawWaveform();
    } catch (err) {
      console.error('[Waveform] Setup failed:', err);
    }

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
      }
    };
  }, [audioContext, sourceNode, waveformType, enabled]);

  return {
    canvasRef,
    drawWaveform,
  };
};

export default useWaveform;