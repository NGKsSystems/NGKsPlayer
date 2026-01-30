import React from 'react';

const VolumeControl = ({ deck, value, onChange, onMouseDown, onTouchStart }) => (
  <div className="volume-control vertical">
    <label>Volume {deck}</label>
    <input 
      type="range" 
      min="0" 
      max="100" 
      step="1"
      value={value}
      onChange={(e) => onChange(deck, e.target.value)}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className="volume-slider vertical"
      orient="vertical"
    />
    <div className="volume-value">{value}%</div>
  </div>
);

const VolumeControls = ({ volumeA, volumeB, onVolumeChange, onMouseDown, onTouchStart }) => (
  <>
    <VolumeControl 
      deck="A" 
      value={volumeA} 
      onChange={onVolumeChange}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
    <VolumeControl 
      deck="B" 
      value={volumeB} 
      onChange={onVolumeChange}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    />
  </>
);

export default VolumeControls;