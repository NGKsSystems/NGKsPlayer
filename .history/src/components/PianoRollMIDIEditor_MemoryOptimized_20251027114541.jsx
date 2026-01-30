/**
 * Memory-Optimized Piano Roll MIDI Editor
 * Fixes memory leaks by using stable render functions and minimal dependencies
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, RotateCcw, Grid, Music, Volume2 } from 'lucide-react';

const PianoRollMIDIEditor = ({ 
  midiData = null, 
  audioContext, 
  onMidiChange, 
  onClose,
  isActive = true 
}) => {
  // Canvas refs
  const pianoRollRef = useRef(null);
  const pianoKeysRef = useRef(null);
  const timelineRef = useRef(null);
  const velocityLaneRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // State with minimal updates
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [tool, setTool] = useState('pencil');
  const [showGrid, setShowGrid] = useState(true);
  const [showVelocityLane, setShowVelocityLane] = useState(true);
  const [snap, setSnap] = useState(16);

  // Fixed zoom and view settings to prevent constant recreation
  const zoom = useRef({ horizontal: 32, vertical: 20 });
  const scroll = useRef({ x: 0, y: 0 });
  const keyRange = useRef({ low: 21, high: 108 });

  // Stable render functions using refs - these are NOT recreated on every render
  const renderFunctions = useRef({});

  // Initialize render functions once
  useEffect(() => {
    renderFunctions.current = {
      renderPianoKeys: () => {
        const canvas = pianoKeysRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Simplified, efficient piano key rendering
        const keyHeight = zoom.current.vertical;
        for (let pitch = keyRange.current.low; pitch <= keyRange.current.high; pitch++) {
          const y = (keyRange.current.high - pitch) * keyHeight;
          const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
          
          ctx.fillStyle = isBlackKey ? '#333' : '#fff';
          ctx.fillRect(0, y, width, keyHeight);
          
          ctx.strokeStyle = '#ccc';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, y, width, keyHeight);
        }
      },

      renderTimeline: () => {
        const canvas = timelineRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Simple timeline with beat markers
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        
        for (let beat = 0; beat <= 32; beat += 4) {
          const x = beat * zoom.current.horizontal;
          if (x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        }
      },

      renderPianoRoll: () => {
        const canvas = pianoRollRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw grid if enabled
        if (showGrid) {
          ctx.strokeStyle = '#f0f0f0';
          ctx.lineWidth = 1;
          
          // Vertical lines (beats)
          for (let beat = 0; beat <= width / zoom.current.horizontal; beat++) {
            const x = beat * zoom.current.horizontal;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
          
          // Horizontal lines (pitches)
          for (let pitch = 0; pitch <= height / zoom.current.vertical; pitch++) {
            const y = pitch * zoom.current.vertical;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
        }
        
        // Draw notes efficiently
        notes.forEach(note => {
          const x = note.start * zoom.current.horizontal;
          const y = (127 - note.pitch) * zoom.current.vertical;
          const noteWidth = note.duration * zoom.current.horizontal;
          const noteHeight = zoom.current.vertical - 2;
          
          // Only draw visible notes
          if (x < width && x + noteWidth > 0 && y < height && y + noteHeight > 0) {
            ctx.fillStyle = selectedNotes.has(note.id) ? '#4A90E2' : '#6B7AFF';
            ctx.fillRect(x, y, noteWidth, noteHeight);
            
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, noteWidth, noteHeight);
          }
        });
        
        // Draw playhead
        const playheadX = playheadPosition * zoom.current.horizontal;
        if (playheadX >= 0 && playheadX <= width) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(playheadX, 0);
          ctx.lineTo(playheadX, height);
          ctx.stroke();
        }
      },

      renderVelocityLane: () => {
        if (!showVelocityLane) return;
        
        const canvas = velocityLaneRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas;
        
        ctx.clearRect(0, 0, width, height);
        
        // Draw velocity bars
        notes.forEach(note => {
          const x = note.start * zoom.current.horizontal;
          const noteWidth = note.duration * zoom.current.horizontal;
          const velocityHeight = (note.velocity / 127) * height;
          
          if (x < width && x + noteWidth > 0) {
            ctx.fillStyle = selectedNotes.has(note.id) ? '#4A90E2' : '#8A9AFF';
            ctx.fillRect(x, height - velocityHeight, noteWidth, velocityHeight);
          }
        });
      }
    };
  }, []); // Only initialize once

  // Animation loop with minimal dependencies to prevent memory leaks
  const animate = useCallback(() => {
    if (!isActive) return;
    
    // Use stable render functions
    renderFunctions.current.renderPianoKeys();
    renderFunctions.current.renderTimeline();
    renderFunctions.current.renderPianoRoll();
    renderFunctions.current.renderVelocityLane();
    
    if (isPlaying) {
      setPlayheadPosition(prev => prev + 0.01);
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, isActive]); // Minimal dependencies

  // Animation lifecycle management
  useEffect(() => {
    if (isActive) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animate]);

  // Force re-render when notes or selection changes
  useEffect(() => {
    if (renderFunctions.current.renderPianoRoll) {
      renderFunctions.current.renderPianoRoll();
    }
    if (renderFunctions.current.renderVelocityLane) {
      renderFunctions.current.renderVelocityLane();
    }
  }, [notes.length, selectedNotes.size]);

  // Tool handlers
  const handleToolChange = useCallback((newTool) => {
    setTool(newTool);
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleStop = useCallback(() => {
    setIsPlaying(false);
    setPlayheadPosition(0);
  }, []);

  if (!isActive) {
    return null;
  }

  return (
    <div className="piano-roll-editor" style={{ width: '100%', height: '600px', background: '#f0f0f0' }}>
      <div className="toolbar" style={{ padding: '10px', background: '#e0e0e0', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <h2>Piano Roll</h2>
        
        <button 
          className={`tool-button ${tool === 'pencil' ? 'active' : ''}`}
          title="Pencil Tool (Create Notes)"
          onClick={() => handleToolChange('pencil')}
          style={{ padding: '5px 10px', background: tool === 'pencil' ? '#4A90E2' : '#fff' }}
        >
          ✏️
        </button>
        
        <button 
          className={`tool-button ${tool === 'select' ? 'active' : ''}`}
          title="Select Tool"
          onClick={() => handleToolChange('select')}
          style={{ padding: '5px 10px', background: tool === 'select' ? '#4A90E2' : '#fff' }}
        >
          🔍
        </button>
        
        <button 
          className={`tool-button ${tool === 'erase' ? 'active' : ''}`}
          title="Erase Tool"
          onClick={() => handleToolChange('erase')}
          style={{ padding: '5px 10px', background: tool === 'erase' ? '#4A90E2' : '#fff' }}
        >
          🗑️
        </button>
      </div>
      
      <div className="playback-controls" style={{ padding: '10px', background: '#d0d0d0', display: 'flex', gap: '10px' }}>
        <button 
          title="Play/Pause (Space)"
          onClick={handlePlayPause}
          style={{ padding: '5px 10px' }}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        <button 
          title="Stop"
          onClick={handleStop}
          style={{ padding: '5px 10px' }}
        >
          ⏹️
        </button>
        
        <button 
          title="Loop"
          style={{ padding: '5px 10px' }}
        >
          🔄
        </button>
      </div>
      
      <div className="snap-controls" style={{ padding: '10px', background: '#d0d0d0', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <span>Snap:</span>
        <select 
          value={snap} 
          onChange={(e) => setSnap(parseInt(e.target.value))}
          style={{ padding: '2px 5px' }}
        >
          <option value="16">1/16</option>
          <option value="8">1/8</option>
          <option value="4">1/4</option>
        </select>
      </div>
      
      <div className="canvas-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 150px)' }}>
        <canvas 
          ref={timelineRef}
          width={800} 
          height={50} 
          style={{ border: '1px solid #ccc', background: '#fff' }}
        />
        
        <div style={{ display: 'flex', height: 'calc(100% - 100px)' }}>
          <canvas 
            ref={pianoKeysRef}
            width={100} 
            height={400} 
            style={{ border: '1px solid #ccc', background: '#fff' }}
          />
          
          <canvas 
            ref={pianoRollRef}
            width={700} 
            height={400} 
            style={{ border: '1px solid #ccc', background: '#fff' }}
          />
        </div>
        
        {showVelocityLane && (
          <canvas 
            ref={velocityLaneRef}
            width={800} 
            height={100} 
            style={{ border: '1px solid #ccc', background: '#fff' }}
          />
        )}
      </div>
    </div>
  );
};

export default PianoRollMIDIEditor;