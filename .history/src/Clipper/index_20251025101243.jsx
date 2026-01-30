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
  
  // Simple refs for audio playback
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceRef = useRef(null);
  const startTimeRef = useRef(0); // When playback started
  const pauseTimeRef = useRef(0); // Where we paused
  const animationRef = useRef(null);
  
  const { clips, addClip, deleteClip, updateClip, saveProject, loadProject } = useClipperProject();

  // Handle file load
  const handleFileLoad = async (file, buffer) => {
    // Stop any current playback
    stopPlayback();
    
    setAudioFile(file);
    setAudioBuffer(buffer);
    setCurrentTime(0);
    setInPoint(null);
    setOutPoint(null);
    setIsPlaying(false);
    pauseTimeRef.current = 0;
  };

  // Simple, clean stop function
  const stopPlayback = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
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
  };

  // Simple, clean play function
  const startPlayback = (fromTime = 0) => {
    if (!audioBuffer) return;
    
    // Stop any existing playback
    stopPlayback();
    
    const audioContext = audioContextRef.current;
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0.8;
    
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Start playback
    const playFromSeconds = fromTime / 1000;
    source.start(0, playFromSeconds);
    sourceRef.current = source;
    
    // Record when we started with REAL TIME - NOT audioContext.currentTime
    startTimeRef.current = performance.now(); // Use real time, not audio context time
    pauseTimeRef.current = fromTime;
    
    // Handle natural end
    source.onended = () => {
      stopPlayback();
      setCurrentTime(0);
      pauseTimeRef.current = 0;
    };
    
    setIsPlaying(true);
    
    // Start animation loop for time updates using REAL TIME
    const updateTime = () => {
      if (!sourceRef.current) return;
      
      // Calculate elapsed time using REAL TIME ONLY
      const realTimeElapsed = performance.now() - startTimeRef.current;
      const newTime = pauseTimeRef.current + realTimeElapsed;
      
      if (newTime >= audioBuffer.duration * 1000) {
        stopPlayback();
        setCurrentTime(0);
        pauseTimeRef.current = 0;
        return;
      }
      
      setCurrentTime(newTime);
      animationRef.current = requestAnimationFrame(updateTime);
    };
    
    animationRef.current = requestAnimationFrame(updateTime);
  };

  // Simple play/pause toggle
  const handlePlayPause = () => {
    if (isPlaying) {
      // Pause: stop and remember position
      const audioContext = audioContextRef.current;
      const elapsed = (audioContext.currentTime - startTimeRef.current) * 1000;
      const pausePosition = pauseTimeRef.current + elapsed;
      
      stopPlayback();
      setCurrentTime(pausePosition);
      pauseTimeRef.current = pausePosition;
    } else {
      // Play: start from current position
      startPlayback(pauseTimeRef.current);
    }
  };

  // Simple stop function
  const handleStop = () => {
    stopPlayback();
    setCurrentTime(0);
    pauseTimeRef.current = 0;
  };

  // Simple time change (scrubbing)
  const handleTimeChange = (newTime) => {
    const clampedTime = Math.max(0, Math.min(newTime, (audioBuffer?.duration || 0) * 1000));
    
    if (isPlaying) {
      // If playing, restart from new position
      startPlayback(clampedTime);
    } else {
      // If paused, just update the time
      setCurrentTime(clampedTime);
      pauseTimeRef.current = clampedTime;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  // Set in point
  const handleSetInPoint = () => {
    setInPoint(Math.round(currentTime));
    if (outPoint !== null && Math.round(currentTime) > outPoint) {
      setOutPoint(Math.round(currentTime));
    }
  };

  // Set out point
  const handleSetOutPoint = () => {
    setOutPoint(Math.round(currentTime));
    if (inPoint !== null && Math.round(currentTime) < inPoint) {
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
