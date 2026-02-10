/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useBeatPulse.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useRef, useEffect } from 'react';

/**
 * Custom hook to manage beat pulse and visual effects
 */
export function useBeatPulse() {
  const [beatPulse, setBeatPulse] = useState(false);
  const [beatPulseEnabled, setBeatPulseEnabled] = useState(true);
  const [peakRotation, setPeakRotation] = useState(false);
  const [showBeatControls, setShowBeatControls] = useState(false);
  const [beatSpikeThreshold, setBeatSpikeThreshold] = useState(1.4);
  const [beatMinimum, setBeatMinimum] = useState(100);
  const [beatGate, setBeatGate] = useState(250);
  const [beatHistoryLength, setBeatHistoryLength] = useState(60);
  const [debugValues, setDebugValues] = useState({ bass: 0, avgBass: 0, spike: false, min: false, gate: false });
  
  const beatPulseEnabledRef = useRef(true);
  const beatThresholdRef = useRef(1.4);
  const beatMinRef = useRef(100);
  const beatGateRef = useRef(250);
  
  // Sync beatPulseEnabled state to ref
  useEffect(() => {
    beatPulseEnabledRef.current = beatPulseEnabled;
  }, [beatPulseEnabled]);

  // Update refs when sliders change
  useEffect(() => {
    beatThresholdRef.current = beatSpikeThreshold;
    beatMinRef.current = beatMinimum;
    beatGateRef.current = beatGate;
  }, [beatSpikeThreshold, beatMinimum, beatGate]);

  return {
    beatPulse,
    setBeatPulse,
    beatPulseEnabled,
    setBeatPulseEnabled,
    peakRotation,
    setPeakRotation,
    showBeatControls,
    setShowBeatControls,
    beatSpikeThreshold,
    setBeatSpikeThreshold,
    beatMinimum,
    setBeatMinimum,
    beatGate,
    setBeatGate,
    beatHistoryLength,
    setBeatHistoryLength,
    debugValues,
    setDebugValues,
    beatPulseEnabledRef,
    beatThresholdRef,
    beatMinRef,
    beatGateRef
  };
}

