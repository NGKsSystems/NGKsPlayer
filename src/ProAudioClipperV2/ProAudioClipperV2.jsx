/* ═══════════════════════════════════════════════════════
   ProAudioClipperV2 – Main entry component
   CSS-Grid shell: toolbar | transport | effects+timeline | footer
   All state is local stub data for PHASE 2 (shell layout).
   Controllers will be wired in PHASE 3+.
   ═══════════════════════════════════════════════════════ */
import React, { useState, useCallback } from 'react';
import TopToolbar from './components/TopToolbar.jsx';
import TransportBar from './components/TransportBar.jsx';
import EffectsRail from './components/EffectsRail.jsx';
import TimelineShell from './components/TimelineShell.jsx';
import { DEFAULT_ZOOM } from './math/layoutConstants.js';
import './styles/clipperV2.css';

// ── Stub data – replaced by real hooks in later phases ──
const STUB_TRACKS = [
  { id: 'stub-1', name: 'Vocal Lead', clips: [], muted: false, solo: false, volume: 0.8, pan: 0 },
  { id: 'stub-2', name: 'Guitar',     clips: [], muted: false, solo: false, volume: 0.7, pan: -0.3 },
  { id: 'stub-3', name: 'Drums',      clips: [], muted: false, solo: false, volume: 0.9, pan: 0 },
  { id: 'stub-4', name: 'Bass',       clips: [], muted: false, solo: false, volume: 0.75, pan: 0.1 },
];

let nextTrackId = 5;

export default function ProAudioClipperV2({ onNavigate }) {
  // ── UI state ──────────────────────────────────────────
  const [effectsExpanded, setEffectsExpanded] = useState(false);
  const [activePanel, setActivePanel]         = useState(null);

  // ── Transport state (stub) ────────────────────────────
  const [isPlaying, setIsPlaying]       = useState(false);
  const [currentTime, setCurrentTime]   = useState(0);
  const [duration]                      = useState(180);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [masterVolume, setMasterVolume] = useState(0.8);

  // ── Timeline state (stub) ─────────────────────────────
  const [tracks, setTracks]             = useState(STUB_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState('stub-1');
  const [zoom, setZoom]                 = useState(DEFAULT_ZOOM);
  const [viewportStart]                 = useState(0);
  const [selectedTool, setSelectedTool] = useState('selection');

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

  const handlePlay  = useCallback(() => setIsPlaying((p) => !p), []);
  const handleStop  = useCallback(() => { setIsPlaying(false); setCurrentTime(0); }, []);
  const handleSkipBack    = useCallback(() => setCurrentTime((t) => Math.max(0, t - 5)), []);
  const handleSkipForward = useCallback(() => setCurrentTime((t) => Math.min(duration, t + 5)), [duration]);

  const handleAddTrack = useCallback(() => {
    const id = `track-${nextTrackId++}`;
    setTracks((prev) => [...prev, {
      id, name: `Track ${nextTrackId - 1}`, clips: [],
      muted: false, solo: false, volume: 0.8, pan: 0,
    }]);
  }, []);

  const handleSelectTrack = useCallback((id) => setActiveTrackId(id), []);

  const handleToggleMute = useCallback((id) => {
    setTracks((prev) => prev.map((t) => t.id === id ? { ...t, muted: !t.muted } : t));
  }, []);

  const handleToggleSolo = useCallback((id) => {
    setTracks((prev) => prev.map((t) => t.id === id ? { ...t, solo: !t.solo } : t));
  }, []);

  // Active track name for effects rail
  const activeTrack = tracks.find((t) => t.id === activeTrackId);

  // ── Render ────────────────────────────────────────────
  return (
    <div className="clipper-v2">
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
        onSetRate={setPlaybackRate}
        onSetVolume={setMasterVolume}
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
