import React, { useState, useCallback } from 'react';
import './styles.css';

const CuePoints = ({ 
  onCueSet = () => {},
  onCueJump = () => {},
  onCueClear = () => {},
  activeDeck = 'A',
  cuePoints = {}
}) => {
  const [cueData, setCueData] = useState(cuePoints);
  const [selectedDeck, setSelectedDeck] = useState(activeDeck);

  // Generate cue point buttons (1-8)
  const cueNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  const handleCueSet = useCallback((cueNumber) => {
    const cueKey = `${selectedDeck}-${cueNumber}`;
    const newCueData = {
      ...cueData,
      [cueKey]: {
        position: Date.now(), // This would be actual track position
        timestamp: new Date().toLocaleTimeString(),
        deck: selectedDeck
      }
    };
    setCueData(newCueData);
    onCueSet(selectedDeck, cueNumber);
  }, [cueData, selectedDeck, onCueSet]);

  const handleCueJump = useCallback((cueNumber) => {
    const cueKey = `${selectedDeck}-${cueNumber}`;
    if (cueData[cueKey]) {
      onCueJump(selectedDeck, cueNumber, cueData[cueKey].position);
    }
  }, [cueData, selectedDeck, onCueJump]);

  const handleCueClear = useCallback((cueNumber) => {
    const cueKey = `${selectedDeck}-${cueNumber}`;
    const newCueData = { ...cueData };
    delete newCueData[cueKey];
    setCueData(newCueData);
    onCueClear(selectedDeck, cueNumber);
  }, [cueData, selectedDeck, onCueClear]);

  const handleDeckSwitch = useCallback((deck) => {
    setSelectedDeck(deck);
  }, []);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="cue-points-content" onMouseDown={preventDrag}>
      <div className="cue-points-header">
        <div className="deck-selector">
          <button
            className={`deck-btn ${selectedDeck === 'A' ? 'active' : ''}`}
            onClick={() => handleDeckSwitch('A')}
            onMouseDown={preventDrag}
          >
            A
          </button>
          <button
            className={`deck-btn ${selectedDeck === 'B' ? 'active' : ''}`}
            onClick={() => handleDeckSwitch('B')}
            onMouseDown={preventDrag}
          >
            B
          </button>
        </div>
      </div>
      
      {/* Cue Point Grid */}
      <div className="cue-grid">
        <div className="cue-row">
          {cueNumbers.slice(0, 4).map((num) => {
            const cueKey = `${selectedDeck}-${num}`;
            const hasCue = !!cueData[cueKey];
            
            return (
              <div key={num} className="cue-button-container">
                <button
                  className={`cue-btn ${hasCue ? 'has-cue' : 'empty'}`}
                  onClick={() => hasCue ? handleCueJump(num) : handleCueSet(num)}
                  onMouseDown={preventDrag}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (hasCue) handleCueClear(num);
                  }}
                  title={hasCue ? 
                    `Jump to cue ${num} (Right-click to clear)` : 
                    `Set cue point ${num}`}
                >
                  {num}
                </button>
                {hasCue && (
                  <div className="cue-indicator">
                    <div className="cue-dot"></div>
                    <div className="cue-time">{cueData[cueKey].timestamp}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        <div className="cue-row">
          {cueNumbers.slice(4, 8).map((num) => {
            const cueKey = `${selectedDeck}-${num}`;
            const hasCue = !!cueData[cueKey];
            
            return (
              <div key={num} className="cue-button-container">
                <button
                  className={`cue-btn ${hasCue ? 'has-cue' : 'empty'}`}
                  onClick={() => hasCue ? handleCueJump(num) : handleCueSet(num)}
                  onMouseDown={preventDrag}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (hasCue) handleCueClear(num);
                  }}
                  title={hasCue ? 
                    `Jump to cue ${num} (Right-click to clear)` : 
                    `Set cue point ${num}`}
                >
                  {num}
                </button>
                {hasCue && (
                  <div className="cue-indicator">
                    <div className="cue-dot"></div>
                    <div className="cue-time">{cueData[cueKey].timestamp}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cue Actions */}
      <div className="cue-actions">
        <button
          className="action-btn clear-all"
          onClick={() => {
            cueNumbers.forEach(num => {
              const cueKey = `${selectedDeck}-${num}`;
              if (cueData[cueKey]) {
                handleCueClear(num);
              }
            });
          }}
          onMouseDown={preventDrag}
          title="Clear all cue points for current deck"
        >
          Clear All
        </button>
      </div>

      {/* Cue Status */}
      <div className="cue-status">
        <div className="cue-count">
          Deck {selectedDeck}: {cueNumbers.filter(num => cueData[`${selectedDeck}-${num}`]).length}/8 cues
        </div>
      </div>
    </div>
  );
};

export default CuePoints;