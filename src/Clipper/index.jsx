import React, { useState, useRef, useEffect } from 'react';

// ABSOLUTE SIMPLEST WORKING VERSION
const ProClipperSimple = ({ onNavigate }) => {
  const [file, setFile] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);

  // FORCE draw a visible waveform
  const drawTestWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = 1000;  // Fixed width
    canvas.height = 300;  // 300px tall as requested
    
    // Black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1000, 300);
    
    // Draw bright blue waveform bars
    ctx.fillStyle = '#00aaff';
    for (let i = 0; i < 1000; i += 4) {
      const height = Math.sin(i * 0.02) * 100 + 120; // Sine wave pattern
      ctx.fillRect(i, (300 - height) / 2, 2, height);
    }
    
    // Yellow playhead
    if (duration > 0) {
      const playheadX = (currentTime / duration) * 1000;
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, 300);
      ctx.stroke();
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
        audioRef.current.onloadedmetadata = () => {
          setDuration(audioRef.current.duration);
          drawTestWaveform(); // Draw immediately when file loads
        };
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        intervalRef.current = setInterval(() => {
          setCurrentTime(audioRef.current.currentTime);
        }, 100);
      }).catch(err => console.log('Play failed:', err));
    }
  };

  // Redraw waveform when time changes
  useEffect(() => {
    if (file) drawTestWaveform();
  }, [currentTime, file]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '20px', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1 style={{ color: '#00ff00', fontSize: '32px' }}>✅ SIMPLE WORKING CLIPPER</h1>
        <button onClick={() => onNavigate?.('library')} style={{ padding: '15px 30px', background: '#ff4444' }}>
          Back to Library
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <input 
          type="file" 
          accept="audio/*" 
          onChange={handleFileChange}
          style={{ padding: '15px', fontSize: '16px', background: '#333', color: '#fff' }}
        />
        {file && <p style={{ marginTop: '10px', color: '#0ff' }}>Loaded: {file.name}</p>}
      </div>

      {file && (
        <>
          <audio ref={audioRef} style={{ display: 'none' }} />
          
          <div style={{ marginBottom: '30px' }}>
            <button 
              onClick={togglePlay}
              style={{ 
                padding: '20px 40px', 
                fontSize: '18px', 
                background: isPlaying ? '#ff0000' : '#00ff00',
                color: '#000',
                border: 'none',
                borderRadius: '10px'
              }}
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
            <span style={{ marginLeft: '20px', fontSize: '20px', color: '#ffff00' }}>
              Time: {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <canvas 
            ref={canvasRef}
            style={{ 
              border: '3px solid #00ff00',
              background: '#000',
              display: 'block',
              width: '100%',
              height: '300px'
            }}
            onClick={(e) => {
              if (duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickTime = (x / rect.width) * duration;
                audioRef.current.currentTime = clickTime;
                setCurrentTime(clickTime);
              }
            }}
          />
        </>
      )}
    </div>
  );
};

export default ProClipperSimple;