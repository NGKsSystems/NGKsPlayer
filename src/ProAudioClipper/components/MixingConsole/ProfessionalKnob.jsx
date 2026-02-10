/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalKnob.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ProfessionalKnob.css';

const ProfessionalKnob = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  onAutomationWrite,
  automationMode = 'off',
  trackId,
  parameter,
  label = '',
  unit = '',
  size = 'medium', // 'small', 'medium', 'large'
  centerDetent = false,
  bipolar = false,
  logarithmic = false,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [startY, setStartY] = useState(0);
  const [startValue, setStartValue] = useState(0);
  const [automationActive, setAutomationActive] = useState(false);
  
  const knobRef = useRef(null);
  const sensitivity = 0.5; // Pixel-to-value sensitivity

  // Update local value when prop changes
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // Convert value to angle (-135° to +135°, 270° total range)
  const getAngle = useCallback(() => {
    const normalizedValue = logarithmic 
      ? (Math.log(localValue / min) / Math.log(max / min))
      : (localValue - min) / (max - min);
    
    if (bipolar) {
      // Bipolar: center at 0°, -135° to +135°
      return (normalizedValue - 0.5) * 270;
    } else {
      // Unipolar: -135° to +135°
      return -135 + (normalizedValue * 270);
    }
  }, [localValue, min, max, bipolar, logarithmic]);

  // Convert angle to value
  const angleToValue = useCallback((angle) => {
    let normalizedValue;
    
    if (bipolar) {
      normalizedValue = (angle / 270) + 0.5;
    } else {
      normalizedValue = (angle + 135) / 270;
    }
    
    normalizedValue = Math.max(0, Math.min(1, normalizedValue));
    
    let rawValue;
    if (logarithmic) {
      rawValue = min * Math.pow(max / min, normalizedValue);
    } else {
      rawValue = min + (normalizedValue * (max - min));
    }
    
    // Snap to center detent
    if (centerDetent) {
      const centerValue = bipolar ? 0 : (min + max) / 2;
      const detentRange = (max - min) * 0.02; // 2% detent range
      
      if (Math.abs(rawValue - centerValue) < detentRange) {
        rawValue = centerValue;
      }
    }
    
    return Math.round(rawValue / step) * step;
  }, [min, max, step, bipolar, logarithmic, centerDetent]);

  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartValue(localValue);
    
    if (automationMode === 'touch' || automationMode === 'latch') {
      setAutomationActive(true);
      if (onAutomationWrite) {
        onAutomationWrite(trackId, `${parameter}_touch_start`, true, Date.now());
      }
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [disabled, localValue, automationMode, trackId, parameter, onAutomationWrite]);

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY; // Inverted for natural feel
    const range = max - min;
    const delta = (deltaY * sensitivity * range) / 100;
    
    // Fine adjustment with Shift key
    const fineDelta = e.shiftKey ? delta * 0.1 : delta;
    
    let newValue = startValue + fineDelta;
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;
    
    setLocalValue(newValue);
    onChange(newValue, Date.now());
    
    if (automationMode === 'write' || (automationMode === 'touch' && automationActive) || 
        (automationMode === 'latch' && automationActive)) {
      if (onAutomationWrite) {
        onAutomationWrite(trackId, parameter, newValue, Date.now());
      }
    }
  }, [isDragging, startY, startValue, max, min, step, onChange, automationMode, automationActive, trackId, parameter, onAutomationWrite]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (automationMode === 'touch') {
      setAutomationActive(false);
      if (onAutomationWrite) {
        onAutomationWrite(trackId, `${parameter}_touch_end`, false, Date.now());
      }
    }

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [automationMode, trackId, parameter, onAutomationWrite, handleMouseMove]);

  // Handle double-click to reset to default
  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    
    let defaultValue;
    if (centerDetent) {
      defaultValue = bipolar ? 0 : (min + max) / 2;
    } else {
      defaultValue = min;
    }
    
    setLocalValue(defaultValue);
    onChange(defaultValue, Date.now());
    
    if (automationMode !== 'off' && onAutomationWrite) {
      onAutomationWrite(trackId, parameter, defaultValue, Date.now());
    }
  }, [disabled, centerDetent, bipolar, min, max, onChange, automationMode, trackId, parameter, onAutomationWrite]);

  // Handle scroll wheel
  const handleWheel = useCallback((e) => {
    if (disabled || !knobRef.current) return;
    
    e.preventDefault();
    
    const delta = -e.deltaY * step * (e.shiftKey ? 0.1 : 1);
    let newValue = localValue + delta;
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = Math.round(newValue / step) * step;
    
    setLocalValue(newValue);
    onChange(newValue, Date.now());
    
    if (automationMode !== 'off' && onAutomationWrite) {
      onAutomationWrite(trackId, parameter, newValue, Date.now());
    }
  }, [disabled, localValue, min, max, step, onChange, automationMode, trackId, parameter, onAutomationWrite]);

  // Format display value
  const formatValue = useCallback((val) => {
    if (unit === 'dB') {
      if (val <= min && logarithmic) return '-∞';
      return val >= 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
    } else if (unit === 'Hz') {
      if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
      return val.toFixed(0);
    } else if (unit === '%') {
      return val.toFixed(0);
    } else {
      return val.toFixed(step < 1 ? 1 : 0);
    }
  }, [min, max, step, unit, logarithmic]);

  // Get automation indicator class
  const getAutomationClass = () => {
    if (automationMode === 'off') return '';
    if (automationMode === 'read') return 'automation-read';
    if (automationMode === 'write') return 'automation-write';
    if (automationMode === 'touch' && automationActive) return 'automation-touch-active';
    if (automationMode === 'touch' && !automationActive) return 'automation-touch';
    if (automationMode === 'latch' && automationActive) return 'automation-latch-active';
    if (automationMode === 'latch' && !automationActive) return 'automation-latch';
    return '';
  };

  const angle = getAngle();

  return (
    <div className={`professional-knob ${size} ${disabled ? 'disabled' : ''} ${getAutomationClass()}`}>
      {/* Label */}
      {label && (
        <div className="knob-label">{label}</div>
      )}
      
      {/* Knob Container */}
      <div 
        className={`knob-container ${isDragging ? 'dragging' : ''}`}
        ref={knobRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-valuenow={localValue}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={`${label} knob`}
      >
        {/* Background Ring */}
        <div className="knob-ring">
          {/* Range indicator */}
          <div className="range-indicator" />
          
          {/* Center detent marker */}
          {centerDetent && (
            <div className="center-detent" />
          )}
          
          {/* Scale marks */}
          <div className="scale-marks">
            {Array.from({ length: 9 }, (_, i) => (
              <div 
                key={i}
                className={`scale-mark ${i === 4 && centerDetent ? 'center' : ''}`}
                style={{ 
                  transform: `rotate(${-135 + (i * 33.75)}deg)` 
                }}
              />
            ))}
          </div>
        </div>

        {/* Knob Body */}
        <div 
          className="knob-body"
          style={{ 
            transform: `rotate(${angle}deg)` 
          }}
        >
          <div className="knob-indicator" />
          
          {/* Automation indicator */}
          {automationMode !== 'off' && (
            <div className={`automation-dot ${automationActive ? 'active' : ''}`} />
          )}
        </div>

        {/* Value arc */}
        <svg className="value-arc" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray={`${((localValue - min) / (max - min)) * 270 * (Math.PI * 80 / 360)} ${Math.PI * 80}`}
            strokeDashoffset={-67.5 * (Math.PI * 80 / 360)}
            className="arc-fill"
          />
        </svg>
      </div>

      {/* Value Display */}
      <div className="knob-value">
        {formatValue(localValue)}
        {unit && <span className="value-unit">{unit}</span>}
      </div>

      {/* Automation Mode Display */}
      {automationMode !== 'off' && size !== 'small' && (
        <div className="automation-mode-indicator">
          {automationMode.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default ProfessionalKnob;
