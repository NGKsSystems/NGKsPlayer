import React, { useState, useEffect } from 'react';
import DraggableWidget from '../../components/DraggableWidget';
import VerticalSlider from '../Common/VerticalSlider';
import Knob from '../Common/Knob';
import HorizontalSlider from '../Common/HorizontalSlider';
import RecordingControl from '../Common/RecordingControl';
import './mixer.css';

const Mixer = ({ audioManager, mixerLayout = {}, onMixerLayoutChange = () => {}, ...props }) => {
  const [mixerState, setMixerState] = useState({
    channel1: {
      gain: 75,
      preGain: 50,
      pitch: 0,
      eq: { high: 0, mid: 0, low: 0 },
      filter: { type: 'none', frequency: 50 }, // Use 0-100 scale (50 = ~6.3kHz)
      cue: false
    },
    channel2: {
      gain: 75,
      preGain: 50,
      pitch: 0,
      eq: { high: 0, mid: 0, low: 0 },
      filter: { type: 'none', frequency: 50 }, // Use 0-100 scale (50 = ~6.3kHz)
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
      send2: { level: 0, type: 'reverb' }
    },
    microphone: {
      enabled: false,
      volume: 50,
      gain: 50,
      reverb: 0
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

  // Define all knob widget IDs for synchronized resizing
  const KNOB_WIDGET_IDS = ['gain-a', 'gain-b', 'reverb-a', 'reverb-b', 'pitch-a', 'pitch-b', 'filter-a', 'filter-b'];

  // Create a synchronized layout update handler
  const handleSynchronizedLayoutChange = (updates) => {
    // If this is a knob widget being resized, apply the same size to ALL knob widgets
    const resizedWidgetId = Object.keys(updates)[0];
    const resizedWidget = updates[resizedWidgetId];
    
    if (KNOB_WIDGET_IDS.includes(resizedWidgetId) && resizedWidget) {
      // Apply the same width and height to all knob widgets, but keep individual positions
      const synchronizedUpdates = {};
      KNOB_WIDGET_IDS.forEach(knobId => {
        synchronizedUpdates[knobId] = {
          ...mixerLayout[knobId],
          width: resizedWidget.width || 85,
          height: resizedWidget.height || 130
        };
      });
      onMixerLayoutChange(synchronizedUpdates);
    } else {
      // Non-knob widgets update normally
      onMixerLayoutChange(updates);
    }
  };

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
          x={mixerLayout['volume-a']?.x ?? 20}
          y={mixerLayout['volume-a']?.y ?? 20}
          width={mixerLayout['volume-a']?.width ?? 80}
          height={mixerLayout['volume-a']?.height ?? 150}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 130 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'volume-a': updates })}
        >
          <VerticalSlider
            id="volume-a-slider"
            value={mixerState.channel1.gain}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel1', 'gain', value)}
            audioManager={audioManager}
            channel="A"
          />
        </DraggableWidget>

        {/* Volume B - Vertical Slider */}
        <DraggableWidget
          id="volume-b"
          title="VOL B"
          x={mixerLayout['volume-b']?.x ?? 120}
          y={mixerLayout['volume-b']?.y ?? 20}
          width={mixerLayout['volume-b']?.width ?? 80}
          height={mixerLayout['volume-b']?.height ?? 150}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 130 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'volume-b': updates })}
        >
          <VerticalSlider
            id="volume-b-slider"
            value={mixerState.channel2.gain}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel2', 'gain', value)}
            audioManager={audioManager}
            channel="B"
          />
        </DraggableWidget>

        {/* Gain A - Knob */}
        <DraggableWidget
          id="gain-a"
          title="GAIN A"
          x={mixerLayout['gain-a']?.x ?? 220}
          y={mixerLayout['gain-a']?.y ?? 20}
          width={mixerLayout['gain-a']?.width ?? 85}
          height={mixerLayout['gain-a']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'gain-a': updates })}
        >
          <Knob
            id="gain-a-knob"
            value={mixerState.channel1.preGain || 50}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel1', 'preGain', value)}
            audioManager={audioManager}
            channel="A"
            controlType="gain"
          />
        </DraggableWidget>

        {/* Gain B - Knob */}
        <DraggableWidget
          id="gain-b"
          title="GAIN B" 
          x={mixerLayout['gain-b']?.x ?? 320}
          y={mixerLayout['gain-b']?.y ?? 20}
          width={mixerLayout['gain-b']?.width ?? 85}
          height={mixerLayout['gain-b']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'gain-b': updates })}
        >
          <Knob
            id="gain-b-knob"
            value={mixerState.channel2.preGain || 50}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel2', 'preGain', value)}
            audioManager={audioManager}
            channel="B"
            controlType="gain"
          />
        </DraggableWidget>

        {/* Reverb A - Knob */}
        <DraggableWidget
          id="reverb-a"
          title="REV A"
          x={mixerLayout['reverb-a']?.x ?? 420}
          y={mixerLayout['reverb-a']?.y ?? 20}
          width={mixerLayout['reverb-a']?.width ?? 85}
          height={mixerLayout['reverb-a']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'reverb-a': updates })}
        >
          <Knob
            id="reverb-a-knob"
            value={mixerState.effects.send1.level || 0}
            min={0}
            max={100}
            onChange={(value) => handleEffectChange(1, value, 'reverb')}
            audioManager={audioManager}
            channel="A"
            controlType="reverb"
          />
        </DraggableWidget>

        {/* Reverb B - Knob */}
        <DraggableWidget
          id="reverb-b"
          title="REV B"
          x={mixerLayout['reverb-b']?.x ?? 520}
          y={mixerLayout['reverb-b']?.y ?? 20}
          width={mixerLayout['reverb-b']?.width ?? 85}
          height={mixerLayout['reverb-b']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'reverb-b': updates })}
        >
          <Knob
            id="reverb-b-knob"
            value={mixerState.effects.send2.level || 0}
            min={0}
            max={100}
            onChange={(value) => handleEffectChange(2, value, 'reverb')}
            audioManager={audioManager}
            channel="B"
            controlType="reverb"
          />
        </DraggableWidget>

        {/* Pitch A - Knob */}
        <DraggableWidget
          id="pitch-a"
          title="PITCH A"
          x={mixerLayout['pitch-a']?.x ?? 220}
          y={mixerLayout['pitch-a']?.y ?? 140}
          width={mixerLayout['pitch-a']?.width ?? 85}
          height={mixerLayout['pitch-a']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'pitch-a': updates })}
        >
          <Knob
            id="pitch-a-knob"
            value={(mixerState.channel1.pitch || 0) + 50} // Convert -50/+50 to 0-100 range
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel1', 'pitch', value - 50)} // Convert back to -50/+50
            audioManager={audioManager}
            channel="A"
            controlType="pitch"
          />
        </DraggableWidget>

        {/* Pitch B - Knob */}
        <DraggableWidget
          id="pitch-b"
          title="PITCH B"
          x={mixerLayout['pitch-b']?.x ?? 320}
          y={mixerLayout['pitch-b']?.y ?? 140}
          width={mixerLayout['pitch-b']?.width ?? 85}
          height={mixerLayout['pitch-b']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'pitch-b': updates })}
        >
          <Knob
            id="pitch-b-knob"
            value={(mixerState.channel2.pitch || 0) + 50} // Convert -50/+50 to 0-100 range
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel2', 'pitch', value - 50)} // Convert back to -50/+50
            audioManager={audioManager}
            channel="B"
            controlType="pitch"
          />
        </DraggableWidget>

        {/* Crossfader - Horizontal Slider */}
        <DraggableWidget
          id="crossfader"
          title="CROSSFADER"
          x={mixerLayout['crossfader']?.x ?? 150}
          y={mixerLayout['crossfader']?.y ?? 260}
          width={mixerLayout['crossfader']?.width ?? 220}
          height={mixerLayout['crossfader']?.height ?? 100}
          className="mixer-sub-widget"
          minSize={{ width: 200, height: 90 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'crossfader': updates })}
        >
          <HorizontalSlider
            id="crossfader-slider"
            value={mixerState.crossfader.position}
            min={0}
            max={100}
            onChange={(value) => handleCrossfaderChange(value, mixerState.crossfader.curve)}
            audioManager={audioManager}
          />
        </DraggableWidget>

        {/* Filter A - Low-pass */}
        <DraggableWidget
          id="filter-a"
          title="FILTER A"
          x={mixerLayout['filter-a']?.x ?? 20}
          y={mixerLayout['filter-a']?.y ?? 260}
          width={mixerLayout['filter-a']?.width ?? 85}
          height={mixerLayout['filter-a']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'filter-a': updates })}
        >
          <Knob
            id="filter-a-knob"
            value={mixerState.channel1.filter.frequency || 50}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel1', 'filter', { ...mixerState.channel1.filter, frequency: value })}
            audioManager={audioManager}
            channel="A"
            controlType="filter"
          />
        </DraggableWidget>

        {/* Filter B - Low-pass */}
        <DraggableWidget
          id="filter-b"
          title="FILTER B"
          x={mixerLayout['filter-b']?.x ?? 120}
          y={mixerLayout['filter-b']?.y ?? 260}
          width={mixerLayout['filter-b']?.width ?? 85}
          height={mixerLayout['filter-b']?.height ?? 130}
          className="mixer-sub-widget"
          minSize={{ width: 75, height: 120 }}
          onUpdate={(updates) => handleSynchronizedLayoutChange({ 'filter-b': updates })}
        >
          <Knob
            id="filter-b-knob"
            value={mixerState.channel2.filter.frequency || 50}
            min={0}
            max={100}
            onChange={(value) => handleChannelChange('channel2', 'filter', { ...mixerState.channel2.filter, frequency: value })}
            audioManager={audioManager}
            channel="B"
            controlType="filter"
          />
        </DraggableWidget>

        {/* Master Volume - Vertical Slider */}
        <DraggableWidget
          id="master-volume"
          title="MASTER"
          x={mixerLayout['master-volume']?.x ?? 620}
          y={mixerLayout['master-volume']?.y ?? 20}
          width={mixerLayout['master-volume']?.width ?? 80}
          height={mixerLayout['master-volume']?.height ?? 150}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 130 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'master-volume': updates })}
        >
          <VerticalSlider
            id="master-volume-slider"
            value={mixerState.master.volume}
            min={0}
            max={100}
            onChange={(value) => handleMasterChange('volume', value)}
            audioManager={audioManager}
            channel="M"
          />
        </DraggableWidget>

        {/* Headphone Cue Mix - Horizontal Slider */}
        <DraggableWidget
          id="cue-mix"
          title="CUE MIX"
          x={mixerLayout['cue-mix']?.x ?? 500}
          y={mixerLayout['cue-mix']?.y ?? 140}
          width={mixerLayout['cue-mix']?.width ?? 100}
          height={mixerLayout['cue-mix']?.height ?? 90}
          className="mixer-sub-widget"
          minSize={{ width: 90, height: 80 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'cue-mix': updates })}
        >
          <HorizontalSlider
            id="cue-mix-slider"
            value={mixerState.headphones.mix}
            min={0}
            max={100}
            onChange={(value) => handleHeadphoneChange('mix', value)}
            audioManager={audioManager}
          />
        </DraggableWidget>

        {/* Headphone Volume - Vertical Slider */}
        <DraggableWidget
          id="headphone-volume"
          title="PHONES"
          x={mixerLayout['headphone-volume']?.x ?? 720}
          y={mixerLayout['headphone-volume']?.y ?? 20}
          width={mixerLayout['headphone-volume']?.width ?? 80}
          height={mixerLayout['headphone-volume']?.height ?? 150}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 130 }}
          onUpdate={(updates) => onMixerLayoutChange({ 'headphone-volume': updates })}
        >
          <VerticalSlider
            id="headphone-volume-slider"
            value={mixerState.headphones.volume}
            min={0}
            max={100}
            onChange={(value) => handleHeadphoneChange('volume', value)}
            audioManager={audioManager}
            channel="HP"
          />
        </DraggableWidget>
      </div>

      {/* Recording Control Widget */}
      <div className="mixer-recording-widget">
        <RecordingControl audioManager={audioManager} />
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