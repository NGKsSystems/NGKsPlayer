import { useRef, useEffect } from 'react';
import { pickNextIndex, setCachedNext } from '../utils/randomizer';

/**
 * Custom hook to manage audio element and its event listeners
 */
export function useAudioRef({
  playMode,
  tracks,
  currentIndexRef,
  cachedNextIndexRef,
  setIsPlaying,
  setDuration,
  setPosition,
  onNextTrack,
  showToast
}) {
  const audioRef = useRef(new Audio());

  useEffect(() => {
    const audio = audioRef.current;
    
    const handleEnded = () => {
      // Check if we're in 'stop' mode - if so, just stop playback
      if (playMode === 'stop') {
        console.log('[NowPlayingSimple] Stop mode - not advancing to next track');
        setIsPlaying(false);
        return;
      }
      onNextTrack();
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };
    
    const handleTimeUpdate = () => {
      setPosition(audio.currentTime);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };
    
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, [playMode, onNextTrack, setIsPlaying, setDuration, setPosition]);

  return audioRef;
}
