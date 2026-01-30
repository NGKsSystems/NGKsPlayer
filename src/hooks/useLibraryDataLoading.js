/**
 * Library Data Loading Hook
 * 
 * Properly handles IPC calls with error feedback
 * Problem Fixed: IPC failures had no error recovery
 * 
 * @module hooks/useLibraryDataLoading
 */

import { useCallback, useState } from 'react';
import { loadLibraryData, loadMultipleLibraryData } from '../services/LibraryIPCService';

/**
 * Hook to manage library data loading
 * @param {Function} setToast - Toast notification callback
 * @returns {Object} Loading functions and state
 */
export function useLibraryDataLoading(setToast) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load data for current tab
   */
  const loadForTab = useCallback(
    async (tab, setArtists, setAlbums, setFolders, setGenres, setPlaylists, setSongs, filter) => {
      setLoading(true);
      setError(null);

      try {
        let data = null;

        switch (tab) {
          case 'Artists':
            data = await loadLibraryData('artists');
            setArtists(data || []);
            break;
          case 'Albums':
            data = await loadLibraryData('albums');
            setAlbums(data || []);
            break;
          case 'Folders':
            data = await loadLibraryData('folders');
            setFolders(data || []);
            break;
          case 'Genres':
            data = await loadLibraryData('genres');
            setGenres(data || []);
            break;
          case 'Playlists':
            data = await loadLibraryData('playlists');
            setPlaylists(data || []);
            break;
          case 'Songs':
          default:
            if (Object.keys(filter || {}).length > 0) {
              data = await loadLibraryData('tracks', filter);
            } else {
              data = await loadLibraryData('songs');
            }
            setSongs(data || []);
            break;
        }
      } catch (err) {
        const errorMsg = err.message || 'Failed to load library data';
        console.error('[LibraryLoading] Error:', errorMsg);
        setError(errorMsg);
        setToast({ type: 'error', message: errorMsg });
      } finally {
        setLoading(false);
      }
    },
    [setToast]
  );

  /**
   * Load all data types simultaneously
   */
  const loadAllData = useCallback(
    async (setArtists, setAlbums, setSongs, setFolders, setGenres, setPlaylists) => {
      setLoading(true);
      setError(null);

      try {
        const results = await loadMultipleLibraryData([
          'artists',
          'albums',
          'songs',
          'folders',
          'genres',
          'playlists',
        ]);

        setArtists(results.artists || []);
        setAlbums(results.albums || []);
        setSongs(results.songs || []);
        setFolders(results.folders || []);
        setGenres(results.genres || []);
        setPlaylists(results.playlists || []);
      } catch (err) {
        const errorMsg = err.message || 'Failed to load library data';
        console.error('[LibraryLoading] Error loading all data:', errorMsg);
        setError(errorMsg);
        setToast({ type: 'error', message: `Library load failed: ${errorMsg}` });
      } finally {
        setLoading(false);
      }
    },
    [setToast]
  );

  return {
    loading,
    error,
    loadForTab,
    loadAllData,
  };
}

export default useLibraryDataLoading;
