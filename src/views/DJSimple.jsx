import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Disc, Headphones, BarChart3, Layers, Volume2, Users, Zap, Scissors, MousePointer } from 'lucide-react';
import DraggableWidget from '../components/DraggableWidget';
import OBSIntegration from '../components/OBSIntegration';
import RequestQueue from '../components/RequestQueue';
import StreamingServices from '../components/StreamingServices';
import CalibrationPanel from '../components/CalibrationPanel';
// Import new modular DJ components
import DeckA from '../DJ/Deck/Deck A';
import DeckB from '../DJ/Deck/Deck B';
import DeckC from '../DJ/Deck/Deck C';
import DeckD from '../DJ/Deck/Deck D';
import SimpleSampler from '../DJ/SimpleSampler';
import EQA from '../DJ/EQ/EQ A';
import EQB from '../DJ/EQ/EQ B';
import EQC from '../DJ/EQ/EQ C';
import EQD from '../DJ/EQ/EQ D';
import LibraryA from '../DJ/Library/Library A';
import LibraryB from '../DJ/Library/Library B';
import LibraryC from '../DJ/Library/Library C';
import LibraryD from '../DJ/Library/Library D';
import Mixer from '../DJ/Mixer';
import LightingControl from '../DJ/Lighting/LightingControl';
import { SettingsProvider } from '../components/SettingsProvider';
import { useLayoutManager } from '../hooks/useLayoutManager';
import AudioManager from '../audio/AudioManager';
import { PlayerStressTest } from '../utils/playerStressTest';
import './DJSimple.css';

const LAYOUT_STORAGE_KEY = 'djsimple-widget-layout';

const getDefaultLayout = () => ({
  deckA: { x: 20, y: 50, width: 300, height: 350, minimized: false },
  deckB: { x: 1090, y: 50, width: 300, height: 350, minimized: false },
  deckC: { x: 20, y: 50, width: 300, height: 350, minimized: false, hidden: true },
  deckD: { x: 1090, y: 50, width: 300, height: 350, minimized: false, hidden: true },
  mixer: { x: 320, y: 50, width: 760, height: 350, minimized: false },
  // Mixer subwidget positions - matching actual Mixer component IDs
  mixerSubwidgets: {
    // ROW 1: Volume Sliders (Left to Right)
    'volume-a': { x: 0, y: 0, width: 77, height: 146 },
    'volume-c': { x: 88, y: 0, width: 77, height: 146 },
    'master-volume': { x: 182, y: 0, width: 80, height: 150 },
    'headphone-volume': { x: 274, y: 0, width: 80, height: 150 },
    'volume-d': { x: 933, y: 0, width: 77, height: 146 },
    'volume-b': { x: 1021, y: 0, width: 77, height: 146 },
    
    // ROW 2: Gain Knobs
    'gain-a': { x: 0, y: 153, width: 75, height: 152 },
    'gain-c': { x: 85, y: 161, width: 75, height: 152 },
    'gain-d': { x: 933, y: 161, width: 75, height: 152 },
    'gain-b': { x: 1018, y: 161, width: 75, height: 152 },
    
    // Microphone Controls (centered top-right)
    'mic-volume': { x: 465, y: 26, width: 87, height: 160 },
    'mic-gain': { x: 591, y: 27, width: 171, height: 171 },
    'microphone': { x: 405, y: 179, width: 270, height: 164 },
    
    // FX Units A & B (top tier)
    'fx-unit-a': { x: 172, y: 174, width: 200, height: 353 },
    'fx-unit-b': { x: 713, y: 174, width: 200, height: 353 },
    
    // ROW 3: Reverb Knobs
    'reverb-a': { x: 0, y: 312, width: 75, height: 152 },
    'reverb-c': { x: 85, y: 317, width: 75, height: 152 },
    'reverb-d': { x: 933, y: 317, width: 75, height: 152 },
    'reverb-b': { x: 1018, y: 317, width: 75, height: 152 },
    
    // MASTER FX (centered horizontally: (1107-251)/2 = 428)
    'master-fx': { x: 428, y: 378, width: 251, height: 380 },
    
    // ROW 4: Filter Knobs
    'filter-a': { x: 0, y: 471, width: 75, height: 152 },
    'filter-c': { x: 85, y: 473, width: 75, height: 152 },
    'filter-d': { x: 933, y: 473, width: 75, height: 152 },
    'filter-b': { x: 1018, y: 473, width: 75, height: 152 },
    
    // FX Units C & D (bottom tier)
    'fx-unit-c': { x: 172, y: 535, width: 200, height: 349 },
    'fx-unit-d': { x: 713, y: 535, width: 200, height: 349 },
    
    // ROW 5: Pitch Knobs
    'pitch-a': { x: 0, y: 630, width: 75, height: 152 },
    'pitch-c': { x: 85, y: 631, width: 75, height: 152 },
    'pitch-d': { x: 933, y: 631, width: 75, height: 152 },
    'pitch-b': { x: 1018, y: 631, width: 75, height: 152 },
    
    // CUE MIX (centered horizontally: (1107-364)/2 = 371)
    'cue-mix': { x: 371, y: 889, width: 364, height: 102 },
    
    // Recording (bottom-left)
    'recording': { x: 0, y: 932, width: 157, height: 140 },
    
    // CROSSFADER (centered horizontally: (1107-600)/2 = 253)
    'crossfader': { x: 253, y: 988, width: 600, height: 80 }
  },
  eqA: { x: 20, y: 410, width: 300, height: 300, minimized: false },
  eqB: { x: 1090, y: 410, width: 300, height: 300, minimized: false },
  libraryA: { x: 20, y: 720, width: 300, height: 480, minimized: false },
  libraryB: { x: 350, y: 720, width: 300, height: 480, minimized: false },
  sampler: { x: 340, y: 410, width: 400, height: 350, minimized: false },
  lighting: { x: 660, y: 720, width: 350, height: 450, minimized: false }
});

const loadLayout = async (currentDeckMode) => {
  try {
    // Use different storage keys for different deck modes
    const storageKey = currentDeckMode === '4deck' 
      ? 'djsimple-widget-layout-4deck' 
      : 'djsimple-widget-layout-2deck';
    
    console.log(`📂 Loading layout for ${currentDeckMode} mode from ${storageKey}`);
    
    // Try to load from localStorage first
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      console.log(`� Found ${currentDeckMode} layout in localStorage:`, parsed);
      
      // Merge with defaults to ensure all widgets exist
      const defaultLayout = getDefaultLayout();
      const merged = { ...defaultLayout, ...parsed };
      
      // Ensure mixerSubwidgets from parsed takes precedence
      if (parsed.mixerSubwidgets) {
        merged.mixerSubwidgets = parsed.mixerSubwidgets;
      }
      
      console.log(`🔀 Merged ${currentDeckMode} layout loaded`);
      return merged;
    } else {
      console.log(`📂 No saved ${currentDeckMode} layout found, using defaults`);
    }
  } catch (error) {
    console.warn(`Failed to load ${currentDeckMode} layout:`, error);
  }
  
  const defaultLayout = getDefaultLayout();
  console.log(`🎯 Using default layout for ${currentDeckMode}`);
  return defaultLayout;
};

const saveLayout = async (layout, currentDeckMode) => {
  try {
    console.log(`💾 saveLayout called for ${currentDeckMode} mode`);
    
    // Use different storage keys for different deck modes
    const storageKey = currentDeckMode === '4deck' 
      ? 'djsimple-widget-layout-4deck' 
      : 'djsimple-widget-layout-2deck';
    
    // Create a clean copy without circular references
    const toSave = {
      version: '2.0',
      timestamp: Date.now(),
      deckMode: currentDeckMode
    };
    
    // Only save primitive data, no functions or circular refs
    for (const [key, value] of Object.entries(layout)) {
      if (typeof value !== 'function' && key !== 'audioManager') {
        toSave[key] = value;
      }
    }

    // Save to localStorage first (with size limit check)
    const jsonString = JSON.stringify(toSave);
    if (jsonString.length < 5000000) { // 5MB limit
      localStorage.setItem(storageKey, jsonString);
      console.log(`✅ Saved ${currentDeckMode} layout to localStorage (${storageKey})`);
    } else {
      console.warn('⚠️ Layout too large for localStorage');
    }

    // Save to Electron if available
    if (window.api?.saveLayout) {
      await window.api.saveLayout(toSave);
      console.log(`✅ Saved ${currentDeckMode} layout to Electron successfully`);
    }
  } catch (error) {
    console.error('❌ Failed to save layout:', error.message);
  }
};const DJSimple = ({ onNavigate }) => {
  // Navigation hook
  const navigate = useNavigate();
  
  // Layout management hook
  const layoutManager = useLayoutManager();
  
  // Audio manager for actual playback
  const audioManagerRef = useRef(null);
  
  // Widget layout state - initialized with defaults, will be loaded from file
  const [widgets, setWidgets] = useState(() => getDefaultLayout());
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  // Gridlines toggle state
  const [showGridlines, setShowGridlines] = useState(false);
  // OBS Integration panel state
  const [showOBSPanel, setShowOBSPanel] = useState(false);
  // Request Queue panel state
  const [showRequestQueue, setShowRequestQueue] = useState(false);
  // Streaming Services panel state
  const [showStreamingServices, setShowStreamingServices] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  // Request count for badge
  const [requestCount, setRequestCount] = useState(0);
  
  // Deck state management - track what's loaded in each deck (NOW SUPPORTS 4 DECKS!)
  const [deckState, setDeckState] = useState({
    A: {
      track: null,
      isPlaying: false,
      position: 0,
      volume: 0.8
    },
    B: {
      track: null,
      isPlaying: false,
      position: 0,
      volume: 0.8
    },
    C: {
      track: null,
      isPlaying: false,
      position: 0,
      volume: 0.8
    },
    D: {
      track: null,
      isPlaying: false,
      position: 0,
      volume: 0.8
    }
  });

  // 4-Deck Layout Mode State
  const [deckMode, setDeckMode] = useState('2deck'); // '2deck' or '4deck'
  const [activeDeckPair, setActiveDeckPair] = useState('AB'); // 'AB' or 'CD' for 4-deck mode
  
  // EQ and Library switching state (which ones to show)
  const [activeLeftEQ, setActiveLeftEQ] = useState('A'); // 'A' or 'C'
  const [activeRightEQ, setActiveRightEQ] = useState('B'); // 'B' or 'D'
  const [activeLeftLibrary, setActiveLeftLibrary] = useState('A'); // 'A' or 'C'
  const [activeRightLibrary, setActiveRightLibrary] = useState('B'); // 'B' or 'D'

  // Adjust layout when switching deck modes
  useEffect(() => {
    // Load the saved layout for the new deck mode
    const loadModeLayout = async () => {
      console.log(`🔄 Switching to ${deckMode} mode`);
      const layout = await loadLayout(deckMode);
      setWidgets(layout);
    };
    
    loadModeLayout();
  }, [deckMode]);

  // Microphone state
  const [microphoneState, setMicrophoneState] = useState({
    isEnabled: false,
    volume: 0.5,
    gain: 0.5,
    reverb: 0.0
  });

  // Listen for request count updates
  useEffect(() => {
    const handleRequestCountUpdate = () => {
      const count = window.requestPendingCount || 0;
      setRequestCount(count);
    };

    window.addEventListener('requestCountUpdated', handleRequestCountUpdate);
    
    // Initial check
    handleRequestCountUpdate();

    return () => {
      window.removeEventListener('requestCountUpdated', handleRequestCountUpdate);
    };
  }, []);

  // Track library state 
  const [tracks, setTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState(null);

  // Load saved layout on mount
  useEffect(() => {
    const loadSavedLayout = async () => {
      const layout = await loadLayout(deckMode);
      setWidgets(layout);
      console.log(`✅ ${deckMode} layout restored on mount`);
    };
    loadSavedLayout();
  }, []); // Empty deps - only run once on mount

  // Auto-save layout whenever widgets change (RE-ENABLED)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        console.log('🔄 Auto-save triggered, widgets changed');
        const widgetData = {};
        Object.entries(widgets).forEach(([id, widget]) => {
          // Special handling for mixerSubwidgets (nested object)
          if (id === 'mixerSubwidgets') {
            widgetData[id] = { ...widget };
          } else {
            widgetData[id] = {
              x: widget.x,
              y: widget.y,
              width: widget.width,
              height: widget.height,
              minimized: widget.minimized || false
            };
          }
        });
        
        console.log(`💾 Auto-saving ${deckMode} layout with data:`, widgetData);
        console.log('🎛️ Specifically saving mixerSubwidgets:', widgetData.mixerSubwidgets);
        // Save layout (both Electron and localStorage) with deck mode
        saveLayout(widgetData, deckMode);
      } catch (error) {
        console.error('Failed to auto-save layout:', error);
      }
    }, 500); // 500ms debounce to avoid too frequent saves
    
    return () => clearTimeout(timer);
  }, [widgets]);
  // End auto-save

  // Initialize AudioManager
  useEffect(() => {
    audioManagerRef.current = new AudioManager();
    
    // Make AudioManager globally available for EQ components
    window.audioManagerRef = audioManagerRef;
    
    // Test basic audio functionality
    audioManagerRef.current.testAudio();
    
    // Set up audio callbacks
    audioManagerRef.current.setOnPositionUpdate((deck, position) => {
      setDeckState(prev => ({
        ...prev,
        [deck]: {
          ...prev[deck],
          position: position
        }
      }));
    });

    audioManagerRef.current.setOnTrackLoaded((deck, track) => {
      setDeckState(prev => ({
        ...prev,
        [deck]: {
          ...prev[deck],
          track: track
        }
      }));
    });

    audioManagerRef.current.setOnTrackEnded((deck) => {
      setDeckState(prev => ({
        ...prev,
        [deck]: {
          ...prev[deck],
          isPlaying: false,
          position: 0
        }
      }));
    });

    console.log('[DJSimple] AudioManager initialized');

    // Cleanup on unmount
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.destroy();
      }
    };
  }, []);

  // Load tracks on component mount
  useEffect(() => {
    loadTracks();
  }, []);

  // Function to load tracks from database
  const loadTracks = async () => {
    try {
      setTracksLoading(true);
      setTracksError(null);
      
      // Get all tracks from the database
      const allTracks = await window.api.getTracks({});
      setTracks(allTracks);
    } catch (err) {
      console.error('Failed to load tracks:', err);
      setTracksError('Failed to load music library');
    } finally {
      setTracksLoading(false);
    }
  };

  // Audio context refs for EQ
  const deckAudioRefs = useRef({
    A: { audioContext: null, gainNode: null, pannerNode: null },
    B: { audioContext: null, gainNode: null, pannerNode: null }
  });

  // Update audio refs when AudioManager is available
  useEffect(() => {
    if (audioManagerRef.current) {
      const updateAudioRefs = () => {
        const deckANodes = audioManagerRef.current.getAudioNodes('A');
        const deckBNodes = audioManagerRef.current.getAudioNodes('B');
        
        deckAudioRefs.current = {
          A: deckANodes,
          B: deckBNodes
        };
      };
      
      // Update refs once when AudioManager becomes available
      updateAudioRefs();
    }
  }, []);

  // Function to register deck audio context (legacy compatibility)
  const registerDeckAudio = useCallback((deck, audioContext, gainNode, pannerNode) => {
    deckAudioRefs.current[deck] = { audioContext, gainNode, pannerNode };
  }, []);

  // Handle widget updates with FORCED A/B/C/D synchronization for decks
  const handleWidgetUpdate = useCallback((widgetId, updates) => {

    setWidgets(prev => {
      const newWidgets = { ...prev };
      
      // Special handling for mixer subwidgets (nested object)
      if (widgetId === 'mixerSubwidgets') {
        newWidgets.mixerSubwidgets = {
          ...prev.mixerSubwidgets,
          ...updates
        };
        
        // Mirror A/B subwidgets in mixer
        // When volume-a changes, update volume-b with same size
        if (updates['volume-a']) {
          newWidgets.mixerSubwidgets['volume-b'] = {
            ...newWidgets.mixerSubwidgets['volume-b'],
            width: updates['volume-a'].width,
            height: updates['volume-a'].height
          };
        }
        // When volume-b changes, update volume-a with same size
        if (updates['volume-b']) {
          newWidgets.mixerSubwidgets['volume-a'] = {
            ...newWidgets.mixerSubwidgets['volume-a'],
            width: updates['volume-b'].width,
            height: updates['volume-b'].height
          };
        }
        
        // When gain-a changes, update gain-b with same size
        if (updates['gain-a']) {
          newWidgets.mixerSubwidgets['gain-b'] = {
            ...newWidgets.mixerSubwidgets['gain-b'],
            width: updates['gain-a'].width,
            height: updates['gain-a'].height
          };
        }
        // When gain-b changes, update gain-a with same size
        if (updates['gain-b']) {
          newWidgets.mixerSubwidgets['gain-a'] = {
            ...newWidgets.mixerSubwidgets['gain-a'],
            width: updates['gain-b'].width,
            height: updates['gain-b'].height
          };
        }
        
        // When reverb-a changes, update reverb-b with same size
        if (updates['reverb-a']) {
          newWidgets.mixerSubwidgets['reverb-b'] = {
            ...newWidgets.mixerSubwidgets['reverb-b'],
            width: updates['reverb-a'].width,
            height: updates['reverb-a'].height
          };
        }
        // When reverb-b changes, update reverb-a with same size
        if (updates['reverb-b']) {
          newWidgets.mixerSubwidgets['reverb-a'] = {
            ...newWidgets.mixerSubwidgets['reverb-a'],
            width: updates['reverb-b'].width,
            height: updates['reverb-b'].height
          };
        }
        
        // When pitch-a changes, update pitch-b with same size
        if (updates['pitch-a']) {
          newWidgets.mixerSubwidgets['pitch-b'] = {
            ...newWidgets.mixerSubwidgets['pitch-b'],
            width: updates['pitch-a'].width,
            height: updates['pitch-a'].height
          };
        }
        // When pitch-b changes, update pitch-a with same size
        if (updates['pitch-b']) {
          newWidgets.mixerSubwidgets['pitch-a'] = {
            ...newWidgets.mixerSubwidgets['pitch-a'],
            width: updates['pitch-b'].width,
            height: updates['pitch-b'].height
          };
        }
      } else {
        newWidgets[widgetId] = { ...prev[widgetId], ...updates };
      }
      
      // SYNCHRONIZE ALL DECK SIZES - When any deck is resized, update all others
      if (widgetId === 'deckA' || widgetId === 'deckB' || widgetId === 'deckC' || widgetId === 'deckD') {
        const newSize = { 
          width: newWidgets[widgetId].width, 
          height: newWidgets[widgetId].height 
        };
        
        // Update all decks to match the resized deck's size (but keep their positions)
        if (newWidgets.deckA) {
          newWidgets.deckA = { ...newWidgets.deckA, ...newSize };
        }
        if (newWidgets.deckB) {
          newWidgets.deckB = { ...newWidgets.deckB, ...newSize };
        }
        if (newWidgets.deckC) {
          newWidgets.deckC = { ...newWidgets.deckC, ...newSize };
        }
        if (newWidgets.deckD) {
          newWidgets.deckD = { ...newWidgets.deckD, ...newSize };
        }
      }
      
      // SYNCHRONIZE EQ SIZES
      if (widgetId === 'eqA' && newWidgets.eqB) {
        newWidgets.eqB = { ...newWidgets.eqB, width: newWidgets.eqA.width, height: newWidgets.eqA.height };
      } else if (widgetId === 'eqB' && newWidgets.eqA) {
        newWidgets.eqA = { ...newWidgets.eqA, width: newWidgets.eqB.width, height: newWidgets.eqB.height };
      }
      
      // SYNCHRONIZE LIBRARY SIZES
      if (widgetId === 'libraryA' && newWidgets.libraryB) {
        newWidgets.libraryB = { ...newWidgets.libraryB, width: newWidgets.libraryA.width, height: newWidgets.libraryA.height };
      } else if (widgetId === 'libraryB' && newWidgets.libraryA) {
        newWidgets.libraryA = { ...newWidgets.libraryA, width: newWidgets.libraryB.width, height: newWidgets.libraryB.height };
      }
      

      return newWidgets;
    });
  }, []);

  // Handle style changes from standalone widgets (drag/resize)
  const handleWidgetStyleChange = useCallback((widgetId, newStyle) => {
    handleWidgetUpdate(widgetId, {
      x: newStyle.x,
      y: newStyle.y,
      width: newStyle.width,
      height: newStyle.height
    });
  }, [handleWidgetUpdate]);

  // Handle widget minimize toggle
  const handleMinimizeToggle = useCallback((widgetId) => {
    setWidgets(prev => {
      const newWidgets = { ...prev };
      const widget = newWidgets[widgetId];
      const wasMinimized = widget.minimized;
      const willBeMinimized = !wasMinimized;
      
      // Toggle minimize state
      newWidgets[widgetId] = { ...widget, minimized: willBeMinimized };
      
      // Auto-reposition libraries when EQs are toggled
      const EQ_COLLAPSED_HEIGHT = 40; // Minimized EQ height (title bar only)
      const EQ_EXPANDED_HEIGHT = 300; // Full EQ height
      const VERTICAL_GAP = 10; // Gap between widgets
      
      // Handle EQ A and Library A repositioning
      if (widgetId === 'eqA' && newWidgets.libraryA) {
        const eqBottom = newWidgets.eqA.y + (willBeMinimized ? EQ_COLLAPSED_HEIGHT : EQ_EXPANDED_HEIGHT);
        newWidgets.libraryA = {
          ...newWidgets.libraryA,
          y: eqBottom + VERTICAL_GAP
        };
      }
      
      // Handle EQ B and Library B repositioning
      if (widgetId === 'eqB' && newWidgets.libraryB) {
        const eqBottom = newWidgets.eqB.y + (willBeMinimized ? EQ_COLLAPSED_HEIGHT : EQ_EXPANDED_HEIGHT);
        newWidgets.libraryB = {
          ...newWidgets.libraryB,
          y: eqBottom + VERTICAL_GAP
        };
      }
      
      return newWidgets;
    });
  }, []);

  // Layout management functions - updated to use new layout manager
  const handleSaveLayout = useCallback(() => {
    if (!layoutManager) return;
    
    // Convert widgets state to the format expected by layout manager
    const widgetData = {};
    Object.entries(widgets).forEach(([id, widget]) => {
      widgetData[id] = {
        x: widget.x,
        y: widget.y,
        width: widget.width,
        height: widget.height,
        minimized: widget.minimized || false
      };
    });
    
    layoutManager.saveLayout(null, widgetData);
    alert('Layout saved successfully! Your widget positions will be remembered.');
  }, [widgets, layoutManager]);

  const handleResetLayout = useCallback(() => {
    if (confirm('Are you sure you want to reset the layout to defaults? This will lose your current arrangement.')) {
      // Save current mixer position to preserve it
      const currentMixerPosition = widgets.mixer;
      
      const defaultLayout = getDefaultLayout();
      
      // Preserve mixer position if it exists, otherwise use default
      if (currentMixerPosition) {
        defaultLayout.mixer = currentMixerPosition;
      }
      
      setWidgets(defaultLayout);
      
      if (layoutManager) {
        // Save the layout to layout manager (preserving mixer)
        const widgetData = {};
        Object.entries(defaultLayout).forEach(([id, widget]) => {
          widgetData[id] = {
            x: widget.x,
            y: widget.y,
            width: widget.width,
            height: widget.height,
            minimized: widget.minimized || false
          };
        });
        layoutManager.saveLayout(null, widgetData);
      }
      
      // Don't mess with internal DJWidgets at all - let them stay as they are
      console.log('✅ Layout reset (mixer position preserved)');
      
      alert('Layout reset to defaults!');
    }
  }, [layoutManager]);

  const handleLoadLayout = useCallback(() => {
    if (!layoutManager) return;
    
    const savedWidgets = layoutManager.getCurrentLayoutWidgets();
    if (savedWidgets && Object.keys(savedWidgets).length > 0) {
      // Merge saved positions with default layout
      const mergedLayout = { ...getDefaultLayout(), ...savedWidgets };
      setWidgets(mergedLayout);
      alert('Layout loaded from saved settings!');
    } else {
      alert('No saved layout found!');
    }
  }, [layoutManager]);

  // Auto-save layout whenever widgets change (DISABLED FOR PERFORMANCE)
  // Commenting out to reduce CPU/memory usage - use manual save instead
  /*
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (layoutManager && Object.keys(widgets).length > 0) {
        try {
          // Convert widgets state to the format expected by layout manager
          const widgetData = {};
          Object.entries(widgets).forEach(([id, widget]) => {
            widgetData[id] = {
              x: widget.x || 0,
              y: widget.y || 0,
              width: widget.width || 300,
              height: widget.height || 200,
              minimized: widget.minimized || false
            };
          });
          
          // Auto-save to current layout
          layoutManager.saveLayout(null, widgetData);
          console.log(`🎛️ Auto-saved DJSimple layout with ${Object.keys(widgetData).length} widgets`);
        } catch (error) {
          console.warn('Auto-save failed in DJSimple:', error);
        }
      }
    }, 10000); // Increased from 1 second to 10 seconds for better performance

    return () => clearTimeout(timeoutId);
  }, [widgets, layoutManager]);
  */

  // Listen for menu actions from Electron
  useEffect(() => {
    const handleMenuAction = (action) => {

      switch (action) {
        case 'save-layout':

          handleSaveLayout();
          break;
        case 'load-layout':

          handleLoadLayout();
          break;
        case 'reset-layout':

          handleResetLayout();
          break;
        case 'open-settings':

          setShowSettings(true);
          break;
        default:

      }
    };

    if (window.electronAPI) {

      window.electronAPI.receive('menu-action', handleMenuAction);
      
      return () => {

        window.electronAPI.removeAllListeners('menu-action');
      };
    } else {
      console.log('electronAPI not available');
    }
  }, [handleSaveLayout, handleLoadLayout, handleResetLayout]);

  // Listen for deck track loading from libraries
  useEffect(() => {
    const handleDeckLoad = ({ filePath, deck, track }) => {

      
      // Update deck state with the loaded track
      setDeckState(prev => {
        const newState = {
          ...prev,
          [deck]: {
            ...prev[deck],
            track: {
              ...track,
              filePath
            }
          }
        };

        return newState;
      });
      
      // Track loaded successfully - audio will be handled by individual deck controls

    };

    if (window.electronAPI) {

      window.electronAPI.receive('deck:loadTrack', handleDeckLoad);
      
      return () => {
        console.log('[DJSimple] 🧹 Cleaning up deck load listener');
        window.electronAPI.removeAllListeners('deck:loadTrack');
      };
    } else {
      console.error('[DJSimple] ❌ window.electronAPI not available!');
    }
  }, []);

    // Auto-restore sub-widget layouts after component mount
  const [layoutRestored, setLayoutRestored] = useState(false);
  
  useEffect(() => {
    if (layoutRestored) return;

    const deckAControls = localStorage.getItem('deckA-controls');
    const deckBControls = localStorage.getItem('deckB-controls');
    
    if (deckAControls || deckBControls) {
      setLayoutRestored(true);
    }
  }, [layoutRestored]);

  // A/B Widget Size Synchronization using React state
  useEffect(() => {
    if (!widgets) return;
    
    // Only update B widgets when A widgets change
    const mirrorSizes = {
      playerB: widgets.playerA && { width: widgets.playerA.width, height: widgets.playerA.height },
      eqB: widgets.eqA && { width: widgets.eqA.width, height: widgets.eqA.height },
      libraryB: widgets.libraryA && { width: widgets.libraryA.width, height: widgets.libraryA.height }
    };
    
    // Batch update all B widgets at once
    setWidgets(prev => ({
      ...prev,
      ...Object.entries(mirrorSizes).reduce((acc, [key, value]) => {
        if (value && prev[key]) {
          acc[key] = { ...prev[key], ...value };
        }
        return acc;
      }, {})
    }));
    
  }, [
    widgets?.playerA?.width, widgets?.playerA?.height,
    widgets?.eqA?.width, widgets?.eqA?.height,
    widgets?.libraryA?.width, widgets?.libraryA?.height
  ]);

  // Player control handlers
  const handlePlayPause = useCallback(async (deck) => {
    if (!audioManagerRef.current) {
      console.warn(`AudioManager not initialized`);
      return;
    }

    // Use AudioManager to play/pause
    const isPlaying = await audioManagerRef.current.playPause(deck);
    
    // Update state to reflect actual playback state
    setDeckState(prev => ({
      ...prev,
      [deck]: {
        ...prev[deck],
        isPlaying: isPlaying
      }
    }));
    
    console.log(`Deck ${deck} ${isPlaying ? 'playing' : 'paused'}`);
  }, []);

  const handleSeek = useCallback((deck, time) => {
    if (!audioManagerRef.current) {
      console.warn(`AudioManager not initialized`);
      return;
    }

    // Use AudioManager to seek
    audioManagerRef.current.seek(deck, time);
    
    // State will be updated by the onPositionUpdate callback
    console.log(`Deck ${deck} seeked to ${time}s`);
  }, []);

  const handleSkip = useCallback((deck, seconds) => {
    if (!audioManagerRef.current) {
      console.warn(`AudioManager not initialized`);
      return;
    }

    // Use AudioManager to skip
    audioManagerRef.current.skip(deck, seconds);
    
    console.log(`Deck ${deck} skipped ${seconds}s`);
  }, []);

  const handleCue = useCallback((deck, cueState) => {
    if (!audioManagerRef.current) {
      console.warn(`AudioManager not initialized`);
      return;
    }

    // Use AudioManager to set cue state (affects stereo panning)
    audioManagerRef.current.setCue(deck, cueState);
    
    console.log(`Deck ${deck} cue ${cueState ? 'ON (Right ear)' : 'OFF (Left ear)'}`);
  }, []);

  // Track loading handler
  const handleTrackLoad = useCallback(async (deck, track) => {
    if (!audioManagerRef.current) {
      console.warn(`AudioManager not initialized`);
      return;
    }

    // Use AudioManager to load track
    const success = await audioManagerRef.current.loadTrack(deck, track);
    
    if (success) {
      // Update state immediately, AudioManager callbacks will update duration when loaded
      setDeckState(prev => {
        const newState = {
          ...prev,
          [deck]: {
            ...prev[deck],
            track: track,
            position: 0,
            isPlaying: false
          }
        };
        return newState;
      });
      
    } else {
      console.error(`Failed to load track to Deck ${deck}`);
    }
  }, []);

  // Listen for track loads from library components
  useEffect(() => {
    const handleLibraryTrackLoad = (event, data) => {
      const { deck, track } = data;
      handleTrackLoad(deck, track);
    };

    // Listen for electron events if available
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on('library:trackLoaded', handleLibraryTrackLoad);
      
      return () => {
        if (window.electronAPI.off) {
          window.electronAPI.off('library:trackLoaded', handleLibraryTrackLoad);
        }
      };
    }
  }, [handleTrackLoad]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle gridlines with 'G' key
      if (e.key.toLowerCase() === 'g' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Don't trigger if typing in an input field
        if (e.target.tagName.toLowerCase() !== 'input' && e.target.tagName.toLowerCase() !== 'textarea') {
          e.preventDefault();
          setShowGridlines(prev => !prev);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '40px',
        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 1002,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Left side - Logo/Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#3498db'
        }}>
          <span>🎧</span>
          NGKs DJ Simple
        </div>

        {/* Right side - Navigation Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Stress Test Button */}
          <button
            onClick={async () => {
              if (!audioManagerRef.current) {
                alert('AudioManager not initialized');
                return;
              }
              
              // Test all active decks
              const decks = ['A', 'B', 'C', 'D'];
              console.log('=== STARTING DJ STRESS TEST ===');
              console.log('AudioManager:', audioManagerRef.current);
              
              let testedCount = 0;
              
              for (const deck of decks) {
                const deckData = audioManagerRef.current.decks[deck];
                console.log(`Checking Deck ${deck}:`, {
                  hasAudio: !!deckData?.audio,
                  hasTrack: !!deckData?.track,
                  audioSrc: deckData?.audio?.src,
                  trackTitle: deckData?.track?.title
                });
                
                if (deckData?.audio && deckData.track) {
                  console.log(`\n🎧 Testing Deck ${deck}: ${deckData.track.title}...`);
                  console.log(`Audio element src: ${deckData.audio.src}`);
                  console.log(`Audio duration: ${deckData.audio.duration}`);
                  console.log(`Track path: ${deckData.track.filePath}`);
                  
                  const test = new PlayerStressTest(deckData.audio, [deckData.track]);
                  
                  try {
                    const result = await test.runAllTests({
                      rapidSwitchDuration: 3000,
                      seekIterations: 30,
                      playPauseCycles: 50,
                      volumeIterations: 30,
                      memoryLeakTracks: 10,
                      includeEdgeCases: false,
                      includeConcurrent: true
                    });
                    console.log(`Deck ${deck} result:`, result);
                    testedCount++;
                  } catch (err) {
                    console.error(`Deck ${deck} stress test failed:`, err);
                  }
                } else {
                  console.log(`⏭️ Skipping Deck ${deck} - ${!deckData?.audio ? 'no audio element' : 'no track loaded'}`);
                }
              }
              
              console.log(`\n✅ DJ STRESS TEST COMPLETE - Tested ${testedCount} active deck(s)`);
              alert(`Stress test complete! Tested ${testedCount} deck(s). Check console for details.`);
            }}
            style={{
              padding: '6px 12px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
            onMouseLeave={(e) => e.target.style.background = '#dc2626'}
            title="Run stress test on all active decks"
          >
            ⚡ Stress Test
          </button>
          
          {/* Deck Mode Selector */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <button
              onClick={() => setDeckMode('2deck')}
              style={{
                background: deckMode === '2deck' 
                  ? 'linear-gradient(145deg, #3498db, #2980b9)' 
                  : 'linear-gradient(145deg, #34495e, #2c3e50)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="2-Deck Professional Mode"
            >
              🎧 2-DECK
            </button>

            <button
              onClick={() => setDeckMode('4deck')}
              style={{
                background: deckMode === '4deck' 
                  ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                  : 'linear-gradient(145deg, #34495e, #2c3e50)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '10px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="4-Deck Advanced Mode"
            >
              🔥 4-DECK
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#888',
            padding: '4px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '4px'
          }}>
            <span>🗺️</span>
            <span>Scroll to explore canvas</span>
          </div>
          
          <button 
            onClick={() => setShowGridlines(!showGridlines)}
            style={{
              background: showGridlines 
                ? 'linear-gradient(145deg, #27ae60, #229954)' 
                : 'linear-gradient(145deg, #34495e, #2c3e50)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Toggle Gridlines (G)"
          >
            <span>⚏</span>
            {showGridlines ? 'Hide Grid' : 'Show Grid'}
          </button>

          <button 
            onClick={() => setShowOBSPanel(true)}
            style={{
              background: 'linear-gradient(145deg, #e74c3c, #c0392b)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Live Streaming Setup - OBS, Streamlabs, XSplit, vMix"
          >
            <span>📺</span>
            GO LIVE
          </button>

          <button 
            onClick={() => setShowRequestQueue(true)}
            style={{
              background: 'linear-gradient(145deg, #00ff88, #00d4aa)',
              color: '#0a0a0a',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            title="Crowd Song Requests - Accept songs from your audience"
          >
            <span>🎵</span>
            REQUESTS
            {requestCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#ff4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                border: '2px solid #1a1a2e'
              }}>
                {requestCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => setShowStreamingServices(true)}
            style={{
              background: 'linear-gradient(145deg, #9b59b6, #8e44ad)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Streaming Music Platforms - Spotify, Tidal, SoundCloud, Beatport & more"
          >
            <span>🌐</span>
            STREAM MUSIC
          </button>

          <button 
            onClick={() => setShowCalibration(true)}
            style={{
              background: 'linear-gradient(145deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Analyzer Calibration - Train BPM and Key detection"
          >
            <span>🎯</span>
            CALIBRATE
          </button>

          <button 
            onClick={() => {
              console.log('Hardware button clicked, onNavigate:', onNavigate);
              if (onNavigate) {
                onNavigate('hardware');
              } else {
                console.error('onNavigate function not available');
                window.location.hash = '#/hardware';
              }
            }}
            style={{
              background: 'linear-gradient(145deg, #e74c3c, #c0392b)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Hardware Integration - 200+ DJ Controllers, DVS Turntables, MIDI Devices"
          >
            <span>🎛️</span>
            HARDWARE
          </button>

          <button 
            onClick={() => {
              console.log('Library button clicked, onNavigate:', onNavigate);
              if (onNavigate) {
                onNavigate('library');
              } else {
                console.error('onNavigate function not available');
                // Fallback: try to navigate using window.location
                window.location.hash = '#/';
              }
            }}
            style={{
              background: 'linear-gradient(145deg, #3498db, #2980b9)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease'
            }}
            title="Return to Main Library"
          >
            <span>🏠</span>
            Library
          </button>
        </div>
      </div>
      
      <div className="dj-workspace force-symmetry" style={{ paddingTop: '40px' }}>
        {/* Scrollable Canvas Container */}
        <div className="scrollable-canvas" style={{
          position: 'relative',
          width: '5000px',
          height: '5000px',
          minWidth: '100vw',
          minHeight: '100vh'
        }}>
          {/* Canvas Zone Indicators */}
          <div className="zone-indicator zone-main"></div>
          <div className="zone-indicator zone-extended-right"></div>
          <div className="zone-indicator zone-extended-bottom"></div>
          <div className="zone-indicator zone-extended-corner"></div>
          
          {/* Gridlines Overlay - Rendered FIRST so they appear behind everything */}
          {showGridlines && (
            <div className="gridlines-overlay">
              {/* Vertical gridlines every 25px */}
              {Array.from({ length: Math.ceil(5000 / 25) }, (_, i) => (
                <div 
                  key={`v-${i}`} 
                  className={`gridline gridline-vertical ${i % 4 === 0 ? 'major' : ''}`}
                  style={{ left: `${i * 25}px` }}
                />
              ))}
              {/* Horizontal gridlines every 25px */}
              {Array.from({ length: Math.ceil(5000 / 25) }, (_, i) => (
                <div 
                  key={`h-${i}`} 
                  className={`gridline gridline-horizontal ${i % 4 === 0 ? 'major' : ''}`}
                  style={{ top: `${i * 25}px` }}
                />
              ))}
              {/* Grid info indicator */}
              <div className="grid-info">
                <span>Grid: 25px</span>
                <span>Major: 100px</span>
              </div>
          </div>
        )}
        
        {/* Settings Modal */}
        {showSettings && (
          <div className="settings-modal-overlay" onClick={() => setShowSettings(false)}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
              <div className="settings-modal-header">
                <h2>Interface Settings</h2>
                <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
              </div>
              <div className="settings-modal-content">
                <SettingsWidget />
              </div>
            </div>
          </div>
        )}

      {/* Deck A - Standalone */}
      <DeckA 
        id="deckA"
        track={deckState.A.track}
        isPlaying={deckState.A.isPlaying}
        position={deckState.A.position}
        duration={deckState.A.track?.duration || 0}
        onPlayPause={() => handlePlayPause('A')}
        onSeek={(time) => handleSeek('A', time)}
        onSkip={(seconds) => handleSkip('A', seconds)}
        onCue={(cueState) => handleCue('A', cueState)}
        audioManager={audioManagerRef.current}
        onStyleChange={handleWidgetStyleChange}
        style={{
          position: 'absolute',
          left: widgets.deckA?.x || 50,
          top: widgets.deckA?.y || 50,
          width: widgets.deckA?.width || 300,
          height: widgets.deckA?.height || 350,
          opacity: deckMode === '2deck' || activeDeckPair === 'AB' ? 1 : 0.7
        }}
      />

      {/* Deck B - Standalone */}
      <DeckB 
        id="deckB"
        track={deckState.B.track}
        isPlaying={deckState.B.isPlaying}
        position={deckState.B.position}
        duration={deckState.B.track?.duration || 0}
        onPlayPause={() => handlePlayPause('B')}
        onSeek={(time) => handleSeek('B', time)}
        onSkip={(seconds) => handleSkip('B', seconds)}
        onCue={(cueState) => handleCue('B', cueState)}
        audioManager={audioManagerRef.current}
        onStyleChange={handleWidgetStyleChange}
        style={{
          position: 'absolute',
          left: widgets.deckB?.x || 1090,
          top: widgets.deckB?.y || 50,
          width: widgets.deckB?.width || 300,
          height: widgets.deckB?.height || 350,
          opacity: deckMode === '2deck' || activeDeckPair === 'AB' ? 1 : 0.7
        }}
      />

      <DraggableWidget
        id="mixer"
        title="NGKs MX-2000 Pro - Professional Mixer"
        {...widgets.mixer}
        onUpdate={(updates) => handleWidgetUpdate('mixer', updates)}
        onMinimize={() => handleMinimizeToggle('mixer')}
        isMajorWidget={true}
      >
        <Mixer 
          audioManager={audioManagerRef.current}
          mixerLayout={widgets.mixerSubwidgets}
          onMixerLayoutChange={(updates) => handleWidgetUpdate('mixerSubwidgets', updates)}
          deckMode={deckMode}
        />
      </DraggableWidget>

      {/* Deck C - Standalone (4-deck mode only) */}
      {deckMode === '4deck' && (
        <DeckC 
          id="deckC"
          track={deckState.C.track}
          isPlaying={deckState.C.isPlaying}
          position={deckState.C.position}
          duration={deckState.C.track?.duration || 0}
          onPlayPause={() => handlePlayPause('C')}
          onSeek={(time) => handleSeek('C', time)}
          onSkip={(seconds) => handleSkip('C', seconds)}
          onCue={(cueState) => handleCue('C', cueState)}
          audioManager={audioManagerRef.current}
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute',
            left: widgets.deckC?.x || 50,
            top: widgets.deckC?.y || 450,
            width: widgets.deckC?.width || 300,
            height: widgets.deckC?.height || 350,
            opacity: activeDeckPair === 'CD' ? 1 : 0.7
          }}
        />
      )}

      {/* Deck D - Standalone (4-deck mode only) */}
      {deckMode === '4deck' && (
        <DeckD 
          id="deckD"
          track={deckState.D.track}
          isPlaying={deckState.D.isPlaying}
          position={deckState.D.position}
          duration={deckState.D.track?.duration || 0}
          onPlayPause={() => handlePlayPause('D')}
          onSeek={(time) => handleSeek('D', time)}
          onSkip={(seconds) => handleSkip('D', seconds)}
          onCue={(cueState) => handleCue('D', cueState)}
          audioManager={audioManagerRef.current}
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute',
            left: widgets.deckD?.x || 1090,
            top: widgets.deckD?.y || 450,
            width: widgets.deckD?.width || 300,
            height: widgets.deckD?.height || 350,
            opacity: activeDeckPair === 'CD' ? 1 : 0.7
          }}
        />
      )}

      {/* LEFT SIDE EQ - Show either A or C based on activeLeftEQ */}
      {activeLeftEQ === 'A' ? (
        <EQA 
          id="eqA"
          onStyleChange={handleWidgetStyleChange}
          minimized={widgets.eqA.minimized}
          onMinimize={() => handleMinimizeToggle('eqA')}
          style={{
            position: 'absolute', 
            left: widgets.eqA.x, 
            top: widgets.eqA.y, 
            width: widgets.eqA.width, 
            height: widgets.eqA.minimized ? 40 : widgets.eqA.height
          }}
          audioContext={deckAudioRefs.current.A.audioContext}
          gainNode={deckAudioRefs.current.A.gainNode}
          pannerNode={deckAudioRefs.current.A.pannerNode}
        />
      ) : (
        <EQC 
          id="eqA"
          onStyleChange={handleWidgetStyleChange}
          minimized={widgets.eqA.minimized}
          onMinimize={() => handleMinimizeToggle('eqA')}
          style={{
            position: 'absolute', 
            left: widgets.eqA.x, 
            top: widgets.eqA.y, 
            width: widgets.eqA.width, 
            height: widgets.eqA.minimized ? 40 : widgets.eqA.height
          }}
          audioContext={deckAudioRefs.current.C?.audioContext}
          gainNode={deckAudioRefs.current.C?.gainNode}
          pannerNode={deckAudioRefs.current.C?.pannerNode}
        />
      )}
      
      {/* LEFT EQ Toggle Button (4-deck mode only) */}
      {deckMode === '4deck' && (
        <button
          onClick={() => setActiveLeftEQ(activeLeftEQ === 'A' ? 'C' : 'A')}
          style={{
            position: 'absolute',
            left: widgets.eqA.x + widgets.eqA.width - 65,
            top: widgets.eqA.y + 5,
            width: '35px',
            height: '25px',
            background: activeLeftEQ === 'A' 
              ? 'linear-gradient(145deg, rgba(255, 140, 0, 0.3), rgba(0, 0, 0, 0.5))' 
              : 'linear-gradient(145deg, rgba(0, 200, 255, 0.3), rgba(0, 0, 0, 0.5))',
            border: activeLeftEQ === 'A' 
              ? '1px solid rgba(255, 140, 0, 0.6)' 
              : '1px solid rgba(0, 200, 255, 0.6)',
            borderRadius: '6px',
            color: activeLeftEQ === 'A' ? '#ff8c00' : '#00c8ff',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          title={`Switch to EQ ${activeLeftEQ === 'A' ? 'C' : 'A'}`}
        >
          EQ {activeLeftEQ}
        </button>
      )}

      {/* RIGHT SIDE EQ - Show either B or D based on activeRightEQ */}
      {activeRightEQ === 'B' ? (
        <EQB 
          id="eqB"
          onStyleChange={handleWidgetStyleChange}
          minimized={widgets.eqB.minimized}
          onMinimize={() => handleMinimizeToggle('eqB')}
          style={{
            position: 'absolute', 
            left: widgets.eqB.x, 
            top: widgets.eqB.y, 
            width: widgets.eqB.width, 
            height: widgets.eqB.minimized ? 40 : widgets.eqB.height
          }}
          audioContext={deckAudioRefs.current.B.audioContext}
          gainNode={deckAudioRefs.current.B.gainNode}
          pannerNode={deckAudioRefs.current.B.pannerNode}
        />
      ) : (
        <EQD 
          id="eqB"
          onStyleChange={handleWidgetStyleChange}
          minimized={widgets.eqB.minimized}
          onMinimize={() => handleMinimizeToggle('eqB')}
          style={{
            position: 'absolute', 
            left: widgets.eqB.x, 
            top: widgets.eqB.y, 
            width: widgets.eqB.width, 
            height: widgets.eqB.minimized ? 40 : widgets.eqB.height
          }}
          audioContext={deckAudioRefs.current.D?.audioContext}
          gainNode={deckAudioRefs.current.D?.gainNode}
          pannerNode={deckAudioRefs.current.D?.pannerNode}
        />
      )}
      
      {/* RIGHT EQ Toggle Button (4-deck mode only) */}
      {deckMode === '4deck' && (
        <button
          onClick={() => setActiveRightEQ(activeRightEQ === 'B' ? 'D' : 'B')}
          style={{
            position: 'absolute',
            left: widgets.eqB.x + widgets.eqB.width - 65,
            top: widgets.eqB.y + 5,
            width: '35px',
            height: '25px',
            background: activeRightEQ === 'B' 
              ? 'linear-gradient(145deg, rgba(139, 0, 255, 0.3), rgba(0, 0, 0, 0.5))' 
              : 'linear-gradient(145deg, rgba(0, 255, 100, 0.3), rgba(0, 0, 0, 0.5))',
            border: activeRightEQ === 'B' 
              ? '1px solid rgba(139, 0, 255, 0.6)' 
              : '1px solid rgba(0, 255, 100, 0.6)',
            borderRadius: '6px',
            color: activeRightEQ === 'B' ? '#8b00ff' : '#00ff64',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          title={`Switch to EQ ${activeRightEQ === 'B' ? 'D' : 'B'}`}
        >
          EQ {activeRightEQ}
        </button>
      )}

      {/* LEFT SIDE LIBRARY - Show either A or C based on activeLeftLibrary */}
      {activeLeftLibrary === 'A' ? (
        <LibraryA 
          id="libraryA"
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute', 
            left: widgets.libraryA.x, 
            top: widgets.libraryA.y, 
            width: widgets.libraryA.width, 
            height: widgets.libraryA.height
          }}
          onTrackLoad={(track) => {
            // Load track to Deck A
            handleTrackLoad('A', track);
          }}
          tracks={tracks}
          isLoading={tracksLoading}
        />
      ) : (
        <LibraryC 
          id="libraryA"
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute', 
            left: widgets.libraryA.x, 
            top: widgets.libraryA.y, 
            width: widgets.libraryA.width, 
            height: widgets.libraryA.height
          }}
          onTrackLoad={(track) => {
            // Load track to Deck C
            handleTrackLoad('C', track);
          }}
          tracks={tracks}
          isLoading={tracksLoading}
        />
      )}
      
      {/* LEFT LIBRARY Toggle Button (4-deck mode only) */}
      {deckMode === '4deck' && (
        <button
          onClick={() => setActiveLeftLibrary(activeLeftLibrary === 'A' ? 'C' : 'A')}
          style={{
            position: 'absolute',
            left: widgets.libraryA.x + widgets.libraryA.width - 65,
            top: widgets.libraryA.y + 5,
            width: '35px',
            height: '25px',
            background: activeLeftLibrary === 'A' 
              ? 'linear-gradient(145deg, rgba(255, 140, 0, 0.3), rgba(0, 0, 0, 0.5))' 
              : 'linear-gradient(145deg, rgba(0, 200, 255, 0.3), rgba(0, 0, 0, 0.5))',
            border: activeLeftLibrary === 'A' 
              ? '1px solid rgba(255, 140, 0, 0.6)' 
              : '1px solid rgba(0, 200, 255, 0.6)',
            borderRadius: '6px',
            color: activeLeftLibrary === 'A' ? '#ff8c00' : '#00c8ff',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          title={`Switch to Library ${activeLeftLibrary === 'A' ? 'C' : 'A'}`}
        >
          LIB {activeLeftLibrary}
        </button>
      )}

      {/* RIGHT SIDE LIBRARY - Show either B or D based on activeRightLibrary */}
      {activeRightLibrary === 'B' ? (
        <LibraryB 
          id="libraryB"
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute', 
            left: widgets.libraryB.x, 
            top: widgets.libraryB.y, 
            width: widgets.libraryB.width, 
            height: widgets.libraryB.height
          }}
          onTrackLoad={(track) => {
            // Load track to Deck B
            handleTrackLoad('B', track);
          }}
          tracks={tracks}
          isLoading={tracksLoading}
        />
      ) : (
        <LibraryD 
          id="libraryB"
          onStyleChange={handleWidgetStyleChange}
          style={{
            position: 'absolute', 
            left: widgets.libraryB.x, 
            top: widgets.libraryB.y, 
            width: widgets.libraryB.width, 
            height: widgets.libraryB.height
          }}
          onTrackLoad={(track) => {
            // Load track to Deck D
            handleTrackLoad('D', track);
          }}
          tracks={tracks}
          isLoading={tracksLoading}
        />
      )}
      
      {/* RIGHT LIBRARY Toggle Button (4-deck mode only) */}
      {deckMode === '4deck' && (
        <button
          onClick={() => setActiveRightLibrary(activeRightLibrary === 'B' ? 'D' : 'B')}
          style={{
            position: 'absolute',
            left: widgets.libraryB.x + widgets.libraryB.width - 65,
            top: widgets.libraryB.y + 5,
            width: '35px',
            height: '25px',
            background: activeRightLibrary === 'B' 
              ? 'linear-gradient(145deg, rgba(139, 0, 255, 0.3), rgba(0, 0, 0, 0.5))' 
              : 'linear-gradient(145deg, rgba(0, 255, 100, 0.3), rgba(0, 0, 0, 0.5))',
            border: activeRightLibrary === 'B' 
              ? '1px solid rgba(139, 0, 255, 0.6)' 
              : '1px solid rgba(0, 255, 100, 0.6)',
            borderRadius: '6px',
            color: activeRightLibrary === 'B' ? '#8b00ff' : '#00ff64',
            fontSize: '11px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 1001,
            transition: 'all 0.2s ease'
          }}
          title={`Switch to Library ${activeRightLibrary === 'B' ? 'D' : 'B'}`}
        >
          LIB {activeRightLibrary}
        </button>
      )}

      {/* Simple Sampler - Standalone */}
      <SimpleSampler 
        id="sampler"
        onStyleChange={handleWidgetStyleChange}
        style={{
          position: 'absolute', 
          left: widgets.sampler?.x || 340,
          top: widgets.sampler?.y || 410,
          width: widgets.sampler?.width || 400,
          height: widgets.sampler?.height || 350
        }}
        audioManager={audioManagerRef.current}
        deckMode={deckMode}
      />

      {/* Lighting Control - DMX/Art-Net/sACN */}
      <LightingControl 
        id="lighting"
        onStyleChange={handleWidgetStyleChange}
        style={{
          position: 'absolute', 
          left: widgets.lighting?.x || 660,
          top: widgets.lighting?.y || 720,
          width: widgets.lighting?.width || 350,
          height: widgets.lighting?.height || 450
        }}
      />

        </div> {/* End scrollable-canvas */}
      </div> {/* End dj-workspace */}

      {/* OBS Integration Panel */}
      {showOBSPanel && (
        <OBSIntegration onClose={() => setShowOBSPanel(false)} />
      )}

      {/* Request Queue Panel */}
      {showRequestQueue && (
        <RequestQueue 
          onClose={() => setShowRequestQueue(false)}
          onLoadTrack={(track, deck) => {
            // Load the requested track to the specified deck
            handleLoadTrack(track, deck);
          }}
        />
      )}

      {/* Streaming Services Panel */}
      {showStreamingServices && (
        <StreamingServices 
          onClose={() => setShowStreamingServices(false)}
        />
      )}

      {/* Calibration Panel */}
      {showCalibration && (
        <CalibrationPanel 
          onClose={() => setShowCalibration(false)}
        />
      )}
    </div>
  );
};

const DJSimpleWithSettings = ({ onNavigate }) => {
  const navigate = useNavigate();
  
  return (
    <SettingsProvider>
      <DJSimple onNavigate={onNavigate || (() => navigate('/'))} />
    </SettingsProvider>
  );
};

export default DJSimpleWithSettings;
