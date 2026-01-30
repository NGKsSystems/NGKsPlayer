import React, { useState, useCallback } from 'react';
import { 
  Volume2, VolumeX, Headphones, Edit3, Trash2, 
  ChevronUp, ChevronDown, MoreVertical, Eye, EyeOff 
} from 'lucide-react';

/**
 * TrackHeader Component
 * 
 * Professional track control interface inspired by Adobe Premiere/DaVinci Resolve:
 * - Mute/Solo controls
 * - Volume fader
 * - Pan control
 * - Track name editing
 * - Track color indicator
 * - Delete/reorder controls
 */
const TrackHeader = ({ 
  track, 
  isActive, 
  onSelect, 
  onMute, 
  onSolo, 
  onVolumeChange, 
  onPanChange, 
  onNameChange, 
  onDelete, 
  onMoveUp, 
  onMoveDown,
  canMoveUp = true,
  canMoveDown = true,
  style = {}
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(track.name);
  const [showControls, setShowControls] = useState(false);

  // Handle name editing
  const handleNameEdit = useCallback(() => {
    setIsEditing(true);
    setEditName(track.name);
  }, [track.name]);

  const handleNameSave = useCallback(() => {
    if (editName.trim() && editName !== track.name) {
      onNameChange(track.id, editName.trim());
    }
    setIsEditing(false);
  }, [editName, track.id, track.name, onNameChange]);

  const handleNameCancel = useCallback(() => {
    setEditName(track.name);
    setIsEditing(false);
  }, [track.name]);

  // Volume helpers
  const volumeToDb = (volume) => {
    if (!volume || volume === 0) return -60;
    return 20 * Math.log10(volume);
  };

  const dbToVolume = (db) => {
    if (!db || db <= -60) return 0;
    return Math.pow(10, db / 20);
  };

  const formatVolume = (volume) => {
    if (!volume || volume === 0) return '-∞ dB';
    const db = volumeToDb(volume);
    return `${db >= 0 ? '+' : ''}${db?.toFixed(1) || '0.0'} dB`;
  };

  // Pan helpers
  const formatPan = (pan) => {
    if (!pan || pan === 0) return 'C';
    if (pan < 0) return `L${Math.abs(pan * 100)?.toFixed(0) || '0'}`;
    return `R${(pan * 100)?.toFixed(0) || '0'}`;
  };

  return (
    <div 
      className={`track-header ${isActive ? 'active' : ''}`}
      style={style}
      onClick={() => onSelect(track.id)}
    >
      {/* Track Color Indicator */}
      <div 
        className="track-color-indicator"
        style={{ backgroundColor: track.color }}
      />

      {/* Track Info */}
      <div className="track-info">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSave();
              if (e.key === 'Escape') handleNameCancel();
            }}
            className="track-name-input"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="track-name" onDoubleClick={handleNameEdit}>
            {track.name}
          </div>
        )}
        
        {track.audioBuffer && (
          <div className="track-details">
            {track.audioBuffer?.numberOfChannels || 2}ch • {((track.audioBuffer?.sampleRate || 44100) / 1000).toFixed(1)}kHz
          </div>
        )}
      </div>

      {/* Main Controls */}
      <div className="track-main-controls">
        {/* Mute Button */}
        <button
          className={`track-control-btn mute-btn ${track.muted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onMute(track.id);
          }}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          {track.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        {/* Solo Button */}
        <button
          className={`track-control-btn solo-btn ${track.solo ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSolo(track.id);
          }}
          title={track.solo ? 'Unsolo' : 'Solo'}
        >
          <Headphones size={14} />
        </button>
      </div>

      {/* Extended Controls (shown on hover/click) */}
      <div className="track-extended-controls">
        {/* Volume Control */}
        <div className="control-group">
          <label className="control-label">Volume</label>
          <div className="volume-control">
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={track.volume || 1}
              onChange={(e) => onVolumeChange(track.id, parseFloat(e.target.value))}
              className="volume-slider"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="volume-display">
              {formatVolume(track.volume || 1)}
            </div>
          </div>
        </div>

        {/* Pan Control */}
        <div className="control-group">
          <label className="control-label">Pan</label>
          <div className="pan-control">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.01"
              value={track.pan}
              onChange={(e) => onPanChange(track.id, parseFloat(e.target.value))}
              className="pan-slider"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="pan-display">
              {formatPan(track.pan)}
            </div>
          </div>
        </div>
      </div>

      {/* Track Actions */}
      <div className="track-actions">
        {/* Reorder Controls */}
        <div className="reorder-controls">
          <button
            className="track-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            title="Move track up"
          >
            <ChevronUp size={12} />
          </button>
          <button
            className="track-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            title="Move track down"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* More Actions Menu */}
        <div className="more-actions">
          <button
            className="track-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowControls(!showControls);
            }}
            title="More options"
          >
            <MoreVertical size={12} />
          </button>
          
          {showControls && (
            <div className="actions-menu">
              <button
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNameEdit();
                  setShowControls(false);
                }}
              >
                <Edit3 size={12} />
                Rename
              </button>
              <button
                className="menu-item delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete track "${track.name}"?`)) {
                    onDelete(track.id);
                  }
                  setShowControls(false);
                }}
              >
                <Trash2 size={12} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackHeader;