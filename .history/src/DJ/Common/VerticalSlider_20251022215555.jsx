import React, { useState, useEffect, useRef } from 'react';
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
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleSliderChange(e);
  };

  const handleSliderChange = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Invert because slider goes from bottom to top
    const percentage = 1 - (y / height);
    const newValue = Math.round(min + (percentage * (max - min)));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    setCurrentValue(clampedValue);
    onChange?.(clampedValue);
    
    // Apply to AudioManager
    if (audioManager && channel) {
      const channelNum = channel === 'A' ? 1 : 2;
      audioManager.setChannelVolume?.(channelNum, clampedValue / 100);
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      handleSliderChange(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const fillHeight = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className="vertical-slider-container">
      <div 
        ref={containerRef}
        className="vertical-slider-wrapper"
        onMouseDown={handleMouseDown}
      >
        <div className="slider-track">
          <div 
            className="slider-fill"
            style={{ height: `${fillHeight}%` }}
          ></div>
          <div 
            className="slider-thumb"
            style={{ bottom: `${fillHeight}%` }}
          ></div>
        </div>
        <div className="slider-value">{currentValue}%</div>
      </div>
    </div>
  );
};

export default VerticalSlider;