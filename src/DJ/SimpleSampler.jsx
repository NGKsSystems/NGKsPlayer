/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SimpleSampler.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

const Sampler = ({ 
  audioManager, 
  id, 
  onStyleChange = () => {}, 
  style = {},
  deckMode = '2deck',
  ...props 
}) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState({
    ...style,
    height: Math.max(350, style.height || 350) // Force minimum height
  });
  
  const [samples, setSamples] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const fileInputRef = useRef(null);
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceNodesRef = useRef({});
  const scrollContainerRef = useRef(null);

  // Constants for your requirements
  const MAX_SAMPLE_PADS = 100;
  const EMPTY_PADS_BUFFER = 5;
  const VISIBLE_PADS = 20; // 2 rows of 10 to fill screen
  const PAD_WIDTH = 120; // 3/4 of original 160px

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.sampler-header') && !e.target.closest('.file-controls, .sample-button')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - (currentStyle.left || 0),
        y: e.clientY - (currentStyle.top || 0)
      });
      e.preventDefault();
    }
  }, [currentStyle]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setCurrentStyle(prev => ({
      ...prev,
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y
    }));
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (isDragging && onStyleChange) {
      // Save final position when dragging ends
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
    setIsDragging(false);
  }, [isDragging, currentStyle, id, onStyleChange]);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    setCurrentStyle(prev => ({
      ...prev,
      width: Math.max(300, (prev.width || 400) + deltaX),
      height: Math.max(250, (prev.height || 350) + deltaY)
    }));
    
    setResizeStart({ x: e.clientX, y: e.clientY });
  }, [isResizing, resizeStart]);

  const handleResizeMouseUp = useCallback(() => {
    if (isResizing && onStyleChange) {
      // Save final size when resizing ends
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
    setIsResizing(false);
  }, [isResizing, currentStyle, id, onStyleChange]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    // Only update style from props when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

  useEffect(() => {
    if (onStyleChange && (isDragging || isResizing)) {
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
  }, [currentStyle, isDragging, isResizing, id, onStyleChange]);

  // Calculate total pads (samples + buffer, up to 100 max)
  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);
  const renderPads = Array.from({ length: Math.max(totalPadsNeeded, VISIBLE_PADS) }, (_, index) => {
    return samples[index] || null; // null = empty pad
  });

  // Load samples from database on mount
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const result = await window.api.invoke('sampler:getSamples');
        if (result.ok && result.samples.length > 0) {
          console.log('[Sampler] Loading', result.samples.length, 'samples from database');
          
          // Load each sample file from disk
          const loadedSamples = await Promise.all(
            result.samples.map(async (sample) => {
              try {
                const fileResult = await window.api.invoke('fs:readFileBuffer', sample.filePath);
                if (fileResult.ok && fileResult.data) {
                  return {
                    id: sample.id,
                    name: sample.name,
                    data: fileResult.data.buffer,
                    duration: sample.duration,
                    index: sample.pad_index,
                    filePath: sample.filePath
                  };
                }
                return null;
              } catch (error) {
                console.warn('[Sampler] Could not load sample:', sample.name, error);
                return null;
              }
            })
          );
          
          const validSamples = loadedSamples.filter(Boolean);
          if (validSamples.length > 0) {
            setSamples(validSamples);
            console.log('[Sampler] Successfully loaded', validSamples.length, 'samples');
          }
        }
      } catch (error) {
        console.warn('[Sampler] Could not load saved samples:', error.message);
      }
    };
    loadSamples();
  }, []);

  // Save samples to database when they change
  useEffect(() => {
    if (samples.length === 0) return;
    
    const saveSamples = async () => {
      try {
        for (const sample of samples) {
          if (sample.filePath) {
            await window.api.invoke('sampler:saveSample', {
              filePath: sample.filePath,
              name: sample.name,
              duration: sample.duration,
              padIndex: sample.index
            });
          }
        }
      } catch (error) {
        console.error('[Sampler] Failed to save samples:', error);
      }
    };
    saveSamples();
  }, [samples]);

  const processFiles = async (files, startIndex = samples.length) => {
    setLoading(true);
    const newSamples = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIndex = startIndex + i;
      
      if (targetIndex >= MAX_SAMPLE_PADS) break;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        let duration = 0;
        try {
          const audioContext = audioContextRef.current;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());
          duration = audioBuffer.duration;
        } catch (error) {
          console.warn('Could not decode audio for duration:', file.name);
        }
        
        // Get the file path from the File object (Electron provides this)
        const filePath = file.path || null;
        
        const sample = {
          id: Date.now() + Math.random() + i,
          name: file.name.replace(/\.[^/.]+$/, ''),
          data: arrayBuffer,
          size: file.size,
          duration: duration,
          index: targetIndex,
          filePath: filePath
        };
        newSamples.push({ sample, index: targetIndex });
      } catch (error) {
        console.error('Failed to process file:', file.name, error);
      }
    }
    
    setSamples(prevSamples => {
      const updatedSamples = [...prevSamples];
      newSamples.forEach(({ sample, index }) => {
        updatedSamples[index] = sample;
      });
      return updatedSamples;
    });
    
    setLoading(false);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      processFiles(audioFiles);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      processFiles(files);
    }
    e.target.value = '';
  };

  const handlePlay = async (sample) => {
    try {
      if (sourceNodesRef.current[playingId]) {
        sourceNodesRef.current[playingId].stop();
        delete sourceNodesRef.current[playingId];
      }

      if (playingId === sample.id) {
        setPlayingId(null);
        return;
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());
      const source = audioContext.createBufferSource();
      const panNode = audioContext.createStereoPanner();
      const gainNode = audioContext.createGain();

      source.buffer = audioBuffer;
      panNode.pan.value = -1; // Left channel for main
      gainNode.gain.value = 0.8;

      source.connect(panNode);
      panNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      sourceNodesRef.current[sample.id] = source;
      setPlayingId(sample.id);

      source.onended = () => {
        setPlayingId(null);
        delete sourceNodesRef.current[sample.id];
      };

      source.start();
    } catch (error) {
      console.error('Failed to play sample:', error);
    }
  };

  const handleCuePlay = async (sample) => {
    try {
      const cueId = `cue-${sample.id}`;
      
      if (sourceNodesRef.current[cueId]) {
        sourceNodesRef.current[cueId].stop();
        delete sourceNodesRef.current[cueId];
      }

      if (playingId === cueId) {
        setPlayingId(null);
        return;
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());
      const source = audioContext.createBufferSource();
      const panNode = audioContext.createStereoPanner();
      const gainNode = audioContext.createGain();

      source.buffer = audioBuffer;
      panNode.pan.value = 1; // Right channel for cue
      gainNode.gain.value = 0.6;

      source.connect(panNode);
      panNode.connect(gainNode);
      gainNode.connect(audioContext.destination);

      sourceNodesRef.current[cueId] = source;
      setPlayingId(cueId);

      source.onended = () => {
        setPlayingId(null);
        delete sourceNodesRef.current[cueId];
      };

      source.start();
    } catch (error) {
      console.error('Failed to play cue sample:', error);
    }
  };

  const removeSample = async (sampleId) => {
    // Stop playback
    if (sourceNodesRef.current[sampleId]) {
      sourceNodesRef.current[sampleId].stop();
      delete sourceNodesRef.current[sampleId];
    }
    if (sourceNodesRef.current[`cue-${sampleId}`]) {
      sourceNodesRef.current[`cue-${sampleId}`].stop();
      delete sourceNodesRef.current[`cue-${sampleId}`];
    }
    if (playingId === sampleId || playingId === `cue-${sampleId}`) {
      setPlayingId(null);
    }
    
    // Remove from database
    const sampleToRemove = samples.find(s => s.id === sampleId);
    if (sampleToRemove?.filePath) {
      try {
        await window.api.invoke('sampler:removeSample', { filePath: sampleToRemove.filePath });
      } catch (error) {
        console.warn('[Sampler] Could not remove from database:', error);
      }
    }
    
    // Remove from state
    setSamples(prev => prev.filter(sample => sample.id !== sampleId));
  };

  return (
    <div 
      ref={widgetRef}
      className={`sampler-widget ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        ...currentStyle,
        background: 'linear-gradient(145deg, #252525, #2a2a2a)',
        border: '1px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '8px',
        padding: '8px',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        width: currentStyle.width || 600,
        height: currentStyle.height || 400,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: isDragging ? 'move' : 'default',
        userSelect: 'none',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)'
      }}
      onMouseDown={handleMouseDown}
      {...props}
    >
      {/* Subtle accent line at top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: 'linear-gradient(90deg, transparent, #a855f7, transparent)',
        opacity: 0.7
      }} />
      
      {/* Header */}
      <div 
        className="sampler-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          cursor: 'move',
          background: 'linear-gradient(145deg, #3a3a3a, rgba(168, 85, 247, 0.05))',
          padding: '8px 12px',
          margin: '-8px -8px 12px -8px'
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#ffffff', fontWeight: 600 }}>
            Sample Pads ({samples.length}/{MAX_SAMPLE_PADS})
          </h3>
          {loading && (
            <div style={{ fontSize: '11px', color: '#a855f7', marginTop: '2px' }}>
              Loading samples...
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'linear-gradient(145deg, #3498db, #2980b9)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            + Add Files
          </button>
          {samples.length > 0 && (
            <button
              onClick={async () => {
                try {
                  await window.api.invoke('sampler:clearAll');
                  setSamples([]);
                  localStorage.removeItem('ngks-sampler-samples');
                } catch (error) {
                  console.error('[Sampler] Error clearing samples:', error);
                }
              }}
              style={{
                background: 'linear-gradient(145deg, #e74c3c, #c0392b)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '6px',
        marginBottom: '8px'
      }}>
        <button
          onClick={() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollBy({ left: -(PAD_WIDTH + 8) * 10, behavior: 'smooth' });
            }
          }}
          style={{
            background: 'linear-gradient(145deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ◀ Prev 10
        </button>
        
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          color: '#fff',
          fontSize: '12px'
        }}>
          Pads {Math.floor(scrollPosition / (PAD_WIDTH + 8)) + 1}-{Math.min(Math.floor(scrollPosition / (PAD_WIDTH + 8)) + VISIBLE_PADS, renderPads.length)} of {renderPads.length}
        </div>
        
        <button
          onClick={() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollBy({ left: (PAD_WIDTH + 8) * 10, behavior: 'smooth' });
            }
          }}
          style={{
            background: 'linear-gradient(145deg, #3498db, #2980b9)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Next 10 ▶
        </button>
      </div>

      {/* 2 Rows of 5 Sample Pads Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          padding: '4px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3498db #1e1e2e'
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {deckMode === '4deck' ? (
          /* Single Row - 20 pads for 4-deck mode */
          <div style={{
            display: 'flex',
            gap: '8px',
            minHeight: '120px'
          }}>
            {renderPads.slice(0, 20).map((sample, index) => (
              <SamplePad
                key={sample?.id || `empty-${index}`}
                sample={sample}
                index={index}
                playingId={playingId}
                onPlay={handlePlay}
                onCuePlay={handleCuePlay}
                onRemove={removeSample}
                onDrop={(files) => processFiles(files, index)}
                padWidth={PAD_WIDTH}
              />
            ))}
          </div>
        ) : (
          /* Two Rows - 10 pads each for 2-deck mode */
          <>
            {/* Top Row - 10 pads */}
            <div style={{
              display: 'flex',
              gap: '8px',
              minHeight: '120px'
            }}>
              {renderPads.slice(0, 10).map((sample, index) => (
                <SamplePad
                  key={sample?.id || `empty-top-${index}`}
                  sample={sample}
                  index={index}
                  playingId={playingId}
                  onPlay={handlePlay}
                  onCuePlay={handleCuePlay}
                  onRemove={removeSample}
                  onDrop={(files) => processFiles(files, index)}
                  padWidth={PAD_WIDTH}
                />
              ))}
            </div>

            {/* Bottom Row - 10 pads */}
            <div style={{
              display: 'flex',
              gap: '8px',
              minHeight: '120px'
            }}>
              {renderPads.slice(10, 20).map((sample, index) => {
                const actualIndex = 10 + index;
                return (
                  <SamplePad
                    key={sample?.id || `empty-bottom-${actualIndex}`}
                    sample={sample}
                    index={actualIndex}
                    playingId={playingId}
                    onPlay={handlePlay}
                    onCuePlay={handleCuePlay}
                    onRemove={removeSample}
                    onDrop={(files) => processFiles(files, actualIndex)}
                    padWidth={PAD_WIDTH}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Drag overlay */}
      {dragActive && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(52, 152, 219, 0.3)',
          border: '3px dashed #3498db',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#3498db',
          zIndex: 10,
          pointerEvents: 'none'
        }}>
          Drop Audio Files Here
        </div>
      )}
      
      {/* Resize Handle */}
      <div 
        className="resize-handle"
        onMouseDown={handleResizeMouseDown}
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '4px',
          width: '16px',
          height: '16px',
          cursor: 'nw-resize',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(168, 85, 247, 0.2)',
          borderRadius: '4px',
          userSelect: 'none',
          border: '1px solid rgba(168, 85, 247, 0.4)'
        }}
        title="Drag to resize"
      >
        ⟲
      </div>
    </div>
  );
};

// Individual Sample Pad Component
const SamplePad = ({ sample, index, playingId, onPlay, onCuePlay, onRemove, onDrop, padWidth }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    const audioFiles = files.filter(file => file.type.startsWith('audio/'));
    if (audioFiles.length > 0) {
      onDrop(audioFiles);
    }
  };

  return (
    <div 
      style={{
        background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)
          ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)' 
          : sample 
            ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'
            : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
        border: sample ? '2px solid #fff' : '2px dashed #666',
        borderRadius: '8px',
        padding: '6px 4px 4px 4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '110px',
        minWidth: `${padWidth}px`,
        maxWidth: `${padWidth}px`,
        textAlign: 'center',
        boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`) 
          ? '0 0 8px rgba(231, 76, 60, 0.5)' 
          : '0 2px 4px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        position: 'relative',
        flexShrink: 0
      }}
      onDrop={sample ? undefined : handleDrop}
      onDragOver={sample ? undefined : (e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {sample ? (
        <>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#3498db',
              marginBottom: '2px'
            }}>
              {index + 1}
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#ffffff',
              fontWeight: 'bold',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              marginBottom: '2px',
              lineHeight: '1.2',
              padding: '0 2px'
            }}>
              {sample.name.length > 12 ? sample.name.substring(0, 12) + '...' : sample.name}
            </div>
            <div style={{ 
              fontSize: '9px', 
              color: '#888',
              opacity: 0.8
            }}>
              {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '2px',
            marginTop: '4px',
            width: '100%'
          }}>
            <button
              onClick={() => onPlay(sample)}
              style={{
                background: playingId === sample.id 
                  ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                  : 'linear-gradient(145deg, #27ae60, #229954)',
                color: 'white',
                border: '1px solid #fff',
                borderRadius: '3px',
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s ease'
              }}
            >
              ▶ MAIN
            </button>

            <button
              onClick={() => onCuePlay(sample)}
              style={{
                background: playingId === `cue-${sample.id}` 
                  ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                  : 'linear-gradient(145deg, #f39c12, #e67e22)',
                color: 'white',
                border: '1px solid #fff',
                borderRadius: '3px',
                padding: '4px 6px',
                fontSize: '9px',
                fontWeight: 'bold',
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s ease'
              }}
            >
              🎧 CUE
            </button>
          </div>

          <button
            onClick={() => onRemove(sample.id)}
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              background: 'rgba(231, 76, 60, 0.8)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </>
      ) : (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#666',
          fontSize: '11px'
        }}>
          <div style={{ fontSize: '16px', marginBottom: '6px' }}>+</div>
          <div>Drop Audio</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>
            {index + 1}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sampler;

