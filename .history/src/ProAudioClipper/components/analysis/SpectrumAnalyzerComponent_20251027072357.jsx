import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SpectrumAnalyzer } from '../../audio/analysis/SpectrumAnalyzer.js';

/**
 * Professional Spectrum Analyzer Component
 * 
 * Real-time FFT spectrum analyzer with professional features:
 * - Logarithmic frequency scaling
 * - Peak hold indicators
 * - Configurable FFT size and smoothing
 * - Professional color scheme and grid
 */
export const SpectrumAnalyzerComponent = ({ 
  audioEngine, 
  width = 600, 
  height = 300,
  className = ""
}) => {
  const canvasRef = useRef(null);
  const analyzerRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [config, setConfig] = useState({
    fftSize: 2048,
    smoothing: 0.8,
    minDecibels: -90,
    maxDecibels: -10,
    updateRate: 60
  });

  // Initialize spectrum analyzer
  useEffect(() => {
    if (!audioEngine?.audioContext) return;

    try {
      analyzerRef.current = new SpectrumAnalyzer(audioEngine.audioContext, config);
      
      if (canvasRef.current) {
        analyzerRef.current.setCanvas(canvasRef.current);
      }
      
      console.log('Spectrum Analyzer component initialized');
    } catch (error) {
      console.error('Failed to initialize spectrum analyzer:', error);
    }

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.stop();
      }
    };
  }, [audioEngine?.audioContext]);

  // Connect to audio source when available
  useEffect(() => {
    if (!analyzerRef.current || !audioEngine?.workletNode) return;

    try {
      // Connect the worklet output to the analyzer
      analyzerRef.current.connectSource(audioEngine.workletNode);
      console.log('Spectrum analyzer connected to audio source');
    } catch (error) {
      console.error('Failed to connect spectrum analyzer to audio source:', error);
    }
  }, [audioEngine?.workletNode]);

  // Handle canvas resize
  useEffect(() => {
    if (analyzerRef.current && canvasRef.current) {
      analyzerRef.current.setCanvas(canvasRef.current);
    }
  }, [width, height]);

  // Start/stop analyzer based on audio playback
  useEffect(() => {
    if (!analyzerRef.current) return;

    if (audioEngine?.isPlaying && isActive) {
      analyzerRef.current.start();
    } else {
      analyzerRef.current.stop();
    }
  }, [audioEngine?.isPlaying, isActive]);

  const toggleAnalyzer = useCallback(() => {
    setIsActive(prev => !prev);
  }, []);

  const updateFFTSize = useCallback((newSize) => {
    if (analyzerRef.current) {
      const newConfig = { ...config, fftSize: parseInt(newSize) };
      setConfig(newConfig);
      analyzerRef.current.updateConfig(newConfig);
    }
  }, [config]);

  const updateSmoothing = useCallback((newSmoothing) => {
    if (analyzerRef.current) {
      const newConfig = { ...config, smoothing: parseFloat(newSmoothing) };
      setConfig(newConfig);
      analyzerRef.current.updateConfig(newConfig);
    }
  }, [config]);

  const updateUpdateRate = useCallback((newRate) => {
    if (analyzerRef.current) {
      const newConfig = { ...config, updateRate: parseInt(newRate) };
      setConfig(newConfig);
      analyzerRef.current.updateConfig(newConfig);
    }
  }, [config]);

  return (
    <div className={`spectrum-analyzer-container ${className}`}>
      {/* Controls */}
      <div className="spectrum-controls" style={{
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
          onClick={toggleAnalyzer}
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

        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          FFT:
          <select 
            value={config.fftSize} 
            onChange={(e) => updateFFTSize(e.target.value)}
            style={{
              background: '#444',
              color: '#ccc',
              border: '1px solid #666',
              borderRadius: '3px',
              padding: '2px 4px',
              fontSize: '11px'
            }}
          >
            <option value={512}>512</option>
            <option value={1024}>1024</option>
            <option value={2048}>2048</option>
            <option value={4096}>4096</option>
            <option value={8192}>8192</option>
          </select>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          Smooth:
          <input
            type="range"
            min="0"
            max="0.95"
            step="0.05"
            value={config.smoothing}
            onChange={(e) => updateSmoothing(e.target.value)}
            style={{ width: '60px' }}
          />
          <span style={{ minWidth: '35px', fontSize: '10px' }}>
            {(config.smoothing * 100).toFixed(0)}%
          </span>
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          FPS:
          <select 
            value={config.updateRate} 
            onChange={(e) => updateUpdateRate(e.target.value)}
            style={{
              background: '#444',
              color: '#ccc',
              border: '1px solid #666',
              borderRadius: '3px',
              padding: '2px 4px',
              fontSize: '11px'
            }}
          >
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={120}>120</option>
          </select>
        </label>

        <div style={{ 
          marginLeft: 'auto', 
          fontSize: '10px',
          opacity: 0.7
        }}>
          20Hz - 20kHz | Peak Hold: 1s
        </div>
      </div>

      {/* Spectrum Display */}
      <div className="spectrum-display" style={{
        position: 'relative',
        background: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '4px',
        overflow: 'hidden'
      }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            display: 'block',
            width: `${width}px`,
            height: `${height}px`,
            cursor: 'crosshair'
          }}
        />
        
        {/* Status overlay */}
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
            Spectrum Analyzer: OFF
          </div>
        )}
        
        {!audioEngine?.audioContext && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff6666',
            fontSize: '12px',
            pointerEvents: 'none'
          }}>
            No Audio Context Available
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: '5px',
        padding: '4px 8px',
        background: '#2a2a2a',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#999'
      }}>
        <span>Bins: {analyzerRef.current?.frequencyBinCount || 0}</span>
        <span>Resolution: {analyzerRef.current?.sampleRate ? 
          (analyzerRef.current.sampleRate / (config.fftSize * 2)).toFixed(1) : 0}Hz/bin</span>
        <span>Range: -90dB to -10dB</span>
      </div>
    </div>
  );
};

export default SpectrumAnalyzerComponent;