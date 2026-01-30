import React, { useCallback } from 'react';

const VolumeControl = ({ deck, value, onChange }) => {
  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div className="volume-control vertical" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
      <label>Volume {deck}</label>
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="1"
        value={value}
        onChange={(e) => onChange(deck, e.target.value)}
        className="volume-slider vertical"
        orient="vertical"
      />
      <div className="volume-value">{value}%</div>
    </div>
  );
};

const VolumeControls = ({ volumeA, volumeB, onVolumeChange }) => {
  const handleContainerMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div onMouseDown={handleContainerMouseDown} onTouchStart={handleContainerMouseDown}>
      <VolumeControl 
        deck="A" 
        value={volumeA} 
        onChange={onVolumeChange}
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