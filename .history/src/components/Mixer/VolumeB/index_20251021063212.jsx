import React, { useCallback } from 'react';
import './styles.css';

const VolumeB = ({ value, onChange }) => {
  const handleChange = useCallback((e) => {
    onChange('B', e.target.value);
  }, [onChange]);

  const handleMouseDown = useCallback((e) => {
    // Only prevent drag propagation on the actual slider
    if (e.target.type === 'range') {
      e.stopPropagation();
    }
  }, []);

  return (
    <div className="volume-b-content" onMouseDown={handleMouseDown}>
      <div className="volume-slider-container">
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="1"
          value={value}
          onChange={handleChange}
          className="volume-slider vertical"
          orient="vertical"
        />
      </div>
      <div className="volume-display">
        <span className="volume-value">{value}%</span>
      </div>
    </div>
  );
};

export default VolumeB;