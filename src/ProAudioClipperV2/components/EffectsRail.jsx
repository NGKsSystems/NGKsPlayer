/* ───────────────────────────────────────────────────────
   EffectsRail – V2 collapsible left sidebar
   Collapsed: vertical "EFFECTS" label.
   Expanded: renders V1 TrackEffectsPanel (real DSP UI).
   ─────────────────────────────────────────────────────── */
import React from 'react';
import TrackEffectsPanel from '../../ProAudioClipper/components/TrackEffectsPanel';
import '../../ProAudioClipper/components/TrackEffectsPanel.css';

export default function EffectsRail({
  expanded,
  onToggle,
  activeTrackId,
  activeTrackName,
  effectsEngine,
  tracks = [],
}) {
  if (!expanded) {
    return (
      <aside
        className="v2-effects-rail v2-effects-rail--collapsed"
        onClick={onToggle}
        title="Open effects panel"
      >
        <div className="v2-effects-rail__label">EFFECTS</div>
      </aside>
    );
  }

  const targetTrackId = activeTrackId || tracks[0]?.id;
  const targetTrackName =
    activeTrackName ||
    tracks.find((t) => t.id === targetTrackId)?.name ||
    'Track 1';

  return (
    <aside className="v2-effects-rail v2-effects-rail--expanded">
      {targetTrackId && effectsEngine ? (
        <TrackEffectsPanel
          trackId={targetTrackId}
          trackName={targetTrackName}
          effectsEngine={effectsEngine}
          onClose={onToggle}
        />
      ) : (
        <div className="v2-effects-rail__panel">
          <div className="v2-effects-rail__panel-header">
            <span className="v2-effects-rail__panel-title">Track Effects</span>
            <button className="v2-effects-rail__close-btn" onClick={onToggle} title="Collapse">
              ✕
            </button>
          </div>
          <div style={{ color: '#666', padding: 16, textAlign: 'center' }}>
            <p>No tracks loaded yet.</p>
            <p style={{ fontSize: 11, marginTop: 8 }}>
              Add a track to start using effects.
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
