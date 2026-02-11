/* ───────────────────────────────────────────────────────
   TopToolbar – V2 header action bar
   ─────────────────────────────────────────────────────── */
import React from 'react';

const TOOL_BUTTONS = [
  { key: 'undo',       label: '↩ Undo',           group: 'edit' },
  { key: 'redo',       label: '↪ Redo',           group: 'edit' },
  { key: 'project',    label: '📁 Project',       group: 'file' },
  { key: 'clearAll',   label: '🗑 Clear All',     group: 'file' },
  { key: 'export',     label: '💾 Export',         group: 'file' },
  { key: 'stems',      label: '🎚 Extract Stems', group: 'ai' },
  { key: 'transcribe', label: '📝 Transcribe',    group: 'ai' },
  { key: 'karaoke',    label: '🎤 Karaoke',       group: 'ai' },
  { key: 'visuals',    label: '🎨 Visuals',       group: 'view' },
  { key: 'analysis',   label: '📊 Analysis',      group: 'view' },
  { key: 'automation', label: '⚙ Automation',     group: 'view' },
  { key: 'routing',    label: '🔀 Routing',       group: 'view' },
  { key: 'timePitch',  label: '⏱ Time/Pitch',     group: 'dsp' },
  { key: 'exportMaster', label: '🎛 Export/Master', group: 'dsp' },
  { key: 'midi',       label: '🎹 MIDI',          group: 'ext' },
  { key: 'cloud',      label: '☁ Cloud',          group: 'ext' },
  { key: 'help',       label: '❓ Help',           group: 'ext' },
];

export default function TopToolbar({ onBack, onAction, activePanel }) {
  return (
    <header className="v2-toolbar">
      <button className="v2-toolbar__back" onClick={onBack} title="Back to Library">
        ← Back
      </button>

      <h1 className="v2-toolbar__title">Pro Audio Clipper</h1>
      <div className="v2-toolbar__sep" />

      {TOOL_BUTTONS.map((btn, i) => {
        // Insert separators between groups
        const prev = TOOL_BUTTONS[i - 1];
        const sep = prev && prev.group !== btn.group;
        return (
          <React.Fragment key={btn.key}>
            {sep && <div className="v2-toolbar__sep" />}
            <button
              className={`v2-toolbar__btn${activePanel === btn.key ? ' v2-toolbar__btn--active' : ''}`}
              onClick={() => onAction(btn.key)}
              title={btn.label}
            >
              {btn.label}
            </button>
          </React.Fragment>
        );
      })}
    </header>
  );
}
