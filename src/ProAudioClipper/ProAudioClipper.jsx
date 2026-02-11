/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProAudioClipper.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Download, Save, FolderOpen, Scissors, MousePointer, ZoomIn, ZoomOut, RotateCcw, RotateCw, X, Plus, Trash2 } from 'lucide-react';
import ProfessionalTimeline from './components/ProfessionalTimeline';
import TransportControls from './components/TransportControls';
import ExportPanel from './components/ExportPanel';
import ProjectManager from './components/ProjectManager';
import TrackEffectsPanel from './components/TrackEffectsPanel';
import AudioAnalysisDashboard from './components/analysis/AudioAnalysisDashboard';
import StemExtractor from './Components/StemExtractor';
import WhisperTranscriber from './Components/WhisperTranscriber';
import KaraokeDisplay from './components/KaraokeDisplay';
import VisualDisplay from '../components/VisualDisplay';
import VisualDisplaySettings from '../components/VisualDisplaySettings';
import AutomationDashboard from '../components/AutomationDashboard';
import RoutingDashboard from '../components/RoutingDashboard';
import TimeStretchInterface from '../components/TimeStretchInterface';
import ExportMasteringInterface from '../components/ExportMasteringInterface';
import MIDIIntegrationInterface from '../components/MIDIIntegrationInterface';
import CloudCollaborationInterface from '../components/CloudCollaborationInterface';
import HelpInterface from '../components/HelpInterface';
import ProfessionalFXController from '../components/ProfessionalFXController';
import AdvancedAudioFXEngine from '../audio/AdvancedAudioFXEngine';
import { useMultiTrackAudioEngine } from './hooks/useMultiTrackAudioEngine';
import { useTrackManager } from './hooks/useTrackManager';
import { useProjectState } from './hooks/useProjectState';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useUndoRedoController } from './hooks/useUndoRedoController';
import { useTransportController } from './hooks/useTransportController';
import { useTrackController } from './hooks/useTrackController';
// import './ProAudioClipper.css';
import './components/TrackEffectsPanel.css';

/**
 * Generate SRT subtitle file from Whisper transcription
 */
const generateSRT = (transcription) => {
  if (!transcription.segments || transcription.segments.length === 0) {
    return '';
  }
  
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  };
  
  let srt = '';
  transcription.segments.forEach((segment, index) => {
    srt += `${index + 1}\n`;
    srt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
    srt += `${segment.text.trim()}\n\n`;
  });
  
  return srt;
};

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
  const [autoScroll, setAutoScroll] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [masterVolume, setMasterVolume] = useState(1.0);
  
  // Selection state
  const [selection, setSelection] = useState(null);
  
  // UI state
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [effectsPanelTrackId, setEffectsPanelTrackId] = useState(null);
  const [showAnalysisDashboard, setShowAnalysisDashboard] = useState(false);
  const [showAutomationDashboard, setShowAutomationDashboard] = useState(false);
  const [showRoutingDashboard, setShowRoutingDashboard] = useState(false);
  const [showTimeStretchDashboard, setShowTimeStretchDashboard] = useState(false);
  const [showExportMasteringInterface, setShowExportMasteringInterface] = useState(false);
  const [showMIDIInterface, setShowMIDIInterface] = useState(false);
  const [showCloudInterface, setShowCloudInterface] = useState(false);
  const [showHelpInterface, setShowHelpInterface] = useState(false);
  const [showFXController, setShowFXController] = useState(false);
  const [showStemExtractor, setShowStemExtractor] = useState(false);
  const [showWhisperTranscriber, setShowWhisperTranscriber] = useState(false);
  const [showKaraokeDisplay, setShowKaraokeDisplay] = useState(false);
  const [showVisualDisplay, setShowVisualDisplay] = useState(false);
  const [showVisualSettings, setShowVisualSettings] = useState(false);
  const [visualSettings, setVisualSettings] = useState(null);
  const [currentAudioFile, setCurrentAudioFile] = useState(null);
  const [currentAlbumArt, setCurrentAlbumArt] = useState(null);
  const [currentMetadata, setCurrentMetadata] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [transcriptionResults, setTranscriptionResults] = useState(null);
  const [extractingStemsForTrack, setExtractingStemsForTrack] = useState(null);
  
  // FX Engine
  const [fxEngine, setFxEngine] = useState(null);
  const [currentBPM, setCurrentBPM] = useState(128);
  
  // Custom hooks for multi-track functionality
  const multiTrackEngine = useMultiTrackAudioEngine();
  const trackManager = useTrackManager();
  const projectState = useProjectState();
  
  // Handle project loading from templates (moved after projectState initialization)
  const handleLoadProject = useCallback((project) => {
    console.log('Loading project:', project);
    setCurrentProject({ ...project });
    
    // Apply timeline settings if provided
    if (project.timeline) {
      if (project.timeline.zoom) {
        console.log('Setting zoom level from project to:', project.timeline.zoom);
        setZoomLevel(project.timeline.zoom);
      }
      if (project.timeline.viewport) {
        console.log('Setting viewport start from project to:', project.timeline.viewport);
        setViewportStart(project.timeline.viewport);
      }
    }
    
    // Save to project history 
    projectState.saveState({
      type: 'project_loaded',
      project: project,
      timeline: { zoom: zoomLevel, viewport: viewportStart },
      tracks: trackManager.tracks.map(t => ({ ...t, clips: t.clips }))
    });
    
    console.log('Project loaded successfully:', project.name);
  }, [projectState, zoomLevel, viewportStart, trackManager.tracks, setZoomLevel, setViewportStart]);
  
  // Professional Undo/Redo System (extracted to useUndoRedoController)
  const { 
    executeCommand, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    nextUndoDescription, 
    nextRedoDescription,
    CommandFactory 
  } = useUndoRedoController({ trackManager });

  // Initialize FX Engine
  useEffect(() => {
    const initFXEngine = async () => {
      try {
        if (multiTrackEngine.audioContext) {
          console.log('🎛️ Initializing Professional FX Engine...');
          const engine = new AdvancedAudioFXEngine(multiTrackEngine.audioContext);
          
          // Connect FX engine to audio path (defensive: use known properties)
          try {
            if (multiTrackEngine.masterGain && engine && engine.input) {
              multiTrackEngine.masterGain.connect(engine.input);
            } else {
              console.warn('ProAudioClipper: missing masterGain or engine.input — skipping connect to engine input');
            }

            if (engine && engine.output && multiTrackEngine?.audioContext?.destination) {
              engine.output.connect(multiTrackEngine.audioContext.destination);
            } else {
              console.warn('ProAudioClipper: missing engine.output or audioContext.destination — skipping connect to destination');
            }
          } catch (e) {
            console.error('ProAudioClipper: failed to wire FX engine safely:', e);
          }
          
          // TODO: FX chains feature not fully implemented yet
          // Create FX chains for each track
          // for (let i = 1; i <= 4; i++) {
          //   engine.createEffectChain(`track_${i}`);
          // }
          // engine.createEffectChain('master');
          
          setFxEngine(engine);
          console.log('✅ FX Engine initialized successfully');
        }
      } catch (error) {
        console.error('❌ Failed to initialize FX Engine:', error);
      }
    };

    if (multiTrackEngine.audioContext) {
      initFXEngine();
    }
  }, [multiTrackEngine.audioContext]);

  // Set up time updates for multi-track engine
  useEffect(() => {
    multiTrackEngine.setOnTimeUpdate((time) => {
      setCurrentTime(time);
      
      // Update BPM detection (simplified for demo)
      if (trackManager.tracks.length > 0) {
        const activeTrack = trackManager.tracks.find(t => !t.muted);
        if (activeTrack?.bpm) {
          setCurrentBPM(activeTrack.bpm);
        }
      }
    });
    
    // Debounce track parameter updates to reduce overhead
    const debouncedUpdate = () => {
      if (!isPlaying) {
        multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
      }
    };
    
    debouncedUpdate();
  }, [multiTrackEngine, trackManager.tracks, isPlaying]);

  // Update duration when tracks change (debounced for performance)
  useEffect(() => {
    const updateDuration = () => {
      const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
      if (maxDuration !== duration) {
        setDuration(maxDuration);
      }
    };
    
    // Small delay to batch multiple track changes
    const timeoutId = setTimeout(updateDuration, 10);
    
    return () => clearTimeout(timeoutId);
  }, [trackManager.tracks, multiTrackEngine, duration]);

  // Update master volume
  useEffect(() => {
    multiTrackEngine.setMasterVolume(masterVolume);
  }, [masterVolume, multiTrackEngine]);

  // Handle right-click context menu
  const handleTrackContextMenu = useCallback((event, trackId) => {
    event.preventDefault();
    const track = trackManager.tracks.find(t => t.id === trackId);
    if (!track) return;
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      trackId: trackId,
      trackName: track.name,
      filePath: track.clips[0]?.originalFile?.path // Get file path from first clip
    });
  }, [trackManager.tracks]);

  // Handle stem extraction from context menu
  const handleExtractStems = useCallback(async (trackId, filePath) => {
    setContextMenu(null);
    
    if (!filePath) {
      alert('No source file available for stem extraction');
      return;
    }
    
    setExtractingStemsForTrack(trackId);
    setCurrentAudioFile(filePath);
    setShowStemExtractor(true);
  }, []);

  // Load stems after extraction completes
  const handleStemsExtracted = useCallback(async (stems) => {
    setShowStemExtractor(false);
    
    if (!stems || Object.keys(stems).length === 0) {
      alert('No stems were extracted');
      return;
    }
    
    // Load each stem as a new track
    const stemOrder = ['vocals', 'drums', 'bass', 'other'];
    for (const stemName of stemOrder) {
      if (stems[stemName]) {
        try {
          const response = await fetch(`file://${stems[stemName]}`);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await multiTrackEngine.audioContext.decodeAudioData(arrayBuffer);
          
          // Create track with stem name
          const stemTrack = trackManager.createTrack(audioBuffer, stemName.toUpperCase());
          
          // Create clip spanning entire stem
          const stemClip = {
            id: `clip_${Date.now()}_${stemName}`,
            name: stemName.toUpperCase(),
            startTime: 0,
            endTime: audioBuffer.duration,
            duration: audioBuffer.duration,
            audioBuffer: audioBuffer,
            created: Date.now()
          };
          
          trackManager.addClipToTrack(stemTrack.id, stemClip);
          
          // Small delay between tracks to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to load ${stemName} stem:`, error);
        }
      }
    }
    
    // Update duration
    const maxDuration = multiTrackEngine.getMaxDuration(trackManager.tracks);
    setDuration(maxDuration);
    setCurrentTime(0);
    
    setExtractingStemsForTrack(null);
    
    // Close the stem extractor modal
    setShowStemExtractor(false);
    setContextMenu(null);
    
    alert(`✅ All stems loaded! Use Solo/Mute buttons to control playback.`);
  }, [multiTrackEngine, trackManager]);

  // Audio file loading - creates new track with automatic clip
  const handleFileLoad = useCallback(async (file) => {
    try {
      // Store file path for stem extraction
      setCurrentAudioFile(file.path || file.name);
      
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
      
      console.log('Audio file loaded to new track:', newTrack.name);
    } catch (error) {
      console.error('Failed to load audio file:', error);
      alert('Failed to load audio file. Please try a different format.');
    }
  }, [multiTrackEngine, trackManager, projectState, zoomLevel, viewportStart]);

  // Transport (extracted to useTransportController)
  const { togglePlayback, stop, seek } = useTransportController({
    multiTrackEngine,
    trackManager,
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    playbackRate
  });

  // Track + FX handlers (extracted to useTrackController)
  const trackController = useTrackController({
    trackManager,
    multiTrackEngine,
    executeCommand,
    CommandFactory,
    fxEngine,
    setDuration,
    setCurrentTime,
    setCurrentAudioFile,
    fileInputRef
  });

  // Effects panel management
  const handleOpenEffectsPanel = useCallback((trackId) => {
    setEffectsPanelTrackId(trackId);
    setShowEffectsPanel(true);
  }, []);

  const handleCloseEffectsPanel = useCallback(() => {
    setShowEffectsPanel(false);
    setEffectsPanelTrackId(null);
  }, []);

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

  // Zoom and viewport controls with proper synchronization
  const handleZoom = useCallback((newZoomLevel) => {
    console.log('handleZoom called with:', newZoomLevel, 'current zoomLevel:', zoomLevel);
    
    const clampedZoom = Math.max(0.1, Math.min(20, newZoomLevel));
    console.log('Clamped zoom level:', clampedZoom);
    
    // Zoom centered on the playhead position (currentTime) to keep it in sync
    const viewportWidth = 800; // Approximate timeline width in pixels
    const pixelsPerSecond = 50;
    
    // Calculate where the playhead is relative to the current viewport
    const playheadPixelPosition = (currentTime - viewportStart) * pixelsPerSecond * zoomLevel;
    
    // Calculate new viewport to keep playhead at the same pixel position
    const newViewportDuration = viewportWidth / (pixelsPerSecond * clampedZoom);
    const playheadRelativePosition = playheadPixelPosition / viewportWidth; // 0 to 1
    const newViewportStart = Math.max(0, Math.min(
      duration - newViewportDuration,
      currentTime - (playheadRelativePosition * newViewportDuration)
    ));
    
    console.log('Setting zoom level to:', clampedZoom, 'viewport start to:', newViewportStart);
    setZoomLevel(clampedZoom);
    setViewportStart(newViewportStart);
  }, [zoomLevel, viewportStart, duration, currentTime]);

  // Viewport change handler
  const handleViewportChange = useCallback((newStart) => {
    const viewportWidth = 800;
    const pixelsPerSecond = 50;
    const maxViewportDuration = viewportWidth / (pixelsPerSecond * zoomLevel);
    const maxStart = Math.max(0, duration - maxViewportDuration);
    const clampedStart = Math.max(0, Math.min(newStart, maxStart));
    setViewportStart(clampedStart);
  }, [duration, zoomLevel]);

  // Auto-scroll toggle handler
  const handleAutoScrollToggle = useCallback(() => {
    setAutoScroll(prev => !prev);
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
      duration: splitTime - originalClip.startTime,
      audioOffset: originalClip.audioOffset || 0  // Preserve existing audioOffset
    };
    
    const secondClip = {
      ...originalClip,
      id: `${originalClip.id}_split2_${Date.now()}`,
      startTime: splitTime,
      duration: originalClip.endTime - splitTime,
      audioOffset: (originalClip.audioOffset || 0) + (splitTime - originalClip.startTime)  // Add to existing audioOffset
    };

    const command = CommandFactory.createClipSplitCommand(
      originalClip,
      splitTime,
      firstClip,
      secondClip
    );
    
    executeCommand(command);
  }, [trackManager, executeCommand, CommandFactory]);

  // Auto-follow playback (keep playhead visible) - Enhanced for per-track speeds with reduced CPU overhead
  useEffect(() => {
    if (isPlaying && autoScroll) {
      const viewportDuration = 1000 / (100 * zoomLevel); // Visible duration in seconds
      const followMargin = viewportDuration * 0.2; // Start following when 20% from edge
      
      // Check if any tracks have non-standard playback rates
      const hasVariableSpeed = trackManager.tracks.some(track => 
        track.playbackRate && track.playbackRate !== 1.0
      );
      
      // If tracks have different speeds, use a more conservative follow approach
      // to reduce flickering caused by conflicting playback rates
      if (hasVariableSpeed) {
        // Only scroll when playhead is significantly outside the viewport
        const conservativeMargin = viewportDuration * 0.1; // Smaller margin = less aggressive
        if (currentTime > viewportStart + viewportDuration - conservativeMargin ||
            currentTime < viewportStart + conservativeMargin) {
          // Use requestAnimationFrame for smoother scrolling
          requestAnimationFrame(() => {
            setViewportStart(currentTime - viewportDuration * 0.3);
          });
        }
      } else {
        // Standard follow behavior when all tracks are at normal speed
        if (currentTime > viewportStart + viewportDuration - followMargin) {
          requestAnimationFrame(() => {
            setViewportStart(currentTime - followMargin);
          });
        }
      }
    }
  }, [isPlaying, currentTime, viewportStart, zoomLevel, trackManager.tracks, autoScroll]);

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
        trackController.handleTrackDelete(trackManager.activeTrackId);
      }
    },
    onHelp: () => setShowHelpInterface(true)
  });

  return (
    <div 
      className="pro-audio-clipper"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#1a1a1a',
        color: '#ffffff',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        overflow: 'hidden'
      }}
    >
      {/* Header Bar */}
      {/* Hidden file input for track imports */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={(e) => {
          const files = Array.from(e.target.files);
          if (files.length > 0) {
            files.forEach(file => {
              handleFileLoad(file);
            });
          }
        }}
        style={{ display: 'none' }}
      />
      <div 
        className="header-bar"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#2a2a2a',
          borderBottom: '1px solid #404040',
          height: '60px',
          flexShrink: 0
        }}
      >
        <div 
          className="header-section"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: 1
          }}
        >
          <button 
            onClick={() => onNavigate?.('home')}
            className="back-btn"
            title="Back to Home"
            style={{
              padding: '8px 12px',
              background: '#404040',
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            ← Back
          </button>
          <h1>Pro Audio Clipper</h1>
        </div>
        
        <div 
          className="header-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* Undo/Redo Controls */}
          <div 
            className="undo-redo-controls"
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}
          >
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
            onClick={trackController.handleClearAllTracks}
            className="header-btn"
            title="Clear All Tracks"
            style={{
              background: trackManager.tracks.length > 0 ? 'linear-gradient(145deg, #e74c3c, #c0392b)' : undefined,
              borderColor: trackManager.tracks.length > 0 ? '#e74c3c' : undefined
            }}
            disabled={trackManager.tracks.length === 0}
          >
            <Trash2 size={16} />
            Clear All
          </button>
          <button
            onClick={() => setShowExportPanel(true)}
            className="header-btn"
            title="Export"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => {
              if (currentAudioFile) {
                setShowStemExtractor(true);
              } else {
                alert('Please load an audio file first');
              }
            }}
            className="header-btn"
            title="Extract Stems (Vocals, Drums, Bass, Other)"
            style={{
              background: showStemExtractor ? '#4CAF50' : 'linear-gradient(145deg, #4CAF50, #45a049)',
              borderColor: '#66bb6a'
            }}
          >
            🎵 Extract Stems
          </button>
          <button
            onClick={() => {
              if (currentAudioFile) {
                setShowWhisperTranscriber(true);
              } else {
                alert('Please load an audio file first');
              }
            }}
            className="header-btn"
            title="Transcribe Audio to Text with AI (Karaoke Lyrics)"
            style={{
              background: showWhisperTranscriber ? '#2196F3' : 'linear-gradient(145deg, #2196F3, #1976D2)',
              borderColor: '#42A5F5'
            }}
          >
            🎤 Transcribe
          </button>
          <button
            onClick={() => {
              if (transcriptionResults) {
                setShowKaraokeDisplay(true);
              } else {
                alert('Please transcribe audio first to enable Karaoke mode');
              }
            }}
            className="header-btn"
            title="Karaoke Display - Synchronized Lyrics with Album Art"
            style={{
              background: showKaraokeDisplay ? '#E91E63' : 'linear-gradient(145deg, #E91E63, #C2185B)',
              borderColor: '#F06292'
            }}
          >
            🎬 Karaoke
          </button>
          <button
            onClick={() => {
              // Open settings first, then display
              setShowVisualSettings(true);
            }}
            className="header-btn"
            title="Visual Display - Album Art, Track Info & Custom Visuals for DJs"
            style={{
              background: showVisualDisplay ? '#9C27B0' : 'linear-gradient(145deg, #9C27B0, #7B1FA2)',
              borderColor: '#BA68C8'
            }}
          >
            🎨 Visuals
          </button>
          <button
            onClick={() => setShowAnalysisDashboard(true)}
            className="header-btn"
            title="Audio Analysis Dashboard"
            style={{
              background: showAnalysisDashboard ? '#4CAF50' : undefined
            }}
          >
            📊 Analysis
          </button>
          <button
            onClick={() => setShowAutomationDashboard(true)}
            className="header-btn"
            title="Professional Automation System"
            style={{
              background: showAutomationDashboard ? '#4CAF50' : undefined
            }}
          >
            🎛️ Automation
          </button>
          <button
            onClick={() => setShowRoutingDashboard(true)}
            className="header-btn"
            title="Professional Routing System"
            style={{
              background: showRoutingDashboard ? '#4CAF50' : undefined
            }}
          >
            🔀 Routing
          </button>
          <button
            onClick={() => setShowTimeStretchDashboard(true)}
            className="header-btn"
            title="Professional Time Stretching & Pitch Correction"
            style={{
              background: showTimeStretchDashboard ? '#4CAF50' : undefined
            }}
          >
            🎵 Time/Pitch
          </button>
          <button
            onClick={() => setShowExportMasteringInterface(true)}
            className="header-btn"
            title="Professional Export & Mastering Suite"
            style={{
              background: showExportMasteringInterface ? '#FF9800' : undefined
            }}
          >
            📦 Export/Master
          </button>
          <button
            onClick={() => setShowMIDIInterface(true)}
            className="header-btn"
            title="Professional MIDI Integration Suite"
            style={{
              background: showMIDIInterface ? '#9C27B0' : undefined
            }}
          >
            🎹 MIDI
          </button>
          <button
            onClick={() => setShowCloudInterface(true)}
            className="header-btn"
            title="Cloud Integration & Collaboration"
            style={{
              background: showCloudInterface ? '#2196F3' : undefined
            }}
          >
            ☁️ Cloud
          </button>
          <button
            onClick={() => setShowHelpInterface(true)}
            className="header-btn"
            title="Professional Quick Reference Guide (F1)"
            style={{
              background: showHelpInterface ? '#FF9800' : undefined
            }}
          >
            ❓ Help
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div 
        className="main-layout"
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}
      >

        {/* Left Panel - Effects Sidebar */}
        <div
          className="effects-sidebar"
          style={{
            width: '320px',
            minWidth: '320px',
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid #404040',
            background: '#1e1e1e',
            overflow: 'hidden'
          }}
        >
          {trackManager.tracks.length > 0 ? (
            <TrackEffectsPanel
              trackId={effectsPanelTrackId || trackManager.activeTrackId || trackManager.tracks[0]?.id}
              trackName={
                trackManager.tracks.find(t => t.id === (effectsPanelTrackId || trackManager.activeTrackId || trackManager.tracks[0]?.id))?.name || 
                'Track 1'
              }
              effectsEngine={multiTrackEngine.effectsEngine}
              onClose={handleCloseEffectsPanel}
            />
          ) : (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#888',
              fontSize: '14px'
            }}>
              <h3 style={{ color: '#00d4ff', marginBottom: '16px' }}>Effects Panel</h3>
              <p style={{ color: '#ff6b35', marginTop: '12px' }}>No tracks yet.<br/>Add an audio track to start!</p>
            </div>
          )}
        </div>

        {/* Center Panel - Timeline */}
        <div 
          className="center-panel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#1e1e1e'
          }}
        >
          <div 
            style={{
              padding: '16px',
              background: '#252525',
              borderBottom: '1px solid #404040',
              flexShrink: 0
            }}
          >
            {/* Project Status Header */}
            {currentProject && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
                padding: '8px 12px',
                background: 'rgba(0, 212, 255, 0.1)',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#00d4ff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📋</span>
                  <strong>{currentProject.name}</strong>
                  <span style={{ opacity: 0.7, fontSize: '12px' }}>
                    • Zoom: {Math.round(zoomLevel * 100)}% • {currentProject.settings?.sampleRate || 44100}Hz
                  </span>
                </div>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>
                  Template Applied ✓
                </span>
              </div>
            )}
            
            <TransportControls
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onPlayPause={togglePlayback}
              onStop={stop}
              onSeek={seek}
              playbackRate={playbackRate}
              onPlaybackRateChange={setPlaybackRate}
              autoScroll={autoScroll}
              onAutoScrollToggle={handleAutoScrollToggle}
              masterVolume={masterVolume}
              onMasterVolumeChange={setMasterVolume}
            />
          </div>

          {/* Professional Navigation Controls */}


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

          <div 
            style={{
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <ProfessionalTimeline
            ref={timelineRef}
            tracks={trackManager.tracks}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            zoomLevel={zoomLevel}
            viewportStart={viewportStart}
            selectedTool={selectedTool}
            onToolChange={setSelectedTool}
            onZoomChange={handleZoom}
            activeTrackId={trackManager.activeTrackId}
            onTimelineClick={seek}
            onClipSelect={handleTimelineSelection}
            onClipMove={handleClipMove}
            onClipSplit={handleClipSplit}
            onClipDelete={trackManager.removeClip}
            onTrackSelect={trackManager.setActiveTrack}
            onTrackMute={trackManager.toggleMute}
            onTrackSolo={trackManager.toggleSolo}
            onTrackVolumeChange={trackManager.setTrackVolume}
            onTrackPanChange={trackManager.setTrackPan}
            onTrackPlaybackRateChange={trackManager.setTrackPlaybackRate}
            onTrackReverseToggle={trackManager.toggleTrackReverse}
            onTrackNameChange={trackManager.setTrackName}
            onTrackDelete={trackManager.deleteTrack}
            onTrackMoveUp={trackManager.moveTrackUp}
            onTrackMoveDown={trackManager.moveTrackDown}
            onAddTrack={trackController.handleAddTrackWithFile}
            onOpenEffects={handleOpenEffectsPanel}
            onViewportChange={handleViewportChange}
            onTrackContextMenu={handleTrackContextMenu}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            nextUndoDescription={nextUndoDescription}
            nextRedoDescription={nextRedoDescription}
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
          currentProject={currentProject}
          onLoadProject={handleLoadProject}
          onClose={() => setShowProjectManager(false)}
        />
      )}

      {showAnalysisDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            padding: 0,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #444'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 20px',
              borderBottom: '1px solid #444',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '16px'
              }}>
                🎯 Professional Audio Analysis Suite
              </h2>
              <button
                onClick={() => setShowAnalysisDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Analysis Dashboard"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <AudioAnalysisDashboard audioEngine={multiTrackEngine} />
            </div>
          </div>
        </div>
      )}

      {showAutomationDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            padding: 0,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #444'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 20px',
              borderBottom: '1px solid #444',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '16px'
              }}>
                🎛️ Professional Automation System
              </h2>
              <button
                onClick={() => setShowAutomationDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Automation Dashboard"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <AutomationDashboard 
                audioContext={multiTrackEngine.audioContext}
                effects={multiTrackEngine.effectsEngine}
                mixingConsole={multiTrackEngine.mixingConsole}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onTimeChange={setCurrentTime}
                onParameterChange={(parameterId, value) => {
                  // Handle parameter changes from automation
                  console.log('Automation parameter change:', parameterId, value);
                  // TODO: Apply to actual audio parameters
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showRoutingDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1e1e1e',
            borderRadius: '8px',
            padding: 0,
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid #444'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '15px 20px',
              borderBottom: '1px solid #444',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#ffffff',
                fontSize: '16px'
              }}>
                🔀 Professional Routing System
              </h2>
              <button
                onClick={() => setShowRoutingDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Routing Dashboard"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px' }}>
              <RoutingDashboard 
                audioContext={multiTrackEngine.audioContext}
                onParameterChange={(parameterId, value) => {
                  // Handle parameter changes from routing
                  console.log('Routing parameter change:', parameterId, value);
                  // TODO: Apply to actual audio parameters
                }}
              />
            </div>
          </div>
        </div>
      )}

      {showTimeStretchDashboard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '800px',
            height: '90%',
            maxHeight: '600px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid #333',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '16px'
              }}>
                🎵 Professional Time Stretching & Pitch Correction
              </h2>
              <button
                onClick={() => setShowTimeStretchDashboard(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Time Stretch Dashboard"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <TimeStretchInterface 
                audioContext={multiTrackEngine.audioContext}
                audioFile={trackManager.tracks.length > 0 ? trackManager.tracks[0].buffer : null}
                onProcessedAudio={(processedBuffer) => {
                  // Handle processed audio - replace the current track's buffer
                  if (trackManager.tracks.length > 0) {
                    const trackId = trackManager.tracks[0].id;
                    executeCommand(
                      CommandFactory.updateTrackBuffer(trackId, processedBuffer, 'Time Stretch/Pitch Correction')
                    );
                  }
                }}
                isActive={showTimeStretchDashboard}
              />
            </div>
          </div>
        </div>
      )}

      {showExportMasteringInterface && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '900px',
            height: '90%',
            maxHeight: '700px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid #333',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '16px'
              }}>
                📦 Professional Export & Mastering Suite
              </h2>
              <button
                onClick={() => setShowExportMasteringInterface(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Export & Mastering Suite"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <ExportMasteringInterface 
                audioContext={multiTrackEngine.audioContext}
                audioFile={trackManager.tracks.length > 0 ? trackManager.tracks[0].buffer : null}
                onExportComplete={(exportResult) => {
                  console.log('Export complete:', exportResult);
                  // Show success notification
                  alert(`Export complete! File saved as: ${exportResult.filename}`);
                  setShowExportMasteringInterface(false);
                }}
                isActive={showExportMasteringInterface}
              />
            </div>
          </div>
        </div>
      )}

      {showMIDIInterface && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '1000px',
            height: '90%',
            maxHeight: '800px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid #333',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '16px'
              }}>
                🎹 Professional MIDI Integration Suite
              </h2>
              <button
                onClick={() => setShowMIDIInterface(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close MIDI Integration Suite"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <MIDIIntegrationInterface 
                audioContext={multiTrackEngine.audioContext}
                onAutomationData={(automationData) => {
                  console.log('Received MIDI automation data:', automationData);
                  // TODO: Integrate with automation system
                  // This could be connected to the existing automation dashboard
                }}
                isActive={showMIDIInterface}
              />
            </div>
          </div>
        </div>
      )}

      {showCloudInterface && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#1a1a1a',
            borderRadius: '10px',
            width: '90%',
            maxWidth: '1000px',
            height: '90%',
            maxHeight: '800px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #333'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '15px 20px',
              borderBottom: '1px solid #333',
              background: '#2a2a2a'
            }}>
              <h2 style={{
                margin: 0,
                color: '#fff',
                fontSize: '16px'
              }}>
                ☁️ Cloud Integration & Collaboration Suite
              </h2>
              <button
                onClick={() => setShowCloudInterface(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '20px',
                  padding: '5px'
                }}
                title="Close Cloud Integration Suite"
              >
                ×
              </button>
            </div>
            <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
              <CloudCollaborationInterface 
                projectData={trackManager.tracks.length > 0 ? {
                  tracks: trackManager.tracks,
                  // Add other project data as needed
                } : null}
                onProjectUpdate={(projectData) => {
                  console.log('Received project update from cloud:', projectData);
                  // TODO: Update the track manager with loaded project data
                  // This would integrate with the existing project state management
                }}
                isActive={showCloudInterface}
              />
            </div>
          </div>
        </div>
      )}

      {/* Help Interface */}
      <HelpInterface 
        isOpen={showHelpInterface}
        onClose={() => setShowHelpInterface(false)}
      />

      {/* Stem Extractor Modal */}
      {showStemExtractor && (
        <>
          <div 
            className="modal-backdrop" 
            onClick={() => setShowStemExtractor(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
          />
          <StemExtractor
            audioFilePath={currentAudioFile}
            onStemsExtracted={handleStemsExtracted}
            onClose={() => setShowStemExtractor(false)}
          />
        </>
      )}

      {/* Whisper Transcriber Modal */}
      {showWhisperTranscriber && (
        <>
          <div 
            className="modal-backdrop" 
            onClick={() => setShowWhisperTranscriber(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
          />
          <WhisperTranscriber
            audioFilePath={currentAudioFile}
            onTranscriptionComplete={async (transcription) => {
              console.log('✅ Transcription complete:', transcription);
              setTranscriptionResults(transcription);
              
              // Extract album art and metadata if available
              try {
                const { extractMetadata } = await import('./utils/albumArtExtractor.js');
                const metadata = await extractMetadata(currentAudioFile);
                setCurrentMetadata(metadata);
                setCurrentAlbumArt(metadata.albumArt);
                console.log('📀 Metadata extracted:', metadata);
              } catch (error) {
                console.warn('Could not extract metadata:', error);
              }
              
              // Auto-export to SRT file
              const srtContent = generateSRT(transcription);
              const blob = new Blob([srtContent], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${currentAudioFile.split('\\').pop().replace(/\.[^/.]+$/, '')}_lyrics.srt`;
              a.click();
              URL.revokeObjectURL(url);
              
              alert(`✅ Transcription Complete & Exported!\n\nDetected Language: ${transcription.language}\nWords: ${transcription.words?.length || 0}\nDuration: ${transcription.duration?.toFixed(2)}s\n\nSRT file saved! Click "🎬 Karaoke" to view synchronized lyrics.`);
              setShowWhisperTranscriber(false);
            }}
            onClose={() => setShowWhisperTranscriber(false)}
          />
        </>
      )}

      {/* Karaoke Display */}
      {showKaraokeDisplay && transcriptionResults && (
        <KaraokeDisplay
          transcription={transcriptionResults}
          currentTime={currentTime}
          albumArt={currentAlbumArt}
          songTitle={currentMetadata?.title || 'Unknown Track'}
          artistName={currentMetadata?.artist || 'Unknown Artist'}
          displayMode="fullscreen"
          theme="default"
          fontSize="large"
          highlightColor="#00D4FF"
          showAlbumArt={true}
          showSongInfo={true}
          onClose={() => setShowKaraokeDisplay(false)}
        />
      )}

      {/* Visual Display Settings */}
      {showVisualSettings && (
        <VisualDisplaySettings
          onApply={(settings) => {
            setVisualSettings(settings);
            setShowVisualSettings(false);
            setShowVisualDisplay(true);
          }}
          onClose={() => setShowVisualSettings(false)}
        />
      )}

      {/* Visual Display - Works with or without lyrics */}
      {showVisualDisplay && (
        <VisualDisplay
          albumArt={visualSettings?.customImage || currentAlbumArt}
          songTitle={currentMetadata?.title || 'Unknown Track'}
          artistName={currentMetadata?.artist || 'Unknown Artist'}
          albumName={currentMetadata?.album}
          djName={visualSettings?.djName || ''}
          eventName={visualSettings?.eventName || ''}
          logoImage={visualSettings?.logoImage}
          currentTime={currentTime}
          duration={duration}
          displayMode="fullscreen"
          visualMode={visualSettings?.visualMode || 'album-art'}
          layout={visualSettings?.layout || 'center'}
          theme={visualSettings?.theme || 'default'}
          primaryColor={visualSettings?.primaryColor || '#00D4FF'}
          secondaryColor={visualSettings?.secondaryColor || '#FF6B35'}
          backgroundColor={visualSettings?.backgroundColor || 'rgba(0, 0, 0, 0.85)'}
          showTrackInfo={visualSettings?.showTrackInfo ?? true}
          showProgress={visualSettings?.showProgress ?? true}
          showTime={visualSettings?.showTime ?? true}
          showClock={visualSettings?.showClock ?? false}
          showLogo={visualSettings?.showLogo ?? false}
          animationStyle={visualSettings?.animationStyle || 'fade'}
          onClose={() => setShowVisualDisplay(false)}
        />
      )}

      {/* Track Context Menu */}
      {contextMenu && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9998
            }}
            onClick={() => setContextMenu(null)}
          />
          <div 
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              background: '#2a2a2a',
              border: '1px solid #404040',
              borderRadius: '4px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 9999,
              minWidth: '200px',
              overflow: 'hidden'
            }}
          >
            <div 
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                color: '#fff',
                transition: 'background 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
              onMouseEnter={(e) => e.target.style.background = '#404040'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
              onClick={() => handleExtractStems(contextMenu.trackId, contextMenu.filePath)}
            >
              <span>🎵</span>
              <span>Extract Stems</span>
            </div>
            <div 
              style={{
                padding: '8px 15px',
                fontSize: '12px',
                color: '#888',
                borderTop: '1px solid #404040'
              }}
            >
              {contextMenu.trackName}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProAudioClipper;
