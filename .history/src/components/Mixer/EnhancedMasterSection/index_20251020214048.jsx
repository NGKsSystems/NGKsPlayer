import React, { useState, useCallback, useRef, useEffect } from 'react';

const EnhancedMasterSection = ({ 
  onMasterVolumeChange = () => {},
  onCueVolumeChange = () => {},
  onBoothVolumeChange = () => {},
  onHeadphoneVolumeChange = () => {},
  onMasterMute = () => {},
  onCueMix = () => {},
  masterVolume = 75,
  cueVolume = 50,
  boothVolume = 60,
  headphoneVolume = 70,
  isMasterMuted = false,
  cueMixBalance = 0 // -100 to +100 (cue to master)
}) => {
  const [volumes, setVolumes] = useState({
    master: masterVolume,
    cue: cueVolume,
    booth: boothVolume,
    headphone: headphoneVolume
  });
  const [masterMuted, setMasterMuted] = useState(isMasterMuted);
  const [cueMix, setCueMix] = useState(cueMixBalance);
  const [isDragging, setIsDragging] = useState({
    master: false,
    cue: false,
    booth: false,
    headphone: false,
    cueMix: false
  });

  const sliderRefs = useRef({});
  const dragStartY = useRef({});
  const dragStartValue = useRef({});

  const handleSliderStart = useCallback((type, e) => {
    setIsDragging(prev => ({ ...prev, [type]: true }));
    dragStartY.current[type] = e.clientY;
    dragStartValue.current[type] = type === 'cueMix' ? cueMix : volumes[type];
    e.preventDefault();
  }, [volumes, cueMix]);

  const handleSliderMove = useCallback((e) => {
    Object.keys(isDragging).forEach(type => {
      if (isDragging[type]) {
        const deltaY = dragStartY.current[type] - e.clientY; // Inverted for natural feel
        const sensitivity = type === 'cueMix' ? 0.5 : 0.3;
        const deltaValue = deltaY * sensitivity;
        
        if (type === 'cueMix') {
          const newValue = Math.max(-100, Math.min(100, dragStartValue.current[type] + deltaValue));
          setCueMix(newValue);
          onCueMix(newValue);
        } else {
          const newValue = Math.max(0, Math.min(100, dragStartValue.current[type] + deltaValue));
          setVolumes(prev => ({ ...prev, [type]: newValue }));
          
          switch (type) {
            case 'master': onMasterVolumeChange(newValue); break;
            case 'cue': onCueVolumeChange(newValue); break;
            case 'booth': onBoothVolumeChange(newValue); break;
            case 'headphone': onHeadphoneVolumeChange(newValue); break;
          }
        }
      }
    });
  }, [isDragging, onMasterVolumeChange, onCueVolumeChange, onBoothVolumeChange, onHeadphoneVolumeChange, onCueMix]);

  const handleSliderEnd = useCallback(() => {
    setIsDragging({
      master: false,
      cue: false,
      booth: false,
      headphone: false,
      cueMix: false
    });
  }, []);

  useEffect(() => {
    if (Object.values(isDragging).some(Boolean)) {
      document.addEventListener('mousemove', handleSliderMove);
      document.addEventListener('mouseup', handleSliderEnd);
      return () => {
        document.removeEventListener('mousemove', handleSliderMove);
        document.removeEventListener('mouseup', handleSliderEnd);
      };
    }
  }, [isDragging, handleSliderMove, handleSliderEnd]);

  const handleMasterMute = useCallback(() => {
    setMasterMuted(prev => !prev);
    onMasterMute(!masterMuted);
  }, [masterMuted, onMasterMute]);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const renderVolumeSlider = (type, label, value, color = '#ff6b35') => {
    const percentage = value;
    const sliderPosition = 100 - percentage; // Top to bottom

    return (
      <div className="volume-control">
        <div className="volume-label">{label}</div>
        <div className="volume-slider-container">
          <div className="volume-slider-track">
            <div 
              className="volume-fill"
              style={{ 
                height: `${percentage}%`,
                background: `linear-gradient(to top, ${color}, ${color}99)`
              }}
            ></div>
            <div 
              className={`volume-slider-handle ${isDragging[type] ? 'dragging' : ''}`}
              style={{ top: `${sliderPosition}%` }}
              onMouseDown={(e) => handleSliderStart(type, e)}
            >
              <div className="handle-grip"></div>
            </div>
            
            {/* Volume level indicators */}
            <div className="volume-indicators">
              {[100, 75, 50, 25, 0].map((level, index) => (
                <div 
                  key={index}
                  className={`volume-tick ${level === 0 ? 'zero-tick' : ''}`}
                  style={{ top: `${100 - level}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="volume-display">
          <div className="volume-value">{Math.round(value)}</div>
          <div className="volume-percent">%</div>
        </div>
      </div>
    );
  };

  const renderCueMixSlider = () => {
    const percentage = (cueMix + 100) / 2; // Convert -100 to +100 range to 0-100%
    const sliderPosition = 100 - percentage;

    return (
      <div className="cue-mix-control">
        <div className="cue-mix-label">CUE MIX</div>
        <div className="cue-mix-slider-container">
          <div className="cue-mix-labels">
            <span className="cue-label">CUE</span>
            <span className="master-label">MASTER</span>
          </div>
          <div className="cue-mix-slider-track">
            <div className="center-detent"></div>
            <div 
              className={`cue-mix-slider-handle ${isDragging.cueMix ? 'dragging' : ''}`}
              style={{ top: `${sliderPosition}%` }}
              onMouseDown={(e) => handleSliderStart('cueMix', e)}
            >
              <div className="handle-grip"></div>
            </div>
            
            {/* Cue mix indicators */}
            <div className="cue-mix-indicators">
              {[-100, -50, 0, 50, 100].map((level, index) => (
                <div 
                  key={index}
                  className={`cue-mix-tick ${level === 0 ? 'center-tick' : ''}`}
                  style={{ top: `${100 - ((level + 100) / 2)}%` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="cue-mix-display">
          <div className="cue-mix-value">
            {cueMix > 0 ? 'M' : cueMix < 0 ? 'C' : '='}{Math.abs(cueMix)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-master-section-content" onMouseDown={preventDrag}>
      <div className="master-section-header">
        <h4>MASTER SECTION</h4>
        <button
          className={`master-mute-btn ${masterMuted ? 'muted' : ''}`}
          onClick={handleMasterMute}
          onMouseDown={preventDrag}
          title="Master Mute"
        >
          {masterMuted ? '🔇' : '🔊'} MUTE
        </button>
      </div>
      
      <div className="master-controls-container">
        {/* Volume Controls */}
        <div className="volume-controls-section">
          {renderVolumeSlider('master', 'MASTER', volumes.master, '#ff6b35')}
          {renderVolumeSlider('booth', 'BOOTH', volumes.booth, '#4ade80')}
          {renderVolumeSlider('cue', 'CUE', volumes.cue, '#60a5fa')}
          {renderVolumeSlider('headphone', 'PHONES', volumes.headphone, '#a78bfa')}
        </div>

        {/* Cue Mix Control */}
        <div className="cue-mix-section">
          {renderCueMixSlider()}
        </div>
      </div>

      {/* Master Level Meters */}
      <div className="master-meters">
        <div className="meter-container">
          <div className="meter-label">L</div>
          <div className="level-meter">
            <div className="meter-bar">
              {Array.from({ length: 10 }, (_, i) => (
                <div 
                  key={i}
                  className={`meter-segment ${i < Math.floor(volumes.master / 10) ? 'active' : ''} ${i >= 8 ? 'red' : i >= 6 ? 'yellow' : 'green'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="meter-container">
          <div className="meter-label">R</div>
          <div className="level-meter">
            <div className="meter-bar">
              {Array.from({ length: 10 }, (_, i) => (
                <div 
                  key={i}
                  className={`meter-segment ${i < Math.floor(volumes.master / 10) ? 'active' : ''} ${i >= 8 ? 'red' : i >= 6 ? 'yellow' : 'green'}`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Master Status */}
      <div className="master-status">
        <div className="status-indicator">
          <div className={`status-light ${masterMuted ? 'muted' : 'active'}`}></div>
          <span className="status-text">
            {masterMuted ? 'MUTED' : 'ACTIVE'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default EnhancedMasterSection;