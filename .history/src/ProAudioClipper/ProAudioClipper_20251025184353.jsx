import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Download, Save, FolderOpen, Scissors, MousePointer, ZoomIn, ZoomOut, RotateCcw, RotateCw, X, Plus } from 'lucide-react';
import MultiTrackTimeline from './components/MultiTrackTimeline';
import TrackHeader from './components/TrackHeader';
import TransportControls from './components/TransportControls';
import ToolPanel from './components/ToolPanel';
import ExportPanel from './components/ExportPanel';
import ProjectManager from './components/ProjectManager';
import { useMultiTrackAudioEngine } from './hooks/useMultiTrackAudioEngine';
import { useTrackManager } from './hooks/useTrackManager';
import { useProjectState } from './hooks/useProjectState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUndoRedo } from './hooks/useUndoRedo';
import './ProAudioClipper.css';
import './components/TrackHeader.css';

/**
 * ProAudioClipper - Professional Multi-Track Audio Editing Component
 * 
 * Inspired by Adobe Premiere Pro and DaVinci Resolve for audio editing.
 * Features:
 * - Professional multi-track timeline with waveform visualization
 * - Individual track controls (mute, solo, volume, pan)
 * - Precision cutting tools (razor, selection)
 * - Real-time audio mixing and playback
 * - Multi-format export
 * - Project management with undo/redo
 * - Professional DAW-style interface
 */
const ProAudioClipper = ({ onNavigate }) => {
  // Refs
  const timelineRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Main application state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedTool, setSelectedTool] = useState('selection');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportStart, setViewportStart] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1.0);
  
  // Selection state
  const [selection, setSelection] = useState(null);
  
  // UI state
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  
  // Custom hooks for multi-track functionality
  const multiTrackEngine = useMultiTrackAudioEngine();
  const trackManager = useTrackManager();
  const projectState = useProjectState();
  
  // Professional Undo/Redo System
  const undoRedo = useUndoRedo(trackManager);
  const { 
    executeCommand, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    nextUndoDescription, 
    nextRedoDescription,
    CommandFactory 
  } = undoRedo;

  // Set up time updates for multi-track engine
  useEffect(() => {
    multiTrackEngine.setOnTimeUpdate(setCurrentTime);
  }, [multiTrackEngine]);

  // Update duration when tracks change
  useEffect(() => {
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
  }, [trackManager.tracks, multiTrackEngine]);

  // Update master volume
  useEffect(() => {
    multiTrackEngine.setMasterVolume(masterVolume);
  }, [masterVolume, multiTrackEngine]);

  // Audio file loading - creates new track
  const handleFileLoad = useCallback(async (file) => {
    try {
      const audioBuffer = await multiTrackEngine.loadAudioFile(file);
      
      // Create new track with loaded audio
      const newTrack = trackManager.createTrack(audioBuffer, file.name.replace(/\.[^/.]+$/, ''));
      
      // Update duration and reset playback
      const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
      setDuration(maxDuration);
      setCurrentTime(0);
      
      // Add to project history
      projectState.saveState({
        tracks: trackManager.tracks,
        timeline: { zoom: zoomLevel, viewport: viewportStart }
      });
      
      console.log('Audio file loaded to new track:', newTrack.name);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('Failed to load audio file. Please try a different format.');
    }
  }, [multiTrackEngine, trackManager, projectState, zoomLevel, viewportStart]);

  // Playback controls for multi-track
  const togglePlayback = useCallback(() => {
    if (trackManager.tracks.length === 0) return;
    
    if (isPlaying) {
      multiTrackEngine.pauseTracks();
      setIsPlaying(false);
    } else {
      multiTrackEngine.playTracks(trackManager.tracks, currentTime, playbackRate);
      setIsPlaying(true);
    }
  }, [trackManager.tracks, isPlaying, currentTime, playbackRate, multiTrackEngine]);

  const stop = useCallback(() => {
    multiTrackEngine.stopTracks();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [multiTrackEngine]);

  const seek = useCallback((time) => {
    multiTrackEngine.seekTracks(trackManager.tracks, time);
    if (!isPlaying) {
      setCurrentTime(time);
    }
  }, [multiTrackEngine, trackManager.tracks, isPlaying]);

  // Track management functions
  const handleTrackSelect = useCallback((trackId) => {
    trackManager.setActiveTrackId(trackId);
  }, [trackManager]);

  const handleTrackMute = useCallback((trackId) => {
    trackManager.toggleMute(trackId);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine]);

  const handleTrackSolo = useCallback((trackId) => {
    trackManager.toggleSolo(trackId);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine]);

  const handleTrackVolumeChange = useCallback((trackId, volume) => {
    trackManager.setTrackVolume(trackId, volume);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine]);

  const handleTrackPanChange = useCallback((trackId, pan) => {
    trackManager.setTrackPan(trackId, pan);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine]);

  const handleTrackNameChange = useCallback((trackId, name) => {
    trackManager.updateTrack(trackId, { name });
  }, [trackManager]);

  const handleTrackDelete = useCallback((trackId) => {
    trackManager.deleteTrack(trackId);
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
  }, [trackManager, multiTrackEngine]);

  const handleAddTrack = useCallback(() => {
    trackManager.createTrack();
  }, [trackManager]);

  // Selection handling for multi-track timeline
  const handleTimelineSelection = useCallback((selection) => {
    setSelection(selection);
  }, []);

  // Cutting functionality - create clip on active track
  const createClipFromSelection = useCallback(() => {
    if (!selection || !trackManager.activeTrack) return;

    const clip = {
      name: `Clip ${Date.now()}`,
      startTime: selection.startTime,
      endTime: selection.endTime,
      duration: selection.duration,
      created: Date.now()
    };

    trackManager.addClipToTrack(trackManager.activeTrackId, clip);
    setSelection(null);
    
    console.log('Created clip:', clip.name, 'on track:', trackManager.activeTrack.name);
  }, [selection, trackManager]);

  // Zoom and viewport controls
  const handleZoom = useCallback((newZoomLevel) => {
    const clampedZoom = Math.max(0.1, Math.min(20, newZoomLevel));
    setZoomLevel(clampedZoom);
  }, []);

  // Clip drag & drop handlers
  const handleClipMove = useCallback((clipId, fromTrackId, toTrackId, updatedClip) => {
    trackManager.moveClipToTrack(clipId, fromTrackId, toTrackId, updatedClip);
  }, [trackManager]);

  const handleClipUpdate = useCallback((clipId, updatedClip) => {
    trackManager.updateClip(clipId, updatedClip);
  }, [trackManager]);

  const handleFileImport = useCallback(async (file, trackId, dropTime) => {
    try {
      const audioBuffer = await multiTrackEngine.loadAudioFile(file);
      const clip = {
        id: `clip_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        startTime: dropTime,
        endTime: dropTime + audioBuffer.duration,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer,
        originalFile: file
      };
      
      trackManager.addClipToTrack(trackId, clip);
    } catch (error) {
      console.error('Failed to import audio file:', error);
      alert('Failed to import audio file. Please check the file format.');
    }
  }, [multiTrackEngine, trackManager]);

  // Razor tool functionality
  const handleClipSplit = useCallback((clipId, splitTime) => {
    trackManager.splitClip(clipId, splitTime);
  }, [trackManager]);

  // Auto-follow playback (keep playhead visible)
  useEffect(() => {
    if (isPlaying) {
      const viewportDuration = 1000 / (100 * zoomLevel); // Visible duration in seconds
      const followMargin = viewportDuration * 0.2; // Start following when 20% from edge
      
      if (currentTime > viewportStart + viewportDuration - followMargin) {
        setViewportStart(currentTime - followMargin);
      }
    }
  }, [isPlaying, currentTime, viewportStart, zoomLevel]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    ' ': togglePlayback,
    'Enter': createClipFromSelection,
    'Escape': () => setSelection(null),
    'Delete': () => {
      if (trackManager.activeTrackId && trackManager.tracks.length > 1) {
        handleTrackDelete(trackManager.activeTrackId);
      }
    }
  });

  return (
    <div className="pro-audio-clipper">
      {/* Header Bar */}
      <div className="header-bar">
        <div className="header-section">
          <button 
            onClick={() => onNavigate?.('home')}
            className="back-btn"
            title="Back to Home"
          >
            ← Back
          </button>
          <h1>Pro Audio Clipper</h1>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setShowProjectManager(true)}
            className="header-btn"
            title="Project Manager"
          >
            <FolderOpen size={16} />
            Project
          </button>
          <button
            onClick={() => setShowExportPanel(true)}
            className="header-btn"
            title="Export"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left Panel - Track Headers */}
        <div className="left-panel">
          {/* File Import */}
          <div className="import-section">
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleFileLoad(file);
                }
              }}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="import-btn"
            >
              <Plus size={16} />
              Add Audio Track
            </button>
          </div>

          {/* Track Headers */}
          <div className="tracks-container">
            {trackManager.tracks.map((track, index) => (
              <TrackHeader
                key={track.id}
                track={track}
                isActive={trackManager.activeTrackId === track.id}
                onSelect={handleTrackSelect}
                onMute={handleTrackMute}
                onSolo={handleTrackSolo}
                onVolumeChange={handleTrackVolumeChange}
                onPanChange={handleTrackPanChange}
                onNameChange={handleTrackNameChange}
                onDelete={handleTrackDelete}
                onMoveUp={() => trackManager.reorderTracks(index, index - 1)}
                onMoveDown={() => trackManager.reorderTracks(index, index + 1)}
                canMoveUp={index > 0}
                canMoveDown={index < trackManager.tracks.length - 1}
                style={{ height: '80px' }}
              />
            ))}
            
            {trackManager.tracks.length === 0 && (
              <div className="no-tracks">
                <p>No tracks yet. Add an audio file to get started.</p>
              </div>
            )}
          </div>

          {/* Master Controls */}
          <div className="master-controls">
            <h3>Master</h3>
            <div className="master-volume">
              <label>Volume</label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={masterVolume}
                onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                className="master-volume-slider"
              />
              <span>{(masterVolume * 100).toFixed(0)}%</span>
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

          <ToolPanel
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            zoomLevel={zoomLevel}
            onZoomChange={handleZoom}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
          />

          <MultiTrackTimeline
            ref={timelineRef}
            tracks={trackManager.tracks}
            currentTime={currentTime}
            isPlaying={isPlaying}
            zoomLevel={zoomLevel}
            viewportStart={viewportStart}
            onSeek={seek}
            onSelectionChange={handleTimelineSelection}
            onClipMove={handleClipMove}
            onClipUpdate={handleClipUpdate}
            onClipSplit={handleClipSplit}
            onFileImport={handleFileImport}
            selectedTool={selectedTool}
            className="timeline-container"
          />

          {/* Selection Info */}
          {selection && (
            <div className="selection-info">
              <span>Selection: {selection.startTime.toFixed(2)}s - {selection.endTime.toFixed(2)}s</span>
              <span>Duration: {selection.duration.toFixed(2)}s</span>
              <button onClick={createClipFromSelection} className="create-clip-btn">
                <Scissors size={14} />
                Create Clip
              </button>
              <button onClick={() => setSelection(null)} className="clear-selection-btn">
                <X size={14} />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showExportPanel && (
        <ExportPanel
          audioBuffer={trackManager.activeTrack?.audioBuffer}
          clips={trackManager.getAllClips()}
          onClose={() => setShowExportPanel(false)}
        />
      )}

      {showProjectManager && (
        <ProjectManager
          onClose={() => setShowProjectManager(false)}
          projectState={projectState}
        />
      )}
    </div>
  );
};

export default ProAudioClipper;