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
                
                console.log(`Created trackChain for clip ${clip.id}`);
                console.log('- audioOffset:', clip.audioOffset || 0);
                console.log('- audioBuffer duration:', clip.audioBuffer ? clip.audioBuffer.duration : 'NO BUFFER');
                console.log('- clip startTime:', clip.startTime);
                console.log('- clip endTime:', clip.endTime);
                console.log('- clip duration:', clip.duration);
                
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
      
      // Set up ended event (only need one to handle stop)
      let endedHandlerSet = false;
      
      trackNodesRef.current.forEach((trackChain) => {
        // Only handle clip-based audio (no legacy tracks)
        if (trackChain.clip) {
          const clipStartTime = trackChain.clip.startTime || 0;
          const clipEndTime = trackChain.clip.endTime || (clipStartTime + trackChain.clip.audioBuffer.duration);
          
          // Only play if the current playhead time intersects with this clip
          if (startTime >= clipStartTime && startTime < clipEndTime) {
            // Calculate how far into the clip we should start playing
            const offsetIntoClip = startTime - clipStartTime;
            // Add any audio offset from clip splitting
            const audioOffset = trackChain.clip.audioOffset || 0;
            const totalOffset = offsetIntoClip + audioOffset;
            
            console.log(`Playing clip ${trackChain.clip.id}:`);
            console.log(`- clipStartTime: ${clipStartTime}, clipEndTime: ${clipEndTime}`);
            console.log(`- playhead startTime: ${startTime}`);
            console.log(`- offsetIntoClip: ${offsetIntoClip}`);
            console.log(`- clip audioOffset: ${audioOffset}`);
            console.log(`- totalOffset: ${totalOffset}`);
            
            trackChain.sourceNode.start(startWhen, totalOffset);
          } else if (startTime < clipStartTime) {
            // Start the clip at its proper time (delayed start)
            const delayTime = clipStartTime - startTime;
            // Add any audio offset from clip splitting
            const audioOffset = trackChain.clip.audioOffset || 0;
            
            console.log(`Playing delayed clip ${trackChain.clip.id}:`);
            console.log(`- delayTime: ${delayTime}`);
            console.log(`- clip audioOffset: ${audioOffset}`);
            
            trackChain.sourceNode.start(startWhen + delayTime, audioOffset);
          }
          // If startTime > clipEndTime, don't play this clip at all
        }
        
        // Set up ended handler for the first source
        if (!endedHandlerSet) {
          trackChain.sourceNode.onended = () => {
            if (isPlayingRef.current) {
              stopTracks();
              if (onTimeUpdateRef.current) {
                const maxDuration = getMaxDuration(tracks);
                onTimeUpdateRef.current(maxDuration);
              }
            }
          };
          endedHandlerSet = true;
        }
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
        
        // Check if we need to stop
        const maxDuration = getMaxDuration(tracks);
        if (currentTime >= maxDuration) {
          stopTracks();
          if (onTimeUpdateRef.current) {
            onTimeUpdateRef.current(maxDuration);
          }
        }
      }, 16); // ~60fps updates

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

  // Load audio file and return decoded buffer
  const loadAudioFile = useCallback(async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error('Failed to load audio file:', error);
      throw new Error('Unsupported audio format or corrupted file');
    }
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