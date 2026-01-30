import React, { useState, useCallback } from 'react';
import './styles.css';

const LoopControls = ({ 
  onLoopSet = () => {},
  onLoopToggle = () => {},
  onLoopExit = () => {},
  activeLoop = null,
  isLooping = false,
  autoLoop = false
}) => {
  const [activeLoopState, setActiveLoopState] = useState(activeLoop);
  const [isLoopingState, setIsLoopingState] = useState(isLooping);
  const [autoLoopState, setAutoLoopState] = useState(autoLoop);

  // Loop length options (in beats)
  const loopLengths = [
    { label: '1/8', value: 0.125 },
    { label: '1/4', value: 0.25 },
    { label: '1/2', value: 0.5 },
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '4', value: 4 },
    { label: '8', value: 8 },
    { label: '16', value: 16 }
  ];

  const handleLoopSet = useCallback((loopLength) => {
    setActiveLoopState(loopLength);
    setIsLoopingState(true);
    onLoopSet(loopLength);
    onLoopToggle(true);
  }, [onLoopSet, onLoopToggle]);

  const handleLoopToggle = useCallback(() => {
    const newState = !isLoopingState;
    setIsLoopingState(newState);
    onLoopToggle(newState);
  }, [isLoopingState, onLoopToggle]);

  const handleLoopExit = useCallback(() => {
    setIsLoopingState(false);
    setActiveLoopState(null);
    onLoopExit();
  }, [onLoopExit]);

  const handleAutoToggle = useCallback(() => {
    const newState = !autoLoopState;
    setAutoLoopState(newState);
    // Auto loop functionality can be implemented later
  }, [autoLoopState]);

  const preventDrag = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="loop-controls-content" onMouseDown={preventDrag}>
      <div className="loop-controls-header">
        <h4>LOOP CONTROLS</h4>
      </div>
      
      {/* Loop Length Buttons */}
      <div className="loop-buttons">
        <div className="loop-row">
          {loopLengths.slice(0, 4).map((loop) => (
            <button
              key={loop.value}
              className={`loop-btn ${activeLoopState === loop.value && isLoopingState ? 'active' : ''}`}
              onClick={() => handleLoopSet(loop.value)}
              onMouseDown={preventDrag}
              title={`Set ${loop.label} beat loop`}
            >
              {loop.label}
            </button>
          ))}
        </div>
        <div className="loop-row">
          {loopLengths.slice(4, 8).map((loop) => (
            <button
              key={loop.value}
              className={`loop-btn ${activeLoopState === loop.value && isLoopingState ? 'active' : ''}`}
              onClick={() => handleLoopSet(loop.value)}
              onMouseDown={preventDrag}
              title={`Set ${loop.label} beat loop`}
            >
              {loop.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loop Control Buttons */}
      <div className="loop-actions">
        <button
          className={`action-btn loop-toggle ${isLoopingState ? 'active' : ''}`}
          onClick={handleLoopToggle}
          onMouseDown={preventDrag}
          title="Toggle loop on/off"
        >
          {isLoopingState ? 'ON' : 'OFF'}
        </button>
        
        <button
          className={`action-btn auto-btn ${autoLoopState ? 'active' : ''}`}
          onClick={handleAutoToggle}
          onMouseDown={preventDrag}
          title="Auto loop mode"
        >
          AUTO
        </button>
        
        <button
          className="action-btn exit-btn"
          onClick={handleLoopExit}
          onMouseDown={preventDrag}
          title="Exit current loop"
          disabled={!isLoopingState}
        >
          EXIT
        </button>
      </div>

      {/* Loop Status Display */}
      <div className="loop-status">
        {isLoopingState && activeLoopState ? (
          <div className="status-active">
            <span className="loop-indicator">● LOOP</span>
            <span className="loop-length">{loopLengths.find(l => l.value === activeLoopState)?.label} beat</span>
          </div>
        ) : (
          <div className="status-inactive">
            <span className="loop-indicator">○ No Loop</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoopControls;