import React, { useState, useCallback, useEffect, useMemo } from 'react';
import DraggableWidget from '../../DraggableWidget.minimal';
import TrackBrowser from '../TrackBrowser';
import SearchFilter from '../SearchFilter';
import TrackList from '../TrackList';
import PlaylistManager from '../PlaylistManager';

const LibraryWidget = ({
  deck = 'B',
  onTrackLoad = () => {},
  onTrackPreview = () => {},
  tracks = [],
  isLoading = false
}) => {
  const [libraryState, setLibraryState] = useState(() => {
    // Try to load from localStorage
    try {
      const saved = localStorage.getItem(`library-${deck}-state`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silent error handling
    }
    
    // Default state
    return {
      selectedTrack: null,
      currentPath: '',
      searchTerm: '',
      filters: {
        genre: '',
        artist: '',
        bpmMin: '',
        bpmMax: '',
        durationMin: '',
        durationMax: '',
        fileType: ''
      },
      playlists: [],
      currentPlaylist: null,
      viewMode: 'browser' // 'browser', 'playlist'
    };
  });

  const [libraryControls, setLibraryControls] = useState(() => {
    // Try to load layout from localStorage
    try {
      const saved = localStorage.getItem(`library-${deck}-controls`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      // Silent error handling
    }
    
    // Default layout - positioned for deck B (right side)
    const isLeftDeck = deck === 'A';
    return {
      searchFilter: { 
        x: isLeftDeck ? 10 : 500, 
        y: 10, 
        width: 280, 
        height: 320, 
        minimized: false 
      },
      trackBrowser: { 
        x: isLeftDeck ? 300 : 790, 
        y: 10, 
        width: 400, 
        height: 350, 
        minimized: false 
      },
      trackList: { 
        x: isLeftDeck ? 10 : 500, 
        y: 340, 
        width: 350, 
        height: 300, 
        minimized: false 
      },
      playlistManager: { 
        x: isLeftDeck ? 370 : 860, 
        y: 340, 
        width: 330, 
        height: 300, 
        minimized: false 
      }
    };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`library-${deck}-state`, JSON.stringify(libraryState));
    } catch (error) {
      console.warn('Failed to save library state to localStorage:', error);
    }
  }, [libraryState, deck]);

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`library-${deck}-controls`, JSON.stringify(libraryControls));
    } catch (error) {
      console.warn('Failed to save library controls to localStorage:', error);
    }
  }, [libraryControls, deck]);

  // Process and filter tracks
  const processedTracks = useMemo(() => {
    let filtered = [...tracks];
    
    // Apply search filter
    if (libraryState.searchTerm) {
      const searchLower = libraryState.searchTerm.toLowerCase();
      filtered = filtered.filter(track => 
        (track.title || '').toLowerCase().includes(searchLower) ||
        (track.artist || '').toLowerCase().includes(searchLower) ||
        (track.album || '').toLowerCase().includes(searchLower) ||
        (track.genre || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Apply filters
    const { filters } = libraryState;
    
    if (filters.genre) {
      filtered = filtered.filter(track => track.genre === filters.genre);
    }
    
    if (filters.artist) {
      filtered = filtered.filter(track => track.artist === filters.artist);
    }
    
    if (filters.bpmMin || filters.bpmMax) {
      filtered = filtered.filter(track => {
        const bpm = parseInt(track.bpm) || 0;
        if (filters.bpmMin && bpm < parseInt(filters.bpmMin)) return false;
        if (filters.bpmMax && bpm > parseInt(filters.bpmMax)) return false;
        return true;
      });
    }
    
    if (filters.durationMin || filters.durationMax) {
      filtered = filtered.filter(track => {
        const duration = (track.duration || 0) / 60; // Convert to minutes
        if (filters.durationMin && duration < parseFloat(filters.durationMin)) return false;
        if (filters.durationMax && duration > parseFloat(filters.durationMax)) return false;
        return true;
      });
    }
    
    if (filters.fileType) {
      filtered = filtered.filter(track => {
        const ext = track.filePath?.split('.').pop()?.toLowerCase();
        return ext === filters.fileType;
      });
    }
    
    return filtered;
  }, [tracks, libraryState.searchTerm, libraryState.filters]);

  // Extract unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const genres = [...new Set(tracks.map(t => t.genre).filter(Boolean))].sort();
    const artists = [...new Set(tracks.map(t => t.artist).filter(Boolean))].sort();
    
    return { genres, artists };
  }, [tracks]);

  // Event handlers
  const handleTrackSelect = useCallback((track) => {
    setLibraryState(prev => ({
      ...prev,
      selectedTrack: track
    }));
  }, []);

  const handleTrackLoad = useCallback((track) => {
    console.log(`[LibraryWidget ${deck}] 🎵 Loading track:`, track.title);
    onTrackLoad(track);
  }, [deck, onTrackLoad]);

  const handleTrackPreview = useCallback((track) => {
    console.log(`[LibraryWidget ${deck}] 👂 Previewing track:`, track.title);
    onTrackPreview(track);
  }, [deck, onTrackPreview]);

  const handlePathChange = useCallback((path) => {
    setLibraryState(prev => ({
      ...prev,
      currentPath: path
    }));
  }, []);

  const handleSearchChange = useCallback((searchTerm) => {
    setLibraryState(prev => ({
      ...prev,
      searchTerm
    }));
  }, []);

  const handleFilterChange = useCallback((filterType, value) => {
    setLibraryState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        [filterType]: value
      }
    }));
  }, []);

  const handlePlaylistCreate = useCallback((name) => {
    const newPlaylist = {
      id: Date.now().toString(),
      name,
      tracks: [],
      created: new Date().toISOString()
    };
    
    setLibraryState(prev => ({
      ...prev,
      playlists: [...prev.playlists, newPlaylist]
    }));
  }, []);

  const handlePlaylistLoad = useCallback((playlist) => {
    setLibraryState(prev => ({
      ...prev,
      currentPlaylist: playlist,
      viewMode: 'playlist'
    }));
  }, []);

  const handlePlaylistDelete = useCallback((playlist) => {
    setLibraryState(prev => ({
      ...prev,
      playlists: prev.playlists.filter(p => p.id !== playlist.id),
      currentPlaylist: prev.currentPlaylist?.id === playlist.id ? null : prev.currentPlaylist
    }));
  }, []);

  const handlePlaylistRename = useCallback((playlist, newName) => {
    setLibraryState(prev => ({
      ...prev,
      playlists: prev.playlists.map(p => 
        p.id === playlist.id ? { ...p, name: newName } : p
      )
    }));
  }, []);

  const handleTrackAdd = useCallback((playlist, track) => {
    setLibraryState(prev => ({
      ...prev,
      playlists: prev.playlists.map(p => 
        p.id === playlist.id 
          ? { ...p, tracks: [...(p.tracks || []), track] }
          : p
      )
    }));
  }, []);

  const handleTrackRemove = useCallback((playlist, track) => {
    setLibraryState(prev => ({
      ...prev,
      playlists: prev.playlists.map(p => 
        p.id === playlist.id 
          ? { ...p, tracks: (p.tracks || []).filter(t => t !== track) }
          : p
      )
    }));
  }, []);

  const handleControlUpdate = useCallback((controlId, updates) => {
    setLibraryControls(prev => ({
      ...prev,
      [controlId]: { ...prev[controlId], ...updates }
    }));
  }, []);

  // Get tracks to display (filtered or playlist)
  const displayTracks = libraryState.viewMode === 'playlist' && libraryState.currentPlaylist
    ? libraryState.currentPlaylist.tracks || []
    : processedTracks;

  return (
    <div className={`library-widget library-${deck.toLowerCase()}`}>
      <div className="library-workspace">
        {/* Search & Filter */}
        <DraggableWidget
          id={`library-search-${deck}`}
          title={`Library ${deck} - Search & Filter`}
          initialPosition={{ x: deck === 'A' ? 10 : 500, y: 10 }}
          initialSize={{ width: 280, height: 320 }}
          onUpdate={(updates) => handleControlUpdate('searchFilter', updates)}
          className="library-sub-widget"
        >
          <SearchFilter
            searchTerm={libraryState.searchTerm}
            filters={libraryState.filters}
            onSearchChange={handleSearchChange}
            onFilterChange={handleFilterChange}
            availableGenres={filterOptions.genres}
            availableArtists={filterOptions.artists}
            trackCount={processedTracks.length}
          />
        </DraggableWidget>

        {/* Track Browser */}
        <DraggableWidget
          id={`library-browser-${deck}`}
          title={`Library ${deck} - Track Browser`}
          initialPosition={{ x: deck === 'A' ? 300 : 790, y: 10 }}
          initialSize={{ width: 400, height: 350 }}
          onUpdate={(updates) => handleControlUpdate('trackBrowser', updates)}
          className="library-sub-widget"
        >
          <TrackBrowser
            tracks={processedTracks}
            currentPath={libraryState.currentPath}
            onPathChange={handlePathChange}
            onTrackSelect={handleTrackSelect}
            onTrackLoad={handleTrackLoad}
            selectedTrack={libraryState.selectedTrack}
            isLoading={isLoading}
          />
        </DraggableWidget>

        {/* Track List */}
        <DraggableWidget
          id={`library-tracks-${deck}`}
          title={`Library ${deck} - Track List`}
          initialPosition={{ x: deck === 'A' ? 10 : 500, y: 340 }}
          initialSize={{ width: 350, height: 300 }}
          onUpdate={(updates) => handleControlUpdate('trackList', updates)}
          className="library-sub-widget"
        >
          <TrackList
            tracks={displayTracks}
            selectedTrack={libraryState.selectedTrack}
            onTrackSelect={handleTrackSelect}
            onTrackLoad={handleTrackLoad}
            onTrackPreview={handleTrackPreview}
            isLoading={isLoading}
            deck={deck}
          />
        </DraggableWidget>

        {/* Playlist Manager */}
        <DraggableWidget
          id={`library-playlists-${deck}`}
          title={`Library ${deck} - Playlists`}
          initialPosition={{ x: deck === 'A' ? 370 : 860, y: 340 }}
          initialSize={{ width: 330, height: 300 }}
          onUpdate={(updates) => handleControlUpdate('playlistManager', updates)}
          className="library-sub-widget"
        >
          <PlaylistManager
            playlists={libraryState.playlists}
            currentPlaylist={libraryState.currentPlaylist}
            onPlaylistCreate={handlePlaylistCreate}
            onPlaylistLoad={handlePlaylistLoad}
            onPlaylistDelete={handlePlaylistDelete}
            onPlaylistRename={handlePlaylistRename}
            onTrackAdd={handleTrackAdd}
            onTrackRemove={handleTrackRemove}
            selectedTrack={libraryState.selectedTrack}
            deck={deck}
          />
        </DraggableWidget>
      </div>
    </div>
  );
};

export default LibraryWidget;