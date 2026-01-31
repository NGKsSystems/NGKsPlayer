// src/hooks/useWaveform.js

import { useEffect, useRef } from 'react';

const useWaveform = ({
  audioContext,
  sourceNode,
  enabled = true,
  waveformType = 'line',
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

    // Resize canvas
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

      // Clear canvas
      ctx.fillStyle = 'rgb(31, 41, 55)';
      ctx.fillRect(0, 0, width, height);

      if (!enabled || waveformType === 'none') {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      // NEW: Apply Chromatic Chaos effects if the theme is active
      if (window.currentThemeEffect) {
        try {
          window.currentThemeEffect(
            canvas,
            ctx,
            beatDetectionRef?.current?.beatStrength || 0,
            peakRotation || false  // replace peakRotation with your actual super-peak variable if different
          );
        } catch (err) {
          console.warn('Chromatic Chaos effect failed:', err);
        }
      }

      // Your existing waveform drawing (line, bars, circle, etc.)
      // Add your current drawing code here if it's not already present

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

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