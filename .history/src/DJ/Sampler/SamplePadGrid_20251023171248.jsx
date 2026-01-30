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
      <div className="grid-header">
        <h3>Sample Pads (100)</h3>
        <div className="grid-info">
          {samples.length} loaded
        </div>
      </div>

      <div className="pads-scroll-container">
        <div className="pads-grid">
          {paddedSamples.map((sample, index) => (
            <div 
              key={index} 
              className={`sample-pad ${sample ? 'filled' : 'empty'} ${playingIndex === index ? 'playing' : ''}`}
            >
              {sample ? (
                <>
                  <div className="pad-content">
                    <div className="pad-name" title={sample.name}>
                      {sample.name.length > 12 
                        ? sample.name.substring(0, 10) + '...' 
                        : sample.name}
                    </div>

                    <div className="pad-controls">
                      <button
                        className="pad-btn play-btn"
                        onClick={() => playingIndex === index 
                          ? handleStopSample(index)
                          : handlePlaySample(sample, index)
                        }
                        title={playingIndex === index ? 'Stop' : 'Play'}
                      >
                        {playingIndex === index ? '⏹' : '▶'}
                      </button>

                      <button
                        className={`pad-btn output-btn ${sample.output === 'cue' ? 'cue' : 'main'}`}
                        onClick={() => toggleOutput(sample)}
                        title={`Output: ${sample.output}`}
                      >
                        {sample.output === 'cue' ? '🎧' : '📊'}
                      </button>

                      <button
                        className="pad-btn delete-btn"
                        onClick={() => handleDeleteSample(sample)}
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="pad-empty">
                  <span className="pad-number">{index + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SamplePadGrid;
