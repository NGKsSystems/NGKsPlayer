/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useUndoRedoController.js
 * Purpose: Undo/redo controller layer extracted from ProAudioClipper
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useUndoRedo } from './useUndoRedo';

export function useUndoRedoController({ trackManager }) {
  // Professional Undo/Redo System
  const undoRedo = useUndoRedo(trackManager);
  const { 
    executeCommand, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    nextUndoDescription, 
    nextRedoDescription,
    CommandFactory 
  } = undoRedo;

  return {
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    nextUndoDescription,
    nextRedoDescription,
    CommandFactory
  };
}
