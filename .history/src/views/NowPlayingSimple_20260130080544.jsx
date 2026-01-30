import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext'
import { useFeature } from '../state/features'
import { useEssentiaBeatDetection } from '../hooks/useEssentiaBeatDetection'
import { pickNextIndex } from '../utils/randomizer'
import { formatTime } from '../analysis/utils'
import { Toast } from '../DJ/Mixer/Common/Toast'
import VoiceControl from '../components/VoiceControl'
import BeatDetectionPanel from '../components/BeatDetectionPanel'

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
  
  // Essentia hook
  const { isReady: essentiaReady } = useEssentiaBeatDetection({
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
      showToast('Filename cannot be empty', 'error')
      return
    }
    
    setContextMenu(null)
    showToast('Renaming file...', 'info')
    
    try {
      const result = await window.api.renameTrack(track.filePath, newFileName)
      if (result.success) {
        showToast('File renamed successfully', 'success')
        loadTracks()
      } else {
        showToast(`Rename failed: ${result.error}`, 'error')
      }
    } catch (err) {
      console.error('Rename error:', err)
      showToast('Rename error', 'error')
    }
    
    setShowRenameInput(false)
    setNewFileName('')
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
  }
  
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
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Waveform */}
          <div className="flex-1 flex flex-col p-6">
            <div className="flex-1 bg-black/40 rounded-lg border border-gray-700/50 overflow-hidden relative">
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
            </div>
            
            {/* Controls */}
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
          
          {/* Right: Track List */}
          <div className="w-96 flex flex-col border-l border-gray-700/50">
            <TrackList 
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
            />
          </div>
        </div>
        
        {/* Beat Detection Panel */}
        <BeatDetectionPanel
          useEssentiaBeats={useEssentiaBeats}
          setUseEssentiaBeats={setUseEssentiaBeats}
          beatPulseEnabled={beatPulseEnabled}
          setBeatPulseEnabled={setBeatPulseEnabled}
          showBeatControls={showBeatControls}
          setShowBeatControls={setShowBeatControls}
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
          onStartRename={() => {}}
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
