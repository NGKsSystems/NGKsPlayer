import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Volume2, VolumeX, Headphones, Edit3, Trash2, 
  ChevronUp, ChevronDown, MoreVertical, Eye, EyeOff,
  Rewind, FastForward, RotateCcw
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
  onPlaybackRateChange,
  onReverseToggle,
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
  const [menuPosition, setMenuPosition] = useState({ position: 'fixed', top: '0px', left: '0px' });
  const moreActionsRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
        setShowControls(false);
      }
    };

    if (showControls) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showControls]);

  // Handle more actions menu positioning
  const handleMoreActionsClick = useCallback((e) => {
    e.stopPropagation();
    console.log('More actions clicked, showControls was:', showControls);
    
    if (!showControls && moreActionsRef.current) {
      const rect = moreActionsRef.current.getBoundingClientRect();
      console.log('Button rect:', rect);
      const menuWidth = 150;
      const menuHeight = 80; // Approximate menu height
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      let top = rect.bottom + 5; // Position below the button
      let left = rect.right - menuWidth; // Align right edge
      
      // Adjust if menu would go off-screen on the right
      if (spaceOnRight < menuWidth) {
        left = rect.left; // Align to left edge of button
      }
      
      // Adjust if menu would go off-screen at the bottom
      if (spaceBelow < menuHeight) {
        top = rect.top - menuHeight - 5; // Position above the button
      }
      
      // Ensure menu stays within screen bounds
      left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));
      top = Math.max(10, Math.min(top, window.innerHeight - menuHeight - 10));
      
      const newPosition = { 
        position: 'fixed',
        top: `${top}px`, 
        left: `${left}px`,
        right: 'auto' 
      };
      
      console.log('Setting menu position:', newPosition);
      setMenuPosition(newPosition);
    }
    
    setShowControls(!showControls);
    console.log('Setting showControls to:', !showControls);
  }, [showControls]);

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
        
        {/* Audio info removed to save space */}

        {/* Main Controls - Now inside track-info for better visibility */}
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
            {track.muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
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
            <Headphones size={12} />
          </button>

          {/* Speed Control */}
          <div className="speed-control" title={`Speed: ${(track.playbackRate || 1).toFixed(1)}x`}>
            <input
              type="range"
              min="0.1"
              max="4.0"
              step="0.1"
              value={track.playbackRate || 1.0}
              onChange={(e) => {
                e.stopPropagation();
                onPlaybackRateChange && onPlaybackRateChange(track.id, parseFloat(e.target.value));
              }}
              className="speed-slider"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="speed-presets">
              {[0.5, 1.0, 1.5, 2.0].map(rate => (
                <button
                  key={rate}
                  className={`speed-preset-btn ${Math.abs((track.playbackRate || 1.0) - rate) < 0.05 ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlaybackRateChange && onPlaybackRateChange(track.id, rate);
                  }}
                  title={`Set speed to ${rate}x`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          {/* Reverse Button */}
          <button
            className={`track-control-btn reverse-btn ${track.reversed ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onReverseToggle && onReverseToggle(track.id);
            }}
            title={track.reversed ? 'Disable Reverse Playback (Currently Playing Backwards)' : 'Enable Reverse Playback (Play Backwards)'}
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* Extended Controls - REMOVED since we have master controls */}
      
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
        <div className="more-actions" ref={moreActionsRef}>
          <button
            className="track-action-btn"
            onClick={handleMoreActionsClick}
            title="More options"
          >
            <MoreVertical size={12} />
          </button>
          
          {showControls && (
            <div 
              className="actions-menu"
              style={{
                ...menuPosition,
                background: '#ff0000', // Temporary red background for debugging
                border: '3px solid #00ff00' // Temporary green border for debugging
              }}
            >
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