import React, { useState, useRef } from 'react';

const SamplePadGrid = ({ samples, onDeleteSample, audioManager }) => {
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceNodesRef = useRef({});

  const handlePlaySample = async (sample, index) => {
    try {
      const audioContext = audioContextRef.current;

      // Stop any currently playing sample
      if (playingIndex !== null && sourceNodesRef.current[playingIndex]) {
        sourceNodesRef.current[playingIndex].stop();
        delete sourceNodesRef.current[playingIndex];
      }

      setPlayingIndex(index);

      // Decode audio data
      const arrayBuffer = sample.data;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create source
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Create gain node for volume control
      const gainNode = audioContext.createGain();
      gainNode.gain.value = (sample.volume || 100) / 100;

      // Connect to destination
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Store reference
      sourceNodesRef.current[index] = source;

      // Play
      source.start(0);

      // Clear playing state when done
      source.onended = () => {
        setPlayingIndex(null);
        delete sourceNodesRef.current[index];
      };
    } catch (error) {
      console.error('Failed to play sample:', error);
      setPlayingIndex(null);
    }
  };

  const handleStopSample = (index) => {
    if (sourceNodesRef.current[index]) {
      sourceNodesRef.current[index].stop();
      delete sourceNodesRef.current[index];
      setPlayingIndex(null);
    }
  };

  const toggleOutput = (sample) => {
    // Update sample output selection
    sample.output = sample.output === 'main' ? 'cue' : 'main';
  };

  const handleDeleteSample = async (sample) => {
    if (confirm(`Delete sample: ${sample.name}?`)) {
      await onDeleteSample(sample.id);
    }
  };

  // Pad up to 100 samples with empty slots
  const paddedSamples = Array(100)
    .fill(null)
    .map((_, i) => samples[i] || null);

  return (
    <div className="sample-pad-grid">
      {/* Header */}
      <div className="grid-header">
        <h3>Sample Pads (100)</h3>
        <div className="grid-info">
          {assignedCount} / 100 assigned
        </div>
      </div>

      {/* Pad Grid */}
      <div className="pads-scroll-container">
        <div className="pads-grid">
          {Array(100).fill(null).map((_, index) => {
            const padNumber = index + 1;
            const sample = getPadSample(padNumber);
            const isPlaying = playingPad === padNumber;
            const isSelected = selectedPad === padNumber;

            return (
              <div
                key={padNumber}
                className={`sample-pad ${sample ? 'filled' : 'empty'} ${isPlaying ? 'playing' : ''} ${isSelected ? 'selected' : ''}`}
                onDragOver={(e) => handleDragOver(e, padNumber)}
                onDrop={(e) => handleDropOnPad(e, padNumber)}
                onContextMenu={(e) => handleContextMenu(e, padNumber)}
                onClick={() => setSelectedPad(selectedPad === padNumber ? null : padNumber)}
                title={sample ? `${sample.name}\n\nRight-click to unassign` : `Pad ${padNumber}\n\nDrag sample to assign`}
              >
                {sample ? (
                  <div className="pad-content">
                    <div className="pad-name" title={sample.name}>
                      {sample.name.length > 12
                        ? sample.name.substring(0, 10) + '...'
                        : sample.name}
                    </div>

                    <div className="pad-controls">
                      <button
                        className="pad-btn play-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlaySample(sample, padNumber);
                        }}
                        title={isPlaying ? 'Stop' : 'Play'}
                      >
                        {isPlaying ? '⏹' : '▶'}
                      </button>

                      <button
                        className="pad-btn delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdatePadAssignment(padNumber, null);
                        }}
                        title="Unassign (or right-click)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pad-empty">
                    <span className="pad-number">{padNumber}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Available Samples Section */}
      {Array.isArray(samples) && samples.length > 0 && (
        <div className="available-samples">
          <h4>📂 Available Samples ({samples.length})</h4>
          <p className="samples-hint">Drag to pads to assign</p>
          <div className="samples-list">
            {samples.map((sample) => (
              <div
                key={sample.id}
                className={`sample-item ${draggedSample?.id === sample.id ? 'dragging' : ''}`}
                draggable
                onDragStart={() => setDraggedSample(sample)}
                onDragEnd={() => setDraggedSample(null)}
                title={`Click to assign to selected pad\n\nDrag to a specific pad to assign`}
              >
                {sample.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!Array.isArray(samples) || samples.length === 0 && (
        <div className="samples-empty">
          <p>📁 No samples loaded</p>
          <p>Load samples using the browser on the left</p>
        </div>
      )}
    </div>
  );
};

export default SamplePadGrid;
