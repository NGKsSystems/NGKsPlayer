import React, { useState, useCallback, useRef, useEffect } from 'react';

const PadGrid = ({
  pads = [],
  onPadTrigger = () => {},
  onPadLoad = () => {},
  onPadClear = () => {},
  isRecording = false,
  recordingPad = null,
  playingPads = new Set(),
  padSize = 'medium' // 'small', 'medium', 'large'
}) => {
  const [selectedPad, setSelectedPad] = useState(null);
  const [draggedSample, setDraggedSample] = useState(null);
  const [keyboardMode, setKeyboardMode] = useState(true);
  const gridRef = useRef();

  // Keyboard mappings for pad grid
  const keyboardMap = {
    'q': 0, 'w': 1, 'e': 2, 'r': 3,
    'a': 4, 's': 5, 'd': 6, 'f': 7,
    'z': 8, 'x': 9, 'c': 10, 'v': 11,
    '1': 12, '2': 13, '3': 14, '4': 15
  };

  // Handle keyboard triggers
  useEffect(() => {
    if (!keyboardMode) return;

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (keyboardMap.hasOwnProperty(key)) {
        e.preventDefault();
        const padIndex = keyboardMap[key];
        if (pads[padIndex] && pads[padIndex].sample) {
          onPadTrigger(padIndex, pads[padIndex]);
        }
      }
    };

    const handleKeyUp = (e) => {
      // Handle key release for sustained pads
      const key = e.key.toLowerCase();
      if (keyboardMap.hasOwnProperty(key)) {
        const padIndex = keyboardMap[key];
        // Could implement pad release logic here
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [keyboardMode, pads, onPadTrigger]);

  const handlePadClick = useCallback((padIndex, pad) => {
    if (pad.sample) {
      onPadTrigger(padIndex, pad);
    }
    setSelectedPad(padIndex);
  }, [onPadTrigger]);

  const handlePadDoubleClick = useCallback((padIndex) => {
    // Double-click to clear pad
    onPadClear(padIndex);
  }, [onPadClear]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleDrop = useCallback((padIndex, e) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.type === 'sample' || data.type === 'track') {
        onPadLoad(padIndex, data.sample || data.track);
      }
    } catch (error) {
      console.warn('Invalid drop data:', error);
    }
  }, [onPadLoad]);

  const getPadSizeClass = () => {
    switch (padSize) {
      case 'small': return 'w-12 h-12';
      case 'large': return 'w-20 h-20';
      default: return 'w-16 h-16';
    }
  };

  const getPadColor = (pad, isPlaying, isRecording, isSelected) => {
    if (isRecording) return 'bg-red-600 border-red-400';
    if (isPlaying) return 'bg-green-500 border-green-300';
    if (isSelected) return 'bg-blue-600 border-blue-400';
    if (pad.sample) {
      // Color by sample type
      if (pad.sample.type === 'drum') return 'bg-orange-600 border-orange-400';
      if (pad.sample.type === 'vocal') return 'bg-purple-600 border-purple-400';
      if (pad.sample.type === 'melody') return 'bg-cyan-600 border-cyan-400';
      return 'bg-gray-600 border-gray-400';
    }
    return 'bg-gray-800 border-gray-600';
  };

  const getKeyLabel = (index) => {
    const key = Object.keys(keyboardMap).find(k => keyboardMap[k] === index);
    return key ? key.toUpperCase() : '';
  };

  return (
    <div className="pad-grid bg-gray-900 p-4 rounded-lg">
      <div className="grid-header text-xs text-white mb-3 text-center font-bold">
        SAMPLE PAD GRID
      </div>

      {/* Grid Controls */}
      <div className="grid-controls flex justify-between items-center mb-3 text-xs">
        <div className="mode-controls flex space-x-2">
          <button
            onClick={() => setKeyboardMode(!keyboardMode)}
            className={`mode-btn px-2 py-1 rounded transition-colors ${
              keyboardMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            ⌨️ Keyboard
          </button>
          <select
            value={padSize}
            onChange={(e) => {}} // Would need to be passed down as prop
            className="size-select bg-gray-700 text-white px-2 py-1 rounded text-xs"
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        
        <div className="status text-gray-400">
          {playingPads.size > 0 && `${playingPads.size} playing`}
          {isRecording && recordingPad !== null && ` • Recording Pad ${recordingPad + 1}`}
        </div>
      </div>

      {/* 4x4 Pad Grid */}
      <div 
        ref={gridRef}
        className="pad-container grid grid-cols-4 gap-2 justify-items-center"
      >
        {Array.from({ length: 16 }, (_, index) => {
          const pad = pads[index] || { sample: null };
          const isPlaying = playingPads.has(index);
          const isRecordingThis = isRecording && recordingPad === index;
          const isSelected = selectedPad === index;
          const keyLabel = getKeyLabel(index);

          return (
            <button
              key={index}
              onClick={() => handlePadClick(index, pad)}
              onDoubleClick={() => handlePadDoubleClick(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(index, e)}
              className={`pad-button ${getPadSizeClass()} rounded-lg border-2 transition-all duration-150 hover:scale-105 active:scale-95 relative ${
                getPadColor(pad, isPlaying, isRecordingThis, isSelected)
              } ${pad.sample ? 'cursor-pointer' : 'cursor-default'}`}
              title={pad.sample ? `${pad.sample.name || 'Sample'} (${keyLabel})` : `Empty Pad ${index + 1} (${keyLabel})`}
            >
              {/* Pad Number */}
              <div className="absolute top-1 left-1 text-xs font-bold opacity-75">
                {index + 1}
              </div>

              {/* Keyboard Key */}
              {keyboardMode && keyLabel && (
                <div className="absolute top-1 right-1 text-xs font-bold opacity-75">
                  {keyLabel}
                </div>
              )}

              {/* Sample Info */}
              {pad.sample ? (
                <div className="pad-content flex flex-col items-center justify-center h-full text-center p-1">
                  {/* Sample Type Icon */}
                  <div className="sample-icon text-lg mb-1">
                    {pad.sample.type === 'drum' ? '🥁' :
                     pad.sample.type === 'vocal' ? '🎤' :
                     pad.sample.type === 'melody' ? '🎵' :
                     pad.sample.type === 'fx' ? '✨' : '🎶'}
                  </div>
                  
                  {/* Sample Name */}
                  <div className="sample-name text-xs font-medium truncate w-full">
                    {pad.sample.name || 'Sample'}
                  </div>
                  
                  {/* Sample Length */}
                  {pad.sample.duration && (
                    <div className="sample-duration text-xs opacity-75 mt-1">
                      {(pad.sample.duration / 1000).toFixed(1)}s
                    </div>
                  )}
                </div>
              ) : (
                <div className="empty-content flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="text-lg">➕</div>
                  <div className="text-xs mt-1">Empty</div>
                </div>
              )}

              {/* Playing Animation */}
              {isPlaying && (
                <div className="absolute inset-0 rounded-lg border-2 border-white animate-pulse"></div>
              )}

              {/* Recording Animation */}
              {isRecordingThis && (
                <div className="absolute inset-0 rounded-lg bg-red-500 bg-opacity-50 animate-pulse"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid Info */}
      <div className="grid-info mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex justify-between items-center">
          <span>
            {pads.filter(p => p?.sample).length}/16 loaded
          </span>
          <span>
            {keyboardMode ? 'Keyboard enabled' : 'Click to trigger'}
          </span>
        </div>
        <div className="keyboard-help mt-1 text-xs text-gray-500">
          {keyboardMode && 'QWER / ASDF / ZXCV / 1234 - Trigger pads'}
        </div>
      </div>
    </div>
  );
};

export default PadGrid;