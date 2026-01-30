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
  
  // Simple refs for audio playback - USE HTML5 AUDIO LIKE THE DJ DECK
  const audioRef = useRef(null); // HTML5 audio element, not Web Audio API
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  
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
    
    // Create HTML5 audio element for accurate timing like DJ deck
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Create object URL for HTML5 audio
    const audioElement = new Audio();
    audioElement.src = URL.createObjectURL(file);
    audioElement.preload = 'metadata';
    
    // Add timeupdate listener for position tracking - SAME AS DJ DECK
    audioElement.addEventListener('timeupdate', () => {
      setCurrentTime(audioElement.currentTime * 1000); // Convert to ms
    });
    
    audioElement.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });
    
    audioRef.current = audioElement;
  };

  // Simple, clean stop function
  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  // Simple play/pause toggle - EXACTLY LIKE DJ DECK
  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Simple stop function
  const handleStop = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Simple time change (scrubbing) - EXACTLY LIKE DJ DECK
  const handleTimeChange = (newTime) => {
    if (!audioRef.current) return;
    
    const clampedTime = Math.max(0, Math.min(newTime, (audioBuffer?.duration || 0) * 1000));
    const seconds = clampedTime / 1000;
    
    audioRef.current.currentTime = seconds;
    setCurrentTime(clampedTime);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
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
