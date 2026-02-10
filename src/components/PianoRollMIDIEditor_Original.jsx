/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PianoRollMIDIEditor_Original.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Piano Roll MIDI Editor
 * Complete MIDI note editing interface with grid-based editing, velocity control, and timing quantization
 * Similar to Logic Pro, Pro Tools, and Cubase piano roll editors
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Play, Pause, Square, RotateCcw, RotateCw, Grid, Music, Volume2, Settings, Save, FolderOpen } from 'lucide-react';

const PianoRollMIDIEditor = ({ 
  midiData = null, 
  audioContext, 
  onMidiChange, 
  onClose,
  isActive = true 
}) => {
  // Canvas and UI refs
  const pianoRollRef = useRef(null);
  const pianoKeysRef = useRef(null);
  const timelineRef = useRef(null);
  const velocityLaneRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  // MIDI data state
  const [notes, setNotes] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState(new Set());
  const [clipboard, setClipboard] = useState([]);
  
  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(16); // 16 beats default
  const [isLooping, setIsLooping] = useState(false);
  
  // View state
  const [zoom, setZoom] = useState({ horizontal: 32, vertical: 20 }); // pixels per beat/semitone
  const [scroll, setScroll] = useState({ x: 0, y: 0 });
  const [snap, setSnap] = useState(16); // 16th note snap
  const [viewRange, setViewRange] = useState({ start: 0, end: 32 }); // beats
  const [keyRange, setKeyRange] = useState({ low: 21, high: 108 }); // A0 to C8
  
  // Editing state
  const [tool, setTool] = useState('pencil'); // pencil, select, erase
  const [editMode, setEditMode] = useState('note'); // note, velocity
  const [defaultVelocity, setDefaultVelocity] = useState(64);
  const [quantizeValue, setQuantizeValue] = useState(16); // 16th note
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [resizing, setResizing] = useState(null); // { noteId, edge: 'start'|'end' }
  
  // Grid and scale settings
  const [showGrid, setShowGrid] = useState(true);
  const [showVelocityLane, setShowVelocityLane] = useState(true);
  const [scale, setScale] = useState('chromatic'); // chromatic, major, minor, pentatonic
  const [rootNote, setRootNote] = useState(60); // C4
  
  // Note names for display
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  // Snap values for quantization
  const snapOptions = [
    { value: 1, label: '1/1' },
    { value: 2, label: '1/2' },
    { value: 4, label: '1/4' },
    { value: 8, label: '1/8' },
    { value: 16, label: '1/16' },
    { value: 32, label: '1/32' },
    { value: 64, label: '1/64' }
  ];
  
  // Scale patterns
  const scalePatterns = {
    chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
    pentatonic: [0, 2, 4, 7, 9]
  };
  
  // Initialize with sample data if none provided
  useEffect(() => {
    if (!midiData && notes.length === 0) {
      const sampleNotes = [
        { id: 1, pitch: 60, start: 0, duration: 1, velocity: 64, channel: 0 },
        { id: 2, pitch: 64, start: 1, duration: 1, velocity: 80, channel: 0 },
        { id: 3, pitch: 67, start: 2, duration: 2, velocity: 96, channel: 0 },
        { id: 4, pitch: 60, start: 4, duration: 1, velocity: 64, channel: 0 }
      ];
      setNotes(sampleNotes);
    } else if (midiData) {
      setNotes(midiData.notes || []);
    }
  }, [midiData, notes.length]);
  
  // Convert musical position to pixels
  const beatsToPixels = useCallback((beats) => {
    return beats * zoom.horizontal;
  }, [zoom.horizontal]);
  
  const pitchToPixels = useCallback((pitch) => {
    return (keyRange.high - pitch) * zoom.vertical;
  }, [keyRange.high, zoom.vertical]);
  
  // Convert pixels to musical position
  const pixelsToBeats = useCallback((pixels) => {
    return pixels / zoom.horizontal;
  }, [zoom.horizontal]);
  
  const pixelsToPitch = useCallback((pixels) => {
    return Math.round(keyRange.high - (pixels / zoom.vertical));
  }, [keyRange.high, zoom.vertical]);
  
  // Snap position to grid
  const snapToGrid = useCallback((position) => {
    if (snap === 0) return position;
    const snapValue = 4 / snap; // Convert to beat subdivision
    return Math.round(position / snapValue) * snapValue;
  }, [snap]);
  
  // Get note name from MIDI pitch
  const getNoteNameFromPitch = useCallback((pitch) => {
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
  }, [noteNames]);
  
  // Check if note is in current scale
  const isNoteInScale = useCallback((pitch) => {
    if (scale === 'chromatic') return true;
    const noteClass = (pitch - rootNote) % 12;
    const normalizedNote = noteClass < 0 ? noteClass + 12 : noteClass;
    return scalePatterns[scale].includes(normalizedNote);
  }, [scale, rootNote, scalePatterns]);
  
  // Render piano keys
  const renderPianoKeys = useCallback(() => {
    const canvas = pianoKeysRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw piano keys
    for (let pitch = keyRange.low; pitch <= keyRange.high; pitch++) {
      const y = pitchToPixels(pitch);
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
      const isInScale = isNoteInScale(pitch);
      
      // White keys
      ctx.fillStyle = isInScale ? (isBlackKey ? '#333' : '#fff') : (isBlackKey ? '#222' : '#f0f0f0');
      ctx.fillRect(0, y, width, zoom.vertical);
      
      // Key borders
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, width, zoom.vertical);
      
      // Note names on white keys
      if (!isBlackKey && zoom.vertical >= 16) {
        ctx.fillStyle = '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          getNoteNameFromPitch(pitch),
          width / 2,
          y + zoom.vertical / 2 + 4
        );
      }
    }
  }, [keyRange, zoom.vertical, pitchToPixels, isNoteInScale, getNoteNameFromPitch]);
  
  // Render timeline
  const renderTimeline = useCallback(() => {
    const canvas = timelineRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw beat markers
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    for (let beat = Math.floor(viewRange.start); beat <= Math.ceil(viewRange.end); beat++) {
      const x = beatsToPixels(beat - scroll.x / zoom.horizontal);
      
      if (x >= 0 && x <= width) {
        // Major beat lines
        if (beat % 4 === 0) {
          ctx.strokeStyle = '#333';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1;
        }
        
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        
        // Beat numbers
        if (beat % 4 === 0) {
          ctx.fillStyle = '#333';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText((beat / 4 + 1).toString(), x, height - 5);
        }
      }
    }
    
    // Draw playhead
    const playheadX = beatsToPixels(playheadPosition - scroll.x / zoom.horizontal);
    if (playheadX >= 0 && playheadX <= width) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
    
    // Draw loop markers
    if (isLooping) {
      const loopStartX = beatsToPixels(loopStart - scroll.x / zoom.horizontal);
      const loopEndX = beatsToPixels(loopEnd - scroll.x / zoom.horizontal);
      
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
      
      ctx.strokeStyle = '#00aa00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(loopStartX, 0);
      ctx.lineTo(loopStartX, height);
      ctx.moveTo(loopEndX, 0);
      ctx.lineTo(loopEndX, height);
      ctx.stroke();
    }
  }, [viewRange, beatsToPixels, scroll.x, zoom.horizontal, playheadPosition, isLooping, loopStart, loopEnd]);
  
  // Render main piano roll grid
  const renderPianoRoll = useCallback(() => {
    const canvas = pianoRollRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      
      // Horizontal lines (pitch)
      for (let pitch = keyRange.low; pitch <= keyRange.high; pitch++) {
        const y = pitchToPixels(pitch);
        const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12);
        
        ctx.strokeStyle = isBlackKey ? '#f0f0f0' : '#e8e8e8';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      
      // Vertical lines (beats)
      const snapValue = 4 / snap;
      for (let beat = 0; beat < viewRange.end * 4; beat += snapValue) {
        const x = beatsToPixels(beat / 4 - scroll.x / zoom.horizontal);
        
        if (x >= 0 && x <= width) {
          if (beat % 4 === 0) {
            ctx.strokeStyle = '#d0d0d0';
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = '#f0f0f0';
            ctx.lineWidth = 0.5;
          }
          
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    }
    
    // Draw notes
    notes.forEach(note => {
      const x = beatsToPixels(note.start - scroll.x / zoom.horizontal);
      const y = pitchToPixels(note.pitch);
      const noteWidth = beatsToPixels(note.duration);
      const noteHeight = zoom.vertical - 1;
      
      if (x + noteWidth >= 0 && x <= width && y >= 0 && y <= height) {
        // Note background
        const isSelected = selectedNotes.has(note.id);
        const velocityAlpha = note.velocity / 127;
        
        if (isSelected) {
          ctx.fillStyle = `rgba(255, 100, 100, ${0.3 + velocityAlpha * 0.7})`;
        } else {
          ctx.fillStyle = `rgba(100, 150, 255, ${0.3 + velocityAlpha * 0.7})`;
        }
        
        ctx.fillRect(x, y, noteWidth, noteHeight);
        
        // Note border
        ctx.strokeStyle = isSelected ? '#ff6464' : '#6496ff';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, noteWidth, noteHeight);
        
        // Note name (if wide enough)
        if (noteWidth >= 30 && zoom.vertical >= 16) {
          ctx.fillStyle = '#333';
          ctx.font = '11px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(
            getNoteNameFromPitch(note.pitch),
            x + 3,
            y + zoom.vertical / 2 + 3
          );
        }
        
        // Resize handles
        if (isSelected && noteWidth >= 10) {
          ctx.fillStyle = '#ff6464';
          ctx.fillRect(x - 2, y, 4, noteHeight); // Start handle
          ctx.fillRect(x + noteWidth - 2, y, 4, noteHeight); // End handle
        }
      }
    });
    
    // Draw selection rectangle
    if (isDragging && dragStart && tool === 'select') {
      const currentPos = { x: dragStart.currentX, y: dragStart.currentY };
      const x = Math.min(dragStart.x, currentPos.x);
      const y = Math.min(dragStart.y, currentPos.y);
      const width = Math.abs(currentPos.x - dragStart.x);
      const height = Math.abs(currentPos.y - dragStart.y);
      
      ctx.strokeStyle = '#4080ff';
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);
    }
  }, [
    notes, selectedNotes, keyRange, zoom, viewRange, scroll, showGrid, snap,
    beatsToPixels, pitchToPixels, getNoteNameFromPitch, isDragging, dragStart, tool
  ]);
  
  // Render velocity lane
  const renderVelocityLane = useCallback(() => {
    if (!showVelocityLane) return;
    
    const canvas = velocityLaneRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    
    // Draw velocity bars for notes
    notes.forEach(note => {
      const x = beatsToPixels(note.start - scroll.x / zoom.horizontal);
      const noteWidth = beatsToPixels(note.duration);
      const velocityHeight = (note.velocity / 127) * height;
      
      if (x + noteWidth >= 0 && x <= width) {
        const isSelected = selectedNotes.has(note.id);
        
        ctx.fillStyle = isSelected ? '#ff6464' : '#6496ff';
        ctx.fillRect(x, height - velocityHeight, noteWidth, velocityHeight);
        
        // Velocity value text
        if (noteWidth >= 20) {
          ctx.fillStyle = '#333';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(
            note.velocity.toString(),
            x + noteWidth / 2,
            height - velocityHeight - 2
          );
        }
      }
    });
    
    // Draw velocity grid lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let v = 0; v <= 127; v += 32) {
      const y = height - (v / 127) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [notes, selectedNotes, beatsToPixels, scroll.x, zoom.horizontal, showVelocityLane]);
  
  // Animation loop with fixed dependencies to prevent memory leaks
  const animate = useCallback(() => {
    // Use refs to get current render functions without dependencies
    if (pianoRollRef.current) renderPianoRoll();
    if (timelineRef.current) renderTimeline();
    if (pianoKeysRef.current) renderPianoKeys();
    if (velocityLaneRef.current) renderVelocityLane();
    
    if (isPlaying) {
      setPlayheadPosition(prev => {
        let newPos = prev + 0.01; // Adjust for real tempo
        if (isLooping && newPos >= loopEnd) {
          newPos = loopStart;
        }
        return newPos;
      });
    }
    
    // Only schedule next frame if component is still active
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, isLooping, loopEnd, loopStart, isActive]);
  
  // Start animation loop with proper cleanup
  useEffect(() => {
    let isComponentActive = true;
    
    const startAnimation = () => {
      if (isActive && isComponentActive) {
        animate();
      }
    };
    
    startAnimation();
    
    return () => {
      isComponentActive = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [animate, isActive]);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((e) => {
    const canvas = pianoRollRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const beats = pixelsToBeats(x) + scroll.x / zoom.horizontal;
    const pitch = pixelsToPitch(y);
    
    setIsDragging(true);
    setDragStart({ x, y, beats, pitch, currentX: x, currentY: y });
    
    // Check for note interaction
    const clickedNote = notes.find(note => {
      const noteX = beatsToPixels(note.start - scroll.x / zoom.horizontal);
      const noteY = pitchToPixels(note.pitch);
      const noteWidth = beatsToPixels(note.duration);
      const noteHeight = zoom.vertical;
      
      return x >= noteX && x <= noteX + noteWidth && y >= noteY && y <= noteY + noteHeight;
    });
    
    if (tool === 'pencil' && !clickedNote) {
      // Create new note
      const snappedStart = snapToGrid(beats);
      const newNote = {
        id: Date.now(),
        pitch: Math.max(keyRange.low, Math.min(keyRange.high, pitch)),
        start: snappedStart,
        duration: snapToGrid(4 / snap), // Default to current snap value
        velocity: defaultVelocity,
        channel: 0
      };
      
      setNotes(prev => [...prev, newNote]);
      setSelectedNotes(new Set([newNote.id]));
    } else if (tool === 'select' && clickedNote) {
      // Select note
      if (!e.shiftKey) {
        setSelectedNotes(new Set([clickedNote.id]));
      } else {
        setSelectedNotes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(clickedNote.id)) {
            newSet.delete(clickedNote.id);
          } else {
            newSet.add(clickedNote.id);
          }
          return newSet;
        });
      }
    } else if (tool === 'erase' && clickedNote) {
      // Delete note
      setNotes(prev => prev.filter(note => note.id !== clickedNote.id));
      setSelectedNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(clickedNote.id);
        return newSet;
      });
    }
  }, [
    tool, notes, pixelsToBeats, pixelsToPitch, scroll, zoom, beatsToPixels, pitchToPixels,
    snapToGrid, snap, defaultVelocity, keyRange
  ]);
  
  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !dragStart) return;
    
    const canvas = pianoRollRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setDragStart(prev => ({
      ...prev,
      currentX: x,
      currentY: y
    }));
  }, [isDragging, dragStart]);
  
  const handleMouseUp = useCallback(() => {
    if (isDragging && dragStart && tool === 'select') {
      // Select notes in rectangle
      const x1 = Math.min(dragStart.x, dragStart.currentX);
      const y1 = Math.min(dragStart.y, dragStart.currentY);
      const x2 = Math.max(dragStart.x, dragStart.currentX);
      const y2 = Math.max(dragStart.y, dragStart.currentY);
      
      const selectedIds = new Set();
      notes.forEach(note => {
        const noteX = beatsToPixels(note.start - scroll.x / zoom.horizontal);
        const noteY = pitchToPixels(note.pitch);
        const noteWidth = beatsToPixels(note.duration);
        const noteHeight = zoom.vertical;
        
        if (noteX >= x1 && noteX + noteWidth <= x2 && noteY >= y1 && noteY + noteHeight <= y2) {
          selectedIds.add(note.id);
        }
      });
      
      setSelectedNotes(selectedIds);
    }
    
    setIsDragging(false);
    setDragStart(null);
  }, [isDragging, dragStart, tool, notes, beatsToPixels, pitchToPixels, scroll, zoom]);
  
  // Quantize selected notes
  const quantizeNotes = useCallback(() => {
    setNotes(prev => prev.map(note => {
      if (selectedNotes.has(note.id)) {
        return {
          ...note,
          start: snapToGrid(note.start),
          duration: Math.max(snapToGrid(note.duration), snapToGrid(4 / quantizeValue))
        };
      }
      return note;
    }));
  }, [selectedNotes, snapToGrid, quantizeValue]);
  
  // Delete selected notes
  const deleteSelectedNotes = useCallback(() => {
    setNotes(prev => prev.filter(note => !selectedNotes.has(note.id)));
    setSelectedNotes(new Set());
  }, [selectedNotes]);
  
  // Copy selected notes
  const copyNotes = useCallback(() => {
    const notesToCopy = notes.filter(note => selectedNotes.has(note.id));
    setClipboard(notesToCopy);
  }, [notes, selectedNotes]);
  
  // Paste notes
  const pasteNotes = useCallback(() => {
    if (clipboard.length === 0) return;
    
    const minStart = Math.min(...clipboard.map(note => note.start));
    const offset = playheadPosition - minStart;
    
    const newNotes = clipboard.map(note => ({
      ...note,
      id: Date.now() + Math.random(),
      start: note.start + offset
    }));
    
    setNotes(prev => [...prev, ...newNotes]);
    setSelectedNotes(new Set(newNotes.map(note => note.id)));
  }, [clipboard, playheadPosition]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isActive) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'Delete':
        case 'Backspace':
          deleteSelectedNotes();
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            copyNotes();
          }
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            pasteNotes();
          }
          break;
        case 'q':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            quantizeNotes();
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSelectedNotes(new Set(notes.map(note => note.id)));
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, deleteSelectedNotes, copyNotes, pasteNotes, quantizeNotes, notes]);

  return (
    <div className="piano-roll-editor">
      {/* Toolbar */}
      <div className="toolbar">
        <div className="tool-group">
          <button
            className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
            onClick={() => setTool('pencil')}
            title="Pencil Tool (Create Notes)"
          >
            âœï¸
          </button>
          <button
            className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
            onClick={() => setTool('select')}
            title="Select Tool"
          >
            ðŸ”²
          </button>
          <button
            className={`tool-btn ${tool === 'erase' ? 'active' : ''}`}
            onClick={() => setTool('erase')}
            title="Erase Tool"
          >
            ðŸ—‘ï¸
          </button>
        </div>
        
        <div className="playback-group">
          <button
            className="playback-btn"
            onClick={() => setIsPlaying(!isPlaying)}
            title="Play/Pause (Space)"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            className="playback-btn"
            onClick={() => {
              setIsPlaying(false);
              setPlayheadPosition(0);
            }}
            title="Stop"
          >
            <Square size={16} />
          </button>
          <button
            className={`playback-btn ${isLooping ? 'active' : ''}`}
            onClick={() => setIsLooping(!isLooping)}
            title="Loop"
          >
            ðŸ”„
          </button>
        </div>
        
        <div className="snap-group">
          <label>Snap:</label>
          <select value={snap} onChange={(e) => setSnap(parseInt(e.target.value))}>
            {snapOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="view-group">
          <button
            className={`view-btn ${showGrid ? 'active' : ''}`}
            onClick={() => setShowGrid(!showGrid)}
            title="Show Grid"
          >
            <Grid size={16} />
          </button>
          <button
            className={`view-btn ${showVelocityLane ? 'active' : ''}`}
            onClick={() => setShowVelocityLane(!showVelocityLane)}
            title="Show Velocity Lane"
          >
            <Volume2 size={16} />
          </button>
        </div>
        
        <div className="edit-group">
          <button onClick={quantizeNotes} title="Quantize (Ctrl+Q)">
            ðŸ“ Quantize
          </button>
          <button onClick={copyNotes} title="Copy (Ctrl+C)">
            ðŸ“‹ Copy
          </button>
          <button onClick={pasteNotes} title="Paste (Ctrl+V)">
            ðŸ“ Paste
          </button>
        </div>
        
        <div className="scale-group">
          <label>Scale:</label>
          <select value={scale} onChange={(e) => setScale(e.target.value)}>
            <option value="chromatic">Chromatic</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
            <option value="pentatonic">Pentatonic</option>
          </select>
          <label>Root:</label>
          <select value={rootNote} onChange={(e) => setRootNote(parseInt(e.target.value))}>
            {noteNames.map((name, i) => (
              <option key={i} value={60 + i}>{name}</option>
            ))}
          </select>
        </div>
        
        <div className="close-group">
          <button onClick={onClose} className="close-btn">âŒ</button>
        </div>
      </div>
      
      {/* Main Editor Area */}
      <div className="editor-area">
        {/* Timeline */}
        <div className="timeline-container">
          <canvas
            ref={timelineRef}
            className="timeline-canvas"
            width={800}
            height={30}
          />
        </div>
        
        {/* Piano Roll Container */}
        <div className="piano-roll-container">
          {/* Piano Keys */}
          <div className="piano-keys-container">
            <canvas
              ref={pianoKeysRef}
              className="piano-keys-canvas"
              width={80}
              height={600}
            />
          </div>
          
          {/* Main Piano Roll */}
          <div className="piano-roll-main">
            <canvas
              ref={pianoRollRef}
              className="piano-roll-canvas"
              width={800}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>
        </div>
        
        {/* Velocity Lane */}
        {showVelocityLane && (
          <div className="velocity-lane-container">
            <div className="velocity-keys">
              <div className="velocity-label">Velocity</div>
            </div>
            <canvas
              ref={velocityLaneRef}
              className="velocity-lane-canvas"
              width={800}
              height={100}
            />
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="status-bar">
        <span>Notes: {notes.length}</span>
        <span>Selected: {selectedNotes.size}</span>
        <span>Playhead: {playheadPosition.toFixed(2)}</span>
        <span>Zoom: {zoom.horizontal}x{zoom.vertical}</span>
        <span>Tool: {tool}</span>
      </div>
    </div>
  );
};

export default PianoRollMIDIEditor;
