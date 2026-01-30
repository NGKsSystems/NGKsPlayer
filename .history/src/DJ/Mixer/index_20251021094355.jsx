import React, { useState } from 'react';
import VolumeControl from '../Common/VolumeControl';
import './styles.css';

const Mixer = () => {
  const [volumeA, setVolumeA] = useState(75);
  const [volumeB, setVolumeB] = useState(75);
  const [crossfader, setCrossfader] = useState(50);
  const [masterVolume, setMasterVolume] = useState(80);

  return (
    <div className="mixer-widget">
      <div className="mixer-header">
        <h3>DJ Mixer</h3>
      </div>
      
      <div className="mixer-content">
        <div className="mixer-section deck-volumes">
          <VolumeControl
            label="Vol A"
            value={volumeA}
            onChange={setVolumeA}
            color="#ff6b35"
          />
          
          <div className="crossfader-section">
            <label>Crossfader</label>
            <div className="crossfader-container">
              <input
                type="range"
                min="0"
                max="100"
                value={crossfader}
                onChange={(e) => setCrossfader(parseInt(e.target.value))}
                className="crossfader"
              />
              <div className="crossfader-labels">
                <span>A</span>
                <span>B</span>
              </div>
            </div>
          </div>
          
          <VolumeControl
            label="Vol B"
            value={volumeB}
            onChange={setVolumeB}
            color="#2196f3"
          />
        </div>
        
        <div className="mixer-section master-section">
          <VolumeControl
            label="Master"
            value={masterVolume}
            onChange={setMasterVolume}
            color="#9c27b0"
          />
        </div>
      </div>
    </div>
  );
};

export default Mixer;