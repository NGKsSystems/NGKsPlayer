/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXVisualFeedback.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import './FXVisualFeedback.css';

const FXVisualFeedback = ({ effectType, param1, param2, isActive = false, color = '#3498db' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (!isActive) {
      // Draw inactive state
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // Draw effect visualization based on type
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    switch (effectType) {
      case 'filter':
        // Draw filter frequency response curve
        const cutoff = param1 * width;
        const resonance = param2 * 50;
        
        for (let x = 0; x < width; x++) {
          let y;
          if (x < cutoff) {
            // Pass band
            y = height / 2;
          } else {
            // Stop band with resonance peak
            const dist = x - cutoff;
            const peak = Math.exp(-dist / 20) * resonance;
            y = height / 2 + (height / 2) * (1 - Math.exp(-dist / 30)) - peak;
          }
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        break;

      case 'delay':
      case 'reverb':
        // Draw delay/reverb feedback pattern
        const time = param1 * 100;
        const feedback = param2;
        
        for (let x = 0; x < width; x++) {
          const t = (x / width) * Math.PI * 4;
          const envelope = Math.exp(-x / (width * feedback));
          const y = height / 2 + Math.sin(t * time / 10) * (height / 3) * envelope;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        break;

      case 'bitcrusher':
        // Draw stepped/quantized waveform
        const bits = Math.max(1, Math.floor(param1 * 8));
        const steps = Math.pow(2, bits);
        
        for (let x = 0; x < width; x++) {
          const t = (x / width) * Math.PI * 2;
          const raw = Math.sin(t * 4);
          const quantized = Math.floor(raw * steps) / steps;
          const y = height / 2 - quantized * (height / 3);
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        break;

      default:
        // Generic sine wave
        for (let x = 0; x < width; x++) {
          const t = (x / width) * Math.PI * 4;
          const amplitude = param1;
          const frequency = param2;
          const y = height / 2 + Math.sin(t * frequency * 3) * (height / 3) * amplitude;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
    }

    ctx.stroke();

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

  }, [effectType, param1, param2, isActive, color]);

  return (
    <div className="fx-visual-feedback">
      <div className="fx-visual-label">
        <TrendingUp size={10} />
        <span>WAVEFORM</span>
      </div>
      <canvas
        ref={canvasRef}
        width={200}
        height={60}
        className="fx-visual-canvas"
      />
    </div>
  );
};

export default FXVisualFeedback;

