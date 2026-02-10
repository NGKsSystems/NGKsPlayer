/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FXMIDILearn.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Radio, X, Check, Trash2 } from 'lucide-react';
import './FXMIDILearn.css';

const FXMIDILearn = ({ effectType, parameters, onMIDIMapping, color }) => {
  const [isLearning, setIsLearning] = useState(false);
  const [learningParam, setLearningParam] = useState(null);
  const [mappings, setMappings] = useState({});
  const [lastMIDIMessage, setLastMIDIMessage] = useState(null);
  const [midiAccess, setMidiAccess] = useState(null);

  // Initialize MIDI access
  useEffect(() => {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: false })
        .then((access) => {
          setMidiAccess(access);
          console.log('MIDI Access granted');
        })
        .catch((err) => {
          console.error('MIDI Access denied:', err);
        });
    }
  }, []);

  // MIDI message handler
  const handleMIDIMessage = useCallback((event) => {
    const [status, data1, data2] = event.data;
    const messageType = status & 0xf0;
    const channel = (status & 0x0f) + 1;

    // Handle Control Change messages (0xB0)
    if (messageType === 0xb0) {
      const controlNumber = data1;
      const value = data2;

      setLastMIDIMessage({
        type: 'CC',
        channel,
        control: controlNumber,
        value,
        timestamp: Date.now()
      });

      // If learning, map this control to the parameter
      if (isLearning && learningParam) {
        const mapping = {
          channel,
          control: controlNumber,
          min: 0,
          max: 127
        };
        
        setMappings(prev => ({
          ...prev,
          [learningParam]: mapping
        }));

        // Save to localStorage
        const storageKey = `fx_midi_mappings_${effectType}`;
        const allMappings = JSON.parse(localStorage.getItem(storageKey) || '{}');
        allMappings[learningParam] = mapping;
        localStorage.setItem(storageKey, JSON.stringify(allMappings));

        // Notify parent component
        onMIDIMapping?.(learningParam, mapping);

        // Exit learning mode
        setIsLearning(false);
        setLearningParam(null);
      } 
      // If mapped, update parameter value
      else {
        Object.entries(mappings).forEach(([param, mapping]) => {
          if (mapping.channel === channel && mapping.control === controlNumber) {
            // Convert MIDI value (0-127) to parameter range (0-1)
            const normalizedValue = value / 127;
            // Trigger parameter change via parent
            onMIDIMapping?.(param, mapping, normalizedValue);
          }
        });
      }
    }
  }, [isLearning, learningParam, mappings, effectType, onMIDIMapping]);

  // Attach MIDI listeners
  useEffect(() => {
    if (midiAccess) {
      const inputs = midiAccess.inputs.values();
      for (let input of inputs) {
        input.onmidimessage = handleMIDIMessage;
      }

      return () => {
        const inputs = midiAccess.inputs.values();
        for (let input of inputs) {
          input.onmidimessage = null;
        }
      };
    }
  }, [midiAccess, handleMIDIMessage]);

  // Load saved mappings
  useEffect(() => {
    const storageKey = `fx_midi_mappings_${effectType}`;
    const savedMappings = JSON.parse(localStorage.getItem(storageKey) || '{}');
    setMappings(savedMappings);
  }, [effectType]);

  // Start learning for a parameter
  const startLearning = (paramName) => {
    setIsLearning(true);
    setLearningParam(paramName);
  };

  // Cancel learning
  const cancelLearning = () => {
    setIsLearning(false);
    setLearningParam(null);
  };

  // Clear mapping for a parameter
  const clearMapping = (paramName) => {
    const newMappings = { ...mappings };
    delete newMappings[paramName];
    setMappings(newMappings);

    // Update localStorage
    const storageKey = `fx_midi_mappings_${effectType}`;
    localStorage.setItem(storageKey, JSON.stringify(newMappings));

    // Notify parent
    onMIDIMapping?.(paramName, null);
  };

  // Clear all mappings
  const clearAllMappings = () => {
    setMappings({});
    const storageKey = `fx_midi_mappings_${effectType}`;
    localStorage.removeItem(storageKey);
  };

  const parameterNames = ['mix', 'param1', 'param2'];

  if (!midiAccess) {
    return (
      <div className="fx-midi-learn">
        <div className="midi-not-available">
          <Radio className="w-4 h-4" />
          <span>MIDI not available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fx-midi-learn">
      <div className="midi-header">
        <Radio className="w-4 h-4" style={{ color }} />
        <span>MIDI Learn</span>
        {Object.keys(mappings).length > 0 && (
          <button onClick={clearAllMappings} className="midi-clear-all" title="Clear all mappings">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="midi-parameters">
        {parameterNames.map((param) => {
          const isMapped = mappings[param];
          const isCurrentlyLearning = isLearning && learningParam === param;

          return (
            <div key={param} className="midi-param-row">
              <div className="midi-param-name">
                {param === 'mix' ? 'MIX' : param.toUpperCase()}
              </div>
              
              {isMapped ? (
                <div className="midi-mapping-display">
                  <span>CH{isMapped.channel} CC{isMapped.control}</span>
                  <button onClick={() => clearMapping(param)} className="midi-clear-btn">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : isCurrentlyLearning ? (
                <div className="midi-learning-display">
                  <span className="midi-learning-text">Waiting...</span>
                  <button onClick={cancelLearning} className="midi-cancel-btn">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => startLearning(param)} 
                  className="midi-learn-btn"
                  style={{ borderColor: color }}
                >
                  Learn
                </button>
              )}
            </div>
          );
        })}
      </div>

      {lastMIDIMessage && (
        <div className="midi-activity">
          <div className="midi-activity-indicator" style={{ backgroundColor: color }}>
            <span>
              CH{lastMIDIMessage.channel} CC{lastMIDIMessage.control}: {lastMIDIMessage.value}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FXMIDILearn;

