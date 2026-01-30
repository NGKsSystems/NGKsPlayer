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
      const normalizedValue = newValue / 100;
      
      switch(controlType) {
        case 'gain':
          // Convert 0-100 scale to 0-2 gain scale (0 = -∞, 1 = 0dB, 2 = +6dB)
          const gainValue = (normalizedValue) * 2; // 0-2 range
          audioManager.setGain?.(channel, gainValue);
          break;
        case 'reverb':
          audioManager.setChannelReverb?.(channel, normalizedValue);
          break;
        case 'pitch':
          // Pitch range typically -50% to +50%
          const pitchValue = ((newValue - 50) / 50) * 0.5;
          audioManager.setChannelPitch?.(channel, pitchValue);
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

  const handleDecrement = () => {
    const newValue = Math.max(min, currentValue - 5);
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, currentValue + 5);
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  // Convert value to display format
  const getDisplayValue = () => {
    if (controlType === 'gain') {
      // Convert 0-100 to -12dB to 0dB
      // 100 = 0dB (reference), 0 = -12dB (silent)
      if (currentValue === 0) return '-∞';
      const db = ((currentValue / 100) * 12) - 12; // Maps 100 to 0dB, 0 to -12dB
      return `${db.toFixed(1)}dB`;
    } else if (controlType === 'pitch') {
      // Convert 0-100 to -50% to +50%
      const pitch = (currentValue - 50);
      return `${pitch > 0 ? '+' : ''}${pitch}%`;
    } else if (controlType === 'filter') {
      // Convert 0-100 to frequency range (20Hz to 20kHz)
      if (currentValue === 100) return '∞';
      if (currentValue === 0) return '20Hz';
      const minFreq = 20;
      const maxFreq = 20000;
      const logFreq = minFreq * Math.pow(maxFreq / minFreq, currentValue / 100);
      
      // Safety check - cap at 20kHz max
      if (logFreq > maxFreq) return '20kHz';
      
      if (logFreq >= 1000) {
        const khzValue = (logFreq / 1000).toFixed(1);
        return `${khzValue}k`;
      }
      const hz = Math.round(logFreq);
      return `${hz}Hz`;
    } else {
      return `${currentValue}%`;
    }
  };

  // Calculate rotation angle (270 degrees range)
  const percentage = (currentValue - min) / (max - min);
  const rotation = (percentage * 270) - 135; // -135 to +135 degrees
  const displayValue = getDisplayValue();

  return (
    <div className="knob-container" data-control-type={controlType}>
      <div 
        ref={knobRef}
        className={`knob ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div 
          className="knob-indicator"
          style={{
            transform: `rotate(${rotation}deg)`
          }}
        ></div>
        <div 
          className={`knob-display-overlay ${['A', 'B', 'M', 'HP', 'MIC'].includes(channel) ? 'control-value' : ''}`}
        >
          {displayValue}
        </div>
      </div>
      <div className="knob-controls-static">
        <button className="knob-btn knob-minus" onClick={handleDecrement}>−</button>
        <button className="knob-btn knob-plus" onClick={handleIncrement}>+</button>
      </div>
    </div>
  );
};

export default Knob;