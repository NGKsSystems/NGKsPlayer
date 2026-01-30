import React, { useState, useCallback, useRef, useEffect } from 'react';
import './styles.css';

const PitchControls = ({ 
  onPitchChange = () => {},
  onPitchReset = () => {},
  onRangeChange = () => {},
  pitchA = 0,
  pitchB = 0,
  rangeA = 8,
  rangeB = 8,
  isKeyLocked = false
}) => {
  const [pitchValues, setPitchValues] = useState({ A: pitchA, B: pitchB });
  const [pitchRanges, setPitchRanges] = useState({ A: rangeA, B: rangeB });
  const [isDragging, setIsDragging] = useState({ A: false, B: false });
  const [keyLock, setKeyLock] = useState(isKeyLocked);
  
  const sliderRefs = useRef({ A: null, B: null });
  const dragStartY = useRef({ A: 0, B: 0 });
  const dragStartValue = useRef({ A: 0, B: 0 });

  // Available pitch ranges (in %)
  const pitchRangeOptions = [4, 8, 16, 25, 50, 100];

  const handlePitchSliderStart = useCallback((deck, e) => {
    setIsDragging(prev => ({ ...prev, [deck]: true }));
    dragStartY.current[deck] = e.clientY;
    dragStartValue.current[deck] = pitchValues[deck];
    e.preventDefault();
  }, [pitchValues]);

  const handlePitchSliderMove = useCallback((e) => {
    Object.keys(isDragging).forEach(deck => {
      if (isDragging[deck]) {
        const deltaY = dragStartY.current[deck] - e.clientY; // Inverted for natural feel
        const sensitivity = 0.1;
        const deltaValue = deltaY * sensitivity;
        const newValue = Math.max(-pitchRanges[deck], Math.min(pitchRanges[deck], 
          dragStartValue.current[deck] + deltaValue));
        
        setPitchValues(prev => ({
          ...prev,
          [deck]: newValue
        }));
        onPitchChange(deck, newValue);
      }
    });
  }, [isDragging, pitchRanges, onPitchChange]);

  const handlePitchSliderEnd = useCallback(() => {
    setIsDragging({ A: false, B: false });
  }, []);

  useEffect(() => {
    if (isDragging.A || isDragging.B) {
      document.addEventListener('mousemove', handlePitchSliderMove);
      document.addEventListener('mouseup', handlePitchSliderEnd);
      return () => {
        document.removeEventListener('mousemove', handlePitchSliderMove);
        document.removeEventListener('mouseup', handlePitchSliderEnd);
      };
    }
  }, [isDragging, handlePitchSliderMove, handlePitchSliderEnd]);

  const handlePitchReset = useCallback((deck) => {
    setPitchValues(prev => ({ ...prev, [deck]: 0 }));
    onPitchReset(deck);
  }, [onPitchReset]);

  const handleRangeChange = useCallback((deck, range) => {
    setPitchRanges(prev => ({ ...prev, [deck]: range }));
    // Reset pitch if it exceeds new range
    if (Math.abs(pitchValues[deck]) > range) {
      setPitchValues(prev => ({ ...prev, [deck]: 0 }));
      onPitchChange(deck, 0);
    }
    onRangeChange(deck, range);
  }, [pitchValues, onPitchChange, onRangeChange]);

  const handleKeyLockToggle = useCallback(() => {
    setKeyLock(prev => !prev);
  }, []);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const renderPitchSlider = (deck) => {
    const pitchValue = pitchValues[deck];
    const range = pitchRanges[deck];
    const percentage = (pitchValue / range) * 100;
    const sliderPosition = 50 - (percentage / 2); // Center at 50%, range ±50%

    return (
      <div key={deck} className="pitch-deck">
        <div className="deck-label">DECK {deck}</div>
        
        {/* Pitch Range Selector */}
        <div className="pitch-range-selector">
          <select
            value={range}
            onChange={(e) => handleRangeChange(deck, parseInt(e.target.value))}
            onMouseDown={preventDrag}
            className="range-select"
          >
            {pitchRangeOptions.map(option => (
              <option key={option} value={option}>±{option}%</option>
            ))}
          </select>
        </div>

        {/* Pitch Slider */}
        <div className="pitch-slider-container">
          <div className="pitch-scale">
            <div className="scale-mark top">+{range}%</div>
            <div className="scale-mark center">0</div>
            <div className="scale-mark bottom">-{range}%</div>
          </div>
          
          <div className="pitch-slider-track">
            <div className="center-line"></div>
            <div 
              className={`pitch-slider-handle ${isDragging[deck] ? 'dragging' : ''}`}
              style={{ top: `${sliderPosition}%` }}
              onMouseDown={(e) => handlePitchSliderStart(deck, e)}
            >
              <div className="handle-grip"></div>
            </div>
          </div>
          
          <div className="pitch-indicators">
            {[-range, -range/2, 0, range/2, range].map((value, index) => (
              <div 
                key={index} 
                className={`pitch-tick ${value === 0 ? 'center-tick' : ''}`}
                style={{ top: `${50 - (value / range) * 50}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Pitch Display */}
        <div className="pitch-display">
          <div className={`pitch-value ${pitchValue > 0 ? 'positive' : pitchValue < 0 ? 'negative' : 'zero'}`}>
            {pitchValue > 0 ? '+' : ''}{pitchValue.toFixed(2)}%
          </div>
          <button
            className="pitch-reset-btn"
            onClick={() => handlePitchReset(deck)}
            onMouseDown={preventDrag}
            disabled={pitchValue === 0}
            title="Reset pitch to 0"
          >
            RESET
          </button>
        </div>

        {/* Fine Tune */}
        <div className="fine-tune">
          <button
            className="fine-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              const newValue = Math.max(-range, pitchValue - 0.1);
              setPitchValues(prev => ({ ...prev, [deck]: newValue }));
              onPitchChange(deck, newValue);
            }}
            title="Fine tune down"
          >
            -
          </button>
          <span className="fine-label">FINE</span>
          <button
            className="fine-btn"
            onMouseDown={(e) => {
              e.preventDefault();
              const newValue = Math.min(range, pitchValue + 0.1);
              setPitchValues(prev => ({ ...prev, [deck]: newValue }));
              onPitchChange(deck, newValue);
            }}
            title="Fine tune up"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="pitch-controls-content" onMouseDown={preventDrag}>
      <div className="pitch-controls-header">
        <h4>PITCH CONTROL</h4>
        <button
          className={`key-lock-btn ${keyLock ? 'active' : ''}`}
          onClick={handleKeyLockToggle}
          onMouseDown={preventDrag}
          title="Master Key Lock"
        >
          🔒 KEY LOCK
        </button>
      </div>
      
      <div className="pitch-decks-container">
        {renderPitchSlider('A')}
        {renderPitchSlider('B')}
      </div>

      {/* Master Pitch Info */}
      <div className="master-pitch-info">
        <div className="pitch-difference">
          Difference: {Math.abs(pitchValues.A - pitchValues.B).toFixed(2)}%
        </div>
        {keyLock && (
          <div className="key-lock-status">
            🔒 Key Lock Active
          </div>
        )}
      </div>
    </div>
  );
};

export default PitchControls;