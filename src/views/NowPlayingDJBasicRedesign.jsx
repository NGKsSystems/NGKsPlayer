import React, { useState, useEffect, useRef } from 'react';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../DJ/Mixer/Common/Toast';
import { DualAudioDriver } from '../audio/dualDriver.js';
// TEMPORARILY DISABLED - REBUILDING WITH NEW MODULAR STRUCTURE
// import DJEqualizer from '../components/DJEqualizer.jsx';
import './DJMixer.css';

export default function NowPlayingDJBasic({ onNavigate }) {
  // Set up dual audio driver
  const driver = useRef(null);
  
  // Basic state for two decks - use Audio objects like the regular player
  const audioRefA = useRef(new Audio());
  const audioRefB = useRef(new Audio());
  
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

  // Search states for each deck
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [filteredTracksA, setFilteredTracksA] = useState([]);
  const [filteredTracksB, setFilteredTracksB] = useState([]);

  // EQ collapse states
  const [eqCollapsedA, setEqCollapsedA] = useState(true);
  const [eqCollapsedB, setEqCollapsedB] = useState(true);

  // Set up hotkeys for beatmatching - works on deck with cue enabled
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return; // Don't trigger on text inputs
      
      // Determine which deck should receive hotkeys (the one with CUE active)
      const targetDeck = cueA ? 'A' : cueB ? 'B' : null;
      const targetAudio = targetDeck === 'A' ? audioRefA.current : targetDeck === 'B' ? audioRefB.current : null;
      if (!targetAudio) return;

      switch (e.key) {
        case 'q': // Fast reverse
          targetAudio.currentTime = Math.max(0, targetAudio.currentTime - 0.1);
          break;
        case 'w': // Slow reverse
          targetAudio.currentTime = Math.max(0, targetAudio.currentTime - 0.01);
          break;
        case 'e': // Slow forward
          targetAudio.currentTime = Math.min(targetAudio.duration, targetAudio.currentTime + 0.01);
          break;
        case 'r': // Fast forward
          targetAudio.currentTime = Math.min(targetAudio.duration, targetAudio.currentTime + 0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cueA, cueB]);

  // Initialize dual audio driver
  useEffect(() => {
    driver.current = new DualAudioDriver();
    driver.current.attachDecks(audioRefA.current, audioRefB.current);
    
    return () => {
      if (driver.current) {
        // Cleanup if needed
      }
    };
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const tenths = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  // Load tracks on mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        const trackList = await window.api.invoke('library:getAllTracks');
        setTracks(trackList);
        setFilteredTracksA(trackList);
        setFilteredTracksB(trackList);
      } catch (error) {
        console.error('Failed to load tracks:', error);
        setToast({ 
          type: 'error', 
          title: 'Error', 
          message: 'Failed to load track library' 
        });
      }
    };
    loadTracks();
  }, []);

  // Filter tracks based on search
  useEffect(() => {
    const filterTracks = (search, setFiltered) => {
      if (!search.trim()) {
        setFiltered(tracks);
        return;
      }
      
      const filtered = tracks.filter(track =>
        (track.title && track.title.toLowerCase().includes(search.toLowerCase())) ||
        (track.artist && track.artist.toLowerCase().includes(search.toLowerCase())) ||
        (track.album && track.album.toLowerCase().includes(search.toLowerCase()))
      );
      setFiltered(filtered);
    };

    filterTracks(searchA, setFilteredTracksA);
  }, [searchA, tracks]);

  useEffect(() => {
    const filterTracks = (search, setFiltered) => {
      if (!search.trim()) {
        setFiltered(tracks);
        return;
      }
      
      const filtered = tracks.filter(track =>
        (track.title && track.title.toLowerCase().includes(search.toLowerCase())) ||
        (track.artist && track.artist.toLowerCase().includes(search.toLowerCase())) ||
        (track.album && track.album.toLowerCase().includes(search.toLowerCase()))
      );
      setFiltered(filtered);
    };

    filterTracks(searchB, setFilteredTracksB);
  }, [searchB, tracks]);

  // Update positions
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
      await driver.current.resume();
      
      const audioRef = deck === 'A' ? audioRefA : audioRefB;
      const setTrack = deck === 'A' ? setTrackA : setTrackB;
      const setPosition = deck === 'A' ? setPositionA : setPositionB;
      const setDuration = deck === 'A' ? setDurationA : setDurationB;
      
      // Multiple fallbacks for path
      const trackPath = track.path || track.file_path || track.filepath || track.url;
      if (!trackPath) {
        throw new Error('No valid path found for track');
      }
      
      audioRef.current.src = toLocal(trackPath);
      audioRef.current.load();
      
      setTrack(track);
      setPosition(0);
      setDuration(0);
      
      setToast({ 
        type: 'success', 
        title: `Track loaded to Deck ${deck}`, 
        message: track.title || 'Unknown Track' 
      });
    } catch (error) {
      console.error(`Failed to load track to deck ${deck}:`, error);
      setToast({ 
        type: 'error', 
        title: 'Load Error', 
        message: `Failed to load track to Deck ${deck}` 
      });
    }
  };

  // Toggle play/pause
  const togglePlay = async (deck) => {
    await driver.current.resume();
    
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    const isPlaying = deck === 'A' ? isPlayingA : isPlayingB;
    const setIsPlaying = deck === 'A' ? setIsPlayingA : setIsPlayingB;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Handle crossfader change
  const handleCrossfader = (value) => {
    setCrossfader(value);
    if (driver.current) {
      driver.current.setCrossfader(value);
    }
  };

  // Handle volume change with knob rotation effect
  const handleVolumeChange = (deck, value) => {
    const audioRef = deck === 'A' ? audioRefA : audioRefB;
    const setVolume = deck === 'A' ? setVolumeA : setVolumeB;
    
    setVolume(value);
    audioRef.current.volume = value;
  };

  // Handle fine tune
  const handleFineTuneA = (value) => {
    const newValue = parseFloat(value);
    setFineTuneA(newValue);
    if (audioRefA.current) {
      audioRefA.current.currentTime = Math.max(0, 
        Math.min(audioRefA.current.duration || 0, 
          audioRefA.current.currentTime + (newValue - fineTuneA)
        )
      );
    }
  };

  const handleFineTuneB = (value) => {
    const newValue = parseFloat(value);
    setFineTuneB(newValue);
    if (audioRefB.current) {
      audioRefB.current.currentTime = Math.max(0, 
        Math.min(audioRefB.current.duration || 0, 
          audioRefB.current.currentTime + (newValue - fineTuneB)
        )
      );
    }
  };

  // Toggle CUE
  const toggleCue = (deck) => {
    if (deck === 'A') {
      const newCueA = !cueA;
      setCueA(newCueA);
      if (driver.current) {
        driver.current.setCue('A', newCueA);
      }
    } else {
      const newCueB = !cueB;
      setCueB(newCueB);
      if (driver.current) {
        driver.current.setCue('B', newCueB);
      }
    }
  };

  // Professional Knob Component
  const DJKnob = ({ value, onChange, min = 0, max = 1, label, displayValue, deck }) => {
    const rotation = ((value - min) / (max - min)) * 270 - 135; // -135° to +135°
    
    return (
      <div className="dj-knob-container">
        <div 
          className="dj-knob"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <input
            type="range"
            min={min}
            max={max}
            step="0.01"
            value={value}
            onChange={(e) => onChange(deck, parseFloat(e.target.value))}
            style={{
              opacity: 0,
              position: 'absolute',
              width: '100%',
              height: '100%',
              cursor: 'pointer'
            }}
          />
        </div>
        <div className="dj-knob-label">{label}</div>
        <div className="dj-knob-value">{displayValue}</div>
      </div>
    );
  };

  // Professional Fader Component
  const DJFader = ({ value, onChange, label, deck }) => {
    const position = (1 - value) * 100; // Invert so top is high volume
    
    return (
      <div className="dj-volume-fader">
        <div className="dj-fader-track">
          <div 
            className="dj-fader-handle"
            style={{ top: `${position}%` }}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={value}
              onChange={(e) => onChange(deck, parseFloat(e.target.value))}
              style={{
                opacity: 0,
                position: 'absolute',
                width: '100%',
                height: '200%',
                cursor: 'pointer',
                transform: 'rotate(-90deg)',
                transformOrigin: 'center'
              }}
            />
          </div>
        </div>
        <div className="dj-fader-label">{label}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="dj-mixer-header">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">NGKs Professional DJ Mixer</h1>
          <button
            onClick={() => onNavigate?.('library')}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            📚 Library
          </button>
        </div>
      </div>

      <div className="dj-mixer-container">
        <div className="dj-mixer-body">
          {/* Deck A */}
          <div className="dj-deck">
            <div className="dj-deck-header">
              <h2 className="dj-deck-label deck-a">Deck A</h2>
              <button
                onClick={() => toggleCue('A')}
                className={`dj-cue-button ${cueA ? 'active' : ''}`}
              >
                CUE
              </button>
            </div>

            {/* Track Info Display */}
            <div className="dj-track-info">
              <div className="dj-track-title">
                {trackA?.title || 'No Track Loaded'}
              </div>
              <div className="dj-track-artist">
                {trackA?.artist || ''} {trackA?.album ? `• ${trackA.album}` : ''}
              </div>
            </div>

            {/* Transport Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
              <button
                onClick={() => togglePlay('A')}
                className={`dj-play-button ${isPlayingA ? 'playing' : ''}`}
                disabled={!trackA}
              >
                {isPlayingA ? '⏸️ PAUSE' : '▶️ PLAY'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="dj-progress-container">
              <div className="dj-progress-bar">
                <div 
                  className="dj-progress-fill"
                  style={{ width: durationA > 0 ? `${(positionA / durationA) * 100}%` : '0%' }}
                />
              </div>
              <div className="dj-progress-times">
                <span>{formatTime(positionA)}</span>
                <span>{formatTime(durationA)}</span>
              </div>
            </div>

            {/* Volume Fader */}
            <DJFader 
              value={volumeA}
              onChange={handleVolumeChange}
              label="Volume"
              deck="A"
            />

            {/* Fine Tune */}
            <div className="dj-fine-tune">
              <div className="dj-fine-tune-label">Fine Tune</div>
              <input
                className="dj-fine-tune-slider"
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={fineTuneA}
                onChange={(e) => handleFineTuneA(e.target.value)}
              />
              <div className="dj-fine-tune-value">
                {fineTuneA > 0 ? '+' : ''}{fineTuneA}s
              </div>
            </div>

            {/* EQ Section */}
            <button
              onClick={() => setEqCollapsedA(!eqCollapsedA)}
              className={`dj-eq-toggle ${eqCollapsedA ? 'collapsed' : ''}`}
            >
              EQ
            </button>
            
            <DJEqualizer 
              deck="A"
              driver={driver.current}
              isCollapsed={eqCollapsedA}
              onToggleCollapse={() => setEqCollapsedA(!eqCollapsedA)}
            />

            {/* Track Search */}
            <div className="dj-track-search">
              <input
                type="text"
                placeholder="Search tracks for Deck A..."
                value={searchA}
                onChange={(e) => setSearchA(e.target.value)}
                className="dj-search-input"
              />
            </div>

            {/* Track List */}
            <div className="dj-track-list">
              {filteredTracksA.length > 0 ? (
                filteredTracksA.slice(0, 8).map((track, index) => (
                  <div
                    key={index}
                    className="dj-track-item"
                    onClick={() => loadTrack(track, 'A')}
                  >
                    <div className="dj-track-item-title">{track.title}</div>
                    <div className="dj-track-item-artist">{track.artist}</div>
                    <div className="dj-track-item-duration">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dj-loading">
                  {tracks.length === 0 ? 'Loading tracks...' : 'No tracks found'}
                </div>
              )}
            </div>
          </div>

          {/* Crossfader Section */}
          <div className="dj-crossfader-section">
            <div className="dj-crossfader-container">
              <div className="dj-crossfader-labels">
                <span className="deck-a">A</span>
                <span className="deck-b">B</span>
              </div>
              
              <div className="dj-crossfader-track">
                <div 
                  className="dj-crossfader-handle"
                  style={{ left: `${crossfader * 100}%` }}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={crossfader}
                    onChange={(e) => handleCrossfader(parseFloat(e.target.value))}
                    style={{
                      opacity: 0,
                      position: 'absolute',
                      width: '180px',
                      height: '100%',
                      cursor: 'pointer',
                      left: '-82px'
                    }}
                  />
                </div>
              </div>
              
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <div className="dj-knob-label">Crossfader</div>
                <div className="dj-knob-value">{Math.round(crossfader * 100)}%</div>
              </div>
            </div>

            {/* Hotkey Cheat Sheet */}
            <div style={{ 
              marginTop: '30px', 
              padding: '15px', 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: '8px',
              fontSize: '11px',
              lineHeight: '1.4'
            }}>
              <div style={{ color: '#ccc', marginBottom: '8px', fontWeight: 'bold' }}>
                Hotkeys (CUE deck):
              </div>
              <div style={{ color: '#999' }}>
                Q = Fast Reverse<br/>
                W = Slow Reverse<br/>
                E = Slow Forward<br/>
                R = Fast Forward
              </div>
            </div>
          </div>

          {/* Deck B */}
          <div className="dj-deck">
            <div className="dj-deck-header">
              <h2 className="dj-deck-label deck-b">Deck B</h2>
              <button
                onClick={() => toggleCue('B')}
                className={`dj-cue-button ${cueB ? 'active' : ''}`}
              >
                CUE
              </button>
            </div>

            {/* Track Info Display */}
            <div className="dj-track-info">
              <div className="dj-track-title">
                {trackB?.title || 'No Track Loaded'}
              </div>
              <div className="dj-track-artist">
                {trackB?.artist || ''} {trackB?.album ? `• ${trackB.album}` : ''}
              </div>
            </div>

            {/* Transport Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '15px 0' }}>
              <button
                onClick={() => togglePlay('B')}
                className={`dj-play-button ${isPlayingB ? 'playing' : ''}`}
                disabled={!trackB}
              >
                {isPlayingB ? '⏸️ PAUSE' : '▶️ PLAY'}
              </button>
            </div>

            {/* Progress Bar */}
            <div className="dj-progress-container">
              <div className="dj-progress-bar">
                <div 
                  className="dj-progress-fill"
                  style={{ width: durationB > 0 ? `${(positionB / durationB) * 100}%` : '0%' }}
                />
              </div>
              <div className="dj-progress-times">
                <span>{formatTime(positionB)}</span>
                <span>{formatTime(durationB)}</span>
              </div>
            </div>

            {/* Volume Fader */}
            <DJFader 
              value={volumeB}
              onChange={handleVolumeChange}
              label="Volume"
              deck="B"
            />

            {/* Fine Tune */}
            <div className="dj-fine-tune">
              <div className="dj-fine-tune-label">Fine Tune</div>
              <input
                className="dj-fine-tune-slider"
                type="range"
                min="-0.5"
                max="0.5"
                step="0.01"
                value={fineTuneB}
                onChange={(e) => handleFineTuneB(e.target.value)}
              />
              <div className="dj-fine-tune-value">
                {fineTuneB > 0 ? '+' : ''}{fineTuneB}s
              </div>
            </div>

            {/* EQ Section */}
            <button
              onClick={() => setEqCollapsedB(!eqCollapsedB)}
              className={`dj-eq-toggle ${eqCollapsedB ? 'collapsed' : ''}`}
            >
              EQ
            </button>
            
            <DJEqualizer 
              deck="B"
              driver={driver.current}
              isCollapsed={eqCollapsedB}
              onToggleCollapse={() => setEqCollapsedB(!eqCollapsedB)}
            />

            {/* Track Search */}
            <div className="dj-track-search">
              <input
                type="text"
                placeholder="Search tracks for Deck B..."
                value={searchB}
                onChange={(e) => setSearchB(e.target.value)}
                className="dj-search-input"
              />
            </div>

            {/* Track List */}
            <div className="dj-track-list">
              {filteredTracksB.length > 0 ? (
                filteredTracksB.slice(0, 8).map((track, index) => (
                  <div
                    key={index}
                    className="dj-track-item"
                    onClick={() => loadTrack(track, 'B')}
                  >
                    <div className="dj-track-item-title">{track.title}</div>
                    <div className="dj-track-item-artist">{track.artist}</div>
                    <div className="dj-track-item-duration">
                      {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="dj-loading">
                  {tracks.length === 0 ? 'Loading tracks...' : 'No tracks found'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
