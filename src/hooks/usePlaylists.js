/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: usePlaylists.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useCallback } from 'react';

/**
 * Custom hook to manage playlists
 */
export function usePlaylists(showToast) {
  const [playlists, setPlaylists] = useState([]);

  const loadPlaylists = useCallback(async () => {
    try {
      console.log('[usePlaylists] Loading playlists...');
      const result = await window.api.listPlaylists();
      console.log('[usePlaylists] Playlists loaded:', result);
      if (result && Array.isArray(result)) {
        setPlaylists(result);
      }
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  }, []);

  const addToPlaylist = useCallback(async (track, playlistId) => {
    try {
      console.log('[usePlaylists] Adding track to playlist:', track.title, playlistId);
      await window.api.addTrackToPlaylist(playlistId, track.id);
      const playlist = playlists.find(p => p.id === playlistId);
      showToast(`Added "${track.title}" to ${playlist?.name}`, 'success');
      return true;
    } catch (err) {
      console.error('Failed to add to playlist:', err);
      showToast('Failed to add to playlist', 'error');
      return false;
    }
  }, [playlists, showToast]);

  const createNewPlaylist = useCallback(async (name, track = null) => {
    if (!name.trim()) {
      showToast('Please enter a playlist name', 'error');
      return null;
    }
    
    try {
      const newPlaylist = await window.api.createPlaylist(name.trim());
      if (track) {
        await window.api.addTrackToPlaylist(newPlaylist.id, track.id);
        showToast(`Created playlist "${name}" and added track`, 'success');
      } else {
        showToast(`Created playlist "${name}"`, 'success');
      }
      await loadPlaylists(); // Reload playlists
      return newPlaylist;
    } catch (err) {
      console.error('Failed to create playlist:', err);
      showToast('Failed to create playlist', 'error');
      return null;
    }
  }, [showToast, loadPlaylists]);

  return {
    playlists,
    loadPlaylists,
    addToPlaylist,
    createNewPlaylist
  };
}

