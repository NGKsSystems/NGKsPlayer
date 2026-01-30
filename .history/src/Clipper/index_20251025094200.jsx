import React, { useState, useRef, useEffect } from 'react';
import FileLoader from './components/FileLoader';
import WaveformEditor from './components/WaveformEditor';
import ClipsList from './components/ClipsList';
import ExportPanel from './components/ExportPanel';
import { useClipperProject } from './hooks/useClipperProject';
import { extractAudioClip, generateWAV } from './utils/audioExtractor';
import './styles.css';

const Clipper = ({ onNavigate }) => {
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [inPoint, setInPoint] = useState(null);
  const [outPoint, setOutPoint] = useState(null);
  
  // Use refs instead of state for isPlaying to avoid stale closures
  const isPlayingRef = useRef(false);
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceRef = useRef(null);
  const updateIntervalRef = useRef(null);
  
  const { clips, addClip, deleteClip, updateClip, saveProject, loadProject } = useClipperProject();

  // Sync ref with state
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Handle file load
  const handleFileLoad = async (file, buffer) => {
    setAudioFile(file);
    setAudioBuffer(buffer);
    setCurrentTime(0);
    setInPoint(null);
    setOutPoint(null);
    setIsPlaying(false);
  };

  // Play/Pause audio
  const handlePlayPause = () => {
    const audioContext = audioContextRef.current;

    if (isPlayingRef.current) {
      // Pause (don't stop, just pause)
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play
      if (!audioBuffer) return;

      // CRITICAL: Stop any existing playback first
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
        sourceRef.current = null;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const startTime = audioContext.currentTime;
      const playFromTime = currentTime / 1000; // Convert ms to seconds
      const startingTimeMs = currentTime; // Capture the starting time in ms

      source.start(0, playFromTime);
      sourceRef.current = source;

      // Track playback position
      let logCounter = 0;
      const interval = setInterval(() => {
        const elapsedTime = (audioContext.currentTime - startTime) * 1000;
        const newTime = startingTimeMs + elapsedTime; // Use captured starting time
        
        // Only log every 30 frames (about 2 times per second)
        if (logCounter % 30 === 0) {
          console.log('Time calculation:', { 
            startTime, 
            audioContextTime: audioContext.currentTime, 
            startingTimeMs, 
            elapsedTime, 
            newTime, 
            displaySeconds: newTime / 1000 
          });
        }
        logCounter++;
        
        if (newTime >= (audioBuffer.duration * 1000)) {
          // Song ended
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          if (sourceRef.current) {
            try {
              sourceRef.current.stop();
            } catch (e) {}
            sourceRef.current = null;
          }
          setIsPlaying(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(newTime);
        }
      }, 100); // Change from 16ms to 100ms for testing

      updateIntervalRef.current = interval;

      source.onended = () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        if (sourceRef.current) {
          sourceRef.current = null;
        }
        setIsPlaying(false);
        setCurrentTime(0);
      };

      setIsPlaying(true);
    }
  };

  // Stop audio (separate from pause)
  const handleStop = () => {
    // Clear interval immediately
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    // Stop source immediately
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch (e) {
        // Already stopped or invalid state
      }
      sourceRef.current = null;
    }
    
    // Update state
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.stop();
        } catch (e) {
          // Already stopped
        }
      }
    };
  }, []);

  // Handle time scrubbing (clicking on waveform to set position)
  const handleTimeChange = (newTime) => {
    // Always allow setting the time, even while playing
    const clampedTime = Math.max(0, Math.min(newTime, (audioBuffer?.duration || 0) * 1000));
    setCurrentTime(clampedTime);
    
    // If playing, we need to update the audio source
    if (isPlayingRef.current && sourceRef.current && audioBuffer) {
      // Stop current playback
      try {
        sourceRef.current.stop();
      } catch (e) {}
      sourceRef.current = null;
      
      // Clear update interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      
      // Restart playback from new position
      const audioContext = audioContextRef.current;
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      const startTime = audioContext.currentTime;
      const playFromTime = clampedTime / 1000;
      
      source.start(0, playFromTime);
      sourceRef.current = source;
      
      // Restart update interval
      const interval = setInterval(() => {
        const elapsedTime = (audioContext.currentTime - startTime) * 1000;
        const newTimeUpdate = clampedTime + elapsedTime; // Fix: clampedTime is already in ms
        console.log('Scrub time calculation:', { clampedTime, elapsedTime, newTimeUpdate });
        
        if (newTimeUpdate >= (audioBuffer.duration * 1000)) {
          if (updateIntervalRef.current) {
            clearInterval(updateIntervalRef.current);
            updateIntervalRef.current = null;
          }
          if (sourceRef.current) {
            try {
              sourceRef.current.stop();
            } catch (e) {}
            sourceRef.current = null;
          }
          setIsPlaying(false);
          setCurrentTime(0);
        } else {
          setCurrentTime(newTimeUpdate);
        }
      }, 100); // Change from 16ms to 100ms for testing
      
      updateIntervalRef.current = interval;
      
      source.onended = () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        if (sourceRef.current) {
          sourceRef.current = null;
        }
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }
  };

  // Set in point
  const handleSetInPoint = () => {
    setInPoint(Math.round(currentTime));
    if (outPoint !== null && inPoint !== null && inPoint > outPoint) {
      setOutPoint(Math.round(currentTime));
    }
  };

  // Set out point
  const handleSetOutPoint = () => {
    setOutPoint(Math.round(currentTime));
    if (inPoint !== null && outPoint !== null && outPoint < inPoint) {
      setInPoint(Math.round(currentTime));
    }
  };

  // Create clip from in/out points
  const [clipName, setClipName] = useState('');

  const handleCreateClip = (name) => {
    if (inPoint === null || outPoint === null) {
      alert('Set both in and out points');
      return;
    }

    if (inPoint >= outPoint) {
      alert('In point must be before out point');
      return;
    }

    const newClip = {
      id: Date.now(),
      name: name || `Clip ${clips.length + 1}`,
      startTime: inPoint,
      endTime: outPoint,
      duration: outPoint - inPoint,
      created: new Date().toISOString()
    };

    addClip(newClip);
    // Clear name but KEEP in/out points for creating more clips
    setClipName('');
  };

  // Clear all clips
  const handleClearAll = () => {
    if (clips.length === 0) return;
    if (window.confirm(`Delete all ${clips.length} clips?`)) {
      clips.forEach(clip => deleteClip(clip.id));
    }
  };

  // Undo last clip
  const handleUndoLast = () => {
    if (clips.length === 0) return;
    const lastClip = clips[clips.length - 1];
    deleteClip(lastClip.id);
  };

  // Reset points and name
  const handleResetPoints = () => {
    setInPoint(null);
    setOutPoint(null);
    setClipName('');
  };

  return (
    <div className="clipper-container">
      <div className="clipper-header">
        <h1>🎬 Pro Clipper</h1>
        <div className="header-nav">
          <button onClick={() => onNavigate?.('library')} className="btn-nav">← Back to Library</button>
        </div>
      </div>

      {/* Top: File Loader - Compact Header */}
      <div className="clipper-top-section">
        <div className="file-loader-compact">
          <FileLoader onFileLoad={handleFileLoad} currentFile={audioFile} />
        </div>
      </div>

      {/* Main: Full-width Waveform Editor */}
      <div className="clipper-main-section">
        {audioBuffer ? (
          <WaveformEditor
            audioBuffer={audioBuffer}
            currentTime={currentTime}
            onTimeChange={handleTimeChange}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
            onStop={handleStop}
            inPoint={inPoint}
            outPoint={outPoint}
            onSetInPoint={handleSetInPoint}
            onSetOutPoint={handleSetOutPoint}
            onCreateClip={() => handleCreateClip(clipName)}
            clipName={clipName}
            onClipNameChange={setClipName}
            onResetPoints={handleResetPoints}
            audioFile={audioFile}
          />
        ) : (
          <div className="editor-placeholder">
            <p>Load an audio file to start editing</p>
          </div>
        )}
      </div>

      {/* Bottom: Clips List & Export Controls */}
      {audioBuffer && (
        <div className="clipper-bottom-section">
          <div className="bottom-controls">
            <div className="clip-management">
              <button 
                className="btn-control btn-undo"
                onClick={handleUndoLast}
                disabled={clips.length === 0}
                title="Delete last created clip"
              >
                ↶ Undo Last
              </button>
              <button 
                className="btn-control btn-clear"
                onClick={handleClearAll}
                disabled={clips.length === 0}
                title="Delete all clips"
              >
                🗑 Clear All
              </button>
              <span className="clip-count">Clips: {clips.length}</span>
            </div>

            <div className="clips-preview">
              {clips.length > 0 && (
                <div className="clips-mini-list">
                  {clips.map((clip) => (
                    <div key={clip.id} className="clip-mini-item">
                      <span className="clip-mini-name">{clip.name}</span>
                      <button 
                        className="btn-mini-delete"
                        onClick={() => {
                          if (confirm(`Delete "${clip.name}"?`)) {
                            deleteClip(clip.id);
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="export-controls">
              <ExportPanel
                clips={clips}
                audioBuffer={audioBuffer}
                audioContext={audioContextRef.current}
                onNavigate={onNavigate}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clipper;
