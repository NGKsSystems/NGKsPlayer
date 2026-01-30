import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Download, Save, FolderOpen, Scissors, MousePointer, ZoomIn, ZoomOut, RotateCcw, RotateCw, X, Plus, Bookmark, RotateCw as Loop } from 'lucide-react';
import ProfessionalTimeline from './components/ProfessionalTimeline';
import TrackHeader from './components/TrackHeader';
import TransportControls from './components/TransportControls';
import NavigationControls from './components/NavigationControls';
import MarkerPanel from './components/MarkerPanel';
import ToolPanel from './components/ToolPanel';
import ExportPanel from './components/ExportPanel';
import ProjectManager from './components/ProjectManager';
import { useMultiTrackAudioEngine } from './hooks/useMultiTrackAudioEngine';
import { useTrackManager } from './hooks/useTrackManager';
import { useProjectState } from './hooks/useProjectState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useMarkers } from './hooks/useMarkers';
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
  const [showMarkerPanel, setShowMarkerPanel] = useState(false);
  
  // Custom hooks for multi-track functionality
  const multiTrackEngine = useMultiTrackAudioEngine();
  const trackManager = useTrackManager();
  const projectState = useProjectState();
  
  // Markers and Loop Regions
  const markersHook = useMarkers(duration);
  const {
    markers,
    loopRegions,
    selectedMarkerId,
    selectedLoopId,
    isLooping,
    activeLoopRegion,
    addMarker,
    removeMarker,
    updateMarker,
    moveMarker,
    setSelectedMarkerId,
    addLoopRegion,
    removeLoopRegion,
    updateLoopRegion,
    resizeLoopRegion,
    setSelectedLoopId,
    enableLoop,
    disableLoop,
    toggleLoop,
    jumpToMarker,
    jumpToNext,
    jumpToPrevious,
    exportMarkers,
    importMarkers,
    clearAll: clearAllMarkers
  } = markersHook;
  
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
    multiTrackEngine.setOnTimeUpdate((time) => {
      setCurrentTime(time);
      
      // Handle loop region playback
      if (isLooping && activeLoopRegion) {
        if (time >= activeLoopRegion.endTime) {
          multiTrackEngine.seekTracks(trackManager.tracks, activeLoopRegion.startTime);
        }
      }
    });
  }, [multiTrackEngine, isLooping, activeLoopRegion, trackManager.tracks]);

  // Update duration when tracks change
  useEffect(() => {
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
  }, [trackManager.tracks, multiTrackEngine]);

  // Update master volume
  useEffect(() => {
    multiTrackEngine.setMasterVolume(masterVolume);
  }, [masterVolume, multiTrackEngine]);

  // Audio file loading - creates new track with automatic clip
  const handleFileLoad = useCallback(async (file) => {
    try {
      const audioBuffer = await multiTrackEngine.loadAudioFile(file);
      
      // Create new track with loaded audio
      const newTrack = trackManager.createTrack(audioBuffer, file.name.replace(/\.[^/.]+$/, ''));
      
      // Automatically create a clip that spans the entire audio file
      const autoClip = {
        id: `clip_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        startTime: 0,
        endTime: audioBuffer.duration,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer,
        originalFile: file,
        created: Date.now()
      };
      
      // Add the clip to the track
      trackManager.addClipToTrack(newTrack.id, autoClip);
      
      // Update duration and reset playback
      const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
      setDuration(maxDuration);
      setCurrentTime(0);
      
      // Add to project history
      projectState.saveState({
        tracks: trackManager.tracks,
        timeline: { zoom: zoomLevel, viewport: viewportStart }
      });
      
      console.log('Audio file loaded to new track:', newTrack.name, 'with clip:', autoClip.name);
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

  // Marker navigation functions
  const handleJumpToMarker = useCallback((markerId) => {
    const time = jumpToMarker(markerId);
    if (time !== null) {
      seek(time);
    }
  }, [jumpToMarker, seek]);

  const handleJumpToNext = useCallback(() => {
    const time = jumpToNext(currentTime);
    if (time !== null) {
      seek(time);
    }
  }, [jumpToNext, currentTime, seek]);

  const handleJumpToPrevious = useCallback(() => {
    const time = jumpToPrevious(currentTime);
    if (time !== null) {
      seek(time);
    }
  }, [jumpToPrevious, currentTime, seek]);

  // Track management functions with undo/redo support
  const handleTrackSelect = useCallback((trackId) => {
    trackManager.setActiveTrackId(trackId);
  }, [trackManager]);

  const handleTrackMute = useCallback((trackId) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    // Create undo command for track property change
    const beforeState = { ...track };
    trackManager.toggleMute(trackId);
    const afterState = { ...trackManager.getTrack(trackId) };
    
    const command = CommandFactory.createStateSnapshotCommand(
      { tracks: [beforeState] },
      { tracks: [afterState] },
      `Toggle mute on ${track.name}`
    );
    
    executeCommand(command);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleTrackSolo = useCallback((trackId) => {
    const beforeState = trackManager.getState();
    trackManager.toggleSolo(trackId);
    const afterState = trackManager.getState();
    
    const command = CommandFactory.createStateSnapshotCommand(
      beforeState,
      afterState,
      `Toggle solo on track`
    );
    
    executeCommand(command);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleTrackVolumeChange = useCallback((trackId, volume) => {
    trackManager.setTrackVolume(trackId, volume);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Volume changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackPanChange = useCallback((trackId, pan) => {
    trackManager.setTrackPan(trackId, pan);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Pan changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackNameChange = useCallback((trackId, name) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    const command = CommandFactory.createStateSnapshotCommand(
      { track: { ...track } },
      { track: { ...track, name } },
      `Rename track to "${name}"`
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  const handleTrackDelete = useCallback((trackId) => {
    const track = trackManager.getTrack(trackId);
    if (!track) return;

    const command = CommandFactory.createTrackDeleteCommand(
      track,
      trackManager.tracks.findIndex(t => t.id === trackId)
    );
    
    executeCommand(command);
    
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
  }, [trackManager, multiTrackEngine, executeCommand, CommandFactory]);

  const handleAddTrack = useCallback(() => {
    const newTrack = trackManager.createTrack();
    
    const command = CommandFactory.createTrackCreateCommand(newTrack);
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  // Selection handling for multi-track timeline
  const handleTimelineSelection = useCallback((selection) => {
    setSelection(selection);
  }, []);

  // Cutting functionality - create clip on active track with undo support
  const createClipFromSelection = useCallback(() => {
    if (!selection || !trackManager.activeTrack) return;

    const clip = {
      id: `clip_${Date.now()}`,
      name: `Clip ${Date.now()}`,
      startTime: selection.startTime,
      endTime: selection.endTime,
      duration: selection.duration,
      created: Date.now()
    };

    const command = CommandFactory.createClipCreateCommand(clip, trackManager.activeTrackId);
    executeCommand(command);
    
    setSelection(null);
    console.log('Created clip:', clip.name, 'on track:', trackManager.activeTrack.name);
  }, [selection, trackManager, executeCommand, CommandFactory]);

  // Zoom and viewport controls
  const handleZoom = useCallback((newZoomLevel) => {
    const clampedZoom = Math.max(0.1, Math.min(20, newZoomLevel));
    setZoomLevel(clampedZoom);
  }, []);

  // Clip drag & drop handlers with undo support
  const handleClipMove = useCallback((clipId, fromTrackId, toTrackId, updatedClip) => {
    const clipData = trackManager.findClip(clipId);
    if (!clipData) return;

    const command = CommandFactory.createClipMoveCommand(
      clipId,
      fromTrackId,
      toTrackId,
      { startTime: clipData.clip.startTime, endTime: clipData.clip.endTime },
      { startTime: updatedClip.startTime, endTime: updatedClip.endTime }
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  const handleClipUpdate = useCallback((clipId, updatedClip) => {
    const clipData = trackManager.findClip(clipId);
    if (!clipData) return;

    const command = CommandFactory.createStateSnapshotCommand(
      { clip: { ...clipData.clip } },
      { clip: { ...clipData.clip, ...updatedClip } },
      `Update clip ${clipData.clip.name}`
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  const handleFileImport = useCallback(async (file, trackId, dropTime) => {
    try {
      const audioBuffer = await multiTrackEngine.loadAudioFile(file);
      const clip = {
        id: `clip_${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        startTime: dropTime,
        endTime: dropTime + audioBuffer.duration,
        duration: audioBuffer.duration,
        audioBuffer: audioBuffer,
        originalFile: file
      };
      
      const command = CommandFactory.createClipCreateCommand(clip, trackId);
      executeCommand(command);
    } catch (error) {
      console.error('Failed to import audio file:', error);
      alert('Failed to import audio file. Please check the file format.');
    }
  }, [multiTrackEngine, executeCommand, CommandFactory]);

  // Razor tool functionality with undo support
  const handleClipSplit = useCallback((clipId, splitTime) => {
    const clipData = trackManager.findClip(clipId);
    if (!clipData) return;

    const originalClip = clipData.clip;
    
    // Create command before splitting
    const firstClip = {
      ...originalClip,
      id: `${originalClip.id}_split1_${Date.now()}`,
      endTime: splitTime,
      duration: splitTime - originalClip.startTime
    };
    
    const secondClip = {
      ...originalClip,
      id: `${originalClip.id}_split2_${Date.now()}`,
      startTime: splitTime,
      duration: originalClip.endTime - splitTime,
      audioOffset: splitTime - originalClip.startTime
    };

    const command = CommandFactory.createClipSplitCommand(
      originalClip,
      splitTime,
      firstClip,
      secondClip
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

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

  // Keyboard shortcuts with undo/redo support
  useKeyboardShortcuts({
    onPlay: togglePlayback,
    onStop: stop,
    onCut: createClipFromSelection,
    onUndo: undo,
    onRedo: redo,
    onZoomIn: () => handleZoom(zoomLevel * 1.2),
    onZoomOut: () => handleZoom(zoomLevel / 1.2),
    onClearSelection: () => setSelection(null),
    onDelete: () => {
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
          {/* Undo/Redo Controls */}
          <div className="undo-redo-controls">
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`undo-btn ${canUndo ? 'active' : 'disabled'}`}
              title={canUndo ? `Undo: ${nextUndoDescription}` : 'Nothing to undo'}
            >
              <RotateCcw size={16} />
              Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`redo-btn ${canRedo ? 'active' : 'disabled'}`}
              title={canRedo ? `Redo: ${nextRedoDescription}` : 'Nothing to redo'}
            >
              <RotateCw size={16} />
              Redo
            </button>
          </div>
          
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
              <span>{((masterVolume || 1) * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Tool Panel */}
          <ToolPanel
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            zoomLevel={zoomLevel}
            onZoomChange={handleZoom}
            playbackRate={playbackRate}
            onPlaybackRateChange={setPlaybackRate}
          />
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

          {/* Undo/Redo Status Display */}
          {(canUndo || canRedo) && (
            <div className="undo-status">
              <div className="undo-status-content">
                {canUndo && (
                  <span className="undo-info">
                    ↩️ <strong>Ctrl+Z:</strong> {nextUndoDescription}
                  </span>
                )}
                {canRedo && (
                  <span className="redo-info">
                    ↪️ <strong>Ctrl+Y:</strong> {nextRedoDescription}
                  </span>
                )}
              </div>
            </div>
          )}

          <ProfessionalTimeline
            ref={timelineRef}
            tracks={trackManager.tracks}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            zoomLevel={zoomLevel}
            viewportStart={viewportStart}
            selectedTool={selectedTool}
            activeTrackId={trackManager.activeTrackId}
            onTimelineClick={seek}
            onClipSelect={handleTimelineSelection}
            onClipMove={handleClipMove}
            onClipSplit={handleClipSplit}
            onTrackSelect={trackManager.setActiveTrack}
            onTrackMute={trackManager.toggleMute}
            onTrackSolo={trackManager.toggleSolo}
            onTrackVolumeChange={trackManager.setTrackVolume}
            onTrackPanChange={trackManager.setTrackPan}
            onTrackNameChange={trackManager.setTrackName}
            onTrackDelete={trackManager.deleteTrack}
            onTrackMoveUp={trackManager.moveTrackUp}
            onTrackMoveDown={trackManager.moveTrackDown}
            className="timeline-container"
          />

          {/* Selection Info */}
          {selection && (
            <div className="selection-info">
              <span>Selection: {(selection?.startTime || 0).toFixed(2)}s - {(selection?.endTime || 0).toFixed(2)}s</span>
              <span>Duration: {(selection?.duration || 0).toFixed(2)}s</span>
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
          tracks={trackManager.tracks}
          duration={duration}
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