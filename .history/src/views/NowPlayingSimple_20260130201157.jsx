import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useFeature } from '../state/features'
// import { useEssentiaBeatDetection } from '../hooks/useEssentiaBeatDetection'
import { pickNextIndex } from '../utils/randomizer'
import { formatTime } from '../analysis/utils'
import { Toast } from '../DJ/Mixer/Common/Toast'
import VoiceControl from '../components/VoiceControl'
import BeatDetectionPanel from '../components/BeatDetectionPanel'

// Import CSS for styling
import './nowplaying.css'

// Import extracted hooks
import { useTracks } from '../hooks/useTracks'
import { useCurrentTrack } from '../hooks/useCurrentTrack'
import { useWaveform } from '../hooks/useWaveform'
import { useBeatPulse } from '../hooks/useBeatPulse'
import { useAutoplay } from '../hooks/useAutoplay'
import { usePlaylists } from '../hooks/usePlaylists'
import { useContextMenu } from '../hooks/useContextMenu'

// Import extracted components
import { NowPlayingHeader } from '../components/player/NowPlayingHeader'
import { PlayerControls } from '../components/player/PlayerControls'
import { TrackList } from '../components/player/TrackList'
import { ContextMenu } from '../components/player/ContextMenu'

export default function NowPlayingBasic({ onNavigate }) {
  // Theme
  const { currentTheme, changeTheme, themes } = useTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  
  // Toast
  const [toast, setToast] = useState(null)
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])
  
  // Play mode & Volume
  const [playMode, setPlayMode] = useFeature('playMode', 'inOrder')
  const [volume, setVolume] = useState(1)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Force refresh trigger
  
  // ========== EXTRACTED HOOKS ==========
  // Tracks management
  const tracksHook = useTracks()
  const { 
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
  } = tracksHook
  
  // ========== REFRESH FUNCTION ==========
  const handleLibraryRefresh = useCallback(async () => {
    console.log('[Frontend] Manual library refresh triggered')
    setTracks([]) // Clear tracks immediately for visual feedback
    showToast('🔄 Rescanning music library...', 'info')
    
    try {
      // First try auto-scan to pick up file changes
      const scanResult = await window.api.invoke('library:autoScan', {})
      console.log('[Frontend] Rescan result:', scanResult)
      
      if (scanResult.added > 0) {
        showToast(`✅ Library rescanned! Added ${scanResult.added} new tracks.`, 'success')
      } else {
        showToast('✅ Library rescanned successfully!', 'success')
      }
      
      // Then reload tracks
      await loadTracks()
      console.log('[Frontend] Library refresh completed')
    } catch (err) {
      console.error('[Frontend] Library rescan failed:', err)
      showToast('❌ Library rescan failed', 'error')
    }
  }, [loadTracks, setTracks, showToast])
  
  // Current track state
  const currentTrackHook = useCurrentTrack(tracks, playMode)
  const {
    currentTrack,
    setCurrentTrack,
    currentIndex,
    setCurrentIndex,
    isPlaying,
    setIsPlaying,
    position,
    setPosition,
    duration,
    setDuration,
    nextTrackInfo,
    cachedNextIndex,
    setCachedNextIndex,
    detectedBPM,
    setDetectedBPM,
    currentIndexRef,
    cachedNextIndexRef,
    updateCurrentTrack
  } = currentTrackHook
  
  // Beat pulse state
  const beatPulseHook = useBeatPulse()
  const {
    beatPulse,
    setBeatPulse,
    beatPulseEnabled,
    setBeatPulseEnabled,
    peakRotation,
    setPeakRotation,
    showBeatControls,
    setShowBeatControls,
    beatSpikeThreshold,
    setBeatSpikeThreshold,
    beatMinimum,
    setBeatMinimum,
    beatGate,
    setBeatGate,
    beatHistoryLength,
    setBeatHistoryLength,
    debugValues,
    setDebugValues,
    beatPulseEnabledRef,
    beatThresholdRef,
    beatMinRef,
    beatGateRef
  } = beatPulseHook
  
  // Playlists
  const playlistsHook = usePlaylists(showToast)
  const { playlists, setPlaylists, loadPlaylists, addToPlaylist, createNewPlaylist } = playlistsHook
  
  // Context menu
  const contextMenuHook = useContextMenu()
  const {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    showPlaylistSubmenu,
    setShowPlaylistSubmenu,
    showNewPlaylistInput,
    setShowNewPlaylistInput,
    newPlaylistName,
    setNewPlaylistName,
    showRenameInput,
    setShowRenameInput,
    newFileName,
    setNewFileName,
    renameInputRef
  } = contextMenuHook
  
  // ========== ESSENTIA BEAT DETECTION ==========
  const [useEssentiaBeats, setUseEssentiaBeats] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [panelExpanded, setPanelExpanded] = useState(true)
  const [onsetMethod, setOnsetMethod] = useState('complex')
  const [onsetThreshold, setOnsetThreshold] = useState(0.08)
  const [silenceThreshold, setSilenceThreshold] = useState(0.10)
  const [confidenceGate, setConfidenceGate] = useState(0.65)
  const [lowFreqWeight, setLowFreqWeight] = useState(1.8)
  const [minBeatInterval, setMinBeatInterval] = useState(350)
  const [postProcessMode, setPostProcessMode] = useState('none')
  
  // ========== AUDIO & WAVEFORM SETUP ==========
  const audioContextRef = useRef(null)
  const essentiaSourceNodeRef = useRef(null)
  const audioRef = useRef(null)
  
  // ========== PLAYBACK FUNCTIONS ==========
  const playTrack = useCallback(async (track, index) => {
    if (!track || !audioRef.current) return
    
    updateCurrentTrack(track, index)
    
    // Use Electron's ngksplayer:// protocol for file access
    let audioSrc;
    if (track.filePath?.startsWith('ngksplayer://')) {
      audioSrc = track.filePath;
    } else if (track.filePath?.startsWith('http://') || track.filePath?.startsWith('https://')) {
      audioSrc = track.filePath;
    } else {
      audioSrc = `ngksplayer://${track.filePath}`;
    }
    
    audioRef.current.src = audioSrc
    audioRef.current.volume = volume
    
    try {
      await audioRef.current.play()
      
      // Cache next track
      if (index !== undefined && tracks.length > 0) {
        const nextIdx = pickNextIndex(playMode, tracks, index, { mutate: false })
        setCachedNextIndex(nextIdx)
      }
      
      showToast(`Now playing: ${track.title || track.filename}`, 'success')
    } catch (err) {
      // Ignore AbortError - happens when a new track loads before previous finishes
      if (err.name === 'AbortError') {
        console.log('[playTrack] Play interrupted by new track load')
        return
      }
      console.error('Error playing track:', err)
      showToast('Failed to play track', 'error')
    }
  }, [tracks, playMode, volume, updateCurrentTrack, setCachedNextIndex, showToast])
  
  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return
    
    let nextIndex
    if (cachedNextIndex !== null && cachedNextIndex !== undefined) {
      nextIndex = cachedNextIndex
    } else {
      nextIndex = pickNextIndex(playMode, tracks, currentIndexRef.current ?? 0)
    }
    
    if (nextIndex !== null && nextIndex !== undefined && tracks[nextIndex]) {
      playTrack(tracks[nextIndex], nextIndex)
    }
  }, [tracks, playMode, cachedNextIndex, currentIndexRef, playTrack])
  
  const prevTrack = useCallback(() => {
    if (tracks.length === 0) return
    
    let prevIndex
    if (playMode === 'inOrder' || playMode === 'repeatAll') {
      prevIndex = currentIndexRef.current > 0 ? currentIndexRef.current - 1 : tracks.length - 1
    } else {
      prevIndex = pickNextIndex(playMode, tracks, currentIndexRef.current ?? 0)
    }
    
    if (prevIndex !== null && prevIndex !== undefined && tracks[prevIndex]) {
      playTrack(tracks[prevIndex], prevIndex)
    }
  }, [tracks, playMode, currentIndexRef, playTrack])
  
  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return
    
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (!currentTrack && filteredTracks.length > 0) {
        playTrack(filteredTracks[0], 0)
      } else {
        audioRef.current.play().catch(err => {
          console.error('Play error:', err)
          showToast('Failed to resume playback', 'error')
        })
      }
    }
  }, [isPlaying, currentTrack, filteredTracks, playTrack, showToast])
  
  // Essentia hook - COMPLETELY DISABLED TO DEBUG WASM DOWNLOAD
  // const { isReady: essentiaReady } = useEssentiaBeatDetection({
  const essentiaReady = false;
  /*
  useEssentiaBeatDetection({
    audioContext: audioContextRef.current,
    sourceNode: essentiaSourceNodeRef.current,
    enabled: useEssentiaBeats && beatPulseEnabled,
    genre: currentTrack?.genre || 'rock',
    onsetMethod,
    onsetThreshold,
    silenceThreshold,
    confidenceGate,
    lowFreqWeight,
    minBeatInterval,
    postProcessMode,
    onBeat: ({ time, strength, confidence }) => {
      setBeatPulse(true)
      setTimeout(() => setBeatPulse(false), 150)
      
      if (confidence > confidenceGate * 2) {
        setPeakRotation(true)
        setTimeout(() => setPeakRotation(false), 1500)
      }
    }
  })
  */
  
  // Audio element setup with event listeners
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = document.createElement('audio')
    }
    
    const audio = audioRef.current
    
    const handleEnded = () => {
      if (playMode === 'stop') {
        setIsPlaying(false)
      } else {
        nextTrack()
      }
    }
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }
    
    const handleTimeUpdate = () => {
      setPosition(audio.currentTime)
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
    }
    
    const handlePause = () => {
      setIsPlaying(false)
    }
    
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    
    return () => {
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
    }
  }, [playMode, nextTrack, setIsPlaying, setDuration, setPosition])
  
  // Waveform hook (manages canvas rendering and beat detection)
  const { waveformCanvasRef, analyzerRef, waveformType, setWaveformType } = useWaveform(
    audioRef,
    isPlaying,
    beatPulseEnabledRef,
    {
      enabled: beatPulseEnabled,
      threshold: beatSpikeThreshold,
      minimum: beatMinimum,
      gate: beatGate,
      historyLength: beatHistoryLength,
      beatThresholdRef,
      beatMinRef,
      beatGateRef
    },
    setBeatPulse,
    setPeakRotation,
    setDebugValues,
    useEssentiaBeats
  )
  
  // ========== INITIALIZATION ==========
  useEffect(() => {
    if (!window.trackLog) window.trackLog = []
    loadPlaylists()
    
    // Check sessionStorage for library context
    const storedContext = sessionStorage.getItem('ngks_library_context')
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext)
        sessionStorage.removeItem('ngks_library_context')
        
        if (context.type === 'playlist' && context.playlistId) {
          window.api.getPlaylistTracks(context.playlistId)
            .then((result) => {
              if (result && Array.isArray(result)) {
                setTracks(result)
                showToast(`Loaded playlist (${result.length} tracks)`, 'success')
                
                if (result.length > 0) {
                  const startIndex = playMode === 'shuffle' || playMode === 'randomNoRepeat' 
                    ? Math.floor(Math.random() * result.length)
                    : 0
                  
                  setTimeout(() => {
                    playTrack(result[startIndex], startIndex)
                  }, 100)
                }
              } else {
                loadTracks()
              }
            })
            .catch((err) => {
              console.error('Failed to load playlist tracks:', err)
              showToast('Failed to load playlist', 'error')
              loadTracks()
            })
          return
        }
      } catch (e) {
        console.error('Error parsing library context:', e)
      }
    }
    
    // Listen for library context
    const cleanup = window.api.onLibraryLoad?.((data) => {
      console.log('[NowPlaying] Received library context:', data)
      
      if (data.type === 'playlist' && data.playlistId) {
        window.api.getPlaylistTracks(data.playlistId)
          .then((result) => {
            if (result && Array.isArray(result)) {
              setTracks(result)
              showToast(`Loaded playlist: ${data.playlistName}`, 'success')
            } else {
              showToast('Playlist is empty', 'warning')
              setTracks([])
            }
          })
          .catch((err) => {
            console.error('Failed to load playlist tracks:', err)
            showToast('Failed to load playlist', 'error')
          })
      } else {
        loadTracks()
      }
    })
    
    loadTracks()
    
    return cleanup
  }, []) // eslint-disable-line
  
  // Autoplay hook
  useAutoplay(tracks, playTrack, showToast)
  
  // ========== ADDITIONAL PLAYBACK CONTROLS ==========
  const handleSeek = (e) => {
    if (audioRef.current) {
      audioRef.current.currentTime = parseFloat(e.target.value)
    }
  }
  
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
  }
  
  // ========== CONTEXT MENU ACTIONS ==========
  const showInExplorer = (track) => {
    window.api.showInExplorer(track.filePath)
    setContextMenu(null)
  }
  
  const copyPath = (track) => {
    navigator.clipboard.writeText(track.filePath)
    showToast('Path copied to clipboard', 'success')
    setContextMenu(null)
  }
  
  const analyzeTrack = async (track) => {
    setContextMenu(null)
    showToast('Starting analysis...', 'info')
    
    try {
      const result = await window.api.analyzeTrack(track.filePath)
      if (result.success) {
        showToast('Analysis complete!', 'success')
        loadTracks()
      } else {
        showToast(`Analysis failed: ${result.error}`, 'error')
      }
    } catch (err) {
      console.error('Analysis error:', err)
      showToast('Analysis error', 'error')
    }
  }
  
  const renameFile = async (track) => {
    if (!newFileName.trim()) {
      showToast('❌ Filename cannot be empty', 'error')
      return
    }
    
    setContextMenu(null)
    showToast('🔄 Renaming file...', 'info')
    
    try {
      // Extract extension safely from the file path
      const originalPath = track.filePath || ''
      const pathParts = originalPath.split(/[/\\]/)
      const fullFileName = pathParts[pathParts.length - 1] || ''
      const extensionMatch = fullFileName.match(/\.([^.]+)$/)
      const originalExt = extensionMatch ? extensionMatch[1] : 'mp3' // default to mp3 if no extension
      
      let finalNewName = newFileName.trim()
      
      console.log('[Frontend] Rename details:')
      console.log('  Original path:', originalPath)
      console.log('  Full filename:', fullFileName)
      console.log('  Detected extension:', originalExt)
      console.log('  User input:', finalNewName)
      
      // Frontend safety: add extension if missing (backup for backend logic)
      if (!finalNewName.includes('.')) {
        finalNewName = `${finalNewName}.${originalExt}`
        console.log('[Frontend] Added extension as safety measure:', finalNewName)
      }
      
      console.log('[Frontend] Final name to send:', finalNewName)
      console.log('[Frontend] Renaming:', track.filePath, 'to:', finalNewName)
      
      const result = await window.api.renameTrack(track.filePath, finalNewName)
      console.log('[Frontend] Rename result:', result)
      
      if (result && result.success) {
        showToast('✅ File renamed successfully! Updating library...', 'success')
        console.log('[Frontend] File renamed successfully, auto-rescanning library...')
        
        try {
          // Automatically rescan library after successful rename
          const scanResult = await window.api.invoke('library:autoScan', {})
          console.log('[Frontend] Auto-rescan result:', scanResult)
          
          // Reload tracks with fresh data
          await loadTracks()
          
          showToast('🎵 Library updated! File renamed and rescanned.', 'success')
          console.log('[Frontend] Auto-rescan and refresh completed')
        } catch (scanErr) {
          console.error('[Frontend] Auto-rescan failed:', scanErr)
          showToast('✅ File renamed, but library rescan failed. Click "🔄 Rescan" manually.', 'warning')
        }
      } else {
        const errorMsg = result?.error || 'Unknown error occurred'
        showToast(`❌ Rename failed: ${errorMsg}`, 'error')
        console.error('[Frontend] Rename failed:', result)
        
        // Show critical errors prominently
        if (errorMsg.includes('already exists')) {
          alert(`⚠️ RENAME ERROR\n\nA file with that name already exists!\n\nOriginal: ${track.filename}\nNew name: ${finalNewName}`)
        }
      }
    } catch (err) {
      console.error('[Frontend] Rename error:', err)
      const errorMessage = `❌ Critical rename error: ${err.message}`
      showToast(errorMessage, 'error')
      alert(`🚨 FILE OPERATION ERROR\n\n${err.message}\n\nCheck console for details.`)
    }
    
    setShowRenameInput(false)
    setNewFileName('')
    
    // Small delay to ensure UI updates, then restore search focus
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]')
      if (searchInput) searchInput.focus()
    }, 100)
  }
  
  const startRename = (track) => {
    // Extract just the filename from the path, without directory
    const baseName = track.filePath ? track.filePath.split(/[/\\]/).pop() : (track.filename || track.title || '')
    // Remove extension for editing
    const nameWithoutExt = baseName ? baseName.replace(/\.[^/.]+$/, '') : ''
    console.log('[Frontend] startRename - track:', track)
    console.log('[Frontend] startRename - baseName:', baseName, 'nameWithoutExt:', nameWithoutExt)
    
    setNewFileName(nameWithoutExt)
    setShowRenameInput(true)
    // Focus the input after it renders
    setTimeout(() => {
      if (renameInputRef.current) {
        renameInputRef.current.focus()
        renameInputRef.current.select() // Select all text for easy replacement
      }
    }, 10)
  }

  const removeFromLibrary = async (track) => {
    if (!confirm(`Remove "${track.title || track.filename}" from library?`)) return
    
    setContextMenu(null)
    showToast('Removing from library...', 'info')
    
    try {
      const result = await window.api.removeFromLibrary(track.id)
      if (result.success) {
        showToast('Removed from library', 'success')
        loadTracks()
      } else {
        showToast(`Remove failed: ${result.error}`, 'error')
      }
    } catch (err) {
      console.error('Remove error:', err)
      showToast('Remove error', 'error')
    }
    
    // Small delay to ensure UI updates, then restore search focus
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]')
      if (searchInput) searchInput.focus()
    }, 100)
  }
  
  const deleteFile = async (track) => {
    if (!confirm(`PERMANENTLY DELETE "${track.title || track.filename}"?\n\nThis action CANNOT be undone!`)) return
    
    setContextMenu(null)
    showToast('Deleting file...', 'info')
    
    try {
      const result = await window.api.deleteTrack(track.filePath)
      if (result.success) {
        showToast('File deleted', 'success')
        loadTracks()
      } else {
        showToast(`Delete failed: ${result.error}`, 'error')
      }
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Delete error', 'error')
    }    
    // Small delay to ensure UI updates, then restore search focus
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"]')
      if (searchInput) searchInput.focus()
    }, 100)  }
  
  // ========== VOICE COMMAND HANDLER ==========
  const handleVoiceCommand = (command) => {
    const cmd = command.toLowerCase()
    
    if (cmd.includes('play')) {
      if (!isPlaying) togglePlayPause()
    } else if (cmd.includes('pause') || cmd.includes('stop')) {
      if (isPlaying) togglePlayPause()
    } else if (cmd.includes('next')) {
      nextTrack()
    } else if (cmd.includes('previous') || cmd.includes('back')) {
      prevTrack()
    } else if (cmd.includes('shuffle')) {
      setPlayMode('shuffle')
      showToast('Shuffle mode enabled', 'success')
    } else if (cmd.includes('repeat')) {
      setPlayMode('repeatAll')
      showToast('Repeat all enabled', 'success')
    }
  }
  
  // ========== KEYBOARD SHORTCUTS ==========
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT') return
      
      if (e.code === 'Space') {
        e.preventDefault()
        togglePlayPause()
      } else if (e.code === 'ArrowRight') {
        nextTrack()
      } else if (e.code === 'ArrowLeft') {
        prevTrack()
      }
    }
    
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, currentTrack, tracks, playMode]) // eslint-disable-line
  
  // ========== RENDER ==========
  return (
    <>
      <div 
        className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
        onClick={() => {
          setContextMenu(null)
          setShowThemeMenu(false)
        }}
      >
        {/* Header */}
        <NowPlayingHeader 
          detectedBPM={detectedBPM}
          showThemeMenu={showThemeMenu}
          setShowThemeMenu={setShowThemeMenu}
          themes={themes}
          currentTheme={currentTheme}
          onChangeTheme={changeTheme}
          onNavigate={onNavigate}
        />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top: Waveform and Controls - Responsive height */}
          <div className="flex flex-col np-waveform-section">
            <div className="flex-1 bg-black/40 rounded-lg border border-gray-700/50 overflow-hidden relative mx-6 mt-6">
              <canvas
                ref={waveformCanvasRef}
                className="w-full h-full cursor-pointer"
                onClick={togglePlayPause}
              />
              
              {/* Beat Pulse Overlay */}
              {beatPulse && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="w-full h-full bg-blue-500/20 animate-pulse" />
                </div>
              )}
              
              {/* Current Track Display Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                {currentTrack ? (
                  <div className="text-center px-8 max-w-4xl">
                    <h2 
                      className="font-extrabold text-white drop-shadow-2xl transition-all duration-150"
                      style={{
                        fontFamily: '"Arial Black", "Impact", sans-serif',
                        fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                        transform: peakRotation 
                          ? 'scale(1.08)' 
                          : beatPulse ? 'scale(1.08)' : 'scale(1)',
                        animation: peakRotation ? 'orbitalSpin 1.5s ease-in-out' : 'none',
                        textShadow: beatPulse 
                          ? '0 0 30px rgba(239, 68, 68, 0.9), 0 0 60px rgba(239, 68, 68, 0.5), 0 6px 18px rgba(0,0,0,1), 0 8px 25px rgba(0,0,0,1)' 
                          : '0 6px 18px rgba(0,0,0,1), 0 8px 25px rgba(0,0,0,1)',
                        WebkitTextStroke: '4px rgba(255, 255, 255, 0.3)',
                        paintOrder: 'stroke fill',
                        filter: beatPulse ? 'brightness(1.2) drop-shadow(0 0 15px rgba(255,255,255,0.6)) drop-shadow(0 8px 20px rgba(0,0,0,1))' : 'brightness(1) drop-shadow(0 8px 20px rgba(0,0,0,1))',
                        letterSpacing: '0.02em',
                        lineHeight: '1.2'
                      }}
                    >
                      {currentTrack.title || currentTrack.filename || 'Unknown Title'}
                    </h2>
                    
                    {nextTrackInfo && (
                      <div className="mt-8 pt-6 border-t border-gray-600">
                        <p 
                          className="mb-2 font-semibold"
                          style={{
                            fontSize: 'clamp(0.75rem, 1vw, 1rem)',
                            color: '#0ea5e9',
                            WebkitTextStroke: '2px rgba(14, 165, 233, 0.4)',
                            paintOrder: 'stroke fill',
                            textShadow: '0 3px 8px rgba(0,0,0,1), 0 5px 12px rgba(0,0,0,1)',
                            filter: 'drop-shadow(0 4px 10px rgba(0,0,0,1))'
                          }}
                        >
                          Up Next:
                        </p>
                        <p 
                          className="font-bold"
                          style={{
                            fontFamily: '"Arial Black", "Impact", sans-serif',
                            fontSize: 'clamp(1rem, 2vw, 1.75rem)',
                            WebkitTextStroke: '4px rgba(255, 255, 255, 0.3)',
                            paintOrder: 'stroke fill',
                            textShadow: '0 5px 15px rgba(0,0,0,1), 0 7px 20px rgba(0,0,0,1)',
                            filter: 'drop-shadow(0 6px 15px rgba(0,0,0,1))',
                            lineHeight: '1.2'
                          }}
                        >
                          {nextTrackInfo.title || nextTrackInfo.filename}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">No track selected</h2>
                    <p className="text-gray-400">Choose a track from the list to start playing</p>
                  </div>
                )}
              </div>
              
              {/* Waveform Type Selector */}
              <div className="absolute bottom-4 right-4 z-30 flex gap-2 pointer-events-auto">
                <button
                  className={`px-3 py-1 rounded text-xs ${waveformType === 'line' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => { e.stopPropagation(); setWaveformType('line'); }}
                  title="Line Waveform"
                >
                  〰️ Line
                </button>
                <button
                  className={`px-3 py-1 rounded text-xs ${waveformType === 'bars' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => { e.stopPropagation(); setWaveformType('bars'); }}
                  title="Frequency Bars"
                >
                  📊 Bars
                </button>
                <button
                  className={`px-3 py-1 rounded text-xs ${waveformType === 'circle' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => { e.stopPropagation(); setWaveformType('circle'); }}
                  title="Circular Waveform"
                >
                  ⭕ Circle
                </button>
                <button
                  className={`px-3 py-1 rounded text-xs ${waveformType === 'none' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => { e.stopPropagation(); setWaveformType('none'); }}
                  title="No Waveform"
                >
                  ✖️ None
                </button>
              </div>
              
              {/* Beat Pulse Toggle */}
              <div className="absolute bottom-4 left-4 z-30 flex gap-2 pointer-events-auto">
                <button
                  className={`px-4 py-2 rounded font-semibold text-sm transition-all ${beatPulseEnabled ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setBeatPulseEnabled(!beatPulseEnabled);
                  }}
                  title="Toggle beat-reactive title pulse"
                >
                  {beatPulseEnabled ? '🔴 Pulse ON' : '⚫ Pulse OFF'}
                </button>
                
                <button
                  className={`px-4 py-2 rounded font-semibold text-sm transition-all ${showBeatControls ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowBeatControls(!showBeatControls);
                  }}
                  title="Show beat detection controls"
                >
                  ⚙️ Tune
                </button>
              </div>
            </div>
            
            {/* Controls */}
            <div className="px-6 pb-6">
              <PlayerControls 
                position={position}
                duration={duration}
                isPlaying={isPlaying}
                volume={volume}
                playMode={playMode}
                tracks={tracks}
                onTogglePlayPause={togglePlayPause}
                onPrevTrack={prevTrack}
                onNextTrack={nextTrack}
                onSeek={handleSeek}
                onVolumeChange={handleVolumeChange}
                onPlayModeChange={setPlayMode}
                formatTime={formatTime}
              />
            </div>
          </div>
          
          {/* Bottom: Track List - Increased height with scrolling */}
          <div className="flex-1 border-t border-gray-700/50 overflow-hidden">
            <TrackList 
              key={refreshTrigger} // Force re-render when refresh trigger changes
              tracks={tracks}
              filteredTracks={filteredTracks}
              currentIndex={currentIndex}
              onPlay={playTrack}
              onContextMenu={handleContextMenu}
              formatTime={formatTime}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              onRefresh={handleLibraryRefresh}
            />
          </div>
        </div>
        
        {/* Beat Detection Panel */}
        <BeatDetectionPanel
          show={showBeatControls}
          onClose={() => setShowBeatControls(false)}
          useEssentiaBeats={useEssentiaBeats}
          setUseEssentiaBeats={setUseEssentiaBeats}
          beatPulseEnabled={beatPulseEnabled}
          setBeatPulseEnabled={setBeatPulseEnabled}
          beatSpikeThreshold={beatSpikeThreshold}
          setBeatSpikeThreshold={setBeatSpikeThreshold}
          beatMinimum={beatMinimum}
          setBeatMinimum={setBeatMinimum}
          beatGate={beatGate}
          setBeatGate={setBeatGate}
          beatHistoryLength={beatHistoryLength}
          setBeatHistoryLength={setBeatHistoryLength}
          debugValues={debugValues}
          panelExpanded={panelExpanded}
          setPanelExpanded={setPanelExpanded}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
          onsetMethod={onsetMethod}
          setOnsetMethod={setOnsetMethod}
          onsetThreshold={onsetThreshold}
          setOnsetThreshold={setOnsetThreshold}
          silenceThreshold={silenceThreshold}
          setSilenceThreshold={setSilenceThreshold}
          confidenceGate={confidenceGate}
          setConfidenceGate={setConfidenceGate}
          lowFreqWeight={lowFreqWeight}
          setLowFreqWeight={setLowFreqWeight}
          minBeatInterval={minBeatInterval}
          setMinBeatInterval={setMinBeatInterval}
          postProcessMode={postProcessMode}
          setPostProcessMode={setPostProcessMode}
          essentiaReady={essentiaReady}
        />
      </div>
      
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
          contextMenu={contextMenu}
          setContextMenu={setContextMenu}
          tracks={tracks}
          playlists={playlists}
          showPlaylistSubmenu={showPlaylistSubmenu}
          setShowPlaylistSubmenu={setShowPlaylistSubmenu}
          showNewPlaylistInput={showNewPlaylistInput}
          setShowNewPlaylistInput={setShowNewPlaylistInput}
          newPlaylistName={newPlaylistName}
          setNewPlaylistName={setNewPlaylistName}
          showRenameInput={showRenameInput}
          setShowRenameInput={setShowRenameInput}
          newFileName={newFileName}
          setNewFileName={setNewFileName}
          renameInputRef={renameInputRef}
          onPlay={playTrack}
          onAddToPlaylist={addToPlaylist}
          onCreatePlaylist={createNewPlaylist}
          onShowInExplorer={showInExplorer}
          onCopyFilePath={copyPath}
          onAnalyze={analyzeTrack}
          onRename={renameFile}
          onStartRename={startRename}
          onRemoveFromLibrary={removeFromLibrary}
          onDeleteFile={deleteFile}
        />
      )}
      
      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Voice Control */}
      <VoiceControl 
        onCommand={handleVoiceCommand}
        position="bottom-right"
        showTranscript={true}
      />
    </>
  )
}
