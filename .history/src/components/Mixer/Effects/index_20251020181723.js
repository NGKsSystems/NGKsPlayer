import React from 'react';

const Effects = ({ reverbA, reverbB, filterA, filterB, onReverbChange, onFilterChange }) => (
  <div className="effects-section">
    <div className="reverb-controls">
      <div className="reverb-control">
        <label>Reverb A</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={reverbA}
          onChange={(e) => onReverbChange('A', e.target.value)}
          className="reverb-slider"
        />
        <span>{reverbA}%</span>
      </div>
      <div className="reverb-control">
        <label>Reverb B</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={reverbB}
          onChange={(e) => onReverbChange('B', e.target.value)}
          className="reverb-slider"
        />
        <span>{reverbB}%</span>
      </div>
    </div>
    
    <div className="filter-controls">
      <div className="filter-control">
        <label>Filter A</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={filterA}
          onChange={(e) => onFilterChange('A', e.target.value)}
          className="filter-slider"
        />
        <span>{filterA}%</span>
      </div>
      <div className="filter-control">
        <label>Filter B</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={filterB}
          onChange={(e) => onFilterChange('B', e.target.value)}
          className="filter-slider"
        />
        <span>{filterB}%</span>
      </div>
    </div>
  </div>
);

export default Effects;