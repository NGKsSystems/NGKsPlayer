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

// Import all modular components
import MixerWidgetComponent from './Mixer/MixerWidget';
import { PlayerAWidget } from './PlayerA';
import { PlayerBWidget } from './PlayerB';
import { EQAWidget } from './EQA';
import { EQBWidget } from './EQB';
import { LibraryAWidget } from './LibraryA';
import { LibraryBWidget } from './LibraryB';
import { SnippetsWidget } from './Snippets';
import { SettingsWidget } from './Settings';

// Re-export components for backward compatibility
export const MixerWidget = MixerWidgetComponent;
export { PlayerAWidget };
export { PlayerBWidget };
export { EQAWidget };
export { EQBWidget };
export { LibraryAWidget };
export { LibraryBWidget };
export { SnippetsWidget };
export { SettingsWidget };

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