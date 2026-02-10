/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalFader.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ProfessionalFader.css';

const ProfessionalFader = ({
  value,
  min = -60,
  max = 12,
  step = 0.1,
  onChange,
  onAutomationWrite,
  automationMode = 'off',
  trackId,
  label = '',
  size = 'normal', // 'compact', 'normal', 'large'
  orientation = 'vertical'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [touchStartTime, setTouchStartTime] = useState(null);
  const [automationActive, setAutomationActive] = useState(false);
  
  const faderRef = useRef(null);
  const knobRef = useRef(null);
  const automationTimeoutRef = useRef(null);

  // Update local value when prop changes (automation playback)
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // Calculate fader position
  const getPosition = useCallback(() => {
    const range = max - min;
    const position = ((localValue - min) / range) * 100;
    return Math.max(0, Math.min(100, position));
  }, [localValue, min, max]);

  // Convert position to value
  const positionToValue = useCallback((position) => {
    const range = max - min;
    const rawValue = min + (position / 100) * range;
    return Math.round(rawValue / step) * step;
  }, [min, max, step]);

  // Get fader dimensions and mouse position
  const getMousePosition = useCallback((e, faderRect) => {
    if (orientation === 'vertical') {
      const relativeY = e.clientY - faderRect.top;
      const position = 100 - ((relativeY / faderRect.height) * 100);
      return Math.max(0, Math.min(100, position));
    } else {
      const relativeX = e.clientX - faderRect.left;
      const position = (relativeX / faderRect.width) * 100;
      return Math.max(0, Math.min(100, position));
    }
  }, [orientation]);

  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setTouchStartTime(Date.now());
    
    if (automationMode === 'touch' || automationMode === 'latch') {
      setAutomationActive(true);
      if (onAutomationWrite) {
        onAutomationWrite(trackId, 'fader_touch_start', true, Date.now());
      }
    }

    const faderRect = faderRef.current.getBoundingClientRect();
    const newPosition = getMousePosition(e, faderRect);
    const newValue = positionToValue(newPosition);
    
    setLocalValue(newValue);
    onChange(newValue, Date.now());
    
    if (automationMode === 'write' || automationMode === 'touch' || automationMode === 'latch') {
      if (onAutomationWrite) {
        onAutomationWrite(trackId, 'gain', newValue, Date.now());
      }
    }

    if (typeof document === 'undefined') return;

    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [automationMode, trackId, onChange, onAutomationWrite, getMousePosition, positionToValue]);

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !faderRef.current) return;

    const faderRect = faderRef.current.getBoundingClientRect();
    const newPosition = getMousePosition(e, faderRect);
    const newValue = positionToValue(newPosition);
    
    setLocalValue(newValue);
    onChange(newValue, Date.now());
    
    if (automationMode === 'write' || (automationMode === 'touch' && automationActive) || 
        (automationMode === 'latch' && automationActive)) {
      if (onAutomationWrite) {
        onAutomationWrite(trackId, 'gain', newValue, Date.now());
      }
    }
  }, [isDragging, automationMode, automationActive, trackId, onChange, onAutomationWrite, getMousePosition, positionToValue]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (automationMode === 'touch') {
      // Touch mode: stop writing after release
      setAutomationActive(false);
      if (onAutomationWrite) {
        onAutomationWrite(trackId, 'fader_touch_end', false, Date.now());
      }
    } else if (automationMode === 'latch') {
      // Latch mode: continue writing until stopped or another control is touched
      if (automationTimeoutRef.current) {
        clearTimeout(automationTimeoutRef.current);
      }
      automationTimeoutRef.current = setTimeout(() => {
        setAutomationActive(false);
        if (onAutomationWrite) {
          onAutomationWrite(trackId, 'fader_latch_end', false, Date.now());
        }
      }, 1000); // 1 second latch timeout
    }

    if (typeof document === 'undefined') return;

    // Remove global mouse event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [automationMode, trackId, onAutomationWrite, handleMouseMove]);

  // Handle double-click for unity gain (0dB)
  const handleDoubleClick = useCallback(() => {
    const unityValue = 0;
    setLocalValue(unityValue);
    onChange(unityValue, Date.now());
    
    if (automationMode !== 'off' && onAutomationWrite) {
      onAutomationWrite(trackId, 'gain', unityValue, Date.now());
    }
  }, [onChange, automationMode, trackId, onAutomationWrite]);

  // Handle keyboard control
  const handleKeyDown = useCallback((e) => {
    if (!faderRef.current) return;
    
    let delta = 0;
    const fineDelta = step;
    const coarseDelta = step * 10;
    
    switch (e.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        delta = e.shiftKey ? fineDelta : coarseDelta;
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        delta = e.shiftKey ? -fineDelta : -coarseDelta;
        break;
      case 'Home':
        setLocalValue(max);
        onChange(max, Date.now());
        return;
      case 'End':
        setLocalValue(min);
        onChange(min, Date.now());
        return;
      case ' ': // Spacebar for unity gain
        handleDoubleClick();
        return;
      default:
        return;
    }
    
    e.preventDefault();
    const newValue = Math.max(min, Math.min(max, localValue + delta));
    setLocalValue(newValue);
    onChange(newValue, Date.now());
    
    if (automationMode !== 'off' && onAutomationWrite) {
      onAutomationWrite(trackId, 'gain', newValue, Date.now());
    }
  }, [localValue, min, max, step, onChange, automationMode, trackId, onAutomationWrite, handleDoubleClick]);

  // Format display value
  const formatValue = useCallback((val) => {
    if (val <= min) return '-∞';
    if (val === 0) return '0';
    return val > 0 ? `+${val.toFixed(1)}` : val.toFixed(1);
  }, [min]);

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

  const position = getPosition();
  
  const bottomStyle = orientation === 'vertical' ? 'bottom' : 'left';
  const unityPosition = ((0 - min) / (max - min)) * 100;
  const mark12Position = ((-12 - min) / (max - min)) * 100;
  const mark24Position = ((-24 - min) / (max - min)) * 100;

  return (
    <div 
      className={`professional-fader ${size} ${orientation} ${getAutomationClass()}`}
      ref={faderRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="slider"
      aria-valuenow={localValue}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-label={`Fader ${label}`}
    >
      {/* Fader Track */}
      <div className="fader-track">
        {/* Scale markings */}
        <div className="fader-scale">
          <div className="scale-mark unity" style={{[bottomStyle]: `${unityPosition}%`}}>
            <span>0</span>
          </div>
          <div className="scale-mark" style={{[bottomStyle]: `${mark12Position}%`}}>
            <span>-12</span>
          </div>
          <div className="scale-mark" style={{[bottomStyle]: `${mark24Position}%`}}>
            <span>-24</span>
          </div>
          <div className="scale-mark max" style={{[bottomStyle]: '100%'}}>
            <span>+12</span>
          </div>
          <div className="scale-mark min" style={{[bottomStyle]: '0%'}}>
            <span>-∞</span>
          </div>
        </div>

        {/* Fader Fill (shows level below knob) */}
        <div 
          className="fader-fill"
          style={{
            [orientation === 'vertical' ? 'height' : 'width']: `${position}%`
          }}
        />
      </div>

      {/* Fader Knob */}
      <div 
        className={`fader-knob ${isDragging ? 'dragging' : ''}`}
        ref={knobRef}
        style={{
          [bottomStyle]: `calc(${position}% - 8px)`
        }}
      >
        <div className="knob-indicator" />
        {automationMode !== 'off' && (
          <div className={`automation-indicator ${automationActive ? 'active' : ''}`} />
        )}
      </div>

      {/* Value Display */}
      <div className="fader-value">
        {formatValue(localValue)}
        {label && <span className="value-unit">{label}</span>}
      </div>

      {/* Automation Mode Display */}
      {automationMode !== 'off' && (
        <div className="automation-mode">
          {automationMode.toUpperCase()}
        </div>
      )}
    </div>
  );
};

export default ProfessionalFader;
