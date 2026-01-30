import React, { useState, useRef, useEffect } from 'react';
import { formatTime } from './utils/timeUtils';
import './styles.css';

// COMPLETELY NEW PRO CLIPPER - NO EXISTING CODE
const ProClipperV2 = ({ onNavigate }) => {
  // Basic state
  const [file, setFile] = useState(null);
  const [audioData, setAudioData] = useState(null);
  const [waveformData, setWaveformData] = useState(null);
  const [playPosition, setPlayPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [startMark, setStartMark] = useState(null);
  const [endMark, setEndMark] = useState(null);
  const [clips, setClips] = useState([]);
  
  // Simple audio player - using a basic approach
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  // Analyze real audio data to get waveform
  const analyzeAudioFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Get the audio data (use first channel)
      const channelData = audioBuffer.getChannelData(0);
      const samples = 800; // Number of bars we want
      const blockSize = Math.floor(channelData.length / samples);
      const waveform = [];
      
      // Analyze audio in blocks to create waveform
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j] || 0);
        }
        waveform.push(sum / blockSize); // Average amplitude for this block
      }
      
      setWaveformData(waveform);
      audioContext.close();
    } catch (error) {
      console.error('Audio analysis failed:', error);
      setWaveformData(null);
    }
  };

  // Load audio file
  const loadFile = async (selectedFile) => {
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
      
      // FORCE a visible waveform immediately for testing
      console.log('Creating test waveform...');
      const testWaveform = [];
      for (let i = 0; i < 800; i++) {
        testWaveform.push(Math.random() * 0.8 + 0.1); // Random but visible
      }
      setWaveformData(testWaveform);
      
      // Then try to analyze the real audio
      try {
        await analyzeAudioFile(selectedFile);
      } catch (e) {
        console.error('Real analysis failed, keeping test waveform');
      }
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

  // REAL waveform display using actual audio data
  const renderWaveform = () => {
    if (!audioData) return null;
    
    const width = 800;
    const height = 1200; // 3x taller (was 400, now 1200)
    const duration = audioData.duration;
    
    // Use REAL waveform data if available, otherwise show loading
    if (!waveformData) {
      return (
        <div className="waveform-container" style={{ margin: '20px 0' }}>
          <div style={{ 
            width: width, 
            height: height, 
            border: '2px solid #555', 
            background: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '24px'
          }}>
            Analyzing audio... Please wait
          </div>
        </div>
      );
    }
    
    // Render REAL waveform bars
    const bars = [];
    for (let i = 0; i < waveformData.length; i++) {
      const amplitude = waveformData[i];
      const barHeight = Math.max(8, amplitude * height * 0.9); // Bigger minimum height, more of container
      const x = (i / waveformData.length) * width;
      
      bars.push(
        <rect
          key={i}
          x={x}
          y={(height - barHeight) / 2}
          width={width / waveformData.length}
          height={barHeight}
          fill="#00aaff"
          opacity="0.8"
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
          style={{ border: '2px solid #555', background: '#000' }} // Black background, thicker border
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
            stroke="#ffff00"
            strokeWidth="3"
          />
          
          {/* Start mark */}
          {startMark !== null && (
            <line 
              x1={(startMark / duration) * width} 
              y1="0" 
              x2={(startMark / duration) * width} 
              y2={height}
              stroke="#00ff00"
              strokeWidth="4"
            />
          )}
          
          {/* End mark */}
          {endMark !== null && (
            <line 
              x1={(endMark / duration) * width} 
              y1="0" 
              x2={(endMark / duration) * width} 
              y2={height}
              stroke="#ff0000"
              strokeWidth="4"
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
