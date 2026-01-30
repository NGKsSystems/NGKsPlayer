import React, { useState, useEffect, useRef } from 'react';
import './DJSimple.css';
import { DualAudioDriver } from '../audio/dualDriver.js';
import SoundSnippetPads from '../components/SoundSnippetPads.jsx';
import { DeckWidget, MixerWidget, VisualizersWidget, EQWidget, LibraryWidget, SnippetsWidget } from '../components/DJWidgets.jsx';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../DJ/Mixer/Common/Toast';

function DJSimple({ onNavigate }) {
  
  // Audio refs for dual decks
  const audioRefA = useRef(new Audio());
  const audioRefB = useRef(new Audio());
  
  // Audio context refs for DJ cue functionality
  const audioContextRef = useRef(null);
  const sourceNodeA = useRef(null);
  const sourceNodeB = useRef(null);
  const panNodeA = useRef(null);
  const panNodeB = useRef(null);
  const gainNodeA = useRef(null);
  const gainNodeB = useRef(null);
  
  // Analyzer nodes for VU meters and waveforms
  const analyzerNodeA = useRef(null);
  const analyzerNodeB = useRef(null);
  const dataArrayA = useRef(null);
  const dataArrayB = useRef(null);
  
  // Animation frame refs
  const animationFrameA = useRef(null);
  const animationFrameB = useRef(null);

  // Initialize Audio Context for DJ features
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Set up audio event listeners and keyboard shortcuts
  useEffect(() => {
    const audioA = audioRefA.current;
    const audioB = audioRefB.current;

    const handleEndedA = () => {
      setIsPlayingA(false);
      stopVuMeterAnimation('A');
    };
    const handleEndedB = () => {
      setIsPlayingB(false);
      stopVuMeterAnimation('B');
    };
    
    const handleErrorA = (e) => {
      console.error('Audio A error:', e.target.error);
      setIsPlayingA(false);
    };
    
    const handleErrorB = (e) => {
      console.error('Audio B error:', e.target.error);
      setIsPlayingB(false);
    };

    const handleLoadedMetadataA = () => {
      setDurationA(audioA.duration || 0);
    };

    const handleLoadedMetadataB = () => {
      setDurationB(audioB.duration || 0);
    };

    const handleTimeUpdateA = () => {
      setPositionA(audioA.currentTime || 0);
    };

    const handleTimeUpdateB = () => {
      setPositionB(audioB.currentTime || 0);
    };

    // Keyboard shortcuts
    const handleKeyDown = (event) => {
      // Prevent if user is typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
      
      const key = event.key.toLowerCase();
      const ctrlKey = event.ctrlKey;
      const shiftKey = event.shiftKey;
      
      // Only handle specific keys to avoid interfering with other functionality
      const handledKeys = ['arrowright', 'arrowleft', '.', ',', '>', '<', ']', '[', '=', '+', '-', '_', ' ', 'c'];
      if (!handledKeys.includes(key)) return;
      
      // Deck A controls (default) - Deck B with Shift
      const deck = shiftKey ? 'B' : 'A';
      
      switch (key) {
        // 5 second jumps
        case 'arrowright':
          if (ctrlKey) {
            event.preventDefault();
            skipForward(deck, 5);
          }
          break;
        case 'arrowleft':
          if (ctrlKey) {
            event.preventDefault();
            skipBackward(deck, 5);
          }
          break;
          
        // 1 second jumps
        case '.':
        case '>':
          event.preventDefault();
          fineTune(deck, 1);
          break;
        case ',':
        case '<':
          event.preventDefault();
          fineTune(deck, -1);
          break;
          
        // 0.5 second jumps
        case ']':
          event.preventDefault();
          fineTune(deck, 0.5);
          break;
        case '[':
          event.preventDefault();
          fineTune(deck, -0.5);
          break;
          
        // 0.1 second jumps
        case '=':
        case '+':
          event.preventDefault();
          fineTune(deck, 0.1);
          break;
        case '-':
        case '_':
          event.preventDefault();
          fineTune(deck, -0.1);
          break;
          
        // Play/Pause
        case ' ':
          event.preventDefault();
          console.log(`Keyboard: Toggle play for Deck ${deck}`);
          togglePlay(deck);
          break;
          
        // Cue
        case 'c':
          event.preventDefault();
          console.log(`Keyboard: Toggle cue for Deck ${deck}`);
          toggleCue(deck);
          break;
      }
    };

    if (audioA) {
      audioA.addEventListener('ended', handleEndedA);
      audioA.addEventListener('error', handleErrorA);
      audioA.addEventListener('loadedmetadata', handleLoadedMetadataA);
      audioA.addEventListener('timeupdate', handleTimeUpdateA);
    }

    if (audioB) {
      audioB.addEventListener('ended', handleEndedB);
      audioB.addEventListener('error', handleErrorB);
      audioB.addEventListener('loadedmetadata', handleLoadedMetadataB);
      audioB.addEventListener('timeupdate', handleTimeUpdateB);
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      if (audioA) {
        audioA.removeEventListener('ended', handleEndedA);
        audioA.removeEventListener('error', handleErrorA);
        audioA.removeEventListener('loadedmetadata', handleLoadedMetadataA);
        audioA.removeEventListener('timeupdate', handleTimeUpdateA);
      }
      if (audioB) {
        audioB.removeEventListener('ended', handleEndedB);
        audioB.removeEventListener('error', handleErrorB);
        audioB.removeEventListener('loadedmetadata', handleLoadedMetadataB);
        audioB.removeEventListener('timeupdate', handleTimeUpdateB);
      }
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
  
  // Separate search states for dual libraries
  const [searchTermA, setSearchTermA] = useState('');
  const [searchTermB, setSearchTermB] = useState('');
  const [sortByA, setSortByA] = useState('title');
  const [sortByB, setSortByB] = useState('title');

  // Professional DJ Features State
  const [gainA, setGainA] = useState(1.0);
  const [gainB, setGainB] = useState(1.0);
  const [masterVolume, setMasterVolume] = useState(0.8);
  const [cueA, setCueA] = useState(false);
  const [cueB, setCueB] = useState(false);

  // 3-Band EQ
  const [eqHighA, setEqHighA] = useState(0);
  const [eqMidA, setEqMidA] = useState(0);
  const [eqLowA, setEqLowA] = useState(0);
  const [eqHighB, setEqHighB] = useState(0);
  const [eqMidB, setEqMidB] = useState(0);
  const [eqLowB, setEqLowB] = useState(0);

  // Filter Controls
  const [filterA, setFilterA] = useState(0.5);
  const [filterB, setFilterB] = useState(0.5);

  // Hot Cues
  const [hotCuesA, setHotCuesA] = useState(Array(8).fill().map(() => ({ active: false, time: 0, name: '' })));
  const [hotCuesB, setHotCuesB] = useState(Array(8).fill().map(() => ({ active: false, time: 0, name: '' })));

  // Loop Controls
  const [loopA, setLoopA] = useState({ active: false, start: 0, end: 0, size: 1 });
  const [loopB, setLoopB] = useState({ active: false, start: 0, end: 0, size: 1 });

  // Pitch Controls
  const [pitchA, setPitchA] = useState(0);
  const [pitchB, setPitchB] = useState(0);

  // Effects
  const [effectsDelay, setEffectsDelay] = useState(0);
  const [effectsFlanger, setEffectsFlanger] = useState(0);
  const [effectsFilter, setEffectsFilter] = useState(0);

  // Recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // VU Meters and Waveforms
  const [vuMeterA, setVuMeterA] = useState(0);
  const [vuMeterB, setVuMeterB] = useState(0);
  const [waveformA, setWaveformA] = useState(Array(64).fill(0));
  const [waveformB, setWaveformB] = useState(Array(64).fill(0));

  // 16-Band EQ State
  const frequencies = ['20Hz', '25Hz', '31Hz', '40Hz', '50Hz', '63Hz', '80Hz', '100Hz', '125Hz', '160Hz', '200Hz', '250Hz', '315Hz', '400Hz', '500Hz', '630Hz'];
  const [eq16BandA, setEq16BandA] = useState(Array(16).fill(0));
  const [eq16BandB, setEq16BandB] = useState(Array(16).fill(0));
  const [eqACollapsed, setEqACollapsed] = useState(false);
  const [eqBCollapsed, setEqBCollapsed] = useState(false);

  // Widget Layout State - Default positions for desktop-like interface
  const [widgetLayouts, setWidgetLayouts] = useState({
    'deck-a': { position: { x: 50, y: 50 }, size: { width: 320, height: 500 } },
    'deck-b': { position: { x: 1200, y: 50 }, size: { width: 320, height: 500 } },
    'mixer': { position: { x: 400, y: 50 }, size: { width: 350, height: 600 } },
    'visualizers': { position: { x: 780, y: 50 }, size: { width: 380, height: 300 } },
    'eq-a': { position: { x: 50, y: 580 }, size: { width: 300, height: 200 } },
    'eq-b': { position: { x: 1200, y: 580 }, size: { width: 300, height: 200 } },
    'library': { position: { x: 400, y: 680 }, size: { width: 500, height: 300 } },
    'snippets': { position: { x: 780, y: 380 }, size: { width: 420, height: 350 } }
  });

  // Widget layout handlers
  const handleWidgetPositionChange = (widgetId, newPosition) => {
    setWidgetLayouts(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], position: newPosition }
    }));
  };

  const handleWidgetSizeChange = (widgetId, newSize) => {
    setWidgetLayouts(prev => ({
      ...prev,
      [widgetId]: { ...prev[widgetId], size: newSize }
    }));
  };

  // Load tracks on component mount
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      setToast({ message: 'Loading music library...', type: 'info' });
      
      // Get tracks from the library system
      const response = await window.api.invoke('library:getTracks');
      
      console.log('Raw tracks response:', response);
      console.log('First track structure:', response?.[0]);
      
      if (response && response.length > 0) {
        setTracks(response);
        setToast({ message: `Loaded ${response.length} tracks`, type: 'success' });
      } else {
        setTracks([]);
        setToast({ message: 'No tracks found. Please scan your music library.', type: 'info' });
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
      setTracks([]);
      setToast({ message: 'Error loading music library', type: 'error' });
    }
  };

  // Helper Functions
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilteredTracksA = () => {
    let filtered = tracks;
    
    if (searchTermA) {
      filtered = filtered.filter(track => 
        track.title?.toLowerCase().includes(searchTermA.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchTermA.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchTermA.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortByA) {
        case 'artist': return (a.artist || '').localeCompare(b.artist || '');
        case 'bpm': return (a.bpm || 0) - (b.bpm || 0);
        case 'key': return (a.key || '').localeCompare(b.key || '');
        case 'genre': return (a.genre || '').localeCompare(b.genre || '');
        default: return (a.title || '').localeCompare(b.title || '');
      }
    });
  };

  const getFilteredTracksB = () => {
    let filtered = tracks;
    
    if (searchTermB) {
      filtered = filtered.filter(track => 
        track.title?.toLowerCase().includes(searchTermB.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchTermB.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchTermB.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortByB) {
        case 'artist': return (a.artist || '').localeCompare(b.artist || '');
        case 'bpm': return (a.bpm || 0) - (b.bpm || 0);
        case 'key': return (a.key || '').localeCompare(b.key || '');
        case 'genre': return (a.genre || '').localeCompare(b.genre || '');
        default: return (a.title || '').localeCompare(b.title || '');
      }
    });
  };

  // DJ Control Functions
  const setupAudioRouting = (deck, audioElement) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    
    if (deck === 'A') {
      // Only create nodes if they don't exist
      if (!sourceNodeA.current) {
        try {
          sourceNodeA.current = ctx.createMediaElementSource(audioElement);
          panNodeA.current = ctx.createStereoPanner();
          gainNodeA.current = ctx.createGain();
          
          // Create analyzer for VU meter and waveform
          analyzerNodeA.current = ctx.createAnalyser();
          analyzerNodeA.current.fftSize = 128; // 64 frequency bins
          analyzerNodeA.current.smoothingTimeConstant = 0.8;
          
          const bufferLength = analyzerNodeA.current.frequencyBinCount;
          dataArrayA.current = new Uint8Array(bufferLength);
          
          // Connect: source -> analyzer -> gain -> pan -> destination
          sourceNodeA.current.connect(analyzerNodeA.current);
          analyzerNodeA.current.connect(gainNodeA.current);
          gainNodeA.current.connect(panNodeA.current);
          panNodeA.current.connect(ctx.destination);
          
          console.log('Audio routing with analyzer setup for Deck A');
          startVuMeterAnimation('A');
        } catch (error) {
          console.error('Error setting up audio routing for Deck A:', error);
        }
      }
      
      // Update values
      if (gainNodeA.current) gainNodeA.current.gain.value = gainA;
      if (panNodeA.current) panNodeA.current.pan.value = cueA ? 1 : -1;
      
    } else {
      // Only create nodes if they don't exist
      if (!sourceNodeB.current) {
        try {
          sourceNodeB.current = ctx.createMediaElementSource(audioElement);
          panNodeB.current = ctx.createStereoPanner();
          gainNodeB.current = ctx.createGain();
          
          // Create analyzer for VU meter and waveform
          analyzerNodeB.current = ctx.createAnalyser();
          analyzerNodeB.current.fftSize = 128; // 64 frequency bins
          analyzerNodeB.current.smoothingTimeConstant = 0.8;
          
          const bufferLength = analyzerNodeB.current.frequencyBinCount;
          dataArrayB.current = new Uint8Array(bufferLength);
          
          // Connect: source -> analyzer -> gain -> pan -> destination
          sourceNodeB.current.connect(analyzerNodeB.current);
          analyzerNodeB.current.connect(gainNodeB.current);
          gainNodeB.current.connect(panNodeB.current);
          panNodeB.current.connect(ctx.destination);
          
          console.log('Audio routing with analyzer setup for Deck B');
          startVuMeterAnimation('B');
        } catch (error) {
          console.error('Error setting up audio routing for Deck B:', error);
        }
      }
      
      // Update values
      if (gainNodeB.current) gainNodeB.current.gain.value = gainB;
      if (panNodeB.current) panNodeB.current.pan.value = cueB ? 1 : -1;
    }
  };

  const loadTrack = async (deck, track) => {
    console.log('Loading track:', track.title, 'Path:', track.filePath);
    
    try {
      if (deck === 'A') {
        setTrackA(track);
        const localPath = `local://${track.filePath}`;
        audioRefA.current.src = localPath;
        await audioRefA.current.load();
        
        // Set up audio routing only if AudioContext is ready
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          setupAudioRouting('A', audioRefA.current);
        }
      } else {
        setTrackB(track);
        const localPath = `local://${track.filePath}`;
        audioRefB.current.src = localPath;
        await audioRefB.current.load();
        
        // Set up audio routing only if AudioContext is ready
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          setupAudioRouting('B', audioRefB.current);
        }
      }
      setToast({ message: `Loaded "${track.title}" to Deck ${deck}`, type: 'success' });
    } catch (error) {
      console.error('Error loading track:', error);
      setToast({ message: `Failed to load "${track.title}"`, type: 'error' });
    }
  };

  const togglePlay = async (deck) => {
    console.log(`togglePlay called for Deck ${deck}`);
    console.log(`Track loaded: ${deck === 'A' ? trackA?.title : trackB?.title}`);
    console.log(`Currently playing: ${deck === 'A' ? isPlayingA : isPlayingB}`);
    
    try {
      // Initialize and resume AudioContext on first user interaction
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('AudioContext resumed');
        }
        
        // Set up audio routing if not already done
        if (deck === 'A' && trackA && !sourceNodeA.current) {
          console.log('Setting up audio routing for Deck A');
          setupAudioRouting('A', audioRefA.current);
        } else if (deck === 'B' && trackB && !sourceNodeB.current) {
          console.log('Setting up audio routing for Deck B');
          setupAudioRouting('B', audioRefB.current);
        }
      }
      
      if (deck === 'A') {
        if (trackA) {
          if (isPlayingA) {
            console.log('Pausing Deck A');
            audioRefA.current.pause();
            setIsPlayingA(false);
            stopVuMeterAnimation('A');
          } else {
            console.log('Playing track A:', trackA.title);
            console.log('Audio src:', audioRefA.current.src);
            await audioRefA.current.play();
            setIsPlayingA(true);
            if (analyzerNodeA.current) {
              startVuMeterAnimation('A');
            }
          }
        } else {
          console.log('No track loaded in Deck A');
          setToast({ message: 'No track loaded in Deck A', type: 'warning' });
        }
      } else {
        if (trackB) {
          if (isPlayingB) {
            console.log('Pausing Deck B');
            audioRefB.current.pause();
            setIsPlayingB(false);
            stopVuMeterAnimation('B');
          } else {
            console.log('Playing track B:', trackB.title);
            console.log('Audio src:', audioRefB.current.src);
            await audioRefB.current.play();
            setIsPlayingB(true);
            if (analyzerNodeB.current) {
              startVuMeterAnimation('B');
            }
          }
        } else {
          console.log('No track loaded in Deck B');
          setToast({ message: 'No track loaded in Deck B', type: 'warning' });
        }
      }
    } catch (error) {
      console.error('Playback error:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: error.code
      });
      // Reset play state if there was an error
      if (deck === 'A') {
        setIsPlayingA(false);
      } else {
        setIsPlayingB(false);
      }
      setToast({ message: `Playback error: ${error.message}`, type: 'error' });
    }
  };

  const toggleCue = (deck) => {
    if (deck === 'A') {
      const newCueState = !cueA;
      setCueA(newCueState);
      // Update audio routing: main goes to left (-1), cue goes to right (1)
      if (panNodeA.current) {
        panNodeA.current.pan.value = newCueState ? 1 : -1;
      }
      console.log(`Deck A cue ${newCueState ? 'ON (right ear)' : 'OFF (left ear)'}`);
    } else {
      const newCueState = !cueB;
      setCueB(newCueState);
      // Update audio routing: main goes to left (-1), cue goes to right (1)
      if (panNodeB.current) {
        panNodeB.current.pan.value = newCueState ? 1 : -1;
      }
      console.log(`Deck B cue ${newCueState ? 'ON (right ear)' : 'OFF (left ear)'}`);
    }
  };

  // Progress bar and seeking - works whether playing or paused
  const handleSeek = (deck, event) => {
    const rect = event.target.getBoundingClientRect();
    const percent = (event.clientX - rect.left) / rect.width;
    
    if (deck === 'A' && audioRefA.current && durationA > 0) {
      const newTime = Math.max(0, Math.min(durationA, percent * durationA));
      audioRefA.current.currentTime = newTime;
      setPositionA(newTime);
      console.log(`Deck A seeked to ${formatTime(newTime)}`);
    } else if (deck === 'B' && audioRefB.current && durationB > 0) {
      const newTime = Math.max(0, Math.min(durationB, percent * durationB));
      audioRefB.current.currentTime = newTime;
      setPositionB(newTime);
      console.log(`Deck B seeked to ${formatTime(newTime)}`);
    }
  };

  // Drag seeking for progress bar
  const [isDragging, setIsDragging] = useState({ A: false, B: false });

  const handleMouseDown = (deck, event) => {
    setIsDragging(prev => ({ ...prev, [deck]: true }));
    handleSeek(deck, event);
  };

  const handleMouseMove = (deck, event) => {
    if (isDragging[deck]) {
      handleSeek(deck, event);
    }
  };

  const handleMouseUp = (deck) => {
    setIsDragging(prev => ({ ...prev, [deck]: false }));
  };

  // Skip functions - 5 seconds
  const skipForward = (deck, seconds = 5) => {
    if (deck === 'A' && audioRefA.current && durationA > 0) {
      const newTime = Math.min(durationA, audioRefA.current.currentTime + seconds);
      audioRefA.current.currentTime = newTime;
      setPositionA(newTime);
      console.log(`Deck A skipped forward ${seconds}s to ${formatTime(newTime)}`);
    } else if (deck === 'B' && audioRefB.current && durationB > 0) {
      const newTime = Math.min(durationB, audioRefB.current.currentTime + seconds);
      audioRefB.current.currentTime = newTime;
      setPositionB(newTime);
      console.log(`Deck B skipped forward ${seconds}s to ${formatTime(newTime)}`);
    }
  };

  const skipBackward = (deck, seconds = 5) => {
    if (deck === 'A' && audioRefA.current) {
      const newTime = Math.max(0, audioRefA.current.currentTime - seconds);
      audioRefA.current.currentTime = newTime;
      setPositionA(newTime);
      console.log(`Deck A skipped backward ${seconds}s to ${formatTime(newTime)}`);
    } else if (deck === 'B' && audioRefB.current) {
      const newTime = Math.max(0, audioRefB.current.currentTime - seconds);
      audioRefB.current.currentTime = newTime;
      setPositionB(newTime);
      console.log(`Deck B skipped backward ${seconds}s to ${formatTime(newTime)}`);
    }
  };

  // Fine tune - adjustable increments (0.1, 0.5, 1, 5 seconds)
  const fineTune = (deck, seconds) => {
    if (deck === 'A' && audioRefA.current) {
      const newTime = Math.max(0, Math.min(durationA || Infinity, audioRefA.current.currentTime + seconds));
      audioRefA.current.currentTime = newTime;
      setPositionA(newTime);
      console.log(`Deck A fine-tuned ${seconds > 0 ? '+' : ''}${seconds}s to ${formatTime(newTime)}`);
    } else if (deck === 'B' && audioRefB.current) {
      const newTime = Math.max(0, Math.min(durationB || Infinity, audioRefB.current.currentTime + seconds));
      audioRefB.current.currentTime = newTime;
      setPositionB(newTime);
      console.log(`Deck B fine-tuned ${seconds > 0 ? '+' : ''}${seconds}s to ${formatTime(newTime)}`);
    }
  };

  // Hot Cue functions
  const setHotCue = (deck, cueIndex) => {
    const currentTime = deck === 'A' ? positionA : positionB;
    
    if (deck === 'A') {
      const newCues = [...hotCuesA];
      newCues[cueIndex] = { active: true, time: currentTime, name: `${cueIndex + 1}` };
      setHotCuesA(newCues);
    } else {
      const newCues = [...hotCuesB];
      newCues[cueIndex] = { active: true, time: currentTime, name: `${cueIndex + 1}` };
      setHotCuesB(newCues);
    }
    console.log(`Hot cue ${cueIndex + 1} set at ${formatTime(currentTime)} for Deck ${deck}`);
  };

  const jumpToHotCue = (deck, cueIndex) => {
    const cues = deck === 'A' ? hotCuesA : hotCuesB;
    const cue = cues[cueIndex];
    
    if (cue.active) {
      if (deck === 'A' && audioRefA.current) {
        audioRefA.current.currentTime = cue.time;
        setPositionA(cue.time);
      } else if (deck === 'B' && audioRefB.current) {
        audioRefB.current.currentTime = cue.time;
        setPositionB(cue.time);
      }
      console.log(`Jumped to hot cue ${cueIndex + 1} at ${formatTime(cue.time)} for Deck ${deck}`);
    }
  };

  const clearHotCue = (deck, cueIndex) => {
    if (deck === 'A') {
      const newCues = [...hotCuesA];
      newCues[cueIndex] = { active: false, time: 0, name: '' };
      setHotCuesA(newCues);
    } else {
      const newCues = [...hotCuesB];
      newCues[cueIndex] = { active: false, time: 0, name: '' };
      setHotCuesB(newCues);
    }
    console.log(`Hot cue ${cueIndex + 1} cleared for Deck ${deck}`);
  };

  // Tempo adjustment state (±0.2 seconds)
  const [tempoAdjustA, setTempoAdjustA] = useState(0); // -0.2 to +0.2
  const [tempoAdjustB, setTempoAdjustB] = useState(0); // -0.2 to +0.2
  
  // VU Meter and Waveform state already declared above

  const handleTempoChange = (deck, value) => {
    const adjustment = parseFloat(value);
    if (deck === 'A') {
      const oldAdjust = tempoAdjustA;
      setTempoAdjustA(adjustment);
      // Apply tempo adjustment difference to current position
      if (audioRefA.current && trackA && durationA > 0) {
        const diff = adjustment - oldAdjust;
        fineTune('A', diff);
      }
    } else {
      const oldAdjust = tempoAdjustB;
      setTempoAdjustB(adjustment);
      // Apply tempo adjustment difference to current position
      if (audioRefB.current && trackB && durationB > 0) {
        const diff = adjustment - oldAdjust;
        fineTune('B', diff);
      }
    }
  };

  const resetTempo = (deck) => {
    if (deck === 'A') {
      setTempoAdjustA(0);
    } else {
      setTempoAdjustB(0);
    }
  };

  // VU Meter and Waveform Animation
  const startVuMeterAnimation = (deck) => {
    console.log(`Starting VU meter animation for deck ${deck}`);
    const analyzer = deck === 'A' ? analyzerNodeA.current : analyzerNodeB.current;
    const dataArray = deck === 'A' ? dataArrayA.current : dataArrayB.current;
    const audio = deck === 'A' ? audioRefA.current : audioRefB.current;
    
    if (!analyzer || !dataArray) {
      console.log(`VU meter animation failed - analyzer: ${!!analyzer}, dataArray: ${!!dataArray}`);
      return;
    }
    
    if (!audio) {
      console.log(`VU meter animation failed - audio element not found for deck ${deck}`);
      return;
    }
    
    // Check AudioContext state
    if (audioContextRef.current) {
      console.log(`AudioContext state: ${audioContextRef.current.state}`);
    }
    
    const animate = () => {
      // Only process audio if playing
      if (!audio.paused && !audio.ended) {
        console.log(`Deck ${deck} - Audio playing, current time: ${audio.currentTime}`);
        // Get frequency data for waveform
        analyzer.getByteFrequencyData(dataArray);
        
        // Debug: Check if we're getting any frequency data (limit console spam)
        const totalEnergy = dataArray.reduce((sum, val) => sum + val, 0);
        if (totalEnergy > 0 && Math.random() < 0.01) { // Only log 1% of the time to avoid spam
          console.log(`Deck ${deck} - Audio energy: ${totalEnergy}, RMS will be calculated`);
        }
        
        // Enhanced VU meter calculation with frequency weighting
        let weightedSum = 0;
        let totalWeight = 0;
        
        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i];
          const frequency = (i / dataArray.length) * (audioContextRef.current.sampleRate / 2);
          
          // Weight mid frequencies (200Hz-4kHz) more heavily for better VU response
          let weight = 1;
          if (frequency >= 200 && frequency <= 4000) {
            weight = 2.5; // Boost vocal/instrument range
          } else if (frequency >= 80 && frequency <= 200) {
            weight = 1.5; // Slight boost for bass
          } else if (frequency > 8000) {
            weight = 0.7; // Reduce high frequencies
          }
          
          weightedSum += (value * value) * weight;
          totalWeight += weight;
        }
        
        const rms = Math.sqrt(weightedSum / totalWeight);
        const vuValue = Math.min(100, (rms / 180) * 100); // Adjusted sensitivity
        
        // Enhanced waveform data with frequency distribution
        const waveformSample = [];
        const binStep = Math.floor(dataArray.length / 64);
        
        for (let i = 0; i < 64; i++) {
          // Average multiple bins for smoother visualization
          let binSum = 0;
          let binCount = 0;
          const startBin = i * binStep;
          const endBin = Math.min(startBin + binStep, dataArray.length);
          
          for (let j = startBin; j < endBin; j++) {
            binSum += dataArray[j];
            binCount++;
          }
          
          const binAverage = binCount > 0 ? binSum / binCount : 0;
          waveformSample.push(Math.floor(binAverage));
        }
        
        // Update state with debugging
        if (deck === 'A') {
          console.log(`Setting VU Meter A to: ${vuValue}`);
          setVuMeterA(vuValue);
          setWaveformA(waveformSample);
          animationFrameA.current = requestAnimationFrame(animate);
        } else {
          console.log(`Setting VU Meter B to: ${vuValue}`);
          setVuMeterB(vuValue);
          setWaveformB(waveformSample);
          animationFrameB.current = requestAnimationFrame(animate);
        }
      } else {
        // Fade out when not playing
        if (deck === 'A') {
          setVuMeterA(prev => Math.max(0, prev * 0.92));
          setWaveformA(prev => prev.map(val => Math.max(0, Math.floor(val * 0.95))));
          animationFrameA.current = requestAnimationFrame(animate);
        } else {
          setVuMeterB(prev => Math.max(0, prev * 0.92));
          setWaveformB(prev => prev.map(val => Math.max(0, Math.floor(val * 0.95))));
          animationFrameB.current = requestAnimationFrame(animate);
        }
      }
    };
    
    animate();
  };

  const stopVuMeterAnimation = (deck) => {
    if (deck === 'A' && animationFrameA.current) {
      cancelAnimationFrame(animationFrameA.current);
      animationFrameA.current = null;
      setVuMeterA(0);
      setWaveformA(Array(64).fill(0));
    } else if (deck === 'B' && animationFrameB.current) {
      cancelAnimationFrame(animationFrameB.current);
      animationFrameB.current = null;
      setVuMeterB(0);
      setWaveformB(Array(64).fill(0));
    }
  };

  const adjustGain = (deck, delta) => {
    if (deck === 'A') {
      setGainA(prev => Math.max(0, Math.min(2, prev + delta)));
    } else {
      setGainB(prev => Math.max(0, Math.min(2, prev + delta)));
    }
  };

  const adjustEQ = (deck, band, value) => {
    const clampedValue = Math.max(-20, Math.min(20, value));
    if (deck === 'A') {
      switch (band) {
        case 'high': setEqHighA(clampedValue); break;
        case 'mid': setEqMidA(clampedValue); break;
        case 'low': setEqLowA(clampedValue); break;
      }
    } else {
      switch (band) {
        case 'high': setEqHighB(clampedValue); break;
        case 'mid': setEqMidB(clampedValue); break;
        case 'low': setEqLowB(clampedValue); break;
      }
    }
  };

  const adjustFilter = (deck, value) => {
    if (deck === 'A') {
      setFilterA(value);
    } else {
      setFilterB(value);
    }
  };

  const adjustPitch = (deck, delta) => {
    if (deck === 'A') {
      setPitchA(prev => Math.max(-20, Math.min(20, prev + delta)));
    } else {
      setPitchB(prev => Math.max(-20, Math.min(20, prev + delta)));
    }
  };





  const toggleLoop = (deck) => {
    if (deck === 'A') {
      setLoopA(prev => ({ ...prev, active: !prev.active }));
    } else {
      setLoopB(prev => ({ ...prev, active: !prev.active }));
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      setRecordingTime(0);
    }
  };

  const adjust16BandEQ = (deck, bandIndex, value) => {
    const clampedValue = Math.max(-20, Math.min(20, value));
    if (deck === 'A') {
      const newEQ = [...eq16BandA];
      newEQ[bandIndex] = clampedValue;
      setEq16BandA(newEQ);
    } else {
      const newEQ = [...eq16BandB];
      newEQ[bandIndex] = clampedValue;
      setEq16BandB(newEQ);
    }
  };

  return (
    <div className="dj-workspace">
      {/* Optional grid helper */}
      <div className="workspace-grid"></div>
      
      {/* Header Bar */}
      <div className="workspace-header">
        <button className="back-btn" onClick={() => onNavigate('Dashboard')}>
          ← Back to Dashboard
        </button>
        <h1>NGKs DJ Professional - Modular Workspace</h1>
        <div className="status-indicators">
          <div className={`status-dot ${isPlayingA || isPlayingB ? 'active' : ''}`}></div>
          <span>{isPlayingA || isPlayingB ? 'LIVE' : 'STANDBY'}</span>
        </div>
      </div>

      {/* Deck A Widget */}
      <DeckWidget 
        deck="A"
        position={widgetLayouts['deck-a'].position}
        size={widgetLayouts['deck-a'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="deck-content">
          <h3>Deck A Content</h3>
          <p>Track: {trackA?.title || 'No track loaded'}</p>
          <p>Playing: {isPlayingA ? 'Yes' : 'No'}</p>
        </div>
      </DeckWidget>

      {/* Deck B Widget */}
      <DeckWidget 
        deck="B"
        position={widgetLayouts['deck-b'].position}
        size={widgetLayouts['deck-b'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="deck-content">
          <h3>Deck B Content</h3>
          <p>Track: {trackB?.title || 'No track loaded'}</p>
          <p>Playing: {isPlayingB ? 'Yes' : 'No'}</p>
        </div>
      </DeckWidget>

      {/* Mixer Widget */}
      <MixerWidget
        position={widgetLayouts['mixer'].position}
        size={widgetLayouts['mixer'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="mixer-content">
          <h3>Mixer Controls</h3>
          <p>Crossfader: {Math.round(crossfader * 100)}%</p>
          <p>Master Volume: {Math.round(masterVolume * 100)}%</p>
        </div>
      </MixerWidget>

      {/* Visualizers Widget */}
      <VisualizersWidget
        position={widgetLayouts['visualizers'].position}
        size={widgetLayouts['visualizers'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="visualizers-content">
          <h3>VU Meters & Waveforms</h3>
          <p>VU A: {Math.round(vuMeterA)}%</p>
          <p>VU B: {Math.round(vuMeterB)}%</p>
        </div>
      </VisualizersWidget>

      {/* Library Widget */}
      <LibraryWidget
        position={widgetLayouts['library'].position}
        size={widgetLayouts['library'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="library-content">
          <h3>Music Library</h3>
          <p>Tracks loaded: {tracks.length}</p>
        </div>
      </LibraryWidget>

      {/* Sound Snippets Widget */}
      <SnippetsWidget
        position={widgetLayouts['snippets'].position}
        size={widgetLayouts['snippets'].size}
        onPositionChange={handleWidgetPositionChange}
        onSizeChange={handleWidgetSizeChange}
      >
        <div className="snippets-content">
          <h3>Sound Snippets</h3>
          <SoundSnippetPads />
        </div>
      </SnippetsWidget>

      {/* Toast notifications */}
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

export default DJSimple;
                style={{ left: `${durationA > 0 ? (positionA / durationA) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="transport-controls">
            <button 
              className="transport-btn"
              onClick={() => skipBackward('A', 5)}
              title="Skip backward 5s (Ctrl+←)"
            >
              ⏮️
            </button>
            <button 
              className="transport-btn"
              onClick={() => fineTune('A', -1)}
              title="Step backward 1s (,)"
            >
              ⏪
            </button>
            <button 
              className="transport-btn"
              onClick={() => fineTune('A', 1)}
              title="Step forward 1s (.)"
            >
              ⏩
            </button>
            <button 
              className="transport-btn"
              onClick={() => skipForward('A', 5)}
              title="Skip forward 5s (Ctrl+→)"
            >
              ⏭️
            </button>
          </div>

          {/* Fine Tune Controls */}
          <div className="fine-tune-controls">
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('A', -0.1)}
              title="Fine tune -0.1s (-)"
            >
              -0.1
            </button>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('A', -0.5)}
              title="Fine tune -0.5s ([)"
            >
              -0.5
            </button>
            <span className="fine-tune-label">Fine Tune</span>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('A', 0.5)}
              title="Fine tune +0.5s (])"
            >
              +0.5
            </button>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('A', 0.1)}
              title="Fine tune +0.1s (+)"
            >
              +0.1
            </button>
          </div>

          {/* Tempo Adjustment Slider */}
          <div className="tempo-adjust-container">
            <label className="tempo-label">Tempo Adjust: {tempoAdjustA.toFixed(2)}s</label>
            <input
              type="range"
              min="-0.2"
              max="0.2"
              step="0.01"
              value={tempoAdjustA}
              onChange={(e) => handleTempoChange('A', e.target.value)}
              className="tempo-slider"
            />
            <button 
              className="tempo-reset-btn"
              onClick={() => resetTempo('A')}
              title="Reset tempo adjustment"
            >
              Reset
            </button>
          </div>

          {/* Main Transport Controls */}
          <div className="main-transport-controls">
            <button 
              className={`play-btn-large ${isPlayingA ? 'playing' : ''}`}
              onClick={() => togglePlay('A')}
            >
              {isPlayingA ? '⏸️' : '▶️'}
            </button>
            <button 
              className={`cue-btn-large ${cueA ? 'active' : ''}`}
              onClick={() => toggleCue('A')}
            >
              CUE
            </button>
          </div>

          {/* Hot Cues Section */}
          <div className="hot-cues-section">
            <div className="section-title">HOT CUES</div>
            <div className="hot-cues-grid">
              {hotCuesA.map((cue, index) => (
                <button
                  key={index}
                  className={`hot-cue-btn ${cue.active ? 'active' : ''}`}
                  onClick={() => cue.active ? jumpToHotCue('A', index) : setHotCue('A', index)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    clearHotCue('A', index);
                  }}
                  title={cue.active ? `Jump to cue ${index + 1} (${formatTime(cue.time)})` : `Set hot cue ${index + 1}`}
                >
                  {index + 1}
                  {cue.active && <div className="cue-time">{formatTime(cue.time)}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* VU Meter for Deck A */}
          <div className="vu-meter">
            <div className="vu-meter-label">VU METER</div>
            <div className="vu-bars">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className={`vu-bar ${vuMeterA > (i * 5) ? 'active' : ''} ${i > 15 ? 'red' : i > 10 ? 'yellow' : 'green'}`}
                ></div>
              ))}
            </div>
          </div>

          {/* Waveform Display */}
          <div className="waveform-display">
            <div className="waveform-label">WAVEFORM</div>
            <div className="waveform">
              {waveformA.map((amplitude, i) => (
                <div 
                  key={i} 
                  className="waveform-bar" 
                  style={{ 
                    height: `${amplitude}%`,
                    opacity: isPlayingA ? 1 : 0.3 
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Loop Controls */}
          <div className="loop-controls">
            <div className="section-title">LOOP</div>
            <div className="loop-buttons">
              <button
                className={`loop-btn ${loopA.active ? 'active' : ''}`}
                onClick={() => toggleLoop('A')}
              >
                {loopA.active ? 'LOOP OFF' : 'LOOP ON'}
              </button>
              <select
                value={loopA.size}
                onChange={(e) => setLoopA({...loopA, size: parseFloat(e.target.value)})}
                className="loop-size-select"
              >
                <option value={0.25}>1/4</option>
                <option value={0.5}>1/2</option>
                <option value={1}>1 BAR</option>
                <option value={2}>2 BAR</option>
                <option value={4}>4 BAR</option>
                <option value={8}>8 BAR</option>
              </select>
            </div>
          </div>

          {/* Pitch/Tempo Controls */}
          <div className="pitch-controls">
            <div className="section-title">PITCH</div>
            <div className="pitch-display">{pitchA > 0 ? '+' : ''}{pitchA.toFixed(1)}%</div>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={pitchA}
              onChange={(e) => adjustPitch('A', parseFloat(e.target.value) - pitchA)}
              className="pitch-slider"
            />
            <div className="pitch-buttons">
              <button onClick={() => adjustPitch('A', -0.1)}>-</button>
              <button onClick={() => setPitchA(0)}>0</button>
              <button onClick={() => adjustPitch('A', 0.1)}>+</button>
            </div>
          </div>

          {/* 3-Band EQ */}
          <div className="eq-section">
            <div className="section-title">EQ</div>
            <div className="eq-controls">
              <div className="eq-band">
                <label>HIGH</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqHighA / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('A', 'high', eqHighA + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqHighA.toFixed(0)}dB</span>
                </div>
              </div>
              <div className="eq-band">
                <label>MID</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqMidA / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('A', 'mid', eqMidA + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqMidA.toFixed(0)}dB</span>
                </div>
              </div>
              <div className="eq-band">
                <label>LOW</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqLowA / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('A', 'low', eqLowA + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqLowA.toFixed(0)}dB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Control */}
          <div className="filter-section">
            <div className="section-title">FILTER</div>
            <div className="filter-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filterA}
                onChange={(e) => adjustFilter('A', parseFloat(e.target.value))}
                className="filter-slider"
              />
              <div className="filter-labels">
                <span>LP</span>
                <span>HP</span>
              </div>
            </div>
          </div>

          {/* Gain Control */}
          <div className="gain-control">
            <label>GAIN</label>
            <div className="knob-container">
              <div 
                className="rotary-knob gain-knob"
                style={{ transform: `rotate(${(gainA - 1) * 180}deg)` }}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  adjustGain('A', delta);
                }}
              >
                <div className="knob-pointer"></div>
              </div>
              <span className="knob-value">{gainA.toFixed(1)}</span>
            </div>
          </div>
        </section>

        {/* Center Mixer */}
        <section className="mixer-center">
          <div className="mixer-header">
            <h2>MIXER</h2>
            <div className="recording-section">
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={toggleRecording}
              >
                {isRecording ? '⏹️ STOP' : '🔴 REC'}
              </button>
              {isRecording && (
                <div className="recording-time">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
          
          {/* Channel Faders */}
          <div className="channel-faders">
            <div className="channel-fader">
              <label>DECK A</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={volumeA}
                onChange={(e) => setVolumeA(parseFloat(e.target.value))}
                className="vertical-fader"
                orient="vertical"
              />
              <span className="fader-value">{Math.round(volumeA * 100)}</span>
            </div>

            <div className="crossfader-section">
              <label>CROSSFADER</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={crossfader}
                onChange={(e) => setCrossfader(parseFloat(e.target.value))}
                className="crossfader"
              />
              <div className="crossfader-labels">
                <span>A</span>
                <span>B</span>
              </div>
            </div>

            <div className="channel-fader">
              <label>DECK B</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.01"
                value={volumeB}
                onChange={(e) => setVolumeB(parseFloat(e.target.value))}
                className="vertical-fader"
                orient="vertical"
              />
              <span className="fader-value">{Math.round(volumeB * 100)}</span>
            </div>
          </div>

          {/* Effects Rack */}
          <div className="effects-rack">
            <div className="section-title">EFFECTS</div>
            <div className="effects-grid">
              <div className="effect-unit">
                <label>DELAY</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob effect-knob"
                    style={{ transform: `rotate(${effectsDelay * 270}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.05 : 0.05;
                      setEffectsDelay(Math.max(0, Math.min(1, effectsDelay + delta)));
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{Math.round(effectsDelay * 100)}%</span>
                </div>
              </div>
              
              <div className="effect-unit">
                <label>FLANGER</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob effect-knob"
                    style={{ transform: `rotate(${effectsFlanger * 270}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.05 : 0.05;
                      setEffectsFlanger(Math.max(0, Math.min(1, effectsFlanger + delta)));
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{Math.round(effectsFlanger * 100)}%</span>
                </div>
              </div>

              <div className="effect-unit">
                <label>FILTER</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob effect-knob"
                    style={{ transform: `rotate(${effectsFilter * 270}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.05 : 0.05;
                      setEffectsFilter(Math.max(0, Math.min(1, effectsFilter + delta)));
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{Math.round(effectsFilter * 100)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Master Output */}
          <div className="master-output">
            <div className="section-title">MASTER</div>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.01"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="master-volume"
            />
            <span className="master-value">{Math.round(masterVolume * 100)}%</span>
          </div>

          {/* Sound Snippet Pads */}
          <div className="snippet-section">
            <SoundSnippetPads onNavigate={onNavigate} />
          </div>
        </section>

        {/* Right Deck B */}
        <section className="deck deck-b">
          <div className="deck-header">
            <h2>DECK B</h2>
            <div className="deck-bpm-key">
              <span>BPM: {trackB?.bpm || '--'}</span>
              <span>Key: {trackB?.key || '--'}</span>
            </div>
          </div>
          
          <div className="track-info">
            <div className="track-title">{trackB?.title || 'No Track Loaded'}</div>
            <div className="track-artist">{trackB?.artist || ''}</div>
            <div className="track-time">
              {formatTime(positionB)} / {formatTime(durationB)}
            </div>
          </div>

          {/* Progress Bar - Draggable */}
          <div className="progress-container">
            <div 
              className="progress-bar"
              onMouseDown={(e) => handleMouseDown('B', e)}
              onMouseMove={(e) => handleMouseMove('B', e)}
              onMouseUp={() => handleMouseUp('B')}
              onMouseLeave={() => handleMouseUp('B')}
              onClick={(e) => handleSeek('B', e)}
            >
              <div 
                className="progress-fill"
                style={{ width: `${durationB > 0 ? (positionB / durationB) * 100 : 0}%` }}
              ></div>
              <div 
                className="progress-handle"
                style={{ left: `${durationB > 0 ? (positionB / durationB) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="transport-controls">
            <button 
              className="transport-btn"
              onClick={() => skipBackward('B', 5)}
              title="Skip backward 5s (Shift+Ctrl+←)"
            >
              ⏮️
            </button>
            <button 
              className="transport-btn"
              onClick={() => fineTune('B', -1)}
              title="Step backward 1s (Shift+,)"
            >
              ⏪
            </button>
            <button 
              className="transport-btn"
              onClick={() => fineTune('B', 1)}
              title="Step forward 1s (Shift+.)"
            >
              ⏩
            </button>
            <button 
              className="transport-btn"
              onClick={() => skipForward('B', 5)}
              title="Skip forward 5s (Shift+Ctrl+→)"
            >
              ⏭️
            </button>
          </div>

          {/* Fine Tune Controls */}
          <div className="fine-tune-controls">
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('B', -0.1)}
              title="Fine tune -0.1s (Shift+-)"
            >
              -0.1
            </button>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('B', -0.5)}
              title="Fine tune -0.5s (Shift+[)"
            >
              -0.5
            </button>
            <span className="fine-tune-label">Fine Tune</span>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('B', 0.5)}
              title="Fine tune +0.5s (Shift+])"
            >
              +0.5
            </button>
            <button 
              className="fine-tune-btn small"
              onClick={() => fineTune('B', 0.1)}
              title="Fine tune +0.1s (Shift++)"
            >
              +0.1
            </button>
          </div>

          {/* Tempo Adjustment Slider */}
          <div className="tempo-adjust-container">
            <label className="tempo-label">Tempo Adjust: {tempoAdjustB.toFixed(2)}s</label>
            <input
              type="range"
              min="-0.2"
              max="0.2"
              step="0.01"
              value={tempoAdjustB}
              onChange={(e) => handleTempoChange('B', e.target.value)}
              className="tempo-slider"
            />
            <button 
              className="tempo-reset-btn"
              onClick={() => resetTempo('B')}
              title="Reset tempo adjustment"
            >
              Reset
            </button>
          </div>

          {/* Main Transport Controls */}
          <div className="main-transport-controls">
            <button 
              className={`play-btn-large ${isPlayingB ? 'playing' : ''}`}
              onClick={() => togglePlay('B')}
            >
              {isPlayingB ? '⏸️' : '▶️'}
            </button>
            <button 
              className={`cue-btn-large ${cueB ? 'active' : ''}`}
              onClick={() => toggleCue('B')}
            >
              CUE
            </button>
          </div>

          {/* Hot Cues Section */}
          <div className="hot-cues-section">
            <div className="section-title">HOT CUES</div>
            <div className="hot-cues-grid">
              {hotCuesB.map((cue, index) => (
                <button
                  key={index}
                  className={`hot-cue-btn ${cue.active ? 'active' : ''}`}
                  onClick={() => cue.active ? jumpToHotCue('B', index) : setHotCue('B', index)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    clearHotCue('B', index);
                  }}
                  title={cue.active ? `Jump to cue ${index + 1} (${formatTime(cue.time)})` : `Set hot cue ${index + 1}`}
                >
                  {index + 1}
                  {cue.active && <div className="cue-time">{formatTime(cue.time)}</div>}
                </button>
              ))}
            </div>
          </div>

          {/* VU Meter for Deck B */}
          <div className="vu-meter">
            <div className="vu-meter-label">VU METER</div>
            <div className="vu-bars">
              {[...Array(20)].map((_, i) => (
                <div 
                  key={i} 
                  className={`vu-bar ${vuMeterB > (i * 5) ? 'active' : ''} ${i > 15 ? 'red' : i > 10 ? 'yellow' : 'green'}`}
                ></div>
              ))}
            </div>
          </div>

          {/* Waveform Display */}
          <div className="waveform-display">
            <div className="waveform-label">WAVEFORM</div>
            <div className="waveform">
              {waveformB.map((amplitude, i) => (
                <div 
                  key={i} 
                  className="waveform-bar" 
                  style={{ 
                    height: `${amplitude}%`,
                    opacity: isPlayingB ? 1 : 0.3 
                  }}
                ></div>
              ))}
            </div>
          </div>

          {/* Loop Controls */}
          <div className="loop-controls">
            <div className="section-title">LOOP</div>
            <div className="loop-buttons">
              <button
                className={`loop-btn ${loopB.active ? 'active' : ''}`}
                onClick={() => toggleLoop('B')}
              >
                {loopB.active ? 'LOOP OFF' : 'LOOP ON'}
              </button>
              <select
                value={loopB.size}
                onChange={(e) => setLoopB({...loopB, size: parseFloat(e.target.value)})}
                className="loop-size-select"
              >
                <option value={0.25}>1/4</option>
                <option value={0.5}>1/2</option>
                <option value={1}>1 BAR</option>
                <option value={2}>2 BAR</option>
                <option value={4}>4 BAR</option>
                <option value={8}>8 BAR</option>
              </select>
            </div>
          </div>

          {/* Pitch/Tempo Controls */}
          <div className="pitch-controls">
            <div className="section-title">PITCH</div>
            <div className="pitch-display">{pitchB > 0 ? '+' : ''}{pitchB.toFixed(1)}%</div>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.1"
              value={pitchB}
              onChange={(e) => adjustPitch('B', parseFloat(e.target.value) - pitchB)}
              className="pitch-slider"
            />
            <div className="pitch-buttons">
              <button onClick={() => adjustPitch('B', -0.1)}>-</button>
              <button onClick={() => setPitchB(0)}>0</button>
              <button onClick={() => adjustPitch('B', 0.1)}>+</button>
            </div>
          </div>

          {/* 3-Band EQ */}
          <div className="eq-section">
            <div className="section-title">EQ</div>
            <div className="eq-controls">
              <div className="eq-band">
                <label>HIGH</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqHighB / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('B', 'high', eqHighB + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqHighB.toFixed(0)}dB</span>
                </div>
              </div>
              <div className="eq-band">
                <label>MID</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqMidB / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('B', 'mid', eqMidB + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqMidB.toFixed(0)}dB</span>
                </div>
              </div>
              <div className="eq-band">
                <label>LOW</label>
                <div className="knob-container">
                  <div 
                    className="rotary-knob eq-knob"
                    style={{ transform: `rotate(${(eqLowB / 20) * 270 - 135}deg)` }}
                    onWheel={(e) => {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -1 : 1;
                      adjustEQ('B', 'low', eqLowB + delta);
                    }}
                  >
                    <div className="knob-pointer"></div>
                  </div>
                  <span className="knob-value">{eqLowB.toFixed(0)}dB</span>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Control */}
          <div className="filter-section">
            <div className="section-title">FILTER</div>
            <div className="filter-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filterB}
                onChange={(e) => adjustFilter('B', parseFloat(e.target.value))}
                className="filter-slider"
              />
              <div className="filter-labels">
                <span>LP</span>
                <span>HP</span>
              </div>
            </div>
          </div>

          {/* Gain Control */}
          <div className="gain-control">
            <label>GAIN</label>
            <div className="knob-container">
              <div 
                className="rotary-knob gain-knob"
                style={{ transform: `rotate(${(gainB - 1) * 180}deg)` }}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  adjustGain('B', delta);
                }}
              >
                <div className="knob-pointer"></div>
              </div>
              <span className="knob-value">{gainB.toFixed(1)}</span>
            </div>
          </div>
        </section>
      </main>

      {/* 16-Band EQ Section */}
      <section className="eq-band-section">
        <div className="eq-band-container">
          {/* Deck A 16-Band EQ */}
          <div className="eq-16band deck-a-eq">
            <div className="eq-header" onClick={() => setEqACollapsed(!eqACollapsed)}>
              <h3>DECK A - 16 BAND EQ</h3>
              <span className={`collapse-icon ${eqACollapsed ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!eqACollapsed && (
              <div className="eq-bands-grid">
                {eq16BandA.map((value, index) => (
                  <div key={index} className="eq-band-control">
                    <label>{frequencies[index]}</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={value}
                      onChange={(e) => adjust16BandEQ('A', index, parseFloat(e.target.value))}
                      className="eq-band-slider vertical"
                      orient="vertical"
                    />
                    <span className="eq-value">{value.toFixed(1)}dB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Deck B 16-Band EQ */}
          <div className="eq-16band deck-b-eq">
            <div className="eq-header" onClick={() => setEqBCollapsed(!eqBCollapsed)}>
              <h3>DECK B - 16 BAND EQ</h3>
              <span className={`collapse-icon ${eqBCollapsed ? 'collapsed' : ''}`}>▼</span>
            </div>
            {!eqBCollapsed && (
              <div className="eq-bands-grid">
                {eq16BandB.map((value, index) => (
                  <div key={index} className="eq-band-control">
                    <label>{frequencies[index]}</label>
                    <input
                      type="range"
                      min="-20"
                      max="20"
                      step="0.5"
                      value={value}
                      onChange={(e) => adjust16BandEQ('B', index, parseFloat(e.target.value))}
                      className="eq-band-slider vertical"
                      orient="vertical"
                    />
                    <span className="eq-value">{value.toFixed(1)}dB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dual Library Section */}
      <section className="library-section">
        <div className="dual-library-container">
          {/* Deck A Library */}
          <div className="library-panel deck-a-library">
            <div className="library-header">
              <h2>DECK A LIBRARY</h2>
              <div className="library-controls">
                <input
                  type="text"
                  placeholder="Search tracks for Deck A..."
                  value={searchTermA}
                  onChange={(e) => setSearchTermA(e.target.value)}
                  className="search-input"
                />
                <select
                  value={sortByA}
                  onChange={(e) => setSortByA(e.target.value)}
                  className="sort-select"
                >
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                  <option value="bpm">BPM</option>
                  <option value="key">Key</option>
                  <option value="genre">Genre</option>
                </select>
              </div>
            </div>

            <div className="library-content">
              <div className="library-table">
                <div className="table-header">
                  <div className="col-title">Title</div>
                  <div className="col-artist">Artist</div>
                  <div className="col-bpm">BPM</div>
                  <div className="col-key">Key</div>
                  <div className="col-duration">Duration</div>
                  <div className="col-actions">Load</div>
                </div>
                
                <div className="table-body">
                  {getFilteredTracksA().map((track, index) => (
                    <div key={`a-${index}`} className="table-row">
                      <div className="col-title">{track.title}</div>
                      <div className="col-artist">{track.artist}</div>
                      <div className="col-bpm">{track.bpm}</div>
                      <div className="col-key">{track.key}</div>
                      <div className="col-duration">{formatTime(track.duration)}</div>
                      <div className="col-actions">
                        <button
                          className="load-deck-btn deck-a-load"
                          onClick={() => loadTrack('A', track)}
                        >
                          LOAD A
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Deck B Library */}
          <div className="library-panel deck-b-library">
            <div className="library-header">
              <h2>DECK B LIBRARY</h2>
              <div className="library-controls">
                <input
                  type="text"
                  placeholder="Search tracks for Deck B..."
                  value={searchTermB}
                  onChange={(e) => setSearchTermB(e.target.value)}
                  className="search-input"
                />
                <select
                  value={sortByB}
                  onChange={(e) => setSortByB(e.target.value)}
                  className="sort-select"
                >
                  <option value="title">Title</option>
                  <option value="artist">Artist</option>
                  <option value="bpm">BPM</option>
                  <option value="key">Key</option>
                  <option value="genre">Genre</option>
                </select>
              </div>
            </div>

            <div className="library-content">
              <div className="library-table">
                <div className="table-header">
                  <div className="col-title">Title</div>
                  <div className="col-artist">Artist</div>
                  <div className="col-bpm">BPM</div>
                  <div className="col-key">Key</div>
                  <div className="col-duration">Duration</div>
                  <div className="col-actions">Load</div>
                </div>
                
                <div className="table-body">
                  {getFilteredTracksB().map((track, index) => (
                    <div key={`b-${index}`} className="table-row">
                      <div className="col-title">{track.title}</div>
                      <div className="col-artist">{track.artist}</div>
                      <div className="col-bpm">{track.bpm}</div>
                      <div className="col-key">{track.key}</div>
                      <div className="col-duration">{formatTime(track.duration)}</div>
                      <div className="col-actions">
                        <button
                          className="load-deck-btn deck-b-load"
                          onClick={() => loadTrack('B', track)}
                        >
                          LOAD B
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Library Actions */}
        <div className="library-actions">
          <button 
            className="scan-btn"
            onClick={async () => {
              try {
                setToast({ message: 'Scanning music library...', type: 'info' });
                const result = await window.api.invoke('library:autoScan');
                await loadTracks(); // Refresh the tracks after scanning
                setToast({ 
                  message: `Scan completed! Added ${result.added} tracks (${result.total} total)`, 
                  type: 'success' 
                });
              } catch (error) {
                console.error('Error scanning music:', error);
                setToast({ message: 'Error scanning music library', type: 'error' });
              }
            }}
          >
            SCAN MUSIC LIBRARY
          </button>
          <button 
            className="refresh-btn"
            onClick={loadTracks}
          >
            REFRESH TRACKS
          </button>
        </div>
      </section>

      {/* Toast Notifications */}
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

export default DJSimple;