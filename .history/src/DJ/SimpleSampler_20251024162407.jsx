import React, { useState, useRef, useEffect, useCallback } from 'react';

const Sampler = ({ 
  audioManager, 
  id, 
  onStyleChange = () => {}, 
  style = {},
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
    setIsDragging(false);
  }, []);

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
    setIsResizing(false);
  }, []);

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

  // Load samples from localStorage on mount
  useEffect(() => {
    const loadSamples = async () => {
      try {
        const savedSamples = localStorage.getItem('ngks-sampler-samples');
        if (savedSamples) {
          const parsed = JSON.parse(savedSamples);
          const samplesWithData = parsed.map(sample => {
            try {
              const binaryString = atob(sample.dataBase64);
              const uint8Array = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
              }
              return {
                ...sample,
                data: uint8Array.buffer
              };
            } catch (error) {
              console.error('Failed to decode sample:', error);
              return null;
            }
          }).filter(Boolean);
          setSamples(samplesWithData);
        }
      } catch (error) {
        console.error('Failed to load samples:', error);
      }
    };
    loadSamples();
  }, []);

  // Save samples to localStorage
  useEffect(() => {
    if (samples.length === 0) return;
    
    try {
      const samplesToSave = samples.map(sample => {
        const uint8Array = new Uint8Array(sample.data);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        return {
          ...sample,
          dataBase64: btoa(binaryString),
          data: undefined
        };
      });
      localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesToSave));
    } catch (error) {
      console.error('Failed to save samples:', error);
    }
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
        
        const sample = {
          id: Date.now() + Math.random() + i,
          name: file.name.replace(/\.[^/.]+$/, ''),
          data: arrayBuffer,
          size: file.size,
          duration: duration,
          index: targetIndex
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

  const removeSample = (sampleId) => {
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
    setSamples(prev => prev.filter(sample => sample.id !== sampleId));
  };

  return (
    <div style={{
      background: 'linear-gradient(145deg, #2c3e50, #34495e)',
      border: '2px solid #3498db',
      borderRadius: '12px',
      padding: '12px',
      color: 'white',
      fontFamily: 'Arial, sans-serif',
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px',
        paddingBottom: '8px',
        borderBottom: '1px solid #3498db'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>
            Sample Pads ({samples.length}/{MAX_SAMPLE_PADS})
          </h3>
          {loading && (
            <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '2px' }}>
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
              onClick={() => {
                setSamples([]);
                localStorage.removeItem('ngks-sampler-samples');
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
