import React, { useState, useEffect } from 'react';
import DraggableWidget from '../../../components/DraggableWidget';
import './Crossfader.css';

const Crossfader = ({ 
  audioManager = null,
  onCrossfaderChange,
  ...widgetProps 
}) => {
  const [crossfaderValue, setCrossfaderValue] = useState(50);
  const [curve, setCurve] = useState('linear'); // linear, logarithmic, exponential

  useEffect(() => {
    if (audioManager) {
      audioManager.setCrossfader(crossfaderValue / 100, curve);
      onCrossfaderChange?.(crossfaderValue / 100, curve);
    }
  }, [crossfaderValue, curve, audioManager, onCrossfaderChange]);

  const handleCrossfaderChange = (e) => {
    setCrossfaderValue(parseInt(e.target.value));
  };

  const resetCrossfader = () => {
    setCrossfaderValue(50);
  };

  return (
    <DraggableWidget
      id="crossfader"
      title="Crossfader"
      className="mixer-sub-widget crossfader-widget"
      {...widgetProps}
    >
      <div className="crossfader-container">
        <div className="crossfader-header">
          <div className="deck-labels">
            <span className={`deck-label ${crossfaderValue < 40 ? 'active' : ''}`}>A</span>
            <span className={`deck-label ${crossfaderValue > 60 ? 'active' : ''}`}>B</span>
          </div>
          <button 
            className="reset-btn"
            onClick={resetCrossfader}
            title="Reset to center"
          >
            ⚬
          </button>
        </div>

        <div className="crossfader-track">
          <input
            type="range"
            min="0"
            max="100"
            value={crossfaderValue}
            onChange={handleCrossfaderChange}
            className="crossfader-slider"
          />
          <div className="crossfader-markers">
            <div className="marker left">A</div>
            <div className="marker center">⚬</div>
            <div className="marker right">B</div>
          </div>
        </div>

        <div className="crossfader-controls">
          <div className="curve-selector">
            <label>Curve</label>
            <select 
              value={curve} 
              onChange={(e) => setCurve(e.target.value)}
              className="curve-select"
            >
              <option value="linear">Linear</option>
              <option value="logarithmic">Log</option>
              <option value="exponential">Exp</option>
            </select>
          </div>

          <div className="crossfader-display">
            <div className="cf-value">
              {crossfaderValue < 40 ? 'A' : crossfaderValue > 60 ? 'B' : 'CENTER'}
            </div>
            <div className="cf-percentage">{crossfaderValue}%</div>
          </div>
        </div>

        <div className="blend-indicator">
          <div className="blend-bar">
            <div 
              className="blend-fill-a" 
              style={{ 
                width: `${Math.max(0, 100 - crossfaderValue)}%`,
                opacity: Math.max(0, (100 - crossfaderValue) / 100)
              }}
            />
            <div 
              className="blend-fill-b" 
              style={{ 
                width: `${crossfaderValue}%`,
                opacity: crossfaderValue / 100
              }}
            />
          </div>
          <div className="blend-labels">
            <span>A Mix</span>
            <span>B Mix</span>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default Crossfader;