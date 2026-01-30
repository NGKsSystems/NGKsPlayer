import React from 'react';

const Crossfader = ({ value, onChange, onMouseDown, onTouchStart }) => (
  <div className="crossfader-control">
    <label>A ← Crossfader → B</label>
    <input 
      type="range" 
      min="0" 
      max="100" 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="crossfader-slider"
    />
    <div className="crossfader-value">{value}%</div>
  </div>
);

export default Crossfader;