import React, { useCallback } from 'react';

const VolumeControl = ({ deck, value, onChange, showLabel = true }) => {
  const handleMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleInputMouseDown = useCallback((e) => {
    // Allow input interaction but prevent drag bubbling
    e.stopPropagation();
  }, []);

  return (
    <div className="volume-control vertical" onMouseDown={handleMouseDown} onTouchStart={handleMouseDown}>
      {showLabel && <label>Volume {deck}</label>}
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="1"
        value={value}
        onChange={(e) => onChange(deck, e.target.value)}
        onMouseDown={handleInputMouseDown}
        onTouchStart={handleInputMouseDown}
        className="volume-slider vertical"
        orient="vertical"
      />
      <div className="volume-value">{value}%</div>
    </div>
  );
};

const VolumeControls = ({ volumeA, volumeB, onVolumeChange, showLabels = false }) => {
  const handleContainerMouseDown = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div className="volume-controls-container" onMouseDown={handleContainerMouseDown} onTouchStart={handleContainerMouseDown}>
      <VolumeControl 
        deck="A" 
        value={volumeA} 
        onChange={onVolumeChange}
        showLabel={showLabels}
      />
      <VolumeControl 
        deck="B" 
        value={volumeB} 
        onChange={onVolumeChange}
        showLabel={showLabels}
      />
    </div>
  );
};

export default VolumeControls;