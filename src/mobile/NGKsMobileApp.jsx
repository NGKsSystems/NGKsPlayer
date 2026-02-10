/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: NGKsMobileApp.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player - Mobile Companion App (Progressive Web App)
 * 
 * Revolutionary mobile DJ control that makes other apps obsolete:
 * - Full remote control of NGKs Player
 * - Mobile library browsing and search
 * - Real-time waveform display
 * - Touch mixing controls
 * - Wireless streaming from mobile
 * - Multi-device collaboration
 * - Works on iOS, Android, and tablets
 * 
 * Goal: Make DJs prefer NGKs mobile experience over dedicated mobile DJ apps
 */

import React, { useState, useEffect, useRef } from 'react';

const NGKsMobileApp = ({ websocketUrl = 'ws://localhost:8080' }) => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [deckA, setDeckA] = useState({
    track: null,
    playing: false,
    position: 0,
    bpm: 128,
    volume: 0.8,
    crossfaderPosition: 0.5
  });
  const [deckB, setDeckB] = useState({
    track: null,
    playing: false,
    position: 0,
    bpm: 128,
    volume: 0.8
  });
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('mixer');
  const [hapticEnabled, setHapticEnabled] = useState(true);
  
  const websocketRef = useRef(null);
  const canvasRef = useRef(null);

  // WebSocket connection to main NGKs Player
  useEffect(() => {
    connectToNGKsPlayer();
    
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  const connectToNGKsPlayer = () => {
    try {
      websocketRef.current = new WebSocket(websocketUrl);
      
      websocketRef.current.onopen = () => {
        console.log('📱 Connected to NGKs Player');
        setConnectionStatus('connected');
        
        // Send mobile app identification
        sendMessage({
          type: 'mobile_app_connect',
          device: {
            type: 'mobile',
            userAgent: navigator.userAgent,
            screen: {
              width: window.screen.width,
              height: window.screen.height
            }
          }
        });
      };

      websocketRef.current.onmessage = (event) => {
        handleMessage(JSON.parse(event.data));
      };

      websocketRef.current.onclose = () => {
        console.log('📱 Disconnected from NGKs Player');
        setConnectionStatus('disconnected');
        
        // Attempt reconnection
        setTimeout(connectToNGKsPlayer, 3000);
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectionStatus('error');
    }
  };

  const sendMessage = (message) => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    }
  };

  const handleMessage = (message) => {
    switch (message.type) {
      case 'deck_update':
        if (message.deck === 'A') {
          setDeckA(prev => ({ ...prev, ...message.data }));
        } else if (message.deck === 'B') {
          setDeckB(prev => ({ ...prev, ...message.data }));
        }
        break;
        
      case 'search_results':
        setSearchResults(message.results);
        break;
        
      case 'waveform_data':
        updateWaveform(message.data);
        break;
        
      default:
        console.log('Unknown message:', message);
    }
  };

  // Haptic feedback
  const triggerHaptic = (type = 'light') => {
    if (hapticEnabled && navigator.vibrate) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [50],
        double: [20, 10, 20]
      };
      navigator.vibrate(patterns[type] || patterns.light);
    }
  };

  // Deck controls
  const togglePlay = (deck) => {
    sendMessage({
      type: 'deck_control',
      deck: deck,
      action: 'toggle_play'
    });
    triggerHaptic('medium');
  };

  const setCue = (deck) => {
    sendMessage({
      type: 'deck_control',
      deck: deck,
      action: 'cue'
    });
    triggerHaptic('heavy');
  };

  const adjustVolume = (deck, volume) => {
    sendMessage({
      type: 'deck_control',
      deck: deck,
      action: 'volume',
      value: volume
    });
    
    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, volume }));
    } else {
      setDeckB(prev => ({ ...prev, volume }));
    }
  };

  const adjustCrossfader = (position) => {
    sendMessage({
      type: 'mixer_control',
      action: 'crossfader',
      value: position
    });
    
    setDeckA(prev => ({ ...prev, crossfaderPosition: position }));
    triggerHaptic('light');
  };

  // Search functionality
  const searchTracks = (query) => {
    sendMessage({
      type: 'search',
      query: query,
      source: 'mobile'
    });
  };

  const loadTrack = (track, deck) => {
    sendMessage({
      type: 'load_track',
      track: track,
      deck: deck
    });
    triggerHaptic('double');
  };

  // Waveform visualization
  const updateWaveform = (waveformData) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    const width = canvas.width;
    const height = canvas.height;
    const centerY = height / 2;
    
    waveformData.forEach((amplitude, index) => {
      const x = (index / waveformData.length) * width;
      const y = centerY + (amplitude * centerY);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
  };

  // Touch gestures for jog wheels
  const handleJogTouch = (deck, event) => {
    const touch = event.touches[0];
    const rect = event.target.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const deltaX = touch.clientX - rect.left - centerX;
    const deltaY = touch.clientY - rect.top - centerY;
    const angle = Math.atan2(deltaY, deltaX);
    
    sendMessage({
      type: 'jog_wheel',
      deck: deck,
      angle: angle,
      touch: true
    });
    
    triggerHaptic('light');
  };

  if (connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-2xl font-bold mb-2">NGKs Mobile</h1>
          <p className="text-gray-400 mb-4">Connecting to NGKs Player...</p>
          <div className="animate-pulse">
            <div className="w-8 h-8 bg-blue-500 rounded-full mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-black p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">📱 NGKs Mobile</h1>
        <div className={`w-3 h-3 rounded-full ${
          connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
        }`}></div>
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-gray-800">
        {['mixer', 'library', 'effects'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 p-3 text-center capitalize ${
              activeTab === tab 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mixer Tab */}
      {activeTab === 'mixer' && (
        <div className="p-4 space-y-6">
          {/* Waveform Display */}
          <div className="bg-black rounded-lg p-4">
            <canvas 
              ref={canvasRef}
              width={350}
              height={80}
              className="w-full h-20 border border-gray-700 rounded"
            />
          </div>

          {/* Deck Controls */}
          <div className="grid grid-cols-2 gap-4">
            {/* Deck A */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-center font-bold mb-4 text-red-400">DECK A</h3>
              
              {/* Jog Wheel */}
              <div 
                className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 border-4 border-red-500 flex items-center justify-center"
                onTouchStart={(e) => handleJogTouch('A', e)}
                onTouchMove={(e) => handleJogTouch('A', e)}
              >
                <div className="w-2 h-8 bg-red-500 rounded"></div>
              </div>

              {/* Transport */}
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => togglePlay('A')}
                  className={`px-4 py-2 rounded font-bold ${
                    deckA.playing ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {deckA.playing ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => setCue('A')}
                  className="px-4 py-2 bg-orange-600 rounded font-bold"
                >
                  CUE
                </button>
              </div>

              {/* Volume */}
              <div className="mb-2">
                <label className="block text-xs mb-1">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={deckA.volume}
                  onChange={(e) => adjustVolume('A', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Track Info */}
              {deckA.track && (
                <div className="text-xs text-gray-400 text-center">
                  <div className="truncate">{deckA.track.title}</div>
                  <div className="truncate">{deckA.track.artist}</div>
                  <div>{deckA.bpm} BPM</div>
                </div>
              )}
            </div>

            {/* Deck B */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-center font-bold mb-4 text-blue-400">DECK B</h3>
              
              {/* Jog Wheel */}
              <div 
                className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-4 border-4 border-blue-500 flex items-center justify-center"
                onTouchStart={(e) => handleJogTouch('B', e)}
                onTouchMove={(e) => handleJogTouch('B', e)}
              >
                <div className="w-2 h-8 bg-blue-500 rounded"></div>
              </div>

              {/* Transport */}
              <div className="flex justify-center gap-2 mb-4">
                <button
                  onClick={() => togglePlay('B')}
                  className={`px-4 py-2 rounded font-bold ${
                    deckB.playing ? 'bg-green-600' : 'bg-gray-600'
                  }`}
                >
                  {deckB.playing ? '⏸️' : '▶️'}
                </button>
                <button
                  onClick={() => setCue('B')}
                  className="px-4 py-2 bg-orange-600 rounded font-bold"
                >
                  CUE
                </button>
              </div>

              {/* Volume */}
              <div className="mb-2">
                <label className="block text-xs mb-1">Volume</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={deckB.volume}
                  onChange={(e) => adjustVolume('B', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Track Info */}
              {deckB.track && (
                <div className="text-xs text-gray-400 text-center">
                  <div className="truncate">{deckB.track.title}</div>
                  <div className="truncate">{deckB.track.artist}</div>
                  <div>{deckB.bpm} BPM</div>
                </div>
              )}
            </div>
          </div>

          {/* Crossfader */}
          <div className="bg-gray-800 rounded-lg p-4">
            <label className="block text-center font-bold mb-2">Crossfader</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={deckA.crossfaderPosition}
              onChange={(e) => adjustCrossfader(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>A</span>
              <span>CENTER</span>
              <span>B</span>
            </div>
          </div>
        </div>
      )}

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="p-4">
          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search tracks..."
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-white"
              onChange={(e) => searchTracks(e.target.value)}
            />
          </div>

          {/* Search Results */}
          <div className="space-y-2">
            {searchResults.map((track, index) => (
              <div key={index} className="bg-gray-800 rounded p-3 flex justify-between items-center">
                <div className="flex-1">
                  <div className="font-semibold truncate">{track.title}</div>
                  <div className="text-sm text-gray-400 truncate">{track.artist}</div>
                  <div className="text-xs text-gray-500">
                    {track.bpm} BPM • {track.key}
                  </div>
                </div>
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => loadTrack(track, 'A')}
                    className="px-2 py-1 bg-red-600 rounded text-xs"
                  >
                    A
                  </button>
                  <button
                    onClick={() => loadTrack(track, 'B')}
                    className="px-2 py-1 bg-blue-600 rounded text-xs"
                  >
                    B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effects Tab */}
      {activeTab === 'effects' && (
        <div className="p-4">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-4">🎛️</div>
            <h3 className="text-xl font-bold mb-2">Effects Panel</h3>
            <p>Touch-based effects coming soon!</p>
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={() => setHapticEnabled(!hapticEnabled)}
          className={`w-12 h-12 rounded-full ${
            hapticEnabled ? 'bg-green-600' : 'bg-gray-600'
          } flex items-center justify-center`}
        >
          📳
        </button>
      </div>
    </div>
  );
};

export default NGKsMobileApp;
