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
        {/* Channel Strip 1 */}
        <DraggableWidget
          id="channel-strip-1"
          title="CH 1"
          x={10}
          y={10}
          width={120}
          height={300}
          className="mixer-sub-widget"
          minSize={{ width: 100, height: 250 }}
        >
          <ChannelStrip
            audioManager={audioManager}
            channel="channel1"
            channelNumber={1}
            onGainChange={(value) => handleChannelChange('channel1', 'gain', value)}
            onEQChange={(band, value) => handleChannelChange('channel1', 'eq', { ...mixerState.channel1.eq, [band]: value })}
            onFilterChange={(type, frequency) => handleChannelChange('channel1', 'filter', { type, frequency })}
            onCueChange={(cue) => handleChannelChange('channel1', 'cue', cue)}
            initialValues={mixerState.channel1}
          />
        </DraggableWidget>

        {/* Channel Strip 2 */}
        <DraggableWidget
          id="channel-strip-2"
          title="CH 2"
          x={140}
          y={10}
          width={120}
          height={300}
          className="mixer-sub-widget"
          minSize={{ width: 100, height: 250 }}
        >
          <ChannelStrip
            audioManager={audioManager}
            channel="channel2"
            channelNumber={2}
            onGainChange={(value) => handleChannelChange('channel2', 'gain', value)}
            onEQChange={(band, value) => handleChannelChange('channel2', 'eq', { ...mixerState.channel2.eq, [band]: value })}
            onFilterChange={(type, frequency) => handleChannelChange('channel2', 'filter', { type, frequency })}
            onCueChange={(cue) => handleChannelChange('channel2', 'cue', cue)}
            initialValues={mixerState.channel2}
          />
        </DraggableWidget>

        {/* Crossfader */}
        <DraggableWidget
          id="crossfader"
          title="CROSSFADER"
          x={270}
          y={50}
          width={200}
          height={150}
          className="mixer-sub-widget"
          minSize={{ width: 180, height: 120 }}
        >
          <Crossfader
            audioManager={audioManager}
            onPositionChange={(position) => handleCrossfaderChange(position, mixerState.crossfader.curve)}
            onCurveChange={(curve) => handleCrossfaderChange(mixerState.crossfader.position, curve)}
            initialPosition={mixerState.crossfader.position}
            initialCurve={mixerState.crossfader.curve}
          />
        </DraggableWidget>

        {/* Master Section */}
        <DraggableWidget
          id="master-section"
          title="MASTER"
          x={480}
          y={10}
          width={150}
          height={200}
          className="mixer-sub-widget"
          minSize={{ width: 130, height: 180 }}
        >
          <MasterSection
            audioManager={audioManager}
            onMasterVolumeChange={(value) => handleMasterChange('volume', value * 100)}
            onHeadphoneVolumeChange={(value) => handleHeadphoneChange('volume', value * 100)}
            onHeadphoneMixChange={(value) => handleHeadphoneChange('mix', value * 100)}
          />
        </DraggableWidget>

        {/* Effects Send 1 */}
        <DraggableWidget
          id="fx-send-1"
          title="FX SEND 1"
          x={640}
          y={10}
          width={150}
          height={180}
          className="mixer-sub-widget"
          minSize={{ width: 130, height: 160 }}
        >
          <EffectsSend
            audioManager={audioManager}
            sendNumber={1}
            onSendLevelChange={(send, level) => handleEffectChange(send, level * 100, mixerState.effects.send1.type)}
            onEffectChange={(send, type, params) => handleEffectChange(send, mixerState.effects.send1.level, type)}
          />
        </DraggableWidget>

        {/* Effects Send 2 */}
        <DraggableWidget
          id="fx-send-2"
          title="FX SEND 2"
          x={640}
          y={200}
          width={150}
          height={180}
          className="mixer-sub-widget"
          minSize={{ width: 130, height: 160 }}
        >
          <EffectsSend
            audioManager={audioManager}
            sendNumber={2}
            onSendLevelChange={(send, level) => handleEffectChange(send, level * 100, mixerState.effects.send2.type)}
            onEffectChange={(send, type, params) => handleEffectChange(send, mixerState.effects.send2.level, type)}
          />
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