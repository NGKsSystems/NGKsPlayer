import React from 'react';

const GainControl = ({ deck, value, onChange, onMouseDown, onTouchStart }) => (
  <div className="gain-control">
    <label>Gain {deck}</label>
    <input 
      type="range" 
      min="0" 
      max="100" 
      step="1"
      value={value}
      onChange={(e) => onChange(deck, e.target.value)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="gain-slider"
    />
    <div className="gain-value">{value}%</div>
  </div>
);

const GainControls = ({ gainA, gainB, onGainChange, onMouseDown, onTouchStart }) => (
  <>
    <GainControl 
      deck="A" 
      value={gainA} 
      onChange={onGainChange}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
    <GainControl 
      deck="B" 
      value={gainB} 
      onChange={onGainChange}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  </>
);

export default GainControls;