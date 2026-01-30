import React, { useCallback } from 'react';
import './styles.css';

const VolumeA = ({ value, onChange }) => {
  const handleChange = useCallback((e) => {
    onChange('A', e.target.value);
  }, [onChange]);

  return (
    <div className="volume-a-content">
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

export default VolumeA;