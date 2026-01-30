import React, { useState, useCallback } from 'react';
import './styles.css';

const SyncTempo = ({ 
  bpmA = 120,
  bpmB = 120,
  onSyncA = () => {},
  onSyncB = () => {},
  onBpmChange = () => {},
  syncEnabledA = false,
  syncEnabledB = false
}) => {
  const [syncStateA, setSyncStateA] = useState(syncEnabledA);
  const [syncStateB, setSyncStateB] = useState(syncEnabledB);

  const handleSyncToggle = useCallback((deck) => {
    if (deck === 'A') {
      const newState = !syncStateA;
      setSyncStateA(newState);
      onSyncA(newState);
    } else {
      const newState = !syncStateB;
      setSyncStateB(newState);
      onSyncB(newState);
    }
  }, [syncStateA, syncStateB, onSyncA, onSyncB]);

  const handleBpmClick = useCallback((deck) => {
    // Manual BPM tap or adjustment
    onBpmChange(deck);
  }, [onBpmChange]);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="sync-tempo-content" onMouseDown={preventDrag}>
      <div className="sync-tempo-header">
        <h4>SYNC &amp; TEMPO</h4>
      </div>
      
      <div className="sync-controls">
        {/* Deck A Sync */}
        <div className="sync-deck">
          <div className="deck-label">A</div>
          <button 
            className={`sync-btn ${syncStateA ? 'active synced' : 'inactive'}`}
            onClick={() => handleSyncToggle('A')}
            onMouseDown={preventDrag}
            title="Sync Deck A to master tempo"
          >
            SYNC
          </button>
          <div 
            className="bpm-display clickable"
            onClick={() => handleBpmClick('A')}
            onMouseDown={preventDrag}
            title="Click to tap BPM or adjust"
          >
            <div className="bpm-value">{bpmA.toFixed(1)}</div>
            <div className="bpm-label">BPM</div>
          </div>
        </div>

        {/* Center Divider */}
        <div className="sync-divider"></div>

        {/* Deck B Sync */}
        <div className="sync-deck">
          <div className="deck-label">B</div>
          <button 
            className={`sync-btn ${syncStateB ? 'active synced' : 'inactive'}`}
            onClick={() => handleSyncToggle('B')}
            onMouseDown={preventDrag}
            title="Sync Deck B to master tempo"
          >
            SYNC
          </button>
          <div 
            className="bpm-display clickable"
            onClick={() => handleBpmClick('B')}
            onMouseDown={preventDrag}
            title="Click to tap BPM or adjust"
          >
            <div className="bpm-value">{bpmB.toFixed(1)}</div>
            <div className="bpm-label">BPM</div>
          </div>
        </div>
      </div>

      {/* Master Tempo Display */}
      <div className="master-tempo">
        <div className="master-label">Master</div>
        <div className="master-bpm">
          {Math.max(bpmA, bpmB).toFixed(1)} BPM
        </div>
        <div className="sync-status">
          {syncStateA && syncStateB ? 'Both Synced' : 
           syncStateA ? 'A Synced' : 
           syncStateB ? 'B Synced' : 'Manual'}
        </div>
      </div>
    </div>
  );
};

export default SyncTempo;