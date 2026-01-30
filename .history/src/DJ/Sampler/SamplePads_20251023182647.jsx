import React, { useState, useRef } from 'react';

const SamplePads = ({ samples }) => {
  const [playingId, setPlayingId] = useState(null);
  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());
  const sourceNodesRef = useRef({});

  const handlePlay = async (sample) => {
    try {
      const audioContext = audioContextRef.current;

      if (playingId === sample.id && sourceNodesRef.current[sample.id]) {
        sourceNodesRef.current[sample.id].stop();
        delete sourceNodesRef.current[sample.id];
        setPlayingId(null);
        return;
      }

      if (playingId !== null && sourceNodesRef.current[playingId]) {
        sourceNodesRef.current[playingId].stop();
        delete sourceNodesRef.current[playingId];
      }

      setPlayingId(sample.id);

      const audioBuffer = await audioContext.decodeAudioData(sample.data);
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 1;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      sourceNodesRef.current[sample.id] = source;
      source.start(0);

      source.onended = () => {
        setPlayingId(null);
        delete sourceNodesRef.current[sample.id];
      };
    } catch (error) {
      console.error('Failed to play sample:', error);
      setPlayingId(null);
    }
  };

  return (
    <div className="sample-pads">
      <h3>Sample Pads ({samples.length})</h3>
      <div className="pads-list">
        {samples.map((sample, index) => (
          <div
            key={sample.id}
            className={`sample-pad ${playingId === sample.id ? 'playing' : ''}`}
          >
            <div className="pad-label">{index + 1}</div>
            <div className="pad-name">{sample.name}</div>
            <button
              className="pad-play"
              onClick={() => handlePlay(sample)}
            >
              {playingId === sample.id ? '⏹' : '▶'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SamplePads;
