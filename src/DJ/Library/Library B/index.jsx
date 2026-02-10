/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import './styles.css';

const LibraryB = ({ id, deck = 'B', onTrackLoad = () => {}, onTrackPreview = () => {}, onStyleChange = () => {}, tracks = [], isLoading = false, style = {}, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0 });
  const [currentStyle, setCurrentStyle] = useState({
    ...style,
    height: Math.max(480, style.height || 480) // Force minimum height of 480px
  });

  const [libraryState, setLibraryState] = useState(() => {
    try {
      const saved = localStorage.getItem('library-B-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure searchQuery is always a string and not "all"
        return {
          ...parsed,
          searchQuery: typeof parsed.searchQuery === 'string' && parsed.searchQuery !== 'all' ? parsed.searchQuery : ''
        };
      }
    } catch (error) {}
    
    return {
      searchQuery: '',
      selectedTrack: null,
      sortBy: 'title',
      sortOrder: 'asc',
      viewMode: 'list'
    };
  });

  const [localTracks, setLocalTracks] = useState([]);
  const [tracksLoading, setTracksLoading] = useState(false);

  // Load tracks from database on mount
  useEffect(() => {
    const loadTracks = async () => {
      try {
        setTracksLoading(true);
        if (window.api && window.api.getTracks) {
          const allTracks = await window.api.getTracks({});
          setLocalTracks(allTracks);
        }
      } catch (err) {
        console.error('Failed to load tracks:', err);
      } finally {
        setTracksLoading(false);
      }
    };
    
    // Clear any invalid search query on mount
    if (libraryState.searchQuery === 'all' || typeof libraryState.searchQuery !== 'string') {
      setLibraryState(prev => ({ ...prev, searchQuery: '' }));
    }
    
    loadTracks();
  }, []);

  // Use provided tracks or local tracks
  const availableTracks = tracks.length > 0 ? tracks : localTracks;

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('library-B-state', JSON.stringify(libraryState));
    } catch (error) {}
  }, [libraryState]);

  // Drag handlers
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.library-b-header') && !e.target.closest('.search-input, .sort-btn')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - (currentStyle.left || 0),
        y: e.clientY - (currentStyle.top || 0)
      });
      e.preventDefault();
    }
  }, [currentStyle]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    setCurrentStyle(prev => ({
      ...prev,
      left: e.clientX - dragOffset.x,
      top: e.clientY - dragOffset.y
    }));
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleResizeMouseDown = useCallback((e) => {
    setIsResizing(true);
    setResizeStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResizeMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    setCurrentStyle(prev => ({
      ...prev,
      width: Math.max(250, (prev.width || 300) + deltaX),
      height: Math.max(300, (prev.height || 350) + deltaY)
    }));
    
    setResizeStart({ x: e.clientX, y: e.clientY });
  }, [isResizing, resizeStart]);

  const handleResizeMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMouseMove);
      document.addEventListener('mouseup', handleResizeMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMouseMove);
        document.removeEventListener('mouseup', handleResizeMouseUp);
      };
    }
  }, [isResizing, handleResizeMouseMove, handleResizeMouseUp]);

  useEffect(() => {
    // Only update style from props when NOT actively dragging/resizing
    if (!isDragging && !isResizing) {
      setCurrentStyle(style);
    }
  }, [style, isDragging, isResizing]);

  useEffect(() => {
    if (onStyleChange && (isDragging || isResizing)) {
      onStyleChange(id, {
        x: currentStyle.left,
        y: currentStyle.top,
        width: currentStyle.width,
        height: currentStyle.height
      });
    }
  }, [currentStyle, isDragging, isResizing, id, onStyleChange]);

  // Filter and sort tracks
  const filteredTracks = useMemo(() => {
    let filtered = availableTracks.filter(track => {
      if (!libraryState.searchQuery) return true;
      const query = libraryState.searchQuery.toLowerCase();
      return (
        track.artist?.toLowerCase().includes(query) ||
        track.title?.toLowerCase().includes(query) ||
        track.album?.toLowerCase().includes(query) ||
        track.genre?.toLowerCase().includes(query)
      );
    });

    // Sort tracks
    filtered.sort((a, b) => {
      let aVal = a[libraryState.sortBy] || '';
      let bVal = b[libraryState.sortBy] || '';
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return libraryState.sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [availableTracks, libraryState.searchQuery, libraryState.sortBy, libraryState.sortOrder]);

  const handleSearchChange = useCallback((e) => {
    setLibraryState(prev => ({
      ...prev,
      searchQuery: e.target.value
    }));
  }, []);

  const handleTrackSelect = useCallback((track) => {
    setLibraryState(prev => ({
      ...prev,
      selectedTrack: track
    }));
  }, []);

  const handleTrackDoubleClick = useCallback((track) => {
    onTrackLoad(track);
    // Also try to load to deck B
    if (window.electronAPI && window.electronAPI.send) {
      window.electronAPI.send('deck:loadTrack', {
        filePath: track.filePath,
        deck: 'B',
        track: track
      });
    }
  }, [onTrackLoad]);

  const handleSortChange = useCallback((sortBy) => {
    setLibraryState(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const formatDuration = (duration) => {
    if (!duration) return '--:--';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`library-${deck.toLowerCase()}-widget ${isDragging ? 'dragging' : ''}`}
      style={currentStyle} 
      onMouseDown={handleMouseDown}
      {...props}
    >
      <div className={`library-${deck.toLowerCase()}-header`}>
        <h3>Library {deck}</h3>
        <span className="track-count">{availableTracks.length}</span>
      </div>
      
      <div className={`library-${deck.toLowerCase()}-content`}>
        {/* Search Bar */}
        <div className="library-search">
          <input
            type="text"
            placeholder="Search tracks..."
            value={libraryState.searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>

        {/* Track List Header */}
        <div className="track-list-header">
          <button 
            className={`sort-btn track-column ${libraryState.sortBy === 'title' ? 'active' : ''}`}
            onClick={() => handleSortChange('title')}
          >
            TRACK {libraryState.sortBy === 'title' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-btn bpm-column ${libraryState.sortBy === 'bpm' ? 'active' : ''}`}
            onClick={() => handleSortChange('bpm')}
          >
            BPM {libraryState.sortBy === 'bpm' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-btn key-column ${libraryState.sortBy === 'key' ? 'active' : ''}`}
            onClick={() => handleSortChange('key')}
          >
            KEY {libraryState.sortBy === 'key' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            className={`sort-btn time-column ${libraryState.sortBy === 'duration' ? 'active' : ''}`}
            onClick={() => handleSortChange('duration')}
          >
            TIME {libraryState.sortBy === 'duration' && (libraryState.sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>

        {/* Track List */}
        <div className="track-list">
          {(isLoading || tracksLoading) ? (
            <div className="loading-message">Loading tracks...</div>
          ) : filteredTracks.length === 0 ? (
            <div className="no-tracks-message">
              {libraryState.searchQuery ? 'No tracks found' : 'No tracks loaded'}
            </div>
          ) : (
            filteredTracks.map((track, index) => (
              <div
                key={track.id || index}
                className={`track-row ${libraryState.selectedTrack?.id === track.id ? 'selected' : ''}`}
                onClick={() => handleTrackSelect(track)}
                onDoubleClick={() => handleTrackDoubleClick(track)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (track?.id && window.api?.invoke) {
                    window.api.invoke('tag-editor:open', track.id);
                  }
                }}
                title="Double-click to load | Right-click to edit metadata"
              >
                <div className="track-filename">
                  {track.title || 'Unknown Title'}
                </div>
                <div className="track-metadata">
                  <span>BPM: {track.bpm ? Math.round(track.bpm) : '--'}</span>
                  <span>Key: {track.key ? `${track.key}${track.mode?.charAt(0) || ''}` : '--'}</span>
                  <span>{formatDuration(track.duration)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Resize Handle */}
      <div 
        className={`resize-handle ${isResizing ? 'active' : ''}`}
        onMouseDown={handleResizeMouseDown}
        title="Drag to resize"
      >
        ⟲
      </div>
    </div>
  );
};

export default LibraryB;
