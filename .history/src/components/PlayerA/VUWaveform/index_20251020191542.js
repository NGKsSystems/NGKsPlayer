import React from 'react';

const VUWaveform = ({ 
  vuLevels = { left: 0, right: 0 }, 
  peakHold = { left: 0, right: 0 }, 
  peakLevels = { left: 0, right: 0 }, 
  dbLevels = { left: -60, right: -60 }, 
  waveformData = { left: [], right: [] }, 
  frequencyData = [], 
  currentTime = 0, 
  duration = 0 
}) => {
  
  return (
    <div className="vu-waveform-container">
      <div className="vu-meters">
        {/* Left Channel VU Meter */}
        <div className="vu-meter left">
          <div className="vu-scale">
            {/* Professional VU scale with proper color zones */}
            {Array.from({ length: 20 }, (_, i) => {
              const segmentLevel = (i + 1) * 5; // Each segment = 5%
              const isActive = vuLevels.left >= segmentLevel;
              
              // Color coding: Green (0-60%), Yellow (60-85%), Red (85-100%)
              let segmentColor = '#22c55e'; // Green
              if (segmentLevel > 85) segmentColor = '#ef4444'; // Red
              else if (segmentLevel > 60) segmentColor = '#f59e0b'; // Yellow
              
              return (
                <div
                  key={i}
                  className={`vu-segment ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundColor: isActive ? segmentColor : 'rgba(255,255,255,0.1)',
                    height: '4px',
                    marginBottom: '1px',
                    transition: 'background-color 0.1s ease'
                  }}
                />
              );
            })}
            
            {/* Peak Hold Indicator */}
            {peakHold.left > 0 && (
              <div
                className="peak-hold"
                style={{
                  position: 'absolute',
                  bottom: `${peakHold.left}%`,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: peakHold.left > 85 ? '#ff0000' : '#ffffff',
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                  zIndex: 10
                }}
              />
            )}
            
            {/* Peak Indicator (flashing red) */}
            {peakLevels.left > 0 && (
              <div
                className="peak-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '8px',
                  backgroundColor: '#ff0000',
                  animation: 'peakFlash 0.2s ease-in-out',
                  zIndex: 15
                }}
              />
            )}
          </div>
          <div className="vu-label">
            <div className="channel-label">L</div>
            <div className="db-readout">{dbLevels.left ? dbLevels.left.toFixed(1) : '-60.0'}dB</div>
          </div>
        </div>
        
        {/* Right Channel VU Meter */}
        <div className="vu-meter right">
          <div className="vu-scale">
            {/* Professional VU scale with proper color zones */}
            {Array.from({ length: 20 }, (_, i) => {
              const segmentLevel = (i + 1) * 5; // Each segment = 5%
              const isActive = vuLevels.right >= segmentLevel;
              
              // Color coding: Green (0-60%), Yellow (60-85%), Red (85-100%)
              let segmentColor = '#22c55e'; // Green
              if (segmentLevel > 85) segmentColor = '#ef4444'; // Red
              else if (segmentLevel > 60) segmentColor = '#f59e0b'; // Yellow
              
              return (
                <div
                  key={i}
                  className={`vu-segment ${isActive ? 'active' : ''}`}
                  style={{
                    backgroundColor: isActive ? segmentColor : 'rgba(255,255,255,0.1)',
                    height: '4px',
                    marginBottom: '1px',
                    transition: 'background-color 0.1s ease'
                  }}
                />
              );
            })}
            
            {/* Peak Hold Indicator */}
            {peakHold.right > 0 && (
              <div
                className="peak-hold"
                style={{
                  position: 'absolute',
                  bottom: `${peakHold.right}%`,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: peakHold.right > 85 ? '#ff0000' : '#ffffff',
                  boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                  zIndex: 10
                }}
              />
            )}
            
            {/* Peak Indicator (flashing red) */}
            {peakLevels.right > 0 && (
              <div
                className="peak-indicator"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '8px',
                  backgroundColor: '#ff0000',
                  animation: 'peakFlash 0.2s ease-in-out',
                  zIndex: 15
                }}
              />
            )}
          </div>
          <div className="vu-label">
            <div className="channel-label">R</div>
            <div className="db-readout">{dbLevels.right ? dbLevels.right.toFixed(1) : '-60.0'}dB</div>
          </div>
        </div>
      </div>
      
      <div className="waveform-display">
        <div className="waveform-progress" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}></div>
        
        {/* Dual Channel Waveform */}
        <div className="dual-waveform">
          {/* Left Channel Waveform */}
          <div className="waveform-channel left-channel">
            <div className="channel-waveform">
              {waveformData.left.map((amplitude, i) => {
                // Color based on amplitude level
                let barColor = '#22c55e'; // Green for normal
                if (amplitude > 85) barColor = '#ef4444'; // Red for peaks
                else if (amplitude > 70) barColor = '#f59e0b'; // Yellow for high
                
                return (
                  <div 
                    key={i} 
                    className="waveform-sample" 
                    style={{ 
                      height: `${Math.max(2, Math.min(75, amplitude * 0.3))}%`,
                      backgroundColor: barColor,
                      boxShadow: amplitude > 60 ? `0 0 2px ${barColor}` : 'none',
                      opacity: 0.7 + (amplitude / 100) * 0.3
                    }}
                  />
                );
              })}
            </div>
            <div className="channel-label-waveform">L</div>
          </div>
          
          {/* Center Line */}
          <div className="waveform-center-line"></div>
          
          {/* Right Channel Waveform */}
          <div className="waveform-channel right-channel">
            <div className="channel-waveform">
              {waveformData.right.map((amplitude, i) => {
                // Color based on amplitude level
                let barColor = '#22c55e'; // Green for normal
                if (amplitude > 85) barColor = '#ef4444'; // Red for peaks
                else if (amplitude > 70) barColor = '#f59e0b'; // Yellow for high
                
                return (
                  <div 
                    key={i} 
                    className="waveform-sample" 
                    style={{ 
                      height: `${Math.max(2, Math.min(75, amplitude * 0.3))}%`,
                      backgroundColor: barColor,
                      boxShadow: amplitude > 60 ? `0 0 2px ${barColor}` : 'none',
                      opacity: 0.7 + (amplitude / 100) * 0.3
                    }}
                  />
                );
              })}
            </div>
            <div className="channel-label-waveform">R</div>
          </div>
        </div>
        
        {/* Spectrum Analyzer (smaller, below waveform) */}
        <div className="mini-spectrum">
          {frequencyData.slice(0, 32).map((amplitude, i) => {
            let barColor = '#444';
            if (i < 8) barColor = '#ef4444'; // Bass = Red
            else if (i < 24) barColor = '#f59e0b'; // Mid = Yellow  
            else barColor = '#3b82f6'; // Treble = Blue
            
            return (
              <div 
                key={i} 
                className="mini-spectrum-bar" 
                style={{ 
                  height: `${Math.max(1, Math.min(15, amplitude / 8))}%`,
                  backgroundColor: amplitude > 20 ? barColor : '#333',
                  opacity: amplitude > 10 ? 0.8 : 0.3
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VUWaveform;