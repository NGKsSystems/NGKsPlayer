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
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceRef = useRef(null);
  const updateIntervalRef = useRef(null);
  
  const { clips, addClip, deleteClip, updateClip, saveProject, loadProject } = useClipperProject();

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

    if (isPlaying) {
      // Stop
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.stop();
        sourceRef.current = null;
      }
      setIsPlaying(false);
    } else {
      // Play
      if (!audioBuffer) return;

      // Clean up any existing interval
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }

      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const startTime = audioContext.currentTime;
      const playFromTime = currentTime / 1000; // Convert ms to seconds

      source.start(0, playFromTime);
      sourceRef.current = source;

      // Track playback position with proper interval management
      const interval = setInterval(() => {
        setCurrentTime((prevTime) => {
          const newTime = prevTime + (audioContext.currentTime - startTime) * 1000;
          if (newTime >= (audioBuffer.duration * 1000)) {
            if (updateIntervalRef.current) {
              clearInterval(updateIntervalRef.current);
              updateIntervalRef.current = null;
            }
            setIsPlaying(false);
            return 0;
          }
          return newTime;
        });
      }, 16);

      updateIntervalRef.current = interval;

      source.onended = () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        setIsPlaying(false);
        setCurrentTime(0);
      };

      setIsPlaying(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.stop();
      }
    };
  }, []);

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
            onTimeChange={setCurrentTime}
            isPlaying={isPlaying}
            onPlayPause={handlePlayPause}
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
