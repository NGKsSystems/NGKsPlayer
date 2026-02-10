/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useCurrentTrack.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { pickNextIndex } from '../utils/randomizer';

/**
 * Custom hook to manage current track state and navigation
 */
export function useCurrentTrack(tracks, playMode) {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [nextTrackInfo, setNextTrackInfo] = useState(null);
  const [cachedNextIndex, setCachedNextIndex] = useState(null);
  const [detectedBPM, setDetectedBPM] = useState(null);
  
  // Synchronous refs for event handlers
  const currentIndexRef = useRef(0);
  const cachedNextIndexRef = useRef(null);

  // Update next track info when dependencies change
  useEffect(() => {
    // In stop mode, never show next track
    if (playMode === 'stop') {
      setNextTrackInfo(null);
      return;
    }
    if (tracks.length > 1) {
      // ONLY display what's in the cache
      if (cachedNextIndexRef.current !== null && cachedNextIndexRef.current !== undefined) {
        const nextTrack = tracks[cachedNextIndexRef.current];
        setNextTrackInfo(nextTrack);
      } else if (playMode === 'inOrder' || playMode === 'repeatAll') {
        // For ordered modes, safe to peek ahead
        const nextIdx = pickNextIndex(playMode, tracks, currentIndexRef.current, { mutate: false });
        const nextTrack = tracks[nextIdx];
        setNextTrackInfo(nextTrack);
      } else {
        setNextTrackInfo(null);
      }
    } else {
      setNextTrackInfo(null);
    }
  }, [currentIndex, playMode, tracks, cachedNextIndex]);

  const updateCurrentTrack = useCallback((track, index) => {
    currentIndexRef.current = index;
    setCurrentTrack(track);
    setCurrentIndex(index);
    setDetectedBPM(track.bpm || null);
  }, []);

  return {
    currentTrack,
    setCurrentTrack,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    position,
    setPosition,
    duration,
    setDuration,
    nextTrackInfo,
    setNextTrackInfo,
    cachedNextIndex,
    setCachedNextIndex,
    detectedBPM,
    setDetectedBPM,
    currentIndexRef,
    cachedNextIndexRef,
    updateCurrentTrack
  };
}

