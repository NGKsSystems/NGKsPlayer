import React, { useState, useCallback } from 'react';
import DraggableWidget from '../DraggableWidget.minimal';
import { useMixerLayout } from '../../hooks/useMixerLayout';
import Crossfader from './Crossfader';
import VolumeControls from './VolumeControls';
import GainControls from './GainControls';
import Effects from './Effects';
import MasterSection from './MasterSection';

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
    micGain: 25
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

  const stopPropagation = useCallback((e) => e.stopPropagation(), []);

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
              <Crossfader 
                value={audioControls.crossfader}
                onChange={handleCrossfaderChange}
                onMouseDown={stopPropagation}
                onTouchStart={stopPropagation}
              />,
              { minSize: { width: 120, height: 80 } }
            )}

            {/* Volume Controls */}
            {createControlledWidget(
              "volumeLeft",
              "Volume A",
              <VolumeControls 
                volumeA={audioControls.volumeA}
                volumeB={audioControls.volumeB}
                onVolumeChange={handleVolumeChange}
                onMouseDown={stopPropagation}
                onTouchStart={stopPropagation}
              />,
              { className: "volume-widget", minSize: { width: 80, height: 200 } }
            )}

            {/* Volume Right Control - separate for individual positioning */}
            {createControlledWidget(
              "volumeRight",
              "Volume B",
              <div className="volume-control vertical">
                <label>Volume B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeB}
                  onChange={(e) => handleVolumeChange('B', e.target.value)}
                  onMouseDown={stopPropagation}
                  onTouchStart={stopPropagation}
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
              <div className="gain-control">
                <label>Gain A</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainA}
                  onChange={(e) => handleGainChange('A', e.target.value)}
                  onMouseDown={stopPropagation}
                  onTouchStart={stopPropagation}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainA}%</div>
              </div>,
              { minSize: { width: 100, height: 80 } }
            )}

            {createControlledWidget(
              "gainB",
              "Gain B", 
              <div className="gain-control">
                <label>Gain B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainB}
                  onChange={(e) => handleGainChange('B', e.target.value)}
                  onMouseDown={stopPropagation}
                  onTouchStart={stopPropagation}
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
              <Effects 
                reverbA={audioControls.reverbA}
                reverbB={audioControls.reverbB}
                filterA={audioControls.filterA}
                filterB={audioControls.filterB}
                onReverbChange={handleReverbChange}
                onFilterChange={handleFilterChange}
              />,
              { minSize: { width: 200, height: 120 } }
            )}

            {/* Master Section */}
            {createControlledWidget(
              "master",
              "Master",
              <MasterSection 
                masterVolume={audioControls.masterVolume}
                cueVolume={audioControls.cueVolume}
                micGain={audioControls.micGain}
                onMasterChange={handleMasterChange}
                onCueChange={handleCueChange}
                onMicChange={handleMicChange}
              />,
              { minSize: { width: 150, height: 100 } }
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MixerWidget;