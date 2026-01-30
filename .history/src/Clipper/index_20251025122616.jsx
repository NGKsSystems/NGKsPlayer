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
  
  // SIMPLEST POSSIBLE: Use hidden HTML5 audio element
  const hiddenAudioRef = useRef(null);
  
  const { clips, addClip, deleteClip, updateClip, saveProject, loadProject } = useClipperProject();

  // Create hidden audio element in the DOM
  useEffect(() => {
    const audio = document.createElement('audio');
    audio.style.display = 'none';
    audio.preload = 'auto';
    document.body.appendChild(audio);
    hiddenAudioRef.current = audio;

    return () => {
      if (audio.parentNode) {
        audio.parentNode.removeChild(audio);
      }
    };
  }, []);

  // Handle file load
  const handleFileLoad = async (file, buffer) => {
    setAudioFile(file);
    setAudioBuffer(buffer);
    setCurrentTime(0);
    setInPoint(null);
    setOutPoint(null);
    setIsPlaying(false);
    
    if (hiddenAudioRef.current) {
      // Remove old listeners
      hiddenAudioRef.current.removeEventListener('timeupdate', updatePosition);
      hiddenAudioRef.current.removeEventListener('ended', handleAudioEnd);
      
      // Set new source
      hiddenAudioRef.current.src = URL.createObjectURL(file);
      
      // Add new listeners
      hiddenAudioRef.current.addEventListener('timeupdate', updatePosition);
      hiddenAudioRef.current.addEventListener('ended', handleAudioEnd);
    }
  };

  // Update position from audio element
  const updatePosition = () => {
    if (hiddenAudioRef.current) {
      const timeMs = hiddenAudioRef.current.currentTime * 1000;
      setCurrentTime(timeMs);
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Play/Pause
  const handlePlayPause = () => {
    if (!hiddenAudioRef.current) return;
    
    if (isPlaying) {
      hiddenAudioRef.current.pause();
      setIsPlaying(false);
    } else {
      hiddenAudioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(e => {
        console.error('Play failed:', e);
      });
    }
  };

  // Stop
  const handleStop = () => {
    if (!hiddenAudioRef.current) return;
    
    hiddenAudioRef.current.pause();
    hiddenAudioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // Seek
  const handleTimeChange = (newTime) => {
    if (!hiddenAudioRef.current || !audioBuffer) return;
    
    const clampedTime = Math.max(0, Math.min(newTime, audioBuffer.duration * 1000));
    const seconds = clampedTime / 1000;
    
    hiddenAudioRef.current.currentTime = seconds;
    setCurrentTime(clampedTime);
  };

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
        <h1>🎬 Pro Clipper - REBUILT</h1>
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
                audioContext={new (window.AudioContext || window.webkitAudioContext)()}
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
