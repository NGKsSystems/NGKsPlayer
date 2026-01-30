import React, { useState, useEffect, useRef } from 'react';
import './Knob.css';

const Knob = ({ 
  id,
  label, 
  value = 50, 
  min = 0, 
  max = 100, 
  onChange,
  audioManager,
  channel, // 'A' or 'B'
  controlType // 'gain', 'reverb', 'pitch'
}) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const knobRef = useRef(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(currentValue);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const deltaY = startY - e.clientY; // Inverted for natural feel
    const sensitivity = 0.5;
    const newValue = Math.max(min, Math.min(max, startValue + (deltaY * sensitivity)));
    
    setCurrentValue(Math.round(newValue));
    onChange?.(Math.round(newValue));
    
    // Apply to AudioManager based on control type
    if (audioManager && channel) {
      const channelNum = channel === 'A' ? 1 : 2;
      const normalizedValue = newValue / 100;
      
      switch(controlType) {
        case 'gain':
          audioManager.setChannelGain?.(channelNum, normalizedValue);
          break;
        case 'reverb':
          audioManager.setChannelReverb?.(channelNum, normalizedValue);
          break;
        case 'pitch':
          // Pitch range typically -50% to +50%
          const pitchValue = ((newValue - 50) / 50) * 0.5;
          audioManager.setChannelPitch?.(channelNum, pitchValue);
          break;
      }
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
  }, [isDragging, startY, startValue]);

  // Calculate rotation angle (270 degrees range)
  const percentage = (currentValue - min) / (max - min);
  const rotation = (percentage * 270) - 135; // -135 to +135 degrees

  return (
    <div className="knob-container">
      <div className="knob-label">{label}</div>
      <div 
        ref={knobRef}
        className={`knob ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        style={{
          transform: `rotate(${rotation}deg)`
        }}
      >
        <div className="knob-indicator"></div>
      </div>
      <div className="knob-value">{currentValue}</div>
    </div>
  );
};

export default Knob;