import React, { useState, useCallback } from 'react';
import DraggableWidget from '../DraggableWidget';
import { useMixerLayout } from '../../hooks/useMixerLayout';
import Crossfader from './Crossfader';
import GainControls from './GainControls';
import Effects from './Effects';
import MasterSection from './MasterSection';
// New Professional DJ Components
import DeckSettings from './DeckSettings';
import SyncTempo from './SyncTempo';
import LoopControls from './LoopControls';
import CuePoints from './CuePoints';
import PitchControls from './PitchControls';
import EnhancedMasterSection from './EnhancedMasterSection';
import EnhancedMicSection from './EnhancedMicSection';

const MixerWidget = ({ deckAudioRefs }) => {
  // Use new mixer layout system instead of competing storage
  const mixerLayout = useMixerLayout();

  // Audio control state
  const [audioControls, setAudioControls] = useState({
    gainA: 50,
    gainB: 50,
    crossfader: 50,
    volumeA: 50,
    volumeB: 50,
    cueA: false,
    cueB: false,
    reverbA: 0,
    reverbB: 0,
    filterA: 50,
    filterB: 50,
    masterVolume: 80,
    cueVolume: 60,
    micGain: 25,
    // New professional DJ controls
    attackA: false,
    attackB: false,
    quantA: false,
    quantB: false,
    activeDeck: 'A',
    syncA: false,
    syncB: false,
    bpmA: 120,
    bpmB: 120,
    masterTempo: 0,
    loopA: false,
    loopB: false,
    loopLengthA: 4,
    loopLengthB: 4,
    autoLoopA: false,
    autoLoopB: false,
    pitchA: 0,
    pitchB: 0,
    pitchRangeA: 8,
    pitchRangeB: 8,
    keyLock: false,
    boothVolume: 60,
    headphoneVolume: 70,
    masterMuted: false,
    cueMixBalance: 0,
    micVolume: 60,
    micMuted: false,
    micTalkover: false,
    micEQ: { high: 0, mid: 0, low: 0 },
    micEffects: { reverb: 0, echo: 0 },
    cuePoints: {}
  });

  // Audio control handlers
  const handleGainChange = useCallback((deck, value) => {
    const gain = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`gain${deck}`]: gain
    }));

    // Apply gain to actual audio context
    if (deckAudioRefs && deckAudioRefs.current[deck] && deckAudioRefs.current[deck].gainNode) {
      const gainValue = gain / 100; // Convert percentage to 0-1 range
      deckAudioRefs.current[deck].gainNode.gain.setValueAtTime(
        gainValue, 
        deckAudioRefs.current[deck].audioContext.currentTime
      );
    }
  }, [deckAudioRefs]);

  const handleVolumeChange = useCallback((deck, value) => {
    const volume = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`volume${deck}`]: volume
    }));

    // Apply volume to actual audio context
    if (deckAudioRefs && deckAudioRefs.current[deck] && deckAudioRefs.current[deck].volumeNode) {
      const volumeValue = volume / 100; // Convert percentage to 0-1 range
      deckAudioRefs.current[deck].volumeNode.gain.setValueAtTime(
        volumeValue, 
        deckAudioRefs.current[deck].audioContext.currentTime
      );
    }
  }, [deckAudioRefs]);

  const handleCrossfaderChange = useCallback((value) => {
    const crossfade = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      crossfader: crossfade
    }));

    // Apply crossfader to actual audio context
    if (deckAudioRefs && deckAudioRefs.current) {
      const crossfadeValue = crossfade / 100; // Convert to 0-1 range
      
      // A side (left): full volume at 0, fade to 0 at 100
      if (deckAudioRefs.current.A && deckAudioRefs.current.A.crossfaderNode) {
        const aVolume = 1 - crossfadeValue;
        deckAudioRefs.current.A.crossfaderNode.gain.setValueAtTime(
          aVolume, 
          deckAudioRefs.current.A.audioContext.currentTime
        );
      }
      
      // B side (right): 0 volume at 0, fade to full at 100
      if (deckAudioRefs.current.B && deckAudioRefs.current.B.crossfaderNode) {
        const bVolume = crossfadeValue;
        deckAudioRefs.current.B.crossfaderNode.gain.setValueAtTime(
          bVolume, 
          deckAudioRefs.current.B.audioContext.currentTime
        );
      }
    }
  }, [deckAudioRefs]);

  const handleReverbChange = useCallback((deck, value) => {
    const reverbValue = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`reverb${deck}`]: reverbValue
    }));
    // TODO: Apply reverb effect to audio
  }, []);

  const handleFilterChange = useCallback((deck, value) => {
    const filterValue = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`filter${deck}`]: filterValue
    }));
    // TODO: Apply filter effect to audio
  }, []);

  const handleMasterChange = useCallback((value) => {
    setAudioControls(prev => ({
      ...prev,
      masterVolume: parseFloat(value)
    }));
    // TODO: Apply master volume
  }, []);

  const handleCueChange = useCallback((value) => {
    setAudioControls(prev => ({
      ...prev,
      cueVolume: parseFloat(value)
    }));
    // TODO: Apply cue volume
  }, []);

  const handleMicChange = useCallback((value) => {
    setAudioControls(prev => ({
      ...prev,
      micGain: parseFloat(value)
    }));
    // TODO: Apply mic gain
  }, []);

  // New Professional DJ Control Handlers
  const handleDeckSettingsChange = useCallback((deck, setting, value) => {
    setAudioControls(prev => ({
      ...prev,
      [`${setting}${deck}`]: value
    }));
    // TODO: Apply deck settings to audio engine
  }, []);

  const handleActiveDeckChange = useCallback((deck) => {
    setAudioControls(prev => ({
      ...prev,
      activeDeck: deck
    }));
  }, []);

  const handleSyncChange = useCallback((deck, synced) => {
    setAudioControls(prev => ({
      ...prev,
      [`sync${deck}`]: synced
    }));
    // TODO: Apply sync to audio engine
  }, []);

  const handleBPMChange = useCallback((deck, bpm) => {
    setAudioControls(prev => ({
      ...prev,
      [`bpm${deck}`]: bpm
    }));
    // TODO: Apply BPM change to audio engine
  }, []);

  const handleMasterTempoChange = useCallback((tempo) => {
    setAudioControls(prev => ({
      ...prev,
      masterTempo: tempo
    }));
    // TODO: Apply master tempo to audio engine
  }, []);

  const handleLoopChange = useCallback((deck, setting, value) => {
    setAudioControls(prev => ({
      ...prev,
      [`${setting}${deck}`]: value
    }));
    // TODO: Apply loop settings to audio engine
  }, []);

  const handlePitchChange = useCallback((deck, pitch) => {
    setAudioControls(prev => ({
      ...prev,
      [`pitch${deck}`]: pitch
    }));
    // TODO: Apply pitch change to audio engine
  }, []);

  const handlePitchReset = useCallback((deck) => {
    setAudioControls(prev => ({
      ...prev,
      [`pitch${deck}`]: 0
    }));
    // TODO: Reset pitch in audio engine
  }, []);

  const handlePitchRangeChange = useCallback((deck, range) => {
    setAudioControls(prev => ({
      ...prev,
      [`pitchRange${deck}`]: range
    }));
  }, []);

  const handleCuePointAction = useCallback((action, deck, cueNumber, data) => {
    switch (action) {
      case 'set':
        setAudioControls(prev => ({
          ...prev,
          cuePoints: {
            ...prev.cuePoints,
            [`${deck}-${cueNumber}`]: {
              position: Date.now(), // This would be actual track position
              timestamp: new Date().toLocaleTimeString(),
              deck: deck
            }
          }
        }));
        break;
      case 'jump':
        // TODO: Jump to cue point in audio engine
        break;
      case 'clear':
        setAudioControls(prev => {
          const newCuePoints = { ...prev.cuePoints };
          delete newCuePoints[`${deck}-${cueNumber}`];
          return { ...prev, cuePoints: newCuePoints };
        });
        break;
    }
  }, []);

  const handleEnhancedMasterChange = useCallback((control, value) => {
    setAudioControls(prev => ({
      ...prev,
      [control]: value
    }));
    // TODO: Apply enhanced master controls to audio engine
  }, []);

  const handleMicControlChange = useCallback((control, value) => {
    setAudioControls(prev => ({
      ...prev,
      [control]: value
    }));
    // TODO: Apply mic controls to audio engine
  }, []);

  const handleMicEQChange = useCallback((band, value) => {
    setAudioControls(prev => ({
      ...prev,
      micEQ: { ...prev.micEQ, [band]: value }
    }));
    // TODO: Apply mic EQ to audio engine
  }, []);

  const handleMicEffectChange = useCallback((effect, value) => {
    setAudioControls(prev => ({
      ...prev,
      micEffects: { ...prev.micEffects, [effect]: value }
    }));
    // TODO: Apply mic effects to audio engine
  }, []);

  // Helper function to create controlled draggable widgets
  const createControlledWidget = useCallback((widgetId, title, children, options = {}) => {
    const position = mixerLayout.getPixelPosition(widgetId);
    if (!position) return null;

    return (
      <DraggableWidget
        key={widgetId}
        id={widgetId}
        title={title}
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        controlled={true}
        onDragEnd={(newPosition) => {
          mixerLayout.updateWidget(widgetId, newPosition);
        }}
        onResizeEnd={(newSize) => {
          const currentPos = mixerLayout.getPixelPosition(widgetId);
          mixerLayout.updateWidget(widgetId, { 
            x: currentPos.x, 
            y: currentPos.y, 
            width: newSize.width, 
            height: newSize.height 
          });
        }}
        className={options.className || "mixer-sub-widget"}
        minSize={options.minSize || { width: 80, height: 60 }}
        {...options}
      >
        {children}
      </DraggableWidget>
    );
  }, [mixerLayout]);

  const stopPropagation = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  return (
    <div className="mixer-content">
      <div 
        className="mixer-workspace"
        ref={mixerLayout.containerRef}
      >
        {/* Only render widgets when container size is known */}
        {!mixerLayout.isReady ? (
          <div className="mixer-loading">
            <p>Initializing mixer layout...</p>
          </div>
        ) : (
          <>
            {/* Crossfader Control */}
            {createControlledWidget(
              "crossfader",
              "Crossfader",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <Crossfader 
                  value={audioControls.crossfader}
                  onChange={handleCrossfaderChange}
                />
              </div>,
              { minSize: { width: 120, height: 80 } }
            )}

            {/* Volume A Control */}
            {createControlledWidget(
              "volumeA",
              "Volume A",
              <div className="volume-control vertical" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeA}
                  onChange={(e) => handleVolumeChange('A', e.target.value)}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeA}%</div>
              </div>,
              { className: "volume-widget", minSize: { width: 80, height: 200 } }
            )}

            {/* Volume B Control */}
            {createControlledWidget(
              "volumeB",
              "Volume B",
              <div className="volume-control vertical" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeB}
                  onChange={(e) => handleVolumeChange('B', e.target.value)}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeB}%</div>
              </div>,
              { className: "volume-widget", minSize: { width: 80, height: 200 } }
            )}

            {/* Gain Controls */}
            {createControlledWidget(
              "gainA",
              "Gain A",
              <div className="gain-control" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <label>Gain A</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainA}
                  onChange={(e) => handleGainChange('A', e.target.value)}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainA}%</div>
              </div>,
              { minSize: { width: 100, height: 80 } }
            )}

            {createControlledWidget(
              "gainB",
              "Gain B", 
              <div className="gain-control" onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <label>Gain B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainB}
                  onChange={(e) => handleGainChange('B', e.target.value)}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainB}%</div>
              </div>,
              { minSize: { width: 100, height: 80 } }
            )}

            {/* Effects Section */}
            {createControlledWidget(
              "effects",
              "Effects",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <Effects 
                  reverbA={audioControls.reverbA}
                  reverbB={audioControls.reverbB}
                  filterA={audioControls.filterA}
                  filterB={audioControls.filterB}
                  onReverbChange={handleReverbChange}
                  onFilterChange={handleFilterChange}
                />
              </div>,
              { minSize: { width: 200, height: 120 } }
            )}

            {/* Master Section */}
            {createControlledWidget(
              "master",
              "Master",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <MasterSection 
                  masterVolume={audioControls.masterVolume}
                  cueVolume={audioControls.cueVolume}
                  micGain={audioControls.micGain}
                  onMasterChange={handleMasterChange}
                  onCueChange={handleCueChange}
                  onMicChange={handleMicChange}
                />
              </div>,
              { minSize: { width: 150, height: 100 } }
            )}

            {/* New Professional DJ Components */}
            
            {/* Deck Settings Component */}
            {createControlledWidget(
              "deckSettings",
              "Deck Settings",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <DeckSettings 
                  attackA={audioControls.attackA}
                  attackB={audioControls.attackB}
                  quantA={audioControls.quantA}
                  quantB={audioControls.quantB}
                  activeDeck={audioControls.activeDeck}
                  onAttackChange={(deck, value) => handleDeckSettingsChange(deck, 'attack', value)}
                  onQuantChange={(deck, value) => handleDeckSettingsChange(deck, 'quant', value)}
                  onActiveDeckChange={handleActiveDeckChange}
                />
              </div>,
              { minSize: { width: 250, height: 120 } }
            )}

            {/* Sync & Tempo Component */}
            {createControlledWidget(
              "syncTempo",
              "Sync & Tempo",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <SyncTempo 
                  syncA={audioControls.syncA}
                  syncB={audioControls.syncB}
                  bpmA={audioControls.bpmA}
                  bpmB={audioControls.bpmB}
                  masterTempo={audioControls.masterTempo}
                  onSyncChange={handleSyncChange}
                  onBPMChange={handleBPMChange}
                  onMasterTempoChange={handleMasterTempoChange}
                />
              </div>,
              { minSize: { width: 280, height: 100 } }
            )}

            {/* Loop Controls Component */}
            {createControlledWidget(
              "loopControls",
              "Loop Controls",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <LoopControls 
                  loopA={audioControls.loopA}
                  loopB={audioControls.loopB}
                  loopLengthA={audioControls.loopLengthA}
                  loopLengthB={audioControls.loopLengthB}
                  autoLoopA={audioControls.autoLoopA}
                  autoLoopB={audioControls.autoLoopB}
                  onLoopToggle={(deck, active) => handleLoopChange(deck, 'loop', active)}
                  onLoopLengthChange={(deck, length) => handleLoopChange(deck, 'loopLength', length)}
                  onAutoLoopToggle={(deck, auto) => handleLoopChange(deck, 'autoLoop', auto)}
                  onLoopExit={(deck) => handleLoopChange(deck, 'loop', false)}
                />
              </div>,
              { minSize: { width: 300, height: 140 } }
            )}

            {/* Cue Points Component */}
            {createControlledWidget(
              "cuePoints",
              "Cue Points",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <CuePoints 
                  activeDeck={audioControls.activeDeck}
                  cuePoints={audioControls.cuePoints}
                  onCueSet={(deck, cueNumber) => handleCuePointAction('set', deck, cueNumber)}
                  onCueJump={(deck, cueNumber, position) => handleCuePointAction('jump', deck, cueNumber, position)}
                  onCueClear={(deck, cueNumber) => handleCuePointAction('clear', deck, cueNumber)}
                />
              </div>,
              { minSize: { width: 280, height: 200 } }
            )}

            {/* Pitch Controls Component */}
            {createControlledWidget(
              "pitchControls",
              "Pitch Controls",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <PitchControls 
                  pitchA={audioControls.pitchA}
                  pitchB={audioControls.pitchB}
                  rangeA={audioControls.pitchRangeA}
                  rangeB={audioControls.pitchRangeB}
                  isKeyLocked={audioControls.keyLock}
                  onPitchChange={handlePitchChange}
                  onPitchReset={handlePitchReset}
                  onRangeChange={handlePitchRangeChange}
                />
              </div>,
              { minSize: { width: 320, height: 280 } }
            )}

            {/* Enhanced Master Section Component */}
            {createControlledWidget(
              "enhancedMaster",
              "Enhanced Master",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <EnhancedMasterSection 
                  masterVolume={audioControls.masterVolume}
                  cueVolume={audioControls.cueVolume}
                  boothVolume={audioControls.boothVolume}
                  headphoneVolume={audioControls.headphoneVolume}
                  isMasterMuted={audioControls.masterMuted}
                  cueMixBalance={audioControls.cueMixBalance}
                  onMasterVolumeChange={(value) => handleEnhancedMasterChange('masterVolume', value)}
                  onCueVolumeChange={(value) => handleEnhancedMasterChange('cueVolume', value)}
                  onBoothVolumeChange={(value) => handleEnhancedMasterChange('boothVolume', value)}
                  onHeadphoneVolumeChange={(value) => handleEnhancedMasterChange('headphoneVolume', value)}
                  onMasterMute={(muted) => handleEnhancedMasterChange('masterMuted', muted)}
                  onCueMix={(balance) => handleEnhancedMasterChange('cueMixBalance', balance)}
                />
              </div>,
              { minSize: { width: 400, height: 300 } }
            )}

            {/* Enhanced Mic Section Component */}
            {createControlledWidget(
              "enhancedMic",
              "Enhanced Microphone",
              <div onMouseDown={stopPropagation} onTouchStart={stopPropagation}>
                <EnhancedMicSection 
                  micGain={audioControls.micGain}
                  micVolume={audioControls.micVolume}
                  isMicMuted={audioControls.micMuted}
                  isTalkoverActive={audioControls.micTalkover}
                  micEQ={audioControls.micEQ}
                  micEffect={audioControls.micEffects}
                  onMicGainChange={(value) => handleMicControlChange('micGain', value)}
                  onMicVolumeChange={(value) => handleMicControlChange('micVolume', value)}
                  onMicMute={(muted) => handleMicControlChange('micMuted', muted)}
                  onMicTalkover={(active) => handleMicControlChange('micTalkover', active)}
                  onMicEQChange={handleMicEQChange}
                  onMicEffectChange={handleMicEffectChange}
                />
              </div>,
              { minSize: { width: 380, height: 320 } }
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MixerWidget;