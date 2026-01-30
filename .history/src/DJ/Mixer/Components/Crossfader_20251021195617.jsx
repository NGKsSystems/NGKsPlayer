import React, { useState } from 'react';
import './Crossfader.css';

const Crossfader = ({ 
  audioManager = null,
  onPositionChange,
  onCurveChange,
  initialPosition = 50,
  initialCurve = 'linear'
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [curve, setCurve] = useState(initialCurve);

  const handlePositionChange = (e) => {
    const value = parseFloat(e.target.value);
    setPosition(value);
    onPositionChange?.(value);
    if (audioManager) {
      audioManager.setCrossfaderPosition(value / 100);
    }
  };

  const handleCurveChange = (newCurve) => {
    setCurve(newCurve);
    onCurveChange?.(newCurve);
    if (audioManager) {
      audioManager.setCrossfaderCurve(newCurve);
    }
  };

  return (
    <div className="crossfader-section">
      <div className="crossfader-header">
        <h3>CROSSFADER</h3>
        <div className="curve-buttons">
          <button 
            className={`curve-btn ${curve === 'linear' ? 'active' : ''}`}
            onClick={() => handleCurveChange('linear')}
            title="Linear curve"
          >
            LIN
          </button>
          <button 
            className={`curve-btn ${curve === 'cut' ? 'active' : ''}`}
            onClick={() => handleCurveChange('cut')}
            title="Cut curve"
          >
            CUT
          </button>
          <button 
            className={`curve-btn ${curve === 'smooth' ? 'active' : ''}`}
            onClick={() => handleCurveChange('smooth')}
            title="Smooth curve"
          >
            SMT
          </button>
        </div>
      </div>

      <div className="crossfader-control">
        <div className="crossfader-track">
          <div className="channel-label left">A</div>
          <input
            type="range"
            min="0"
            max="100"
            value={position}
            onChange={handlePositionChange}
            className="crossfader-slider"
          />
          <div className="channel-label right">B</div>
        </div>
        <div className="position-indicator">
          <span className="position-value">{position.toFixed(0)}%</span>
        </div>
      </div>

      <div className="crossfader-assign">
        <div className="assign-buttons">
          <button className="assign-btn active" title="Assign Channel A">A</button>
          <button className="assign-btn" title="Through">THR</button>
          <button className="assign-btn active" title="Assign Channel B">B</button>
        </div>
      </div>
    </div>
  );
};

export default Crossfader;