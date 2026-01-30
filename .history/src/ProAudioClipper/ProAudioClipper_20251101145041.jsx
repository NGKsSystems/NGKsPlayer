import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, Download, Save, FolderOpen, Scissors, MousePointer, ZoomIn, ZoomOut, RotateCcw, RotateCw, X, Plus } from 'lucide-react';
import ProfessionalTimeline from './components/ProfessionalTimeline';
import TrackHeader from './components/TrackHeader';
import TransportControls from './components/TransportControls';
import ToolPanel from './components/ToolPanel';
import ExportPanel from './components/ExportPanel';
import ProjectManager from './components/ProjectManager';
import TrackEffectsPanel from './components/TrackEffectsPanel';
import AudioAnalysisDashboard from './components/analysis/AudioAnalysisDashboard';
import StemExtractor from './Components/StemExtractor';
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
import { useUndoRedo } from './hooks/useUndoRedo';
// import './ProAudioClipper.css';
import './components/TrackHeader.css';
import './components/TrackEffectsPanel.css';

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
  const [currentAudioFile, setCurrentAudioFile] = useState(null);
  
  // FX Engine
  const [fxEngine, setFxEngine] = useState(null);
  const [currentBPM, setCurrentBPM] = useState(128);
  
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

  // Initialize FX Engine
  useEffect(() => {
    const initFXEngine = async () => {
      try {
        if (multiTrackEngine.audioContext) {
          console.log('🎛️ Initializing Professional FX Engine...');
          const engine = new AdvancedAudioFXEngine(multiTrackEngine.audioContext);
          
          // Connect FX engine to audio path
          multiTrackEngine.masterGain.connect(engine.getInput());
          engine.connect(multiTrackEngine.audioContext.destination);
          
          // Create FX chains for each track
          for (let i = 1; i <= 4; i++) {
            engine.createEffectChain(`track_${i}`);
          }
          engine.createEffectChain('master');
          
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

  const handleTrackPlaybackRateChange = useCallback((trackId, playbackRate) => {
    trackManager.setTrackPlaybackRate(trackId, playbackRate);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Speed changes are not undoable by design (too many micro-operations)
  }, [trackManager, multiTrackEngine]);

  const handleTrackReverseToggle = useCallback((trackId) => {
    trackManager.toggleTrackReverse(trackId);
    multiTrackEngine.updatePlaybackParameters(trackManager.tracks);
    // Note: Reverse changes are not undoable by design (instant toggle)
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

  // FX System Handlers
  const handleFXParameterChange = useCallback((unitId, paramName, value) => {
    if (!fxEngine) return;
    
    console.log(`🎛️ FX Unit ${unitId} - ${paramName}: ${value}`);
    
    try {
      // Map UI parameters to FX engine
      switch (paramName) {
        case 'mix':
          fxEngine.setChainWetLevel(`unit_${unitId}`, value);
          break;
        case 'param1':
        case 'param2':
          // These would map to specific effect parameters
          fxEngine.setEffectParameter(`unit_${unitId}`, paramName, value);
          break;
        default:
          fxEngine.setEffectParameter(`unit_${unitId}`, paramName, value);
      }
    } catch (error) {
      console.error('FX parameter change failed:', error);
    }
  }, [fxEngine]);

  const handleFXToggle = useCallback((unitId, enabled) => {
    if (!fxEngine) return;
    
    console.log(`🎛️ FX Unit ${unitId} ${enabled ? 'enabled' : 'disabled'}`);
    fxEngine.setChainEnabled(unitId, enabled);
  }, [fxEngine]);

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

  // Function to trigger file input for adding tracks
  const handleAddTrackWithFile = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

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
    const clampedZoom = Math.max(0.1, Math.min(20, newZoomLevel));
    
    // Calculate the center of the current viewport to maintain focus
    const viewportWidth = 800; // Approximate timeline width in pixels
    const pixelsPerSecond = 50;
    const currentViewportDuration = viewportWidth / (pixelsPerSecond * zoomLevel);
    const viewportCenter = viewportStart + currentViewportDuration / 2;
    
    // Calculate new viewport to keep the same center point visible
    const newViewportDuration = viewportWidth / (pixelsPerSecond * clampedZoom);
    const newViewportStart = Math.max(0, Math.min(
      duration - newViewportDuration,
      viewportCenter - newViewportDuration / 2
    ));
    
    setZoomLevel(clampedZoom);
    setViewportStart(newViewportStart);
  }, [zoomLevel, viewportStart, duration]);

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
        handleTrackDelete(trackManager.activeTrackId);
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
        {/* Left Panel - Track Headers */}
        <div 
          className="left-panel"
          style={{
            width: '300px',
            background: '#252525',
            borderRight: '1px solid #404040',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            flexShrink: 0
          }}
        >
          {/* File Import */}
          <div className="import-section" style={{ display: 'none' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                  // Process multiple files
                  files.forEach(file => {
                    handleFileLoad(file);
                  });
                }
              }}
              style={{ display: 'none' }}
            />
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
                onPlaybackRateChange={handleTrackPlaybackRateChange}
                onReverseToggle={handleTrackReverseToggle}
                onNameChange={handleTrackNameChange}
                onDelete={handleTrackDelete}
                onOpenEffects={handleOpenEffectsPanel}
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
            onAddTrack={handleAddTrackWithFile}
            onViewportChange={handleViewportChange}
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
          onClose={() => setShowProjectManager(false)}
          projectState={projectState}
        />
      )}

      {showEffectsPanel && effectsPanelTrackId && (
        <TrackEffectsPanel
          trackId={effectsPanelTrackId}
          trackName={trackManager.tracks.find(t => t.id === effectsPanelTrackId)?.name || 'Track'}
          effectsEngine={multiTrackEngine.effectsEngine}
          onClose={handleCloseEffectsPanel}
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
            onStemsExtracted={(stems) => {
              console.log('✅ Extracted stems:', stems);
              // TODO: Load stems as new tracks
              // For now, just log them
              alert(`Stems extracted successfully!\n\nAvailable stems:\n${Object.keys(stems).join(', ')}\n\nCheck console for file paths.`);
              setShowStemExtractor(false);
            }}
            onClose={() => setShowStemExtractor(false)}
          />
        </>
      )}
    </div>
  );
};

export default ProAudioClipper;