import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhaseCorrelationMeter } from '../../audio/analysis/PhaseCorrelationMeter.js';

/**
 * Phase Correlation Meter Component
 * 
 * Professional stereo phase correlation meter with:
 * - Real-time correlation coefficient display
 * - Goniometer (X-Y stereo imaging)
 * - Mono compatibility warnings
 * - Correlation history graph
 */
export const PhaseCorrelationMeterComponent = ({ 
  audioEngine, 
  width = 400, 
  height = 300,
  className = ""
}) => {
  const canvasRef = useRef(null);
  const historyCanvasRef = useRef(null);
  const meterRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [correlation, setCorrelation] = useState(0);
  const [status, setStatus] = useState({ status: 'GOOD', color: '#66ff66', description: 'Good Stereo' });
  const [monoCompatibility, setMonoCompatibility] = useState({ compatible: true, warnings: [], score: 100 });
  const [stereoWidth, setStereoWidth] = useState(0);

  // Initialize phase correlation meter
  useEffect(() => {
    if (!audioEngine?.audioContext) return;

    try {
      meterRef.current = new PhaseCorrelationMeter(audioEngine.audioContext, {
        windowSize: 1024,
        updateRate: 30,
        smoothing: 0.8
      });
      
      console.log('Phase Correlation Meter component initialized');
    } catch (error) {
      console.error('Failed to initialize phase correlation meter:', error);
    }

    return () => {
      if (meterRef.current) {
        meterRef.current.stop();
      }
    };
  }, [audioEngine?.audioContext]);

  // Connect to audio source
  useEffect(() => {
    if (!meterRef.current || !audioEngine?.workletNode) return;

    try {
      meterRef.current.connectSource(audioEngine.workletNode);
      console.log('Phase correlation meter connected to audio source');
    } catch (error) {
      console.error('Failed to connect phase correlation meter:', error);
    }
  }, [audioEngine?.workletNode]);

  // Update display data
  useEffect(() => {
    if (!isActive || !meterRef.current) return;

    const updateData = () => {
      if (!meterRef.current) return;
      
      const newCorrelation = meterRef.current.getCorrelation();
      const newStatus = meterRef.current.getCorrelationStatus();
      const newMonoComp = meterRef.current.getMonoCompatibility();
      const newWidth = meterRef.current.getStereoWidth();
      
      setCorrelation(newCorrelation);
      setStatus(newStatus);
      setMonoCompatibility(newMonoComp);
      setStereoWidth(newWidth);
      
      // Draw visualizations
      drawGoniometer();
      drawCorrelationHistory();
    };

    let animationId;
    const animate = () => {
      updateData();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isActive]);

  // Start/stop meter based on audio playback
  useEffect(() => {
    if (!meterRef.current) return;

    if (audioEngine?.isPlaying && isActive) {
      meterRef.current.start();
    } else {
      meterRef.current.stop();
    }
  }, [audioEngine?.isPlaying, isActive]);

  const toggleMeter = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  // Draw goniometer (X-Y stereo imaging)
  const drawGoniometer = useCallback(() => {
    if (!canvasRef.current || !meterRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 20;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid circles
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, (radius * i) / 3, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    // Horizontal axis (Left-Right)
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.stroke();
    // Vertical axis
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();

    // Draw correlation data points
    const goniometerData = meterRef.current.getGoniometerData();
    
    ctx.fillStyle = status.color + '80'; // Semi-transparent
    ctx.strokeStyle = status.color;
    ctx.lineWidth = 1;
    
    goniometerData.forEach((point, index) => {
      const alpha = index / goniometerData.length; // Fade older points
      const x = centerX + point.x * radius;
      const y = centerY - point.y * radius; // Invert Y for screen coordinates
      
      if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
        ctx.globalAlpha = alpha * 0.8;
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    });

    ctx.globalAlpha = 1;

    // Draw labels
    ctx.fillStyle = '#cccccc';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('L', centerX - radius - 15, centerY + 4);
    ctx.fillText('R', centerX + radius + 15, centerY + 4);
    ctx.fillText('+', centerX, centerY - radius - 8);
    ctx.fillText('-', centerX, centerY + radius + 18);
  }, [status]);

  // Draw correlation history
  const drawCorrelationHistory = useCallback(() => {
    if (!historyCanvasRef.current || !meterRef.current) return;

    const canvas = historyCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const history = meterRef.current.getCorrelationHistory();

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (history.length < 2) return;

    // Draw grid lines
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    
    // Horizontal grid (correlation levels)
    const levels = [1, 0.5, 0, -0.5, -1];
    levels.forEach(level => {
      const y = canvas.height - ((level + 1) / 2) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    });

    // Draw correlation line
    ctx.strokeStyle = status.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((value, index) => {
      const x = (index / (history.length - 1)) * canvas.width;
      const y = canvas.height - ((value + 1) / 2) * canvas.height;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#cccccc';
    ctx.font = '9px Arial';
    ctx.textAlign = 'right';
    levels.forEach(level => {
      const y = canvas.height - ((level + 1) / 2) * canvas.height;
      ctx.fillText(level.toFixed(1), canvas.width - 5, y + 3);
    });
  }, [status]);

  return (
    <div className={`phase-correlation-meter ${className}`}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
        marginBottom: '10px',
        padding: '8px',
        background: '#2a2a2a',
        borderRadius: '4px',
        fontSize: '12px',
        color: '#cccccc'
      }}>
        <button
          onClick={toggleMeter}
          style={{
            padding: '4px 12px',
            background: isActive ? '#4CAF50' : '#666',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          {isActive ? 'ON' : 'OFF'}
        </button>

        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          flex: 1
        }}>
          <span>Phase:</span>
          <div style={{
            padding: '2px 8px',
            background: status.color,
            color: '#000',
            borderRadius: '3px',
            fontWeight: 'bold',
            minWidth: '50px',
            textAlign: 'center'
          }}>
            {status.status}
          </div>
          <span style={{ opacity: 0.8 }}>{status.description}</span>
        </div>
      </div>

      {/* Main Display */}
      <div style={{
        display: 'flex',
        gap: '15px',
        background: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '4px',
        padding: '15px'
      }}>
        {/* Goniometer */}
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: '#cccccc', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Stereo Imaging (Goniometer)
          </h4>
          <canvas
            ref={canvasRef}
            width={200}
            height={200}
            style={{
              display: 'block',
              width: '200px',
              height: '200px',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
          />
        </div>

        {/* Correlation History */}
        <div style={{ flex: 1 }}>
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: '#cccccc', 
            fontSize: '12px',
            textAlign: 'center'
          }}>
            Correlation History
          </h4>
          <canvas
            ref={historyCanvasRef}
            width={180}
            height={120}
            style={{
              display: 'block',
              width: '180px',
              height: '120px',
              border: '1px solid #444',
              borderRadius: '4px'
            }}
          />
          
          {/* Numeric Display */}
          <div style={{
            marginTop: '10px',
            fontSize: '11px',
            color: '#cccccc'
          }}>
            <div>Correlation: <strong>{correlation.toFixed(3)}</strong></div>
            <div>Stereo Width: <strong>{stereoWidth.toFixed(2)}</strong></div>
            <div style={{ 
              color: monoCompatibility.compatible ? '#66ff66' : '#ff6666' 
            }}>
              Mono Score: <strong>{monoCompatibility.score.toFixed(0)}%</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {monoCompatibility.warnings.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '8px',
          background: '#4a2a2a',
          border: '1px solid #ff6666',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#ff9999'
        }}>
          <strong>⚠ Mono Compatibility Issues:</strong>
          <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
            {monoCompatibility.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Status overlay when inactive */}
      {!isActive && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#666',
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          Phase Correlation Meter: OFF
        </div>
      )}
    </div>
  );
};

export default PhaseCorrelationMeterComponent;