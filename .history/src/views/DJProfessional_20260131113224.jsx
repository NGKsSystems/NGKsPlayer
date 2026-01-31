import React, { useState, useEffect, useRef } from 'react';
import './DJMixer.css';
// import '../components/SoundSnippetPads/styles.css';
import { DualAudioDriver } from '../audio/dualDriver.js';
// TEMPORARILY DISABLED - REBUILDING WITH NEW MODULAR STRUCTURE
// import DJEqualizer from '../components/DJEqualizer/index.jsx';
// import VerticalButtonSlider from '../components/VerticalButtonSlider.jsx';
// import SoundSnippetPads from '../components/SoundSnippetPads.jsx';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../DJ/Mixer/Common/Toast';

function DJProfessional({ onNavigate }) {
  
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

  // Microphone input controls
  const [micVolume, setMicVolume] = useState(0.5); // 0.0 to 1.0
  const [micEnabled, setMicEnabled] = useState(false);
  const micStreamRef = useRef(null);
  const micGainNodeRef = useRef(null);

  // Detachable library controls
  const [libraryDetachedA, setLibraryDetachedA] = useState(false);
  const [libraryDetachedB, setLibraryDetachedB] = useState(false);
  const [libraryWindowA, setLibraryWindowA] = useState(null);
  const [libraryWindowB, setLibraryWindowB] = useState(null);

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
  
  // Master volume nodes for crossfader control
  const masterVolumeA = useRef(null);
  const masterVolumeB = useRef(null);

  // EQ audio nodes
  const deckASourceRef = useRef(null);
  const deckBSourceRef = useRef(null);
  const deckAEQOutputRef = useRef(null);
  const deckBEQOutputRef = useRef(null);

  // Search states for each deck
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [filteredTracksA, setFilteredTracksA] = useState([]);
  const [filteredTracksB, setFilteredTracksB] = useState([]);

  // Auto-scaling for different screen sizes
  useEffect(() => {
    const updateScale = () => {
      const container = document.querySelector('.dj-mixer-container');
      if (!container) return;

      const baseWidth = 1920;
      const baseHeight = 1300;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const scaleX = viewportWidth / baseWidth;
      const scaleY = viewportHeight / baseHeight;
      const scale = Math.min(scaleX, scaleY);

      container.style.setProperty('--scale-factor', scale);
      
      // Center the scaled content
      const scaledWidth = baseWidth * scale;
      const scaledHeight = baseHeight * scale;
      const offsetX = (viewportWidth - scaledWidth) / 2;
      const offsetY = (viewportHeight - scaledHeight) / 2;
      
      container.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, []);

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
      masterVolumeA.current = audioContext.createGain();
      
      // EQ nodes for Deck A
      deckASourceRef.current = audioContext.createGain(); // Will be connected from media source
      deckAEQOutputRef.current = audioContext.createGain(); // Will connect to effects chain
      
      // Default bypass connection until EQ component initializes
      deckASourceRef.current.connect(deckAEQOutputRef.current);
      
      reverbNodeA.current.buffer = createReverbImpulse(2, 2);
      gainNodeA.current.gain.value = gainA;
      dryGainA.current.gain.value = 1 - reverbA;
      wetGainA.current.gain.value = reverbA;
      masterVolumeA.current.gain.value = (1 - crossfader) * volumeA;
    }

    // Setup effects for Deck B
    if (!gainNodeB.current) {
      gainNodeB.current = audioContext.createGain();
      reverbNodeB.current = audioContext.createConvolver();
      dryGainB.current = audioContext.createGain();
      wetGainB.current = audioContext.createGain();
      masterVolumeB.current = audioContext.createGain();
      
      // EQ nodes for Deck B
      deckBSourceRef.current = audioContext.createGain(); // Will be connected from media source
      deckBEQOutputRef.current = audioContext.createGain(); // Will connect to effects chain
      
      // Default bypass connection until EQ component initializes
      deckBSourceRef.current.connect(deckBEQOutputRef.current);
      
      reverbNodeB.current.buffer = createReverbImpulse(2, 2);
      gainNodeB.current.gain.value = gainB;
      dryGainB.current.gain.value = 1 - reverbB;
      wetGainB.current.gain.value = reverbB;
      masterVolumeB.current.gain.value = crossfader * volumeB;
    }
  };

  // Connect audio with effects
  const connectAudioEffects = (audio, deck) => {
    console.log(`🔗 CONNECTING: Audio effects for deck ${deck}`);
    if (!audioContextRef.current || !audio) {
      console.warn(`❌ CONNECTING: Missing audioContext (${!!audioContextRef.current}) or audio (${!!audio})`);
      return;
    }

    const audioContext = audioContextRef.current;
    
    // Check if already connected to avoid multiple MediaElementSource creation
    if (audio._audioSourceConnected) {
      console.log(`✅ CONNECTING: Deck ${deck} already connected`);
      return;
    }
    
    try {
      const source = audioContext.createMediaElementSource(audio);
      audio._audioSourceConnected = true;
      console.log(`✅ CONNECTING: Created MediaElementSource for deck ${deck}`);
      
      // Keep HTML5 audio volume for volume controls, Web Audio handles effects
      // Don't mute HTML5 audio - let it handle volume/crossfader
      
      if (deck === 'A') {
        // A: source -> EQ source -> EQ output -> gain -> [dry/wet split] -> destination
        source.connect(deckASourceRef.current);
        deckAEQOutputRef.current.connect(gainNodeA.current);
        gainNodeA.current.connect(dryGainA.current);
        gainNodeA.current.connect(reverbNodeA.current);
        reverbNodeA.current.connect(wetGainA.current);
        dryGainA.current.connect(audioContext.destination);
        wetGainA.current.connect(audioContext.destination);
        console.log(`✅ CONNECTING: Deck A audio chain connected`);
      } else {
        // B: source -> EQ source -> EQ output -> gain -> [dry/wet split] -> destination
        source.connect(deckBSourceRef.current);
        deckBEQOutputRef.current.connect(gainNodeB.current);
        gainNodeB.current.connect(dryGainB.current);
        gainNodeB.current.connect(reverbNodeB.current);
        reverbNodeB.current.connect(wetGainB.current);
        dryGainB.current.connect(audioContext.destination);
        wetGainB.current.connect(audioContext.destination);
        console.log(`✅ CONNECTING: Deck B audio chain connected`);
      }
    } catch (error) {
      console.warn(`❌ CONNECTING: Failed to connect audio effects for deck ${deck}:`, error);
    }
  };

  // Update gain
  const handleGainChange = async (value, deck) => {
    console.log(`🎛️ GAIN: Deck ${deck} changing to ${value}`);
    await ensureAudioContextStarted();
    
    const newGain = parseFloat(value);
    if (deck === 'A') {
      setGainA(newGain);
      if (gainNodeA.current) {
        gainNodeA.current.gain.value = newGain;
        console.log(`✅ GAIN: Deck A set to ${newGain}, actual value: ${gainNodeA.current.gain.value}`);
      } else {
        console.warn(`❌ GAIN: Deck A gainNodeA.current is null!`);
      }
    } else {
      setGainB(newGain);
      if (gainNodeB.current) {
        gainNodeB.current.gain.value = newGain;
        console.log(`✅ GAIN: Deck B set to ${newGain}, actual value: ${gainNodeB.current.gain.value}`);
      } else {
        console.warn(`❌ GAIN: Deck B gainNodeB.current is null!`);
      }
    }
  };

  // Update reverb
  const handleReverbChange = async (value, deck) => {
    console.log(`🔊 REVERB: Deck ${deck} changing to ${value}`);
    await ensureAudioContextStarted();
    
    const newReverb = parseFloat(value);
    if (deck === 'A') {
      setReverbA(newReverb);
      if (dryGainA.current && wetGainA.current) {
        dryGainA.current.gain.value = 1 - newReverb;
        wetGainA.current.gain.value = newReverb;
        console.log(`✅ REVERB: Deck A dry=${1 - newReverb}, wet=${newReverb}`);
      } else {
        console.warn(`❌ REVERB: Deck A nodes missing! dry=${!!dryGainA.current}, wet=${!!wetGainA.current}`);
      }
    } else {
      setReverbB(newReverb);
      if (dryGainB.current && wetGainB.current) {
        dryGainB.current.gain.value = 1 - newReverb;
        wetGainB.current.gain.value = newReverb;
        console.log(`✅ REVERB: Deck B dry=${1 - newReverb}, wet=${newReverb}`);
      } else {
        console.warn(`❌ REVERB: Deck B nodes missing! dry=${!!dryGainB.current}, wet=${!!wetGainB.current}`);
      }
    }
  };

  // Knob adjustment helper functions
  const adjustGain = (deck, amount) => {
    const currentGain = deck === 'A' ? gainA : gainB;
    const newGain = Math.max(0, Math.min(2, currentGain + amount));
    handleGainChange(newGain, deck);
  };

  const resetGain = (deck) => {
    handleGainChange(1.0, deck);
  };

  const adjustReverb = (deck, amount) => {
    const currentReverb = deck === 'A' ? reverbA : reverbB;
    const newReverb = Math.max(0, Math.min(1, currentReverb + amount));
    handleReverbChange(newReverb, deck);
  };

  const resetReverb = (deck) => {
    handleReverbChange(0, deck);
  };

  // Ensure audio context is started (requires user interaction)
  const ensureAudioContextStarted = async () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      try {
        await audioContextRef.current.resume();
        console.log('Audio context resumed');
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  };

  // Microphone setup and control
  const setupMicrophone = async () => {
    try {
      if (!audioContextRef.current) {
        console.warn('Audio context not available for microphone setup');
        return;
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      micStreamRef.current = stream;
      
      // Create microphone source and gain node
      const micSource = audioContextRef.current.createMediaStreamSource(stream);
      micGainNodeRef.current = audioContextRef.current.createGain();
      micGainNodeRef.current.gain.value = micVolume;
      
      // Connect microphone to channel A gain node
      micSource.connect(micGainNodeRef.current);
      if (gainNodeA.current) {
        micGainNodeRef.current.connect(gainNodeA.current);
      }
      
      setMicEnabled(true);
    } catch (error) {
      console.error('Failed to setup microphone:', error);
      setMicEnabled(false);
    }
  };

  const stopMicrophone = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micGainNodeRef.current) {
      micGainNodeRef.current.disconnect();
      micGainNodeRef.current = null;
    }
    setMicEnabled(false);
  };

  const handleMicToggle = () => {
    if (micEnabled) {
      stopMicrophone();
    } else {
      setupMicrophone();
    }
  };

  const handleMicVolumeChange = (value) => {
    const newVolume = parseFloat(value);
    setMicVolume(newVolume);
    if (micGainNodeRef.current) {
      micGainNodeRef.current.gain.value = newVolume;
    }
  };

  // Detachable library functions
  const detachLibrary = (deck) => {
    const deckLetter = deck.toUpperCase();
    const windowFeatures = 'width=400,height=600,resizable=yes,scrollbars=yes';
    const newWindow = window.open('', `library${deckLetter}`, windowFeatures);
    
    if (newWindow) {
      // Set up the detached window
      newWindow.document.title = `NGKs Player - Library ${deckLetter}`;
      newWindow.document.body.innerHTML = `
        <div id="detached-library-${deck}" style="
          background: linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 100%);
          color: #fff;
          font-family: Arial, sans-serif;
          height: 100vh;
          margin: 0;
          padding: 20px;
          box-sizing: border-box;
        ">
          <h2 style="margin-top: 0; color: ${deck === 'a' ? '#4ade80' : '#f87171'};">
            Deck ${deckLetter} Library
          </h2>
          <div id="library-content-${deck}"></div>
        </div>
      `;

      // Store the window reference
      if (deck === 'a') {
        setLibraryWindowA(newWindow);
        setLibraryDetachedA(true);
      } else {
        setLibraryWindowB(newWindow);
        setLibraryDetachedB(true);
      }

      // Handle window close
      newWindow.addEventListener('beforeunload', () => {
        if (deck === 'a') {
          setLibraryDetachedA(false);
          setLibraryWindowA(null);
        } else {
          setLibraryDetachedB(false);
          setLibraryWindowB(null);
        }
      });
    }
  };

  const reattachLibrary = (deck) => {
    if (deck === 'a' && libraryWindowA) {
      libraryWindowA.close();
      setLibraryDetachedA(false);
      setLibraryWindowA(null);
    } else if (deck === 'b' && libraryWindowB) {
      libraryWindowB.close();
      setLibraryDetachedB(false);
      setLibraryWindowB(null);
    }
  };

  // Emergency function to reset all libraries to visible/attached state
  const resetAllLibraries = () => {
    // Close any detached windows
    if (libraryWindowA) {
      libraryWindowA.close();
      setLibraryWindowA(null);
    }
    if (libraryWindowB) {
      libraryWindowB.close();
      setLibraryWindowB(null);
    }
    
    // Reset all detached states
    setLibraryDetachedA(false);
    setLibraryDetachedB(false);
    
    console.log('All libraries reset to attached state');
  };

  // Set up hotkeys for beatmatching - works on deck with cue enabled
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') {
        return;
      }
      
      // Find which deck has cue enabled for hotkey target
      const targetDeck = cueA ? 'A' : cueB ? 'B' : null;
      const targetAudio = targetDeck === 'A' ? audioRefA.current : targetDeck === 'B' ? audioRefB.current : null;
      
      if (!targetAudio) {
        return;
      }

      // Ensure audio is loaded and ready for manipulation
      if (!targetAudio.src) {
        return;
      }
      
      switch (e.key.toLowerCase()) {
        case 'q': // Scrub backward -0.1s
          const newTimeQ = seekAudio(targetAudio, targetAudio.currentTime - 0.1, targetDeck);
          break;
        case 'w': // Scrub forward +0.1s
          const newTimeW = seekAudio(targetAudio, targetAudio.currentTime + 0.1, targetDeck);
          break;
        case 'a': // Fast scrub backward -0.5s
          const newTimeA = seekAudio(targetAudio, targetAudio.currentTime - 0.5, targetDeck);
          break;
        case 's': // Fast scrub forward +0.5s
          const newTimeS = seekAudio(targetAudio, targetAudio.currentTime + 0.5, targetDeck);
          break;
        case 'z': // Crossfader to A
          setCrossfader(0);
          if (driver.current) driver.current.setCrossfader(0);
          break;
        case 'x': // Crossfader to B
          setCrossfader(1);
          if (driver.current) driver.current.setCrossfader(1);
          break;
        case 'l': // Reset all libraries (L for Library)
          if (e.ctrlKey) {
            resetAllLibraries();
            e.preventDefault();
          }
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

  // Apply volume changes to HTML5 audio elements (volume/crossfader)
  useEffect(() => {
    if (audioRefA.current) {
      // Apply crossfader mixing for Deck A
      const adjustedVolumeA = (1 - crossfader) * volumeA;
      audioRefA.current.volume = Math.max(0, Math.min(1, adjustedVolumeA));
    }
  }, [volumeA, crossfader]);

  useEffect(() => {
    if (audioRefB.current) {
      // Apply crossfader mixing for Deck B  
      const adjustedVolumeB = crossfader * volumeB;
      audioRefB.current.volume = Math.max(0, Math.min(1, adjustedVolumeB));
    }
  }, [volumeB, crossfader]);

  // Apply gain changes to Web Audio nodes
  useEffect(() => {
    if (gainNodeA.current) {
      gainNodeA.current.gain.value = gainA;
    }
  }, [gainA]);

  useEffect(() => {
    if (gainNodeB.current) {
      gainNodeB.current.gain.value = gainB;
    }
  }, [gainB]);

  // Apply reverb changes to Web Audio nodes
  useEffect(() => {
    if (dryGainA.current && wetGainA.current) {
      dryGainA.current.gain.value = 1 - reverbA;
      wetGainA.current.gain.value = reverbA;
    }
  }, [reverbA]);

  useEffect(() => {
    if (dryGainB.current && wetGainB.current) {
      dryGainB.current.gain.value = 1 - reverbB;
      wetGainB.current.gain.value = reverbB;
    }
  }, [reverbB]);

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

  // Cleanup microphone on component unmount
  useEffect(() => {
    return () => {
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (micGainNodeRef.current) {
        micGainNodeRef.current.disconnect();
      }
    };
  }, []);

  // Handle volume changes with audio context activation
  const handleVolumeChange = async (value, deck) => {
    await ensureAudioContextStarted();
    
    if (deck === 'A') {
      setVolumeA(value);
    } else {
      setVolumeB(value);
    }
  };

  // Handle crossfader changes with audio context activation
  const handleCrossfaderChange = async (value) => {
    await ensureAudioContextStarted();
    setCrossfader(parseFloat(value));
    
    if (driver.current) {
      driver.current.setCrossfader(parseFloat(value));
    }
  };

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
      audioRef.current.preload = 'metadata'; // Ensure metadata is loaded for seeking
      audioRef.current.load();

      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current.duration || 0);
        setPosition(0);
        console.log(`Track ${deck} loaded, duration:`, audioRef.current.duration, 'readyState:', audioRef.current.readyState);
        
        // Connect audio effects when track is loaded
        try {
          connectAudioEffects(audioRef.current, deck);
        } catch (error) {
          console.warn(`Could not connect audio effects for deck ${deck}:`, error);
        }
      };

      // Track position updates during playback and seeking
      audioRef.current.ontimeupdate = () => {
        setPosition(audioRef.current.currentTime);
      };

      // Handle seeking events
      audioRef.current.onseeked = () => {
        setPosition(audioRef.current.currentTime);
        console.log(`Deck ${deck} seeked to:`, audioRef.current.currentTime);
      };

      // Ensure audio is ready for seeking even when paused
      audioRef.current.oncanplaythrough = () => {
        console.log(`Deck ${deck} ready for seeking (canplaythrough)`);
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

      // Ensure audio context is started
      await ensureAudioContextStarted();

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

  // Fine-tune handlers - for nudging track position forward/backward
  const handleFineTuneA = (value) => {
    const clampedValue = Math.round(Math.max(-0.5, Math.min(0.5, parseFloat(value))) * 100) / 100; // Round to 2 decimal places
    const previousValue = fineTuneA;
    setFineTuneA(clampedValue);
    
    console.log('Fine tuning deck A:', clampedValue, 'Previous:', previousValue);
    
    if (audioRefA.current && audioRefA.current.src) {
      // Calculate the difference and nudge the track position
      const nudgeAmount = Math.round((clampedValue - previousValue) * 100) / 100; // Round to 2 decimal places
      const newTime = Math.max(0, Math.min(audioRefA.current.duration || 999, audioRefA.current.currentTime + nudgeAmount));
      
      console.log(`Nudging deck A by ${nudgeAmount}s to ${newTime}s`);
      
      // Use our reliable seeking function
      seekAudio(audioRefA.current, newTime, 'A');
      
      // Show visual feedback
      setToast({ 
        message: `Deck A Fine Tune: ${clampedValue > 0 ? '+' : ''}${clampedValue.toFixed(2)}s (nudged ${nudgeAmount > 0 ? '+' : ''}${nudgeAmount.toFixed(2)}s)`, 
        type: 'info' 
      });
    }
  };

  const handleFineTuneB = (value) => {
    const clampedValue = Math.round(Math.max(-0.5, Math.min(0.5, parseFloat(value))) * 100) / 100; // Round to 2 decimal places
    const previousValue = fineTuneB;
    setFineTuneB(clampedValue);
    
    console.log('Fine tuning deck B:', clampedValue, 'Previous:', previousValue);
    
    if (audioRefB.current && audioRefB.current.src) {
      // Calculate the difference and nudge the track position
      const nudgeAmount = Math.round((clampedValue - previousValue) * 100) / 100; // Round to 2 decimal places
      const newTime = Math.max(0, Math.min(audioRefB.current.duration || 999, audioRefB.current.currentTime + nudgeAmount));
      
      console.log(`Nudging deck B by ${nudgeAmount}s to ${newTime}s`);
      
      // Use our reliable seeking function
      seekAudio(audioRefB.current, newTime, 'B');
      
      // Show visual feedback
      setToast({ 
        message: `Deck B Fine Tune: ${clampedValue > 0 ? '+' : ''}${clampedValue.toFixed(2)}s (nudged ${nudgeAmount > 0 ? '+' : ''}${nudgeAmount.toFixed(2)}s)`, 
        type: 'info' 
      });
    }
  };

  // Helper function for reliable seeking regardless of playback state
  const seekAudio = (audioElement, targetTime, deck) => {
    const clampedTime = Math.max(0, Math.min(audioElement.duration || 999, targetTime));
    
    console.log(`Seeking deck ${deck} to ${clampedTime}s (paused: ${audioElement.paused}, readyState: ${audioElement.readyState})`);
    
    if (audioElement.readyState >= 1) { // HAVE_METADATA or higher
      // Set the audio time multiple times to ensure it sticks
      audioElement.currentTime = clampedTime;
      
      // Force UI update by updating the position state immediately
      if (deck === 'A') {
        setPositionA(clampedTime);
      } else {
        setPositionB(clampedTime);
      }
      
      // Double-check the seek took effect after a short delay
      setTimeout(() => {
        if (Math.abs(audioElement.currentTime - clampedTime) > 0.1) {
          console.log(`Retrying seek for deck ${deck}`);
          audioElement.currentTime = clampedTime;
        }
      }, 50);
      
      console.log(`✅ Seek applied for deck ${deck}`);
    } else {
      console.log(`⏳ Waiting for deck ${deck} to be ready for seeking`);
      const seekWhenReady = () => {
        audioElement.currentTime = clampedTime;
        if (deck === 'A') {
          setPositionA(clampedTime);
        } else {
          setPositionB(clampedTime);
        }
        console.log(`✅ Delayed seek successful for deck ${deck}`);
        audioElement.removeEventListener('loadedmetadata', seekWhenReady);
      };
      audioElement.addEventListener('loadedmetadata', seekWhenReady);
    }
    
    return clampedTime;
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
    <>
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
            <div className="deck-header-controls">
              <button
                onClick={() => toggleCue('A')}
                className={`cue-button ${cueA ? 'cue-active' : 'cue-inactive'}`}
              >
                CUE {cueA ? 'ON' : 'OFF'}
              </button>
              <button className="hotkey-info-button" title="Hotkeys: Q/W for fine scrub, A/S for fast scrub">
                Q/W
              </button>
            </div>
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
                {fineTuneA > 0 ? '+' : ''}{fineTuneA.toFixed(2)}s
              </div>
              <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                <button 
                  onClick={() => handleFineTuneA(fineTuneA - 0.1)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  ⏪ -0.1s
                </button>
                <button 
                  onClick={() => handleFineTuneA(0)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  Reset
                </button>
                <button 
                  onClick={() => handleFineTuneA(fineTuneA + 0.1)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  ⏩ +0.1s
                </button>
              </div>
            </div>

            {/* Library Section */}
            <div className="library-section">
              <div className="library-header">
                <span className="library-title">Track Library A</span>
                <button
                  onClick={() => libraryDetachedA ? reattachLibrary('a') : detachLibrary('a')}
                  className={`detach-button ${libraryDetachedA ? 'detached' : ''}`}
                >
                  {libraryDetachedA ? '📎 Reattach' : '🔗 Detach'}
                </button>
              </div>

              {!libraryDetachedA && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center Controls Section - Professional Mixer Layout */}
        <div className="center-controls">
          <h2 className="center-title">DJ MIXER</h2>
          
          {/* Unified Crossfader Tile */}
          <div className="unified-crossfader-tile">
            {/* Main Row: Gain/Reverb A | Volume Controls | Gain/Reverb B */}
            <div className="crossfader-main-row">
              {/* Left Side: Deck A Gain & Reverb (Stacked Vertically) */}
              <div className="deck-effects-stack deck-effects-stack-left">
                <div className="stack-title">DECK A</div>
                
                {/* Gain Control A */}
                <div className="effect-section-compact">
                  <label className="control-label">Gain</label>
                  
                  {/* Simulated Knob */}
                  <div className="knob-container">
                    <div 
                      className="simulated-knob gain-knob"
                      style={{
                        transform: `rotate(${(gainA / 2) * 270 - 135}deg)`
                      }}
                    >
                      <div className="knob-indicator"></div>
                    </div>
                  </div>
                  
                  <div className="effect-value">
                    {Math.round(gainA * 100)}%
                  </div>
                  
                  <div className="knob-controls">
                    <button 
                      onClick={() => adjustGain('A', -0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↺
                    </button>
                    <button 
                      onClick={() => resetGain('A')}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ●
                    </button>
                    <button 
                      onClick={() => adjustGain('A', 0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {/* Reverb Control A */}
                <div className="effect-section-compact">
                  <label className="control-label">Reverb</label>
                  
                  {/* Simulated Knob */}
                  <div className="knob-container">
                    <div 
                      className="simulated-knob reverb-knob"
                      style={{
                        transform: `rotate(${reverbA * 270 - 135}deg)`
                      }}
                    >
                      <div className="knob-indicator"></div>
                    </div>
                  </div>
                  
                  <div className="effect-value">
                    {Math.round(reverbA * 100)}%
                  </div>
                  
                  <div className="knob-controls">
                    <button 
                      onClick={() => adjustReverb('A', -0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↺
                    </button>
                    <button 
                      onClick={() => resetReverb('A')}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ●
                    </button>
                    <button 
                      onClick={() => adjustReverb('A', 0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>

              {/* Center: Restructured Layout Following Arrows */}
              <div className="crossfader-center-section">
                
                {/* Top Row: Mic and other functions */}
                <div className="center-top-functions">
                  {/* Mic Section */}
                  <div className="mic-section">
                    <h3>Mic on and volume</h3>
                    <button
                      onClick={handleMicToggle}
                      className={`mic-button ${micEnabled ? 'mic-active' : 'mic-inactive'}`}
                      style={{ marginBottom: '10px' }}
                    >
                      MIC {micEnabled ? 'OFF' : 'OFF'}
                    </button>
                    
                    {micEnabled && (
                      <VerticalButtonSlider
                        value={micVolume}
                        onChange={handleMicVolumeChange}
                        min={0}
                        max={2}
                        steps={10}
                        showValue={true}
                      />
                    )}
                    
                    {/* Library Reset Button */}
                    <button
                      onClick={resetAllLibraries}
                      className="library-reset-button"
                      style={{ 
                        marginTop: '10px', 
                        padding: '8px 12px', 
                        background: '#444', 
                        color: '#fff', 
                        border: '1px solid #666',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                      title="Reset all libraries to attached state (Ctrl+L)"
                    >
                      📚 Reset Libraries
                    </button>
                  </div>

                  {/* Headphone Mix Controls */}
                  <div className="cue-mix-section">
                    <h3 className="section-title">Headphone Mix</h3>
                    
                    <div className="cue-mix-controls">
                      <div className="cue-mix-control">
                        <label className="control-label">MAIN</label>
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
                        <label className="control-label">CUE</label>
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
                </div>

                {/* Bottom Row: Volume Controls and Crossfader */}
                <div className="center-bottom-controls">
                  {/* Volume A Section - Bottom Left */}
                  <div className="volume-a-section volume-bottom-left">
                    <h3>Volume A</h3>
                    <VerticalButtonSlider
                      value={volumeA}
                      onChange={(value) => handleVolumeChange(value, 'A')}
                      min={0}
                      max={1}
                      steps={10}
                      showValue={true}
                    />
                  </div>

                  {/* Crossfader Section - Bottom Center */}
                  <div className="crossfader-section crossfader-bottom-center">
                    <h3>CROSSFADER</h3>
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
                          onChange={(e) => handleCrossfaderChange(e.target.value)}
                          className="crossfader-slider"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Volume B Section - Bottom Right */}
                  <div className="volume-b-section volume-bottom-right">
                    <h3>Volume B</h3>
                    <VerticalButtonSlider
                      value={volumeB}
                      onChange={(value) => handleVolumeChange(value, 'B')}
                      min={0}
                      max={1}
                      steps={10}
                      showValue={true}
                    />
                  </div>
                </div>
              </div>

              {/* Right Side: Deck B Gain & Reverb (Stacked Vertically) */}
              <div className="deck-effects-stack deck-effects-stack-right">
                <div className="stack-title">DECK B</div>
                
                {/* Gain Control B */}
                <div className="effect-section-compact">
                  <label className="control-label">Gain</label>
                  
                  {/* Simulated Knob */}
                  <div className="knob-container">
                    <div 
                      className="simulated-knob gain-knob"
                      style={{
                        transform: `rotate(${(gainB / 2) * 270 - 135}deg)`
                      }}
                    >
                      <div className="knob-indicator"></div>
                    </div>
                  </div>
                  
                  <div className="effect-value">
                    {Math.round(gainB * 100)}%
                  </div>
                  
                  <div className="knob-controls">
                    <button 
                      onClick={() => adjustGain('B', -0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↺
                    </button>
                    <button 
                      onClick={() => resetGain('B')}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ●
                    </button>
                    <button 
                      onClick={() => adjustGain('B', 0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↻
                    </button>
                  </div>
                </div>

                {/* Reverb Control B */}
                <div className="effect-section-compact">
                  <label className="control-label">Reverb</label>
                  
                  {/* Simulated Knob */}
                  <div className="knob-container">
                    <div 
                      className="simulated-knob reverb-knob"
                      style={{
                        transform: `rotate(${reverbB * 270 - 135}deg)`
                      }}
                    >
                      <div className="knob-indicator"></div>
                    </div>
                  </div>
                  
                  <div className="effect-value">
                    {Math.round(reverbB * 100)}%
                  </div>
                  
                  <div className="knob-controls">
                    <button 
                      onClick={() => adjustReverb('B', -0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↺
                    </button>
                    <button 
                      onClick={() => resetReverb('B')}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ●
                    </button>
                    <button 
                      onClick={() => adjustReverb('B', 0.1)}
                      style={{padding: '1px 4px', fontSize: '8px', background: '#333', color: '#fff', border: '1px solid #555'}}
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sound Snippet Pads Section */}
          <div className="center-snippet-pads">
            <SoundSnippetPads onNavigate={onNavigate} />
          </div>

        </div>

        {/* Deck B - Right Side */}
        <div className="deck-section deck-b">
          <div className="deck-header">
            <h2 className="deck-title">DECK B</h2>
            <div className="deck-header-controls">
              <button
                onClick={() => toggleCue('B')}
                className={`cue-button ${cueB ? 'cue-active' : 'cue-inactive'}`}
              >
                CUE {cueB ? 'ON' : 'OFF'}
              </button>
              <button className="hotkey-info-button" title="Hotkeys: O/P for fine scrub, K/L for fast scrub">
                O/P
              </button>
            </div>
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
                {fineTuneB > 0 ? '+' : ''}{fineTuneB.toFixed(2)}s
              </div>
              <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                <button 
                  onClick={() => handleFineTuneB(fineTuneB - 0.1)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  ⏪ -0.1s
                </button>
                <button 
                  onClick={() => handleFineTuneB(0)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  Reset
                </button>
                <button 
                  onClick={() => handleFineTuneB(fineTuneB + 0.1)}
                  style={{padding: '2px 8px', fontSize: '10px', background: '#333', color: '#fff', border: '1px solid #555'}}
                >
                  ⏩ +0.1s
                </button>
              </div>
            </div>

            {/* Library Section */}
            <div className="library-section">
              <div className="library-header">
                <span className="library-title">Track Library B</span>
                <button
                  onClick={() => libraryDetachedB ? reattachLibrary('b') : detachLibrary('b')}
                  className={`detach-button ${libraryDetachedB ? 'detached' : ''}`}
                >
                  {libraryDetachedB ? '📎 Reattach' : '🔗 Detach'}
                </button>
              </div>

              {!libraryDetachedB && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>

        {/* Full-width EQ Section underneath the center mixer */}
        <div className="dj-mixer-eq-section">
          <div className="eq-container">
            <div className="eq-deck-a">
              <div className="eq-header" onClick={() => setEqCollapsedA(!eqCollapsedA)}>
                <span>EQ Deck A</span>
                <span className="eq-toggle">{eqCollapsedA ? '▼' : '▲'}</span>
              </div>
              {!eqCollapsedA && audioContextRef.current && (
                <DJEqualizer
                  deckId="A"
                  audioContext={audioContextRef.current}
                  sourceNode={deckASourceRef.current}
                  destinationNode={deckAEQOutputRef.current}
                  onBandsChange={(bands) => {
                    console.log('Deck A EQ bands:', bands);
                  }}
                />
              )}
            </div>
            <div className="eq-deck-b">
              <div className="eq-header" onClick={() => setEqCollapsedB(!eqCollapsedB)}>
                <span>EQ Deck B</span>
                <span className="eq-toggle">{eqCollapsedB ? '▼' : '▲'}</span>
              </div>
              {!eqCollapsedB && audioContextRef.current && (
                <DJEqualizer
                  deckId="B"
                  audioContext={audioContextRef.current}
                  sourceNode={deckBSourceRef.current}
                  destinationNode={deckBEQOutputRef.current}
                  onBandsChange={(bands) => {
                    console.log('Deck B EQ bands:', bands);
                  }}
                />
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
    </>
  );
}

export default NowPlayingDJBasic;
