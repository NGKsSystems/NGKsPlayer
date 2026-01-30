import React, { useState, useCallback, useContext, createContext, useEffect, useMemo, useRef } from 'react';
import DraggableWidget from './DraggableWidget.minimal';
import { useMixerLayout } from '../hooks/useMixerLayout';

// Settings Context for visibility toggles
const SettingsContext = createContext();

const SETTINGS_STORAGE_KEY = 'djsimple-control-settings';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return {
      // Deck Controls
      transport: true,
      navigation: true,
      pitchFader: true,
      fineTune: true,
      jogWheel: true,
      
      // Mixer Controls (original)
      crossfader: true,
      volumeLeft: true,
      volumeRight: true,
      gainA: true,
      gainB: true,
      reverbA: true,
      reverbB: true,
      filterA: true,
      filterB: true,
      micInput: true,
      micGain: true,
      masterVol: true,
      cueVol: true,
      
      // Mixer Controls (moved from decks)
      pitchBend: true,
      loopControls: true,
      cuePoints: true,
      syncControls: true,
      deckSettings: true,
      
      // Other Widgets
      visualizersA: true,
      visualizersB: true,
      eqA: true,
      eqB: true,
      libraryA: true,
      libraryB: true,
      snippets: true
    };
  });

  const saveSettings = useCallback((newSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, []);

  const toggleSetting = useCallback((key) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: !prev[key]
      };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  const resetSettings = useCallback(() => {
    const defaultSettings = {
      transport: true,
      navigation: true,
      pitchFader: true,
      fineTune: true,
      jogWheel: true,
      crossfader: true,
      volumeLeft: true,
      volumeRight: true,
      gainA: true,
      gainB: true,
      reverbA: true,
      reverbB: true,
      filterA: true,
      filterB: true,
      micInput: true,
      micGain: true,
      masterVol: true,
      cueVol: true,
      pitchBend: true,
      loopControls: true,
      cuePoints: true,
      syncControls: true,
      deckSettings: true,
      visualizersA: true,
      visualizersB: true,
      eqA: true,
      eqB: true,
      libraryA: true,
      libraryB: true,
      snippets: true
    };
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  }, [saveSettings]);

  return (
    <SettingsContext.Provider value={{ settings, toggleSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

// Simplified MixerWidget with proper controlled positioning
export const MixerWidget = ({ deckAudioRefs }) => {
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
    filterB: 50
  });

  // Audio control handlers
  const handleGainChange = (deck, value) => {
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
  };

  const handleVolumeChange = (deck, value) => {
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
  };

  const handleCrossfaderChange = (value) => {
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
  };

  // Helper function to create controlled draggable widgets
  const createControlledWidget = (widgetId, title, children, options = {}) => {
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
  };

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
              <div className="crossfader-control">
                <label>A ← Crossfader → B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={audioControls.crossfader}
                  onChange={(e) => handleCrossfaderChange(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="crossfader-slider"
                />
                <div className="crossfader-value">{audioControls.crossfader}%</div>
              </div>,
              { minSize: { width: 120, height: 40 } }
            )}

            {/* Gain A Control */}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainA}%</div>
              </div>
            )}

            {/* Volume Left Control */}
            {createControlledWidget(
              "volumeLeft",
              "Volume A",
              <div className="volume-control vertical">
                <label>Volume A</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeA}
                  onChange={(e) => handleVolumeChange('A', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeA}%</div>
              </div>,
              { className: "volume-widget" }
            )}

            {/* Volume Right Control */}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeB}%</div>
              </div>,
              { className: "volume-widget" }
            )}

            {/* Gain B Control */}
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
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainB}%</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Global debug functions for new mixer layout system
window.debugMixerLayout = () => {
  console.log('🔍 Mixer Layout Debug Info');
  const saved = localStorage.getItem('mixer-layout-v1');
  if (saved) {
    console.log('📋 Saved Layout:', JSON.parse(saved));
  } else {
    console.log('❌ No saved layout found');
  }
};

window.resetMixerLayout = () => {
  localStorage.removeItem('mixer-layout-v1');
  console.log('🔄 Mixer layout reset - refresh page to see default positions');
  window.location.reload();
};

// Placeholder components for missing exports
export const VisualizersWidgetA = () => <div>Visualizers A</div>;
export const VisualizersWidgetB = () => <div>Visualizers B</div>;