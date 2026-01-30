import React from 'react';

const MasterSection = ({ masterVolume, cueVolume, micGain, onMasterChange, onCueChange, onMicChange }) => (
  <div className="master-section">
    <div className="master-controls">
      <div className="master-volume">
        <label>Master</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={masterVolume || 80}
          onChange={(e) => onMasterChange && onMasterChange(e.target.value)}
          className="master-slider"
        />
        <span>{masterVolume || 80}%</span>
      </div>
      
      <div className="cue-volume">
        <label>Cue</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={cueVolume || 60}
          onChange={(e) => onCueChange && onCueChange(e.target.value)}
          className="cue-slider"
        />
        <span>{cueVolume || 60}%</span>
      </div>
    </div>
    
    <div className="mic-section">
      <div className="mic-control">
        <label>Mic Gain</label>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={micGain || 25}
          onChange={(e) => onMicChange && onMicChange(e.target.value)}
          className="mic-slider"
        />
        <span>{micGain || 25}%</span>
      </div>
    </div>
  </div>
);

export default MasterSection;