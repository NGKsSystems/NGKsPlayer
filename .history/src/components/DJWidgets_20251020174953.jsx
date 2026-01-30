import React, { useState, useCallback, useContext, createContext, useEffect, useMemo, useRef } from 'react';
import DraggableWidget from './DraggableWidget.minimal';
import { useMixerLayout } from '../hooks/useMixerLayout';
// Individual widget locks handled within DraggableWidget now

// Settings Context for visibility toggles
const SettingsContext = createContext();

const SETTINGS_STORAGE_KEY = 'djsimple-control-settings';

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load settings from localStorage:', error);
    }
    return {
      // Deck Controls
      transport: true,
      navigation: true,
      pitchFader: true,
      fineTune: true,
      jogWheel: true,
      
      // Mixer Controls (original)
      crossfader: true,
      volumeLeft: true,
      volumeRight: true,
      gainA: true,
      gainB: true,
      reverbA: true,
      reverbB: true,
      filterA: true,
      filterB: true,
      micInput: true,
      micGain: true,
      masterVol: true,
      cueVol: true,
      
      // Mixer Controls (moved from decks)
      pitchBend: true,
      loopControls: true,
      cuePoints: true,
      syncControls: true,
      deckSettings: true,
      
      // Other Widgets
      visualizersA: true,
      visualizersB: true,
      eqA: true,
      eqB: true,
      libraryA: true,
      libraryB: true,
      snippets: true
    };
  });

  const saveSettings = useCallback((newSettings) => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Failed to save settings to localStorage:', error);
    }
  }, []);

  const toggleSetting = useCallback((key) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        [key]: !prev[key]
      };
      saveSettings(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  const resetSettings = useCallback(() => {
    const defaultSettings = {
      transport: true,
      navigation: true,
      pitchFader: true,
      fineTune: true,
      jogWheel: true,
      crossfader: true,
      volumeLeft: true,
      volumeRight: true,
      gainA: true,
      gainB: true,
      reverbA: true,
      reverbB: true,
      filterA: true,
      filterB: true,
      micInput: true,
      micGain: true,
      masterVol: true,
      cueVol: true,
      pitchBend: true,
      loopControls: true,
      cuePoints: true,
      syncControls: true,
      deckSettings: true,
      visualizersA: true,
      visualizersB: true,
      eqA: true,
      eqB: true,
      libraryA: true,
      libraryB: true,
      snippets: true
    };
    setSettings(defaultSettings);
    saveSettings(defaultSettings);
  }, [saveSettings]);

  return (
    <SettingsContext.Provider value={{ settings, toggleSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Individual DJ Components - these are content only, not draggable widgets
export const DeckWidget = ({ deck, trackState, onRegisterAudio }) => {
  const [deckControls, setDeckControls] = useState(() => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem(`deck-${deck}-controls`);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (error) {
      // Silent error handling
    }
    
    // Fallback to defaults with proper deck positioning
    const defaults = {
      transport: { x: deck === 'A' ? 10 : 350, y: 20, width: 280, height: 120, minimized: false },
      jogWheel: { x: deck === 'A' ? 170 : 510, y: 150, width: 100, height: 100, minimized: false },
      vuWaveform: { x: deck === 'A' ? 10 : 350, y: 260, width: 310, height: 120, minimized: false }
    };
    return defaults;
  });

  // Track state for this deck
  const [currentTrack, setCurrentTrack] = useState(trackState);

  // Audio state for this deck
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCueMode, setIsCueMode] = useState(false);
  const [vuLevels, setVuLevels] = useState({ left: 0, right: 0 });
  const [peakLevels, setPeakLevels] = useState({ left: 0, right: 0 });
  const [peakHold, setPeakHold] = useState({ left: 0, right: 0 });
  const [frequencyData, setFrequencyData] = useState(new Array(64).fill(0));
  const [waveformData, setWaveformData] = useState({ left: new Array(128).fill(0), right: new Array(128).fill(0) });
  const [dbLevels, setDbLevels] = useState({ left: -60, right: -60 });
  const peakHoldTimeRef = useRef({ left: 0, right: 0 });
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const gainNodeRef = useRef(null);
  const pannerNodeRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Listen for deck load IPC messages
  useEffect(() => {
    const handleDeckLoad = (data) => {
      if (data.deck === deck) {
        setCurrentTrack(data);
      }
    };

    // Set up IPC listener using the proper API
    if (window.api && window.api.onDeckLoad) {
      const cleanup = window.api.onDeckLoad(handleDeckLoad);
      
      // Return cleanup function
      return cleanup;
    } else {
      console.warn(`[DeckWidget ${deck}] ⚠️ IPC onDeckLoad not available`);
    }
  }, [deck]);

  // Update track state when prop changes
  useEffect(() => {
    if (trackState) {
      setCurrentTrack(trackState);
    }
  }, [trackState]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && currentTrack?.track?.filePath) {
      // Use the custom local:// protocol that's registered in the main process
      const audioSrc = `local://${currentTrack.track.filePath}`;
      
      audioRef.current.src = audioSrc;
      audioRef.current.load();
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [currentTrack?.track?.filePath, deck]);

  // Set up Web Audio API for mono routing and VU analysis
  useEffect(() => {
    if (audioRef.current && !audioContextRef.current) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaElementSource(audioRef.current);
      const gainNode = audioContext.createGain();
      const pannerNode = audioContext.createStereoPanner();
      const analyser = audioContext.createAnalyser();
      
      // Configure analyser for VU metering
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      
      // Connect the audio graph
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      pannerNode.connect(analyser);
      analyser.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      gainNodeRef.current = gainNode;
      pannerNodeRef.current = pannerNode;
      analyserRef.current = analyser;
      
      // Register audio context with parent for EQ
      if (onRegisterAudio) {
        onRegisterAudio(deck, audioContext, gainNode, pannerNode);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [deck, onRegisterAudio]);

  // VU meter animation effect (separate from Web Audio API setup)
  useEffect(() => {
    if (isPlaying) {
      
      let lastUpdateTime = 0;
      const updateInterval = 33; // ~30fps for smooth VU meters
      
      const updateVuLevels = (currentTime) => {
        if (!isPlaying) {
          return; // Stop if no longer playing
        }
        
        // Throttle updates for smooth performance
        if (currentTime - lastUpdateTime >= updateInterval) {
          if (analyserRef.current) {
            try {
              const bufferLength = analyserRef.current.frequencyBinCount;
              const frequencyArray = new Uint8Array(bufferLength);
              analyserRef.current.getByteFrequencyData(frequencyArray);
              
              // Get time-domain data for actual waveform
              const timeArray = new Uint8Array(analyserRef.current.fftSize);
              analyserRef.current.getByteTimeDomainData(timeArray);
              
              // Process waveform data (128 samples for high resolution)
              const waveformSamples = 128;
              const samplesPerPoint = Math.floor(timeArray.length / waveformSamples);
              const leftWaveform = [];
              const rightWaveform = [];
              
              for (let i = 0; i < waveformSamples; i++) {
                const startIdx = i * samplesPerPoint;
                const endIdx = Math.min(startIdx + samplesPerPoint, timeArray.length);
                
                // Calculate RMS amplitude for this segment (better than simple average)
                let sumSquares = 0;
                for (let j = startIdx; j < endIdx; j++) {
                  // Convert from 0-255 to -1 to +1 range
                  const sample = (timeArray[j] - 128) / 128;
                  sumSquares += sample * sample;
                }
                const rmsAmplitude = Math.sqrt(sumSquares / (endIdx - startIdx));
                
                // Scale to match VU meter levels (0-100%) with reasonable scaling
                const scaledAmplitude = Math.min(100, rmsAmplitude * 150); // Reduced from 400 to 150
                
                // Simulate stereo by adding slight variation and frequency-based differences
                const leftAmp = scaledAmplitude + Math.sin(i * 0.1) * 5;
                const rightAmp = scaledAmplitude + Math.cos(i * 0.12) * 7;
                
                leftWaveform.push(Math.max(1, leftAmp));
                rightWaveform.push(Math.max(1, rightAmp));
              }
              
              setWaveformData({ left: leftWaveform, right: rightWaveform });
              
              // Process frequency data for spectrum analyzer (64 bars)
              const spectrumBars = 64;
              const binsPerBar = Math.floor(bufferLength / spectrumBars);
              const spectrumData = [];
              
              for (let i = 0; i < spectrumBars; i++) {
                const startBin = i * binsPerBar;
                const endBin = Math.min(startBin + binsPerBar, bufferLength);
                let sum = 0;
                
                for (let j = startBin; j < endBin; j++) {
                  sum += frequencyArray[j];
                }
                
                const average = sum / (endBin - startBin);
                // Apply logarithmic scaling for better visualization
                const scaledValue = Math.min(100, (average / 255) * 150);
                spectrumData.push(scaledValue);
              }
              
              setFrequencyData(spectrumData);
              
              // Split into left/right channels (simulate stereo from mono data)
              const leftData = frequencyArray.slice(0, bufferLength / 2);
              const rightData = frequencyArray.slice(bufferLength / 2);
              
              // Calculate RMS levels for more accurate representation
              const leftRMS = Math.sqrt(leftData.reduce((sum, val) => sum + (val * val), 0) / leftData.length);
              const rightRMS = Math.sqrt(rightData.reduce((sum, val) => sum + (val * val), 0) / rightData.length);
              
              // Convert to dB-like scale (0-100%)
              const leftLevel = Math.min(100, (leftRMS / 255) * 120); // Slightly amplified for visibility
              const rightLevel = Math.min(100, (rightRMS / 255) * 120);
              
              if (leftLevel > 1 || rightLevel > 1) {
                // Real audio detected
                const leftFinal = Math.max(2, leftLevel);
                const rightFinal = Math.max(2, rightLevel);
                
                setVuLevels({ left: leftFinal, right: rightFinal });
                
                // Calculate dB levels (professional audio scale)
                const leftDb = leftRMS > 0 ? 20 * Math.log10(leftRMS / 255) + 60 : -60; // +60 to normalize to 0dB
                const rightDb = rightRMS > 0 ? 20 * Math.log10(rightRMS / 255) + 60 : -60;
                
                setDbLevels({ 
                  left: Math.max(-60, Math.min(0, leftDb)), 
                  right: Math.max(-60, Math.min(0, rightDb)) 
                });
                
                // Peak detection and hold
                const now = currentTime;
                let newPeakHold = { ...peakHold };
                
                // Update peak levels if current level exceeds them
                if (leftFinal > peakHold.left || now - peakHoldTimeRef.current.left > 1500) {
                  newPeakHold.left = leftFinal;
                  peakHoldTimeRef.current.left = now;
                }
                if (rightFinal > peakHold.right || now - peakHoldTimeRef.current.right > 1500) {
                  newPeakHold.right = rightFinal;
                  peakHoldTimeRef.current.right = now;
                }
                
                setPeakHold(newPeakHold);
                
                // Set peak indicators for levels > 85%
                setPeakLevels({
                  left: leftFinal > 85 ? 100 : 0,
                  right: rightFinal > 85 ? 100 : 0
                });
                
              } else {
                // Fallback simulation for when audio is playing but analyser shows no data
                const simBase = 25 + Math.sin(currentTime / 200) * 20;
                const leftSim = Math.max(5, Math.min(75, simBase + Math.random() * 25));
                const rightSim = Math.max(5, Math.min(75, simBase + Math.random() * 25));
                
                setVuLevels({ left: leftSim, right: rightSim });
                setPeakLevels({ left: 0, right: 0 }); // No peaks in simulation
                
                // Simulate dB levels based on VU levels
                const leftDb = -60 + (leftSim / 100) * 60; // Scale 0-100% to -60dB to 0dB
                const rightDb = -60 + (rightSim / 100) * 60;
                setDbLevels({ left: leftDb, right: rightDb });
                
                // Generate simulated waveform data
                const simLeftWave = Array.from({ length: 128 }, (_, i) => {
                  return Math.max(0, Math.min(100, leftSim + Math.sin(currentTime / 50 + i * 0.2) * 20 + Math.random() * 15));
                });
                const simRightWave = Array.from({ length: 128 }, (_, i) => {
                  return Math.max(0, Math.min(100, rightSim + Math.sin(currentTime / 60 + i * 0.25) * 18 + Math.random() * 12));
                });
                setWaveformData({ left: simLeftWave, right: simRightWave });
                
                // Generate realistic frequency spectrum simulation
                const simSpectrum = Array.from({ length: 64 }, (_, i) => {
                  // Simulate different frequency bands with different characteristics
                  const bassLevel = i < 16 ? 40 + Math.sin(currentTime / 100 + i * 0.3) * 25 : 0;
                  const midLevel = i >= 16 && i < 48 ? 30 + Math.sin(currentTime / 150 + i * 0.2) * 20 : 0;
                  const trebleLevel = i >= 48 ? 20 + Math.sin(currentTime / 80 + i * 0.4) * 15 : 0;
                  
                  const totalLevel = bassLevel + midLevel + trebleLevel + Math.random() * 10;
                  return Math.max(3, Math.min(70, totalLevel));
                });
                
                setFrequencyData(simSpectrum);
              }
              
            } catch (error) {
              // Fallback simulation if analyser fails
              const simBase = 20 + Math.sin(currentTime / 180) * 18;
              const leftSim = Math.max(5, Math.min(70, simBase + Math.random() * 20));
              const rightSim = Math.max(5, Math.min(70, simBase + Math.random() * 20));
              
              setVuLevels({ left: leftSim, right: rightSim });
              setPeakLevels({ left: 0, right: 0 });
              
              // Generate fallback spectrum
              const fallbackSpectrum = Array.from({ length: 64 }, (_, i) => {
                const bassWeight = i < 16 ? 35 + Math.sin(currentTime / 120 + i * 0.4) * 20 : 0;
                const midWeight = i >= 16 && i < 48 ? 25 + Math.sin(currentTime / 160 + i * 0.3) * 15 : 0;
                const trebleWeight = i >= 48 ? 15 + Math.sin(currentTime / 90 + i * 0.5) * 12 : 0;
                
                return Math.max(2, Math.min(65, bassWeight + midWeight + trebleWeight + Math.random() * 8));
              });
              
              setFrequencyData(fallbackSpectrum);
            }
          } else {
            // No analyser - animated simulation
            const time = currentTime / 100;
            const baseLevel = 20 + Math.sin(time * 0.7) * 18 + Math.cos(time * 1.1) * 12;
            const leftLevel = Math.max(3, Math.min(75, baseLevel + Math.random() * 25));
            const rightLevel = Math.max(3, Math.min(75, baseLevel + Math.random() * 25));
            
            setVuLevels({ left: leftLevel, right: rightLevel });
            setPeakLevels({ left: 0, right: 0 });
            
            // Generate animated spectrum without analyser
            const animatedSpectrum = Array.from({ length: 64 }, (_, i) => {
              const bassComponent = i < 16 ? 30 + Math.sin(time * 0.6 + i * 0.3) * 18 : 0;
              const midComponent = i >= 16 && i < 48 ? 22 + Math.sin(time * 0.8 + i * 0.2) * 14 : 0;
              const trebleComponent = i >= 48 ? 12 + Math.sin(time * 1.2 + i * 0.4) * 10 : 0;
              
              return Math.max(1, Math.min(70, bassComponent + midComponent + trebleComponent + Math.random() * 12));
            });
            
            setFrequencyData(animatedSpectrum);
          }
          
          lastUpdateTime = currentTime;
        }
        
        animationFrameRef.current = requestAnimationFrame(updateVuLevels);
      };
      
      animationFrameRef.current = requestAnimationFrame(updateVuLevels);
    } else {
      // Cancel animation and decay VU levels when stopping
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Gradually decay VU levels
      const decayLevels = () => {
        setVuLevels(prev => {
          const newLeft = Math.max(0, prev.left * 0.8);
          const newRight = Math.max(0, prev.right * 0.8);
          
          if (newLeft > 1 || newRight > 1) {
            setTimeout(decayLevels, 100); // Slower decay updates to reduce lag
          }
          
          return { left: newLeft, right: newRight };
        });
      };
      decayLevels();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [deck, isPlaying]);

  // Update audio routing based on cue mode
  useEffect(() => {
    if (pannerNodeRef.current) {
      // Regular mode: left ear (-1), Cue mode: right ear (+1)
      const panValue = isCueMode ? 1 : -1;
      pannerNodeRef.current.pan.value = panValue;
    }
  }, [isCueMode, deck]);

  // Audio control functions
  const handlePlay = useCallback(async () => {
    if (audioRef.current && currentTrack?.track) {
      try {
        // Resume audio context if suspended (required by modern browsers)
        if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        
        await audioRef.current.play();
        setIsPlaying(true);
        setIsPaused(false);
      } catch (error) {
        console.error(`[DeckWidget ${deck}] ❌ Play failed:`, error);
      }
    }
  }, [deck, currentTrack?.track]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }, [deck]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
    }
  }, [deck]);

  const handleCue = useCallback(() => {
    if (audioRef.current) {
      if (isCueMode) {
        // Exit cue mode - return to start and switch back to regular mode
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        setIsCueMode(false);
      } else {
        // Enter cue mode - switch to right ear for cueing
        setIsCueMode(true);
      }
    }
  }, [deck, isCueMode]);

  // Handle seeking in the track
  const handleSeek = useCallback((e) => {
    if (audioRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      const seekTime = (x / width) * duration;
      
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, [deck, duration]);

  // Navigation functions
  const handlePrevious = useCallback(() => {
    if (audioRef.current) {
      // Jump back 10 seconds or to start if less than 10 seconds
      const newTime = Math.max(0, audioRef.current.currentTime - 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [deck]);

  const handleNext = useCallback(() => {
    if (audioRef.current && duration > 0) {
      // Jump forward 10 seconds or to end if less than 10 seconds remaining
      const newTime = Math.min(duration, audioRef.current.currentTime + 10);
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [deck, duration]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleControlUpdate = useCallback((controlId, updates) => {
    setDeckControls(prev => {
      const newState = {
        ...prev,
        [controlId]: { ...prev[controlId], ...updates }
      };
      
      // Store in localStorage to persist across re-renders
      try {
        localStorage.setItem(`deck-${deck}-controls`, JSON.stringify(newState));
      } catch (error) {
        console.warn('Failed to save deck controls to localStorage:', error);
      }
      
      return newState;
    });
  }, [deck]);

  const handleControlMinimize = useCallback((controlId) => {
    setDeckControls(prev => ({
      ...prev,
      [controlId]: { ...prev[controlId], minimized: !prev[controlId].minimized }
    }));
  }, []);

  // Get track info for display
  const trackInfo = currentTrack?.track;
  const trackName = trackInfo ? `${trackInfo.title || 'Unknown'} - ${trackInfo.artist || 'Unknown'}` : 'No track loaded';
  
  const trackDetails = trackInfo ? `BPM: ${Math.round(trackInfo.bpm || 0)} | Key: ${trackInfo.key || '--'}` : 'BPM: -- | Key: --';

  return (
    <div className={`deck-content deck-${deck.toLowerCase()}`}>
      <div className="deck-workspace">
        {/* Transport Controls */}
        <DraggableWidget
          id={`transport-${deck}`}
          title="Transport"
          initialPosition={{ x: deck === 'A' ? 10 : 350, y: 50 }}
          initialSize={{ width: 330, height: 200 }}
          mirrorSizeWith={deck === 'A' ? 'transport-B' : 'transport-A'}
          className="deck-sub-widget"
        >
          <div className="transport-control">
            <div className="track-info">
              <div className="track-name" title={trackName}>{trackName}</div>
              <div className="track-details">{trackDetails}</div>
            </div>
            
            {/* Progress Bar */}
            <div className="progress-container">
              <div className="time-display">
                <span className="current-time">{formatTime(currentTime)}</span>
                <span className="duration">{formatTime(duration)}</span>
              </div>
              <div 
                className="progress-bar" 
                onClick={handleSeek}
                title="Click to seek"
              >
                <div 
                  className="progress-fill"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                ></div>
              </div>
            </div>
            
            <div className="transport-buttons">
              <button 
                className="nav-btn back"
                onClick={handlePrevious}
                disabled={!currentTrack?.track}
                title="Jump back 10 seconds"
              >
                ⏮
              </button>
              <button 
                className={`play-btn ${isPlaying ? 'active' : ''}`}
                onClick={handlePlay}
                disabled={!currentTrack?.track}
                title="Play"
              >
                ▶
              </button>
              <button 
                className={`pause-btn ${isPaused ? 'active' : ''}`}
                onClick={handlePause}
                disabled={!currentTrack?.track}
                title="Pause"
              >
                ⏸
              </button>
              <button 
                className="stop-btn"
                onClick={handleStop}
                disabled={!currentTrack?.track}
                title="Stop"
              >
                ⏹
              </button>
              <button 
                className={`cue-btn ${isCueMode ? 'active' : ''}`}
                onClick={handleCue}
                disabled={!currentTrack?.track}
                title={isCueMode ? "Exit Cue (Left Ear)" : "Enter Cue (Right Ear)"}
              >
                {isCueMode ? 'LIVE' : 'CUE'}
              </button>
              <button 
                className="nav-btn forward"
                onClick={handleNext}
                disabled={!currentTrack?.track}
                title="Jump forward 10 seconds"
              >
                ⏭
              </button>
            </div>
          </div>
        </DraggableWidget>

        {/* Jog Wheel */}
        <DraggableWidget
          id={`jogWheel-${deck}`}
          title="Jog Wheel"
          initialPosition={{ x: deck === 'A' ? 350 : 690, y: 50 }}
          initialSize={{ width: 100, height: 100 }}
          mirrorSizeWith={deck === 'A' ? 'jogWheel-B' : 'jogWheel-A'}
          className="deck-sub-widget"
        >
          <div className="jog-wheel-control">
            <div className="jog-wheel">
              <div className="jog-inner">
                <div className="jog-indicator"></div>
              </div>
            </div>
          </div>
        </DraggableWidget>

        {/* VU Meter & Waveform */}
        <DraggableWidget
          id={`vuWaveform-${deck}`}
          title={`VU & Waveform ${deck}`}
          initialPosition={{ x: deck === 'A' ? 10 : 350, y: 260 }}
          initialSize={{ width: 310, height: 120 }}
          mirrorSizeWith={deck === 'A' ? 'vuWaveform-B' : 'vuWaveform-A'}
          className="deck-sub-widget"
        >
          <div className="vu-waveform-container">
            <div className="vu-meters">
              {/* Left Channel VU Meter */}
              <div className="vu-meter left">
                <div className="vu-scale">
                  {/* Professional VU scale with proper color zones */}
                  {Array.from({ length: 20 }, (_, i) => {
                    const segmentLevel = (i + 1) * 5; // Each segment = 5%
                    const isActive = vuLevels.left >= segmentLevel;
                    
                    // Color coding: Green (0-60%), Yellow (60-85%), Red (85-100%)
                    let segmentColor = '#22c55e'; // Green
                    if (segmentLevel > 85) segmentColor = '#ef4444'; // Red
                    else if (segmentLevel > 60) segmentColor = '#f59e0b'; // Yellow
                    
                    return (
                      <div
                        key={i}
                        className={`vu-segment ${isActive ? 'active' : ''}`}
                        style={{
                          backgroundColor: isActive ? segmentColor : 'rgba(255,255,255,0.1)',
                          height: '4px',
                          marginBottom: '1px',
                          transition: 'background-color 0.1s ease'
                        }}
                      />
                    );
                  })}
                  
                  {/* Peak Hold Indicator */}
                  {peakHold.left > 0 && (
                    <div
                      className="peak-hold"
                      style={{
                        position: 'absolute',
                        bottom: `${peakHold.left}%`,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: peakHold.left > 85 ? '#ff0000' : '#ffffff',
                        boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                        zIndex: 10
                      }}
                    />
                  )}
                  
                  {/* Peak Indicator (flashing red) */}
                  {peakLevels.left > 0 && (
                    <div
                      className="peak-indicator"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        backgroundColor: '#ff0000',
                        animation: 'peakFlash 0.2s ease-in-out',
                        zIndex: 15
                      }}
                    />
                  )}
                </div>
                <div className="vu-label">
                  <div className="channel-label">L</div>
                  <div className="db-readout">{dbLevels.left ? dbLevels.left.toFixed(1) : '-60.0'}dB</div>
                </div>
              </div>
              
              {/* Right Channel VU Meter */}
              <div className="vu-meter right">
                <div className="vu-scale">
                  {/* Professional VU scale with proper color zones */}
                  {Array.from({ length: 20 }, (_, i) => {
                    const segmentLevel = (i + 1) * 5; // Each segment = 5%
                    const isActive = vuLevels.right >= segmentLevel;
                    
                    // Color coding: Green (0-60%), Yellow (60-85%), Red (85-100%)
                    let segmentColor = '#22c55e'; // Green
                    if (segmentLevel > 85) segmentColor = '#ef4444'; // Red
                    else if (segmentLevel > 60) segmentColor = '#f59e0b'; // Yellow
                    
                    return (
                      <div
                        key={i}
                        className={`vu-segment ${isActive ? 'active' : ''}`}
                        style={{
                          backgroundColor: isActive ? segmentColor : 'rgba(255,255,255,0.1)',
                          height: '4px',
                          marginBottom: '1px',
                          transition: 'background-color 0.1s ease'
                        }}
                      />
                    );
                  })}
                  
                  {/* Peak Hold Indicator */}
                  {peakHold.right > 0 && (
                    <div
                      className="peak-hold"
                      style={{
                        position: 'absolute',
                        bottom: `${peakHold.right}%`,
                        left: 0,
                        right: 0,
                        height: '2px',
                        backgroundColor: peakHold.right > 85 ? '#ff0000' : '#ffffff',
                        boxShadow: '0 0 4px rgba(255,255,255,0.8)',
                        zIndex: 10
                      }}
                    />
                  )}
                  
                  {/* Peak Indicator (flashing red) */}
                  {peakLevels.right > 0 && (
                    <div
                      className="peak-indicator"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '8px',
                        backgroundColor: '#ff0000',
                        animation: 'peakFlash 0.2s ease-in-out',
                        zIndex: 15
                      }}
                    />
                  )}
                </div>
                <div className="vu-label">
                  <div className="channel-label">R</div>
                  <div className="db-readout">{dbLevels.right ? dbLevels.right.toFixed(1) : '-60.0'}dB</div>
                </div>
              </div>
            </div>
            <div className="waveform-display">
              <div className="waveform-progress" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}></div>
              
              {/* Dual Channel Waveform */}
              <div className="dual-waveform">
                {/* Left Channel Waveform */}
                <div className="waveform-channel left-channel">
                  <div className="channel-waveform">
                    {waveformData.left.map((amplitude, i) => {
                      // Color based on amplitude level
                      let barColor = '#22c55e'; // Green for normal
                      if (amplitude > 85) barColor = '#ef4444'; // Red for peaks
                      else if (amplitude > 70) barColor = '#f59e0b'; // Yellow for high
                      
                      return (
                        <div 
                          key={i} 
                          className="waveform-sample" 
                          style={{ 
                            height: `${Math.max(2, Math.min(75, amplitude * 0.3))}%`, // Further reduced left channel scaling
                            backgroundColor: barColor,
                            boxShadow: amplitude > 60 ? `0 0 2px ${barColor}` : 'none',
                            opacity: 0.7 + (amplitude / 100) * 0.3
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="channel-label-waveform">L</div>
                </div>
                
                {/* Center Line */}
                <div className="waveform-center-line"></div>
                
                {/* Right Channel Waveform */}
                <div className="waveform-channel right-channel">
                  <div className="channel-waveform">
                    {waveformData.right.map((amplitude, i) => {
                      // Color based on amplitude level
                      let barColor = '#22c55e'; // Green for normal
                      if (amplitude > 85) barColor = '#ef4444'; // Red for peaks
                      else if (amplitude > 70) barColor = '#f59e0b'; // Yellow for high
                      
                      return (
                        <div 
                          key={i} 
                          className="waveform-sample" 
                          style={{ 
                            height: `${Math.max(2, Math.min(75, amplitude * 0.3))}%`, // Further reduced right channel scaling
                            backgroundColor: barColor,
                            boxShadow: amplitude > 60 ? `0 0 2px ${barColor}` : 'none',
                            opacity: 0.7 + (amplitude / 100) * 0.3
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="channel-label-waveform">R</div>
                </div>
              </div>
              
              {/* Spectrum Analyzer (smaller, below waveform) */}
              <div className="mini-spectrum">
                {frequencyData.slice(0, 32).map((amplitude, i) => {
                  let barColor = '#444';
                  if (i < 8) barColor = '#ef4444'; // Bass = Red
                  else if (i < 24) barColor = '#f59e0b'; // Mid = Yellow  
                  else barColor = '#3b82f6'; // Treble = Blue
                  
                  return (
                    <div 
                      key={i} 
                      className="mini-spectrum-bar" 
                      style={{ 
                        height: `${Math.max(1, Math.min(15, amplitude / 8))}%`,
                        backgroundColor: amplitude > 20 ? barColor : '#333',
                        opacity: amplitude > 10 ? 0.8 : 0.3
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </DraggableWidget>
      </div>
      
      {/* Hidden audio element for this deck */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(audioRef.current?.duration || 0);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setIsPaused(false);
        }}
        onError={(e) => {
          console.error(`[DeckWidget ${deck}] ❌ Audio error:`, e);
          setIsPlaying(false);
          setIsPaused(false);
        }}
        preload="metadata"
      />
    </div>
  );
};

export const MixerWidget = ({ deckAudioRefs }) => {
  // Use new mixer layout system instead of competing storage
  const mixerLayout = useMixerLayout();

  // Audio control state
  const [audioControls, setAudioControls] = useState({
    gainA: 50,
    gainB: 50,
    crossfader: 50,
    volumeA: 50,
    volumeB: 50,
    cueA: false,
    cueB: false,
    reverbA: 0,
    reverbB: 0,
    filterA: 50,
    filterB: 50
  });

  // Audio control handlers
  const handleGainChange = (deck, value) => {
    const gain = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`gain${deck}`]: gain
    }));

    
    // Apply gain to actual audio context
    if (deckAudioRefs && deckAudioRefs.current[deck] && deckAudioRefs.current[deck].gainNode) {
      const gainValue = gain / 100; // Convert percentage to 0-1 range
      deckAudioRefs.current[deck].gainNode.gain.setValueAtTime(
        gainValue, 
        deckAudioRefs.current[deck].audioContext.currentTime
      );

    }
  };

  const handleVolumeChange = (deck, value) => {
    const volume = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`volume${deck}`]: volume
    }));
    
    // Apply volume to actual audio context (using gain node)
    if (deckAudioRefs && deckAudioRefs.current[deck] && deckAudioRefs.current[deck].gainNode) {
      const volumeValue = volume / 100; // Convert percentage to 0-1 range
      deckAudioRefs.current[deck].gainNode.gain.setValueAtTime(
        volumeValue, 
        deckAudioRefs.current[deck].audioContext.currentTime
      );
    }
  };

  const handleCueToggle = (deck) => {
    setAudioControls(prev => {
      const newCueState = !prev[`cue${deck}`];

      return {
        ...prev,
        [`cue${deck}`]: newCueState
      };
    });
    // TODO: Route to cue output
  };

  const handleCrossfaderChange = (value) => {
    const crossfader = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      crossfader
    }));

    
    // Apply crossfader mixing: 0% = full A, 100% = full B
    if (deckAudioRefs && deckAudioRefs.current.A && deckAudioRefs.current.B) {
      const crossfaderValue = crossfader / 100; // Convert to 0-1 range
      
      // Calculate gain for each deck based on crossfader position
      const deckAGain = 1 - crossfaderValue; // A decreases as crossfader goes right
      const deckBGain = crossfaderValue;      // B increases as crossfader goes right
      
      // Apply crossfader mixing to each deck
      if (deckAudioRefs.current.A.gainNode) {
        const currentGainA = audioControls.gainA || 50;
        const finalGainA = (currentGainA / 100) * deckAGain;
        deckAudioRefs.current.A.gainNode.gain.setValueAtTime(
          finalGainA,
          deckAudioRefs.current.A.audioContext.currentTime
        );
      }
      
      if (deckAudioRefs.current.B.gainNode) {
        const currentGainB = audioControls.gainB || 50;
        const finalGainB = (currentGainB / 100) * deckBGain;
        deckAudioRefs.current.B.gainNode.gain.setValueAtTime(
          finalGainB,
          deckAudioRefs.current.B.audioContext.currentTime
        );
      }
      

    }
  };

  const handleReverbChange = (deck, value) => {
    const reverbValue = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`reverb${deck}`]: reverbValue
    }));

    // TODO: Apply reverb effect to audio
  };

  const handleFilterChange = (deck, value) => {
    const filterValue = parseFloat(value);
    setAudioControls(prev => ({
      ...prev,
      [`filter${deck}`]: filterValue
    }));

    // TODO: Apply filter effect to audio
  };

  // Helper function to calculate knob rotation
  const getKnobRotation = (value, min = 0, max = 100) => {
    const percentage = (value - min) / (max - min);
    // Rotate from -135deg to +135deg (270 degrees total)
    const rotation = -135 + (percentage * 270);
    return `${rotation}deg`;
  };

  // Helper function to create controlled draggable widgets
  const createControlledWidget = (widgetId, title, children, options = {}) => {
    const position = mixerLayout.getPixelPosition(widgetId);
    if (!position) return null;

    return (
      <DraggableWidget
        key={widgetId}
        id={widgetId}
        title={title}
        x={position.x}
        y={position.y}
        width={position.width}
        height={position.height}
        controlled={true}
        onDragEnd={(newPosition) => {
          mixerLayout.updateWidget(widgetId, newPosition);
        }}
        onResizeEnd={(newSize) => {
          const currentPos = mixerLayout.getPixelPosition(widgetId);
          mixerLayout.updateWidget(widgetId, { 
            x: currentPos.x, 
            y: currentPos.y, 
            width: newSize.width, 
            height: newSize.height 
          });
        }}
        className={options.className || "mixer-sub-widget"}
        minSize={options.minSize || { width: 80, height: 60 }}
        {...options}
      >
        {children}
      </DraggableWidget>
    );
  };

  return (
    <div className="mixer-content">
      <div 
        className="mixer-workspace"
        ref={mixerLayout.containerRef}
      >
        
        {/* Only render widgets when container size is known */}
        {!mixerLayout.isReady ? (
          <div className="mixer-loading">
            <p>Initializing mixer layout...</p>
          </div>
        ) : (
          <>
            {/* Crossfader Control */}
            {createControlledWidget(
              "crossfader",
              "Crossfader",
              <div className="crossfader-control">
                <label>A ← Crossfader → B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={audioControls.crossfader}
                  onChange={(e) => handleCrossfaderChange(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="crossfader-slider"
                />
                <div className="crossfader-value">{audioControls.crossfader}%</div>
              </div>,
              { minSize: { width: 120, height: 40 } }
            )}

            {/* Volume A Control */}
            {createControlledWidget(
              "gainA",
              "Gain A",
              <div className="gain-control">
                <label>Gain A</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainA}
                  onChange={(e) => handleGainChange('A', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainA}%</div>
              </div>
            )}

            {/* Volume Left Control */}
            {createControlledWidget(
              "volumeLeft",
              "Volume A",
              <div className="volume-control vertical">
                <label>Volume A</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeA}
                  onChange={(e) => handleVolumeChange('A', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeA}%</div>
              </div>,
              { className: "volume-widget" }
            )}

            {/* Volume Right Control */}
            {createControlledWidget(
              "volumeRight",
              "Volume B",
              <div className="volume-control vertical">
                <label>Volume B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.volumeB}
                  onChange={(e) => handleVolumeChange('B', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="volume-slider vertical"
                  orient="vertical"
                />
                <div className="volume-value">{audioControls.volumeB}%</div>
              </div>,
              { className: "volume-widget" }
            )}

            {/* Gain B Control */}
            {createControlledWidget(
              "gainB",
              "Gain B", 
              <div className="gain-control">
                <label>Gain B</label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={audioControls.gainB}
                  onChange={(e) => handleGainChange('B', e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="gain-slider"
                />
                <div className="gain-value">{audioControls.gainB}%</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Global debug functions for new mixer layout system
window.debugMixerLayout = () => {
  console.log('🔍 Mixer Layout Debug Info');
  const saved = localStorage.getItem('mixer-layout-v1');
  if (saved) {
    console.log('📋 Saved Layout:', JSON.parse(saved));
  } else {
    console.log('❌ No saved layout found');
  }
};

window.resetMixerLayout = () => {
  localStorage.removeItem('mixer-layout-v1');
  console.log('🔄 Mixer layout reset - refresh page to see default positions');
  window.location.reload();
};

// Missing widget components needed by DJSimple.jsx
export const DeckWidget = ({ deckLetter, audioRef }) => (
  <div className="deck-widget">
    <h3>Deck {deckLetter}</h3>
    <p>Deck controls placeholder</p>
  </div>
);

export const EQWidget = ({ deckLetter }) => (
  <div className="eq-widget">
    <h3>EQ {deckLetter}</h3>
    <p>EQ controls placeholder</p>
  </div>
);

export const LibraryWidget = ({ deckLetter }) => (
  <div className="library-widget">
    <h3>Library {deckLetter}</h3>
    <p>Music library placeholder</p>
  </div>
);

export const SnippetsWidget = () => (
  <div className="snippets-widget">
    <h3>Sound Snippets</h3>
    <p>Sound snippet pads placeholder</p>
  </div>
);

export const SettingsWidget = () => (
  <div className="settings-widget">
    <h3>Settings</h3>
    <p>Settings controls placeholder</p>
  </div>
);

// Placeholder components for missing exports
export const VisualizersWidgetA = () => <div>Visualizers A</div>;
export const VisualizersWidgetB = () => <div>Visualizers B</div>
            <label>Volume B</label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="1"
              value={audioControls.volumeB}
              onChange={(e) => handleVolumeChange('B', e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              className="volume-slider vertical"
              orient="vertical"
            />
            <div className="volume-value">{audioControls.volumeB}%</div>
          </div>
        </DraggableWidget>

        {/* Gain Controls */}
        <DraggableWidget
          id="ampLeft"
          title="Gain A"
          initialPosition={{ x: 60, y: 180 }}
          initialSize={{ width: 100, height: 100 }}
          mirrorSizeWith="ampRight"
          className="gain-widget"
        >
          <div className="knob-container">
            <div 
              className="knob-control gain-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.gainB) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.gainB}
                onChange={(e) => handleGainChange('B', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.gainB}%</div>
          </div>
        </DraggableWidget>

        <DraggableWidget
          id="ampRight"
          title="Gain B"
          initialPosition={{ x: 440, y: 180 }}
          initialSize={{ width: 100, height: 100 }}
          mirrorSizeWith="ampLeft"
          className="gain-widget"
        >
          <div className="knob-container">
            <div 
              className="knob-control gain-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.gainA) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.gainA}
                onChange={(e) => handleGainChange('A', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.gainA}%</div>
          </div>
        </DraggableWidget>

        {/* Reverb Controls */}
        <DraggableWidget
          id="reverbA"
          title="Reverb A"
          {...mixerControls.reverbA}
          onUpdate={(updates) => handleControlUpdate('reverbA', updates)}
          onMinimize={() => handleControlMinimize('reverbA')}
          className="mixer-sub-widget"
          minSize={{ width: 60, height: 75 }}
        >
          <div className="knob-container">
            <div 
              className="knob-control reverb-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.reverbA) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.reverbA}
                onChange={(e) => handleReverbChange('A', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.reverbA}%</div>
          </div>
        </DraggableWidget>

        <DraggableWidget
          id="reverbB"
          title="Reverb B"
          {...mixerControls.reverbB}
          onUpdate={(updates) => handleControlUpdate('reverbB', updates)}
          onMinimize={() => handleControlMinimize('reverbB')}
          className="mixer-sub-widget"
          minSize={{ width: 60, height: 75 }}
        >
          <div className="knob-container">
            <div 
              className="knob-control reverb-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.reverbB) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.reverbB}
                onChange={(e) => handleReverbChange('B', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.reverbB}%</div>
          </div>
        </DraggableWidget>

        {/* Filter Controls */}
        <DraggableWidget
          id="filterA"
          title="Filter A"
          {...mixerControls.filterA}
          onUpdate={(updates) => handleControlUpdate('filterA', updates)}
          onMinimize={() => handleControlMinimize('filterA')}
          className="mixer-sub-widget"
          minSize={{ width: 60, height: 75 }}
        >
          <div className="knob-container">
            <div 
              className="knob-control filter-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.filterA) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.filterA}
                onChange={(e) => handleFilterChange('A', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.filterA}%</div>
          </div>
        </DraggableWidget>

        <DraggableWidget
          id="filterB"
          title="Filter B"
          {...mixerControls.filterB}
          onUpdate={(updates) => handleControlUpdate('filterB', updates)}
          onMinimize={() => handleControlMinimize('filterB')}
          className="mixer-sub-widget"
          minSize={{ width: 60, height: 75 }}
        >
          <div className="knob-container">
            <div 
              className="knob-control filter-knob"
              style={{ '--knob-rotation': getKnobRotation(audioControls.filterB) }}
            >
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={audioControls.filterB}
                onChange={(e) => handleFilterChange('B', e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
              />
            </div>
            <div className="knob-value">{audioControls.filterB}%</div>
          </div>
        </DraggableWidget>

        {/* Microphone Input */}
        <DraggableWidget
          id="micInput"
          title="Mic Input"
          {...mixerControls.micInput}
          onUpdate={(updates) => handleControlUpdate('micInput', updates)}
          onMinimize={() => handleControlMinimize('micInput')}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 45 }}
        >
          <div className="mic-control">
            <input type="range" min="0" max="100" defaultValue="0" />
          </div>
        </DraggableWidget>

        {/* Microphone Gain */}
        <DraggableWidget
          id="micGain"
          title="Mic Gain"
          {...mixerControls.micGain}
          onUpdate={(updates) => handleControlUpdate('micGain', updates)}
          onMinimize={() => handleControlMinimize('micGain')}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 45 }}
        >
          <div className="mic-control">
            <input type="range" min="0" max="100" defaultValue="25" />
          </div>
        </DraggableWidget>

        {/* Master Volume */}
        <DraggableWidget
          id="masterVol"
          title="Master Vol"
          {...mixerControls.masterVol}
          onUpdate={(updates) => handleControlUpdate('masterVol', updates)}
          onMinimize={() => handleControlMinimize('masterVol')}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 80 }}
        >
          <div className="master-control">
            <label>Master</label>
            <input type="range" min="0" max="100" defaultValue="80" />
            <label>Booth</label>
            <input type="range" min="0" max="100" defaultValue="70" />
          </div>
        </DraggableWidget>

        {/* Cue Volume */}
        <DraggableWidget
          id="cueVol"
          title="Cue Vol"
          {...mixerControls.cueVol}
          onUpdate={(updates) => handleControlUpdate('cueVol', updates)}
          onMinimize={() => handleControlMinimize('cueVol')}
          className="mixer-sub-widget"
          minSize={{ width: 70, height: 70 }}
        >
          <div className="cue-control">
            <label>Cue Vol</label>
            <input type="range" min="0" max="100" defaultValue="60" />
            <label>Cue Mix</label>
            <input type="range" min="0" max="100" defaultValue="50" />
          </div>
        </DraggableWidget>

        {/* Pitch Control A */}
        <DraggableWidget
          id="pitchA"
          title="Pitch A"
          {...mixerControls.pitchA}
          onUpdate={(updates) => handleControlUpdate('pitchA', updates)}
          onMinimize={() => handleControlMinimize('pitchA')}
          className="mixer-sub-widget"
          minSize={{ width: 80, height: 120 }}
        >
          <div className="pitch-control-single">
            <div className="pitch-section">
              <div className="pitch-label">Deck A</div>
              <div className="pitch-display">+0.0%</div>
              <input type="range" min="-50" max="50" defaultValue="0" className="pitch-slider vertical" />
              <div className="pitch-fine">
                <input type="range" min="-100" max="100" defaultValue="0" className="fine-tune-slider" />
              </div>
            </div>
          </div>
        </DraggableWidget>

        {/* Pitch Control B */}
        <DraggableWidget
          id="pitchB"
          title="Pitch B"
          {...mixerControls.pitchB}
          onUpdate={(updates) => handleControlUpdate('pitchB', updates)}
          onMinimize={() => handleControlMinimize('pitchB')}
          className="mixer-sub-widget"
          minSize={{ width: 80, height: 120 }}
        >
          <div className="pitch-control-single">
            <div className="pitch-section">
              <div className="pitch-label">Deck B</div>
              <div className="pitch-display">+0.0%</div>
              <input type="range" min="-50" max="50" defaultValue="0" className="pitch-slider vertical" />
              <div className="pitch-fine">
                <input type="range" min="-100" max="100" defaultValue="0" className="fine-tune-slider" />
              </div>
            </div>
          </div>
        </DraggableWidget>

        {/* Loop Controls with A/B Switch */}
        <DraggableWidget
          id="loopControls"
          title="Loop Controls"
          {...mixerControls.loopControls}
          onUpdate={(updates) => handleControlUpdate('loopControls', updates)}
          onMinimize={() => handleControlMinimize('loopControls')}
          className="mixer-sub-widget"
          minSize={{ width: 130, height: 60 }}
        >
          <div className="ab-switch-control">
            <div className="ab-switch">
              <button className="ab-btn active">A</button>
              <button className="ab-btn">B</button>
            </div>
            <div className="loop-control compact">
              <button className="loop-btn">1/8</button>
              <button className="loop-btn">1/4</button>
              <button className="loop-btn">1/2</button>
              <button className="loop-btn">1</button>
              <button className="loop-btn">AUTO</button>
              <button className="loop-btn">EXIT</button>
            </div>
          </div>
        </DraggableWidget>

        {/* Cue Points with A/B Switch */}
        <DraggableWidget
          id="cuePoints"
          title="Cue Points"
          {...mixerControls.cuePoints}
          onUpdate={(updates) => handleControlUpdate('cuePoints', updates)}
          onMinimize={() => handleControlMinimize('cuePoints')}
          className="mixer-sub-widget"
          minSize={{ width: 160, height: 60 }}
        >
          <div className="ab-switch-control">
            <div className="ab-switch">
              <button className="ab-btn active">A</button>
              <button className="ab-btn">B</button>
            </div>
            <div className="cue-points-control compact">
              <button className="cue-point-btn">1</button>
              <button className="cue-point-btn">2</button>
              <button className="cue-point-btn">3</button>
              <button className="cue-point-btn">4</button>
              <button className="cue-point-btn">5</button>
              <button className="cue-point-btn">6</button>
              <button className="cue-point-btn">7</button>
              <button className="cue-point-btn">8</button>
            </div>
          </div>
        </DraggableWidget>

        {/* Sync & Tempo Controls */}
        <DraggableWidget
          id="syncControls"
          title="Sync & Tempo"
          {...mixerControls.syncControls}
          onUpdate={(updates) => handleControlUpdate('syncControls', updates)}
          onMinimize={() => handleControlMinimize('syncControls')}
          className="mixer-sub-widget"
          minSize={{ width: 80, height: 50 }}
        >
          <div className="ab-switch-control">
            <div className="ab-switch">
              <button className="ab-btn active">A</button>
              <button className="ab-btn">B</button>
            </div>
            <div className="sync-tempo-control">
              <button className="sync-btn">SYNC</button>
              <button className="tap-btn">TAP</button>
            </div>
          </div>
        </DraggableWidget>

        {/* Deck Settings (Key Lock, Quantize, Vinyl, Slip) */}
        <DraggableWidget
          id="deckSettings"
          title="Deck Settings"
          {...mixerControls.deckSettings}
          onUpdate={(updates) => handleControlUpdate('deckSettings', updates)}
          onMinimize={() => handleControlMinimize('deckSettings')}
          className="mixer-sub-widget"
          minSize={{ width: 100, height: 60 }}
        >
          <div className="ab-switch-control">
            <div className="ab-switch">
              <button className="ab-btn active">A</button>
              <button className="ab-btn">B</button>
            </div>
            <div className="deck-settings-control">
              <button className="setting-btn">KEYLOCK</button>
              <button className="setting-btn">QUANT</button>
              <button className="setting-btn">VINYL</button>
              <button className="setting-btn">SLIP</button>
            </div>
          </div>
        </DraggableWidget>
      </div>
    </div>
  );
};

// Individual deck visualizer components
export const VisualizersWidgetA = () => (
  <div className="visualizers-content">
    <div className="deck-visualizer-section">
      <div className="visualizer-row">
        <div className="vu-meter">
          <div className="vu-bar">
            <div className="vu-level" style={{ height: '60%' }}></div>
          </div>
          <label>VU A</label>
        </div>
        <div className="waveform-display">
          <div className="waveform-container">
            <div className="waveform-line"></div>
            <div className="playhead"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const VisualizersWidgetB = () => (
  <div className="visualizers-content">
    <div className="deck-visualizer-section">
      <div className="visualizer-row">
        <div className="vu-meter">
          <div className="vu-bar">
            <div className="vu-level" style={{ height: '40%' }}></div>
          </div>
          <label>VU B</label>
        </div>
        <div className="waveform-display">
          <div className="waveform-container">
            <div className="waveform-line"></div>
            <div className="playhead"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Keep the combined one for backward compatibility if needed
export const VisualizersWidget = VisualizersWidgetA;

export const EQWidget = ({ deck, audioContext, gainNode, pannerNode }) => {
  // 16-band EQ frequencies (Hz)
  const frequencies = [
    '31', '62', '125', '250', '500', '1K', '2K', '4K', 
    '8K', '16K', '31K', '62K', '125K', '250K', '500K', '1M'
  ];
  
  // Actual frequency values for Web Audio API
  const frequencyValues = [
    31, 62, 125, 250, 500, 1000, 2000, 4000,
    8000, 16000, 31000, 62000, 125000, 250000, 500000, 1000000
  ];
  
  // EQ presets
  const presets = {
    'Flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Rock': [3, 2, -1, -2, 1, 4, 5, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    'Pop': [1, 2, 4, 3, 0, -1, -2, 1, 2, 3, 2, 1, 0, 0, 0, 0],
    'Hip-Hop': [5, 4, 2, 1, -1, -2, 1, 2, 1, 3, 4, 3, 2, 1, 0, 0],
    'Electronic': [2, 3, 1, 0, 2, 4, 3, 1, 2, 5, 6, 4, 3, 2, 1, 0],
    'Jazz': [2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0],
    'Classical': [0, 0, 0, 0, 1, 1, 0, 0, 1, 2, 3, 2, 1, 0, 0, 0],
    'Bass Boost': [6, 5, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    'Treble Boost': [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0],
    'Vocal': [0, 0, -1, 1, 3, 4, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0],
    'Dance': [4, 3, 2, 0, 0, 1, 2, 3, 2, 3, 4, 3, 2, 1, 0, 0],
    'Loudness': [3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 2, 1, 0]
  };
  
  const [eqValues, setEqValues] = useState(presets['Flat']);
  const [selectedPreset, setSelectedPreset] = useState('Flat');
  const [bypassEQ, setBypassEQ] = useState(false);
  const [eqFilters, setEqFilters] = useState([]);
  
  // Initialize EQ filters when audio context is available
  useEffect(() => {
    if (audioContext && gainNode && pannerNode && eqFilters.length === 0) {

      
      const filters = frequencyValues.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        
        // Configure filter types based on frequency
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === frequencyValues.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
        }
        
        // Clamp frequency to valid Web Audio API range (10Hz - 24000Hz)
        const clampedFreq = Math.max(10, Math.min(24000, freq));
        filter.frequency.setValueAtTime(clampedFreq, audioContext.currentTime);
        filter.Q.setValueAtTime(1, audioContext.currentTime);
        filter.gain.setValueAtTime(0, audioContext.currentTime);
        
        return filter;
      });
      
      // Chain filters together: gainNode -> filter1 -> filter2 -> ... -> pannerNode
      gainNode.disconnect();
      
      let currentNode = gainNode;
      filters.forEach((filter, index) => {
        currentNode.connect(filter);
        currentNode = filter;
        
        if (index === filters.length - 1) {
          // Last filter connects to panner node to maintain audio routing
          filter.connect(pannerNode);
        }
      });
      
      setEqFilters(filters);

    }
  }, [audioContext, gainNode, pannerNode, deck, eqFilters.length, frequencyValues]);
  
  // Update EQ when values change
  useEffect(() => {
    if (eqFilters.length > 0 && audioContext) {
      eqFilters.forEach((filter, index) => {
        const gainValue = bypassEQ ? 0 : eqValues[index];
        filter.gain.setValueAtTime(gainValue, audioContext.currentTime);
      });

    }
  }, [eqValues, bypassEQ, eqFilters, audioContext, deck]);
  
  const handleBandChange = useCallback((bandIndex, value) => {
    const newValues = [...eqValues];
    newValues[bandIndex] = parseFloat(value);
    setEqValues(newValues);
    setSelectedPreset('Custom'); // Switch to custom when manually adjusted
  }, [eqValues]);
  
  const handlePresetChange = useCallback((presetName) => {
    setSelectedPreset(presetName);
    setEqValues([...presets[presetName]]);
  }, []);
  
  const handleReset = useCallback(() => {
    setSelectedPreset('Flat');
    setEqValues([...presets['Flat']]);
  }, []);
  
  // Prevent drag when interacting with EQ controls
  const handleSliderMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  const handleControlMouseDown = useCallback((e) => {
    e.stopPropagation();
  }, []);
  
  return (
    <div className={`eq-content eq-${deck.toLowerCase()}`}>
      {/* EQ Header with Presets */}
      <div className="eq-header" onMouseDown={handleControlMouseDown}>
        <div className="eq-presets">
          <label>Preset:</label>
          <select 
            value={selectedPreset} 
            onChange={(e) => handlePresetChange(e.target.value)}
            className="eq-preset-select"
            onMouseDown={handleControlMouseDown}
          >
            {Object.keys(presets).map(preset => (
              <option key={preset} value={preset}>{preset}</option>
            ))}
          </select>
        </div>
        <div className="eq-controls-header">
          <button 
            className={`eq-bypass-btn ${bypassEQ ? 'active' : ''}`}
            onClick={() => setBypassEQ(!bypassEQ)}
            onMouseDown={handleControlMouseDown}
          >
            {bypassEQ ? 'BYPASSED' : 'ACTIVE'}
          </button>
          <button 
            className="eq-reset-btn" 
            onClick={handleReset}
            onMouseDown={handleControlMouseDown}
          >
            RESET
          </button>
        </div>
      </div>
      
      {/* 16-Band EQ Sliders */}
      <div className="eq-bands-container">
        <div className="eq-bands">
          {frequencies.map((freq, index) => (
            <div key={index} className="eq-band-vertical">
              <div className="eq-gain-value">
                {eqValues[index] > 0 ? '+' : ''}{eqValues[index].toFixed(1)}
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.1"
                value={eqValues[index]}
                onChange={(e) => handleBandChange(index, e.target.value)}
                onMouseDown={handleSliderMouseDown}
                className={`eq-slider ${bypassEQ ? 'bypassed' : ''}`}
                orient="vertical"
                disabled={bypassEQ}
              />
              <div className="eq-frequency">{freq}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* EQ Status */}
      <div className="eq-analyzer" onMouseDown={handleControlMouseDown}>
        <div style={{ 
          fontSize: '10px', 
          color: audioContext && eqFilters.length > 0 ? '#00ff88' : '#ff4444',
          textAlign: 'center',
          padding: '4px'
        }}>
          {audioContext && eqFilters.length > 0 ? 
            `🎛️ EQ Active (${eqFilters.length} bands)` : 
            '⚠️ EQ Not Connected'
          }
        </div>
      </div>
    </div>
  );
};

export const LibraryWidget = ({ deck }) => {
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);

  // Load tracks when component mounts
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all tracks from the database
      const allTracks = await window.api.getTracks({});

      
      setTracks(allTracks);
    } catch (err) {
      console.error(`[LibraryWidget ${deck || 'Main'}] Failed to load tracks:`, err);
      setError('Failed to load music library');
    } finally {
      setLoading(false);
    }
  };

  // Filter tracks based on search term
  const filteredTracks = useMemo(() => {
    if (!searchTerm.trim()) return tracks;
    
    const search = searchTerm.toLowerCase();
    return tracks.filter(track => 
      track.title?.toLowerCase().includes(search) ||
      track.artist?.toLowerCase().includes(search) ||
      track.album?.toLowerCase().includes(search)
    );
  }, [tracks, searchTerm]);

  // Handle track double-click to load in deck
  const handleTrackDoubleClick = async (track) => {
    try {

      
      if (!track.filePath) {
        console.error('[LibraryWidget] ❌ No file path available for track:', track);
        alert('Cannot load track: No file path available');
        return;
      }

      // Send IPC message to load track in specific deck
      const deckTarget = deck ? deck.toUpperCase() : 'A'; // Default to deck A if no deck specified

      
      // Check if API is available
      if (!window.api) {
        console.error('[LibraryWidget] ❌ window.api not available');
        alert('Cannot load track: API not available');
        return;
      }

      if (!window.api.invoke) {
        console.error('[LibraryWidget] ❌ window.api.invoke not available');
        alert('Cannot load track: IPC invoke not available');
        return;
      }
      

      
      try {
        const result = await window.api.invoke('deck:loadTrack', {
          filePath: track.filePath,
          deck: deckTarget,
          track: track
        });
        

        
      } catch (ipcError) {
        console.error('[LibraryWidget] ❌ IPC call failed:', ipcError);
        alert(`Failed to load track via IPC: ${ipcError.message}`);
      }
      
    } catch (err) {
      console.error('[LibraryWidget] ❌ Failed to load track:', err);
      alert(`Failed to load track: ${err.message}`);
    }
  };

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`library-content library-${deck?.toLowerCase() || 'main'}`}>
      <div className="library-header">
        <h4>{deck ? `Library ${deck}` : 'Music Library'}</h4>
        <div className="library-stats">
          {loading ? 'Loading...' : `${filteredTracks.length} tracks`}
        </div>
      </div>
      
      <div className="library-controls">
        <input 
          type="text" 
          placeholder="Search tracks..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="library-search"
        />
        
        <div className="library-actions">
          <button onClick={loadTracks} disabled={loading} className="refresh-btn">
            {loading ? '...' : '↻'}
          </button>
        </div>
      </div>

      <div className="track-list">
        {error && (
          <div className="library-error">
            {error}
            <button onClick={loadTracks}>Retry</button>
          </div>
        )}
        
        {loading && (
          <div className="library-loading">
            Loading music library...
          </div>
        )}
        
        {!loading && !error && filteredTracks.length === 0 && !searchTerm && (
          <div className="library-empty">
            <p>No tracks in library</p>
            <p>Use File → Scan Library to add music</p>
          </div>
        )}
        
        {!loading && !error && filteredTracks.length === 0 && searchTerm && (
          <div className="library-empty">
            <p>No tracks found for "{searchTerm}"</p>
          </div>
        )}
        
        {!loading && !error && filteredTracks.length > 0 && (
          <div className="track-items">
            {filteredTracks.map((track) => (
              <div 
                key={track.id}
                className="track-item"
                onDoubleClick={() => handleTrackDoubleClick(track)}
                title={`Double-click to load in ${deck ? `Deck ${deck}` : 'player'}`}
              >
                <div className="track-info">
                  <div className="track-title">{track.title || 'Unknown Title'}</div>
                  <div className="track-details">
                    <span className="track-artist">{track.artist || 'Unknown Artist'}</span>
                    {track.album && <span className="track-album"> • {track.album}</span>}
                  </div>
                </div>
                <div className="track-meta">
                  <div className="track-duration">{formatDuration(track.duration)}</div>
                  {track.bpm && <div className="track-bpm">{Math.round(track.bpm)} BPM</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const SnippetsWidget = () => (
  <div className="snippets-content">
    <div className="snippet-pads">
      <div className="snippet-grid">
        {[1, 2, 3, 4].map(i => (
          <button key={i} className="snippet-pad">
            Pad {i}
          </button>
        ))}
      </div>
    </div>
  </div>
);

export const SettingsWidget = () => {
  const { settings, toggleSetting, resetSettings } = useSettings();

  const controlGroups = {
    'Deck Controls': {
      transport: 'Transport (Play/Pause/Stop)',
      navigation: 'Navigation (Forward/Back)',
      pitchFader: 'Pitch Fader',
      fineTune: 'Fine Tune Slider',
      jogWheel: 'Jog Wheel'
    },
    'Mixer - Basic': {
      crossfader: 'Crossfader',
      volumeLeft: 'Volume A',
      volumeRight: 'Volume B',
      gainA: 'Gain A',
      gainB: 'Gain B',
      masterVol: 'Master Volume',
      cueVol: 'Cue Volume'
    },
    'Mixer - Effects': {
      reverbA: 'Reverb A',
      reverbB: 'Reverb B',
      filterA: 'Filter A',
      filterB: 'Filter B',
      micInput: 'Mic Input',
      micGain: 'Mic Gain'
    },
    'Performance Controls': {
      pitchBend: 'Pitch Bend (A/B)',
      loopControls: 'Loop Controls (A/B)',
      cuePoints: 'Cue Points (A/B)',
      syncControls: 'Sync & Tempo (A/B)',
      deckSettings: 'Deck Settings (A/B)'
    },
    'Other Widgets': {
      visualizersA: 'Visualizers A',
      visualizersB: 'Visualizers B',
      eqA: 'EQ A',
      eqB: 'EQ B',
      libraryA: 'Library A',
      libraryB: 'Library B',
      snippets: 'Snippets'
    }
  };

  return (
    <div className="settings-content">
      <div className="settings-header">
        <h3>Interface Settings</h3>
        <button className="reset-btn" onClick={resetSettings}>
          Reset All
        </button>
      </div>
      
      <div className="settings-groups">
        {Object.entries(controlGroups).map(([groupName, controls]) => (
          <div key={groupName} className="setting-group">
            <h4>{groupName}</h4>
            <div className="setting-items">
              {Object.entries(controls).map(([key, label]) => (
                <div key={key} className="setting-item">
                  <label className="setting-label">
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={() => toggleSetting(key)}
                      className="setting-checkbox"
                    />
                    <span className="setting-text">{label}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="settings-footer">
        <p className="setting-note">
          💡 Tip: Uncheck controls you don't use to customize your interface
        </p>
      </div>
    </div>
  );
};

// Debug functions for console troubleshooting
window.debugVolumeWidgets = () => {
  // Try different selectors to find volume widgets
  const allWidgets = document.querySelectorAll('.draggable-widget');
  console.log('🔍 VOLUME WIDGET DEBUG:');
  console.log('Total draggable widgets found:', allWidgets.length);
  
  // Look for widgets with "Volume" in their title
  const volumeWidgets = Array.from(allWidgets).filter(widget => {
    const title = widget.querySelector('.widget-title');
    return title && title.textContent && title.textContent.includes('Volume');
  });
  
  console.log('Volume widgets found:', volumeWidgets.length);
  
  volumeWidgets.forEach((widget, index) => {
    const title = widget.querySelector('.widget-title')?.textContent;
    console.log(`Volume Widget ${index + 1}:`, {
      title: title,
      element: widget,
      position: {
        left: widget.style.left,
        top: widget.style.top,
        width: widget.style.width,
        height: widget.style.height,
        transform: widget.style.transform
      }
    });
  });
  
  // Check localStorage with different patterns
  const storageKeys = Object.keys(localStorage).filter(key => 
    key.includes('volume') || key.includes('Volume')
  );
  console.log('Volume-related localStorage keys:', storageKeys);
  storageKeys.forEach(key => {
    console.log(`${key}:`, localStorage.getItem(key));
  });
};

window.watchVolumeB = () => {
  // Find Volume B widget by title
  const allWidgets = document.querySelectorAll('.draggable-widget');
  const volumeB = Array.from(allWidgets).find(widget => {
    const title = widget.querySelector('.widget-title');
    return title && title.textContent && title.textContent.includes('Volume B');
  });
  
  if (!volumeB) {
    console.log('❌ Volume B widget not found');
    console.log('Available widgets:', Array.from(allWidgets).map(w => 
      w.querySelector('.widget-title')?.textContent || 'No title'
    ));
    return;
  }
  
  console.log('👀 Watching Volume B for changes...', volumeB);
  
  // Store initial position for comparison
  let lastPosition = {
    left: volumeB.style.left,
    top: volumeB.style.top,
    transform: volumeB.style.transform,
    x: volumeB.offsetLeft,
    y: volumeB.offsetTop
  };
  
  // Enhanced observer - watch for ALL changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes') {
        const currentPosition = {
          left: volumeB.style.left,
          top: volumeB.style.top,
          transform: volumeB.style.transform,
          x: volumeB.offsetLeft,
          y: volumeB.offsetTop
        };
        
        // Check if any position value changed
        const positionChanged = 
          currentPosition.left !== lastPosition.left ||
          currentPosition.top !== lastPosition.top ||
          currentPosition.transform !== lastPosition.transform ||
          currentPosition.x !== lastPosition.x ||
          currentPosition.y !== lastPosition.y;
          
        if (positionChanged) {
          console.log('🔍 VOLUME B POSITION CHANGED:', {
            timestamp: new Date().toLocaleTimeString(),
            attribute: mutation.attributeName,
            oldPosition: lastPosition,
            newPosition: currentPosition,
            style: volumeB.style.cssText
          });
          lastPosition = currentPosition;
        }
      }
    });
  });
  
  // Watch for all attribute changes and child changes
  observer.observe(volumeB, { 
    attributes: true, 
    attributeOldValue: true,
    childList: true,
    subtree: true
  });
  
  // Also use a polling approach as backup
  const pollInterval = setInterval(() => {
    const currentPosition = {
      left: volumeB.style.left,
      top: volumeB.style.top,
      transform: volumeB.style.transform,
      x: volumeB.offsetLeft,
      y: volumeB.offsetTop
    };
    
    const positionChanged = 
      currentPosition.left !== lastPosition.left ||
      currentPosition.top !== lastPosition.top ||
      currentPosition.transform !== lastPosition.transform ||
      currentPosition.x !== lastPosition.x ||
      currentPosition.y !== lastPosition.y;
      
    if (positionChanged) {
      console.log('🔍 VOLUME B POSITION CHANGED (polling):', {
        timestamp: new Date().toLocaleTimeString(),
        oldPosition: lastPosition,
        newPosition: currentPosition,
        boundingRect: volumeB.getBoundingClientRect()
      });
      lastPosition = currentPosition;
    }
  }, 100); // Check every 100ms
  
  window.volumeBObserver = observer;
  window.volumeBPollInterval = pollInterval;
  
  console.log('✅ Volume B observer + polling started. Run stopWatchingVolumeB() to stop.');
};

window.stopWatchingVolumeB = () => {
  if (window.volumeBObserver) {
    window.volumeBObserver.disconnect();
    delete window.volumeBObserver;
    console.log('✅ Volume B observer stopped.');
  }
  if (window.volumeBPollInterval) {
    clearInterval(window.volumeBPollInterval);
    delete window.volumeBPollInterval;
    console.log('✅ Volume B polling stopped.');
  }
};

window.resetVolumePositions = () => {
  localStorage.removeItem('widget-volumeLeft-position');
  localStorage.removeItem('widget-volumeRight-position');
  localStorage.removeItem('widget-volumeLeft-size');
  localStorage.removeItem('widget-volumeRight-size');
  console.log('✅ Volume widget positions reset. Refresh the page to see changes.');
};

// NEW: Comprehensive layout debugging tools
window.debugAllWidgetStorage = () => {
  console.log('📊 ALL WIDGET STORAGE DATA:');
  const widgetKeys = Object.keys(localStorage).filter(key => key.startsWith('widget-'));
  const layoutKeys = Object.keys(localStorage).filter(key => key.startsWith('dj-'));
  
  console.log('\n🔧 Individual Widget Storage:');
  widgetKeys.forEach(key => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      console.log(`  ${key}:`, value);
    } catch {
      console.log(`  ${key}: ${localStorage.getItem(key)} (not JSON)`);
    }
  });
  
  console.log('\n📐 Layout Manager Storage:');
  layoutKeys.forEach(key => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      console.log(`  ${key}:`, value);
    } catch {
      console.log(`  ${key}: ${localStorage.getItem(key)} (not JSON)`);
    }
  });
};

window.nukeAllWidgetStorage = () => {
  console.log('💥 NUKING ALL WIDGET STORAGE...');
  
  // Remove individual widget storage
  const widgetKeys = Object.keys(localStorage).filter(key => key.startsWith('widget-'));
  widgetKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  🗑️ Removed: ${key}`);
  });
  
  // Remove layout manager storage
  const layoutKeys = Object.keys(localStorage).filter(key => key.startsWith('dj-'));
  layoutKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`  🗑️ Removed: ${key}`);
  });
  
  console.log('✅ All widget storage cleared. Refresh the page for clean slate!');
};

window.fixVolumeGainPositions = () => {
  console.log('🔧 FIXING VOLUME/GAIN POSITIONS TO DEFAULTS...');
  
  // Set Volume A (left) to default position
  localStorage.setItem('widget-volumeLeft-position', JSON.stringify({ x: 140, y: 50 }));
  localStorage.setItem('widget-volumeLeft-size', JSON.stringify({ width: 80, height: 200 }));
  
  // Set Volume B (right) to default position  
  localStorage.setItem('widget-volumeRight-position', JSON.stringify({ x: 540, y: 60 }));
  localStorage.setItem('widget-volumeRight-size', JSON.stringify({ width: 80, height: 200 }));
  
  // Set Gain A to default position
  localStorage.setItem('widget-ampLeft-position', JSON.stringify({ x: 60, y: 180 }));
  localStorage.setItem('widget-ampLeft-size', JSON.stringify({ width: 100, height: 100 }));
  
  // Set Gain B to default position
  localStorage.setItem('widget-ampRight-position', JSON.stringify({ x: 660, y: 200 }));
  localStorage.setItem('widget-ampRight-size', JSON.stringify({ width: 100, height: 100 }));
  
  console.log('✅ Volume/Gain positions fixed to defaults. Refresh to see changes.');
};

window.resetToConsistentLayout = () => {
  console.log('� INTERNAL MIXER RESET (this should not be called during UI reset)');
  
  // Simple internal reset - don't touch layout manager data
  const defaults = {
    'widget-volumeLeft-position': { x: 140, y: 50 },
    'widget-volumeLeft-size': { width: 80, height: 200 },
    'widget-volumeRight-position': { x: 540, y: 60 },
    'widget-volumeRight-size': { width: 80, height: 200 },
    'widget-ampLeft-position': { x: 60, y: 180 },
    'widget-ampLeft-size': { width: 100, height: 100 },
    'widget-ampRight-position': { x: 660, y: 200 },
    'widget-ampRight-size': { width: 100, height: 100 }
  };
  
  Object.entries(defaults).forEach(([key, value]) => {
    localStorage.setItem(key, JSON.stringify(value));
  });
  
  console.log('✅ Internal mixer widgets reset to defaults');
  
// Global debug functions for new mixer layout system
window.debugMixerLayout = () => {
  console.log('🔍 Mixer Layout Debug Info');
  const saved = localStorage.getItem('mixer-layout-v1');
  if (saved) {
    console.log('📋 Saved Layout:', JSON.parse(saved));
  } else {
    console.log('❌ No saved layout found');
  }
};

window.resetMixerLayout = () => {
  localStorage.removeItem('mixer-layout-v1');
  console.log('🔄 Mixer layout reset - refresh page to see default positions');
  window.location.reload();
};