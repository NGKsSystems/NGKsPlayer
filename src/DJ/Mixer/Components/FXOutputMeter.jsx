/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXOutputMeter.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import './FXOutputMeter.css';

const FXOutputMeter = ({ level = 0, color = '#3498db', isActive = false }) => {
  const [peakLevel, setPeakLevel] = useState(0);
  const [peakHold, setPeakHold] = useState(0);

  useEffect(() => {
    if (level > peakLevel) {
      setPeakLevel(level);
      setPeakHold(level);
      
      // Peak hold decay
      setTimeout(() => {
        setPeakHold(0);
      }, 1500);
    }
  }, [level, peakLevel]);

  const getColorForLevel = (lvl) => {
    if (lvl > 90) return '#e74c3c'; // Red (clipping)
    if (lvl > 75) return '#f39c12'; // Orange (hot)
    if (lvl > 50) return '#f1c40f'; // Yellow (warm)
    return color; // Default color (normal)
  };

  return (
    <div className="fx-output-meter">
      <div className="fx-meter-label">
        <Activity size={10} />
        <span>OUTPUT</span>
      </div>
      <div className="fx-meter-container">
        {/* Background segments */}
        <div className="fx-meter-segments">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`fx-meter-segment ${i < Math.floor(level / 5) ? 'active' : ''}`}
              style={{
                backgroundColor: i < Math.floor(level / 5) ? getColorForLevel(i * 5) : 'rgba(255, 255, 255, 0.1)'
              }}
            />
          ))}
        </div>
        {/* Peak hold indicator */}
        {peakHold > 0 && (
          <div
            className="fx-meter-peak"
            style={{
              left: `${peakHold}%`,
              backgroundColor: getColorForLevel(peakHold)
            }}
          />
        )}
      </div>
      <div className="fx-meter-value">
        {Math.round(level)}%
        {level > 90 && <span className="fx-meter-clip">CLIP</span>}
      </div>
    </div>
  );
};

export default FXOutputMeter;

