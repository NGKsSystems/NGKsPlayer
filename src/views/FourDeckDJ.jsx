import React, { useState, useEffect, useRef } from 'react';
import AudioManager from '../audio/AudioManager';
import FourDeckLayoutManager from '../DJ/Layout/FourDeckLayoutManager';
import ProfessionalDeck from '../DJ/Components/ProfessionalDeck';
import Mixer from '../DJ/Mixer/index';
import { Toast } from '../DJ/Mixer/Common/Toast';
import './FourDeckDJ.css';

/**
 * Professional 4-Deck DJ Interface
 * Revolutionary single-monitor 4-deck system that puts us ahead of Serato
 */
const FourDeckDJ = ({ onNavigate }) => {
  // Audio management
  const audioManagerRef = useRef(null);
  const [audioManager, setAudioManager] = useState(null);

  // Deck states
  const [deckTracks, setDeckTracks] = useState({
    A: null,
    B: null,
    C: null,
    D: null
  });

  // Layout management
  const [layoutConfig, setLayoutConfig] = useState({
    layout: '2-deck',
    visibleDecks: ['A', 'B'],
    activeDeckSet: 'AB',
    config: null
  });

  // UI state
  const [tracks, setTracks] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [toast, setToast] = useState(null);
  const [mixerLayout, setMixerLayout] = useState({});

  // Initialize audio manager
  useEffect(() => {
    console.log('🎧 Initializing 4-Deck DJ System...');
    
    if (!audioManagerRef.current) {
      audioManagerRef.current = new AudioManager();
      setAudioManager(audioManagerRef.current);
      console.log('✅ AudioManager initialized for 4 decks');
    }

    // Load music library
    loadTracks();

    // Cleanup on unmount
    return () => {
      if (audioManagerRef.current) {
        audioManagerRef.current.destroy();
      }
    };
  }, []);

  // Load tracks from library
  const loadTracks = async () => {
    try {
      const result = await window.api.invoke('library:getTracks', {});
      if (result && Array.isArray(result)) {
        setTracks(result);
        console.log(`📚 Loaded ${result.length} tracks for 4-deck DJ system`);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
      showToast('Failed to load music library', 'error');
    }
  };

  // Handle layout changes
  const handleLayoutChange = (newLayoutConfig) => {
    setLayoutConfig(newLayoutConfig);
    console.log('🔄 Layout changed:', newLayoutConfig);
    
    // Adjust mixer layout based on deck configuration
    adjustMixerForLayout(newLayoutConfig);
  };

  // Adjust mixer positioning for different layouts
  const adjustMixerForLayout = (config) => {
    const newMixerLayout = { ...mixerLayout };
    
    switch (config.layout) {
      case '4-deck':
        // Center mixer with FX units spread around
        newMixerLayout['fx-unit-a'] = { x: 20, y: 20, width: 280, height: 320 };
        newMixerLayout['fx-unit-b'] = { x: 320, y: 20, width: 280, height: 320 };
        newMixerLayout['fx-unit-c'] = { x: 620, y: 20, width: 280, height: 320 };
        newMixerLayout['fx-unit-d'] = { x: 920, y: 20, width: 280, height: 320 };
        newMixerLayout['master-fx'] = { x: 1220, y: 20, width: 280, height: 320 };
        break;
      case '2-deck':
        // Compact layout for 2-deck mode
        newMixerLayout['fx-unit-a'] = { x: 420, y: 20, width: 280, height: 320 };
        newMixerLayout['fx-unit-b'] = { x: 720, y: 20, width: 280, height: 320 };
        newMixerLayout['master-fx'] = { x: 1020, y: 20, width: 280, height: 320 };
        break;
      case 'performance':
        // Minimal layout for live performance
        newMixerLayout['fx-unit-a'] = { x: 350, y: 20, width: 250, height: 280 };
        newMixerLayout['fx-unit-b'] = { x: 620, y: 20, width: 250, height: 280 };
        break;
    }
    
    setMixerLayout(newMixerLayout);
  };

  // Load track to specific deck
  const loadTrackToDeck = (deckId, track) => {
    if (audioManager && track) {
      const newDeckTracks = { ...deckTracks };
      newDeckTracks[deckId] = track;
      setDeckTracks(newDeckTracks);
      
      console.log(`🎵 Loading track to Deck ${deckId}:`, track.title);
      showToast(`Track loaded to Deck ${deckId}`, 'success');
    }
  };

  // Handle track selection from browser
  const handleTrackSelect = (track) => {
    setSelectedTrack(track);
  };

  // Handle deck assignment via drag & drop or click
  const handleDeckAssignment = (deckId) => {
    if (selectedTrack) {
      loadTrackToDeck(deckId, selectedTrack);
      setSelectedTrack(null);
    }
  };

  // Show toast notification
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handle mixer layout changes
  const handleMixerLayoutChange = (newLayout) => {
    setMixerLayout(newLayout);
  };

  // Get currently visible decks based on layout
  const getVisibleDecks = () => {
    return layoutConfig.visibleDecks || ['A', 'B'];
  };

  return (
    <div className="four-deck-dj">
      {/* Navigation Header */}
      <div className="dj-header">
        <div className="dj-title">
          <h1>NGKs Player Pro</h1>
          <span className="dj-subtitle">Professional 4-Deck DJ System</span>
        </div>
        <div className="header-controls">
          <button 
            className="nav-btn library-btn"
            onClick={() => onNavigate('library')}
          >
            📚 Library
          </button>
          <button 
            className="nav-btn settings-btn"
            onClick={() => onNavigate('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main 4-Deck Layout */}
      <FourDeckLayoutManager
        audioManager={audioManager}
        onLayoutChange={handleLayoutChange}
        initialLayout="2-deck"
      >
        {/* Deck A */}
        <div className="deck-component" data-deck="A">
          <ProfessionalDeck
            deckId="A"
            audioManager={audioManager}
            track={deckTracks.A}
            onTrackLoad={(track) => loadTrackToDeck('A', track)}
            layoutConfig={layoutConfig.config}
            compactMode={layoutConfig.layout === 'performance'}
            onClick={() => handleDeckAssignment('A')}
            className={getVisibleDecks().includes('A') ? '' : 'deck-hidden'}
          />
        </div>

        {/* Deck B */}
        <div className="deck-component" data-deck="B">
          <ProfessionalDeck
            deckId="B"
            audioManager={audioManager}
            track={deckTracks.B}
            onTrackLoad={(track) => loadTrackToDeck('B', track)}
            layoutConfig={layoutConfig.config}
            compactMode={layoutConfig.layout === 'performance'}
            onClick={() => handleDeckAssignment('B')}
            className={getVisibleDecks().includes('B') ? '' : 'deck-hidden'}
          />
        </div>

        {/* Deck C */}
        <div className="deck-component" data-deck="C">
          <ProfessionalDeck
            deckId="C"
            audioManager={audioManager}
            track={deckTracks.C}
            onTrackLoad={(track) => loadTrackToDeck('C', track)}
            layoutConfig={layoutConfig.config}
            compactMode={layoutConfig.layout === 'performance'}
            onClick={() => handleDeckAssignment('C')}
            className={getVisibleDecks().includes('C') ? '' : 'deck-hidden'}
          />
        </div>

        {/* Deck D */}
        <div className="deck-component" data-deck="D">
          <ProfessionalDeck
            deckId="D"
            audioManager={audioManager}
            track={deckTracks.D}
            onTrackLoad={(track) => loadTrackToDeck('D', track)}
            layoutConfig={layoutConfig.config}
            compactMode={layoutConfig.layout === 'performance'}
            onClick={() => handleDeckAssignment('D')}
            className={getVisibleDecks().includes('D') ? '' : 'deck-hidden'}
          />
        </div>

        {/* Professional Mixer */}
        <div className="mixer-component">
          <Mixer
            audioManager={audioManager}
            mixerLayout={mixerLayout}
            onMixerLayoutChange={handleMixerLayoutChange}
            deckCount={4}
            layoutMode={layoutConfig.layout}
          />
        </div>
      </FourDeckLayoutManager>

      {/* Track Browser (Collapsible) */}
      <div className="track-browser">
        <div className="browser-header">
          <h3>Track Browser</h3>
          <span className="track-count">{tracks.length} tracks</span>
        </div>
        <div className="browser-content">
          {selectedTrack && (
            <div className="selected-track">
              <strong>Selected:</strong> {selectedTrack.title}
              <br />
              <small>Click a deck to load this track</small>
            </div>
          )}
          <div className="track-list">
            {tracks.slice(0, 20).map((track, index) => (
              <div
                key={track.id || index}
                className={`track-item ${selectedTrack?.id === track.id ? 'selected' : ''}`}
                onClick={() => handleTrackSelect(track)}
              >
                <div className="track-title">{track.title || 'Unknown Title'}</div>
                <div className="track-artist">{track.artist || 'Unknown Artist'}</div>
                <div className="track-bpm">{track.bpm || '---'} BPM</div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
};

export default FourDeckDJ;