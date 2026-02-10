/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index_broken.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useEffect } from 'react';

// BRAND NEW PRO CLIPPER - STARTING FROM ABSOLUTE ZERO
const ProClipperBrandNew = ({ onNavigate }) => {
  const [file, setFile] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [waveformData, setWaveformData] = useState(null);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
        
        // Wait for metadata to load
        audioRef.current.addEventListener('loadedmetadata', () => {
          setDuration(audioRef.current.duration);
          generateWaveform(selectedFile);
        });
      }
    }
  };

  const generateWaveform = async (audioFile) => {
    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = Math.floor(duration * 10); // 10 samples per second for width
      const blockSize = Math.floor(channelData.length / samples);
      const waveform = [];
      
      for (let i = 0; i < samples; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j] || 0);
        }
        waveform.push(sum / blockSize);
      }
      
      setWaveformData(waveform);
      audioContext.close();
    } catch (error) {
      console.error('Waveform generation failed:', error);
    }
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !waveformData || !duration) return;
    
    const ctx = canvas.getContext('2d');
    const width = duration * 10; // 10 pixels per second
    const height = 300; // Fixed height
    
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw waveform
    ctx.fillStyle = '#00aaff';
    const barWidth = width / waveformData.length;
    
    for (let i = 0; i < waveformData.length; i++) {
      const barHeight = waveformData[i] * height * 0.8;
      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
    
    // Draw playhead
    const playheadX = (currentTime / duration) * width;
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();
  };

  useEffect(() => {
    drawWaveform();
  }, [waveformData, currentTime]);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      if (audioRef.current) {
        audioRef.current.src = URL.createObjectURL(selectedFile);
        
        // Wait for metadata to load
        audioRef.current.addEventListener('loadedmetadata', () => {
          setDuration(audioRef.current.duration);
          generateWaveform(selectedFile);
        });
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

          <canvas 
            ref={canvasRef}
            style={{ 
              border: '2px solid #ff0000',
              background: '#000',
              display: 'block',
              maxWidth: '100%',
              height: '300px'
            }}
            onClick={(e) => {
              if (duration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const clickTime = (x / e.currentTarget.width) * duration;
                audioRef.current.currentTime = clickTime;
                setCurrentTime(clickTime);
              }
            }}
          />
          {!waveformData && duration > 0 && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: '#fff',
              fontSize: '18px'
            }}>
              Generating waveform...
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProClipperBrandNew;
