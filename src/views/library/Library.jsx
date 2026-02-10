/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: Library.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Toast } from '../../DJ/Mixer/Common/Toast'
import NormalizeModal from '../../components/NormalizeModal.jsx'
import { useFeature } from '../../state/features'
import VoiceControl from '../../components/VoiceControl'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu } from '../../components/player/ContextMenu'
const { default: AudioAnalyzer } = await import("../../analysis/AudioAnalyzer_refactored.js");
/**
 * Library view with category tabs:
 *  - Artists, Albums, Songs, Folders, Genres
 * Clicking an artist/album/genre will load a filtered songs list.
 *
 * Requires preload bridges:
 *   window.api.listArtists() -> [{name, tracks}]
 *   window.api.listAlbums()  -> [{name, artist, tracks}]
 *   window.api.listSongs()   -> [{id, title, artist, album, filePath}]
 *   window.api.listFolders() -> [{folder}]
 *   window.api.listGenres()  -> [{name, tracks}]
 *   window.api.getTracks(filter) -> songs for {artist?, album?, genre?, search?}
 *   window.api.openFolder() + window.api.scanLibrary(folder)
 */

// Time formatting function
const fmt = (s = 0) => {
  s = Math.max(0, s) // Keep decimal precision for display
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  const wholeSeconds = Math.floor(seconds)
  const tenths = Math.floor((seconds % 1) * 10)
  
  // Format as M:SS.T (e.g., 5:23.4)
  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`
}

// ------------------------- small ui helpers -------------------------
function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
        active 
          ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/50 scale-105" 
          : "bg-zinc-800 border border-zinc-700 text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600"
      }`}
      style={{ marginRight: 8 }}
    >
      {children}
    </button>
  );
}

function BarButton({ onClick, children, className = "", disabled = false }) {
  const baseClasses = "px-3 py-2 rounded-lg border text-zinc-100 font-medium transition-all duration-200";
  const defaultClasses = "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 hover:shadow-lg hover:shadow-zinc-700/50";
  const disabledClasses = "border-zinc-800 bg-zinc-900 text-zinc-500 cursor-not-allowed opacity-50";
  
  const finalClasses = className || (disabled ? `${baseClasses} ${disabledClasses}` : `${baseClasses} ${defaultClasses}`);
  
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={finalClasses}
      style={{ marginLeft: 10 }}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Section({ title, right, children }) {
  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900" style={{ padding: 14, marginTop: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="text-zinc-200">{title}</div>
        <div>{right}</div>
      </div>
      <div>{children}</div>
    </section>
  );
}

// ------------------------- main component -------------------------
const TABS = ["Artists", "Albums", "Songs", "Playlists", "Folders", "Genres"];

export default function Library() {

  const navigate = useNavigate();

  const [tab, setTab] = useState("Songs");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  // data stores
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [songs, setSongs] = useState([]);
  const [folders, setFolders] = useState([]);
  const [genres, setGenres] = useState([]);
  const [playlists, setPlaylists] = useState([]);

  // current filter (drill-down)
  const [filter, setFilter] = useState({ artist: "", album: "", genre: "", playlist: "" });

  // sorting state
  const [sortBy, setSortBy] = useState("title");
  const [sortOrder, setSortOrder] = useState("asc");

  // playlist management
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [showAddToPlaylist, setShowAddToPlaylist] = useState(null);

  // normalize modal
  const [showNormalizeModal, setShowNormalizeModal] = useState(false);
  const [normalizeFolder, setNormalizeFolder] = useState(""); 
  const [showFolderSelector, setShowFolderSelector] = useState(false);

  // Context menu
  const contextMenuHook = useContextMenu();
  const {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    showPlaylistSubmenu,
    setShowPlaylistSubmenu,
    showNewPlaylistInput,
    setShowNewPlaylistInput,
    newPlaylistName: contextNewPlaylistName,
    setNewPlaylistName: setContextNewPlaylistName,
    showRenameInput,
    setShowRenameInput,
    newFileName,
    setNewFileName,
    renameInputRef
  } = contextMenuHook;
  const [folderSelectorAction, setFolderSelectorAction] = useState(''); // 'normalize'
  
  // multi-select state (for bulk actions)
  const [selectedSongIds, setSelectedSongIds] = useState(new Set());
  
  // inline editing state
  const [inlineEditingTrackId, setInlineEditingTrackId] = useState(null);
  const [inlineEditingField, setInlineEditingField] = useState(null); // 'rating' or 'color'
  
  // ANALYSIS STATE (for fast/deep pass progress bar)
  const [analyzing, setAnalyzing] = useState({
    active: false,
    total: 0,
    completed: 0,
    fastDone: 0,
    deepDone: 0,
    queue: [],
  });
  // Live stopwatch timers for batch analysis
  const [batchFastElapsed, setBatchFastElapsed] = useState(null)
  const [batchDeepElapsed, setBatchDeepElapsed] = useState(null)
  const [batchOverallElapsed, setBatchOverallElapsed] = useState(null)
  const batchFastTimerRef = React.useRef(null)
  const batchDeepTimerRef = React.useRef(null)
  const batchOverallTimerRef = React.useRef(null)
  const batchTotalRef = React.useRef(0)
  
  const [toast, setToast] = useState(null);
  const [djMode] = useFeature('djMode');

  // ------------ play helper (use whatever bridge exists) ------------
  const doPlay = useCallback((absPath) => {
    console.log('ðŸŽµ Play button clicked for:', absPath, 'DJ Mode:', djMode, 'Playlist filter:', filter.playlist);

    // If we're currently viewing a playlist, load the whole playlist as the autoplay queue
    if (filter.playlist) {
      try {
        const allPaths = songs.map(s => s.filePath).filter(Boolean);
        const idx = allPaths.findIndex(p => p === absPath);
        sessionStorage.setItem('ngks_autoplay_queue', JSON.stringify(allPaths));
        sessionStorage.setItem('ngks_autoplay_index', String(Math.max(0, idx)));
        sessionStorage.setItem('ngks_autoplay_route', djMode ? '/now' : '/player');
        if (djMode) sessionStorage.setItem('ngks_no_autoplay', 'true');
        console.log(`ðŸŽµ Loaded playlist autoplay queue (${allPaths.length} tracks), start index: ${idx}`);
      } catch (e) {
        console.warn('Failed to create autoplay queue from playlist:', e);
        // Fallback to single-track behavior below
        sessionStorage.setItem('ngks_autoplay', absPath);
        sessionStorage.setItem('ngks_autoplay_route', djMode ? '/now' : '/player');
        if (djMode) sessionStorage.setItem('ngks_no_autoplay', 'true');
      }
    } else {
      console.log('ðŸŽµ Play button clicked for single track (not playlist context)');
      if (djMode) {
        console.log('ðŸŽ§ DJ Mode: Loading single track without auto-play');
        sessionStorage.setItem('ngks_dj_single_load', absPath);
        sessionStorage.setItem('ngks_no_autoplay', 'true');
        sessionStorage.setItem('ngks_autoplay_route', '/now');
      } else {
        console.log('ðŸŽµ Normal Mode: Loading single track with auto-play');
        sessionStorage.setItem('ngks_autoplay', absPath);
        sessionStorage.setItem('ngks_autoplay_route', '/player');
      }
    }

    // Navigate to the player instead of reloading the entire app
    navigate(djMode ? '/now' : '/player');
  }, [djMode, filter.playlist, songs, navigate]);

  // ------------ Play Playlist helper ------------
  const playPlaylist = useCallback(async (playlistId) => {
    console.log('ðŸŽµ Play Playlist button clicked for playlist:', playlistId, 'DJ Mode:', djMode);
    
    try {
      // Get all tracks from this playlist
      const playlistTracks = await window.api.getPlaylistTracks(playlistId);
      if (!playlistTracks || playlistTracks.length === 0) {
        setToast({ type: 'error', message: 'No tracks in this playlist' });
        return;
      }
      
      console.log(`ðŸŽµ Playing playlist with ${playlistTracks.length} tracks`);
      
      // Send playlist context to Now Playing player via sessionStorage
      sessionStorage.setItem('ngks_library_context', JSON.stringify({ type: 'playlist', playlistId }));
      
      // Get all song file paths
      const allPaths = playlistTracks.map(track => track.filePath).filter(path => path);
      
      if (!allPaths.length) {
        setToast({ type: 'error', message: 'No valid tracks found in playlist' });
        return;
      }
      
      if (djMode) {
        // In DJ mode: Just load the queue, don't auto-play
        console.log('ðŸŽ§ DJ Mode: Loading playlist queue without auto-play');
        sessionStorage.setItem('ngks_autoplay_queue', JSON.stringify(allPaths));
        sessionStorage.setItem('ngks_no_autoplay', 'true');
        sessionStorage.setItem('ngks_autoplay_route', '/now');
      } else {
        // Normal mode: Load queue and auto-play in single deck player
        console.log('ðŸŽµ Normal Mode: Loading playlist queue with auto-play');
        sessionStorage.setItem('ngks_autoplay_queue', JSON.stringify(allPaths));
        sessionStorage.setItem('ngks_autoplay_route', '/player');
      }
      
      // Navigate to the player instead of reloading the entire app
      navigate(djMode ? '/now' : '/player');
    } catch (error) {
      console.error('Error playing playlist:', error);
      setToast({ type: 'error', message: 'Failed to play playlist' });
    }
  }, [djMode, navigate]);

  // ------------ Play All helper ------------
  const doPlayAll = useCallback(() => {
    console.log('ðŸŽµ Play All button clicked, DJ Mode:', djMode);
    
    if (!songs.length) {
      setToast({ type: 'error', message: 'No songs to play' });
      return;
    }
    
    console.log(`ðŸŽµ Playing all ${songs.length} songs`);
    
    // Get all song file paths
    const allPaths = songs.map(song => song.filePath).filter(path => path);
    
    if (!allPaths.length) {
      setToast({ type: 'error', message: 'No valid songs found' });
      return;
    }
    
    // If there's an active playlist filter, set the library context
    if (filter.playlist) {
      sessionStorage.setItem('ngks_library_context', JSON.stringify({
        type: 'playlist',
        playlistId: filter.playlist
      }));
    }
    
    if (djMode) {
  // In DJ mode: Just load the queue, don't auto-play
  console.log('ðŸŽ§ DJ Mode: Loading queue without auto-play');
  sessionStorage.setItem('ngks_autoplay_queue', JSON.stringify(allPaths));
  sessionStorage.setItem('ngks_no_autoplay', 'true'); // Set no-autoplay flag
  sessionStorage.setItem('ngks_autoplay_route', '/now');
    } else {
      // Normal mode: Load queue and auto-play in single deck player
      console.log('ðŸŽµ Normal Mode: Loading queue with auto-play');
      sessionStorage.setItem('ngks_autoplay_queue', JSON.stringify(allPaths));
      sessionStorage.setItem('ngks_autoplay_route', '/player');
    }
    
    // Navigate to the player instead of reloading the entire app
    navigate(djMode ? '/now' : '/player');
  }, [songs, djMode, navigate, filter.playlist]);

  // ------------ Voice Command Handler ------------
  const handleVoiceCommand = useCallback((command) => {
    console.log('ðŸŽ¤ Voice command:', command);

    switch (command.type) {
      case 'play':
        // Search for song by query
        if (command.params.query) {
          const query = command.params.query.toLowerCase();
          const matchedSong = songs.find(song => {
            const title = (song.title || '').toLowerCase();
            const artist = (song.artist || '').toLowerCase();
            return title.includes(query) || artist.includes(query) || 
                   `${artist} ${title}`.includes(query);
          });
          
          if (matchedSong) {
            setToast({ type: 'success', message: `Playing: ${matchedSong.title}` });
            doPlay(matchedSong.filePath);
          } else {
            // Try searching in the full library
            setSearch(command.params.query);
            setToast({ type: 'info', message: `Searching for: ${command.params.query}` });
          }
        }
        break;

      case 'search':
        if (command.params.query) {
          setSearch(command.params.query);
          setTab('Songs');
          setToast({ type: 'info', message: `Searching: ${command.params.query}` });
        }
        break;

      case 'navigate':
        if (command.params.view === 'library') {
          // Already in library
          setToast({ type: 'info', message: 'Already in Library' });
        } else if (command.params.view === 'dj') {
          navigate('/now');
        } else if (command.params.view === 'settings') {
          navigate('/settings');
        }
        break;

      case 'unknown':
        setToast({ type: 'warning', message: 'Command not recognized' });
        break;

      default:
        console.log('Unhandled voice command type:', command.type);
    }
  }, [songs, doPlay, navigate, setSearch, setTab]);

  // ------------ Loader for each tab / filter ------------
  const loadForTab = useCallback(async () => {
    // Guard: Check if window.api is available
    if (!window.api) {
      console.warn('[Library] window.api not available yet, skipping load');
      return;
    }

    setLoading(true);
    try {
      if (tab === "Artists") {
        const rows = await window.api.listArtists();
        setArtists(rows || []);
      } else if (tab === "Albums") {
        const rows = await window.api.listAlbums();
        setAlbums(rows || []);
      } else if (tab === "Folders") {
        const rows = await window.api.listFolders();
        setFolders(rows || []);
      } else if (tab === "Genres") {
        const rows = await window.api.listGenres();
        setGenres(rows || []);
      } else if (tab === "Playlists") {
        const rows = await window.api.listPlaylists();
        setPlaylists(rows || []);
      }

      // For Songs, or when a filter is active, use the generic getTracks(filter)
      if (tab === "Songs" || filter.artist || filter.album || filter.genre || filter.playlist || search.trim()) {
        if (filter.playlist) {
          // Get tracks from a specific playlist
          const rows = await window.api.getPlaylistTracks(filter.playlist);
          setSongs(rows || []);
        } else {
          const rows = await window.api.getTracks({
            ...filter,
            search: search.trim() || undefined,
          });
          setSongs(rows || []);
        }
      } else if (tab === "Songs") {
        const rows = await window.api.listSongs();
        setSongs(rows || []);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, filter, search]);

  useEffect(() => {
    // Only load if window.api is available
    if (window.api) {
      loadForTab();
    } else {
      console.warn('[Library] window.api not available on mount, will load when available');
    }
  }, [loadForTab]);

  // Wait for window.api to become available
  useEffect(() => {
    if (!window.api) {
      const checkApi = () => {
        if (window.api) {
          console.log('[Library] window.api became available, loading data');
          loadForTab();
        } else {
          setTimeout(checkApi, 100);
        }
      };
      checkApi();
    }
  }, []); // Empty dependency array - only run once on mount

  // Close dropdown when component unmounts or tab changes
  useEffect(() => {
    setShowAddToPlaylist(null);
  }, [tab]);

  // Listen for analysis updates (fast/deep pass progress)
  useEffect(() => {
    const handleUpdate = (data) => {
      if (data.type === 'ANALYSIS_STARTED') {
        const total = Number(data.total) || 0
        batchTotalRef.current = total
        // start overall and fast timers
        const overallStart = Date.now();
        setBatchOverallElapsed(0);
        if (batchOverallTimerRef.current) clearInterval(batchOverallTimerRef.current);
        batchOverallTimerRef.current = setInterval(() => setBatchOverallElapsed((Date.now() - overallStart) / 1000), 250);

        const fastStart = Date.now();
        setBatchFastElapsed(0);
        if (batchFastTimerRef.current) clearInterval(batchFastTimerRef.current);
        batchFastTimerRef.current = setInterval(() => setBatchFastElapsed((Date.now() - fastStart) / 1000), 100);

        setBatchDeepElapsed(null);
        if (batchDeepTimerRef.current) { clearInterval(batchDeepTimerRef.current); batchDeepTimerRef.current = null }

        setAnalyzing(a => ({ ...a, active: true, total: total, queue: data.files || [], fastDone: 0, deepDone: 0, completed: 0 }));
      } else if (data.type === 'FAST_DONE') {
        setAnalyzing(prev => {
          const newFast = (prev.fastDone || 0) + 1;
          const total = batchTotalRef.current || prev.total || 0;
          // If all fast passes finished, stop fast timer and start deep timer
          if (total > 0 && newFast >= total) {
            if (batchFastTimerRef.current) { clearInterval(batchFastTimerRef.current); batchFastTimerRef.current = null }
            // record final fast elapsed
            if (batchOverallTimerRef.current) {
              // ensure overall timer keeps running
            }
            // start deep timer
            const deepStart = Date.now();
            setBatchDeepElapsed(0);
            if (batchDeepTimerRef.current) clearInterval(batchDeepTimerRef.current);
            batchDeepTimerRef.current = setInterval(() => setBatchDeepElapsed((Date.now() - deepStart) / 1000), 250);
          }
          return { ...prev, fastDone: newFast };
        });
      } else if (data.type === 'DEEP_DONE') {
        setAnalyzing(prev => {
          const newDeep = (prev.deepDone || 0) + 1;
          const total = batchTotalRef.current || prev.total || 0;
          if (total > 0 && newDeep >= total) {
            if (batchDeepTimerRef.current) { clearInterval(batchDeepTimerRef.current); batchDeepTimerRef.current = null }
          }
          return { ...prev, deepDone: newDeep, completed: (prev.completed || 0) + 1 };
        });
      } else if (data.type === 'ANALYSIS_COMPLETE') {
        setAnalyzing(a => ({ ...a, completed: a.completed + 1 }));
      } else if (data.type === 'ANALYSIS_FINISHED') {
        // stop all timers and record final overall elapsed
        if (batchFastTimerRef.current) { clearInterval(batchFastTimerRef.current); batchFastTimerRef.current = null }
        if (batchDeepTimerRef.current) { clearInterval(batchDeepTimerRef.current); batchDeepTimerRef.current = null }
        if (batchOverallTimerRef.current) {
          clearInterval(batchOverallTimerRef.current);
          batchOverallTimerRef.current = null;
        }
        // compute final overall elapsed if possible (we tracked it in state already)
        setAnalyzing({ active: false, total: 0, completed: 0, fastDone: 0, deepDone: 0, queue: [] });
        batchTotalRef.current = 0;
        loadForTab(); // Refresh to show updated analysis results
      }
    };

    const unsubscribe = window.analyzerAPI?.onAnalysisUpdate?.(handleUpdate);
    return () => unsubscribe?.();
  }, []);

  // ------------ actions ------------
  const handleAddFolder = async () => {
    setLoading(true);
    try {
      const folder = await window.api.openFolder();
      if (!folder) return;
      console.log('Selected folder:', folder);
      await window.api.scanLibrary(folder);
      // refresh current view
      loadForTab();
    } finally {
      setLoading(false);
    }
  };

  const handleAutoScan = async () => {
    setLoading(true);
    try {
      const result = await window.api.autoScan();
      console.log('Auto scanning result:', result);
      alert(`Auto scan completed: ${result.added} tracks added, ${result.total} total tracks`);
      // refresh current view
      loadForTab();
    } finally {
      setLoading(false);
    }
  };

  const handleNormalize = async () => {
    setFolderSelectorAction('normalize');
    setShowFolderSelector(true);
  };

  const handleSelectFolder = async (folder) => {
    setShowFolderSelector(false);
    if (folder) {
      if (folderSelectorAction === 'normalize') {
        setNormalizeFolder(folder);
        setShowNormalizeModal(true);
      }
    }
  };

  const handleBrowseForFolder = async () => {
    try {
      const folder = await window.api.invoke('dialog:openFolder');
      if (folder) {
        setShowFolderSelector(false);
        if (folderSelectorAction === 'normalize') {
          setNormalizeFolder(folder);
          setShowNormalizeModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to open folder dialog:', err);
    }
  };

  const handleCancelAnalysis = async () => {
    try {
      await window.analyzerAPI?.cancelAll?.();
      setAnalyzing({ active: false, total: 0, completed: 0, fastDone: 0, deepDone: 0, queue: [] });
    } catch (err) {
      console.error('Failed to cancel analysis:', err);
    }
  };

  const handleCleanupDatabase = async () => {
    if (!window.confirm('Clean up database? This will remove entries for files that no longer exist.')) {
      return;
    }
    
    setLoading(true);
    try {
      const folder = await window.api.invoke('dialog:openFolder');
      if (folder) {
        const result = await window.api.invoke('db:cleanup', folder);
        if (result.success) {
          setToast({
            type: 'success',
            message: `Database cleaned! Removed ${result.removedCount} stale entries.`
          });
          await loadLibrary(); // Refresh the library view
        } else {
          setToast({
            type: 'error',
            message: 'Database cleanup failed: ' + result.error
          });
        }
      }
    } catch (err) {
      console.error('Database cleanup failed:', err);
      setToast({
        type: 'error',
        message: 'Database cleanup failed: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFolder = async (folderPath) => {
    if (!window.confirm(`Remove "${folderPath}" from library? This will not delete files, only remove them from the music library.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await window.api.invoke('library:removeFolder', folderPath);
      if (result.success) {
        setToast({
          type: 'success',
          message: `Folder removed from library. ${result.removedCount} tracks removed.`
        });
        await loadForTab(); // Refresh the library view
      } else {
        setToast({
          type: 'error',
          message: 'Failed to remove folder: ' + (result.error || 'Unknown error')
        });
      }
    } catch (err) {
      console.error('Remove folder failed:', err);
      setToast({
        type: 'error',
        message: 'Failed to remove folder: ' + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const goNowPlaying = () => navigate("/now");
  const goTagEditor = () => navigate("/tags");
  const goSettings = () => navigate("/settings");
  const goLayerRemover = () => navigate("/layer-remover");

  // ------------ Playlist management ------------
  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    try {
      await window.api.createPlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setShowCreatePlaylist(false);
      loadForTab(); // Refresh playlists
    } catch (error) {
      console.error('Error creating playlist:', error);
      alert('Error creating playlist');
    }
  };

  const deletePlaylist = async (playlistId, playlistName) => {
    if (!confirm(`Delete playlist "${playlistName}"? This cannot be undone.`)) return;
    
    try {
      await window.api.deletePlaylist(playlistId);
      loadForTab(); // Refresh playlists
    } catch (error) {
      console.error('Error deleting playlist:', error);
      alert('Error deleting playlist');
    }
  };

  const renamePlaylist = async (playlistId, newName) => {
    if (!newName.trim()) return;
    
    try {
      await window.api.renamePlaylist(playlistId, newName.trim());
      setEditingPlaylist(null);
      loadForTab(); // Refresh playlists
    } catch (error) {
      console.error('Error renaming playlist:', error);
      alert('Error renaming playlist');
    }
  };

  const addToPlaylist = async (playlistId, trackId) => {
    try {
      await window.api.addTrackToPlaylist(playlistId, trackId);
      const playlist = playlists.find(p => p.id === playlistId);
      setToast({ type: 'success', message: `Added to "${playlist?.name}"!` });
      if (filter.playlist) {
        loadForTab(); // Refresh if we're viewing this playlist
      }
    } catch (error) {
      console.error('Error adding to playlist:', error);
      setToast({ type: 'error', message: 'Error adding to playlist' });
    }
  };

  const removeFromPlaylist = async (playlistTrackId) => {
    try {
      await window.api.removeTrackFromPlaylist(playlistTrackId);
      loadForTab(); // Refresh playlist view
    } catch (error) {
      console.error('Error removing from playlist:', error);
      alert('Error removing from playlist');
    }
  };

  // Fix spelling for a track using AI
  const fixSpelling = async (track) => {
    if (!track.artist && !track.title) {
      setToast({ type: 'error', message: 'Track has no artist or title to fix' });
      return;
    }

    try {
      setToast({ type: 'info', message: `Fixing spelling for "${track.artist} - ${track.title}"...` });
      
      const result = await window.api.fixSpelling({
        artist: track.artist || '',
        title: track.title || ''
      });

      if (result.error) {
        setToast({ type: 'error', message: `Spelling correction failed: ${result.error}` });
        return;
      }

      const { artist: correctedArtist, title: correctedTitle } = result;
      
      // Check if any changes were made
      if (correctedArtist === track.artist && correctedTitle === track.title) {
        setToast({ type: 'info', message: 'No spelling corrections needed' });
        return;
      }

      // Update the track in the database
      await window.api.updateTrack(track.id, {
        artist: correctedArtist,
        title: correctedTitle
      });

      setToast({ 
        type: 'success', 
        message: `Updated: "${track.artist} - ${track.title}" â†’ "${correctedArtist} - ${correctedTitle}"` 
      });

      // Refresh the current view
      loadForTab();
      
    } catch (error) {
      console.error('Error fixing spelling:', error);
      setToast({ type: 'error', message: 'Failed to fix spelling' });
    }
  };

  const onClickArtist = (name) => {
    setFilter({ artist: name, album: "", genre: "", playlist: "" });
    // Return to "all tracks" context
    window.api.sendToPlayer({ type: 'all' });
  };
  const onClickAlbum = (name, artist) => {
    setFilter({ artist: artist || "", album: name, genre: "", playlist: "" });
    // Return to "all tracks" context
    window.api.sendToPlayer({ type: 'all' });
  };
  const onClickGenre = (name) => {
    setFilter({ artist: "", album: "", genre: name, playlist: "" });
    // Return to "all tracks" context
    window.api.sendToPlayer({ type: 'all' });
  };
  const onClickPlaylist = (playlistId) => {
    setFilter({ artist: "", album: "", genre: "", playlist: playlistId });
    // No need to send to player - we're just viewing in library
  };

  // Clear all filters and return to full library
  const clearFilters = () => {
    setFilter({ artist: "", album: "", genre: "", playlist: "" });
  };

  // ------------ multi-select helpers for bulk actions -------
  const toggleSongSelection = (songId, e) => {
    e.stopPropagation();
    const newSelection = new Set(selectedSongIds);
    if (newSelection.has(songId)) {
      newSelection.delete(songId);
    } else {
      newSelection.add(songId);
    }
    setSelectedSongIds(newSelection);
  };

  const selectAllSongs = (list) => {
    setSelectedSongIds(new Set(list.map(s => s.id)));
  };

  const clearSelection = () => {
    setSelectedSongIds(new Set());
  };

  // const handleBulkMetadataFix = async () => {
  //   const selectedList = songs.filter(s => selectedSongIds.has(s.id));
  //   if (selectedList.length === 0) {
  //     setToast({ type: 'warning', message: 'No tracks selected' });
  //     return;
  //   }

  //   setToast({ type: 'info', message: `Starting metadata fix for ${selectedList.length} tracks...` });

  //   let fixed = 0;
  //   let failed = 0;

  //   try {
  //     for (let i = 0; i < selectedList.length; i++) {
  //       const track = selectedList[i];
        
  //       try {
  //         // Extract filename without extension
  //         const fileName = track.filePath.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '');
          
  //         // Try to parse "Artist - Title" format
  //         let newArtist = track.artist;
  //         let newTitle = track.title;
          
  //         if (fileName.includes(' - ')) {
  //           const parts = fileName.split(' - ');
  //           if (parts.length >= 2) {
  //             newArtist = parts[0].trim();
  //             newTitle = parts.slice(1).join(' - ').trim();
              
  //             // Update in database
  //             await window.electronAPI.updateTrackMetadata(track.id, {
  //               artist: newArtist,
  //               title: newTitle
  //             });
              
  //             console.log(`[MetadataFix] Updated: "${track.title}" â†’ "${newTitle}" by "${newArtist}"`);
  //             fixed++;
  //           }
  //         } else {
  //           console.log(`[MetadataFix] Skipping: "${fileName}" (no separator found)`);
  //         }
          
  //       } catch (trackErr) {
  //         console.error(`[MetadataFix] Error fixing ${track.title}:`, trackErr);
  //         failed++;
  //       }
  //     }
      
  //     setToast({ 
  //       type: 'success', 
  //       message: `Fixed metadata for ${fixed}/${selectedList.length} tracks${failed > 0 ? ` (${failed} failed)` : ''}`
  //     });
      
  //     clearSelection();
      
  //     // Refresh the library view
  //     setTimeout(() => {
  //       loadForTab();
  //     }, 500);
      
  //   } catch (err) {
  //     console.error('[MetadataFix] Bulk fix failed:', err);
  //     setToast({ type: 'error', message: `Metadata fix failed: ${err.message}` });
  //   }
  // };

  const handleBulkAnalyze = async () => {
    const selectedList = songs.filter(s => selectedSongIds.has(s.id));
    if (selectedList.length === 0) {
      setToast({ type: 'warning', message: 'No tracks selected' });
      return;
    }
    
    setToast({ type: 'info', message: `Starting analysis of ${selectedList.length} tracks...` });
    console.log('[Library] Starting bulk analyze for', selectedList.length, 'tracks');
    
    try {
      // Import AudioAnalyzer dynamically
      let analyzer;
      try {
        const AudioAnalyzerModule = await import('../../analysis/AudioAnalyzer_refactored.js');
        analyzer = new AudioAnalyzerModule.default();
        console.log('[Library] AudioAnalyzer loaded successfully');
        
        // Check if deep analysis is already running
        if (AudioAnalyzerModule.default.isAnalyzingGlobally) {
          setToast({ type: 'warning', message: 'Deep analysis is already running. Please wait for it to complete.' });
          return;
        }
        
      } catch (importErr) {
        console.error('[Library] Failed to import AudioAnalyzer:', importErr);
        setToast({ type: 'error', message: `Failed to load analyzer: ${importErr.message}` });
        return;
      }
      
      let analyzed = 0;
      let failed = 0;
      
      for (let i = 0; i < selectedList.length; i++) {
        const track = selectedList[i];
        console.log(`[Library] Analyzing track ${i+1}/${selectedList.length}: ${track.title}`);
        
        try {
          // Clean up file path
          const cleanPath = (track.filePath || track.path || '').replace(/^"(.*)"$/, '$1');
          if (!cleanPath) {
            console.warn(`[Library] No file path for track:`, track);
            failed++;
            continue;
          }
          
          // Get track data from database
          let trackData;
          try {
            trackData = await window.api.getTrackByPath(cleanPath);
          } catch (pathErr) {
            console.error(`[Library] getTrackByPath failed:`, pathErr);
            failed++;
            continue;
          }
          
          if (!trackData || !trackData.id) {
            console.warn(`[Library] Track not found in database: ${cleanPath}`);
            failed++;
            continue;
          }
          
          // Run fast pass analysis
          console.log(`[Library] Running fast pass for: ${track.title}`);
          const fastResult = await analyzer.analyzeTrackBatch(cleanPath, trackData.genre || '');
          
          if (fastResult && fastResult.bpm) {
            // Save fast pass results to database
            try {
              await window.api.invoke('library:updateAnalysis', {
                trackId: trackData.id,
                bpm: fastResult.bpm || null,
                bpmConfidence: fastResult.bpmConfidence || fastResult.confidence || '',
                key: fastResult.key || null,
                keyConfidence: fastResult.keyConfidence || '',
                camelotKey: fastResult.camelotKey || '',
                energy: fastResult.energy || '',
                danceability: fastResult.danceability || '',
                acousticness: fastResult.acousticness || '',
                instrumentalness: fastResult.instrumentalness || '',
                liveness: fastResult.liveness || '',
                loudnessLUFS: fastResult.loudnessLUFS || '',
                loudnessRange: fastResult.loudnessRange || '',
                cueIn: fastResult.cueIn || '',
                cueOut: fastResult.cueOut || ''
              });
              console.log(`[Library] Saved analysis for: ${track.title}`);
              analyzed++;
              
              // Run deep pass in background using queue system
              analyzer.queueDeepAnalysis(cleanPath, null, fastResult, fastResult.genre);
              
            } catch (saveErr) {
              console.error(`[Library] Failed to save analysis:`, saveErr);
              failed++;
            }
          } else {
            console.warn(`[Library] Fast analysis returned no BPM for: ${track.title}`);
            failed++;
          }
          
        } catch (trackErr) {
          console.error(`[Library] Error analyzing ${track.title}:`, trackErr);
          failed++;
        }
      }
      
      console.log(`[Library] Bulk analyze complete: ${analyzed} succeeded, ${failed} failed`);
      setToast({ 
        type: 'success', 
        message: `Analyzed ${analyzed}/${selectedList.length} tracks${failed > 0 ? ` (${failed} failed)` : ''}`
      });
      
      clearSelection();
      
      // Refresh the library view
      setTimeout(() => {
        loadForTab();
      }, 500);
      
    } catch (err) {
      console.error('[Library] Bulk analyze failed:', err);
      setToast({ type: 'error', message: `Analysis failed: ${err.message}` });
    }
  };

  // ------------ inline editing helpers -------
  const COLORS = [
    { name: 'red', hex: '#ef4444', tailwind: 'bg-red-500' },
    { name: 'orange', hex: '#f97316', tailwind: 'bg-orange-500' },
    { name: 'yellow', hex: '#eab308', tailwind: 'bg-yellow-500' },
    { name: 'green', hex: '#22c55e', tailwind: 'bg-green-500' },
    { name: 'blue', hex: '#3b82f6', tailwind: 'bg-blue-500' },
    { name: 'purple', hex: '#a855f7', tailwind: 'bg-purple-500' },
    { name: 'pink', hex: '#ec4899', tailwind: 'bg-pink-500' },
  ];

  const handleQuickRating = async (trackId, rating) => {
    try {
      // Find the track to get filePath
      const track = songs.find(s => s.id === trackId);
      if (!track) return;
      
      // Update in database
      await window.api.updateTrack(trackId, { rating });
      
      // Update local state
      setSongs(songs.map(s => s.id === trackId ? { ...s, rating } : s));
      
      setInlineEditingTrackId(null);
      setInlineEditingField(null);
      setToast({ type: 'success', message: `Rating updated to ${rating} stars` });
    } catch (err) {
      console.error('Error updating rating:', err);
      setToast({ type: 'error', message: 'Failed to update rating' });
    }
  };

  const handleQuickColor = async (trackId, colorName) => {
    try {
      const track = songs.find(s => s.id === trackId);
      if (!track) return;
      
      // Update in database
      await window.api.updateTrack(trackId, { color: colorName });
      
      // Update local state
      setSongs(songs.map(s => s.id === trackId ? { ...s, color: colorName } : s));
      
      setInlineEditingTrackId(null);
      setInlineEditingField(null);
      setToast({ type: 'success', message: `Color updated to ${colorName}` });
    } catch (err) {
      console.error('Error updating color:', err);
      setToast({ type: 'error', message: 'Failed to update color' });
    }
  };

  // ========== CONTEXT MENU FUNCTIONS ==========
  const showInExplorer = async (track) => {
    try {
      await window.api.showInExplorer(track.filePath);
      setContextMenu(null);
    } catch (err) {
      console.error('Show in explorer error:', err);
      setToast({ type: 'error', message: 'Failed to show in explorer' });
    }
  };

  const copyPath = async (track) => {
    try {
      await navigator.clipboard.writeText(track.filePath);
      setToast({ type: 'success', message: 'File path copied to clipboard' });
      setContextMenu(null);
    } catch (err) {
      console.error('Copy path error:', err);
      setToast({ type: 'error', message: 'Failed to copy path' });
    }
  };

  const analyzeTrack = async (track) => {
    setContextMenu(null);
    setToast({ type: 'info', message: 'Starting track analysis...' });
    
    try {
      // Add to analyzing set
      const newAnalyzing = new Set(analyzing.files);
      newAnalyzing.add(track.filePath);
      setAnalyzing({ ...analyzing, files: newAnalyzing });
      
      const result = await window.api.analyzeTrack(track.filePath);
      if (result && result.success) {
        setToast({ type: 'success', message: 'Track analyzed successfully!' });
        loadSongs(); // Refresh to show updated analysis
      } else {
        setToast({ type: 'error', message: 'Track analysis failed' });
      }
    } catch (err) {
      console.error('Analyze error:', err);
      setToast({ type: 'error', message: 'Analysis error' });
    } finally {
      // Remove from analyzing set
      const newAnalyzing = new Set(analyzing.files);
      newAnalyzing.delete(track.filePath);
      setAnalyzing({ ...analyzing, files: newAnalyzing });
    }
  };

  const renameFile = async (track) => {
    if (!newFileName.trim()) {
      setToast({ type: 'error', message: 'Filename cannot be empty' });
      return;
    }
    
    setContextMenu(null);
    setToast({ type: 'info', message: 'ðŸ”„ Renaming file...' });
    
    try {
      // Extract extension safely from the file path
      const originalPath = track.filePath || '';
      const pathParts = originalPath.split(/[/\\]/)
      const fullFileName = pathParts[pathParts.length - 1] || ''
      const extensionMatch = fullFileName.match(/\.([^.]+)$/)
      const originalExt = extensionMatch ? extensionMatch[1] : 'mp3'
      
      let finalNewName = newFileName.trim()
      
      // Add extension if missing
      if (!finalNewName.includes('.')) {
        finalNewName = `${finalNewName}.${originalExt}`
      }
      
      const result = await window.api.renameTrack(track.filePath, finalNewName);
      
      if (result && result.success) {
        setToast({ type: 'success', message: 'âœ… File renamed successfully! Updating library...' });
        
        // Auto-rescan library after successful rename
        try {
          await window.api.invoke('library:autoScan', {});
          loadSongs(); // Refresh the library
          setToast({ type: 'success', message: 'ðŸŽµ Library updated! File renamed and rescanned.' });
        } catch (scanErr) {
          setToast({ type: 'warning', message: 'âœ… File renamed, but library rescan failed. Refresh manually.' });
        }
      } else {
        const errorMsg = result?.error || 'Unknown error occurred';
        setToast({ type: 'error', message: `âŒ Rename failed: ${errorMsg}` });
      }
    } catch (err) {
      console.error('Rename error:', err);
      setToast({ type: 'error', message: 'âŒ Critical rename error' });
    }
    
    setShowRenameInput(false);
    setNewFileName('');
  };

  const startRename = (track) => {
    // Extract just the filename from the path, without directory
    const baseName = track.filePath ? track.filePath.split(/[/\\]/).pop() : (track.filename || track.title || '');
    // Remove extension for editing
    const nameWithoutExt = baseName ? baseName.replace(/\.[^/.]+$/, '') : '';
    
    setNewFileName(nameWithoutExt);
    setShowRenameInput(true);
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus();
        renameInputRef.current.select();
      }
    }, 10);
  };

  const removeFromLibrary = async (track) => {
    if (!confirm(`Remove "${track.title || track.filename}" from library?`)) return;
    
    setContextMenu(null);
    setToast({ type: 'info', message: 'Removing from library...' });
    
    try {
      const result = await window.api.removeFromLibrary(track.id);
      if (result.success) {
        setToast({ type: 'success', message: 'Removed from library' });
        loadSongs();
      } else {
        setToast({ type: 'error', message: `Remove failed: ${result.error}` });
      }
    } catch (err) {
      console.error('Remove error:', err);
      setToast({ type: 'error', message: 'Remove error' });
    }
  };

  const deleteFile = async (track) => {
    if (!confirm(`PERMANENTLY DELETE "${track.title || track.filename}"?\n\nThis action CANNOT be undone!`)) return;
    
    setContextMenu(null);
    setToast({ type: 'info', message: 'Deleting file...' });
    
    try {
      const result = await window.api.deleteTrack(track.filePath);
      if (result.success) {
        setToast({ type: 'success', message: 'File deleted permanently' });
        loadForTab();
      } else {
        setToast({ type: 'error', message: `Delete failed: ${result.error}` });
      }
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ type: 'error', message: 'Delete error' });
    }
  };

  // ------------ renderers ------------
  const renderSongs = (list) => {
    const isSelecting = selectedSongIds.size > 0;

    // Sort the songs list
    const sortedList = [...list].sort((a, b) => {
      let aVal, bVal;

      switch (sortBy) {
        case 'title':
          // Sort by filename (without extension) instead of metadata title
          const getFileName = (path) => path ? path.split(/[/\\]/).pop().replace(/\.[^/.]+$/, '') : '';
          aVal = getFileName(a.filePath || '').toLowerCase();
          bVal = getFileName(b.filePath || '').toLowerCase();
          break;
        case 'artist':
          aVal = (a.artist || '').toLowerCase();
          bVal = (b.artist || '').toLowerCase();
          break;
        case 'album':
          aVal = (a.album || '').toLowerCase();
          bVal = (b.album || '').toLowerCase();
          break;
        case 'filename':
          // Extract filename from filePath
          const getFullFileName = (path) => path ? path.split(/[/\\]/).pop() : '';
          aVal = getFullFileName(a.filePath || '').toLowerCase();
          bVal = getFullFileName(b.filePath || '').toLowerCase();
          break;
        case 'duration':
          aVal = a.duration || 0;
          bVal = b.duration || 0;
          break;
        case 'bpm':
          aVal = a.bpm || 0;
          bVal = b.bpm || 0;
          break;
        default:
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return (
      <>
        {/* Sort Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-zinc-400 text-sm">Sort by:</span>
          {[
            { key: 'title', label: 'Song Title (Filename)' },
            { key: 'artist', label: 'Artist' },
            { key: 'album', label: 'Album' },
            { key: 'filename', label: 'Full Filename' },
            { key: 'duration', label: 'Duration' },
            { key: 'bpm', label: 'BPM' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => {
                if (sortBy === key) {
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                } else {
                  setSortBy(key);
                  setSortOrder('asc');
                }
              }}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                sortBy === key
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {label} {sortBy === key && (sortOrder === 'asc' ? 'â†‘' : 'â†“')}
            </button>
          ))}
        </div>

        {/* Bulk Actions Bar - appears when songs are selected */}
        {isSelecting && (
          <div className="sticky top-0 z-30 mb-4 p-4 rounded-xl bg-gradient-to-r from-purple-900/80 to-purple-800/80 border border-purple-700 backdrop-blur-sm shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-white font-medium">
                  {selectedSongIds.size} track{selectedSongIds.size !== 1 ? 's' : ''} selected
                </div>
                {analyzing.active && (
                  <div className="text-sm text-zinc-200 hidden md:block">
                    <div className="flex items-center gap-3">
                      <div className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700">
                        <span className="font-semibold">Fast:</span>{' '}
                        <span className="ml-1">{batchFastElapsed != null ? fmt(batchFastElapsed) : 'â€”'}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700">
                        <span className="font-semibold">Deep:</span>{' '}
                        <span className="ml-1">{batchDeepElapsed != null ? fmt(batchDeepElapsed) : 'â€”'}</span>
                      </div>
                      <div className="px-2 py-1 rounded bg-zinc-800/60 border border-zinc-700">
                        <span className="font-semibold">Total:</span>{' '}
                        <span className="ml-1">{batchOverallElapsed != null ? fmt(batchOverallElapsed) : 'â€”'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <BarButton
                  onClick={handleBulkAnalyze}
                  className="text-xs bg-purple-600 hover:bg-purple-500 border-purple-500"
                >
                  ðŸ” Analyze
                </BarButton>
                {/* <BarButton
                  onClick={handleBulkMetadataFix}
                  className="text-xs bg-blue-600 hover:bg-blue-500 border-blue-500"
                >
                  ðŸ› ï¸ Fix Metadata
                </BarButton> */}
                <BarButton
                  onClick={() => selectAllSongs(sortedList)}
                  className="text-xs"
                >
                  Select All
                </BarButton>
                <BarButton
                  onClick={clearSelection}
                  className="text-xs bg-red-700 hover:bg-red-600 border-red-600"
                >
                  Clear
                </BarButton>
              </div>
            </div>
          </div>
        )}

        {/* Songs List with premium styling */}
        <div className="space-y-3">
              {sortedList.map((t) => {
            const isSelected = selectedSongIds.has(t.id);
            return (
              <div
                key={t.playlist_track_id ?? t.id ?? t.filePath}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer overflow-hidden border ${
                  isSelected
                    ? 'bg-purple-900/40 border-purple-500 shadow-lg shadow-purple-500/30'
                    : 'bg-gradient-to-r from-zinc-900 to-zinc-800 border-zinc-700 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-500/20 hover:border-purple-400'
                }`}
                onClick={() => {
                  console.log('Song tile clicked, playing:', t);
                  doPlay(t.filePath);
                }}
                onContextMenu={(e) => handleContextMenu(e, t)}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => toggleSongSelection(t.id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0"
                />

                {/* Main content area */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    {/* Album Art Thumbnail */}
                    {t.albumArt && (
                      <img
                        src={t.albumArt}
                        alt="Album Art"
                        className="w-14 h-14 rounded-lg flex-shrink-0 object-cover border border-zinc-600 shadow-lg"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-100 font-semibold truncate group-hover:text-purple-300 transition-colors">
                        {t.title || "(untitled)"}
                      </div>
                      
                      {/* Quick Rating and Color Inline Editors */}
                      <div className="flex items-center gap-2 mt-2">
                        {/* Rating stars - clickable */}
                        <div 
                          className="flex gap-1 cursor-pointer items-center"
                          onClick={(e) => e.stopPropagation()}
                          title="Click to rate (1-5 stars)"
                        >
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleQuickRating(t.id, star)}
                              className={`text-lg transition-all ${
                                t.rating && t.rating >= star
                                  ? 'text-yellow-400 hover:text-yellow-300'
                                  : 'text-gray-600 hover:text-yellow-400'
                              }`}
                            >
                              â˜…
                            </button>
                          ))}
                        </div>
                        
                        {/* Color dot - clickable (moved next to stars) */}
                        <div
                          className="relative ml-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              if (inlineEditingTrackId === t.id && inlineEditingField === 'color') {
                                setInlineEditingTrackId(null);
                                setInlineEditingField(null);
                              } else {
                                setInlineEditingTrackId(t.id);
                                setInlineEditingField('color');
                              }
                            }}
                            className={`w-5 h-5 rounded-full border-2 border-gray-400 hover:border-gray-200 transition-all hover:scale-110 ${
                              t.color 
                                ? COLORS.find(c => c.name === t.color)?.tailwind || 'bg-gray-500'
                                : 'bg-gray-500'
                            }`}
                            title="Click to change color"
                          />
                          
                          {/* Color picker dropdown */}
                          {inlineEditingTrackId === t.id && inlineEditingField === 'color' && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => {
                                setInlineEditingTrackId(null);
                                setInlineEditingField(null);
                              }} />
                              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-3 flex gap-2">
                                {COLORS.map((color) => (
                                  <button
                                    key={color.name}
                                    onClick={() => handleQuickColor(t.id, color.name)}
                                    className={`w-7 h-7 rounded-full border-2 transition-all hover:scale-110 ${
                                      t.color === color.name ? 'border-white ring-2 ring-white/50' : 'border-gray-500'
                                    } ${color.tailwind}`}
                                    title={color.name}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Duration and metadata badges - premium styling */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {t.hasPlaybackError === 1 && (
                        <div 
                          className="text-xs text-red-200 bg-red-900/70 px-2.5 py-1 rounded-full font-medium border border-red-600/70 flex items-center gap-1 cursor-pointer hover:bg-red-800/70 transition-colors"
                          title="This track has playback errors. Click to clear flag if you've fixed the file."
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await window.api.markTrackError(t.id, false);
                              setToast({ type: 'success', message: 'Cleared error flag' });
                              // Refresh the library to show updated state
                              if (activeTab === 'songs') {
                                const updated = await window.api.listSongs();
                                setSongs(updated);
                              }
                            } catch (err) {
                              console.error('Failed to clear error flag:', err);
                              setToast({ type: 'error', message: 'Failed to clear error flag' });
                            }
                          }}
                        >
                          âš ï¸ Corrupted
                        </div>
                      )}
                      {t.duration && (
                        <div className="text-xs text-zinc-300 bg-zinc-700/80 px-2.5 py-1 rounded-full font-medium">
                          {fmt(t.duration)}
                        </div>
                      )}
                      {t.bpm && (
                        <div className="text-xs text-blue-200 bg-blue-900/70 px-2.5 py-1 rounded-full font-medium border border-blue-600/70">
                          â™© {t.bpm}
                        </div>
                      )}
                      {t.key && (
                        <div className="text-xs text-green-200 bg-green-900/70 px-2.5 py-1 rounded-full font-medium border border-green-600/70">
                          {t.key}{t.mode?.charAt(0) || ''}
                        </div>
                      )}
                      {t.camelotKey && (
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500 shadow-lg shadow-green-500/40 flex-shrink-0 border border-green-400">
                          <span className="text-xs font-bold text-white">{t.camelotKey}</span>
                        </div>
                      )}
                      {/* Full Metadata Button */}
                      <BarButton
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/tagedit/${t.id}`);
                        }}
                        className="text-xs px-2.5 py-1 bg-purple-700/80 hover:bg-purple-600 border border-purple-600/70 hover:border-purple-500 text-purple-100"
                      >
                        â„¹ï¸ Info
                      </BarButton>
                    </div>
                  </div>
                </div>

                {/* Actions - prevent click propagation */}
                <div className="flex items-center gap-2 pr-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {filter.playlist && (
                    <BarButton
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromPlaylist(t.playlist_track_id);
                      }}
                      className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 border-red-500"
                    >
                      âœ•
                    </BarButton>
                  )}
                  
                  {!filter.playlist && playlists.length > 0 && (
                    <div className="relative">
                      <BarButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddToPlaylist(showAddToPlaylist === t.id ? null : t.id);
                        }}
                        className="text-xs px-2 py-1"
                      >
                        +
                      </BarButton>
                      
                      {showAddToPlaylist === t.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowAddToPlaylist(null);
                            }}
                          />
                          <div
                            className="absolute top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-40 right-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {playlists.map((playlist) => (
                              <button
                                key={playlist.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToPlaylist(playlist.id, t.id);
                                  setShowAddToPlaylist(null);
                                }}
                                className="block w-full text-left px-3 py-2 text-zinc-100 hover:bg-zinc-700 first:rounded-t-lg last:rounded-b-lg transition-colors text-sm"
                              >
                                ðŸ“‹ {playlist.name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  
                  {/* Context menu button removed - use inline add to playlist dropdown instead */}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  const renderWelcome = () => (
    <div className="text-center py-8">
      <div className="text-zinc-300 text-lg mb-3">Welcome to NGKsPlayer!</div>
      <div className="text-zinc-500 mb-6">Get started by adding your music folders</div>
      <div className="flex flex-wrap justify-center gap-3">
        <BarButton onClick={handleAutoScan} disabled={loading}>
          {loading ? 'Scanning...' : 'Auto Scan Common Folders'}
        </BarButton>
        <BarButton onClick={handleAddFolder} disabled={loading}>
          {loading ? 'Scanning...' : 'Add Music Folder'}
        </BarButton>
        <BarButton onClick={handleNormalize} disabled={loading}>
          ðŸ·ï¸ Normalize Filenames
        </BarButton>
      </div>
    </div>
  );

  const renderArtists = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {artists.map((a) => (
        <button
          key={a.name}
          onClick={() => onClickArtist(a.name)}
          className="text-left rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/20 p-4 transition-all duration-200 hover:-translate-y-1"
        >
          <div className="text-zinc-100 font-semibold truncate text-lg">{a.name}</div>
          <div className="text-zinc-400 text-sm mt-2">{a.tracks} {a.tracks === 1 ? "track" : "tracks"}</div>
        </button>
      ))}
    </div>
  );

  const renderAlbums = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {albums.map((al, i) => (
        <button
          key={`${al.artist ?? ""}|${al.name}|${i}`}
          onClick={() => onClickAlbum(al.name, al.artist)}
          className="text-left rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 p-4 transition-all duration-200 hover:-translate-y-1"
        >
          <div className="text-zinc-100 font-semibold truncate text-lg">{al.name || "(unknown album)"}</div>
          <div className="text-zinc-400 text-sm truncate">{al.artist}</div>
          <div className="text-zinc-500 text-sm mt-2">{al.tracks} {al.tracks === 1 ? "track" : "tracks"}</div>
        </button>
      ))}
    </div>
  );

  const renderFolders = () => (
    <div className="space-y-3">
      {folders.map((f, i) => (
        <div key={`${f.folder}|${i}`} className="rounded-xl bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 p-4 flex items-center justify-between transition-all duration-200">
          <div className="text-zinc-100 break-all text-sm flex-1 font-medium">{f.folder}</div>
          <button
            onClick={() => handleRemoveFolder(f.folder)}
            className="ml-3 p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
            title="Remove folder from library"
          >
            âœ•
          </button>
        </div>
      ))}
    </div>
  );

  const renderGenres = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {genres.map((g) => (
        <button
          key={g.name}
          onClick={() => onClickGenre(g.name)}
          className="text-left rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20 p-4 transition-all duration-200 hover:-translate-y-1"
        >
          <div className="text-zinc-100 font-semibold truncate text-lg">{g.name}</div>
          <div className="text-zinc-400 text-sm mt-2">{g.tracks} {g.tracks === 1 ? "track" : "tracks"}</div>
        </button>
      ))}
    </div>
  );

  const renderPlaylists = () => (
    <div>
      {/* Create new playlist section */}
      <div className="mb-4">
        {showCreatePlaylist ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800 border border-zinc-700">
            <input
              type="text"
              placeholder="Playlist name..."
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createPlaylist();
                if (e.key === "Escape") setShowCreatePlaylist(false);
              }}
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-600 text-zinc-100"
              autoFocus
            />
            <BarButton onClick={createPlaylist}>Create</BarButton>
            <BarButton onClick={() => setShowCreatePlaylist(false)}>Cancel</BarButton>
          </div>
        ) : (
          <BarButton onClick={() => setShowCreatePlaylist(true)}>+ New Playlist</BarButton>
        )}
      </div>

      {/* Playlists grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {playlists.map((playlist) => (
          <div key={playlist.id} className="rounded-xl bg-zinc-900 border border-zinc-800 p-3">
            {editingPlaylist === playlist.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={playlist.name}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renamePlaylist(playlist.id, e.target.value);
                    if (e.key === "Escape") setEditingPlaylist(null);
                  }}
                  className="w-full px-2 py-1 rounded bg-zinc-800 border border-zinc-600 text-zinc-100 text-sm"
                  autoFocus
                />
                <div className="flex gap-1">
                  <button
                    onClick={(e) => renamePlaylist(playlist.id, e.target.previousElementSibling.value)}
                    className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingPlaylist(null)}
                    className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-100 hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => onClickPlaylist(playlist.id)}
                  className="text-left w-full"
                >
                  <div className="text-zinc-100 font-medium truncate">{playlist.name}</div>
                </button>
                <div className="flex gap-1">
                  <button
                    onClick={() => onClickPlaylist(playlist.id)}
                    className="px-2 py-1 text-xs rounded bg-blue-700 text-blue-100 hover:bg-blue-600"
                  >
                    ðŸ‘ View
                  </button>
                  <button
                    onClick={() => playPlaylist(playlist.id)}
                    className="px-2 py-1 text-xs rounded bg-green-700 text-green-100 hover:bg-green-600"
                  >
                    â–¶ Play
                  </button>
                  <button
                    onClick={() => setEditingPlaylist(playlist.id)}
                    className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => deletePlaylist(playlist.id, playlist.name)}
                    className="px-2 py-1 text-xs rounded bg-red-700 text-red-100 hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Filter header label
  const activeFilterLabel = useMemo(() => {
    const parts = [];
    if (filter.artist) parts.push(`Artist: ${filter.artist}`);
    if (filter.album) parts.push(`Album: ${filter.album}`);
    if (filter.genre) parts.push(`Genre: ${filter.genre}`);
    if (filter.playlist) {
      const playlist = playlists.find(p => p.id == filter.playlist);
      if (playlist) parts.push(`Playlist: ${playlist.name}`);
    }
    return parts.join("  â€¢  ");
  }, [filter, playlists]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f12] via-[#0a0a0c] to-[#0d0d0f] p-6 max-w-full w-full">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">Library</h1>
          <div className="flex space-x-2">
          <button
            onClick={() => {
              console.error('ðŸŽµ PLAYER BUTTON CLICKED');
              console.error('ðŸŽµ Setting hash to #/player');
              window.location.hash = '#/player';
              console.error('ðŸŽµ Hash set, should navigate now');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white flex items-center space-x-2"
          >
            <span>ðŸŽµ</span>
            <span>Player</span>
          </button>
          <button
            onClick={() => navigate('/now')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-xl text-white flex items-center space-x-2"
          >
            <span>ðŸŽ§</span>
            <span>DJ Mode</span>
          </button>
          <button
            onClick={() => navigate('/4deck')}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl text-white flex items-center space-x-2 border border-cyan-400"
          >
            <span>ðŸŽ›ï¸</span>
            <span>4-Deck Pro</span>
          </button>
          <button
            onClick={() => navigate('/clipper')}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-xl text-white flex items-center space-x-2"
          >
            <span>ðŸŽ¬</span>
            <span>Clipper</span>
          </button>
        </div>
      </div>

      {/* Top bar with Tabs and Search */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {TABS.map((t) => (
            <Pill key={t} active={t === tab} onClick={() => setTab(t)}>
              {t}
            </Pill>
          ))}
        </div>
        
        {/* Full-width Search Bar */}
        <input
          className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          placeholder="ðŸ” Search title â€¢ artist â€¢ album â€¢ genre (Ctrl+A to select all)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value) loadForTab(); // Auto-search as you type
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              return;
            }
            if (e.key === "Enter") loadForTab();
          }}
          autoComplete="off"
          spellCheck="false"
          style={{ userSelect: 'text' }}
        />
      </div>

        {/* Action buttons in a separate row */}
        <div className="w-full flex flex-wrap gap-2">
          {/* Show Play All button when there are songs to play */}
          {!loading && songs.length > 0 && (
            tab === "Songs" || 
            filter.artist || 
            filter.album || 
            filter.genre || 
            filter.playlist
          ) && (
            <BarButton 
              onClick={doPlayAll} 
              className="px-3 py-2 rounded-xl border border-blue-600 bg-blue-600 text-white hover:bg-blue-500"
            >
              â–¶ Play All ({songs.length})
            </BarButton>
          )}

          <BarButton onClick={handleAddFolder}>Add Folder</BarButton>
          <BarButton onClick={handleNormalize}>ðŸ·ï¸ Normalize</BarButton>
          <BarButton onClick={goNowPlaying}>Now Playing</BarButton>
          <BarButton onClick={goTagEditor}>Tag Editor</BarButton>
          <BarButton onClick={goLayerRemover}>ðŸŽµ Layer Remover</BarButton>
          <BarButton onClick={goSettings}>âš™ï¸ Settings</BarButton>
        </div>

      {/* Active filter pill */}
      {(filter.artist || filter.album || filter.genre || filter.playlist) && (
        <div className="mb-2">
          <Pill active onClick={clearFilters}>
            {activeFilterLabel} â€” Clear
          </Pill>
        </div>
      )}

      {/* Content */}
      <Section
        title={
          tab === "Songs"
            ? (filter.artist || filter.album || filter.genre || filter.playlist ? `Songs â€¢ ${activeFilterLabel}` : "Songs")
            : filter.artist || filter.album || filter.genre || filter.playlist ? `${tab} â€¢ ${activeFilterLabel}` : tab
        }
        right={loading ? <span className="text-zinc-500 text-sm">Loadingâ€¦</span> : null}
      >
        {loading ? null : (
          <>
            {tab === "Artists" && (filter.artist ? renderSongs(songs) : artists.length > 0 ? renderArtists() : renderWelcome())}
            {tab === "Albums" && (filter.album ? renderSongs(songs) : albums.length > 0 ? renderAlbums() : renderWelcome())}
            {tab === "Folders" && (folders.length > 0 ? renderFolders() : renderWelcome())}
            {tab === "Genres" && (filter.genre ? renderSongs(songs) : genres.length > 0 ? renderGenres() : renderWelcome())}
            {tab === "Playlists" && (
              <>
                {renderPlaylists()}
                {filter.playlist && songs.length > 0 && (
                  <div className="mt-8">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">Playlist Tracks</h2>
                    {renderSongs(songs)}
                  </div>
                )}
              </>
            )}
            {tab === "Songs" && (songs.length > 0 ? renderSongs(songs) : renderWelcome())}
          </>
        )}
      </Section>
      
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* Folder Selector Modal */}
      {showFolderSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              Select Folder to Normalize
            </h3>
            
            <div className="space-y-2 mb-4">
              {folders.map((folder, index) => (
                <div
                  key={index}
                  className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 flex items-start justify-between"
                >
                  <button
                    onClick={() => handleSelectFolder(folder.path)}
                    className="flex-1 text-left hover:bg-zinc-700 transition-colors rounded p-2 -m-2"
                  >
                    <div className="font-medium">{folder.name}</div>
                    <div className="text-sm text-zinc-400">{folder.path}</div>
                    <div className="text-xs text-zinc-500">{folder.count} tracks</div>
                  </button>
                  
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveFolder(folder.path)}
                    className="ml-2 p-2 rounded text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors"
                    title="Remove folder from library"
                  >
                    âœ•
                  </button>
                </div>
              ))}
            </div>
            
            <div className="border-t border-zinc-700 pt-4 space-y-2">
              <button
                onClick={handleBrowseForFolder}
                className="w-full p-3 rounded bg-blue-600 hover:bg-blue-700 transition-colors text-center"
              >
                ðŸ“ Browse for Other Folder...
              </button>
              
              <button
                onClick={() => setShowFolderSelector(false)}
                className="w-full p-3 rounded bg-zinc-700 hover:bg-zinc-600 transition-colors text-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <NormalizeModal 
        isOpen={showNormalizeModal}
        onClose={() => {
          setShowNormalizeModal(false);
          setNormalizeFolder("");
          // Refresh the library after normalizing
          loadForTab();
        }}
        folderPath={normalizeFolder}
      />

      {/* Voice Control */}
      <VoiceControl 
        onCommand={handleVoiceCommand}
        position="bottom-right"
        showTranscript={true}
      />

      {/* Analysis Progress Bar - Floating at bottom center */}
      {analyzing.active && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
          <div className="bg-gray-900/95 backdrop-blur-lg border border-gray-700 rounded-2xl shadow-2xl px-8 py-5 text-white">
            <div className="text-lg font-medium mb-2">
              Analyzing {analyzing.total} tracksâ€¦
            </div>

            <div className="text-sm text-gray-400 mb-3">
              Fast data: {analyzing.fastDone} | Deep analysis: {analyzing.deepDone}/{analyzing.total}
            </div>

            {/* Progress bar */}
            <div className="w-96 h-4 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-600 to-cyan-500 transition-all duration-500"
                style={{ width: `${analyzing.total > 0 ? Math.round((analyzing.completed / analyzing.total) * 100) : 0}%` }}
              />
            </div>

            <div className="text-center mt-2 text-sm">
              {analyzing.total > 0 ? Math.round((analyzing.completed / analyzing.total) * 100) : 0}% complete
            </div>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleCancelAnalysis}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition"
          >
            Cancel Analysis
          </button>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          tracks={songs}
          playlists={playlists}
          showPlaylistSubmenu={showPlaylistSubmenu}
          setShowPlaylistSubmenu={setShowPlaylistSubmenu}
          showNewPlaylistInput={showNewPlaylistInput}
          setShowNewPlaylistInput={setShowNewPlaylistInput}
          newPlaylistName={contextNewPlaylistName}
          setNewPlaylistName={setContextNewPlaylistName}
          showRenameInput={showRenameInput}
          setShowRenameInput={setShowRenameInput}
          newFileName={newFileName}
          setNewFileName={setNewFileName}
          renameInputRef={renameInputRef}
          onPlay={doPlay}
          onAddToPlaylist={(track, playlistId) => {
            // Add to playlist functionality - reuse existing logic
            setToast({ type: 'info', message: 'Feature coming soon!' });
          }}
          onCreatePlaylist={(name) => {
            setNewPlaylistName(name);
            handleCreatePlaylist();
          }}
          onShowInExplorer={showInExplorer}
          onCopyFilePath={copyPath}
          onAnalyze={analyzeTrack}
          onRename={renameFile}
          onStartRename={startRename}
          onRemoveFromLibrary={removeFromLibrary}
          onDeleteFile={deleteFile}
        />
      )}
    </div>
  );
}

