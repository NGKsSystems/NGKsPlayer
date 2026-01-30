import React, { forwardRef, useEffect, useState, useRef } from 'react';
import './MeteringBridge.css';

const MeteringBridge = forwardRef(({ tracks, buses, audioEngine, consoleSize }, ref) => {
  const [meterData, setMeterData] = useState({});
  const [showPeakHold, setShowPeakHold] = useState(true);
  const [meterMode, setMeterMode] = useState('peak'); // 'peak', 'rms', 'both'
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Update metering data
  useEffect(() => {
    if (!audioEngine) return;

    const updateMeters = () => {
      const newMeterData = {};
      
      // Get track meters
      tracks.forEach(track => {
        const levels = audioEngine.getTrackMetering?.(track.id);
        if (levels) {
          newMeterData[track.id] = levels;
        }
      });

      // Get bus meters
      if (buses?.mix) {
        buses.mix.forEach(bus => {
          const levels = audioEngine.getBusMetering?.(bus.id);
          if (levels) {
            newMeterData[bus.id] = levels;
          }
        });
      }

      // Get master meters
      const masterLevels = audioEngine.getMasterMetering?.();
      if (masterLevels) {
        newMeterData.master = masterLevels;
      }

      setMeterData(newMeterData);
    };

    const startMetering = () => {
      const update = () => {
        updateMeters();
        animationRef.current = requestAnimationFrame(update);
      };
      update();
    };

    startMetering();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioEngine, tracks, buses]);

  // Render meter bar
  const renderMeterBar = (trackId, levels, width) => {
    if (!levels) return null;

    const { left = -60, right = -60, peak = -60 } = levels;
    
    return (
      <div className="bridge-meter" style={{ width: `${width}px` }}>
        <div className="meter-bars">
          <div className="meter-bar left">
            <div 
              className="meter-fill"
              style={{ 
                width: `${Math.max(0, (left + 60) / 60 * 100)}%` 
              }}
            />
            {showPeakHold && (
              <div 
                className="meter-peak"
                style={{ 
                  left: `${Math.max(0, (peak + 60) / 60 * 100)}%` 
                }}
              />
            )}
          </div>
          <div className="meter-bar right">
            <div 
              className="meter-fill"
              style={{ 
                width: `${Math.max(0, (right + 60) / 60 * 100)}%` 
              }}
            />
          </div>
        </div>
        
        {meterMode !== 'peak' && levels.rms && (
          <div className="rms-display">
            {levels.rms > -60 ? `${levels.rms.toFixed(1)}` : '-∞'}
          </div>
        )}
      </div>
    );
  };

  // Calculate meter width based on console size
  const getMeterWidth = () => {
    switch (consoleSize) {
      case 'small': return 56;
      case 'large': return 96;
      default: return 76;
    }
  };

  const meterWidth = getMeterWidth();

  return (
    <div ref={ref} className={`metering-bridge ${consoleSize}`}>
      {/* Bridge Header */}
      <div className="bridge-header">
        <div className="bridge-title">METERING BRIDGE</div>
        
        <div className="bridge-controls">
          <div className="meter-options">
            <button 
              className={meterMode === 'peak' ? 'active' : ''}
              onClick={() => setMeterMode('peak')}
              title="Peak Metering"
            >
              PEAK
            </button>
            <button 
              className={meterMode === 'rms' ? 'active' : ''}
              onClick={() => setMeterMode('rms')}
              title="RMS Metering"
            >
              RMS
            </button>
            <button 
              className={meterMode === 'both' ? 'active' : ''}
              onClick={() => setMeterMode('both')}
              title="Peak + RMS"
            >
              BOTH
            </button>
          </div>
          
          <button 
            className={`peak-hold ${showPeakHold ? 'active' : ''}`}
            onClick={() => setShowPeakHold(!showPeakHold)}
            title="Peak Hold"
          >
            HOLD
          </button>
        </div>
      </div>

      {/* Scale */}
      <div className="bridge-scale">
        <div className="scale-marks">
          <div className="scale-mark" style={{ left: '100%' }}>0</div>
          <div className="scale-mark" style={{ left: '90%' }}>-6</div>
          <div className="scale-mark" style={{ left: '80%' }}>-12</div>
          <div className="scale-mark" style={{ left: '70%' }}>-18</div>
          <div className="scale-mark" style={{ left: '50%' }}>-24</div>
          <div className="scale-mark" style={{ left: '30%' }}>-36</div>
          <div className="scale-mark" style={{ left: '10%' }}>-48</div>
          <div className="scale-mark" style={{ left: '0%' }}>-∞</div>
        </div>
      </div>

      {/* Meters Container */}
      <div className="bridge-meters">
        {/* Track Meters */}
        <div className="track-meters">
          {tracks.map((track, index) => (
            <div key={track.id} className="track-meter-container">
              <div className="track-label">{index + 1}</div>
              {renderMeterBar(track.id, meterData[track.id], meterWidth)}
            </div>
          ))}
        </div>

        {/* Bus Meters */}
        {buses?.mix && buses.mix.length > 0 && (
          <div className="bus-meters">
            <div className="section-divider" />
            {buses.mix.map((bus) => (
              <div key={bus.id} className="bus-meter-container">
                <div className="bus-label">{bus.name}</div>
                {renderMeterBar(bus.id, meterData[bus.id], meterWidth)}
              </div>
            ))}
          </div>
        )}

        {/* Master Meter */}
        <div className="master-meters">
          <div className="section-divider" />
          <div className="master-meter-container">
            <div className="master-label">MASTER</div>
            {renderMeterBar('master', meterData.master, meterWidth * 1.2)}
            
            {/* Advanced Master Metering */}
            {meterData.master && (
              <div className="master-advanced">
                {meterData.master.lufs && (
                  <div className="lufs-meter">
                    <span className="meter-label">LUFS</span>
                    <span className="meter-value">
                      {meterData.master.lufs.toFixed(1)}
                    </span>
                  </div>
                )}
                
                {meterData.master.correlation && (
                  <div className="correlation-meter">
                    <span className="meter-label">CORR</span>
                    <span className="meter-value">
                      {meterData.master.correlation.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Phase Correlation Scope */}
      <div className="phase-scope">
        <canvas 
          ref={canvasRef}
          width={60}
          height={60}
          className="scope-canvas"
        />
        <div className="scope-label">PHASE</div>
      </div>
    </div>
  );
});

MeteringBridge.displayName = 'MeteringBridge';

export default MeteringBridge;