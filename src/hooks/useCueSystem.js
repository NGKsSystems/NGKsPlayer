import { useState, useCallback } from 'react';

/**
 * Custom hook for managing DJ cue system state and controls
 */
export function useCueSystem(audioGraph) {
  // Cue state for each deck
  const [cueA, setCueA] = useState(false);
  const [cueB, setCueB] = useState(false);
  
  // Cue mix levels (main mix vs pure cue in headphones)
  const [cueMixMain, setCueMixMain] = useState(0.3);
  const [cueMixCue, setCueMixCue] = useState(1.0);

  // Toggle cue for a specific deck
  const toggleCue = useCallback((deck) => {
    if (!audioGraph) return;
    
    if (deck === 'A') {
      const newCueA = !cueA;
      setCueA(newCueA);
      audioGraph.setCue('A', newCueA);
    } else if (deck === 'B') {
      const newCueB = !cueB;
      setCueB(newCueB);
      audioGraph.setCue('B', newCueB);
    }
  }, [audioGraph, cueA, cueB]);

  // Update cue mix levels
  const updateCueMix = useCallback((mainLevel, cueLevel) => {
    if (!audioGraph) return;
    
    setCueMixMain(mainLevel);
    setCueMixCue(cueLevel);
    audioGraph.setCueMix(mainLevel, cueLevel);
  }, [audioGraph]);

  // Get current cue state
  const getCueState = useCallback(() => ({
    cueA,
    cueB,
    cueMixMain,
    cueMixCue,
    anyCueActive: cueA || cueB
  }), [cueA, cueB, cueMixMain, cueMixCue]);

  return {
    // State
    cueA,
    cueB,
    cueMixMain,
    cueMixCue,
    anyCueActive: cueA || cueB,
    
    // Actions
    toggleCue,
    updateCueMix,
    getCueState,
    
    // Direct setters (for external control)
    setCueA,
    setCueB,
    setCueMixMain,
    setCueMixCue
  };
}
