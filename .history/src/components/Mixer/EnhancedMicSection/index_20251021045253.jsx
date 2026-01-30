import React, { useState, useCallback, useRef, useEffect } from 'react';
import './styles.css';

const EnhancedMicSection = ({ 
  onMicGainChange = () => {},
  onMicVolumeChange = () => {},
  onMicMute = () => {},
  onMicTalkover = () => {},
  onMicEQChange = () => {},
  onMicEffectChange = () => {},
  micGain = 50,
  micVolume = 60,
  isMicMuted = false,
  isTalkoverActive = false,
  micEQ = { high: 0, mid: 0, low: 0 },
  micEffect = { reverb: 0, echo: 0 }
}) => {
  const [gain, setGain] = useState(micGain);
  const [volume, setVolume] = useState(micVolume);
  const [muted, setMuted] = useState(isMicMuted);
  const [talkover, setTalkover] = useState(isTalkoverActive);
  const [eq, setEQ] = useState(micEQ);
  const [effects, setEffects] = useState(micEffect);
  const [inputLevel, setInputLevel] = useState(0); // Simulated input level
  const [isDragging, setIsDragging] = useState({
    gain: false,
    volume: false,
    high: false,
    mid: false,
    low: false,
    reverb: false,
    echo: false
  });

  const sliderRefs = useRef({});
  const dragStartY = useRef({});
  const dragStartValue = useRef({});

  // Simulate input level for visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      if (!muted && gain > 0) {
        setInputLevel(Math.random() * (gain / 100) * 100);
      } else {
        setInputLevel(0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [muted, gain]);

  const handleSliderStart = useCallback((type, e) => {
    setIsDragging(prev => ({ ...prev, [type]: true }));
    dragStartY.current[type] = e.clientY;
    
    if (['high', 'mid', 'low'].includes(type)) {
      dragStartValue.current[type] = eq[type];
    } else if (['reverb', 'echo'].includes(type)) {
      dragStartValue.current[type] = effects[type];
    } else {
      dragStartValue.current[type] = type === 'gain' ? gain : volume;
    }
    e.preventDefault();
  }, [gain, volume, eq, effects]);

  const handleSliderMove = useCallback((e) => {
    Object.keys(isDragging).forEach(type => {
      if (isDragging[type]) {
        const deltaY = dragStartY.current[type] - e.clientY; // Inverted for natural feel
        const sensitivity = ['high', 'mid', 'low', 'reverb', 'echo'].includes(type) ? 0.2 : 0.3;
        const deltaValue = deltaY * sensitivity;
        
        if (['high', 'mid', 'low'].includes(type)) {
          const newValue = Math.max(-12, Math.min(12, dragStartValue.current[type] + deltaValue));
          setEQ(prev => ({ ...prev, [type]: newValue }));
          onMicEQChange(type, newValue);
        } else if (['reverb', 'echo'].includes(type)) {
          const newValue = Math.max(0, Math.min(100, dragStartValue.current[type] + deltaValue));
          setEffects(prev => ({ ...prev, [type]: newValue }));
          onMicEffectChange(type, newValue);
        } else {
          const newValue = Math.max(0, Math.min(100, dragStartValue.current[type] + deltaValue));
          if (type === 'gain') {
            setGain(newValue);
            onMicGainChange(newValue);
          } else {
            setVolume(newValue);
            onMicVolumeChange(newValue);
          }
        }
      }
    });
  }, [isDragging, onMicGainChange, onMicVolumeChange, onMicEQChange, onMicEffectChange]);

  const handleSliderEnd = useCallback(() => {
    setIsDragging({
      gain: false,
      volume: false,
      high: false,
      mid: false,
      low: false,
      reverb: false,
      echo: false
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

  const handleMicMute = useCallback(() => {
    setMuted(prev => !prev);
    onMicMute(!muted);
  }, [muted, onMicMute]);

  const handleTalkover = useCallback(() => {
    setTalkover(prev => !prev);
    onMicTalkover(!talkover);
  }, [talkover, onMicTalkover]);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const renderKnob = (type, label, value, range = 100, centerZero = false) => {
    const percentage = centerZero ? 
      ((value + range/2) / range) * 100 : 
      (value / range) * 100;
    const rotation = centerZero ? 
      (value / (range/2)) * 135 : // -135° to +135°
      (percentage / 100) * 270 - 135; // -135° to +135°

    return (
      <div className="mic-knob-container">
        <div className="mic-knob-label">{label}</div>
        <div 
          className={`mic-knob ${isDragging[type] ? 'dragging' : ''}`}
          onMouseDown={(e) => handleSliderStart(type, e)}
        >
          <div 
            className="knob-pointer"
            style={{ transform: `rotate(${rotation}deg)` }}
          ></div>
          <div className="knob-center"></div>
        </div>
        <div className="mic-knob-value">
          {centerZero ? 
            `${value > 0 ? '+' : ''}${value.toFixed(1)}${type.includes('reverb') || type.includes('echo') ? '%' : 'dB'}` : 
            `${value.toFixed(0)}${type === 'gain' || type === 'volume' ? '' : '%'}`}
        </div>
      </div>
    );
  };

  const renderVolumeSlider = (type, label, value) => {
    const percentage = value;
    const sliderPosition = 100 - percentage;

    return (
      <div className="mic-volume-control">
        <div className="mic-volume-label">{label}</div>
        <div className="mic-volume-slider-container">
          <div className="mic-volume-slider-track">
            <div 
              className="mic-volume-fill"
              style={{ height: `${percentage}%` }}
            ></div>
            <div 
              className={`mic-volume-slider-handle ${isDragging[type] ? 'dragging' : ''}`}
              style={{ top: `${sliderPosition}%` }}
              onMouseDown={(e) => handleSliderStart(type, e)}
            >
              <div className="handle-grip"></div>
            </div>
          </div>
        </div>
        <div className="mic-volume-display">
          <div className="mic-volume-value">{Math.round(value)}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-mic-section-content" onMouseDown={preventDrag}>
      <div className="mic-section-header">
        <div className="mic-status-indicators">
          <div className={`mic-status-light ${muted ? 'muted' : inputLevel > 10 ? 'active' : 'idle'}`}></div>
          <span className="mic-status-text">
            {muted ? 'MUTED' : inputLevel > 10 ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>
      
      <div className="mic-controls-container">
        {/* Input Level Meter */}
        <div className="mic-input-meter">
          <div className="meter-label">INPUT</div>
          <div className="input-level-meter">
            <div className="meter-bar">
              {Array.from({ length: 12 }, (_, i) => (
                <div 
                  key={i}
                  className={`meter-segment ${i < Math.floor(inputLevel / 8.33) ? 'active' : ''} ${i >= 10 ? 'red' : i >= 8 ? 'yellow' : 'green'}`}
                ></div>
              ))}
            </div>
          </div>
          <div className="meter-scale">
            <span>0</span>
            <span>-12</span>
            <span>-24</span>
          </div>
        </div>

        {/* Gain and Volume Controls */}
        <div className="mic-sliders-section">
          {renderVolumeSlider('gain', 'GAIN', gain)}
          {renderVolumeSlider('volume', 'VOL', volume)}
        </div>

        {/* EQ Section */}
        <div className="mic-eq-section">
          <div className="eq-title">EQ</div>
          <div className="eq-knobs">
            {renderKnob('high', 'HIGH', eq.high, 24, true)}
            {renderKnob('mid', 'MID', eq.mid, 24, true)}
            {renderKnob('low', 'LOW', eq.low, 24, true)}
          </div>
        </div>

        {/* Effects Section */}
        <div className="mic-effects-section">
          <div className="effects-title">EFFECTS</div>
          <div className="effects-knobs">
            {renderKnob('reverb', 'REVERB', effects.reverb, 100, false)}
            {renderKnob('echo', 'ECHO', effects.echo, 100, false)}
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="mic-control-buttons">
        <button
          className={`mic-btn mute-btn ${muted ? 'active' : ''}`}
          onClick={handleMicMute}
          onMouseDown={preventDrag}
          title="Mute Microphone"
        >
          {muted ? '🔇' : '🎤'} MUTE
        </button>
        
        <button
          className={`mic-btn talkover-btn ${talkover ? 'active' : ''}`}
          onClick={handleTalkover}
          onMouseDown={preventDrag}
          title="Talkover (Auto-duck music)"
        >
          🗣️ TALK
        </button>
      </div>

      {/* Mic Settings */}
      <div className="mic-settings">
        <div className="setting-row">
          <label className="setting-label">Auto Gain:</label>
          <input 
            type="checkbox" 
            className="setting-checkbox"
            onMouseDown={preventDrag}
          />
        </div>
        <div className="setting-row">
          <label className="setting-label">Noise Gate:</label>
          <input 
            type="checkbox" 
            className="setting-checkbox"
            onMouseDown={preventDrag}
          />
        </div>
      </div>
    </div>
  );
};

export default EnhancedMicSection;