/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TrackRow.jsx
 * Purpose: Memoized track row component for DJ library with professional metadata
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { memo, useState, useCallback, useRef } from 'react';
import { formatKeyDisplay } from '../utils/keyConverter.js';

// ─── BPM Confidence Dot ──────────────────────────────────────────────────
const BpmDot = memo(({ confidence, locked }) => {
  const conf = Number(confidence) || 0;
  let color = '#ef4444'; // red < 60
  if (conf >= 85) color = '#22c55e'; // green
  else if (conf >= 60) color = '#eab308'; // yellow

  return (
    <span className="bpm-confidence-dot" style={{ background: color }}>
      {locked && <span className="bpm-lock">🔒</span>}
    </span>
  );
});
BpmDot.displayName = 'BpmDot';

// ─── Energy Meter (5 bars) ───────────────────────────────────────────────
const EnergyMeter = memo(({ level }) => {
  const n = Math.max(0, Math.min(5, Math.round(Number(level) || 0)));
  return (
    <span className="energy-meter" title={`Energy: ${n}/5`}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className={`energy-bar ${i <= n ? 'active' : ''}`} />
      ))}
    </span>
  );
});
EnergyMeter.displayName = 'EnergyMeter';

// ─── Status Icons ────────────────────────────────────────────────────────
const STATUS_ICONS = [
  { key: 'beatgridLocked',  icon: '⊞', title: 'Beatgrid locked' },
  { key: 'hotCuesPresent',  icon: '◆', title: 'Hot cues set' },
  { key: 'customEQ',        icon: '≋', title: 'Custom EQ saved' },
  { key: 'recentlyPlayed',  icon: '↻', title: 'Played recently' },
  { key: 'needsAnalysis',   icon: '⚠', title: 'Needs analysis' },
];

const StatusIcons = memo(({ track }) => {
  const icons = STATUS_ICONS.filter(s => {
    if (s.key === 'needsAnalysis') return !track.analyzed;
    if (s.key === 'recentlyPlayed') {
      if (!track.lastPlayed) return false;
      return (Date.now() - track.lastPlayed) < 86400000; // 24h
    }
    return !!track[s.key];
  });
  if (icons.length === 0) return null;
  return (
    <span className="track-status-icons">
      {icons.map(s => (
        <span key={s.key} className="status-icon" title={s.title}>{s.icon}</span>
      ))}
    </span>
  );
});
StatusIcons.displayName = 'StatusIcons';

// ─── Mini Waveform ───────────────────────────────────────────────────────
const MiniWaveform = memo(({ src }) => {
  if (src) {
    return <img className="mini-waveform" src={src} alt="" draggable={false} />;
  }
  return <span className="mini-waveform placeholder" />;
});
MiniWaveform.displayName = 'MiniWaveform';

// ─── Hover Quick Actions ─────────────────────────────────────────────────
const QuickActions = memo(({ onLoadA, onLoadB, onPreview, onCrate }) => (
  <div className="track-quick-actions">
    <button onClick={onLoadA} title="Load to Deck A">▶A</button>
    <button onClick={onLoadB} title="Load to Deck B">▶B</button>
    <button onClick={onPreview} title="Preview 3s">🎧</button>
    <button onClick={onCrate} title="Add to Crate">⭐</button>
  </div>
));
QuickActions.displayName = 'QuickActions';

// ─── Main TrackRow ────────────────────────────────────────────────────────
const TrackRow = memo(({
  track,
  index,
  isSelected,
  isCompact,
  keyDisplayMode,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onLoadDeck,
  onPreview,
  onCrate,
  formatDuration,
}) => {
  const [hovered, setHovered] = useState(false);
  const rowRef = useRef(null);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  const handleLoadA = useCallback((e) => { e.stopPropagation(); onLoadDeck?.(track, 'A'); }, [track, onLoadDeck]);
  const handleLoadB = useCallback((e) => { e.stopPropagation(); onLoadDeck?.(track, 'B'); }, [track, onLoadDeck]);
  const handlePreview = useCallback((e) => { e.stopPropagation(); onPreview?.(track); }, [track, onPreview]);
  const handleCrate = useCallback((e) => { e.stopPropagation(); onCrate?.(track); }, [track, onCrate]);

  const bpmText = track.bpm ? Math.round(track.bpm) : '--';
  const keyText = formatKeyDisplay(track, keyDisplayMode);
  const timeText = formatDuration(track.duration);
  const hasBpmConf = track.bpmConfidence != null && track.bpmConfidence !== '';

  return (
    <div
      ref={rowRef}
      className={`track-row ${isSelected ? 'selected' : ''} ${isCompact ? 'compact' : ''}`}
      onClick={() => onSelect(track)}
      onDoubleClick={() => onDoubleClick(track)}
      onContextMenu={onContextMenu}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title="Double-click to load | Right-click to edit metadata"
    >
      {/* Row 1: Title + status icons + energy */}
      <div className="track-row-top">
        <span className="track-filename">
          {track.title || 'Unknown Title'}
        </span>
        <StatusIcons track={track} />
        {track.energy != null && <EnergyMeter level={track.energy} />}
      </div>

      {/* Row 2: Metadata badges + waveform */}
      <div className="track-row-bottom">
        <div className="track-metadata">
          <span className="badge-bpm">
            BPM: {bpmText}
            {hasBpmConf && <BpmDot confidence={track.bpmConfidence} locked={track.bpmLocked} />}
          </span>
          <span className="badge-key">Key: {keyText}</span>
          <span className="badge-time">{timeText}</span>
        </div>
        <MiniWaveform src={track.waveformPreview || track.thumbnailPath} />
      </div>

      {/* Hover actions (absolute, no layout shift) */}
      {hovered && (
        <QuickActions
          onLoadA={handleLoadA}
          onLoadB={handleLoadB}
          onPreview={handlePreview}
          onCrate={handleCrate}
        />
      )}
    </div>
  );
}, (prev, next) => {
  // Custom equality — only re-render if these change
  return (
    prev.track === next.track &&
    prev.isSelected === next.isSelected &&
    prev.isCompact === next.isCompact &&
    prev.keyDisplayMode === next.keyDisplayMode
  );
});
TrackRow.displayName = 'TrackRow';

export default TrackRow;
