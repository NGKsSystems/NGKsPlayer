import React, { useState, useRef, useEffect } from 'react';
import { formatTime } from './utils/timeUtils';
import './styles.css';

// COMPLETELY NEW PRO CLIPPER - NO EXISTING CODE
const ProClipperV2 = ({ onNavigate }) => {
  // Basic state
  const [file, setFile] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [playPosition, setPlayPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [startMark, setStartMark] = useState(null);
  const [endMark, setEndMark] = useState(null);
  const [clips, setClips] = useState([]);
  
  // Simple audio player - using a basic approach
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // Load audio file
  const loadFile = (selectedFile) => {
    if (selectedFile) {
      const url = URL.createObjectURL(selectedFile);
      
      // Create simple audio element
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setFile(selectedFile);
        setAudioData({
          duration: audio.duration,
          url: url
        });
        setPlayPosition(0);
        setPlaying(false);
      });
      
      playerRef.current = audio;
    }
  };

  // Simple play/pause with SOUND
  const togglePlay = () => {
    if (!playerRef.current) return;
    
    if (playing) {
      playerRef.current.pause();
      setPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      playerRef.current.currentTime = playPosition;
      playerRef.current.volume = 1.0; // Ensure volume is at maximum
      
      // IMPORTANT: Actually play the audio
      const playPromise = playerRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setPlaying(true);
          
          // Simple interval timer - matches real time exactly
          intervalRef.current = setInterval(() => {
            if (playerRef.current) {
              setPlayPosition(playerRef.current.currentTime);
            }
          }, 100); // Update every 100ms
        }).catch(error => {
          console.error('Play failed:', error);
          alert('Audio play failed. Click anywhere on the page first, then try again.');
        });
      }
    }
  };

  // Stop playback
  const stopPlay = () => {
    if (!playerRef.current) return;
    
    playerRef.current.pause();
    playerRef.current.currentTime = 0;
    setPlayPosition(0);
    setPlaying(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Seek to position
  const seekTo = (seconds) => {
    if (!playerRef.current || !audioData) return;
    
    const clampedTime = Math.max(0, Math.min(seconds, audioData.duration));
    playerRef.current.currentTime = clampedTime;
    setPlayPosition(clampedTime);
  };

  // Mark start point
  const markStart = () => {
    setStartMark(playPosition);
  };

  // Mark end point
  const markEnd = () => {
    setEndMark(playPosition);
  };

  // Create clip
  const createClip = () => {
    if (startMark === null || endMark === null) {
      alert('Set start and end marks first');
      return;
    }
    
    if (startMark >= endMark) {
      alert('Start must be before end');
      return;
    }
    
    const newClip = {
      id: Date.now(),
      name: `Clip ${clips.length + 1}`,
      start: startMark,
      end: endMark,
      duration: endMark - startMark
    };
    
    setClips([...clips, newClip]);
  };

  // Static waveform display
  const renderWaveform = () => {
    if (!audioData) return null;
    
    const width = 800;
    const height = 400; // Much taller
    const duration = audioData.duration;
    
    // Static bars for waveform visualization (generated once based on file name)
    const bars = [];
    const seed = file ? file.name.split('').reduce((a, b) => a + b.charCodeAt(0), 0) : 0;
    for (let i = 0; i < width; i += 4) {
      // Use seed to make consistent waveform shape for same file
      const pseudoRandom = Math.sin(seed + i * 0.1) * 0.5 + 0.5;
      const height_val = pseudoRandom * height * 0.7 + 20;
      bars.push(
        <rect
          key={i}
          x={i}
          y={(height - height_val) / 2}
          width="2"
          height={height_val}
          fill="#3b82f6"
        />
      );
    }
    
    // Position indicator
    const positionX = (playPosition / duration) * width;
    
    return (
      <div className="waveform-container" style={{ margin: '20px 0' }}>
        <svg 
          width={width} 
          height={height} 
          style={{ border: '1px solid #333', background: '#1a1a1a' }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const time = (x / width) * duration;
            seekTo(time);
          }}
        >
          {bars}
          
          {/* Position line */}
          <line 
            x1={positionX} 
            y1="0" 
            x2={positionX} 
            y2={height}
            stroke="#fbbf24"
            strokeWidth="2"
          />
          
          {/* Start mark */}
          {startMark !== null && (
            <line 
              x1={(startMark / duration) * width} 
              y1="0" 
              x2={(startMark / duration) * width} 
              y2={height}
              stroke="#00ff88"
              strokeWidth="3"
            />
          )}
          
          {/* End mark */}
          {endMark !== null && (
            <line 
              x1={(endMark / duration) * width} 
              y1="0" 
              x2={(endMark / duration) * width} 
              y2={height}
              stroke="#ef4444"
              strokeWidth="3"
            />
          )}
        </svg>
        
        <div style={{ color: '#888', marginTop: '10px' }}>
          Click on waveform to seek • Current: {formatTime(playPosition * 1000)}
          {audioData && ` / ${formatTime(audioData.duration * 1000)}`}
        </div>
      </div>
    );
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.pause();
      }
    };
  }, []);

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1>🎬 Pro Clipper V2 - COMPLETELY NEW</h1>
        <button 
          onClick={() => onNavigate?.('library')}
          style={{ padding: '10px 20px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          ← Back to Library
        </button>
      </div>

      {/* File Loader */}
      <div style={{ marginBottom: '30px' }}>
        <label style={{ display: 'block', marginBottom: '10px' }}>Load Audio File:</label>
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => loadFile(e.target.files[0])}
          style={{ padding: '10px', background: '#333', color: '#fff', border: '1px solid #555' }}
        />
        {file && <div style={{ marginTop: '10px', color: '#888' }}>Loaded: {file.name}</div>}
      </div>

      {/* Transport Controls */}
      {audioData && (
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={togglePlay}
            style={{ padding: '15px 30px', marginRight: '10px', background: playing ? '#ef4444' : '#00aa00', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px' }}
          >
            {playing ? '⏸ Pause' : '▶ Play'}
          </button>
          
          <button 
            onClick={stopPlay}
            style={{ padding: '15px 30px', marginRight: '20px', background: '#666', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '16px' }}
          >
            ⏹ Stop
          </button>
          
          <button 
            onClick={markStart}
            style={{ padding: '10px 20px', marginRight: '10px', background: '#00ff88', color: '#000', border: 'none', borderRadius: '5px' }}
          >
            Mark Start
          </button>
          
          <button 
            onClick={markEnd}
            style={{ padding: '10px 20px', marginRight: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '5px' }}
          >
            Mark End
          </button>
          
          <button 
            onClick={createClip}
            style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '5px' }}
            disabled={startMark === null || endMark === null}
          >
            Create Clip
          </button>
        </div>
      )}

      {/* Waveform */}
      {renderWaveform()}

      {/* Clip List */}
      {clips.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>Created Clips ({clips.length})</h3>
          <div style={{ display: 'grid', gap: '10px', marginTop: '15px' }}>
            {clips.map(clip => (
              <div 
                key={clip.id} 
                style={{ 
                  padding: '15px', 
                  background: '#222', 
                  borderRadius: '5px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <strong>{clip.name}</strong>
                  <div style={{ color: '#888', fontSize: '14px' }}>
                    {formatTime(clip.start * 1000)} → {formatTime(clip.end * 1000)} 
                    (Duration: {formatTime(clip.duration * 1000)})
                  </div>
                </div>
                <button
                  onClick={() => setClips(clips.filter(c => c.id !== clip.id))}
                  style={{ padding: '5px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '3px' }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProClipperV2;
