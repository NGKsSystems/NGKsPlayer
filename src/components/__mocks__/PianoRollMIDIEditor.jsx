/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: PianoRollMIDIEditor.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Mock Piano Roll MIDI Editor for Testing
 * Simplified version without memory-intensive canvas operations
 */

import React from 'react';

const PianoRollMIDIEditor = ({ 
  midiData = null, 
  audioContext, 
  onMidiChange, 
  onClose,
  isActive = true 
}) => {
  return (
    <div data-testid="piano-roll-editor" className="piano-roll-editor">
      <div className="toolbar">
        <h2>Piano Roll</h2>
        <button title="Pencil Tool (Create Notes)" className="tool-button active">
          ✏️
        </button>
        <button title="Select Tool" className="tool-button">
          🔍
        </button>
        <button title="Erase Tool" className="tool-button">
          🗑️
        </button>
      </div>
      
      <div className="playback-controls">
        <button title="Play/Pause (Space)">
          ▶️
        </button>
        <button title="Stop">
          ⏹️
        </button>
        <button title="Loop">
          🔄
        </button>
      </div>
      
      <div className="snap-controls">
        <span>Snap:</span>
        <select value="1/16">
          <option value="1/16">1/16</option>
          <option value="1/8">1/8</option>
          <option value="1/4">1/4</option>
        </select>
      </div>
      
      {/* Mock canvas elements with fixed dimensions */}
      <div className="canvas-container">
        <canvas 
          width={100} 
          height={50} 
          data-testid="timeline-canvas"
        />
        <canvas 
          width={100} 
          height={50} 
          data-testid="piano-keys-canvas"
        />
        <canvas 
          width={100} 
          height={50} 
          data-testid="piano-roll-canvas"
        />
      </div>
    </div>
  );
};

export default PianoRollMIDIEditor;
