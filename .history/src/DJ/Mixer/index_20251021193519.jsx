import React, { useState, useEffect } from 'react';
import DraggableWidget from '../../components/DraggableWidget';
import './mixer.css';

const Mixer = ({ audioManager, ...props }) => {
  const [mixerState, setMixerState] = useState({
    channel1: {
      gain: 75,
      eq: { high: 0, mid: 0, low: 0 },
      filter: { type: 'none', frequency: 1000 },
      cue: false
    },
    channel2: {
      gain: 75,
      eq: { high: 0, mid: 0, low: 0 },
      filter: { type: 'none', frequency: 1000 },
      cue: false
    },
    crossfader: {
      position: 50,
      curve: 'linear'
    },
    master: {
      volume: 80,
      limiter: true
    },
    headphones: {
      volume: 60,
      mix: 50
    },
    effects: {
      send1: { level: 0, type: 'reverb' },
      send2: { level: 0, type: 'delay' }
    }
  });

  const handleChannelChange = (channel, parameter, value) => {
    setMixerState(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [parameter]: value
      }
    }));
  };

  const handleCrossfaderChange = (position, curve) => {
    setMixerState(prev => ({
      ...prev,
      crossfader: { position, curve }
    }));
  };

  const handleMasterChange = (parameter, value) => {
    setMixerState(prev => ({
      ...prev,
      master: {
        ...prev.master,
        [parameter]: value
      }
    }));
  };

  const handleHeadphoneChange = (parameter, value) => {
    setMixerState(prev => ({
      ...prev,
      headphones: {
        ...prev.headphones,
        [parameter]: value
      }
    }));
  };

  const handleEffectChange = (sendNumber, level, type) => {
    setMixerState(prev => ({
      ...prev,
      effects: {
        ...prev.effects,
        [`send${sendNumber}`]: { level, type }
      }
    }));
  };

  // Sync mixer state with AudioManager
  useEffect(() => {
    if (audioManager) {
      audioManager.updateMixerState?.(mixerState);
    }
  }, [mixerState, audioManager]);

  return (
    <div className="mixer-container">
      <div className="mixer-info">
        <span className="mixer-brand">NGKs</span>
        <span className="mixer-model">MX-2000 Pro</span>
      </div>
      
      <div className="mixer-workspace" style={{ position: 'relative', width: '100%', height: '600px' }}>
        {/* Volume A - Vertical Slider */}
        <DraggableWidget
          id="volume-a"
          title="VOL A"
          x={20}
          y={20}
          width={60}
          height={200}
          className="mixer-sub-widget"
          minSize={{ width: 50, height: 150 }}
        >
          <div className="vertical-slider-container">
            <input
              type="range"
              className="vertical-slider"
              min="0"
              max="100"
              value={mixerState.channel1.gain}
              onChange={(e) => handleChannelChange('channel1', 'gain', parseInt(e.target.value))}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
            <div className="control-label">Volume A</div>
            <div className="control-value">{mixerState.channel1.gain}%</div>
          </div>
        </DraggableWidget>

        {/* Volume B - Vertical Slider */}
        <DraggableWidget
          id="volume-b"
          title="VOL B"
          x={100}
          y={20}
          width={60}
          height={200}
          className="mixer-sub-widget"
          minSize={{ width: 50, height: 150 }}
        >
          <div className="vertical-slider-container">
            <input
              type="range"
              className="vertical-slider"
              min="0"
              max="100"
              value={mixerState.channel2.gain}
              onChange={(e) => handleChannelChange('channel2', 'gain', parseInt(e.target.value))}
              style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
            />
            <div className="control-label">Volume B</div>
            <div className="control-value">{mixerState.channel2.gain}%</div>
          </div>
        </DraggableWidget>

        {/* Gain A - Knob */}
        <DraggableWidget
          id="gain-a"
          title="GAIN A"
          x={180}
          y={20}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${(mixerState.channel1.preGain || 50) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7);
                handleChannelChange('channel1', 'preGain', Math.max(0, Math.min(100, value)));
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Gain A</div>
            <div className="control-value">{mixerState.channel1.preGain || 50}%</div>
          </div>
        </DraggableWidget>

        {/* Gain B - Knob */}
        <DraggableWidget
          id="gain-b"
          title="GAIN B" 
          x={280}
          y={20}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${(mixerState.channel2.preGain || 50) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7);
                handleChannelChange('channel2', 'preGain', Math.max(0, Math.min(100, value)));
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Gain B</div>
            <div className="control-value">{mixerState.channel2.preGain || 50}%</div>
          </div>
        </DraggableWidget>

        {/* Reverb A - Knob */}
        <DraggableWidget
          id="reverb-a"
          title="REV A"
          x={380}
          y={20}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${(mixerState.effects.send1.level || 0) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7);
                handleEffectChange(1, Math.max(0, Math.min(100, value)), 'reverb');
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Reverb A</div>
            <div className="control-value">{mixerState.effects.send1.level || 0}%</div>
          </div>
        </DraggableWidget>

        {/* Reverb B - Knob */}
        <DraggableWidget
          id="reverb-b"
          title="REV B"
          x={480}
          y={20}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${(mixerState.effects.send2.level || 0) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7);
                handleEffectChange(2, Math.max(0, Math.min(100, value)), 'reverb');
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Reverb B</div>
            <div className="control-value">{mixerState.effects.send2.level || 0}%</div>
          </div>
        </DraggableWidget>

        {/* Pitch A - Knob */}
        <DraggableWidget
          id="pitch-a"
          title="PITCH A"
          x={180}
          y={120}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${((mixerState.channel1.pitch || 0) + 50) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7) - 50;
                handleChannelChange('channel1', 'pitch', Math.max(-50, Math.min(50, value)));
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Pitch A</div>
            <div className="control-value">{mixerState.channel1.pitch || 0}%</div>
          </div>
        </DraggableWidget>

        {/* Pitch B - Knob */}
        <DraggableWidget
          id="pitch-b"
          title="PITCH B"
          x={280}
          y={120}
          width={80}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="knob-container">
            <div 
              className="knob"
              style={{
                transform: `rotate(${((mixerState.channel2.pitch || 0) + 50) * 2.7 - 135}deg)`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
                const degrees = (angle * 180 / Math.PI + 135) % 360;
                const value = Math.round(degrees / 2.7) - 50;
                handleChannelChange('channel2', 'pitch', Math.max(-50, Math.min(50, value)));
              }}
            >
              <div className="knob-pointer"></div>
            </div>
            <div className="control-label">Pitch B</div>
            <div className="control-value">{mixerState.channel2.pitch || 0}%</div>
          </div>
        </DraggableWidget>

        {/* Crossfader - Horizontal Slider */}
        <DraggableWidget
          id="crossfader"
          title="CROSSFADER"
          x={150}
          y={240}
          width={250}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 200, height: 60 }}
        >
          <div className="horizontal-slider-container">
            <input
              type="range"
              className="horizontal-slider"
              min="0"
              max="100"
              value={mixerState.crossfader.position}
              onChange={(e) => handleCrossfaderChange(parseInt(e.target.value), mixerState.crossfader.curve)}
            />
            <div className="crossfader-labels">
              <span>A</span>
              <span>B</span>
            </div>
            <div className="control-value">{mixerState.crossfader.position}%</div>
          </div>
        </DraggableWidget>
      </div>

      <div className="mixer-status">
        <div className="status-item">
          <span className="status-label">CH1:</span>
          <span className="status-value">{mixerState.channel1.gain}%</span>
        </div>
        <div className="status-item">
          <span className="status-label">CH2:</span>
          <span className="status-value">{mixerState.channel2.gain}%</span>
        </div>
        <div className="status-item">
          <span className="status-label">XF:</span>
          <span className="status-value">{mixerState.crossfader.position}%</span>
        </div>
        <div className="status-item">
          <span className="status-label">MST:</span>
          <span className="status-value">{mixerState.master.volume}%</span>
        </div>
      </div>
    </div>
  );
};

export default Mixer;