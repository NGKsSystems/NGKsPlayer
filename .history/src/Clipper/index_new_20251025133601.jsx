import React, { useState, useRef } from 'react';

// BRAND NEW PRO CLIPPER - STARTING FROM ABSOLUTE ZERO
const ProClipperBrandNew = ({ onNavigate }) => {
  const [file, setFile] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
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
      audioRef.current.play();
      setIsPlaying(true);
      
      intervalRef.current = setInterval(() => {
        setCurrentTime(audioRef.current.currentTime);
      }, 100);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '20px', background: '#000', color: '#fff', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <h1 style={{ color: '#ff0000', fontSize: '32px' }}>🔥 BRAND NEW CLIPPER - REBUILT FROM ZERO</h1>
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
              Time: {formatTime(currentTime)}
            </span>
          </div>

          <div style={{ 
            width: '100%', 
            height: '800px', 
            background: '#222', 
            border: '5px solid #ff0000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: '#fff'
          }}>
            GIANT WAVEFORM AREA - 800PX TALL - DEFINITELY VISIBLE
          </div>
        </>
      )}
    </div>
  );
};

export default ProClipperBrandNew;