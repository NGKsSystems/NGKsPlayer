import React, { useState, useCallback } from 'react';
import './styles.css';

const DeckSettings = ({ 
  onAttackChange = () => {},
  onQuantChange = () => {},
  onDeckSelect = () => {},
  initialDeck = 'A',
  initialAttack = true,
  initialQuant = true
}) => {
  const [selectedDeck, setSelectedDeck] = useState(initialDeck);
  const [attackEnabled, setAttackEnabled] = useState(initialAttack);
  const [quantEnabled, setQuantEnabled] = useState(initialQuant);

  const handleDeckSelect = useCallback((deck) => {
    setSelectedDeck(deck);
    onDeckSelect(deck);
  }, [onDeckSelect]);

  const handleAttackToggle = useCallback(() => {
    const newState = !attackEnabled;
    setAttackEnabled(newState);
    onAttackChange(newState);
  }, [attackEnabled, onAttackChange]);

  const handleQuantToggle = useCallback(() => {
    const newState = !quantEnabled;
    setQuantEnabled(newState);
    onQuantChange(newState);
  }, [quantEnabled, onQuantChange]);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="deck-settings-content" onMouseDown={preventDrag}>
      <div className="deck-settings-header">
        <h4>DECK SETTINGS</h4>
      </div>
      
      <div className="deck-selection">
        <div className="deck-buttons">
          <button 
            className={`deck-btn deck-a ${selectedDeck === 'A' ? 'active' : ''}`}
            onClick={() => handleDeckSelect('A')}
            onMouseDown={preventDrag}
          >
            A
          </button>
          <button 
            className={`deck-btn deck-b ${selectedDeck === 'B' ? 'active' : ''}`}
            onClick={() => handleDeckSelect('B')}
            onMouseDown={preventDrag}
          >
            B
          </button>
        </div>
      </div>

      <div className="deck-settings-controls">
        <div className="setting-row">
          <button 
            className={`setting-btn ${attackEnabled ? 'active' : 'inactive'}`}
            onClick={handleAttackToggle}
            onMouseDown={preventDrag}
            title="Attack mode for pitch changes"
          >
            ATTACK
          </button>
        </div>
        
        <div className="setting-row">
          <button 
            className={`setting-btn ${quantEnabled ? 'active' : 'inactive'}`}
            onClick={handleQuantToggle}
            onMouseDown={preventDrag}
            title="Quantize mode for beat-synced operations"
          >
            QUANT
          </button>
        </div>
      </div>

      <div className="deck-info">
        <div className="current-deck">
          Deck: <span className={`deck-indicator deck-${selectedDeck.toLowerCase()}`}>{selectedDeck}</span>
        </div>
        <div className="settings-status">
          <span className={`status-indicator ${attackEnabled ? 'on' : 'off'}`}>
            ATK: {attackEnabled ? 'ON' : 'OFF'}
          </span>
          <span className={`status-indicator ${quantEnabled ? 'on' : 'off'}`}>
            QNT: {quantEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DeckSettings;