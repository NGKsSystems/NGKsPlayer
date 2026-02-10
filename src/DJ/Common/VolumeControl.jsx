/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: VolumeControl.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useCallback } from 'react';
import './VolumeControl.css';

const VolumeControl = ({ 
  label, 
  value = 50, 
  onChange, 
  color = '#ff6b35',
  orientation = 'vertical' 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef(null);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling to parent widgets
    setIsDragging(true);
    
    const updateValue = (clientY) => {
      if (!sliderRef.current) return;
      
      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, 
        100 - ((clientY - rect.top) / rect.height) * 100
      ));
      
      onChange?.(Math.round(percentage));
    };

    updateValue(e.clientY);

    const handleMouseMove = (e) => {
      e.preventDefault();
      updateValue(e.clientY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [onChange]);

  return (
    <div className="volume-control">
      <div className="volume-label">{label}</div>
      
      <div 
        ref={sliderRef}
        className={`volume-slider ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        style={{ '--volume-color': color }}
      >
        <div className="volume-track">
          <div 
            className="volume-fill"
            style={{ height: `${value}%` }}
          />
          <div 
            className="volume-thumb"
            style={{ bottom: `${value}%` }}
          />
        </div>
      </div>
      
      <div className="volume-value">{value}%</div>
    </div>
  );
};

export default VolumeControl;
