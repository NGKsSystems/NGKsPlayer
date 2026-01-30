import React, { useState, useEffect, useRef } from 'react';
import './DJSimple.css';
import { DualAudioDriver } from '../audio/dualDriver.js';
import SoundSnippetPads from '../components/SoundSnippetPads.jsx';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../DJ/Mixer/Common/Toast';

function DJSimple({ onNavigate }) {
  
  // Audio refs for dual decks
  const audioRefA = useRef(new Audio());
  const audioRefB = useRef(new Audio());

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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('title');

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
  const [waveformA, setWaveformA] = useState(Array(40).fill().map(() => Math.random() * 100));
  const [waveformB, setWaveformB] = useState(Array(40).fill().map(() => Math.random() * 100));

  // 16-Band EQ State
  const frequencies = ['20Hz', '25Hz', '31Hz', '40Hz', '50Hz', '63Hz', '80Hz', '100Hz', '125Hz', '160Hz', '200Hz', '250Hz', '315Hz', '400Hz', '500Hz', '630Hz'];
  const [eq16BandA, setEq16BandA] = useState(Array(16).fill(0));
  const [eq16BandB, setEq16BandB] = useState(Array(16).fill(0));
  const [eqACollapsed, setEqACollapsed] = useState(false);
  const [eqBCollapsed, setEqBCollapsed] = useState(false);

  // Load tracks on component mount
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const response = await window.api.invoke('scan-music');
      if (response.success) {
        setTracks(response.tracks || []);
      }
    } catch (error) {
      console.error('Error loading tracks:', error);
      // Load sample tracks for demo
      setTracks([
        { title: 'Sample Track 1', artist: 'Artist 1', bpm: 128, key: 'Cm', genre: 'House', duration: 240, path: '/sample1.mp3' },
        { title: 'Sample Track 2', artist: 'Artist 2', bpm: 132, key: 'Am', genre: 'Techno', duration: 300, path: '/sample2.mp3' },
        { title: 'Sample Track 3', artist: 'Artist 3', bpm: 140, key: 'Gm', genre: 'Trance', duration: 420, path: '/sample3.mp3' }
      ]);
    }
  };

  // Helper Functions
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFilteredTracks = () => {
    let filtered = tracks;
    
    if (searchTerm) {
      filtered = filtered.filter(track => 
        track.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.artist?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        track.genre?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'artist': return (a.artist || '').localeCompare(b.artist || '');
        case 'bpm': return (a.bpm || 0) - (b.bpm || 0);
        case 'key': return (a.key || '').localeCompare(b.key || '');
        case 'genre': return (a.genre || '').localeCompare(b.genre || '');
        default: return (a.title || '').localeCompare(b.title || '');
      }
    });
  };

  // DJ Control Functions
  const loadTrack = (deck, track) => {
    if (deck === 'A') {
      setTrackA(track);
      audioRefA.current.src = toLocal(track.path);
    } else {
      setTrackB(track);
      audioRefB.current.src = toLocal(track.path);
    }
    setToast({ message: `Loaded "${track.title}" to Deck ${deck}`, type: 'success' });
  };

  const togglePlay = (deck) => {
    if (deck === 'A') {
      if (isPlayingA) {
        audioRefA.current.pause();
      } else {
        audioRefA.current.play();
      }
      setIsPlayingA(!isPlayingA);
    } else {
      if (isPlayingB) {
        audioRefB.current.pause();
      } else {
        audioRefB.current.play();
      }
      setIsPlayingB(!isPlayingB);
    }
  };

  const toggleCue = (deck) => {
    if (deck === 'A') {
      setCueA(!cueA);
    } else {
      setCueB(!cueB);
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

  const setHotCue = (deck, index) => {
    const currentTime = deck === 'A' ? positionA : positionB;
    if (deck === 'A') {
      const newCues = [...hotCuesA];
      newCues[index] = { active: true, time: currentTime, name: `Cue ${index + 1}` };
      setHotCuesA(newCues);
    } else {
      const newCues = [...hotCuesB];
      newCues[index] = { active: true, time: currentTime, name: `Cue ${index + 1}` };
      setHotCuesB(newCues);
    }
  };

  const jumpToHotCue = (deck, index) => {
    const cue = deck === 'A' ? hotCuesA[index] : hotCuesB[index];
    if (cue.active) {
      if (deck === 'A') {
        audioRefA.current.currentTime = cue.time;
        setPositionA(cue.time);
      } else {
        audioRefB.current.currentTime = cue.time;
        setPositionB(cue.time);
      }
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
    <div className="dj-simple">
      {/* Header */}
      <header className="dj-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => onNavigate('Dashboard')}>
            ← Back
          </button>
        </div>
        <h1 className="header-title">NGKs DJ Professional</h1>
        <div className="header-right">
          <div className="status-indicators">
            <div className={`status-dot ${isPlayingA || isPlayingB ? 'active' : ''}`}></div>
            <span>Live</span>
          </div>
        </div>
      </header>

      {/* Main DJ Interface */}
      <main className="dj-main">
        
        {/* Left Deck A */}
        <section className="deck deck-a">
          <div className="deck-header">
            <h2>DECK A</h2>
            <div className="deck-bpm-key">
              <span>BPM: {trackA?.bpm || '--'}</span>
              <span>Key: {trackA?.key || '--'}</span>
            </div>
          </div>
          
          <div className="track-info">
            <div className="track-title">{trackA?.title || 'No Track Loaded'}</div>
            <div className="track-artist">{trackA?.artist || ''}</div>
            <div className="track-time">
              {formatTime(positionA)} / {formatTime(durationA)}
            </div>
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
                    const newCues = [...hotCuesA];
                    newCues[index] = { active: false, time: 0, name: '' };
                    setHotCuesA(newCues);
                  }}
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

          {/* Transport Controls */}
          <div className="transport-controls">
            <button 
              className={`cue-btn ${cueA ? 'active' : ''}`}
              onClick={() => toggleCue('A')}
            >
              CUE
            </button>
            <button 
              className={`play-btn ${isPlayingA ? 'playing' : ''}`}
              onClick={() => togglePlay('A')}
            >
              {isPlayingA ? '⏸️' : '▶️'}
            </button>
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
                    const newCues = [...hotCuesB];
                    newCues[index] = { active: false, time: 0, name: '' };
                    setHotCuesB(newCues);
                  }}
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

          {/* Transport Controls */}
          <div className="transport-controls">
            <button 
              className={`cue-btn ${cueB ? 'active' : ''}`}
              onClick={() => toggleCue('B')}
            >
              CUE
            </button>
            <button 
              className={`play-btn ${isPlayingB ? 'playing' : ''}`}
              onClick={() => togglePlay('B')}
            >
              {isPlayingB ? '⏸️' : '▶️'}
            </button>
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

      {/* Library Section */}
      <section className="library-section">
        <div className="library-header">
          <h2>MUSIC LIBRARY</h2>
          <div className="library-controls">
            <input
              type="text"
              placeholder="Search tracks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="bpm">BPM</option>
              <option value="key">Key</option>
              <option value="genre">Genre</option>
            </select>
            <button 
              className="scan-btn"
              onClick={() => onNavigate('ScanMusic')}
            >
              SCAN MUSIC
            </button>
          </div>
        </div>

        <div className="library-content">
          <div className="library-table">
            <div className="table-header">
              <div className="col-title">Title</div>
              <div className="col-artist">Artist</div>
              <div className="col-bpm">BPM</div>
              <div className="col-key">Key</div>
              <div className="col-genre">Genre</div>
              <div className="col-duration">Duration</div>
              <div className="col-actions">Actions</div>
            </div>
            
            <div className="table-body">
              {getFilteredTracks().map((track, index) => (
                <div key={index} className="table-row">
                  <div className="col-title">{track.title}</div>
                  <div className="col-artist">{track.artist}</div>
                  <div className="col-bpm">{track.bpm}</div>
                  <div className="col-key">{track.key}</div>
                  <div className="col-genre">{track.genre}</div>
                  <div className="col-duration">{formatTime(track.duration)}</div>
                  <div className="col-actions">
                    <button
                      className="load-deck-btn deck-a-load"
                      onClick={() => loadTrack('A', track)}
                    >
                      DECK A
                    </button>
                    <button
                      className="load-deck-btn deck-b-load"
                      onClick={() => loadTrack('B', track)}
                    >
                      DECK B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
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