import React, { useState } from 'react';

const SamplePadGrid = ({ samples, onDeleteSample, audioManager }) => {
  const [playingIndex, setPlayingIndex] = useState(null);
  const audioContextRef = React.useRef({});

  const handlePlaySample = async (sample, index) => {
    try {
      if (!audioManager) {
        console.error('AudioManager not available');
        return;
      }

      // Stop any currently playing sample
      if (playingIndex !== null && audioContextRef.current[playingIndex]) {
        audioContextRef.current[playingIndex].stop();
      }

      setPlayingIndex(index);

      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const arrayBuffer = sample.data;
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      // Create source and connect to destination based on output selection
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      // Route based on output selection
      if (sample.output === 'cue') {
        // Route to cue output
        if (audioManager.headphonesMix) {
          source.connect(audioManager.headphonesMix);
        } else {
          source.connect(audioContext.destination);
        }
      } else {
        // Route to main output
        if (audioManager.masterGainNode) {
          source.connect(audioManager.masterGainNode);
        } else {
          source.connect(audioContext.destination);
        }
      }

      // Set volume
      source.volume = (sample.volume || 100) / 100;

      // Play
      source.start(0);
      audioContextRef.current[index] = source;

      // Clear playing state when done
      source.onended = () => {
        setPlayingIndex(null);
        delete audioContextRef.current[index];
      };
    } catch (error) {
      console.error('Failed to play sample:', error);
      setPlayingIndex(null);
    }
  };

  const handleStopSample = (index) => {
    if (audioContextRef.current[index]) {
      audioContextRef.current[index].stop();
      delete audioContextRef.current[index];
      setPlayingIndex(null);
    }
  };

  const toggleOutput = (sample) => {
    // Update sample output selection (would need DB update)
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
