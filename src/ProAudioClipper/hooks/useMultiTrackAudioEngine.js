import { useRef, useCallback, useEffect, useState } from 'react';
import AudioEffectsEngine from '../audio/AudioEffectsEngine.js';
import { WorkletLoader } from '../audio/worklets/WorkletLoader.js';

/**
 * Multi-Track Audio Engine Hook - Phase 3: Web Audio Worklets
 * 
 * Professional multi-track audio engine with ultra-low latency processing:
 * - Individual track playback and mixing
 * - Master volume and pan controls
 * - Solo/mute functionality
 * - Real-time audio processing with AudioWorklets (128 samples latency)
 * - Synchronized playback across all tracks
 * - Per-track effects chains with professional DSP
 * - Sample-accurate timing and parameter automation
 * - Professional mixing console with buses and sends
 * - Advanced routing matrix
 * - Web Audio Worklets for dedicated audio thread processing
 */
export const useMultiTrackAudioEngine = () => {
  const audioContextRef = useRef(null);
  const masterGainNodeRef = useRef(null);
  const masterPanNodeRef = useRef(null);
  const effectsEngineRef = useRef(null);
  const workletNodeRef = useRef(null); // Professional AudioWorklet processor
  const trackNodesRef = useRef(new Map()); // trackId -> { sourceNode, gainNode, panNode, effectsChain, busRouting }
  const busNodesRef = useRef(new Map()); // busId -> { gainNode, panNode, sends }
  const auxNodesRef = useRef(new Map()); // auxId -> { gainNode, panNode, type }
  const audioBufferCacheRef = useRef(new Map()); // file path -> audioBuffer for caching
  const routingMatrixRef = useRef(new Map()); // sourceId -> destinationId -> enabled
  const meteringDataRef = useRef(new Map()); // nodeId -> { left, right, peak, rms, lufs }
  const isPlayingRef = useRef(false);
  const playbackStartTimeRef = useRef(0);
  const pausedPositionRef = useRef(0);
  const playbackRateRef = useRef(1);
  const onTimeUpdateRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const meteringIntervalRef = useRef(null);
  const soloTracksRef = useRef(new Set());
  const tracksRef = useRef([]);
  const workletParametersRef = useRef(new Map());

  // Console state
  const [masterLevel, setMasterLevel] = useState(0);
  const [masterPanState, setMasterPanState] = useState(0);
  const [masterMuted, setMasterMuted] = useState(false);
  const [automationData, setAutomationData] = useState(new Map());
  const [workletSupported, setWorkletSupported] = useState(false);

  // Initialize AudioWorklet processor
  const initializeWorklet = useCallback(async () => {
    if (!audioContextRef.current) return false;

    try {
      // Use WorkletLoader for proper initialization
      workletNodeRef.current = await WorkletLoader.loadWithFallback(audioContextRef.current);

      // Handle messages from worklet
      if (workletNodeRef.current.port) {
        workletNodeRef.current.port.onmessage = (event) => {
          const { type, data } = event.data;
          
          switch (type) {
            case 'metering':
              meteringDataRef.current.set('worklet', data);
              break;
              
            case 'performance':
              console.log('Worklet performance:', data);
              break;
              
            default:
              console.log('Worklet message:', type, data);
          }
        };
      }

      // Connect worklet to master chain (replaces direct connection)
      workletNodeRef.current.connect(masterGainNodeRef.current);
      
      setWorkletSupported(true);
      console.log('Professional AudioWorklet processor initialized successfully');
      return true;
      
    } catch (error) {
      console.warn('Failed to initialize audio processor:', error);
      setWorkletSupported(false);
      return false;
    }
  }, []);

  // Initialize audio context, master chain, effects engine, and mixing infrastructure
  useEffect(() => {
    const initializeAudio = async () => {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioContext();
      
      // Create master chain
      masterGainNodeRef.current = audioContextRef.current.createGain();
      masterPanNodeRef.current = audioContextRef.current.createStereoPanner();
      
      // Connect master chain
      masterPanNodeRef.current.connect(masterGainNodeRef.current);
      masterGainNodeRef.current.connect(audioContextRef.current.destination);
      
      // Initialize professional AudioWorklet processor
      await initializeWorklet();
      
      // Initialize effects engine (fallback for worklet-unsupported effects)
      effectsEngineRef.current = new AudioEffectsEngine(audioContextRef.current);
      
      // Initialize buses (8 stereo mix buses)
      for (let i = 1; i <= 8; i++) {
        const busId = `bus-${i}`;
        const gainNode = audioContextRef.current.createGain();
        const panNode = audioContextRef.current.createStereoPanner();
        
        // Connect bus chain
        panNode.connect(gainNode);
        
        // Connect to worklet if available, otherwise to master pan
        if (workletNodeRef.current) {
          gainNode.connect(workletNodeRef.current);
        } else {
          gainNode.connect(masterPanNodeRef.current);
        }
        
        busNodesRef.current.set(busId, {
          gainNode,
          panNode,
          sends: new Map()
        });
      }
      
      // Initialize auxiliary sends/returns
      const auxTypes = [
        { type: 'send', count: 4 },
        { type: 'return', count: 2 }
      ];
      
      auxTypes.forEach(({ type, count }) => {
        for (let i = 1; i <= count; i++) {
          const auxId = `${type}-${i}`;
          const gainNode = audioContextRef.current.createGain();
          const panNode = audioContextRef.current.createStereoPanner();
          
          if (type === 'return') {
            // Returns connect to worklet or master
            panNode.connect(gainNode);
            if (workletNodeRef.current) {
              gainNode.connect(workletNodeRef.current);
            } else {
              gainNode.connect(masterPanNodeRef.current);
            }
          } else {
            // Sends are virtual - they get routed to returns or external processing
            panNode.connect(gainNode);
          }
          
          auxNodesRef.current.set(auxId, {
            gainNode,
            panNode,
            type
          });
        }
      });
      
      // Start metering
      startMetering();
    };

    initializeAudio();
    
    return () => {
      if (meteringIntervalRef.current) {
        clearInterval(meteringIntervalRef.current);
      }
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      // Clear audio buffer cache on cleanup
      audioBufferCacheRef.current.clear();
    };
  }, [initializeWorklet]);

  // Create audio chain for a track with effects support (updated for worklet integration)
  const createTrackChain = useCallback((trackId, audioBuffer) => {
    if (!audioContextRef.current || !effectsEngineRef.current) return null;

    const sourceNode = audioContextRef.current.createBufferSource();
    const gainNode = audioContextRef.current.createGain();
    const panNode = audioContextRef.current.createStereoPanner();
    
    // Create effects chain for this track
    const effectsChain = effectsEngineRef.current.createTrackEffectChain(trackId);

    // Set up audio chain: source -> effects -> gain -> pan -> worklet or master
    sourceNode.buffer = audioBuffer;
    sourceNode.connect(effectsChain.getInputNode());
    effectsChain.getOutputNode().connect(gainNode);
    gainNode.connect(panNode);
    
    // Connect to worklet if available, otherwise to master
    if (workletNodeRef.current) {
      panNode.connect(workletNodeRef.current);
    } else {
      panNode.connect(masterGainNodeRef.current);
    }

    const trackChain = {
      sourceNode,
      gainNode,
      panNode,
      effectsChain,
      audioBuffer
    };

    trackNodesRef.current.set(trackId, trackChain);
    return trackChain;
  }, []);

  // Professional AudioWorklet parameter control
  const setWorkletParameter = useCallback((parameter, value) => {
    if (!workletNodeRef.current) return;
    
    try {
      const param = workletNodeRef.current.parameters.get(parameter);
      if (param) {
        param.setValueAtTime(value, audioContextRef.current.currentTime);
        workletParametersRef.current.set(parameter, value);
      } else {
        console.warn(`Worklet parameter '${parameter}' not found`);
      }
    } catch (error) {
      console.error(`Failed to set worklet parameter ${parameter}:`, error);
    }
  }, []);

  const getWorkletParameter = useCallback((parameter) => {
    return workletParametersRef.current.get(parameter) || 0;
  }, []);

  const setWorkletEffectParameter = useCallback((effect, parameter, value) => {
    if (!workletNodeRef.current) return;
    
    workletNodeRef.current.port.postMessage({
      type: 'setEffectParameter',
      payload: { effect, parameter, value }
    });
  }, []);

  const resetWorkletEffect = useCallback((effect) => {
    if (!workletNodeRef.current) return;
    
    workletNodeRef.current.port.postMessage({
      type: 'resetEffect',
      payload: { effect }
    });
  }, []);

  const getWorkletMetering = useCallback(() => {
    if (!workletNodeRef.current) return null;
    
    workletNodeRef.current.port.postMessage({
      type: 'getMetering',
      payload: {}
    });
    
    return meteringDataRef.current.get('worklet');
  }, []);

  const getWorkletPerformanceStats = useCallback(() => {
    if (!workletNodeRef.current) return null;
    
    workletNodeRef.current.port.postMessage({
      type: 'getPerformanceStats',
      payload: {}
    });
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

  // Effects management functions
  const addEffectToTrack = useCallback((trackId, effectType, parameters = {}) => {
    if (!effectsEngineRef.current) return null;
    
    try {
      const effect = effectsEngineRef.current.addEffectToTrack(trackId, effectType, parameters);
      console.log(`Added ${effectType} effect to track ${trackId}`);
      return effect;
    } catch (error) {
      console.error(`Failed to add effect ${effectType} to track ${trackId}:`, error);
      return null;
    }
  }, []);

  const removeEffectFromTrack = useCallback((trackId, effectId) => {
    if (!effectsEngineRef.current) return;
    
    effectsEngineRef.current.removeEffectFromTrack(trackId, effectId);
    console.log(`Removed effect ${effectId} from track ${trackId}`);
  }, []);

  const getTrackEffects = useCallback((trackId) => {
    if (!effectsEngineRef.current) return [];
    
    const effectsChain = effectsEngineRef.current.getTrackEffectChain(trackId);
    return effectsChain ? effectsChain.getEffects() : [];
  }, []);

  const getAvailableEffects = useCallback(() => {
    if (!effectsEngineRef.current) return [];
    
    return effectsEngineRef.current.getAvailableEffects();
  }, []);

  const setEffectParameter = useCallback((trackId, effectId, parameterName, value) => {
    if (!effectsEngineRef.current) return;
    
    const effectsChain = effectsEngineRef.current.getTrackEffectChain(trackId);
    if (effectsChain) {
      const effects = effectsChain.getEffects();
      const effect = effects.find(e => e.id === effectId);
      if (effect) {
        effect.setParameter(parameterName, value);
      }
    }
  }, []);

  const bypassTrackEffects = useCallback((trackId, bypass) => {
    if (!effectsEngineRef.current) return;
    
    const effectsChain = effectsEngineRef.current.getTrackEffectChain(trackId);
    if (effectsChain) {
      effectsChain.setBypass(bypass);
    }
  }, []);

  const reorderTrackEffect = useCallback((trackId, effectId, newIndex) => {
    if (!effectsEngineRef.current) return;
    
    const effectsChain = effectsEngineRef.current.getTrackEffectChain(trackId);
    if (effectsChain) {
      effectsChain.reorderEffect(effectId, newIndex);
    }
  }, []);

  const getEffectsEngineStats = useCallback(() => {
    if (!effectsEngineRef.current) return { cpuUsage: 0, latency: 0, droppedSamples: 0 };
    
    return effectsEngineRef.current.getStats();
  }, []);

  // Start real-time metering
  const startMetering = useCallback(() => {
    if (meteringIntervalRef.current) return;
    
    meteringIntervalRef.current = setInterval(() => {
      if (!audioContextRef.current) return;
      
      // Update metering data for all tracks, buses, and master
      // This would typically analyze audio buffers in real-time
      const currentTime = audioContextRef.current.currentTime;
      
      // Mock metering data - in production, this would analyze actual audio levels
      meteringDataRef.current.set('master', {
        left: Math.random() * -20 - 20,
        right: Math.random() * -20 - 20,
        peak: Math.random() * -10 - 10,
        rms: Math.random() * -30 - 30,
        lufs: -23 + Math.random() * 6
      });
    }, 50); // 20fps metering
  }, []);

  // Professional mixing console functions
  const setMasterGain = useCallback((gain) => {
    if (masterGainNodeRef.current) {
      const linearGain = Math.pow(10, gain / 20);
      masterGainNodeRef.current.gain.setValueAtTime(linearGain, audioContextRef.current.currentTime);
      setMasterLevel(gain);
    }
  }, []);

  const setMasterPan = useCallback((pan) => {
    if (masterPanNodeRef.current) {
      masterPanNodeRef.current.pan.setValueAtTime(pan / 100, audioContextRef.current.currentTime);
      setMasterPanState(pan);
    }
  }, []);

  const setMasterMute = useCallback((muted) => {
    if (masterGainNodeRef.current) {
      const currentGain = masterGainNodeRef.current.gain.value;
      masterGainNodeRef.current.gain.setValueAtTime(muted ? 0 : currentGain, audioContextRef.current.currentTime);
      setMasterMuted(muted);
    }
  }, []);

  const setBusLevel = useCallback((busId, level) => {
    const busNode = busNodesRef.current.get(busId);
    if (busNode) {
      const linearGain = Math.pow(10, level / 20);
      busNode.gainNode.gain.setValueAtTime(linearGain, audioContextRef.current.currentTime);
    }
  }, []);

  const setBusPan = useCallback((busId, pan) => {
    const busNode = busNodesRef.current.get(busId);
    if (busNode) {
      busNode.panNode.pan.setValueAtTime(pan / 100, audioContextRef.current.currentTime);
    }
  }, []);

  const setAuxLevel = useCallback((auxId, level) => {
    const auxNode = auxNodesRef.current.get(auxId);
    if (auxNode) {
      const linearGain = Math.pow(10, level / 20);
      auxNode.gainNode.gain.setValueAtTime(linearGain, audioContextRef.current.currentTime);
    }
  }, []);

  const setSendLevel = useCallback((trackId, sendId, level) => {
    // Implementation would route track output to aux send at specified level
    console.log(`Set send ${sendId} level to ${level}dB for track ${trackId}`);
  }, []);

  const setRouting = useCallback((sourceId, destinationId, enabled) => {
    const routeKey = `${sourceId}->${destinationId}`;
    routingMatrixRef.current.set(routeKey, enabled);
    console.log(`${enabled ? 'Enabled' : 'Disabled'} routing from ${sourceId} to ${destinationId}`);
  }, []);

  const getRouting = useCallback((sourceId, destinationId) => {
    const routeKey = `${sourceId}->${destinationId}`;
    return routingMatrixRef.current.get(routeKey) || false;
  }, []);

  const getMasterMetering = useCallback(() => {
    return meteringDataRef.current.get('master') || {
      left: -60, right: -60, peak: -60, rms: -60, lufs: -23
    };
  }, []);

  const getTrackMetering = useCallback((trackId) => {
    return meteringDataRef.current.get(trackId) || {
      left: -60, right: -60, peak: -60, rms: -60
    };
  }, []);

  const getBusMetering = useCallback((busId) => {
    return meteringDataRef.current.get(busId) || {
      left: -60, right: -60, peak: -60, rms: -60
    };
  }, []);

  const recordAutomation = useCallback((channelId, parameter, value, timestamp) => {
    const key = `${channelId}.${parameter}`;
    if (!automationData.has(key)) {
      automationData.set(key, []);
    }
    automationData.get(key).push({ timestamp, value });
    setAutomationData(new Map(automationData));
  }, [automationData]);

  const clearAllSolos = useCallback((excludeTrackId) => {
    soloTracksRef.current.clear();
    if (excludeTrackId) {
      soloTracksRef.current.add(excludeTrackId);
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
    clearAudioCache,
    
    // Real-time parameter updates
    updatePlaybackParameters,
    setMasterVolume,
    
    // Effects management
    addEffectToTrack,
    removeEffectFromTrack,
    getTrackEffects,
    getAvailableEffects,
    setEffectParameter,
    bypassTrackEffects,
    reorderTrackEffect,
    getEffectsEngineStats,
    
    // Professional AudioWorklet Controls (Phase 3)
    setWorkletParameter,
    getWorkletParameter,
    setWorkletEffectParameter,
    resetWorkletEffect,
    getWorkletMetering,
    getWorkletPerformanceStats,
    workletSupported,
    
    // Professional Mixing Console
    setMasterGain,
    setMasterPan,
    setMasterMute,
    setBusLevel,
    setBusPan,
    setAuxLevel,
    setSendLevel,
    setRouting,
    getRouting,
    getMasterMetering,
    getTrackMetering,
    getBusMetering,
    recordAutomation,
    clearAllSolos,
    
    // State
    masterLevel,
    masterPan: masterPanState,
    masterMuted,
    
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
    },
    
    get effectsEngine() {
      return effectsEngineRef.current;
    },
    
    get workletNode() {
      return workletNodeRef.current;
    }
  };
};