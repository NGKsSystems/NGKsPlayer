import React, { useState } from 'react';
import { formatTime } from '../utils/timeUtils';

const ClipsList = ({ clips, onDeleteClip, onUpdateClip, audioBuffer, audioContext }) => {
  const [playingClipId, setPlayingClipId] = useState(null);
  const [editingClipId, setEditingClipId] = useState(null);
  const [editName, setEditName] = useState('');

  const handlePlayClip = (clip) => {
    if (playingClipId === clip.id) {
      setPlayingClipId(null);
      return;
    }

    try {
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.8;

      source.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const startTime = clip.startTime / 1000; // ms to seconds
      const duration = (clip.endTime - clip.startTime) / 1000;

      source.start(0, startTime, duration);
      setPlayingClipId(clip.id);

      source.onended = () => {
        setPlayingClipId(null);
      };
    } catch (error) {
      console.error('Failed to play clip:', error);
    }
  };

  const handleEditClip = (clip) => {
    setEditingClipId(clip.id);
    setEditName(clip.name);
  };

  const handleSaveName = (clip) => {
    if (editName.trim()) {
      onUpdateClip(clip.id, { name: editName });
    }
    setEditingClipId(null);
  };

  return (
    <div className="clips-list">
      <div className="list-header">
        <h3>📋 Clips ({clips.length})</h3>
      </div>

      <div className="clips-container">
        {clips.length === 0 ? (
          <div className="empty-state">
            <p>No clips yet</p>
            <p className="hint">Mark in/out points and click "Create Clip"</p>
          </div>
        ) : (
          clips.map((clip) => (
            <div key={clip.id} className="clip-item">
              <div className="clip-info">
                <div className="clip-header">
                  {editingClipId === clip.id ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="clip-name-edit"
                      autoFocus
                      onBlur={() => handleSaveName(clip)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName(clip)}
                    />
                  ) : (
                    <h4 onClick={() => handleEditClip(clip)}>{clip.name}</h4>
                  )}
                </div>

                <div className="clip-times">
                  <span className="time-badge in">
                    In: {formatTime(clip.startTime)}
                  </span>
                  <span className="time-badge out">
                    Out: {formatTime(clip.endTime)}
                  </span>
                  <span className="time-badge duration">
                    {formatTime(clip.duration)}
                  </span>
                </div>
              </div>

              <div className="clip-actions">
                <button
                  className={`btn-clip ${playingClipId === clip.id ? 'playing' : ''}`}
                  onClick={() => handlePlayClip(clip)}
                  title="Preview"
                >
                  {playingClipId === clip.id ? '⏹' : '▶'}
                </button>

                <button
                  className="btn-clip btn-delete"
                  onClick={() => {
                    if (confirm(`Delete "${clip.name}"?`)) {
                      onDeleteClip(clip.id);
                    }
                  }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ClipsList;
