import React, { useState, useEffect, useRef } from 'react';
import { toLocal } from '../../utils/paths.js';
import { Toast } from '../../DJ/Mixer/Common/Toast';

export default function DJInterface({ onNavigate }) {
  // Deck A state
  const audioRefA = useRef(new Audio());
  const [trackA, setTrackA] = useState(null);
  const [isPlayingA, setIsPlayingA] = useState(false);
  const [positionA, setPositionA] = useState(0);
  const [durationA, setDurationA] = useState(0);
  const [volumeA, setVolumeA] = useState(1);

  // Deck B state
  const audioRefB = useRef(new Audio());
  const [trackB, setTrackB] = useState(null);
  const [isPlayingB, setIsPlayingB] = useState(false);
  const [positionB, setPositionB] = useState(0);
  const [durationB, setDurationB] = useState(0);
  const [volumeB, setVolumeB] = useState(0.8);

  // Crossfader state (0 = full A, 1 = full B)
  const [crossfader, setCrossfader] = useState(0.5);

  // Track library and other state
  const [tracks, setTracks] = useState([]);
  const [toast, setToast] = useState(null);

  // Load tracks from library on mount
  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    try {
      const result = await window.api.invoke('library:getTracks', {});
      if (result && Array.isArray(result)) {
        setTracks(result);
        console.log(`Loaded ${result.length} tracks for DJ mode`);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
      showToast('Failed to load music library', 'error');
    }
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Setup audio event handlers for Deck A
  useEffect(() => {
    const audio = audioRefA.current;
    
    const handleLoadedMetadata = () => setDurationA(audio.duration);
    const handleTimeUpdate = () => setPositionA(audio.currentTime);
    const handlePlay = () => setIsPlayingA(true);
    const handlePause = () => setIsPlayingA(false);
    const handleEnded = () => setIsPlayingA(false);
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Setup audio event handlers for Deck B
  useEffect(() => {
    const audio = audioRefB.current;
    
    const handleLoadedMetadata = () => setDurationB(audio.duration);
    const handleTimeUpdate = () => setPositionB(audio.currentTime);
    const handlePlay = () => setIsPlayingB(true);
    const handlePause = () => setIsPlayingB(false);
    const handleEnded = () => setIsPlayingB(false);
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Apply crossfader mixing
  useEffect(() => {
    const adjustedVolumeA = (1 - crossfader) * volumeA;
    const adjustedVolumeB = crossfader * volumeB;
    
    audioRefA.current.volume = Math.max(0, Math.min(1, adjustedVolumeA));
    audioRefB.current.volume = Math.max(0, Math.min(1, adjustedVolumeB));
  }, [crossfader, volumeA, volumeB]);

  const loadTrackToDeck = async (track, deck) => {
    try {
      console.log(`Loading track to Deck ${deck}:`, track.title);
      
      const localUrl = toLocal(track.filePath);
      
      if (deck === 'A') {
        setTrackA(track);
        audioRefA.current.src = localUrl;
        audioRefA.current.load();
      } else {
        setTrackB(track);
        audioRefB.current.src = localUrl;
        audioRefB.current.load();
      }
      
      showToast(`Loaded to Deck ${deck}: ${track.title}`, 'success');
    } catch (err) {
      console.error(`Failed to load track to Deck ${deck}:`, err);
      showToast(`Failed to load track to Deck ${deck}`, 'error');
    }
  };

  const togglePlayPause = (deck) => {
    if (deck === 'A') {
      if (isPlayingA) {
        audioRefA.current.pause();
      } else {
        audioRefA.current.play().catch(err => {
          console.error('Failed to play Deck A:', err);
          showToast('Failed to play Deck A', 'error');
        });
      }
    } else {
      if (isPlayingB) {
        audioRefB.current.pause();
      } else {
        audioRefB.current.play().catch(err => {
          console.error('Failed to play Deck B:', err);
          showToast('Failed to play Deck B', 'error');
        });
      }
    }
  };

  const stop = (deck) => {
    if (deck === 'A') {
      audioRefA.current.pause();
      audioRefA.current.currentTime = 0;
    } else {
      audioRefB.current.pause();
      audioRefB.current.currentTime = 0;
    }
  };

  const seekTo = (time, deck) => {
    if (deck === 'A') {
      audioRefA.current.currentTime = time;
    } else {
      audioRefB.current.currentTime = time;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">NGKs Player - DJ Mode</h1>
          <p className="text-gray-400">Dual deck DJ interface</p>
        </div>
        <button
          onClick={() => onNavigate?.('library')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center space-x-2"
        >
          <span>📚</span>
          <span>Library</span>
        </button>
      </div>

      {/* DJ Interface */}
      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Deck A */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-center">Deck A</h2>
          
          {/* Track Info */}
          <div className="mb-4 text-center">
            {trackA ? (
              <>
                <div className="font-semibold text-lg">{trackA.title || 'Unknown Title'}</div>
                <div className="text-gray-400">{trackA.artist || 'Unknown Artist'}</div>
                <div className="text-sm text-gray-500">{trackA.album || 'Unknown Album'}</div>
              </>
            ) : (
              <div className="text-gray-500">No track loaded</div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={durationA || 0}
              value={positionA}
              onChange={(e) => seekTo(parseFloat(e.target.value), 'A')}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{formatTime(positionA)}</span>
              <span>{formatTime(durationA)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-2 mb-4">
            <button
              onClick={() => togglePlayPause('A')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              disabled={!trackA}
            >
              {isPlayingA ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => stop('A')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              disabled={!trackA}
            >
              ⏹ Stop
            </button>
          </div>

          {/* Volume */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volumeA}
              onChange={(e) => setVolumeA(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm">{Math.round(volumeA * 100)}%</div>
          </div>

          {/* Quick Cues */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(cue => (
              <button
                key={cue}
                className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {cue}
              </button>
            ))}
          </div>
        </div>

        {/* Crossfader Section */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex flex-col justify-center">
          <h2 className="text-xl font-bold mb-6 text-center">Crossfader</h2>
          
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-400 font-semibold">A</span>
            <span className="text-red-400 font-semibold">B</span>
          </div>
          
          <div className="relative mb-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={crossfader}
              onChange={(e) => setCrossfader(parseFloat(e.target.value))}
              className="w-full h-8 bg-gradient-to-r from-blue-600 to-red-600 rounded-full appearance-none"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${crossfader * 100}%, #dc2626 ${crossfader * 100}%, #dc2626 100%)`
              }}
            />
          </div>
          
          <div className="text-center text-sm text-gray-400">
            {Math.round((1 - crossfader) * 100)}% A • {Math.round(crossfader * 100)}% B
          </div>
        </div>

        {/* Deck B */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h2 className="text-xl font-bold mb-4 text-center">Deck B</h2>
          
          {/* Track Info */}
          <div className="mb-4 text-center">
            {trackB ? (
              <>
                <div className="font-semibold text-lg">{trackB.title || 'Unknown Title'}</div>
                <div className="text-gray-400">{trackB.artist || 'Unknown Artist'}</div>
                <div className="text-sm text-gray-500">{trackB.album || 'Unknown Album'}</div>
              </>
            ) : (
              <div className="text-gray-500">No track loaded</div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={durationB || 0}
              value={positionB}
              onChange={(e) => seekTo(parseFloat(e.target.value), 'B')}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>{formatTime(positionB)}</span>
              <span>{formatTime(durationB)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex justify-center space-x-2 mb-4">
            <button
              onClick={() => togglePlayPause('B')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              disabled={!trackB}
            >
              {isPlayingB ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => stop('B')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              disabled={!trackB}
            >
              ⏹ Stop
            </button>
          </div>

          {/* Volume */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Volume</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volumeB}
              onChange={(e) => setVolumeB(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm">{Math.round(volumeB * 100)}%</div>
          </div>

          {/* Quick Cues */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(cue => (
              <button
                key={cue}
                className="py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded text-sm"
              >
                {cue}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track List */}
      <div className="p-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Track Library</h3>
        <div className="max-h-64 overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {tracks.slice(0, 20).map((track, index) => (
              <div
                key={track.id || index}
                className="p-3 bg-gray-800 border border-gray-700 rounded flex justify-between items-center"
              >
                <div>
                  <div className="font-medium">{track.title || 'Unknown Title'}</div>
                  <div className="text-sm text-gray-400">
                    {track.artist || 'Unknown Artist'} • {track.album || 'Unknown Album'}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadTrackToDeck(track, 'A')}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                  >
                    Load A
                  </button>
                  <button
                    onClick={() => loadTrackToDeck(track, 'B')}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                  >
                    Load B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Messages */}
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
