import { useState, useCallback } from 'react';

/**
 * Custom hook to manage tracks loading, filtering, and sorting
 */
export function useTracks() {
  const [tracks, setTracks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('title'); // title, artist, album, bpm, duration, dateAdded
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc

  const loadTracks = useCallback(async () => {
    try {
      const result = await window.api.invoke('library:getTracks', {});
      if (result && Array.isArray(result)) {
        setTracks(result);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
      throw err;
    }
  }, []);

  const filteredTracks = tracks.filter(track => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.title?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query) ||
      track.filename?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    let aVal, bVal;
    
    switch (sortBy) {
      case 'title':
        aVal = (a.title || '').toLowerCase();
        bVal = (b.title || '').toLowerCase();
        break;
      case 'artist':
        aVal = (a.artist || '').toLowerCase();
        bVal = (b.artist || '').toLowerCase();
        break;
      case 'album':
        aVal = (a.album || '').toLowerCase();
        bVal = (b.album || '').toLowerCase();
        break;
      case 'bpm':
        aVal = a.bpm || 0;
        bVal = b.bpm || 0;
        break;
      case 'duration':
        aVal = a.duration || 0;
        bVal = b.duration || 0;
        break;
      case 'dateAdded':
        aVal = a.id || 0; // Assuming ID reflects insertion order
        bVal = b.id || 0;
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return {
    tracks,
    setTracks,
    filteredTracks,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    loadTracks
  };
}
