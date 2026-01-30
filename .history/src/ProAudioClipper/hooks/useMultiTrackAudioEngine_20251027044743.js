import { useRef, useCallback, useEffect } from 'react';

/**
 * Multi-Track Audio Engine Hook
 * 
 * Professional multi-track audio engine with real-time mixing:
 * - Individual track playback and mixing
 * - Master volume and pan controls
 * - Solo/mute functionality
 * - Real-time audio processing
 * - Synchronized playback across all tracks
 */
export const useMultiTrackAudioEngine = () => {
  const audioContextRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const trackNodesRef = useRef(new Map()); // trackId -> { sourceNode, gainNode, panNode }
  const audioBufferCacheRef = useRef(new Map()); // file path -> audioBuffer for caching
  const isPlayingRef = useRef(false);
  const playbackStartTimeRef = useRef(0);
  const pausedPositionRef = useRef(0);
  const playbackRateRef = useRef(1);
  const onTimeUpdateRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const soloTracksRef = useRef(new Set());
  const tracksRef = useRef([]);

  // Initialize audio context and master chain
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Create master gain node
    masterGainNodeRef.current = audioContextRef.current.createGain();
    masterGainNodeRef.current.connect(audioContextRef.current.destination);
    
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Clear audio buffer cache on cleanup
      audioBufferCacheRef.current.clear();
    };
  }, []);

  // Create audio chain for a track
  const createTrackChain = useCallback((trackId, audioBuffer) => {
    if (!audioContextRef.current) return null;

    const sourceNode = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    const panNode = audioContextRef.current.createStereoPanner();

    // Set up audio chain: source -> gain -> pan -> master
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(masterGainNodeRef.current);

    const trackChain = {
      sourceNode,
      gainNode,
      panNode,
      audioBuffer
    };

    trackNodesRef.current.set(trackId, trackChain);
    return trackChain;
  }, []);

  // Get maximum duration across all tracks
  const getMaxDuration = useCallback((tracks) => {
    if (!tracks || tracks.length === 0) return 0;
    
    let maxDuration = 0;
    
    tracks.forEach(track => {
      // Check clips first
      if (track.clips && track.clips.length > 0) {
        track.clips.forEach(clip => {
          if (clip.audioBuffer && clip.endTime) {
            maxDuration = Math.max(maxDuration, clip.endTime);
          } else if (clip.audioBuffer) {
            // Calculate end time from start + duration
            const endTime = (clip.startTime || 0) + clip.audioBuffer.duration;
            maxDuration = Math.max(maxDuration, endTime);
          }
        });
      }
      // Fallback to track audioBuffer
      else if (track.audioBuffer) {
        maxDuration = Math.max(maxDuration, track.audioBuffer.duration);
      }
    });
    
    return maxDuration;
  }, []);

  // Update track parameters
  const updateTrackParameters = useCallback((tracks) => {
    // Get list of solo tracks
    const soloTracks = tracks.filter(track => track.solo);
    const hasSolo = soloTracks.length > 0;

    trackNodesRef.current.forEach((trackChain, nodeId) => {
      // Find the track for this node
      const track = trackChain.track;
      if (!track) return;

      // Volume control
      let effectiveVolume = track.volume || 1;
      
      // Mute logic
      if (track.muted) {
        effectiveVolume = 0;
      }
      
      // Solo logic - if any track is soloed, only solo tracks play
      if (hasSolo && !track.solo) {
        effectiveVolume = 0;
      }

      trackChain.gainNode.gain.value = effectiveVolume;
      trackChain.panNode.pan.value = track.pan || 0;
      
      // Per-track playback rate with reverse support
      let effectivePlaybackRate = track.playbackRate || 1.0;
      if (track.reversed) {
        effectivePlaybackRate = -Math.abs(effectivePlaybackRate);
      }
      trackChain.sourceNode.playbackRate.value = effectivePlaybackRate;
    });
  }, []);

  // Play all tracks
  const playTracks = useCallback((tracks, startTime = 0, playbackRate = 1) => {
    if (!audioContextRef.current || tracks.length === 0) return;

    // Stop any existing playback
    stopTracks();

    try {
      // Create source nodes for all tracks with clips
      tracks.forEach(track => {
        // Only handle tracks with clips - ignore legacy direct audioBuffer
        if (track.clips && track.clips.length > 0) {
          track.clips.forEach(clip => {
            if (clip.audioBuffer) {
              const trackChain = createTrackChain(`${track.id}_${clip.id}`, clip.audioBuffer);
              if (trackChain) {
                // Store reference to track for parameter updates
                trackChain.track = track;
                trackChain.clip = clip;
                
                // Add to trackNodes Map for playback
                trackNodesRef.current.set(`${track.id}_${clip.id}`, trackChain);
              }
            }
          });
        }
        // Note: Removed legacy audioBuffer fallback to prevent double playback
      });

      // Apply current track parameters
      updateTrackParameters(tracks);

      // Start all sources synchronously
      const audioContext = audioContextRef.current;
      const startWhen = audioContext.currentTime;
      
      trackNodesRef.current.forEach((trackChain) => {
        // Only handle clip-based audio (no legacy tracks)
        if (trackChain.clip) {
          const clipStartTime = trackChain.clip.startTime || 0;
          const clipEndTime = trackChain.clip.endTime || (clipStartTime + trackChain.clip.duration);
          const clipDuration = trackChain.clip.duration || (clipEndTime - clipStartTime);
          
          // Only play if the current playhead time intersects with this clip
          if (startTime >= clipStartTime && startTime < clipEndTime) {
            // Calculate how far into the clip we should start playing
            const offsetIntoClip = startTime - clipStartTime;
            // Add any audio offset from clip splitting
            const audioOffset = trackChain.clip.audioOffset || 0;
            const totalOffset = offsetIntoClip + audioOffset;
            
            // Calculate remaining duration to play
            const remainingClipDuration = clipDuration - offsetIntoClip;
            
            // Safety checks to prevent invalid audio parameters
            if (totalOffset >= 0 && remainingClipDuration > 0 && totalOffset < trackChain.audioBuffer.duration) {
              // Start with proper offset and duration limit
              trackChain.sourceNode.start(startWhen, totalOffset, Math.min(remainingClipDuration, trackChain.audioBuffer.duration - totalOffset));
            }
          } else if (startTime < clipStartTime) {
            // Start the clip at its proper time (delayed start)
            const delayTime = clipStartTime - startTime;
            // Add any audio offset from clip splitting
            const audioOffset = trackChain.clip.audioOffset || 0;
            
            // Safety checks to prevent invalid audio parameters
            if (audioOffset >= 0 && clipDuration > 0 && audioOffset < trackChain.audioBuffer.duration) {
              // Start with proper duration limit for the entire clip
              trackChain.sourceNode.start(startWhen + delayTime, audioOffset, Math.min(clipDuration, trackChain.audioBuffer.duration - audioOffset));
            }
          }
          // If startTime > clipEndTime, don't play this clip at all
        }
        
        // Individual clips ending should NOT stop all playback
        // Let clips end naturally without interfering with other clips or tracks
        trackChain.sourceNode.onended = () => {
          // Just clean up this specific node, don't stop everything
          try {
            trackChain.sourceNode.disconnect();
          } catch (e) {
            // Node may already be disconnected
          }
        };
      });

      // Update state
      playbackStartTimeRef.current = audioContext.currentTime;
      pausedPositionRef.current = startTime;
      playbackRateRef.current = playbackRate;
      isPlayingRef.current = true;

      // Start time updates
      updateIntervalRef.current = setInterval(() => {
        if (!isPlayingRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
          return;
        }
        
        const currentTime = getCurrentTime();
        if (onTimeUpdateRef.current) {
          onTimeUpdateRef.current(currentTime);
        }
        
        // Check if we need to stop - improved logic
        const maxDuration = getMaxDuration(tracks);
        if (currentTime >= maxDuration) {
          stopTracks();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(maxDuration);
          }
        }
        
        // Also check if there are any clips that should be playing at current time
        // This helps detect when all clips have naturally ended
        const hasActiveClips = tracks.some(track => 
          track.clips && track.clips.some(clip => 
            currentTime >= (clip.startTime || 0) && currentTime < (clip.endTime || (clip.startTime + clip.duration))
          )
        );
        
        if (!hasActiveClips && currentTime > 0) {
          // No clips should be playing at current time, and we're not at the start
          // This means all clips have ended naturally
          stopTracks();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(currentTime);
          }
        }
      }, 33); // ~30fps updates for better performance

    } catch (error) {
      console.error('Failed to start multi-track playback:', error);
      isPlayingRef.current = false;
    }
  }, [createTrackChain, updateTrackParameters]);

  // Pause all tracks
  const pauseTracks = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    if (isPlayingRef.current) {
      pausedPositionRef.current = getCurrentTime();
      
      // Stop all source nodes
      trackNodesRef.current.forEach((trackChain) => {
        try {
          trackChain.sourceNode.stop();
        } catch (e) {
          // Node may already be stopped
        }
        trackChain.sourceNode.disconnect();
      });
      
      trackNodesRef.current.clear();
      isPlayingRef.current = false;
    }
  }, []);

  // Stop all tracks
  const stopTracks = useCallback(() => {
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Stop and disconnect all source nodes
    trackNodesRef.current.forEach((trackChain) => {
      try {
        trackChain.sourceNode.stop();
      } catch (e) {
        // Node may already be stopped
      }
      trackChain.sourceNode.disconnect();
    });
    
    trackNodesRef.current.clear();
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
  const seekTracks = useCallback((tracks, time) => {
    const wasPlaying = isPlayingRef.current;
    const currentRate = playbackRateRef.current;
    
    // Stop current playback
    if (isPlayingRef.current) {
      pauseTracks();
    }
    
    // Clamp time to valid range
    const maxDuration = getMaxDuration(tracks);
    const clampedTime = Math.max(0, Math.min(time, maxDuration));
    pausedPositionRef.current = clampedTime;
    
    // Update time display immediately
    if (onTimeUpdateRef.current) {
      onTimeUpdateRef.current(clampedTime);
    }
    
    // Resume playback if it was playing and we have audio to play
    const hasAudio = tracks.some(t => 
      (t.clips && t.clips.length > 0 && t.clips.some(c => c.audioBuffer)) || 
      t.audioBuffer
    );
    
    if (wasPlaying && hasAudio) {
      // Remove artificial delay - start immediately for responsive playback
      playTracks(tracks, clampedTime, currentRate);
    }
  }, [playTracks, pauseTracks, getMaxDuration]);

  // Set master volume
  const setMasterVolume = useCallback((volume) => {
    if (masterGainNodeRef.current) {
      masterGainNodeRef.current.gain.value = Math.max(0, Math.min(2, volume));
    }
  }, []);

  // Update real-time track parameters during playback
  const updatePlaybackParameters = useCallback((tracks) => {
    // Always update track parameters (volume, pan, etc.)
    updateTrackParameters(tracks);
    
    // Also update our internal tracks reference so next playback uses updated positions
    tracksRef.current = tracks;
  }, [updateTrackParameters]);

  // Set time update callback
  const setOnTimeUpdate = useCallback((callback) => {
    onTimeUpdateRef.current = callback;
  }, []);

  // Load audio file and return decoded buffer (with caching)
  const loadAudioFile = useCallback(async (file) => {
    try {
      // Create a cache key based on file name and size
      const cacheKey = `${file.name}_${file.size}_${file.lastModified}`;
      
      // Check cache first
      if (audioBufferCacheRef.current.has(cacheKey)) {
        return audioBufferCacheRef.current.get(cacheKey);
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      // Cache the decoded buffer
      audioBufferCacheRef.current.set(cacheKey, audioBuffer);
      
      // Limit cache size to prevent memory bloat
      if (audioBufferCacheRef.current.size > 10) {
        const firstKey = audioBufferCacheRef.current.keys().next().value;
        audioBufferCacheRef.current.delete(firstKey);
      }
      
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw new Error('Unsupported audio format or corrupted file');
    }
  }, []);

  // Clear audio buffer cache
  const clearAudioCache = useCallback(() => {
    audioBufferCacheRef.current.clear();
  }, []);

  return {
    // Playback control
    playTracks,
    pauseTracks,
    stopTracks,
    seekTracks,
    getCurrentTime,
    getMaxDuration,
    
    // Audio loading
    loadAudioFile,
    clearAudioCache,
    
    // Real-time parameter updates
    updatePlaybackParameters,
    setMasterVolume,
    
    // Time updates
    setOnTimeUpdate,
    get onTimeUpdate() {
      return onTimeUpdateRef.current;
    },
    set onTimeUpdate(callback) {
      onTimeUpdateRef.current = callback;
    },
    
    // State
    get isPlaying() {
      return isPlayingRef.current;
    },
    
    get audioContext() {
      return audioContextRef.current;
    }
  };
};