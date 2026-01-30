import React, { useState, useCallback, useEffect } from "react";
import DraggableWidget from "../../DraggableWidget";
import FrequencyBands from "../FrequencyBands";
import EQControls from "../EQControls";
import EQPresets from "../EQPresets";

const EQWidget = ({ 
  deck = 'A',
  audioContext = null,
  sourceNode = null,
  destinationNode = null,
  onEQChange = () => {}
}) => {
  const [eqState, setEQState] = useState(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(`eq-${deck}-state`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silent error handling
    }
    
    // Default state
    return {
      isEnabled: true,
      eqValues: new Array(10).fill(0), // 10-band EQ, all at 0dB
      currentPreset: null,
      customPresets: {}
    };
  });

  const [eqControls, setEQControls] = useState(() => {
    // Try to load layout from localStorage
    try {
      const saved = localStorage.getItem(`eq-${deck}-controls`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silent error handling
    }
    
    // Default layout
    return {
      frequencyBands: { x: 10, y: 10, width: 400, height: 280, minimized: false },
      eqControls: { x: 420, y: 10, width: 200, height: 180, minimized: false },
      eqPresets: { x: 420, y: 200, width: 200, height: 250, minimized: false }
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`eq-${deck}-state`, JSON.stringify(eqState));
    } catch (error) {
      console.warn('Failed to save EQ state to localStorage:', error);
    }
  }, [eqState, deck]);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`eq-${deck}-controls`, JSON.stringify(eqControls));
    } catch (error) {
      console.warn('Failed to save EQ controls to localStorage:', error);
    }
  }, [eqControls, deck]);

  const handleEQChange = useCallback((newValues) => {
    setEQState(prev => ({
      ...prev,
      eqValues: newValues,
      currentPreset: null // Clear preset when manually adjusting
    }));
    
    // Notify parent component
    onEQChange(newValues);
  }, [onEQChange]);

  const handleToggle = useCallback((enabled) => {
    setEQState(prev => ({
      ...prev,
      isEnabled: enabled
    }));
  }, []);

  const handleReset = useCallback(() => {
    const resetValues = new Array(10).fill(0);
    setEQState(prev => ({
      ...prev,
      eqValues: resetValues,
      currentPreset: 'flat'
    }));
    onEQChange(resetValues);
  }, [onEQChange]);

  const handlePresetLoad = useCallback((presetKey, values) => {
    setEQState(prev => ({
      ...prev,
      eqValues: [...values],
      currentPreset: presetKey
    }));
    onEQChange(values);
  }, [onEQChange]);

  const handlePresetSave = useCallback((name, values) => {
    setEQState(prev => ({
      ...prev,
      customPresets: {
        ...prev.customPresets,
        [name]: {
          name,
          values: [...values],
          category: 'custom',
          description: 'User saved preset'
        }
      }
    }));
  }, []);

  const handleControlUpdate = useCallback((controlId, updates) => {
    setEQControls(prev => ({
      ...prev,
      [controlId]: { ...prev[controlId], ...updates }
    }));
  }, []);

  return (
    <div className={`eq-widget eq-${deck.toLowerCase()}`}>
      <div className="eq-workspace">
        {/* Frequency Bands */}
        <DraggableWidget
          id={`eq-freq-${deck}`}
          title={`EQ ${deck} - Frequency Bands`}
          initialPosition={{ x: 10, y: 10 }}
          initialSize={{ width: 500, height: 320 }}
          onUpdate={(updates) => handleControlUpdate('frequencyBands', updates)}
          className="eq-sub-widget"
        >
          <FrequencyBands
            eqValues={eqState.eqValues}
            onEQChange={handleEQChange}
            audioContext={audioContext}
            sourceNode={sourceNode}
            destinationNode={destinationNode}
            isEnabled={eqState.isEnabled}
          />
        </DraggableWidget>

        {/* EQ Controls */}
        <DraggableWidget
          id={`eq-controls-${deck}`}
          title={`EQ ${deck} - Controls`}
          initialPosition={{ x: 520, y: 10 }}
          initialSize={{ width: 220, height: 200 }}
          onUpdate={(updates) => handleControlUpdate('eqControls', updates)}
          className="eq-sub-widget"
        >
          <EQControls
            isEnabled={eqState.isEnabled}
            onToggle={handleToggle}
            onReset={handleReset}
            onPresetLoad={handlePresetLoad}
            eqValues={eqState.eqValues}
            currentPreset={eqState.currentPreset}
          />
        </DraggableWidget>

        {/* EQ Presets */}
        <DraggableWidget
          id={`eq-presets-${deck}`}
          title={`EQ ${deck} - Presets`}
          initialPosition={{ x: 520, y: 220 }}
          initialSize={{ width: 220, height: 300 }}
          onUpdate={(updates) => handleControlUpdate('eqPresets', updates)}
          className="eq-sub-widget"
        >
          <EQPresets
            currentPreset={eqState.currentPreset}
            onPresetLoad={handlePresetLoad}
            onPresetSave={handlePresetSave}
            eqValues={eqState.eqValues}
            customPresets={eqState.customPresets}
          />
        </DraggableWidget>
      </div>
    </div>
  );
};

export default EQWidget;