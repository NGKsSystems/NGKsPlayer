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

  // Constants for the scrolling system
  const MAX_SAMPLE_PADS = 100;
  const EMPTY_PADS_BUFFER = 5;
  const VISIBLE_PADS = 10; // How many pads visible at once

  // Calculate total pads needed (samples + buffer, up to max)
  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);
  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {
    return samples[index] || null; // null represents empty pad
  });

  // Load samples from localStorage on mount
  useEffect(() => {
    const loadSamples = async () => {
      try {
        console.log('Attempting to load samples from localStorage...');
        const savedSamples = localStorage.getItem('ngks-sampler-samples');
        if (savedSamples) {
          console.log('Found saved samples data');
          const parsed = JSON.parse(savedSamples);
          console.log('Parsed', parsed.length, 'samples from storage');
          
          // Convert base64 back to ArrayBuffer
          const samplesWithData = parsed.map(sample => {
            try {
              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);
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
              console.error(`Failed to decode sample "${sample.name}":`, error);
              return null;
            }
          }).filter(Boolean);
          
          console.log('Successfully loaded', samplesWithData.length, 'samples');
          setSamples(samplesWithData);
        } else {
          console.log('No saved samples found');
        }
      } catch (error) {
        console.error('Failed to load samples from localStorage:', error);
      }
    };
    loadSamples();
  }, []);

  // Save samples to localStorage whenever samples change
  useEffect(() => {
    if (samples.length > 0) {
      try {
        console.log('Saving', samples.length, 'samples to localStorage...');
        // Convert ArrayBuffer to base64 for storage
        const samplesForStorage = samples.map(sample => {
          try {
            const uint8Array = new Uint8Array(sample.data);
            const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');
            const dataBase64 = btoa(binaryString);
            console.log(`Encoded sample "${sample.name}" (${sample.size} bytes)`);
            return {
              id: sample.id,
              name: sample.name,
              size: sample.size,
              duration: sample.duration,
              dataBase64: dataBase64
            };
          } catch (error) {
            console.error(`Failed to encode sample "${sample.name}":`, error);
            return null;
          }
        }).filter(Boolean);
        
        localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesForStorage));
        console.log('Successfully saved samples to localStorage');
      } catch (error) {
        console.error('Failed to save samples to localStorage:', error);
      }
    } else {
      // Clear localStorage when no samples
      localStorage.removeItem('ngks-sampler-samples');
      console.log('Cleared samples from localStorage');
    }
  }, [samples]);

  const supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac'];

  const isSupportedFormat = (filename) => {
    const extension = filename.split('.').pop().toLowerCase();
    return supportedFormats.includes(extension);
  };

  const processFiles = async (files, startIndex = samples.length) => {
    setLoading(true);
    const newSamples = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const targetIndex = startIndex + i;
      
      // Don't exceed max pads
      if (targetIndex >= MAX_SAMPLE_PADS) break;
      
      try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Calculate duration using Web Audio API
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
        alert(`Failed to load ${file.name}`);
      }
    }
    
    // Insert samples at specific indices
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
    const audioFiles = files.filter(file => isSupportedFormat(file.name));
    if (audioFiles.length > 0) {
      processFiles(audioFiles);
    } else {
      alert('No supported audio files found. Supported formats: ' + supportedFormats.join(', '));
    }
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      processFiles(files);
    }
  };

  const handlePlay = async (sample) => {
    console.log('Play button clicked!', sample.name);
    try {
      const audioContext = audioContextRef.current;
      console.log('AudioContext state:', audioContext.state);
      
      // Resume AudioContext if suspended (required for user interaction)
      if (audioContext.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await audioContext.resume();
        console.log('AudioContext resumed, state:', audioContext.state);
      }
      
      if (playingId === sample.id && sourceNodesRef.current[sample.id]) {
        console.log('Stopping currently playing sample');
        sourceNodesRef.current[sample.id].stop();
        delete sourceNodesRef.current[sample.id];
        setPlayingId(null);
        return;
      }
      if (playingId !== null && sourceNodesRef.current[playingId]) {
        console.log('Stopping other playing sample');
        sourceNodesRef.current[playingId].stop();
        delete sourceNodesRef.current[playingId];
      }
      console.log('Starting playback for:', sample.name);
      setPlayingId(sample.id);
      
      // Clone the ArrayBuffer to avoid "detached" errors on replay
      const clonedData = sample.data.slice();
      const audioBuffer = await audioContext.decodeAudioData(clonedData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create stereo panner for left ear (main) output
      const panNode = audioContext.createStereoPanner();
      panNode.pan.value = -1; // Pan fully to the left ear (main output)
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1;
      
      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(audioContext.destination);
      
      sourceNodesRef.current[sample.id] = source;
      source.start(0);
      source.onended = () => {
        setPlayingId(null);
        delete sourceNodesRef.current[sample.id];
      };
    } catch (error) {
      console.error('Failed to play sample:', error);
      setPlayingId(null);
    }
  };

  const handleCuePlay = async (sample) => {
    console.log('Cue button clicked!', sample.name);
    try {
      const audioContext = audioContextRef.current;
      
      // Resume AudioContext if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      // Stop any currently playing cue samples
      if (playingId === `cue-${sample.id}` && sourceNodesRef.current[`cue-${sample.id}`]) {
        sourceNodesRef.current[`cue-${sample.id}`].stop();
        delete sourceNodesRef.current[`cue-${sample.id}`];
        setPlayingId(null);
        return;
      }
      
      // Stop any other cue samples
      Object.keys(sourceNodesRef.current).forEach(key => {
        if (key.startsWith('cue-')) {
          sourceNodesRef.current[key].stop();
          delete sourceNodesRef.current[key];
        }
      });
      
      console.log('Starting cue playback for:', sample.name);
      setPlayingId(`cue-${sample.id}`);
      
      // Clone the ArrayBuffer for cue playback
      const clonedData = sample.data.slice();
      const audioBuffer = await audioContext.decodeAudioData(clonedData);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // Create stereo panner for right ear (cue) output
      const panNode = audioContext.createStereoPanner();
      panNode.pan.value = 1; // Pan fully to the right ear
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8; // Slightly lower for headphone cue
      
      source.connect(gainNode);
      gainNode.connect(panNode);
      panNode.connect(audioContext.destination);
      
      sourceNodesRef.current[`cue-${sample.id}`] = source;
      source.start(0);
      source.onended = () => {
        setPlayingId(null);
        delete sourceNodesRef.current[`cue-${sample.id}`];
      };
    } catch (error) {
      console.error('Failed to play cue sample:', error);
      setPlayingId(null);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      padding: '16px',
      background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',
      borderRadius: '8px',
      maxHeight: '600px',
      overflow: 'hidden'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
        borderRadius: '8px',
        padding: '16px',
        border: `2px dashed ${dragActive ? '#2ecc71' : '#3498db'}`,
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
            Sample Browser
          </h3>
          <button 
            style={{
              color: '#3498db',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              textDecoration: 'underline'
            }}
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Browse Files'}
          </button>
        </div>
        
        <div 
          style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '14px',
            padding: '20px'
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p>Drag and drop audio files here or click "Browse Files"</p>
          <p>Supported formats: {supportedFormats.join(', ')}</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          multiple
          accept=".mp3,.wav,.ogg,.webm,.flac,.aac"
          onChange={handleFileInput}
        />
      </div>

      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
        borderRadius: '8px',
        padding: '16px',
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ color: '#ffffff', margin: '0', fontSize: '16px' }}>
            Sample Pads ({samples.length})
          </h3>
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
        
        {/* Horizontal Scrolling Navigation */}
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
            Pads {Math.floor(scrollPosition / 160) + 1}-{Math.min(Math.floor(scrollPosition / 160) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}
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

        {/* Horizontal Scrolling Sample Pads Container */}
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
                background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)
                  ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)' 
                  : sample 
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
                minWidth: '160px', // Fixed width for horizontal scrolling
                maxWidth: '160px',
                textAlign: 'center',
                boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`) 
                  ? '0 0 8px rgba(231, 76, 60, 0.5)' 
                  : '0 2px 4px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
                position: 'relative',
                flexShrink: 0 // Prevent shrinking in flex container
              }}
              onDrop={sample ? undefined : (e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                const files = Array.from(e.dataTransfer.files);
                const audioFiles = files.filter(file => file.type.startsWith('audio/'));
                if (audioFiles.length > 0) {
                  // Process files starting at this index
                  processFiles(audioFiles, index);
                }
              }}
              onDragOver={sample ? undefined : (e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragEnter={sample ? undefined : (e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
            >
              {sample ? (
                <>
                  {/* Sample Info Display */}
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
                    <div style={{ 
                      fontSize: '10px', 
                      color: '#888',
                      opacity: 0.8
                    }}>
                      {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '2px',
                    marginTop: '4px',
                    width: '100%'
                  }}>
                    {/* Main Play Button */}
                    <button
                      onClick={() => handlePlay(sample)}
                      style={{
                        background: playingId === sample.id 
                          ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                          : 'linear-gradient(145deg, #27ae60, #229954)',
                        color: 'white',
                        border: '1px solid #fff',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        flex: 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      ▶ MAIN
                    </button>

                    {/* Cue Play Button */}
                    <button
                      onClick={() => handleCuePlay(sample)}
                      style={{
                        background: playingId === `cue-${sample.id}` 
                          ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                          : 'linear-gradient(145deg, #f39c12, #e67e22)',
                        color: 'white',
                        border: '1px solid #fff',
                        borderRadius: '4px',
                        padding: '6px 8px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        flex: 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🎧 CUE
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeSample(sample.id)}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: 'rgba(231, 76, 60, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
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
                    borderRadius: '4px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minHeight: '32px'
                  }}
                  onClick={() => {
                    console.log('Main play button clicked for:', sample.name);
                    handlePlay(sample);
                  }}
                  title="Play to Main Output (Left Ear)"
                >
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    {playingId === sample.id ? '⏹' : '▶'}
                  </div>
                  <div>MAIN</div>
                </button>

                {/* Cue Play Button */}
                <button
                  style={{
                    background: playingId === `cue-${sample.id}` 
                      ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                      : 'linear-gradient(145deg, #f39c12, #e67e22)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minHeight: '32px'
                  }}
                  onClick={() => {
                    console.log('Cue button clicked for:', sample.name);
                    handleCuePlay(sample);
                  }}
                  title="Play to Cue Output (Right Ear)"
                >
                  <div style={{ fontSize: '11px', marginBottom: '2px' }}>
        </div>
      </div>
    </div>
  );
};

export default Sampler;