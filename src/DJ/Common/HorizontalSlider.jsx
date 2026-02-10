/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: HorizontalSlider.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import './HorizontalSlider.css';

const HorizontalSlider = ({ 
  id,
  label, 
  value = 50, 
  min = 0, 
  max = 100, 
  onChange,
  audioManager
}) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value);
    setCurrentValue(newValue);
    onChange?.(newValue);
    
    // Apply crossfader to AudioManager
    if (audioManager) {
      const crossfaderValue = newValue / 100; // 0 = full A, 1 = full B
      audioManager.setCrossfader?.(crossfaderValue);
    }
  };

  const getPositionLabel = () => {
    if (currentValue < 25) return 'A';
    if (currentValue > 75) return 'B';
    return 'CENTER';
  };

  return (
    <div className="horizontal-slider-container">
      <div className="slider-label">{label}</div>
      <div className="horizontal-slider-wrapper">
        <div className="crossfader-labels">
          <span className="cf-label-a">A</span>
          <span className="cf-label-center">⊕</span>
          <span className="cf-label-b">B</span>
        </div>
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          value={currentValue}
          onChange={handleChange}
          className="horizontal-slider crossfader"
        />
        <div className="slider-position">{getPositionLabel()}</div>
      </div>
    </div>
  );
};

export default HorizontalSlider;
