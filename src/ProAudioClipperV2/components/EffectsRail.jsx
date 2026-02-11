/* ───────────────────────────────────────────────────────
   EffectsRail – V2 collapsible left sidebar
   Shows vertical "EFFECTS" label when collapsed,
   placeholder panel when expanded.
   ─────────────────────────────────────────────────────── */
import React from 'react';

export default function EffectsRail({ expanded, onToggle, activeTrackName }) {
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

  return (
    <aside className="v2-effects-rail v2-effects-rail--expanded">
      <div className="v2-effects-rail__panel">
        <div className="v2-effects-rail__panel-header">
          <span className="v2-effects-rail__panel-title">
            {activeTrackName ? `FX: ${activeTrackName}` : 'Track Effects'}
          </span>
          <button className="v2-effects-rail__close-btn" onClick={onToggle} title="Collapse">
            ✕
          </button>
        </div>

        {/* Placeholder – PHASE 5 will wire real effects via adapter */}
        <div style={{ color: '#666', padding: 16, textAlign: 'center' }}>
          <p>Effects chain placeholder</p>
          <p style={{ fontSize: 11, marginTop: 8 }}>
            Select a track and add effects here.
          </p>
        </div>
      </div>
    </aside>
  );
}
