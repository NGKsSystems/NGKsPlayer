import React, { useState, useCallback, useEffect, useRef } from "react";
import DraggableWidget from "../../DraggableWidget";
import Transport from "./Transport";
import JogWheel from './JogWheel';
import VUWaveform from './VUWaveform';

const DeckWidget = ({ deck = 'B', trackState, onRegisterAudio, deckAudioRefs }) => {
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
          <Transport
            isPlaying={isPlaying}
            isPaused={isPaused}
            currentTrack={currentTrack}
            currentTime={currentTime}
            duration={duration}
            isCueMode={isCueMode}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onCue={handleCue}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSeek={handleSeek}
          />
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
          <JogWheel 
            onScratch={() => {}}
            onTouch={() => {}}
            onRelease={() => {}}
            isActive={false}
          />
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
          <VUWaveform
            vuLevels={vuLevels}
            peakHold={peakHold}
            peakLevels={peakLevels}
            dbLevels={dbLevels}
            waveformData={waveformData}
            frequencyData={frequencyData}
            currentTime={currentTime}
            duration={duration}
          />
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

export default DeckWidget;