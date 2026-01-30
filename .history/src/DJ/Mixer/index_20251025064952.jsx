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
    microphone: {
      isEnabled: false,
      volume: 50,
      gain: 50,
      reverb: 0
    },
    effects: {
      send1: { level: 0, type: 'reverb' },
      send2: { level: 0, type: 'reverb' }
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

  // Create a unified layout update handler that properly integrates with DJSimple's mixerSubwidgets system
  const handleMixerSubwidgetUpdate = (updates) => {
    console.log('🎛️ Mixer subwidget update called with:', updates);
    
    // If this is a knob widget being resized, apply the same size to ALL knob widgets
    const resizedWidgetId = Object.keys(updates)[0];
    const resizedWidget = updates[resizedWidgetId];
    
    if (KNOB_WIDGET_IDS.includes(resizedWidgetId) && resizedWidget && (resizedWidget.width || resizedWidget.height)) {
      console.log('🎛️ Knob resize detected, synchronizing sizes...');
      // Apply the same width and height to all knob widgets, but PRESERVE individual positions
      const synchronizedUpdates = {};
      
      // First, include the original widget's complete update
      synchronizedUpdates[resizedWidgetId] = resizedWidget;
      
      // Then, for other knobs, ONLY update size while preserving their current positions
      KNOB_WIDGET_IDS.forEach(knobId => {
        if (knobId !== resizedWidgetId) {
          // Get the current position from mixerLayout (this preserves saved positions)
          const currentKnob = mixerLayout[knobId] || {};
          synchronizedUpdates[knobId] = {
            x: currentKnob.x, // Keep current X position
            y: currentKnob.y, // Keep current Y position
            width: resizedWidget.width || currentKnob.width || 85,
            height: resizedWidget.height || currentKnob.height || 130
          };
        }
      });
      
      console.log('🎛️ Sending synchronized knob updates:', synchronizedUpdates);
      onMixerLayoutChange(synchronizedUpdates);
    } else {
      // For all other updates (position changes, single widget updates)
      console.log('🎛️ Sending direct widget update:', updates);
      onMixerLayoutChange(updates);
    }
  };

  return (
    <div className="mixer-container">
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'volume-a': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'volume-b': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'gain-a': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'gain-b': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'reverb-a': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'reverb-b': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'pitch-a': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'pitch-b': updates })}
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
          width={600}
          height={80}
          className="mixer-sub-widget"
          minSize={{ width: 400, height: 70 }}
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'crossfader': updates })}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '10px',
            gap: '15px'
          }}>
            <span style={{ color: '#ff6666', fontWeight: 'bold', fontSize: '14px' }}>A</span>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="50"
              onChange={(e) => handleCrossfaderChange(parseInt(e.target.value), mixerState.crossfader.curve)}
              style={{
                width: '80%',
                height: '15px',
                background: 'linear-gradient(to right, #ff6666 0%, #ffff66 50%, #66ff66 100%)',
                outline: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                appearance: 'none'
              }}
            />
            <span style={{ color: '#66ff66', fontWeight: 'bold', fontSize: '14px' }}>B</span>
          </div>
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'filter-a': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'filter-b': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'master-volume': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'cue-mix': updates })}
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
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'headphone-volume': updates })}
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

        {/* Recording Widget */}
        <DraggableWidget
          id="recording"
          title="RECORDING"
          x={mixerLayout['recording']?.x ?? 820}
          y={mixerLayout['recording']?.y ?? 20}
          width={mixerLayout['recording']?.width ?? 140}
          height={mixerLayout['recording']?.height ?? 150}
          className="mixer-sub-widget"
          minSize={{ width: 130, height: 140 }}
          onUpdate={(updates) => handleMixerSubwidgetUpdate({ 'recording': updates })}
        >
          <RecordingControl audioManager={audioManager} />
        </DraggableWidget>

      </div>
    </div>
  );
};

export default Mixer;