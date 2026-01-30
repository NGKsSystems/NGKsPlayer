import { useRef, useCallback, useEffect } from 'react';

/**
 * Audio Engine Hook
 * 
 * Provides professional audio playback capabilities:
 * - High-quality audio decoding
 * - Precise timing and seeking
 * - Variable playback rates
 * - Real-time position updates
 */
export const useAudioEngine = (audioRef) => {
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioBufferRef = useRef(null);
  const playbackStartTimeRef = useRef(0);
  const pausedPositionRef = useRef(0);
  const isPlayingRef = useRef(false);
  const playbackRateRef = useRef(1);
  const onTimeUpdateRef = useRef(null);
  
  // Initialize audio context
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Create gain node for volume control
    gainNodeRef.current = audioContextRef.current.createGain();
    gainNodeRef.current.connect(audioContextRef.current.destination);
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Load audio file
  const loadFile = useCallback(async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBufferRef.current = audioBuffer;
      pausedPositionRef.current = 0;
      
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw new Error('Unsupported audio format or corrupted file');
    }
  }, []);

  // Play audio from specific position
  const play = useCallback((startTime = 0, playbackRate = 1) => {
    if (!audioBufferRef.current || !audioContextRef.current) return;

    // Stop any existing playback
    stop();

    try {
      // Create new source node
      const sourceNode = audioContextRef.current.createBufferSource();
      sourceNode.buffer = audioBufferRef.current;
      sourceNode.playbackRate.value = playbackRate;
      sourceNode.connect(gainNodeRef.current);
      
      sourceNodeRef.current = sourceNode;
      playbackStartTimeRef.current = audioContextRef.current.currentTime;
      pausedPositionRef.current = startTime;
      playbackRateRef.current = playbackRate;
      isPlayingRef.current = true;

      // Start playback
      sourceNode.start(0, startTime);
      
      // Set up time update interval
      const updateInterval = setInterval(() => {
        if (!isPlayingRef.current) {
          clearInterval(updateInterval);
          return;
        }
        
        const currentTime = getCurrentTime();
        if (onTimeUpdateRef.current) {
          onTimeUpdateRef.current(currentTime);
        }
        
        // Check if playback ended
        if (currentTime >= audioBufferRef.current.duration) {
          stop();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(audioBufferRef.current.duration);
          }
        }
      }, 16); // ~60fps updates

      sourceNode.onended = () => {
        isPlayingRef.current = false;
        clearInterval(updateInterval);
      };

    } catch (error) {
      console.error('Failed to start playback:', error);
      isPlayingRef.current = false;
    }
  }, []);

  // Pause playback
  const pause = useCallback(() => {
    if (sourceNodeRef.current && isPlayingRef.current) {
      pausedPositionRef.current = getCurrentTime();
      sourceNodeRef.current.stop();
      sourceNodeRef.current = null;
      isPlayingRef.current = false;
    }
  }, []);

  // Stop playback
  const stop = useCallback(() => {
    // Clear any existing intervals first
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Stop and disconnect source node
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Node may already be stopped
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    isPlayingRef.current = false;
    pausedPositionRef.current = 0;
  }, []);

  // Get current playback time
  const getCurrentTime = useCallback(() => {
    if (!isPlayingRef.current || !audioContextRef.current) {
      return pausedPositionRef.current;
    }
    
    const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * playbackRateRef.current;
    return pausedPositionRef.current + elapsed;
  }, []);

  // Seek to specific time
  const seek = useCallback((time) => {
    const wasPlaying = isPlayingRef.current;
    const currentRate = playbackRateRef.current;
    
    if (wasPlaying) {
      pause();
    }
    
    pausedPositionRef.current = Math.max(0, Math.min(time, audioBufferRef.current?.duration || 0));
    
    if (wasPlaying) {
      play(pausedPositionRef.current, currentRate);
    }
  }, [play, pause]);

  // Set volume
  const setVolume = useCallback((volume) => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Get audio properties
  const getAudioProperties = useCallback(() => {
    if (!audioBufferRef.current) return null;
    
    return {
      duration: audioBufferRef.current.duration,
      sampleRate: audioBufferRef.current.sampleRate,
      numberOfChannels: audioBufferRef.current.numberOfChannels,
      length: audioBufferRef.current.length
    };
  }, []);

  // Set time update callback
  const setOnTimeUpdate = useCallback((callback) => {
    onTimeUpdateRef.current = callback;
  }, []);

  return {
    loadFile,
    play,
    pause,
    stop,
    seek,
    setVolume,
    getCurrentTime,
    getAudioProperties,
    get onTimeUpdate() {
      return onTimeUpdateRef.current;
    },
    set onTimeUpdate(callback) {
      onTimeUpdateRef.current = callback;
    },
    get isPlaying() {
      return isPlayingRef.current;
    },
    get audioBuffer() {
      return audioBufferRef.current;
    }
  };
};