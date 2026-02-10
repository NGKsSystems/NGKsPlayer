/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useProjectState.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useRef, useCallback } from 'react';

/**
 * Project State Management Hook
 * 
 * Provides:
 * - Undo/Redo functionality
 * - Project state persistence
 * - History management
 */
export const useProjectState = () => {
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const historyRef = useRef([]);
  const maxHistorySize = 50; // Limit history to prevent memory issues

  // Save current state to history
  const saveState = useCallback((state) => {
    const history = historyRef.current;
    
    // Remove any future history if we're not at the latest state
    if (currentStateIndex < history.length - 1) {
      history.splice(currentStateIndex + 1);
    }
    
    // Add new state
    history.push({
      ...state,
      timestamp: Date.now()
    });
    
    // Limit history size
    if (history.length > maxHistorySize) {
      history.shift();
    } else {
      setCurrentStateIndex(prev => prev + 1);
    }
    
    historyRef.current = history;
  }, [currentStateIndex]);

  // Undo to previous state
  const undo = useCallback(() => {
    if (currentStateIndex > 0) {
      setCurrentStateIndex(prev => prev - 1);
      return historyRef.current[currentStateIndex - 1];
    }
    return null;
  }, [currentStateIndex]);

  // Redo to next state
  const redo = useCallback(() => {
    if (currentStateIndex < historyRef.current.length - 1) {
      setCurrentStateIndex(prev => prev + 1);
      return historyRef.current[currentStateIndex + 1];
    }
    return null;
  }, [currentStateIndex]);

  // Get current state
  const getCurrentState = useCallback(() => {
    if (currentStateIndex >= 0 && currentStateIndex < historyRef.current.length) {
      return historyRef.current[currentStateIndex];
    }
    return null;
  }, [currentStateIndex]);

  // Check if undo/redo is available
  const canUndo = currentStateIndex > 0;
  const canRedo = currentStateIndex < historyRef.current.length - 1;

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    setCurrentStateIndex(-1);
  }, []);

  // Get history info
  const getHistoryInfo = useCallback(() => {
    return {
      current: currentStateIndex,
      total: historyRef.current.length,
      canUndo,
      canRedo
    };
  }, [currentStateIndex, canUndo, canRedo]);

  return {
    saveState,
    undo,
    redo,
    getCurrentState,
    clearHistory,
    getHistoryInfo,
    canUndo,
    canRedo
  };
};
