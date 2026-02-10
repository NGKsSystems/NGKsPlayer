/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useTrackController.js
 * Purpose: Track orchestration + FX handlers extracted from ProAudioClipper
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useCallback } from 'react';

export function useTrackController({
  trackManager,
  multiTrackEngine,
  executeCommand,
  CommandFactory,
  fxEngine,
  setDuration,
  setCurrentTime,
  setCurrentAudioFile,
  fileInputRef
}) {
  // Track management functions with undo/redo support
  const handleTrackSelect = useCallback((trackId) => {
    trackManager.setActiveTrackId(trackId);
  }, [trackManager]);

  const handleTrackMute = useCallback((trackId) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    // Create undo command for track property change
    const beforeState = { ...track };
    trackManager.toggleMute(trackId);
    const afterState = { ...trackManager.getTrack(trackId) };
    
    const command = CommandFactory.createStateSnapshotCommand(
      { tracks: [beforeState] },
      { tracks: [afterState] },
      `Toggle mute on ${track.name}`
    );
    
    executeCommand(command);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleTrackSolo = useCallback((trackId) => {
    const beforeState = trackManager.getState();
    trackManager.toggleSolo(trackId);
    const afterState = trackManager.getState();
    
    const command = CommandFactory.createStateSnapshotCommand(
      beforeState,
      afterState,
      `Toggle solo on track`
    );
    
    executeCommand(command);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleTrackVolumeChange = useCallback((trackId, volume) => {
    trackManager.setTrackVolume(trackId, volume);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Volume changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackPanChange = useCallback((trackId, pan) => {
    trackManager.setTrackPan(trackId, pan);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Pan changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackPlaybackRateChange = useCallback((trackId, playbackRate) => {
    trackManager.setTrackPlaybackRate(trackId, playbackRate);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Speed changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackReverseToggle = useCallback((trackId) => {
    trackManager.toggleTrackReverse(trackId);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Reverse changes are not undoable by design (instant toggle)
  }, [trackManager, multiTrackEngine]);

  const handleTrackNameChange = useCallback((trackId, name) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    const command = CommandFactory.createStateSnapshotCommand(
      { track: { ...track } },
      { track: { ...track, name } },
      `Rename track to "${name}"`
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  // FX System Handlers
  const handleFXParameterChange = useCallback((unitId, paramName, value) => {
    if (!fxEngine) return;
    
    console.log(`\u{1F39B}\uFE0F FX Unit ${unitId} - ${paramName}: ${value}`);
    
    try {
      // Map UI parameters to FX engine
      switch (paramName) {
        case 'mix':
          fxEngine.setChainWetLevel(`unit_${unitId}`, value);
          break;
        case 'param1':
        case 'param2':
          // These would map to specific effect parameters
          fxEngine.setEffectParameter(`unit_${unitId}`, paramName, value);
          break;
        default:
          fxEngine.setEffectParameter(`unit_${unitId}`, paramName, value);
      }
    } catch (error) {
      console.error('FX parameter change failed:', error);
    }
  }, [fxEngine]);

  const handleFXToggle = useCallback((unitId, enabled) => {
    if (!fxEngine) return;
    
    console.log(`\u{1F39B}\uFE0F FX Unit ${unitId} ${enabled ? 'enabled' : 'disabled'}`);
    fxEngine.setChainEnabled(unitId, enabled);
  }, [fxEngine]);

  const handleTrackDelete = useCallback((trackId) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    const command = CommandFactory.createTrackDeleteCommand(
      track,
      trackManager.tracks.findIndex(t => t.id === trackId)
    );
    
    executeCommand(command);
    
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleAddTrack = useCallback(() => {
    const newTrack = trackManager.createTrack();
    
    const command = CommandFactory.createTrackCreateCommand(newTrack);
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  // Clear all tracks
  const handleClearAllTracks = useCallback(() => {
    if (trackManager.tracks.length === 0) {
      alert('No tracks to clear');
      return;
    }

    if (confirm(`Delete all ${trackManager.tracks.length} track(s)? This cannot be undone.`)) {
      // Delete all tracks
      trackManager.tracks.forEach(track => {
        trackManager.deleteTrack(track.id);
      });
      
      // Reset duration
      setDuration(0);
      setCurrentTime(0);
      setCurrentAudioFile(null);
    }
  }, [trackManager, setDuration, setCurrentTime]);

  // Function to trigger file input for adding tracks
  const handleAddTrackWithFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  return {
    handleTrackSelect,
    handleTrackMute,
    handleTrackSolo,
    handleTrackVolumeChange,
    handleTrackPanChange,
    handleTrackPlaybackRateChange,
    handleTrackReverseToggle,
    handleTrackNameChange,
    handleTrackDelete,
    handleAddTrack,
    handleClearAllTracks,
    handleAddTrackWithFile,
    handleFXParameterChange,
    handleFXToggle,
  };
}
