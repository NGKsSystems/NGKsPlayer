/**
 * NGKs Player - DVS Integration Component
 * 
 * Revolutionary DVS interface that makes turntablists switch from Serato
 * - Real-time vinyl position tracking
 * - Professional calibration tools
 * - Ultra-low latency performance monitoring
 * - Multiple timecode format support
 */

import React, { useState, useEffect, useRef } from 'react';
import { DVSController } from './DVSController.js';

const DVSIntegration = ({ onDeckUpdate, audioContext }) => {
  const [dvsController, setDvsController] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState(null);
  const [calibration, setCalibration] = useState({
    leftQuality: 0,
    rightQuality: 0,
    leftGain: 1.0,
    rightGain: 1.0
  });
  
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Initialize DVS on component mount
  useEffect(() => {
    const initializeDVS = async () => {
      try {
        const controller = new DVSController({
          latency: 1,
          timecodeFormat: 'serato',
          enablePhysics: true
        });

        // Set up event listeners
        controller.on('initialized', () => {
          console.log('🎧 DVS Ready - Turntables detected!');
          setIsActive(true);
        });

        controller.on('deckUpdate', (data) => {
          // Forward deck updates to parent components
          if (onDeckUpdate) {
            onDeckUpdate(data);
          }
          updateStatus();
        });

        controller.on('scratchStart', (data) => {
          console.log(`🎵 Scratch detected on ${data.deck} deck`);
        });

        controller.on('signalLoss', (data) => {
          console.warn(`⚠️ Signal loss on ${data.deck} deck`);
        });

        controller.on('calibrationUpdate', (data) => {
          setCalibration(data);
        });

        setDvsController(controller);
        
        // Auto-initialize
        await controller.initialize();
        
      } catch (error) {
        console.error('❌ DVS initialization failed:', error);
      }
    };

    initializeDVS();

    return () => {
      if (dvsController) {
        dvsController.shutdown();
      }
    };
  }, []);

  // Update status periodically
  const updateStatus = () => {
    if (dvsController) {
      setStatus(dvsController.getStatus());
    }
  };

  // Status update interval
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(updateStatus, 100); // 10fps updates
      return () => clearInterval(interval);
    }
  }, [isActive, dvsController]);

  // Real-time visualization
  useEffect(() => {
    if (!isActive || !canvasRef.current || !status) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const drawVisualization = () => {
      if (!isActive) return;

      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw vinyl representations
      drawVinyl(ctx, 50, 100, status.leftDeck, 'LEFT');
      drawVinyl(ctx, 250, 100, status.rightDeck, 'RIGHT');

      // Draw performance stats
      drawStats(ctx);

      animationRef.current = requestAnimationFrame(drawVisualization);
    };

    drawVisualization();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, status]);

  const drawVinyl = (ctx, x, y, deckData, label) => {
    const radius = 40;
    
    // Vinyl record
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // Position indicator
    const angle = (deckData.position / 1000) * 2 * Math.PI;
    const indicatorX = x + Math.cos(angle) * (radius - 5);
    const indicatorY = y + Math.sin(angle) * (radius - 5);
    
    ctx.fillStyle = deckData.isScratching ? '#ff0000' : '#00ff00';
    ctx.beginPath();
    ctx.arc(indicatorX, indicatorY, 3, 0, 2 * Math.PI);
    ctx.fill();

    // Speed display
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - radius - 10);
    ctx.fillText(`${deckData.speed.toFixed(2)}x`, x, y + radius + 20);
    
    // Signal quality
    const quality = label === 'LEFT' ? calibration.leftQuality : calibration.rightQuality;
    ctx.fillStyle = quality > 0.8 ? '#00ff00' : quality > 0.5 ? '#ffff00' : '#ff0000';
    ctx.fillRect(x - 20, y + radius + 30, 40 * quality, 5);
  };

  const drawStats = (ctx) => {
    if (!status) return;

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.textAlign = 'left';
    
    const stats = [
      `Latency: ${status.performance.latency.toFixed(1)}ms`,
      `CPU: ${status.performance.processingLoad.toFixed(1)}ms`,
      `Dropouts: ${status.performance.dropouts}`,
      `Format: ${status.timecodeFormat}`,
      `Sample Rate: ${status.audioContext.sampleRate}Hz`
    ];

    stats.forEach((stat, i) => {
      ctx.fillText(stat, 10, 20 + i * 12);
    });
  };

  const handleTimecodeFormat = (format) => {
    if (dvsController) {
      dvsController.setTimecodeFormat(format);
    }
  };

  const handleCalibrate = (deck) => {
    if (dvsController) {
      dvsController.calibrate(deck);
    }
  };

  if (!isActive) {
    return (
      <div className="dvs-container p-6 bg-gray-900 text-white rounded-lg">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">🎧 NGKs DVS Controller</h3>
          <div className="animate-pulse">
            <div className="text-blue-400">Initializing turntable connection...</div>
            <div className="text-sm text-gray-400 mt-2">
              Connect your turntables and ensure timecode vinyl is playing
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dvs-container p-6 bg-gray-900 text-white rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">🎧 DVS Controller</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm">
            {isActive ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
      </div>

      {/* Real-time Visualization */}
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={200} 
        className="bg-black rounded border mb-4"
      />

      {/* Controls */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Timecode Format</label>
          <select 
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            onChange={(e) => handleTimecodeFormat(e.target.value)}
            defaultValue="serato"
          >
            <option value="serato">Serato NoiseMap</option>
            <option value="traktor">Traktor MK2</option>
            <option value="virtual_dj">Virtual DJ</option>
            <option value="ngks">NGKs Ultra (4x Resolution)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Calibration</label>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleCalibrate('left')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Cal Left
            </button>
            <button 
              onClick={() => handleCalibrate('right')}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Cal Right
            </button>
          </div>
        </div>
      </div>

      {/* Status Display */}
      {status && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-gray-800 p-3 rounded">
            <h4 className="font-bold mb-2">Left Deck</h4>
            <div>Position: {status.leftDeck.position.toFixed(0)}</div>
            <div>Speed: {status.leftDeck.speed.toFixed(2)}x</div>
            <div>Status: {status.leftDeck.isScratching ? '🎵 SCRATCHING' : '▶️ PLAYING'}</div>
            <div>Quality: {(calibration.leftQuality * 100).toFixed(0)}%</div>
          </div>

          <div className="bg-gray-800 p-3 rounded">
            <h4 className="font-bold mb-2">Right Deck</h4>
            <div>Position: {status.rightDeck.position.toFixed(0)}</div>
            <div>Speed: {status.rightDeck.speed.toFixed(2)}x</div>
            <div>Status: {status.rightDeck.isScratching ? '🎵 SCRATCHING' : '▶️ PLAYING'}</div>
            <div>Quality: {(calibration.rightQuality * 100).toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Performance Stats */}
      {status && (
        <div className="mt-4 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>Latency: {status.performance.latency.toFixed(1)}ms</span>
            <span>CPU: {status.performance.processingLoad.toFixed(1)}ms</span>
            <span>Dropouts: {status.performance.dropouts}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DVSIntegration;