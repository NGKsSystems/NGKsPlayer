import React, { useState, useEffect } from 'react';
import './VerticalSlider.css';

const VerticalSlider = ({ 
  id,
  label, 
  value = 50, 
  min = 0, 
  max = 100, 
  onChange,
  audioManager,
  channel // 'A' or 'B'
}) => {
  const [currentValue, setCurrentValue] = useState(value);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = parseInt(e.target.value);
    setCurrentValue(newValue);
    onChange?.(newValue);
    
    // Apply to AudioManager
    if (audioManager && channel) {
      const channelNum = channel === 'A' ? 1 : 2;
      audioManager.setChannelVolume?.(channelNum, newValue / 100);
    }
  };

  return (
    <div className="vertical-slider-container">
      <div className="slider-label">{label}</div>
      <div className="vertical-slider-wrapper">
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          value={currentValue}
          onChange={handleChange}
          className="vertical-slider"
          orient="vertical"
        />
        <div className="slider-value">{currentValue}%</div>
      </div>
    </div>
  );
};

export default VerticalSlider;