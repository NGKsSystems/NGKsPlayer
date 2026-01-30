import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Download, Save, FolderOpen, Scissors, MousePointer, ZoomIn, ZoomOut, RotateCcw, RotateCw, X } from 'lucide-react';
import Timeline from './components/Timeline';
import TransportControls from './components/TransportControls';
import ToolPanel from './components/ToolPanel';
import ExportPanel from './components/ExportPanel';
import ProjectManager from './components/ProjectManager';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useProjectState } from './hooks/useProjectState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import './ProAudioClipper.css';

/**
 * ProAudioClipper - Professional Audio Editing Component
 * 
 * Inspired by Adobe Premiere Pro and DaVinci Resolve for audio editing.
 * Features:
 * - Professional timeline with waveform visualization
 * - Precision cutting tools (razor, selection)
 * - Frame-accurate editing
 * - Multi-format export
 * - Project management with undo/redo
 * - Keyboard shortcuts
 */
const ProAudioClipper = ({ onNavigate }) => {
  // Refs for audio and canvas elements
  const timelineRef = useRef(null);
  const audioRef = useRef(null);
  
  // Main application state
  const [activeFile, setActiveFile] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTool, setSelectedTool] = useState('selection'); // 'selection', 'razor'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStart, setViewportStart] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  // Selection and cutting state
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [clips, setClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState(new Set());
  
  // UI state
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  // Custom hooks
  const audioEngine = useAudioEngine(audioRef);
  const projectState = useProjectState();

  // Audio file loading
  const handleFileLoad = useCallback(async (file) => {
    try {
      const audioBuffer = await audioEngine.loadFile(file);
      setActiveFile({
        name: file.name,
        buffer: audioBuffer,
        duration: audioBuffer.duration,
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });
      setDuration(audioBuffer.duration);
      setCurrentTime(0);
      setClips([]);
      setSelectedClips(new Set());
      
      // Add to project history
      projectState.saveState({
        file: file.name,
        clips: [],
        timeline: { zoom: 1, viewport: 0 }
      });
      
      console.log('Audio file loaded:', file.name);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('Failed to load audio file. Please try a different format.');
    }
  }, [audioEngine, projectState]);

  // Playback controls
  const togglePlayback = useCallback(() => {
    if (!activeFile) return;
    
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      audioEngine.play(currentTime, playbackRate);
      setIsPlaying(true);
    }
  }, [activeFile, isPlaying, currentTime, playbackRate, audioEngine]);

  const stop = useCallback(() => {
    audioEngine.stop();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [audioEngine]);

  const seek = useCallback((time) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    
    // Let the audio engine handle both the seek and the state update
    // This prevents double state updates that can cause sticking
    audioEngine.seek(clampedTime);
  }, [duration, audioEngine]);

  // Preview playback functions
  const previewSelection = useCallback(() => {
    if (selectionStart !== null && selectionEnd !== null) {
      const duration = selectionEnd - selectionStart;
      audioEngine.play(selectionStart, playbackRate);
      setIsPlaying(true);
      
      // Auto-stop at selection end
      setTimeout(() => {
        audioEngine.pause();
        setIsPlaying(false);
        audioEngine.seek(selectionStart); // Return to start of selection
      }, (duration * 1000) / playbackRate);
    }
  }, [selectionStart, selectionEnd, playbackRate, audioEngine]);

  const clearSelection = useCallback(() => {
    setSelectionStart(null);
    setSelectionEnd(null);
  }, []);

  // Fine-tune selection controls
  const adjustSelectionStart = useCallback((delta) => {
    if (selectionStart !== null) {
      const newStart = Math.max(0, Math.min(selectionStart + delta, selectionEnd || duration));
      setSelectionStart(newStart);
    }
  }, [selectionStart, selectionEnd, duration]);

  const adjustSelectionEnd = useCallback((delta) => {
    if (selectionEnd !== null) {
      const newEnd = Math.max(selectionStart || 0, Math.min(selectionEnd + delta, duration));
      setSelectionEnd(newEnd);
    }
  }, [selectionStart, selectionEnd, duration]);

  // Timeline interaction
  const handleTimelineClick = useCallback((time, event) => {
    if (selectedTool === 'selection') {
      if (event.shiftKey && selectionStart !== null) {
        // Extend selection
        setSelectionEnd(time);
      } else {
        // Start new selection or just seek
        if (selectionStart === null || Math.abs(time - selectionStart) > 0.1) {
          setSelectionStart(time);
          setSelectionEnd(null);
        } else {
          // Click on same spot - just seek
          seek(time);
        }
      }
    } else if (selectedTool === 'razor') {
      // Cut at this position
      if (selectionStart !== null && selectionEnd !== null) {
        performCut();
      } else {
        // Set cut point
        setSelectionStart(time);
        setSelectionEnd(time + 0.001); // Minimal selection for visual feedback
      }
    }
  }, [selectedTool, selectionStart, selectionEnd, seek]);

  const handleTimelineDrag = useCallback((startTime, endTime) => {
    if (selectedTool === 'selection') {
      setSelectionStart(Math.min(startTime, endTime));
      setSelectionEnd(Math.max(startTime, endTime));
    }
  }, [selectedTool]);

  // Cutting and editing functions
  const performCut = useCallback(() => {
    if (!activeFile || selectionStart === null || selectionEnd === null) return;
    
    const newClip = {
      id: Date.now().toString(),
      name: `Clip ${clips.length + 1}`,
      startTime: selectionStart,
      endTime: selectionEnd,
      duration: selectionEnd - selectionStart,
      originalFile: activeFile.name
    };
    
    const newClips = [...clips, newClip];
    setClips(newClips);
    setSelectedClips(new Set([newClip.id]));
    
    // Clear selection
    setSelectionStart(null);
    setSelectionEnd(null);
    
    // Save state for undo
    projectState.saveState({
      file: activeFile.name,
      clips: newClips,
      timeline: { zoom: zoomLevel, viewport: viewportStart }
    });
    
    console.log('Created clip:', newClip);
  }, [activeFile, selectionStart, selectionEnd, clips, zoomLevel, viewportStart, projectState]);

  const cut = useCallback(() => {
    performCut();
  }, [performCut]);

  const copy = useCallback(() => {
    if (selectedClips.size === 0) return;
    
    const clipsToCopy = clips.filter(clip => selectedClips.has(clip.id));
    // Store in a simple clipboard state - could be enhanced with proper clipboard API
    sessionStorage.setItem('pro-clipper-clipboard', JSON.stringify(clipsToCopy));
    console.log('Copied clips:', clipsToCopy.length);
  }, [clips, selectedClips]);

  const paste = useCallback(() => {
    try {
      const clipboardData = sessionStorage.getItem('pro-clipper-clipboard');
      if (!clipboardData) return;
      
      const clipsToPaste = JSON.parse(clipboardData);
      const newClips = clipsToPaste.map(clip => ({
        ...clip,
        id: Date.now().toString() + Math.random(),
        startTime: currentTime,
        endTime: currentTime + clip.duration
      }));
      
      const updatedClips = [...clips, ...newClips];
      setClips(updatedClips);
      
      // Save state
      projectState.saveState({
        file: activeFile?.name,
        clips: updatedClips,
        timeline: { zoom: zoomLevel, viewport: viewportStart }
      });
      
      console.log('Pasted clips:', newClips.length);
    } catch (error) {
      console.error('Failed to paste:', error);
    }
  }, [clips, currentTime, activeFile, zoomLevel, viewportStart, projectState]);

  const deleteSelected = useCallback(() => {
    if (selectedClips.size === 0) return;
    
    const updatedClips = clips.filter(clip => !selectedClips.has(clip.id));
    setClips(updatedClips);
    setSelectedClips(new Set());
    
    // Save state
    projectState.saveState({
      file: activeFile?.name,
      clips: updatedClips,
      timeline: { zoom: zoomLevel, viewport: viewportStart }
    });
    
    console.log('Deleted clips:', selectedClips.size);
  }, [clips, selectedClips, activeFile, zoomLevel, viewportStart, projectState]);

  const selectAll = useCallback(() => {
    const allClipIds = new Set(clips.map(clip => clip.id));
    setSelectedClips(allClipIds);
  }, [clips]);

  // Zoom and viewport controls
  const handleZoom = useCallback((newZoom) => {
    // Calculate minimum zoom to fit entire track (assuming 800px timeline width)
    const minZoomToFitAll = duration > 0 ? (800 / (duration * 100)) : 0.01;
    const clampedZoom = Math.max(minZoomToFitAll, Math.min(20, newZoom));
    setZoomLevel(clampedZoom);
  }, [duration]);

  // Add a "Fit All" zoom function
  const zoomToFit = useCallback(() => {
    if (duration > 0) {
      const fitZoom = 800 / (duration * 100); // Fit entire track in 800px
      setZoomLevel(Math.max(0.01, fitZoom));
      setViewportStart(0); // Reset to beginning
    }
  }, [duration]);

  const handleViewportChange = useCallback((newStart) => {
    const maxStart = Math.max(0, duration - (duration / zoomLevel));
    const clampedStart = Math.max(0, Math.min(newStart, maxStart));
    setViewportStart(clampedStart);
  }, [duration, zoomLevel]);

  // Time update from audio engine
  useEffect(() => {
    if (!audioEngine) return;
    
    const updateTime = (time) => {
      setCurrentTime(time);
      
      // Auto-follow playback: scroll timeline to keep playhead visible with lookahead
      if (isPlaying) {
        const viewportDuration = 800 / (100 * zoomLevel); // Calculate visible time range
        const lookaheadTime = Math.min(30, viewportDuration * 0.3); // 30 seconds or 30% of viewport
        const viewportEnd = viewportStart + viewportDuration;
        
        // Check if playhead is approaching the end of visible area
        if (time >= viewportEnd - lookaheadTime) {
          // Scroll forward to keep lookahead visible
          const newViewportStart = time - (viewportDuration * 0.2); // Keep playhead at 20% from left
          const maxViewportStart = Math.max(0, duration - viewportDuration);
          setViewportStart(Math.min(newViewportStart, maxViewportStart));
        }
        
        // Also handle case where playhead goes behind the visible area (seeking backward)
        if (time < viewportStart) {
          const newViewportStart = Math.max(0, time - (viewportDuration * 0.1)); // Keep playhead at 10% from left
          setViewportStart(newViewportStart);
        }
      }
      
      if (time >= duration) {
        setIsPlaying(false);
      }
    };
    
    audioEngine.onTimeUpdate = updateTime;
    
    return () => {
      audioEngine.onTimeUpdate = null;
    };
  }, [audioEngine, duration, isPlaying, zoomLevel, viewportStart]);

  // Keyboard shortcuts - defined after all functions
  useKeyboardShortcuts({
    onPlay: togglePlayback,
    onStop: stop,
    onCut: cut,
    onCopy: copy,
    onPaste: paste,
    onUndo: projectState.undo,
    onRedo: projectState.redo,
    onZoomIn: () => handleZoom(zoomLevel * 1.5),
    onZoomOut: () => handleZoom(zoomLevel / 1.5),
    onSelectAll: selectAll,
    onDelete: deleteSelected,
    onMarkIn: () => {
      if (currentTime !== null) {
        setSelectionStart(currentTime);
      }
    },
    onMarkOut: () => {
      if (currentTime !== null) {
        setSelectionEnd(currentTime);
      }
    }
  });

  // Render the main interface
  return (
    <div className="pro-audio-clipper">
      {/* Header Bar */}
      <div className="header-bar">
        <div className="header-left">
          <h1 className="app-title">
            <Scissors className="title-icon" />
            Pro Audio Clipper
          </h1>
          <div className="file-info">
            {activeFile ? (
              <span>{activeFile.name} • {activeFile.channels}ch • {activeFile.sampleRate}Hz</span>
            ) : (
              <span>No file loaded</span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <button
            className="header-btn"
            onClick={() => setShowProjectManager(true)}
            title="Project Manager"
          >
            <FolderOpen size={18} />
          </button>
          
          <button
            className="header-btn"
            onClick={() => setShowExportPanel(true)}
            title="Export"
          >
            <Download size={18} />
          </button>
          
          <button
            className="header-btn back-btn"
            onClick={() => onNavigate?.('library')}
            title="Back to Library"
          >
            ← Library
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Panel - Tools and File Loading */}
        <div className="left-panel">
          <div className="file-loader-section">
            <h3>Load Audio File</h3>
            <input
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileLoad(file);
                }
              }}
              className="file-input"
            />
            <div className="supported-formats">
              Supports: MP3, WAV, FLAC, OGG, M4A
            </div>
          </div>

          <ToolPanel
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            zoomLevel={zoomLevel}
            onZoomChange={handleZoom}
            onZoomToFit={zoomToFit}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
          />

          {/* Clips List */}
          <div className="clips-section">
            <div className="clips-header">
              <h3>Clips ({clips.length})</h3>
              <div className="clips-actions">
                <button
                  className="export-clips-btn"
                  onClick={() => setShowExportPanel(true)}
                  disabled={clips.length === 0}
                  title="Export Selected Clips"
                >
                  <Download size={16} />
                  Export Clips
                </button>
                <button
                  className="delete-clips-btn"
                  onClick={() => {
                    if (selectedClips.size > 0) {
                      const newClips = clips.filter(clip => !selectedClips.has(clip.id));
                      setClips(newClips);
                      setSelectedClips(new Set());
                    }
                  }}
                  disabled={selectedClips.size === 0}
                  title="Delete Selected Clips"
                >
                  <X size={16} />
                  Delete ({selectedClips.size})
                </button>
              </div>
            </div>
            <div className="clips-list">
              {clips.length === 0 ? (
                <div className="clips-help">
                  <h4>📋 How to Create & Export Clips:</h4>
                  <ol>
                    <li><strong>Load Audio:</strong> Click "Choose File" above</li>
                    <li><strong>Make Selection:</strong> Click and drag on waveform to mark in/out points</li>
                    <li><strong>Create Clip:</strong> Press <kbd>Enter</kbd> or use Razor tool</li>
                    <li><strong>Export:</strong> Select clips → Click "Export Clips" button above</li>
                  </ol>
                  <p><strong>💡 Quick Export:</strong> Make a selection and click main Export button (📥) in top toolbar!</p>
                </div>
              ) : (
                clips.map(clip => (
                  <div
                    key={clip.id}
                    className={`clip-item ${selectedClips.has(clip.id) ? 'selected' : ''}`}
                    onClick={(e) => {
                      if (e.ctrlKey) {
                        const newSelected = new Set(selectedClips);
                        if (newSelected.has(clip.id)) {
                          newSelected.delete(clip.id);
                        } else {
                          newSelected.add(clip.id);
                        }
                        setSelectedClips(newSelected);
                      } else {
                        setSelectedClips(new Set([clip.id]));
                      }
                    }}
                  >
                    <div className="clip-name">{clip.name}</div>
                    <div className="clip-time">
                      {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s
                    </div>
                    <div className="clip-duration">
                      Duration: {clip.duration.toFixed(2)}s
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Panel - Timeline */}
        <div className="center-panel">
          <TransportControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onPlayPause={togglePlayback}
            onStop={stop}
            onSeek={seek}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
          />

          <Timeline
            ref={timelineRef}
            audioBuffer={activeFile?.buffer}
            duration={duration}
            currentTime={currentTime}
            zoomLevel={zoomLevel}
            viewportStart={viewportStart}
            selectionStart={selectionStart}
            selectionEnd={selectionEnd}
            clips={clips}
            selectedClips={selectedClips}
            selectedTool={selectedTool}
            onTimelineClick={handleTimelineClick}
            onTimelineDrag={handleTimelineDrag}
            onViewportChange={handleViewportChange}
            onSeek={seek}
          />
        </div>
      </div>

      {/* Modals */}
      {showExportPanel && (
        <ExportPanel
          clips={selectionStart !== null && selectionEnd !== null ? 
            [{
              id: 'selection',
              name: `Selection_${selectionStart.toFixed(2)}s-${selectionEnd.toFixed(2)}s`,
              startTime: Math.min(selectionStart, selectionEnd),
              endTime: Math.max(selectionStart, selectionEnd),
              duration: Math.abs(selectionEnd - selectionStart)
            }, ...clips.filter(clip => selectedClips.size === 0 || selectedClips.has(clip.id))] :
            clips.filter(clip => selectedClips.size === 0 || selectedClips.has(clip.id))
          }
          audioBuffer={activeFile?.buffer}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {showProjectManager && (
        <ProjectManager
          currentProject={projectState.getCurrentState()}
          onLoadProject={(project) => {
            // Load project state
            setActiveFile(project.file);
            setClips(project.clips || []);
            setZoomLevel(project.timeline?.zoom || 1);
            setViewportStart(project.timeline?.viewport || 0);
          }}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ProAudioClipper;