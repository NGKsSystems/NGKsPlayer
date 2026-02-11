/* ═══════════════════════════════════════════════════════
   ProAudioClipperV2 – Main entry component
   CSS-Grid shell: toolbar | transport | effects+timeline | footer
   All state is local stub data for PHASE 2 (shell layout).
   Controllers will be wired in PHASE 3+.
   ═══════════════════════════════════════════════════════ */
import React, { useState, useCallback, useRef } from 'react';
import TopToolbar from './components/TopToolbar.jsx';
import TransportBar from './components/TransportBar.jsx';
import EffectsRail from './components/EffectsRail.jsx';
import TimelineShell from './components/TimelineShell.jsx';
import { DEFAULT_ZOOM } from './math/layoutConstants.js';
import usePlaybackEngine, { getSharedAudioContext } from './hooks/usePlaybackEngine.js';
import './styles/clipperV2.css';

let nextTrackId = 1;

export default function ProAudioClipperV2({ onNavigate }) {
  // ── UI state ──────────────────────────────────────────
  const [effectsExpanded, setEffectsExpanded] = useState(false);
  const [activePanel, setActivePanel]         = useState(null);

  // ── Transport state ───────────────────────────────────
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration, setDuration]          = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [masterVolume, setMasterVolume] = useState(0.8);

  // ── Timeline state ────────────────────────────────────
  const [tracks, setTracks]             = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const [zoom, setZoom]                 = useState(DEFAULT_ZOOM);
  const [viewportStart]                 = useState(0);
  const [selectedTool, setSelectedTool] = useState('selection');

  // Keep a mutable ref to tracks so engine callbacks always see latest
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  // ── Audio engine ──────────────────────────────────────
  const engine = usePlaybackEngine({
    onTimeUpdate: setCurrentTime,
    onPlayEnd: () => {
      setIsPlaying(false);
      setCurrentTime(0);
    },
  });

  // ── Callbacks ─────────────────────────────────────────
  const handleBack = useCallback(() => {
    onNavigate?.('library');
  }, [onNavigate]);

  const handleToolbarAction = useCallback((key) => {
    setActivePanel((prev) => (prev === key ? null : key));
    if (key === 'clearAll') {
      setTracks([]);
      setActiveTrackId(null);
    }
  }, []);

  const handlePlay  = useCallback(() => {
    if (isPlaying) {
      engine.pausePlayback();
      setIsPlaying(false);
    } else {
      engine.playTracks(tracksRef.current, currentTime, playbackRate);
      setIsPlaying(true);
    }
  }, [isPlaying, currentTime, playbackRate, engine]);

  const handleStop  = useCallback(() => {
    engine.stopPlayback();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [engine]);

  const handleSkipBack = useCallback(() => {
    const newTime = Math.max(0, currentTime - 5);
    engine.seekTo(tracksRef.current, newTime);
    setCurrentTime(newTime);
  }, [currentTime, engine]);

  const handleSkipForward = useCallback(() => {
    const newTime = Math.min(duration, currentTime + 5);
    engine.seekTo(tracksRef.current, newTime);
    setCurrentTime(newTime);
  }, [currentTime, duration, engine]);

  const handleSetRate = useCallback((rate) => {
    setPlaybackRate(rate);
    engine.setRate(tracksRef.current, rate);
  }, [engine]);

  const handleSetVolume = useCallback((vol) => {
    setMasterVolume(vol);
    engine.setMasterVolume(vol);
  }, [engine]);

  // Hidden file input ref — triggers native OS file picker
  const fileInputRef = useRef(null);

  // "+ Track" button → open native file dialog via hidden input
  const handleAddTrack = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // allow re-selecting same file
      fileInputRef.current.click();
    }
  }, []);

  // File input onChange — decode audio, create track + clip
  const handleFileInputChange = useCallback(async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;
    const ctx = getSharedAudioContext();
    for (const file of selectedFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        const id = `track-${nextTrackId++}`;
        const trackName = file.name.replace(/\.[^/.]+$/, '');
        const clip = {
          id: `clip_${Date.now()}_${id}`,
          name: trackName,
          startTime: 0,
          endTime: audioBuffer.duration,
          duration: audioBuffer.duration,
          audioBuffer,
        };
        setTracks((prev) => [...prev, {
          id, name: trackName, clips: [clip],
          muted: false, solo: false, volume: 0.8, pan: 0,
        }]);
        setDuration((prev) => Math.max(prev, audioBuffer.duration));
      } catch (err) {
        console.error('[V2] Failed to decode file:', file.name, err);
      }
    }
    e.target.value = ''; // reset so same file can be re-selected
  }, []);

  const handleSelectTrack = useCallback((id) => setActiveTrackId(id), []);

  const handleToggleMute = useCallback((id) => {
    setTracks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, muted: !t.muted } : t);
      engine.updateTrackParams(next);
      return next;
    });
  }, [engine]);

  const handleToggleSolo = useCallback((id) => {
    setTracks((prev) => {
      const next = prev.map((t) => t.id === id ? { ...t, solo: !t.solo } : t);
      engine.updateTrackParams(next);
      return next;
    });
  }, [engine]);

  // Active track name for effects rail
  const activeTrack = tracks.find((t) => t.id === activeTrackId);

  // ── Render ────────────────────────────────────────────
  return (
    <div className="clipper-v2">
      {/* Hidden file input fallback for non-Electron */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Row 1: Toolbar */}
      <TopToolbar
        onBack={handleBack}
        onAction={handleToolbarAction}
        activePanel={activePanel}
      />

      {/* Row 2: Transport */}
      <TransportBar
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        playbackRate={playbackRate}
        masterVolume={masterVolume}
        onPlay={handlePlay}
        onStop={handleStop}
        onSkipBack={handleSkipBack}
        onSkipForward={handleSkipForward}
        onSetRate={handleSetRate}
        onSetVolume={handleSetVolume}
      />

      {/* Row 3 col 1: Effects */}
      <EffectsRail
        expanded={effectsExpanded}
        onToggle={() => setEffectsExpanded((e) => !e)}
        activeTrackName={activeTrack?.name}
      />

      {/* Row 3 col 2: Timeline */}
      <TimelineShell
        tracks={tracks}
        activeTrackId={activeTrackId}
        zoom={zoom}
        viewportStart={viewportStart}
        selectedTool={selectedTool}
        currentTime={currentTime}
        duration={duration}
        onZoomChange={setZoom}
        onToolChange={setSelectedTool}
        onAddTrack={handleAddTrack}
        onSelectTrack={handleSelectTrack}
        onToggleMute={handleToggleMute}
        onToggleSolo={handleToggleSolo}
      />

      {/* Row 4: Footer */}
      <footer className="v2-footer">
        <div className="v2-footer__left">
          <span>Zoom: {Math.round(zoom)}px/s</span>
          <span>Tool: {selectedTool}</span>
          <span>{tracks.length} tracks</span>
        </div>
        <div className="v2-footer__right">
          <span>Pro Audio Clipper V2</span>
        </div>
      </footer>
    </div>
  );
}
