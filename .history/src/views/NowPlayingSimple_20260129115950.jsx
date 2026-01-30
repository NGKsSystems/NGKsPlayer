import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toLocal } from '../utils/paths.js';
import { Toast } from '../DJ/Mixer/Common/Toast'
import VoiceControl from '../components/VoiceControl'
import { pickNextIndex, getCachedNext, setCachedNext, clearCachedNext } from '../utils/randomizer'
import { useFeature } from '../state/features'
import { PlayerStressTest } from '../utils/playerStressTest'
import { CrashProtection } from '../utils/playerCrashProtection'
import { useTheme } from '../contexts/ThemeContext'

export default function NowPlayingBasic({ onNavigate }) {
  const { currentTheme, changeTheme, themes } = useTheme()
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const audioRef = useRef(new Audio())
  const currentIndexRef = useRef(0)  // Synchronous ref for 'ended' event handler
  const cachedNextIndexRef = useRef(null)  // Synchronous ref for cache (always current)
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [tracks, setTracks] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [toast, setToast] = useState(null)
  const [nextTrackInfo, setNextTrackInfo] = useState(null)
  const [cachedNextIndex, setCachedNextIndex] = useState(null)
  const [playMode, setPlayMode] = useFeature('playMode', 'inOrder')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('title') // title, artist, album, bpm, duration, dateAdded
  const [sortOrder, setSortOrder] = useState('asc') // asc, desc
  const [contextMenu, setContextMenu] = useState(null)
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false)
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showRenameInput, setShowRenameInput] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const renameInputRef = useRef(null)
  const [playlists, setPlaylists] = useState([])
  const [isStressTesting, setIsStressTesting] = useState(false)
  const stressTestRef = useRef(null)
  const crashProtectionRef = useRef(null)
  const waveformCanvasRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyzerRef = useRef(null)
  const animationFrameRef = useRef(null)
  const [waveformType, setWaveformType] = useState('line') // 'line', 'bars', 'circle', 'none'
  const [beatPulse, setBeatPulse] = useState(false)
  const [beatPulseEnabled, setBeatPulseEnabled] = useState(true)
  const [peakRotation, setPeakRotation] = useState(false) // Orbital rotation on peak
  const beatPulseEnabledRef = useRef(true)
  const beatDetectionRef = useRef({ 
    lastBeat: 0, 
    threshold: 165, 
    bassHistory: [], 
    midHistory: [],
    highHistory: [],
    lastPeak: 0,
    adaptiveThreshold: 165,
    beatStrength: 0
  })
  const peakDotsRef = useRef([]) // Track peak dots for each frequency bar
  const [beatColors, setBeatColors] = useState({ bass: 0, mid: 0, high: 0 }) // For color shifting

  // Sync beatPulseEnabled state to ref for use in animation loop
  useEffect(() => {
    beatPulseEnabledRef.current = beatPulseEnabled
  }, [beatPulseEnabled])

  // Disabled debug logging
  useEffect(() => {
    if (!window.trackLog) window.trackLog = []
    loadPlaylists()
    
    // Check sessionStorage for library context
    const storedContext = sessionStorage.getItem('ngks_library_context')
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext)
        sessionStorage.removeItem('ngks_library_context') // Clear it
        
        if (context.type === 'playlist' && context.playlistId) {
          // Load playlist tracks and RETURN to prevent loadTracks()
          window.api.getPlaylistTracks(context.playlistId)
            .then((result) => {
              if (result && Array.isArray(result)) {
                setTracks(result);
                showToast(`Loaded playlist (${result.length} tracks)`, 'success');
                
                // Auto-play first track based on playMode
                if (result.length > 0) {
                  const startIndex = playMode === 'shuffle' || playMode === 'randomNoRepeat' 
                    ? Math.floor(Math.random() * result.length)
                    : 0;
                  
                  // Small delay to ensure tracks state is set
                  setTimeout(() => {
                    playTrack(result[startIndex], startIndex);
                  }, 100);
                }
              } else {
                // If no results, fallback to all tracks
                loadTracks();
              }
            })
            .catch((err) => {
              console.error('Failed to load playlist tracks:', err);
              showToast('Failed to load playlist', 'error');
              loadTracks(); // Fallback
            });
          return; // Exit early - don't run any more code
        }
      } catch (e) {
        console.error('Error parsing library context:', e)
      }
    }
    
    // Listen for library context (playlist selection, all tracks, etc)
    const cleanup = window.api.onLibraryLoad?.((data) => {
      console.log('[NowPlaying] Received library context:', data);
      
      if (data.type === 'playlist' && data.playlistId) {
        // Load tracks from specific playlist
        window.api.getPlaylistTracks(data.playlistId)
          .then((result) => {
            if (result && Array.isArray(result)) {
              setTracks(result);
              showToast(`Loaded playlist (${result.length} tracks)`, 'success');
            }
          })
          .catch((err) => {
            console.error('Failed to load playlist tracks:', err);
            showToast('Failed to load playlist', 'error');
            // Fallback to all tracks on error
            loadTracks();
          });
      } else if (data.type === 'all' || !data.type) {
        // Load all tracks
        loadTracks();
      }
    });
    
    // Load all tracks (only runs if no early return above)
    loadTracks();
    
    // Crash protection disabled temporarily - was causing false positives
    // Will re-enable after tuning detection thresholds
    /*
    crashProtectionRef.current = new CrashProtection(audioRef.current, {
      maxRecoveryAttempts: 3,
      recoveryTimeout: 5000,
      stallTimeout: 3000
    })
    crashProtectionRef.current.enable()
    
    crashProtectionRef.current.onRecoverySuccess = (method) => {
      console.log(`[NowPlayingSimple] Player recovered using: ${method}`)
      setToast({ message: 'Player recovered from error', type: 'success' })
    }
    
    crashProtectionRef.current.onRecoveryFailed = (reason) => {
      console.error(`[NowPlayingSimple] Player recovery failed: ${reason}`)
      setToast({ message: 'Player error - reloading track', type: 'error' })
      // Try to reload current track
      if (currentTrack) {
        const idx = tracks.findIndex(t => t.id === currentTrack.id)
        if (idx >= 0) playTrack(tracks[idx], idx)
      }
    }
    */
    
    return () => {
      crashProtectionRef.current?.disable()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.warn('[Waveform] Error closing audio context:', err)
        })
      }
    }
  }, [])

  // Setup waveform visualization
  useEffect(() => {
    const setupWaveform = async () => {
      if (!audioRef.current || !waveformCanvasRef.current) return

      try {
        // Create audio context and analyzer
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
          analyzerRef.current = audioContextRef.current.createAnalyser()
          analyzerRef.current.fftSize = 2048
          
          const source = audioContextRef.current.createMediaElementSource(audioRef.current)
          source.connect(analyzerRef.current)
          analyzerRef.current.connect(audioContextRef.current.destination)
        }

        // Cancel previous animation loop
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }

        // Start animation loop
        drawWaveform()
      } catch (err) {
        console.warn('[Waveform] Setup failed:', err)
      }
    }

    setupWaveform()
  }, [waveformType, isPlaying]) // Restart animation when type or playing state changes

  const drawWaveform = () => {
    if (!waveformCanvasRef.current || !analyzerRef.current) return

    const canvas = waveformCanvasRef.current
    const ctx = canvas.getContext('2d')
    const analyzer = analyzerRef.current

    const bufferLength = analyzer.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const frequencyData = new Uint8Array(bufferLength)

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw)

      // Set canvas size to match container
      const rect = canvas.getBoundingClientRect()
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width
        canvas.height = rect.height
      }

      const width = canvas.width
      const height = canvas.height

      // Clear with dark background
      ctx.fillStyle = 'rgb(31, 41, 55)' // gray-800
      ctx.fillRect(0, 0, width, height)

      // Only draw waveform if playing
      if (!isPlaying || waveformType === 'none') {
        return
      }

      analyzer.getByteTimeDomainData(dataArray)
      analyzer.getByteFrequencyData(frequencyData)

      // IMPROVED Beat detection with multi-frequency analysis
      // Divide spectrum into bass, mid, and high ranges
      const bassEnd = Math.floor(bufferLength * 0.1)      // 0-10%: Bass (20-250 Hz)
      const midStart = bassEnd
      const midEnd = Math.floor(bufferLength * 0.4)       // 10-40%: Mids (250-2000 Hz)
      const highStart = midEnd                             // 40-100%: Highs (2000+ Hz)
      
      // Calculate averages for each frequency range
      let bassSum = 0, midSum = 0, highSum = 0
      
      for (let i = 0; i < bassEnd; i++) {
        bassSum += frequencyData[i]
      }
      for (let i = midStart; i < midEnd; i++) {
        midSum += frequencyData[i]
      }
      for (let i = highStart; i < bufferLength; i++) {
        highSum += frequencyData[i]
      }
      
      const bassAverage = bassSum / bassEnd
      const midAverage = midSum / (midEnd - midStart)
      const highAverage = highSum / (bufferLength - highStart)
      
      // Track history for adaptive threshold
      if (!beatDetectionRef.current.bassHistory) {
        beatDetectionRef.current.bassHistory = []
        beatDetectionRef.current.midHistory = []
        beatDetectionRef.current.highHistory = []
      }
      
      beatDetectionRef.current.bassHistory.push(bassAverage)
      beatDetectionRef.current.midHistory.push(midAverage)
      beatDetectionRef.current.highHistory.push(highAverage)
      
      if (beatDetectionRef.current.bassHistory.length > 60) {
        beatDetectionRef.current.bassHistory.shift()
        beatDetectionRef.current.midHistory.shift()
        beatDetectionRef.current.highHistory.shift()
      }
      
      // Calculate adaptive threshold (1.4x average bass)
      const avgBass = beatDetectionRef.current.bassHistory.reduce((a, b) => a + b, 0) / beatDetectionRef.current.bassHistory.length
      const avgMid = beatDetectionRef.current.midHistory.reduce((a, b) => a + b, 0) / beatDetectionRef.current.midHistory.length
      const avgHigh = beatDetectionRef.current.highHistory.reduce((a, b) => a + b, 0) / beatDetectionRef.current.highHistory.length
      
      beatDetectionRef.current.adaptiveThreshold = avgBass * 1.4
      
      // Update color intensities for theme-reactive visuals (0-1 range)
      setBeatColors({
        bass: Math.min(bassAverage / 255, 1),
        mid: Math.min(midAverage / 255, 1),
        high: Math.min(highAverage / 255, 1)
      })
      
      // Trigger beat pulse on strong bass hits
      const now = Date.now()
      const timeSinceLastBeat = now - beatDetectionRef.current.lastBeat
      
      if (waveformType !== 'none' && beatPulseEnabledRef.current && 
          bassAverage > beatDetectionRef.current.adaptiveThreshold && 
          timeSinceLastBeat > 200) {
        
        beatDetectionRef.current.lastBeat = now
        beatDetectionRef.current.beatStrength = Math.min((bassAverage / avgBass), 2) // 1-2x multiplier
        
        setBeatPulse(true)
        setTimeout(() => setBeatPulse(false), 150)
        
        // Detect SUPER PEAK beats (bass way above average + rare)
        if (bassAverage > avgBass * 1.8 && timeSinceLastBeat > 2000) {
          beatDetectionRef.current.lastPeak = now
          setPeakRotation(true)
          setTimeout(() => setPeakRotation(false), 1500)
        }
      }

      // Dynamic waveform coloring based on frequency content
      const getDynamicColor = () => {
        const { bass, mid, high } = beatColors
        
        // Mix theme colors based on frequency dominance
        if (bass > mid && bass > high) {
          // Bass-heavy: Use warm colors (orange/red from theme)
          return `var(--accent-primary)`
        } else if (mid > bass && mid > high) {
          // Mid-heavy: Use secondary accent
          return `var(--accent-secondary)`
        } else if (high > bass && high > mid) {
          // High-heavy: Use success color (cyan/green)
          return `var(--accent-success)`
        } else {
          // Balanced: Use waveform color
          return `var(--waveform-line)`
        }
      }

      if (waveformType === 'line') {
        // Line waveform with dynamic coloring
        ctx.lineWidth = beatPulse ? 3 : 2
        ctx.strokeStyle = getDynamicColor()
        ctx.beginPath()

        const sliceWidth = width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
          const y = (v * height) / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.lineTo(width, height / 2)
        ctx.stroke()
      } else if (waveformType === 'bars') {
        // Frequency bars with frequency-based theming
        const barWidth = (width / bufferLength) * 2.5
        let x = 0

        // Initialize peak dots array if needed
        if (peakDotsRef.current.length !== bufferLength) {
          peakDotsRef.current = Array(bufferLength).fill(null).map(() => ({
            height: 0,
            timestamp: now
          }))
        }

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (frequencyData[i] / 255) * height * 0.8
          const intensity = frequencyData[i] / 255

          // Frequency-based coloring: bass=warm, mids=secondary, highs=success
          let barColor
          if (i < bufferLength * 0.15) {
            // Bass range: Use primary accent (orange in Atari)
            barColor = `var(--accent-primary)`
            ctx.globalAlpha = 0.7 + (intensity * 0.3)
          } else if (i < bufferLength * 0.5) {
            // Mid range: Use secondary accent (purple in Atari)
            barColor = `var(--accent-secondary)`
            ctx.globalAlpha = 0.6 + (intensity * 0.4)
          } else {
            // High range: Use success color (cyan in Atari)
            barColor = `var(--accent-success)`
            ctx.globalAlpha = 0.5 + (intensity * 0.5)
          }
          
          ctx.fillStyle = barColor

          // Draw the bar
          ctx.fillRect(x, height - barHeight, barWidth, barHeight)

          // Update peak dot for this bar
          const peak = peakDotsRef.current[i]
          if (barHeight > peak.height) {
            // New peak reached
            peak.height = barHeight
            peak.timestamp = now
          } else {
            // Peak hasn't been reached - check if it should fall
            const timeSincePeak = now - peak.timestamp
            const fallDelay = 2000 // 2 seconds before falling
            if (timeSincePeak > fallDelay) {
              // Gradually fall
              const fallSpeed = 0.5 // pixels per frame
              peak.height = Math.max(barHeight, peak.height - fallSpeed)
            }
          }

          // Draw the peak dot (brighter version of bar color)
          if (peak.height > 5) {
            const dotY = height - peak.height
            const dotSize = 3
            
            ctx.globalAlpha = 1
            ctx.fillStyle = `var(--waveform-line)`
            ctx.fillRect(x, dotY - dotSize, barWidth, dotSize)
          }

          x += barWidth + 1
        }
        ctx.globalAlpha = 1 // Reset alpha
      } else if (waveformType === 'circle') {
        // Circular waveform with dynamic coloring
        ctx.lineWidth = beatPulse ? 3 : 2
        ctx.strokeStyle = getDynamicColor()
        ctx.beginPath()

        const centerX = width / 2
        const centerY = height / 2
        const radius = Math.min(width, height) * 0.3
        const pulseScale = beatPulse ? 1.1 : 1

        for (let i = 0; i < bufferLength; i++) {
          const angle = (i / bufferLength) * Math.PI * 2
          const amplitude = (dataArray[i] / 128.0 - 1) * radius * 0.5 * pulseScale
          const x = centerX + Math.cos(angle) * (radius + amplitude)
          const y = centerY + Math.sin(angle) * (radius + amplitude)

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }

        ctx.closePath()
        ctx.stroke()
      }
    }

    draw()
  }

  const logTrack = () => {
    // Logging disabled - issue is fixed
  }

  const debug = (...args) => {
    try {
      const v = localStorage.getItem('ngks:debugLogs')
      if (v === '1' || v === 'true') console.log('[NowPlayingSimple]', ...args)
    } catch (e) {}
  }

  const nextTrack = () => {
    if (tracks.length > 0) {
      let nextIndex
      // ALWAYS use the cached index if it exists
      // Use the REF, not state, because state might be stale in the closure
      if (cachedNextIndexRef.current !== null && cachedNextIndexRef.current !== undefined) {
        logTrack('🔄 nextTrack using cache', `index=${cachedNextIndexRef.current}`, tracks[cachedNextIndexRef.current]?.title)
        nextIndex = cachedNextIndexRef.current
      } else {
        // Fallback: no cache set (shouldn't happen in normal flow)
        logTrack('🔄 nextTrack NO CACHE - calculating fresh', `from index=${currentIndexRef.current}`, '')
        nextIndex = pickNextIndex(playMode, tracks, currentIndexRef.current)
      }
      playTrack(tracks[nextIndex], nextIndex)
    }
  }

  const getNextTrack = () => {
    // In stop mode, there is no next track
    if (playMode === 'stop') {
      return null
    }
    if (tracks.length > 1) {
      let nextIndex
      if (playMode === 'shuffle' || playMode === 'randomNoRepeat') {
        // Use cached index if available, it was pre-calculated during playTrack
        nextIndex = cachedNextIndex !== null ? cachedNextIndex : 0
      } else {
        // For ordered modes, peek ahead
        nextIndex = pickNextIndex(playMode, tracks, currentIndex, { mutate: false })
      }
      return tracks[nextIndex]
    }
    return null
  }

  useEffect(() => {
    // In stop mode, never show next track
    if (playMode === 'stop') {
      setNextTrackInfo(null)
      return
    }
    if (tracks.length > 1) {
      // ONLY display what's in the cache
      // The cache is set in playTrack() BEFORE we show anything
      // If no cache, don't display anything (it will be set when next track plays)
      if (cachedNextIndexRef.current !== null && cachedNextIndexRef.current !== undefined) {
        const nextTrack = tracks[cachedNextIndexRef.current]
        setNextTrackInfo(nextTrack)
      } else if (playMode === 'inOrder' || playMode === 'repeatAll') {
        // For ordered modes, safe to peek ahead
        // Use currentIndexRef (ref), not currentIndex (state), to avoid stale value
        const nextIdx = pickNextIndex(playMode, tracks, currentIndexRef.current, { mutate: false })
        const nextTrack = tracks[nextIdx]
        setNextTrackInfo(nextTrack)
      } else {
        setNextTrackInfo(null)
      }
    } else {
      setNextTrackInfo(null)
    }
  }, [currentIndex, playMode, tracks, cachedNextIndex])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Removed duplicate loadTracks() useEffect - tracks are loaded in the main useEffect above

  useEffect(() => {
    const handleAutoplay = async () => {
      const autoplayPath = sessionStorage.getItem('ngks_autoplay')
      if (autoplayPath) {
        sessionStorage.removeItem('ngks_autoplay')
        try {
          const trackIndex = tracks.findIndex(t => t.filePath === autoplayPath)
          if (trackIndex >= 0) {
            console.log('🎵 Autoplay: Found track at index', trackIndex, tracks[trackIndex].title)
            playTrack(tracks[trackIndex], trackIndex)
          } else {
            console.warn('🎵 Autoplay: Track not found in library:', autoplayPath)
            showToast('Track not found in library', 'error')
          }
        } catch (err) {
          console.error('Failed to autoplay track:', err)
          showToast('Failed to play track', 'error')
        }
      }

      const autoplayQueue = sessionStorage.getItem('ngks_autoplay_queue')
      if (autoplayQueue) {
        sessionStorage.removeItem('ngks_autoplay_queue')
        try {
          const queuePaths = JSON.parse(autoplayQueue)
          if (queuePaths.length > 0) {
            const firstTrackInfo = await window.api.invoke('library:getTrackByPath', queuePaths[0])
            if (firstTrackInfo) {
              playTrack(firstTrackInfo, 0)
            }
          }
        } catch (err) {
          console.error('Failed to autoplay queue:', err)
          showToast('Failed to play queue', 'error')
        }
      }
    }

    if (tracks.length > 0) {
      handleAutoplay()
    }
  }, [tracks])

  const loadTracks = async () => {
    try {
      const result = await window.api.invoke('library:getTracks', {})
      if (result && Array.isArray(result)) {
        setTracks(result)
      }
    } catch (err) {
      console.error('Failed to load tracks:', err)
      showToast('Failed to load music library', 'error')
    }
  }

  const loadPlaylists = async () => {
    try {
      console.log('[NowPlayingSimple] Loading playlists...')
      const result = await window.api.listPlaylists()
      console.log('[NowPlayingSimple] Playlists loaded:', result)
      if (result && Array.isArray(result)) {
        setPlaylists(result)
      }
    } catch (err) {
      console.error('Failed to load playlists:', err)
    }
  }

  const addToPlaylist = async (track, playlistId) => {
    try {
      console.log('[NowPlayingSimple] Adding track to playlist:', track.title, playlistId)
      await window.api.addTrackToPlaylist(playlistId, track.id)
      const playlist = playlists.find(p => p.id === playlistId)
      showToast(`Added "${track.title}" to ${playlist?.name}`, 'success')
      setContextMenu(null)
      setShowPlaylistSubmenu(false)
    } catch (err) {
      console.error('Failed to add to playlist:', err)
      showToast('Failed to add to playlist', 'error')
    }
  }

  const createNewPlaylist = async (track) => {
    if (!newPlaylistName.trim()) {
      showToast('Please enter a playlist name', 'error')
      return
    }
    
    try {
      const newPlaylist = await window.api.createPlaylist(newPlaylistName.trim())
      await window.api.addTrackToPlaylist(newPlaylist.id, track.id)
      showToast(`Created playlist "${newPlaylistName}" and added track`, 'success')
      setContextMenu(null)
      setShowPlaylistSubmenu(false)
      setShowNewPlaylistInput(false)
      setNewPlaylistName('')
      loadPlaylists() // Reload playlists
    } catch (err) {
      console.error('Failed to create playlist:', err)
      showToast('Failed to create playlist', 'error')
    }
  }

  const removeFromLibrary = async (track) => {
    try {
      await window.api.invoke('library:removeTrack', track.id)
      showToast(`Removed "${track.title}" from library`, 'success')
      setContextMenu(null)
      loadTracks() // Reload tracks
    } catch (err) {
      console.error('Failed to remove from library:', err)
      showToast('Failed to remove from library', 'error')
    }
  }

  const deleteFile = async (track) => {
    const confirmed = confirm(
      `⚠️ WARNING: This will permanently delete the file from your computer!\n\n` +
      `File: ${track.title}\n` +
      `Path: ${track.filePath}\n\n` +
      `This action CANNOT be undone. Are you sure?`
    )
    
    if (!confirmed) return
    
    try {
      await window.api.invoke('library:deleteFile', track.filePath)
      showToast(`Deleted "${track.title}" permanently`, 'success')
      setContextMenu(null)
      loadTracks() // Reload tracks
    } catch (err) {
      console.error('Failed to delete file:', err)
      showToast('Failed to delete file', 'error')
    }
  }

  const showInExplorer = async (track) => {
    try {
      await window.api.invoke('library:showInExplorer', track.filePath)
      setContextMenu(null)
    } catch (err) {
      console.error('Failed to show in explorer:', err)
      showToast('Failed to open file location', 'error')
    }
  }

  const copyFilePath = async (track) => {
    try {
      await navigator.clipboard.writeText(track.filePath)
      showToast('File path copied to clipboard', 'success')
      setContextMenu(null)
    } catch (err) {
      showToast('Failed to copy file path', 'error')
    }
  }

  const analyzeTrack = async (track) => {
    try {
      showToast(`Analyzing "${track.title}"...`, 'info')
      setContextMenu(null)
      await window.api.invoke('library:analyzeTrack', track.id)
      showToast('Analysis complete', 'success')
      loadTracks() // Reload to show updated data
    } catch (err) {
      console.error('Failed to analyze track:', err)
      showToast('Failed to analyze track', 'error')
    }
  }

  const renameFile = async (track) => {
    if (!newFileName.trim()) {
      showToast('Please enter a filename', 'error')
      return
    }
    
    // Validate filename
    if (!newFileName.includes('.')) {
      showToast('Filename must include an extension (e.g., .mp3)', 'error')
      return
    }
    
    try {
      console.log('Calling library:renameFile with:', { oldPath: track.filePath, newName: newFileName.trim() })
      const result = await window.api.invoke('library:renameFile', { 
        oldPath: track.filePath, 
        newName: newFileName.trim() 
      })
      
      console.log('Rename result:', result)
      
      if (result.error) {
        showToast(`Error: ${result.error}`, 'error')
        return
      }
      
      showToast(`Renamed to "${newFileName}"`, 'success')
      setContextMenu(null)
      setShowRenameInput(false)
      setNewFileName('')
      await loadTracks() // Reload tracks to refresh and resort
    } catch (err) {
      console.error('Failed to rename file:', err)
      showToast(`Failed to rename file: ${err.message || err}`, 'error')
    }
  }

  const startRename = (track) => {
    const currentName = track.filePath.split(/[\\\/]/).pop()
    setNewFileName(currentName)
    setShowRenameInput(true)
    // Focus the input after state updates
    setTimeout(() => {
      renameInputRef.current?.focus()
      renameInputRef.current?.select()
    }, 50)
  }

  const handleContextMenu = (e, track) => {
    e.preventDefault()
    
    // Reset submenu state
    setShowPlaylistSubmenu(false)
    setShowNewPlaylistInput(false)
    setNewPlaylistName('')
    setShowRenameInput(false)
    setNewFileName('')
    
    // Calculate menu position to keep it visible on screen
    const menuHeight = 450 // Approximate height of the context menu
    const menuWidth = 250
    const padding = 10
    
    let x = e.clientX
    let y = e.clientY
    
    // Adjust horizontal position if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding
    }
    
    // Adjust vertical position if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding
      // If still not enough room, position above cursor
      if (y < 0) {
        y = Math.max(padding, e.clientY - menuHeight)
      }
    }
    
    setContextMenu({ x, y, track })
  }

  const filteredTracks = tracks.filter(track => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      track.title?.toLowerCase().includes(query) ||
      track.artist?.toLowerCase().includes(query) ||
      track.album?.toLowerCase().includes(query) ||
      track.genre?.toLowerCase().includes(query)
    )
  }).sort((a, b) => {
    let aVal, bVal
    
    switch (sortBy) {
      case 'title':
        aVal = (a.title || '').toLowerCase()
        bVal = (b.title || '').toLowerCase()
        break
      case 'artist':
        aVal = (a.artist || '').toLowerCase()
        bVal = (b.artist || '').toLowerCase()
        break
      case 'album':
        aVal = (a.album || '').toLowerCase()
        bVal = (b.album || '').toLowerCase()
        break
      case 'bpm':
        aVal = a.bpm || 0
        bVal = b.bpm || 0
        break
      case 'duration':
        aVal = a.duration || 0
        bVal = b.duration || 0
        break
      case 'dateAdded':
        aVal = a.id || 0 // Assuming ID reflects insertion order
        bVal = b.id || 0
        break
      default:
        return 0
    }
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  const showToast = (message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const audio = audioRef.current
    
    // This effect ensures we always have the right nextTrack handler
    // The handler will always use current refs, not stale closures
    const handleEnded = () => {
      // Check if we're in 'stop' mode - if so, just stop playback
      if (playMode === 'stop') {
        console.log('[NowPlayingSimple] Stop mode - not advancing to next track')
        setIsPlaying(false)
        return
      }
      nextTrack()
    }
    
    const handleLoadedMetadata = () => {
      debug('handleLoadedMetadata: audio duration =', audio.duration)
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
  }, [playMode, nextTrack])

  const playTrack = async (track, index) => {
    try {
      debug(`playTrack called: track="${track.title}", index=${index}, currentIndex=${currentIndex}`)
      
      // Pre-calculate next track FIRST before anything else
      // BUT: if this index was just the cached next, don't recalculate!
      // (We're being called from nextTrack which already mutated the bag for this index)
      // Skip caching in 'stop' mode since there is no next track
      if (playMode === 'stop') {
        cachedNextIndexRef.current = null
        setCachedNextIndex(null)
      } else if (playMode === 'shuffle' || playMode === 'randomNoRepeat') {
        if (index !== cachedNextIndexRef.current) {
          // This is a fresh track (user clicked it or first play), calculate its next
          const nextIdx = pickNextIndex(playMode, tracks, index, { mutate: true })
          logTrack(`🎲 playTrack caching next (from idx=${index})`, tracks[nextIdx]?.title, tracks[nextIdx]?.artist)
          cachedNextIndexRef.current = nextIdx  // Sync ref FIRST (synchronously)
          setCachedNextIndex(nextIdx)
          try { setCachedNext(tracks, nextIdx) } catch (e) {}
        } else {
          // This IS the cached next track being played
          // Calculate the NEXT track for the NEXT cycle
          logTrack(`🎲 playTrack (using cache, calculating NEXT for after this)`, '', '')
          const nextNextIdx = pickNextIndex(playMode, tracks, index, { mutate: true })
          cachedNextIndexRef.current = nextNextIdx  // Sync ref FIRST (synchronously)
          setCachedNextIndex(nextNextIdx)
          try { setCachedNext(tracks, nextNextIdx) } catch (e) {}
        }
      } else if (playMode !== 'stop') {
        cachedNextIndexRef.current = null
        setCachedNextIndex(null)
      }
      
      // NOW update current track
      currentIndexRef.current = index  // Sync the ref FIRST (synchronously)
      setCurrentTrack(track)
      setCurrentIndex(index)
      
      // Use Electron's ngksplayer:// protocol for file access
      let audioSrc;
      if (track.filePath.startsWith('ngksplayer://')) {
        audioSrc = track.filePath;
      } else if (track.filePath.startsWith('http://') || track.filePath.startsWith('https://')) {
        audioSrc = track.filePath;
      } else {
        audioSrc = `ngksplayer://${track.filePath}`;
      }
      
      console.log('[NowPlayingSimple] Loading track:', track.title, 'from:', audioSrc);
      audioRef.current.src = audioSrc
      audioRef.current.volume = volume
      
      // Track consecutive errors for recovery logic
      let errorCount = 0
      let lastErrorTime = 0
      
      audioRef.current.addEventListener('canplay', () => {
        console.log('[NowPlayingSimple] Track can play:', track.title);
        errorCount = 0 // Reset error count on successful load
      }, { once: true })
      
      // Initial load error (only fires once)
      audioRef.current.addEventListener('error', (e) => {
        console.error('[NowPlayingSimple] Audio load error:', e, 'for:', audioSrc)
        showToast(`Failed to load: ${track.title}`, 'error')
      }, { once: true })
      
      // Persistent error handler for playback glitches (stalled/error during playback)
      let hasStartedPlaying = false
      const handlePlaybackError = (e) => {
        // Ignore stalled/suspend events during initial load (before track has started playing)
        // These are normal buffering events, not playback errors
        if (!hasStartedPlaying || audioRef.current.currentTime === 0) {
          return
        }
        
        // Suppress warnings during stress testing
        if (isStressTesting) {
          return
        }
        
        const now = Date.now()
        console.warn('[NowPlayingSimple] Playback glitch detected at', audioRef.current.currentTime, 's')
        
        // If errors are happening too frequently, give up
        if (now - lastErrorTime < 1000) {
          errorCount++
          if (errorCount > 5) {
            console.error('[NowPlayingSimple] Too many consecutive errors, skipping track')
            showToast('Skipping corrupted track', 'warning')
            // Mark track as having playback errors
            if (track.id) {
              window.api.markTrackError(track.id, true).catch(err => {
                console.error('[NowPlayingSimple] Failed to mark track error:', err)
              })
            }
            nextTrack()
            return
          }
        } else {
          errorCount = 1
        }
        lastErrorTime = now
        
        // Try to skip past the bad spot
        const currentPos = audioRef.current.currentTime
        const skipAmount = 0.5 // Skip 0.5 seconds ahead
        console.log(`[NowPlayingSimple] Attempting recovery: jumping from ${currentPos}s to ${currentPos + skipAmount}s`)
        
        audioRef.current.currentTime = currentPos + skipAmount
        audioRef.current.play().catch(err => {
          console.error('[NowPlayingSimple] Recovery failed:', err)
        })
      }
      
      // Handle stalled playback (buffering issues, corrupted data)
      audioRef.current.addEventListener('stalled', handlePlaybackError)
      audioRef.current.addEventListener('suspend', handlePlaybackError)
      
      // Track when playback actually starts to distinguish from initial buffering
      audioRef.current.addEventListener('playing', () => {
        hasStartedPlaying = true
      }, { once: true })
      
      await audioRef.current.play()
      showToast(`Now playing: ${track.title}`, 'success')
    } catch (err) {
      console.error('Failed to play track:', err)
      showToast('Failed to play track', 'error')
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      if (currentTrack) {
        audioRef.current.play()
      } else if (tracks.length > 0) {
        playTrack(tracks[0], 0)
      }
    }
  }

  const prevTrack = () => {
    if (tracks.length > 0) {
      const prevIndex = (currentIndexRef.current - 1 + tracks.length) % tracks.length
      playTrack(tracks[prevIndex], prevIndex)
    }
  }

  const seekTo = (time) => {
    audioRef.current.currentTime = time
    setPosition(time)
  }

  const handleVoiceCommand = useCallback((command) => {
    switch (command.type) {
      case 'play':
        if (command.params.query) {
          const query = command.params.query.toLowerCase()
          const matchedTrack = tracks.find(track => {
            const title = (track.title || '').toLowerCase()
            const artist = (track.artist || '').toLowerCase()
            return title.includes(query) || artist.includes(query)
          })
          if (matchedTrack) {
            const trackIndex = tracks.findIndex(t => t.id === matchedTrack.id)
            showToast(`Playing: ${matchedTrack.title}`, 'success')
            playTrack(matchedTrack, trackIndex)
          } else {
            showToast(`Song not found: ${command.params.query}`, 'warning')
          }
        }
        break
      case 'pause':
        if (isPlaying) {
          audioRef.current.pause()
          showToast('Paused', 'info')
        }
        break
      case 'resume':
        if (!isPlaying && currentTrack) {
          audioRef.current.play()
          showToast('Resumed', 'info')
        } else if (!currentTrack && tracks.length > 0) {
          playTrack(tracks[0], 0)
        }
        break
      case 'next':
        nextTrack()
        showToast('Next track', 'info')
        break
      case 'previous':
        prevTrack()
        showToast('Previous track', 'info')
        break
      case 'volume':
        if (command.params.change) {
          const newVolume = Math.max(0, Math.min(1, volume + command.params.change / 100))
          setVolume(newVolume)
          audioRef.current.volume = newVolume
          showToast(`Volume: ${Math.round(newVolume * 100)}%`, 'info')
        } else if (command.params.value !== undefined) {
          const newVolume = Math.max(0, Math.min(100, command.params.value)) / 100
          setVolume(newVolume)
          audioRef.current.volume = newVolume
          showToast(`Volume: ${Math.round(newVolume * 100)}%`, 'info')
        }
        break
      case 'mute':
        audioRef.current.volume = 0
        setVolume(0)
        showToast('Muted', 'info')
        break
      case 'unmute':
        audioRef.current.volume = 1
        setVolume(1)
        showToast('Unmuted', 'info')
        break
      case 'navigate':
        if (command.params.view === 'library') {
          onNavigate?.('library')
        } else if (command.params.view === 'dj') {
          onNavigate?.('dj')
        } else if (command.params.view === 'settings') {
          onNavigate?.('settings')
        }
        break
      case 'unknown':
        showToast('Command not recognized', 'warning')
        break
      default:
        break
    }
  }, [tracks, isPlaying, currentTrack, volume, onNavigate])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            setPlayMode('inOrder')
            showToast('🔄 In Order mode')
            break
          case '2':
            e.preventDefault()
            setPlayMode('repeatAll')
            showToast('🔁 Repeat All mode')
            break
          case '4':
            e.preventDefault()
            setPlayMode('shuffle')
            showToast('🔀 Shuffle mode')
            break
          case '5':
            e.preventDefault()
            setPlayMode('randomNoRepeat')
            showToast('🎲 Random (No Repeat) mode')
            break
          default:
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [setPlayMode])

  return (
    <>
      <style>{`
        @keyframes orbitalSpin {
          0% {
            transform: scale(1.08) rotate(0deg) translateX(0px) translateY(0px);
          }
          25% {
            transform: scale(1.08) rotate(90deg) translateX(20px) translateY(-20px);
          }
          50% {
            transform: scale(1.08) rotate(180deg) translateX(0px) translateY(0px);
          }
          75% {
            transform: scale(1.08) rotate(270deg) translateX(-20px) translateY(20px);
          }
          100% {
            transform: scale(1.08) rotate(1080deg) translateX(0px) translateY(0px);
          }
        }
      `}</style>
      <div className="flex flex-col h-screen bg-gray-900 text-white" onClick={() => setContextMenu(null)}>
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Now Playing</h1>
        <div className="flex gap-2 relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
            title="Change Theme"
          >
            🎨 Theme
          </button>
          
          {showThemeMenu && (
            <div 
              className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50"
              style={{ minWidth: '200px' }}
            >
              {Object.values(themes).map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => {
                    changeTheme(theme.id)
                    setShowThemeMenu(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 ${
                    currentTheme === theme.id ? 'bg-gray-700 font-bold' : ''
                  }`}
                >
                  {currentTheme === theme.id ? '✓ ' : ''}{theme.name}
                </button>
              ))}
            </div>
          )}
          
          <button
            onClick={() => onNavigate?.('library')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            📚 Back to Library
          </button>
        </div>
      </div>

      {/* Current Track Display with Waveform */}
      <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-center relative overflow-hidden" style={{ height: '200px' }}>
        {/* Waveform Canvas Background */}
        <canvas
          ref={waveformCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ zIndex: 0 }}
        />
        
        {/* Track Info Overlay */}
        <div className="relative z-10 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
          {currentTrack ? (
            <div>
              <h2 
                className="font-black mb-4 transition-all duration-100"
                style={{ 
                  fontFamily: '"Arial Black", "Impact", sans-serif',
                  fontSize: 'clamp(1.5rem, 2.5vw, 2.5rem)',
                  transform: peakRotation 
                    ? 'scale(1.08)' // Keep scale during rotation
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
                {currentTrack.title || 'Unknown Title'}
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
                    {nextTrackInfo.title}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold mb-2">No track selected</h2>
              <p className="text-gray-400">Choose a track from the list below to start playing</p>
            </div>
          )}
        </div>
        
        {/* Waveform Type Selector (bottom right corner) */}
        <div className="absolute bottom-4 right-4 z-30 flex gap-2 pointer-events-auto">
          <button
            className={`px-3 py-1 rounded text-xs ${waveformType === 'line' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setWaveformType('line')}
            title="Line Waveform"
          >
            〰️ Line
          </button>
          <button
            className={`px-3 py-1 rounded text-xs ${waveformType === 'bars' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setWaveformType('bars')}
            title="Frequency Bars"
          >
            📊 Bars
          </button>
          <button
            className={`px-3 py-1 rounded text-xs ${waveformType === 'circle' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setWaveformType('circle')}
            title="Circular Waveform"
          >
            ⭕ Circle
          </button>
          <button
            className={`px-3 py-1 rounded text-xs ${waveformType === 'none' ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setWaveformType('none')}
            title="No Waveform"
          >
            ✖️ None
          </button>
        </div>
        
        {/* Beat Pulse Toggle (separate from waveform controls) */}
        <div className="absolute bottom-4 left-4 z-30">
          <button
            className={`px-4 py-2 rounded font-semibold text-sm transition-all ${beatPulseEnabled ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => {
              const newValue = !beatPulseEnabled
              console.log('🎵 Pulse button clicked! New state:', newValue)
              setBeatPulseEnabled(newValue)
            }}
            title="Toggle beat-reactive title pulse"
          >
            {beatPulseEnabled ? '💓 Pulse ON' : '💓 Pulse OFF'}
          </button>
        </div>
      </div>

      {/* Player Controls */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        {/* Progress Bar */}
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={position}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-400 mt-1">
            <span>{formatTime(position)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Combined Playback Controls and Mode Buttons */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevTrack}
              className={`px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-transform ${beatPulse && isPlaying ? 'beat-pulse' : ''}`}
              disabled={tracks.length === 0}
            >
              ⏮ Previous
            </button>
            <button
              onClick={togglePlayPause}
              className={`px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold transition-transform ${beatPulse && isPlaying ? 'scale-110' : ''}`}
              style={{
                boxShadow: beatPulse && isPlaying ? 'var(--glow)' : 'none'
              }}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play'}
            </button>
            <button
              onClick={nextTrack}
              className={`px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-transform ${beatPulse && isPlaying ? 'beat-pulse' : ''}`}
              disabled={tracks.length === 0}
            >
              Next ⏭
            </button>
          </div>

          {/* Playback Mode Controls */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Mode:</span>
            <button
              className={`px-2 py-1 rounded text-sm ${playMode === 'stop' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setPlayMode('stop')}
              title="Stop After Current (Play once)"
            >
              ⏹️
            </button>
            <button
              className={`px-2 py-1 rounded text-sm ${playMode === 'inOrder' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setPlayMode('inOrder')}
              title="In Order"
            >
              🔄
            </button>
            <button
              className={`px-2 py-1 rounded text-sm ${playMode === 'repeatAll' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setPlayMode('repeatAll')}
              title="Repeat All"
            >
              🔁
            </button>
            <button
              className={`px-2 py-1 rounded text-sm ${playMode === 'shuffle' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setPlayMode('shuffle')}
              title="Shuffle"
            >
              🔀
            </button>
            <button
              className={`px-2 py-1 rounded text-sm ${playMode === 'randomNoRepeat' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
              onClick={() => setPlayMode('randomNoRepeat')}
              title="Random (No Repeat)"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-4">
          <span className="text-sm">🔊 Volume:</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => {
              const newVolume = parseFloat(e.target.value)
              setVolume(newVolume)
              audioRef.current.volume = newVolume
            }}
            className="flex-1"
          />
          <span className="text-sm w-12">{Math.round(volume * 100)}%</span>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar - Sticky */}
        <div className="sticky top-0 z-10 bg-gray-900 px-4 py-3 border-b border-gray-700">
          {/* Search and Sort on single row */}
          <div className="flex gap-3 items-center">
            <input
              type="text"
              placeholder="🔍 Search tracks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            
            <span className="text-xs text-gray-400 whitespace-nowrap">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="title">Title</option>
              <option value="artist">Artist</option>
              <option value="album">Album</option>
              <option value="bpm">BPM</option>
              <option value="duration">Duration</option>
              <option value="dateAdded">Date Added</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded text-sm flex items-center gap-1 whitespace-nowrap"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑ A-Z' : '↓ Z-A'}
            </button>
          </div>
        </div>

        {/* Scrollable Track List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <h3 className="text-md font-semibold mb-3 mt-3">
            Track List ({filteredTracks.length}{searchQuery && ` of ${tracks.length}`} tracks)
          </h3>
        {filteredTracks.length > 0 ? (
          <div className="space-y-2">
            {filteredTracks.map((track, index) => {
              const actualIndex = tracks.indexOf(track)
              return (
                <div
                  key={track.id || index}
                  onClick={() => playTrack(track, actualIndex)}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  className={`p-3 border border-gray-700 rounded cursor-pointer hover:bg-gray-700 transition ${
                    currentIndex === actualIndex ? 'bg-blue-900 border-blue-600' : 'bg-gray-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Album Art */}
                    {track.albumArt && (
                      <img
                        src={track.albumArt}
                        alt="Album Art"
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{track.title || 'Unknown Title'}</div>
                      {track.album && (
                        <div className="text-sm text-gray-400 truncate">
                          {track.album}
                        </div>
                      )}
                      {track.genre && (
                        <div className="text-xs text-gray-500 mt-1">{track.genre}</div>
                      )}
                    </div>
                    
                    {/* Metadata badges */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {track.hasPlaybackError === 1 && (
                        <div 
                          className="text-xs text-red-200 bg-red-900 px-2 py-1 rounded border border-red-600"
                          title="This track has playback errors and may need to be redownloaded"
                        >
                          ⚠️ Corrupted
                        </div>
                      )}
                      {track.duration && (
                        <div className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                          {formatTime(track.duration)}
                        </div>
                      )}
                      {track.bpm && (
                        <div className="text-xs text-blue-200 bg-blue-900 px-2 py-1 rounded border border-blue-600">
                          ♩ {track.bpm}
                        </div>
                      )}
                      {track.key && (
                        <div className="text-xs text-green-200 bg-green-900 px-2 py-1 rounded border border-green-600">
                          {track.key}{track.mode?.charAt(0) || ''}
                        </div>
                      )}
                      {track.energy !== null && track.energy !== undefined && (
                        <div className="text-xs text-orange-200 bg-orange-900 px-2 py-1 rounded border border-orange-600">
                          ⚡ {Math.round(track.energy)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-400">
            {searchQuery ? 'No tracks match your search' : 'No tracks found. Please scan your music library.'}
          </p>
        )}
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg z-50 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="py-1">
            {/* Track Info Header */}
            <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-700 font-semibold">
              {contextMenu.track.title}
            </div>
            
            {/* Play Next */}
            <button
              onClick={() => {
                const trackIndex = tracks.findIndex(t => t.id === contextMenu.track.id)
                if (trackIndex >= 0) playTrack(contextMenu.track, trackIndex)
                setContextMenu(null)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
            >
              <span>▶️</span> Play Now
            </button>
            
            {/* Add to Playlist */}
            <div className="border-t border-gray-700 mt-1 pt-1 relative">
              <button
                onMouseEnter={() => setShowPlaylistSubmenu(true)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <span>💾</span> Add to Playlist
                </span>
                <span>▶</span>
              </button>
              
              {/* Playlist Submenu */}
              {showPlaylistSubmenu && (
                <div
                  className="absolute left-full top-0 ml-1 bg-gray-800 border border-gray-700 rounded shadow-lg min-w-[200px] max-h-[300px] overflow-y-auto"
                  onMouseLeave={() => setShowPlaylistSubmenu(false)}
                >
                  <div className="py-1">
                    {/* New Playlist */}
                    {!showNewPlaylistInput ? (
                      <button
                        onClick={() => setShowNewPlaylistInput(true)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2 font-semibold text-green-400"
                      >
                        <span>➕</span> New Playlist
                      </button>
                    ) : (
                      <div className="px-4 py-2">
                        <input
                          type="text"
                          value={newPlaylistName}
                          onChange={(e) => setNewPlaylistName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              createNewPlaylist(contextMenu.track)
                            } else if (e.key === 'Escape') {
                              setShowNewPlaylistInput(false)
                              setNewPlaylistName('')
                            }
                          }}
                          placeholder="Playlist name..."
                          autoFocus
                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-green-500"
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={() => createNewPlaylist(contextMenu.track)}
                            className="flex-1 bg-green-600 hover:bg-green-700 rounded px-2 py-1 text-xs"
                          >
                            Create
                          </button>
                          <button
                            onClick={() => {
                              setShowNewPlaylistInput(false)
                              setNewPlaylistName('')
                            }}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {/* Existing Playlists */}
                    {playlists.length > 0 && (
                      <>
                        <div className="border-t border-gray-700 my-1"></div>
                        {playlists.map(playlist => (
                          <button
                            key={playlist.id}
                            onClick={() => addToPlaylist(contextMenu.track, playlist.id)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm"
                          >
                            {playlist.name}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Show in Explorer */}
            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={() => showInExplorer(contextMenu.track)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                <span>📁</span> Show in File Explorer
              </button>
              
              {/* Copy File Path */}
              <button
                onClick={() => copyFilePath(contextMenu.track)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                <span>📋</span> Copy File Path
              </button>
              
              {/* Analyze Track */}
              <button
                onClick={() => analyzeTrack(contextMenu.track)}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
              >
                <span>🔍</span> Analyze BPM/Key
              </button>
              
              {/* Rename File */}
              {!showRenameInput ? (
                <button
                  onClick={() => startRename(contextMenu.track)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-sm flex items-center gap-2"
                >
                  <span>✏️</span> Rename File
                </button>
              ) : (
                <div className="px-4 py-2 border-t border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={renameInputRef}
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        renameFile(contextMenu.track)
                      } else if (e.key === 'Escape') {
                        setShowRenameInput(false)
                        setNewFileName('')
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="New filename..."
                    className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => renameFile(contextMenu.track)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 rounded px-2 py-1 text-xs"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => {
                        setShowRenameInput(false)
                        setNewFileName('')
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 rounded px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Dangerous Actions */}
            <div className="border-t border-gray-700 mt-1 pt-1">
              <button
                onClick={() => removeFromLibrary(contextMenu.track)}
                className="w-full text-left px-4 py-2 hover:bg-orange-900 text-sm flex items-center gap-2 text-orange-400"
              >
                <span>🗑️</span> Remove from Library
              </button>
              
              <button
                onClick={() => deleteFile(contextMenu.track)}
                className="w-full text-left px-4 py-2 hover:bg-red-900 text-sm flex items-center gap-2 text-red-400"
              >
                <span>⚠️</span> Delete File Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Messages */}
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
      </div>
    </>
  )
}