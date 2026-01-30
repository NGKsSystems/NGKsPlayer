import React, { useState, useRef, useEffect } from 'react';

const Sampler = ({ audioManager }) => {
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
  const VISIBLE_PADS = 10; // 2 rows of 5
  const PAD_WIDTH = 120; // 3/4 of original 160px

  // Calculate total pads (samples + buffer, up to 100 max)
  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);
  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {
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
      flexDirection: 'column'
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
        <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>
          Sample Pads ({samples.length}/{MAX_SAMPLE_PADS})
        </h3>
        <button style={{
          background: 'linear-gradient(145deg, #3498db, #2980b9)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '12px',
          cursor: 'pointer'
        }}>
          + Add Files
        </button>
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
              container.scrollBy({ left: -320, behavior: 'smooth' });
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
          ◀ Prev
        </button>
        
        <div style={{ 
          flex: 1, 
          textAlign: 'center',
          color: '#fff',
          fontSize: '12px'
        }}>
          Pads {Math.floor(scrollPosition / 170) + 1}-{Math.min(Math.floor(scrollPosition / 170) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}
        </div>
        
        <button
          onClick={() => {
            const container = scrollContainerRef.current;
            if (container) {
              container.scrollBy({ left: 320, behavior: 'smooth' });
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
          Next ▶
        </button>
      </div>

      {/* Horizontal Scrolling Container */}
      <div 
        ref={scrollContainerRef}
        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          padding: '4px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#3498db #1e1e2e'
        }}
      >
        {renderPads.map((sample, index) => (
          <div 
            key={sample?.id || `empty-${index}`} 
            style={{
              background: sample 
                ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'
                : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',
              border: sample ? '2px solid #fff' : '2px dashed #666',
              borderRadius: '8px',
              padding: '8px 6px 6px 6px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: '120px',
              minWidth: '160px', // Fixed 160px width as requested
              maxWidth: '160px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              position: 'relative',
              flexShrink: 0 // Prevents shrinking in flex container
            }}
          >
            {sample ? (
              <>
                {/* Sample Content */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#3498db',
                    marginBottom: '4px'
                  }}>
                    {index + 1}
                  </div>
                  <div style={{ 
                    fontSize: '14px', 
                    color: '#ffffff',
                    fontWeight: 'bold',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    marginBottom: '2px'
                  }}>
                    {sample.name}
                  </div>
                </div>

                {/* Play Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '2px',
                  marginTop: '4px',
                  width: '100%'
                }}>
                  <button style={{
                    background: 'linear-gradient(145deg, #27ae60, #229954)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    ▶ MAIN
                  </button>
                  <button style={{
                    background: 'linear-gradient(145deg, #f39c12, #e67e22)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    flex: 1
                  }}>
                    🎧 CUE
                  </button>
                </div>
              </>
            ) : (
              /* Empty Pad */
              <div style={{ 
                flex: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: '#666',
                fontSize: '12px'
              }}>
                <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>
                <div>Drop Audio</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>
                  {index + 1}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sampler;
