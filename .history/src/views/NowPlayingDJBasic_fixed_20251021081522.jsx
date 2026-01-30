import React, { useState, useEffect, useRef } from 'react';
import './DJMixer.css';
import { DualAudioDriver } from '../audio/dualDriver.js';
import DJEqualizer from '../components/DJEqualizer.jsx';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../components/Mixer/Common/Toast';

function NowPlayingDJBasic({ onNavigate }) {
  // Audio refs for dual decks
  const audioRefA = useRef(new Audio());
  const audioRefB = useRef(new Audio());
  const driver = useRef(null);

  // Track state for both decks
  const [trackA, setTrackA] = useState(null);
  const [trackB, setTrackB] = useState(null);
  
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [isPlayingB, setIsPlayingB] = useState(false);
  
  const [volumeA, setVolumeA] = useState(1);
  const [volumeB, setVolumeB] = useState(0.8);
  
  const [positionA, setPositionA] = useState(0);
  const [durationA, setDurationA] = useState(0);
  const [positionB, setPositionB] = useState(0);
  const [durationB, setDurationB] = useState(0);
  
  const [crossfader, setCrossfader] = useState(0.5);
  const [tracks, setTracks] = useState([]);
  const [toast, setToast] = useState(null);

  // Cue/Headphone monitoring state
  const [cueA, setCueA] = useState(false);
  const [cueB, setCueB] = useState(false);
  const [cueMixMain, setCueMixMain] = useState(0.3);
  const [cueMixCue, setCueMixCue] = useState(1.0);

  // Fine-tune controls for beatmatching
  const [fineTuneA, setFineTuneA] = useState(0); // -0.5 to +0.5 seconds
  const [fineTuneB, setFineTuneB] = useState(0);

  // Gain and Reverb controls
  const [gainA, setGainA] = useState(1.0); // 0.0 to 2.0 (200% gain)
  const [gainB, setGainB] = useState(1.0);
  const [reverbA, setReverbA] = useState(0); // 0.0 to 1.0 (dry to wet)
  const [reverbB, setReverbB] = useState(0);

  // Audio context and effects nodes
  const audioContextRef = useRef(null);
  const gainNodeA = useRef(null);
  const gainNodeB = useRef(null);
  const reverbNodeA = useRef(null);
  const reverbNodeB = useRef(null);
  const dryGainA = useRef(null);
  const dryGainB = useRef(null);
  const wetGainA = useRef(null);
  const wetGainB = useRef(null);

  // Search states for each deck
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [filteredTracksA, setFilteredTracksA] = useState([]);
  const [filteredTracksB, setFilteredTracksB] = useState([]);

  // EQ collapse states
  const [eqCollapsedA, setEqCollapsedA] = useState(false);
  const [eqCollapsedB, setEqCollapsedB] = useState(false);

  // FF/REV and scrubbing functions
  const rewind = (deck) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) {
      audio.currentTime = Math.max(0, audio.currentTime - 10); // 10 second rewind
    }
  };

  const fastForward = (deck) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    if (audio) {
      audio.currentTime = Math.min(audio.duration, audio.currentTime + 10); // 10 second FF
    }
  };

  const handleProgressClick = (e, deck) => {
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    const duration = deck === 'A' ? durationA : durationB;
    
    if (audio && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      audio.currentTime = newTime;
    }
  };

  // Audio effects setup
  const setupAudioEffects = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    // Create reverb impulse response
    const createReverbImpulse = (duration, decay) => {
      const sampleRate = audioContext.sampleRate;
      const length = sampleRate * duration;
      const impulse = audioContext.createBuffer(2, length, sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
      }
      return impulse;
    };

    // Setup effects for Deck A
    if (!gainNodeA.current) {
      gainNodeA.current = audioContext.createGain();
      reverbNodeA.current = audioContext.createConvolver();
      dryGainA.current = audioContext.createGain();
      wetGainA.current = audioContext.createGain();
      
      reverbNodeA.current.buffer = createReverbImpulse(2, 2);
      gainNodeA.current.gain.value = gainA;
      dryGainA.current.gain.value = 1 - reverbA;
      wetGainA.current.gain.value = reverbA;
    }

    // Setup effects for Deck B
    if (!gainNodeB.current) {
      gainNodeB.current = audioContext.createGain();
      reverbNodeB.current = audioContext.createConvolver();
      dryGainB.current = audioContext.createGain();
      wetGainB.current = audioContext.createGain();
      
      reverbNodeB.current.buffer = createReverbImpulse(2, 2);
      gainNodeB.current.gain.value = gainB;
      dryGainB.current.gain.value = 1 - reverbB;
      wetGainB.current.gain.value = reverbB;
    }
  };

  // Connect audio with effects
  const connectAudioEffects = (audio, deck) => {
    if (!audioContextRef.current || !audio) return;

    const audioContext = audioContextRef.current;
    
    // Check if already connected to avoid multiple MediaElementSource creation
    if (audio._audioSourceConnected) return;
    
    try {
      const source = audioContext.createMediaElementSource(audio);
      audio._audioSourceConnected = true;
      
      if (deck === 'A') {
        // A: source -> gain -> [dry/wet split] -> destination
        source.connect(gainNodeA.current);
        gainNodeA.current.connect(dryGainA.current);
        gainNodeA.current.connect(reverbNodeA.current);
        reverbNodeA.current.connect(wetGainA.current);
        dryGainA.current.connect(audioContext.destination);
        wetGainA.current.connect(audioContext.destination);
      } else {
        // B: source -> gain -> [dry/wet split] -> destination
        source.connect(gainNodeB.current);
        gainNodeB.current.connect(dryGainB.current);
        gainNodeB.current.connect(reverbNodeB.current);
        reverbNodeB.current.connect(wetGainB.current);
        dryGainB.current.connect(audioContext.destination);
        wetGainB.current.connect(audioContext.destination);
      }
    } catch (error) {
      console.warn(`Failed to connect audio effects for deck ${deck}:`, error);
    }
  };

  // Update gain
  const handleGainChange = (value, deck) => {
    const newGain = parseFloat(value);
    if (deck === 'A') {
      setGainA(newGain);
      if (gainNodeA.current) {
        gainNodeA.current.gain.value = newGain;
      }
    } else {
      setGainB(newGain);
      if (gainNodeB.current) {
        gainNodeB.current.gain.value = newGain;
      }
    }
  };

  // Update reverb
  const handleReverbChange = (value, deck) => {
    const newReverb = parseFloat(value);
    if (deck === 'A') {
      setReverbA(newReverb);
      if (dryGainA.current && wetGainA.current) {
        dryGainA.current.gain.value = 1 - newReverb;
        wetGainA.current.gain.value = newReverb;
      }
    } else {
      setReverbB(newReverb);
      if (dryGainB.current && wetGainB.current) {
        dryGainB.current.gain.value = 1 - newReverb;
        wetGainB.current.gain.value = newReverb;
      }
    }
  };

  // Set up hotkeys for beatmatching - works on deck with cue enabled
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return; // Don't trigger on text inputs
      
      // Find which deck has cue enabled for hotkey target
      const targetDeck = cueA ? 'A' : cueB ? 'B' : null;
      const targetAudio = targetDeck === 'A' ? audioRefA.current : targetDeck === 'B' ? audioRefB.current : null;
      if (!targetAudio) return;

      switch (e.key.toLowerCase()) {
        case 'q': // Scrub backward -0.1s
          targetAudio.currentTime = Math.max(0, targetAudio.currentTime - 0.1);
          break;
        case 'w': // Scrub forward +0.1s
          targetAudio.currentTime = Math.min(targetAudio.duration, targetAudio.currentTime + 0.1);
          break;
        case 'a': // Fast scrub backward -0.5s
          targetAudio.currentTime = Math.max(0, targetAudio.currentTime - 0.5);
          break;
        case 's': // Fast scrub forward +0.5s
          targetAudio.currentTime = Math.min(targetAudio.duration, targetAudio.currentTime + 0.5);
          break;
        case 'z': // Crossfader to A
          setCrossfader(0);
          if (driver.current) driver.current.setCrossfader(0);
          break;
        case 'x': // Crossfader to B
          setCrossfader(1);
          if (driver.current) driver.current.setCrossfader(1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cueA, cueB]);

  // Set up dual audio driver
  useEffect(() => {
    driver.current = new DualAudioDriver();
    
    // Attach the audio elements to the driver
    driver.current.attachDecks(audioRefA.current, audioRefB.current);
    
    return () => {
      if (driver.current) {
        // Clean up
      }
    };
  }, []);

  // Format time helper
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Initialize audio effects on component mount
  useEffect(() => {
    setupAudioEffects();
    
    return () => {
      // Cleanup audio context on unmount
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Load tracks from library
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const libraryTracks = await window.api.invoke('library:getTracks', {});
        setTracks(libraryTracks || []);
        console.log('Loaded tracks for DJ decks:', libraryTracks?.length || 0);
      } catch (error) {
        console.error('Failed to load tracks:', error);
        setTracks([]);
        setToast({ message: 'Failed to load track library', type: 'error' });
      }
    };

    loadTracks();
  }, []);

  // Filter tracks for each deck
  useEffect(() => {
    const filterTracks = (query) => {
      if (!query) return tracks.slice(0, 20); // Show first 20 if no search
      return tracks.filter(track => 
        track.title?.toLowerCase().includes(query.toLowerCase()) ||
        track.artist?.toLowerCase().includes(query.toLowerCase()) ||
        track.album?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20);
    };

    setFilteredTracksA(filterTracks(searchA));
    setFilteredTracksB(filterTracks(searchB));
  }, [searchA, searchB, tracks]);

  // Set up position tracking for both decks
  useEffect(() => {
    const interval = setInterval(() => {
      if (audioRefA.current && !audioRefA.current.paused) {
        setPositionA(audioRefA.current.currentTime);
        setDurationA(audioRefA.current.duration || 0);
      }
      if (audioRefB.current && !audioRefB.current.paused) {
        setPositionB(audioRefB.current.currentTime);
        setDurationB(audioRefB.current.duration || 0);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Load track function
  const loadTrack = async (track, deck) => {
    try {
      const audioRef = deck === 'A' ? audioRefA : audioRefB;
      const setTrack = deck === 'A' ? setTrackA : setTrackB;
      const setDuration = deck === 'A' ? setDurationA : setDurationB;
      const setPosition = deck === 'A' ? setPositionA : setPositionB;

      // Extract the file path from the track object
      const trackPath = track.filePath || track.path || track.file_path;
      if (!trackPath) {
        console.error('No path found for track:', track);
        setToast({ message: 'Track path not found', type: 'error' });
        return;
      }

      const audioPath = toLocal(trackPath);
      console.log(`Loading track ${deck}:`, audioPath);

      audioRef.current.src = audioPath;
      audioRef.current.load();

      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration || 0);
        setPosition(0);
        console.log(`Track ${deck} loaded, duration:`, audioRef.current.duration);
        
        // Connect audio effects when track is loaded
        try {
          connectAudioEffects(audioRef.current, deck);
        } catch (error) {
          console.warn(`Could not connect audio effects for deck ${deck}:`, error);
        }
      };

      setTrack(track);
      setToast({ message: `Track loaded to Deck ${deck}`, type: 'success' });
    } catch (error) {
      console.error(`Failed to load track to deck ${deck}:`, error);
      setToast({ message: `Failed to load track to Deck ${deck}`, type: 'error' });
    }
  };

  // Play/pause function
  const togglePlay = async (deck) => {
    try {
      const audioRef = deck === 'A' ? audioRefA : audioRefB;
      const isPlaying = deck === 'A' ? isPlayingA : isPlayingB;
      const setIsPlaying = deck === 'A' ? setIsPlayingA : setIsPlayingB;

      if (!audioRef.current.src) {
        setToast({ message: `No track loaded in Deck ${deck}`, type: 'error' });
        return;
      }

      // Resume audio context if needed
      if (driver.current) {
        await driver.current.resume();
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error(`Failed to toggle play for deck ${deck}:`, error);
      setToast({ message: `Failed to play Deck ${deck}`, type: 'error' });
    }
  };

  // Fine-tune handlers
  const handleFineTuneA = (value) => {
    const clampedValue = Math.max(-0.5, Math.min(0.5, value));
    setFineTuneA(clampedValue);
    if (audioRefA.current) {
      audioRefA.current.currentTime = Math.max(0, audioRefA.current.currentTime + (clampedValue - fineTuneA));
    }
  };

  const handleFineTuneB = (value) => {
    const clampedValue = Math.max(-0.5, Math.min(0.5, value));
    setFineTuneB(clampedValue);
    if (audioRefB.current) {
      audioRefB.current.currentTime = Math.max(0, audioRefB.current.currentTime + (clampedValue - fineTuneB));
    }
  };

  // Toggle cue function
  const toggleCue = (deck) => {
    if (deck === 'A') {
      const newCueA = !cueA;
      setCueA(newCueA);
      if (driver.current) {
        driver.current.setCue('A', newCueA);
      }
    } else if (deck === 'B') {
      const newCueB = !cueB;
      setCueB(newCueB);
      if (driver.current) {
        driver.current.setCue('B', newCueB);
      }
    }
  };

  return (
    <div className="dj-mixer-container">
      {/* Header */}
      <div className="dj-mixer-header">
        <h1 className="dj-mixer-title">NGKs DJ Mode</h1>
        <button
          onClick={() => onNavigate?.('library')}
          className="library-button"
        >
          📚 Library
        </button>
      </div>

      {/* Professional DJ Mixer Layout */}
      <div className="dj-mixer-main">
        
        {/* Deck A - Left Side */}
        <div className="deck-section deck-a">
          <div className="deck-header">
            <h2 className="deck-title">DECK A</h2>
            <button
              onClick={() => toggleCue('A')}
              className={`cue-button ${cueA ? 'cue-active' : 'cue-inactive'}`}
            >
              CUE {cueA ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Track Display */}
          <div className="track-display">
            <div className="track-info">
              <div className="track-title">
                {trackA?.title || 'No Track Loaded'}
              </div>
              <div className="track-artist">
                {trackA?.artist} • {trackA?.album}
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="transport-controls">
            <button
              onClick={() => rewind('A')}
              className="transport-btn rewind-btn"
              disabled={!trackA}
            >
              ⏪ REV
            </button>
            <button
              onClick={() => togglePlay('A')}
              className={`play-button ${isPlayingA ? 'playing' : 'stopped'}`}
              disabled={!trackA}
            >
              {isPlayingA ? '⏸️ PAUSE' : '▶️ PLAY'}
            </button>
            <button
              onClick={() => fastForward('A')}
              className="transport-btn ff-btn"
              disabled={!trackA}
            >
              ⏩ FF
            </button>
          </div>

          {/* Professional Volume Fader */}
          <div className="volume-fader-section">
            <label className="control-label">Volume</label>
            <div className="volume-fader-container">
              <div className="volume-fader-track">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volumeA}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolumeA(newVolume);
                    audioRefA.current.volume = newVolume;
                  }}
                  className="volume-fader"
                  orient="vertical"
                />
                <div className="volume-scale">
                  <div className="scale-mark">10</div>
                  <div className="scale-mark">8</div>
                  <div className="scale-mark">6</div>
                  <div className="scale-mark">4</div>
                  <div className="scale-mark">2</div>
                  <div className="scale-mark">0</div>
                </div>
              </div>
              <div className="volume-value">{Math.round(volumeA * 10)}</div>
            </div>
          </div>

          {/* Additional controls condensed */}
          <div className="deck-controls">
            <div className="progress-section">
              <div className="time-display">
                <span>{formatTime(positionA)}</span>
                <span>{formatTime(durationA)}</span>
              </div>
              <div 
                className="progress-bar"
                onClick={(e) => handleProgressClick(e, 'A')}
              >
                <div 
                  className="progress-fill"
                  style={{ width: durationA > 0 ? `${(positionA / durationA) * 100}%` : '0%' }}
                />
                <div 
                  className="progress-thumb"
                  style={{ left: durationA > 0 ? `${(positionA / durationA) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div className="fine-tune-section">
              <label className="control-label">Fine Tune</label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={fineTuneA}
                onChange={(e) => handleFineTuneA(e.target.value)}
                className="fine-tune-slider"
              />
              <div className="fine-tune-value">
                {fineTuneA > 0 ? '+' : ''}{fineTuneA}s
              </div>
            </div>

            {/* Gain Control */}
            <div className="effect-section">
              <label className="control-label">Gain</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={gainA}
                onChange={(e) => handleGainChange(e.target.value, 'A')}
                className="gain-slider"
              />
              <div className="effect-value">
                {Math.round(gainA * 100)}%
              </div>
            </div>

            {/* Reverb Control */}
            <div className="effect-section">
              <label className="control-label">Reverb</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={reverbA}
                onChange={(e) => handleReverbChange(e.target.value, 'A')}
                className="reverb-slider"
              />
              <div className="effect-value">
                {Math.round(reverbA * 100)}%
              </div>
            </div>

            <DJEqualizer 
              deck="A"
              driver={driver.current}
              isCollapsed={eqCollapsedA}
              onToggleCollapse={() => setEqCollapsedA(!eqCollapsedA)}
            />

            <input
              type="text"
              placeholder="Search tracks for Deck A..."
              value={searchA}
              onChange={(e) => setSearchA(e.target.value)}
              className="track-search-input"
            />

            <div className="track-list">
              {filteredTracksA.length > 0 ? (
                filteredTracksA.map((track, index) => (
                  <div
                    key={index}
                    className="track-item"
                    onClick={() => loadTrack(track, 'A')}
                  >
                    <div className="track-item-info">
                      <div className="track-item-title">{track.title}</div>
                      <div className="track-item-artist">{track.artist}</div>
                    </div>
                    <div className="track-item-duration">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-tracks">
                  {tracks.length === 0 ? 'Loading tracks...' : 'No tracks found'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Mixer Section */}
        <div className="mixer-center">
          
          {/* Professional Crossfader */}
          <div className="crossfader-section">
            <label className="control-label">Crossfader</label>
            <div className="crossfader-container">
              <div className="crossfader-track">
                <div className="crossfader-labels">
                  <span className="crossfader-label-a">A</span>
                  <span className="crossfader-label-center">⚬</span>
                  <span className="crossfader-label-b">B</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={crossfader}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value);
                    setCrossfader(newValue);
                    if (driver.current) {
                      driver.current.setCrossfader(newValue);
                    }
                  }}
                  className="crossfader-slider"
                />
              </div>
            </div>
          </div>

          {/* Cue Mix Controls */}
          <div className="cue-mix-section">
            <h3 className="section-title">Headphone Mix</h3>
            
            <div className="cue-mix-controls">
              <div className="cue-mix-control">
                <label className="control-label">Main</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={cueMixMain}
                  onChange={(e) => setCueMixMain(parseFloat(e.target.value))}
                  className="cue-mix-slider"
                />
                <div className="control-value">{Math.round(cueMixMain * 10)}</div>
              </div>
              
              <div className="cue-mix-control">
                <label className="control-label">Cue</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={cueMixCue}
                  onChange={(e) => setCueMixCue(parseFloat(e.target.value))}
                  className="cue-mix-slider"
                />
                <div className="control-value">{Math.round(cueMixCue * 10)}</div>
              </div>
            </div>
          </div>

          {/* Hotkey Cheat Sheet */}
          <div className="hotkey-section">
            <h3 className="section-title">Hotkeys</h3>
            <div className="hotkey-list">
              <div className="hotkey-item">
                <span className="hotkey-key">Q/W</span>
                <span className="hotkey-desc">Fine tune</span>
              </div>
              <div className="hotkey-item">
                <span className="hotkey-key">A/S</span>
                <span className="hotkey-desc">Fast seek</span>
              </div>
              <div className="hotkey-item">
                <span className="hotkey-key">Z/X</span>
                <span className="hotkey-desc">Crossfader</span>
              </div>
            </div>
          </div>
        </div>

        {/* Deck B - Right Side */}
        <div className="deck-section deck-b">
          <div className="deck-header">
            <h2 className="deck-title">DECK B</h2>
            <button
              onClick={() => toggleCue('B')}
              className={`cue-button ${cueB ? 'cue-active' : 'cue-inactive'}`}
            >
              CUE {cueB ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Track Display */}
          <div className="track-display">
            <div className="track-info">
              <div className="track-title">
                {trackB?.title || 'No Track Loaded'}
              </div>
              <div className="track-artist">
                {trackB?.artist} • {trackB?.album}
              </div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="transport-controls">
            <button
              onClick={() => rewind('B')}
              className="transport-btn rewind-btn"
              disabled={!trackB}
            >
              ⏪ REV
            </button>
            <button
              onClick={() => togglePlay('B')}
              className={`play-button ${isPlayingB ? 'playing' : 'stopped'}`}
              disabled={!trackB}
            >
              {isPlayingB ? '⏸️ PAUSE' : '▶️ PLAY'}
            </button>
            <button
              onClick={() => fastForward('B')}
              className="transport-btn ff-btn"
              disabled={!trackB}
            >
              ⏩ FF
            </button>
          </div>

          {/* Professional Volume Fader */}
          <div className="volume-fader-section">
            <label className="control-label">Volume</label>
            <div className="volume-fader-container">
              <div className="volume-fader-track">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volumeB}
                  onChange={(e) => {
                    const newVolume = parseFloat(e.target.value);
                    setVolumeB(newVolume);
                    audioRefB.current.volume = newVolume;
                  }}
                  className="volume-fader"
                  orient="vertical"
                />
                <div className="volume-scale">
                  <div className="scale-mark">10</div>
                  <div className="scale-mark">8</div>
                  <div className="scale-mark">6</div>
                  <div className="scale-mark">4</div>
                  <div className="scale-mark">2</div>
                  <div className="scale-mark">0</div>
                </div>
              </div>
              <div className="volume-value">{Math.round(volumeB * 10)}</div>
            </div>
          </div>

          {/* Additional controls condensed */}
          <div className="deck-controls">
            <div className="progress-section">
              <div className="time-display">
                <span>{formatTime(positionB)}</span>
                <span>{formatTime(durationB)}</span>
              </div>
              <div 
                className="progress-bar"
                onClick={(e) => handleProgressClick(e, 'B')}
              >
                <div 
                  className="progress-fill"
                  style={{ width: durationB > 0 ? `${(positionB / durationB) * 100}%` : '0%' }}
                />
                <div 
                  className="progress-thumb"
                  style={{ left: durationB > 0 ? `${(positionB / durationB) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div className="fine-tune-section">
              <label className="control-label">Fine Tune</label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={fineTuneB}
                onChange={(e) => handleFineTuneB(e.target.value)}
                className="fine-tune-slider"
              />
              <div className="fine-tune-value">
                {fineTuneB > 0 ? '+' : ''}{fineTuneB}s
              </div>
            </div>

            {/* Gain Control */}
            <div className="effect-section">
              <label className="control-label">Gain</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={gainB}
                onChange={(e) => handleGainChange(e.target.value, 'B')}
                className="gain-slider"
              />
              <div className="effect-value">
                {Math.round(gainB * 100)}%
              </div>
            </div>

            {/* Reverb Control */}
            <div className="effect-section">
              <label className="control-label">Reverb</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={reverbB}
                onChange={(e) => handleReverbChange(e.target.value, 'B')}
                className="reverb-slider"
              />
              <div className="effect-value">
                {Math.round(reverbB * 100)}%
              </div>
            </div>

            <DJEqualizer 
              deck="B"
              driver={driver.current}
              isCollapsed={eqCollapsedB}
              onToggleCollapse={() => setEqCollapsedB(!eqCollapsedB)}
            />

            <input
              type="text"
              placeholder="Search tracks for Deck B..."
              value={searchB}
              onChange={(e) => setSearchB(e.target.value)}
              className="track-search-input"
            />

            <div className="track-list">
              {filteredTracksB.length > 0 ? (
                filteredTracksB.map((track, index) => (
                  <div
                    key={index}
                    className="track-item"
                    onClick={() => loadTrack(track, 'B')}
                  >
                    <div className="track-item-info">
                      <div className="track-item-title">{track.title}</div>
                      <div className="track-item-artist">{track.artist}</div>
                    </div>
                    <div className="track-item-duration">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-tracks">
                  {tracks.length === 0 ? 'Loading tracks...' : 'No tracks found'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default NowPlayingDJBasic;
