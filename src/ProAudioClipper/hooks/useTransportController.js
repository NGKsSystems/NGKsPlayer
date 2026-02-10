/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useTransportController.js
 * Purpose: Transport behavior (play/pause, stop, seek) extracted from ProAudioClipper
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useCallback } from 'react';

export function useTransportController({
  multiTrackEngine,
  trackManager,
  isPlaying,
  setIsPlaying,
  currentTime,
  setCurrentTime,
  playbackRate
}) {
  // Playback controls for multi-track
  const togglePlayback = useCallback(() => {
    if (trackManager.tracks.length === 0) return;
    
    if (isPlaying) {
      multiTrackEngine.pauseTracks();
      setIsPlaying(false);
    } else {
      multiTrackEngine.playTracks(trackManager.tracks, currentTime, playbackRate);
      setIsPlaying(true);
    }
  }, [trackManager.tracks, isPlaying, currentTime, playbackRate, multiTrackEngine]);

  const stop = useCallback(() => {
    multiTrackEngine.stopTracks();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [multiTrackEngine]);

  const seek = useCallback((time) => {
    multiTrackEngine.seekTracks(trackManager.tracks, time);
    if (!isPlaying) {
      setCurrentTime(time);
    }
  }, [multiTrackEngine, trackManager.tracks, isPlaying]);

  return {
    togglePlayback,
    stop,
    seek
  };
}
