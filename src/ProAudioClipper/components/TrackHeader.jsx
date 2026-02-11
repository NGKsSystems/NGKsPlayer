/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TrackHeader.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Volume2, VolumeX, Headphones, Edit3, Trash2, 
  ChevronUp, ChevronDown, MoreVertical, Eye, EyeOff,
  Rewind, FastForward, RotateCcw, Sliders
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
  onOpenEffects,
  onContextMenu,
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

    if (typeof document === 'undefined') return;

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
    console.log('🔘 More actions clicked, current state:', showControls);
    
    if (!showControls && moreActionsRef.current) {
      const rect = moreActionsRef.current.getBoundingClientRect();
      const menuWidth = 150;
      const menuHeight = 80; // Approximate menu height
      const viewportWidth = typeof document !== 'undefined' ? document.documentElement.clientWidth : 1920;
      const viewportHeight = typeof document !== 'undefined' ? document.documentElement.clientHeight : 1080;
      const spaceOnRight = viewportWidth - rect.right;
      const spaceBelow = viewportHeight - rect.bottom;
      
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
      left = Math.max(10, Math.min(left, viewportWidth - menuWidth - 10));
      top = Math.max(10, Math.min(top, viewportHeight - menuHeight - 10));
      
      setMenuPosition({ 
        position: 'fixed',
        top: `${top}px`, 
        left: `${left}px`,
        right: 'auto' 
      });
    }
    
    setShowControls(!showControls);
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
      onClick={() => onSelect && onSelect(track.id)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!showControls) {
          const menuWidth = 150;
          const menuHeight = 180;
          const viewportWidth = typeof document !== 'undefined' ? document.documentElement.clientWidth : 1920;
          const viewportHeight = typeof document !== 'undefined' ? document.documentElement.clientHeight : 1080;
          let top = e.clientY;
          let left = e.clientX;
          if (left + menuWidth > viewportWidth) left = viewportWidth - menuWidth - 10;
          if (top + menuHeight > viewportHeight) top = viewportHeight - menuHeight - 10;
          setMenuPosition({ position: 'fixed', top: `${top}px`, left: `${left}px`, right: 'auto' });
        }
        setShowControls(!showControls);
        onContextMenu?.(e);
      }}
    >
      {/* Track Name */}
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
      </div>

      {/* Buttons: Play, Mute, Solo */}
      <div className="track-main-controls">
        <button
          className="track-control-btn"
          onClick={(e) => {
            e.stopPropagation();
          }}
          title="Play"
        >
          ▶
        </button>
        <button
          className={`track-control-btn mute-btn ${track.muted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onMute(track.id);
          }}
          title={track.muted ? 'Unmute' : 'Mute'}
        >
          M
        </button>
        <button
          className={`track-control-btn solo-btn ${track.solo ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onSolo(track.id);
          }}
          title={track.solo ? 'Unsolo' : 'Solo'}
        >
          S
        </button>
      </div>

      {/* Context menu for reorder/rename/delete (right-click) */}
      {showControls && (
        <div 
          className="actions-menu"
          ref={moreActionsRef}
          style={menuPosition}
        >
          <button
            className="menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
              setShowControls(false);
            }}
            disabled={!canMoveUp}
          >
            <ChevronUp size={12} />
            Move Up
          </button>
          <button
            className="menu-item"
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
              setShowControls(false);
            }}
            disabled={!canMoveDown}
          >
            <ChevronDown size={12} />
            Move Down
          </button>
          <button
            className="menu-item"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenEffects) onOpenEffects(track.id);
              setShowControls(false);
            }}
          >
            <Sliders size={12} />
            Effects
          </button>
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
  );
};

export default TrackHeader;
