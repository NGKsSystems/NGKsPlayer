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
  const containerRef = useRef(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const updateValue = (e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Invert because slider goes from bottom to top
    const percentage = 1 - Math.max(0, Math.min(1, y / height));
    const newValue = Math.round(min + (percentage * (max - min)));
    const clampedValue = Math.max(min, Math.min(max, newValue));
    
    console.log('VerticalSlider updating:', { y, height, percentage, clampedValue });
    
    setCurrentValue(clampedValue);
    onChange?.(clampedValue);
    
    // Apply to AudioManager using setVolume method with deck letter
    if (audioManager && channel) {
      audioManager.setVolume?.(channel, clampedValue / 100);
      console.log(`Set deck ${channel} volume to ${clampedValue / 100}`);
    }
  };

  const handleMouseDown = (e) => {
    console.log('VerticalSlider mouseDown started');
    isDraggingRef.current = true;
    updateValue(e);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current) {
        console.log('VerticalSlider mousemove');
        updateValue(e);
      }
    };

    const handleMouseUp = () => {
      console.log('VerticalSlider mouseUp ended');
      isDraggingRef.current = false;
    };

    if (isDraggingRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDraggingRef.current) {
        updateValue(e);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [min, max, onChange, audioManager, channel]);

  const fillHeight = ((currentValue - min) / (max - min)) * 100;

  return (
    <div className="vertical-slider-container">
      {label && <div className="slider-label">{label}</div>}
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
        <div className={`slider-value ${['A', 'B', 'M', 'HP', 'MIC'].includes(channel) ? 'control-value' : ''}`}>{currentValue}%</div>
      </div>
    </div>
  );
};

export default VerticalSlider;