import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { Toast } from '../components/Toast'
import { toLocal } from '../utils/paths'
import { AudioGraph, EQ_PRESETS } from '../audio/graph'
import Equalizer from '../components/Equalizer.jsx'
import LayerRemover from '../components/LayerRemover.jsx'
import DJDualPlayer from '../components/DJDualPlayer.jsx'
import DeckQueue from '../components/DeckQueue.jsx'
import AutoDJPanel from '../components/AutoDJPanel.jsx'
import { analyzeLoudnessFromArrayBuffer } from '../audio/loudness'
import { useFeature, features } from '../state/features'

const fmt = (s = 0) => {
  s = Math.max(0, s) // Keep decimal precision for display
  const minutes = Math.floor(s / 60)
  const seconds = s % 60
  const wholeSeconds = Math.floor(seconds)
  const tenths = Math.floor((seconds % 1) * 10)
  
  // Format as M:SS.T (e.g., 5:23.4)
  return `${minutes}:${String(wholeSeconds).padStart(2, '0')}.${tenths}`
}
const dbToAmp = (db) => Math.pow(10, db / 20)
const fileBase = (p = '') => (p.split(/[\\/]/).pop() || '').replace(/\.[^/.]+$/, '')
const labelFor = (meta, path) => {
  if (meta?.artist && meta?.title) return `${meta.artist} — ${meta.title}`
  if (meta?.title) return meta.title
  return fileBase(path)
}
const ls = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def } catch { return def } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
}
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const moveItem = (arr, from, to) => { const a = arr.slice(); const [x] = a.splice(from, 1); a.splice(to, 0, x); return a }

// Small menu item
const MenuItem = ({ children, onClick, disabled, danger }) => (
  <button
    disabled={disabled}
    onClick={(e) => { e.stopPropagation(); onClick?.() }}
    className={
      'w-full text-left px-3 py-2 text-sm ' +
      (disabled
        ? 'opacity-40 cursor-not-allowed'
        : danger
          ? 'hover:bg-red-500/10 text-red-300'
          : 'hover:bg-white/10')
    }
  >
    {children}
  </button>
)

// Global singleton to prevent multiple NowPlaying instances
let globalNowPlayingInstance = null;
let globalAudioElements = null; // Track global audio elements for cleanup

export default function NowPlaying() {
  // Add unique component identifier to detect multiple instances
  const componentId = useRef(Date.now() + '-' + Math.random().toString(36).substr(2, 5));
  
  // Determine if this should be the active instance immediately
  if (!globalNowPlayingInstance) {
    // Clean up any previous global audio elements
    if (globalAudioElements) {
      console.log(`🧨 Cleaning up previous global audio elements`);
      globalAudioElements.forEach((audio, idx) => {
        try {
          audio.pause();
          audio.src = '';
          audio.currentTime = 0;
          audio.load();
        } catch (e) { console.warn(`Error cleaning up global audio ${idx}:`, e); }
      });
      globalAudioElements = null;
    }
    
    globalNowPlayingInstance = componentId.current;
    console.log(`🔧 NowPlaying component mounted as ACTIVE instance with ID: ${componentId.current}`);
  } else if (globalNowPlayingInstance !== componentId.current) {
    console.log(`🚫 NowPlaying component mounted as INACTIVE instance with ID: ${componentId.current} (active: ${globalNowPlayingInstance})`);
    return <div>Loading...</div>; // Early return for inactive instances
  }
  
  const location = useLocation();
  
  // Feature switches
  const [djMode] = useFeature('djMode')
  const [autoDJ] = useFeature('autoDJ')
  const [normalize] = useFeature('normalize')
  const [playMode, setPlayMode] = useFeature('playMode', 'inOrder') // 'inOrder' | 'shuffle' | 'randomNoRepeat' | 'repeatOne' | 'repeatAll'

  // Queue + labels
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [qLabels, setQLabels] = useState({})

  // DJ Mode: Separate queues for each deck
  const [queueA, setQueueA] = useState([])
  const [queueB, setQueueB] = useState([])
  const [currentIndexA, setCurrentIndexA] = useState(0)
  const [currentIndexB, setCurrentIndexB] = useState(0)
  const [qLabelsA, setQLabelsA] = useState({})
  const [qLabelsB, setQLabelsB] = useState({})

  // Cue/Headphone monitoring state
  const [cueA, setCueA] = useState(false)
  const [cueB, setCueB] = useState(false)
  const [cueMixMain, setCueMixMain] = useState(0.3) // Main mix level in headphones
  const [cueMixCue, setCueMixCue] = useState(1.0)   // Cue level in headphones

  // UI state
  const [crossfadeSec, setCrossfadeSec] = useState(4)
  const [trackMeta, setTrackMeta] = useState(null)
  const [toast, setToast] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [djXfader, setDjXfader] = useState(0.5)

  // Deck B state for DJ mode
  const [deckBTrack, setDeckBTrack] = useState(null)
  const [deckBMeta, setDeckBMeta] = useState(null)
  const [deckBPlaying, setDeckBPlaying] = useState(false)
  const [deckBPosition, setDeckBPosition] = useState(0)
  const [deckBDuration, setDeckBDuration] = useState(0)
  const [deckBVolume, setDeckBVolume] = useState(0.8)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState(null)

  // Helper function to show confirmation dialog without focus issues
  const showConfirmDialog = (message, onConfirm) => {
    setConfirmDialog({ message, onConfirm })
  }

  // EQ
  const [eqA, setEqA] = useState(new Array(16).fill(0))
  const [eqB, setEqB] = useState(new Array(16).fill(0))

  // Audio engine
  const a1 = useRef(new Audio())
  const a2 = useRef(new Audio())
  const active = useRef(1) // 1 => a1, 2 => a2
  const fading = useRef(false)
  const timers = useRef([])
  const posTimer = useRef(null)
  const graph = useRef(null)
  const startInProgress = useRef(false)

  // Store audio elements globally for cleanup
  useEffect(() => {
    globalAudioElements = [a1.current, a2.current];
    console.log(`🔧 Registered global audio elements for instance ${componentId.current}`);
  }, []);

  const getActive = () => (active.current === 1 ? a1.current : a2.current)
  const getInactive = () => (active.current === 1 ? a2.current : a1.current)

  // Context menu
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, idx: -1 })
  
  // Playlists
  const [playlists, setPlaylists] = useState([])
  
  const openMenuAt = (evt, idx) => {
    evt?.preventDefault?.(); evt?.stopPropagation?.()
    const ne = evt?.nativeEvent ?? evt
    let x = ne?.pageX, y = ne?.pageY
    if (x == null || y == null) {
      const r = evt.currentTarget.getBoundingClientRect()
      x = r.left + r.width - 8 + window.scrollX
      y = r.top + r.height + 8 + window.scrollY
    }
    
    // Ensure dropdown stays within viewport
    const dropdownWidth = 240
    const dropdownHeight = 300 // Approximate height
    const padding = 20
    
    // Adjust horizontal position if it would go off-screen
    if (x + dropdownWidth > window.innerWidth - padding) {
      x = window.innerWidth - dropdownWidth - padding
    }
    if (x < padding) {
      x = padding
    }
    
    // Adjust vertical position if it would go off-screen
    if (y + dropdownHeight > window.innerHeight - padding) {
      y = Math.max(padding, y - dropdownHeight - 40) // Position above the click point
    }
    
    setMenu({ open: true, x: x ?? 24, y: y ?? 24, idx })
  }
  const closeMenu = () => setMenu({ open: false, x: 0, y: 0, idx: -1 })

  // Play-mode helpers
  const bagKey = (q) => 'ngks:bag:v1:' + (q && q.length ? q.join('|') : 'empty')
  const readBag = (q) => { const k = bagKey(q); const bag = ls.get(k, null); return Array.isArray(bag) ? bag : [] }
  const writeBag = (q, bag) => ls.set(bagKey(q), bag)

  function pickNextIndex(mode, q, curIdx) {
    if (!q.length) return 0
    if (mode === 'inOrder') return (curIdx + 1) % q.length
    if (mode === 'repeatOne') return curIdx // Stay on the same track
    if (mode === 'repeatAll') return (curIdx + 1) % q.length // Loop through all tracks
    if (mode === 'shuffle') {
      if (q.length === 1) return curIdx
      let r; do { r = Math.floor(Math.random() * q.length) } while (r === curIdx)
      return r
    }
    // randomNoRepeat
    let bag = readBag(q)
    if (!bag.length) {
      bag = [...Array(q.length).keys()]
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] }
    }
    while (bag.length) {
      const idx = bag.pop()
      if (idx !== curIdx) { writeBag(q, bag); return idx }
    }
    return (curIdx + 1) % q.length
  }

  function pickPrevIndex(mode, q, curIdx) {
    if (!q.length) return 0
    if (mode === 'repeatOne') return curIdx // Stay on the same track
    if (mode === 'inOrder' || mode === 'repeatAll') {
      return curIdx === 0 ? q.length - 1 : curIdx - 1
    }
    if (mode === 'shuffle' || mode === 'randomNoRepeat') {
      // For shuffle modes, just go to previous track in queue order
      return curIdx === 0 ? q.length - 1 : curIdx - 1
    }
    return curIdx === 0 ? q.length - 1 : curIdx - 1
  }

  // Loudness pregain
  async function ensurePregain(absPath, whichPlayer /* 'A' or 'B' */) {
    if (!normalize) return
    try {
      const buf = await window.loudness.readFile(absPath)
      const { gainToTarget } = await analyzeLoudnessFromArrayBuffer(buf, -16)
      await window.api.dbSetPregain({ filePath: absPath, pregainDb: gainToTarget })
      const preIn = whichPlayer === 'A' ? graph.current.chainA.preIn : graph.current.chainB.preIn
      preIn.gain.value = dbToAmp(gainToTarget || 0)
    } catch (e) {
      console.warn('pregain analysis failed:', e?.message || e)
    }
  }

  // Boot
  // Initial mount: set up queue from state or localStorage or autoplay
  useEffect(() => {
    let initialQueue = [];
    let initialIndex = 0;
    
    // Check for no-autoplay flag (DJ mode manual cue)
    const noAutoplay = sessionStorage.getItem('ngks_no_autoplay') === 'true';
    // Check for autoplay queue from sessionStorage (from "Play All")
    const autoplayQueue = sessionStorage.getItem('ngks_autoplay_queue');
    if (autoplayQueue) {
      try {
        const parsedQueue = JSON.parse(autoplayQueue);
        console.log('💥 Queue detected after refresh:', parsedQueue, 'DJ Mode:', djMode, 'NoAutoplay:', noAutoplay);
        sessionStorage.removeItem('ngks_autoplay_queue');
        if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
          initialQueue = parsedQueue;
          initialIndex = 0;
        }
      } catch (err) {
        console.error('Error parsing queue:', err);
      }
    }
    // Check for single autoplay file from sessionStorage (from single song play)
    else {
      // Check for DJ single track load (no auto-play)
      const djSingleLoad = sessionStorage.getItem('ngks_dj_single_load');
      if (djSingleLoad) {
        console.log('🎧 DJ single track load detected:', djSingleLoad, 'NoAutoplay:', noAutoplay);
        sessionStorage.removeItem('ngks_dj_single_load');
        initialQueue = [djSingleLoad];
        initialIndex = 0;
      }
      // Regular auto-play single file
      else {
        const autoplayFile = sessionStorage.getItem('ngks_autoplay');
        if (autoplayFile) {
            console.log('💥 Autoplay detected after refresh:', autoplayFile, 'NoAutoplay:', noAutoplay);
            sessionStorage.removeItem('ngks_autoplay');
            initialQueue = [autoplayFile];
            initialIndex = 0;
        } else if (location.state?.playFile) {
          if (location.state.playFile) {
            initialQueue = [location.state.playFile];
            initialIndex = 0;
          }
        } else {
          const q = ls.get('playQueue', []);
          const idx = Number(localStorage.getItem('playIndex') || 0);
          if (Array.isArray(q) && q.length > 0 && q.every(Boolean)) {
            initialQueue = q;
            initialIndex = idx;
          }
        }
      }
    }
    // Remove no-autoplay flag after use
    if (noAutoplay) sessionStorage.removeItem('ngks_no_autoplay');
    setQueue(initialQueue);
    setCurrentIndex(initialIndex);

    graph.current = new AudioGraph();
    graph.current.attachMediaElements(a1.current, a2.current);
    graph.current.setEq('A', eqA);
    graph.current.setEq('B', eqB);
    graph.current.setCrossfader(djXfader, false);
    graph.current.setVolume('A', muted ? 0 : volume, false);
    graph.current.setVolume('B', muted ? 0 : volume, false);
    
    // Initialize cue system
    graph.current.setCueChannels(cueA, cueB);
    graph.current.setCueMix(cueMixMain, cueMixCue);

    a1.current.volume = 1;
    a2.current.volume = 1;

    // Expose global audio control for library
    window.ngksAudioControl = {
      stopAll: () => {
        console.log('🛑 Global stop command received');
        // Immediately stop both audio elements
        a1.current.pause();
        a2.current.pause();
        a1.current.src = '';
        a2.current.src = '';
        a1.current.currentTime = 0;
        a2.current.currentTime = 0;
        a1.current.load();
        a2.current.load();
        setIsPlaying(false);
        setPosition(0);
        console.log('🛑 Both audio elements stopped and reset');
      }
    };
  }, []);

  // Watch for playFile changes in location.state and update queue if needed
  useEffect(() => {
    if (location.state?.playFile) {
      console.log('🎵 New song selected from library:', location.state.playFile);
      setQueue([location.state.playFile]);
      setCurrentIndex(0);
    }
  }, [location.state?.playFile]);

  // Auto-populate deck queues when DJ mode is enabled and main queue has tracks
  useEffect(() => {
    if (djMode && queue.length > 0 && queueA.length === 0 && queueB.length === 0) {
      // Populate deck A with all tracks
      setQueueA([...queue])
      setQLabelsA({...qLabels})
      
      // Populate deck B with the same tracks (DJs often work with the same track pool)
      setQueueB([...queue])
      setQLabelsB({...qLabels})
      
      console.log('🎧 Auto-populated deck queues with', queue.length, 'tracks')
    }
  }, [djMode, queue.length, queueA.length, queueB.length]) // eslint-disable-line

  useEffect(() => { ls.set('playQueue', queue) }, [queue])

  useEffect(() => {
    if (!queue.length) return
    console.log('🏷️ [EFFECT: setQLabels] Queue changed, fetching labels for:', queue);
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(queue.map(async p => {
        try { 
          console.log('🏷️ [setQLabels] Calling getTrackByPath for label:', p);
          const m = await window.api.getTrackByPath(p); 
          return [p, { label: labelFor(m, p) }] 
        }
        catch { return [p, { label: fileBase(p) }] }
      }))
      if (!cancelled) {
        console.log('🏷️ [setQLabels] Setting labels:', entries);
        setQLabels(Object.fromEntries(entries));
      }
    })()
    return () => { cancelled = true }
  }, [queue])

  useEffect(() => {
    // Check for no-autoplay flag (DJ mode manual cue)
    const noAutoplay = sessionStorage.getItem('ngks_no_autoplay') === 'true';
    if (noAutoplay) {
      console.log('🎧 [EFFECT: queue/currentIndex] No-autoplay flag set - do not auto-start playback');
      sessionStorage.removeItem('ngks_no_autoplay');
      return;
    }
    // Check stored DJ mode state from sessionStorage (persists across reload)
    const storedDjMode = sessionStorage.getItem('ngks_dj_mode_active') === 'true';
    // In DJ mode, never auto-start playback when queue loads
    if ((djMode || storedDjMode) && queue.length && queue[currentIndex] && !startInProgress.current) {
      console.log('🎧 [EFFECT: queue/currentIndex] DJ Mode - queue loaded but no auto-start');
      // Clean up the stored DJ mode flag after use
      sessionStorage.removeItem('ngks_dj_mode_active');
      return;
    }
    if (queue.length && queue[currentIndex] && !startInProgress.current && !djMode && !storedDjMode) {
      console.log('🎵 [EFFECT: queue/currentIndex] Starting playback - queue:', queue.length, 'currentIndex:', currentIndex, 'file:', queue[currentIndex]);
      startInProgress.current = true;
      start(currentIndex).finally(() => {
        // Add a small delay before allowing next start to prevent rapid-fire calls
        setTimeout(() => {
          startInProgress.current = false;
        }, 500);
      });
    } else if (startInProgress.current) {
      console.log('🛑 [EFFECT: queue/currentIndex] Start blocked - already in progress');
    } else if (!queue.length) {
      console.log('🛑 [EFFECT: queue/currentIndex] No queue available');
    } else if (!queue[currentIndex]) {
      console.log('🛑 [EFFECT: queue/currentIndex] No file at current index:', currentIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, currentIndex, djMode])

  useEffect(() => () => {
    console.log(`🧹 NowPlaying component unmounting with ID: ${componentId.current}`);
    if (globalNowPlayingInstance === componentId.current) {
      console.log(`🧹 Resetting global instance (was: ${globalNowPlayingInstance})`);
      globalNowPlayingInstance = null;
    }
    timers.current.forEach(t => clearTimeout(t))
    if (posTimer.current) clearInterval(posTimer.current)
    // Cleanup global audio control reference
    if (window.ngksAudioControl) {
      console.log('🧹 Cleaning up global audio control');
      delete window.ngksAudioControl;
    }
  }, [])

  const scheduleAutoNext = () => {
    timers.current.forEach(t => clearTimeout(t)); timers.current = []
    if (!autoDJ) return
    const A = getActive()
    const endCut = trackMeta?.endCut || 0
    const d = Number.isFinite(A.duration) && A.duration > 0 ? A.duration : (trackMeta?.duration || 0)
    const cueAt = Math.max(0, (d - endCut) - crossfadeSec)
    const remaining = Math.max(0, cueAt - (A.currentTime || 0))
    const t = setTimeout(() => next(), Math.max(100, remaining * 1000))
    timers.current.push(t)
  }
  const startPosTimer = () => {
    if (posTimer.current) clearInterval(posTimer.current)
    posTimer.current = setInterval(() => {
      const A = getActive()
      setPosition(A.currentTime || 0)
    }, 200)
  }

  // Transport
  async function start(idx) {
    const startId = Date.now() + '-' + Math.random().toString(36).substr(2, 5);
    console.log(`🚀 [START-${startId}] Begin start() for index ${idx}`);
    
    try {
      // Stop any currently playing audio immediately
      setIsPlaying(false);
      
      // Properly stop and reset both audio elements
      console.log(`🛑 [START-${startId}] Stopping all audio elements`);
      [a1.current, a2.current].forEach((audio, idx) => {
        if (audio) {
          try {
            audio.pause();
            audio.src = '';
            audio.currentTime = 0;
            audio.load();
            // Clear all event handlers to prevent old handlers from firing
            audio.onplay = null;
            audio.onpause = null;
            audio.onended = null;
            audio.onloadedmetadata = null;
            audio.ontimeupdate = null;
            audio.oncanplay = null;
            audio.oncanplaythrough = null;
            audio.onerror = null;
          } catch (e) { console.warn(`Error stopping audio ${idx}:`, e); }
        }
      });
      
      console.log(`🔧 [START-${startId}] Audio elements cleaned, reusing existing graph`);

      timers.current.forEach(t => clearTimeout(t)); timers.current = [];
      if (posTimer.current) clearInterval(posTimer.current);

      const bounded = clamp(idx, 0, Math.max(0, queue.length - 1));
      setCurrentIndex(bounded);
      localStorage.setItem('playIndex', String(bounded));

      const path = queue[bounded];
      if (!path) {
        setToast({ type: 'danger', message: 'No track selected or invalid queue.' });
        console.log(`❌ [START-${startId}] No path found, aborting`);
        return;
      }

      console.log(`🎵 [START-${startId}] Calling getTrackByPath for metadata:`, path);
      const info = await window.api.getTrackByPath(path);
      console.log(`🎵 [START-${startId}] getTrackByPath returned metadata:`, info);
      if (!info) {
        setToast({ type: 'danger', message: 'Track not found in database' });
        console.log(`❌ [START-${startId}] Track not found in database`);
        return;
      }
      setTrackMeta(info);

      const startCut = info?.startCut || 0
      const pregainDb = normalize ? (info?.pregainDb || 0) : 0
      const isA = (active.current === 1)

      const preIn = isA ? graph.current.chainA.preIn : graph.current.chainB.preIn
      preIn.gain.value = dbToAmp(pregainDb)
      if (normalize && (!('pregainDb' in info) || info.pregainDb === 0)) {
        ensurePregain(path, isA ? 'A' : 'B')
      }

      const A = getActive();
      const B = getInactive();
      // Ensure only the active element is used for playback
      B.pause();
      B.src = '';
      B.currentTime = 0;
      B.onplay = null;
      B.onpause = null;
      B.onended = null;
      B.onloadedmetadata = null;

      console.log(`🎵 [START-${startId}] Assigning src to active audio element:`, active.current === 1 ? 'a1' : 'a2', toLocal(path));
      A.src = toLocal(path);
      await graph.current.resume();

      A.onloadedmetadata = () => {
        const d = Number.isFinite(A.duration) ? A.duration : (info?.duration || 0);
        setDuration(d);
        A.currentTime = startCut;
        
        console.log(`🎵 [START-${startId}] Calling play() on active audio element:`, active.current === 1 ? 'a1' : 'a2');
        A.play()
          .then(() => { 
            console.log(`✅ [START-${startId}] Playback started successfully`);
            setIsPlaying(true); setPosition(A.currentTime || 0); startPosTimer(); scheduleAutoNext(); 
          })
          .catch(err => {
            console.log(`❌ [START-${startId}] Playback failed:`, err.message);
            setToast({ type: 'danger', message: 'Playback failed: ' + err.message });
          });
      };

      A.onpause = () => setIsPlaying(false);
      A.onplay = () => setIsPlaying(true);
    } catch (e) {
      console.log(`❌ [START-${startId}] Exception in start():`, e.message);
      setToast({ type: 'danger', message: e.message })
    }
  }

  // Listen for playFile events
  useEffect(() => {
    const removeListener = window.api.onPlayFile((filePath) => {
      console.log('🎵 [EFFECT: onPlayFile] Received play event for:', filePath);
      if (!startInProgress.current) {
        console.log('🎵 [EFFECT: onPlayFile] Processing play event');
        setQueue([filePath]);
        setCurrentIndex(0);
        startInProgress.current = true;
        start(0).finally(() => {
          setTimeout(() => {
            startInProgress.current = false;
          }, 500);
        });
      } else {
        console.log('🛑 [EFFECT: onPlayFile] Play event blocked - already in progress');
      }
    });
    return removeListener;
  }, []);

  async function next() {
    if (fading.current) return
    try {
      const curIdx = currentIndex
      const nextIdx = pickNextIndex(playMode, queue, curIdx)
      const nextPath = queue[nextIdx]

      fading.current = true
      const cur = getActive()
      const nxt = getInactive()
      const nxtPlayer = (active.current === 1 ? 'B' : 'A')
      const curPlayer = (active.current === 1 ? 'A' : 'B')

      const nextInfo = await window.api.getTrackByPath(nextPath)
      const startCutNext = nextInfo?.startCut || 0
      const pregainDbNext = normalize ? (nextInfo?.pregainDb || 0) : 0

      const preIn = nxtPlayer === 'A' ? graph.current.chainA.preIn : graph.current.chainB.preIn
      preIn.gain.value = dbToAmp(pregainDbNext)
      if (normalize && (!('pregainDb' in nextInfo) || nextInfo.pregainDb === 0)) {
        ensurePregain(nextPath, nxtPlayer)
      }

      nxt.src = toLocal(nextPath)
      graph.current.setVolume(nxtPlayer, 0, true)

      nxt.onloadedmetadata = () => {
        const d = Number.isFinite(nxt.duration) ? nxt.duration : (nextInfo?.duration || 0)
        setDuration(d)
        nxt.currentTime = startCutNext
        nxt.play().catch(err => setToast({ type: 'danger', message: 'Playback failed: ' + err.message }))

        let t = 0
        const xf = Math.max(0.05, crossfadeSec)
        const iv = setInterval(() => {
          t += 0.05
          const r = Math.min(1, t / xf)
          const base = muted ? 0 : volume
          graph.current.setVolume(nxtPlayer, base * r, true)
          graph.current.setVolume(curPlayer, base * (1 - r), true)
          if (r >= 1) {
            clearInterval(iv)
            cur.pause()
            active.current = active.current === 1 ? 2 : 1
            setCurrentIndex(nextIdx)
            setPosition(nxt.currentTime || 0)
            fading.current = false
            scheduleAutoNext()
          }
        }, 50)
      }
    } catch (e) {
      setToast({ type: 'danger', message: e.message })
    }
  }

  function prev() {
    if (startInProgress.current) {
      console.log('🛑 [prev] Blocked - start already in progress');
      return;
    }
    const pi = pickPrevIndex(playMode, queue, currentIndex)
    startInProgress.current = true;
    start(pi).finally(() => {
      setTimeout(() => {
        startInProgress.current = false;
      }, 500);
    });
  }

  const onPlayPause = () => {
    const A = getActive()
    if (!A.src) return
    if (A.paused) {
      A.play().then(() => { setIsPlaying(true); startPosTimer(); scheduleAutoNext() })
        .catch(err => setToast({ type: 'danger', message: err.message }))
    } else {
      A.pause()
      setIsPlaying(false)
      if (posTimer.current) clearInterval(posTimer.current)
    }
  }
  const onStop = () => {
    const A = getActive()
    A.pause()
    const startCut = trackMeta?.startCut || 0
    A.currentTime = startCut
    setPosition(startCut)
    setIsPlaying(false)
    if (posTimer.current) clearInterval(posTimer.current)
    timers.current.forEach(t => clearTimeout(t)); timers.current = []
  }
  const onSeek = (eOrPos) => {
    const A = getActive()
    // Accept either a numeric position or an event from a range input
    const raw = (typeof eOrPos === 'number') ? eOrPos : (eOrPos?.target?.value ?? eOrPos)
    const t = Number(raw)
    if (!Number.isFinite(t)) return
    A.currentTime = t
    setPosition(t)
    scheduleAutoNext()
  }
  const onVolumeChange = (e) => {
    const v = Number(e.target.value)
    setVolume(v)
    if (!muted) {
      graph.current.setVolume('A', v)
      graph.current.setVolume('B', v)
    }
  }
  const onMuteToggle = () => {
    const m = !muted
    setMuted(m)
    graph.current.setVolume('A', m ? 0 : volume)
    graph.current.setVolume('B', m ? 0 : volume)
  }

  useEffect(() => { if (isPlaying) scheduleAutoNext() }, [crossfadeSec, autoDJ]) // eslint-disable-line

  const titleNow = labelFor(trackMeta, queue[currentIndex])
  const onRowClick = (idx) => {
    if (startInProgress.current) {
      console.log('🛑 [onRowClick] Blocked - start already in progress');
      return;
    }
    if (djMode) {
      // In DJ mode, just cue the track (set index), do not auto-play
      setCurrentIndex(idx);
      setIsPlaying(false);
      return;
    }
    startInProgress.current = true;
    start(idx).finally(() => {
      setTimeout(() => {
        startInProgress.current = false;
      }, 500);
    });
  }

  const playNowAt = (idx) => { 
    closeMenu(); 
    if (startInProgress.current) {
      console.log('🛑 [playNowAt] Blocked - start already in progress');
      return;
    }
    if (djMode) {
      // In DJ mode, just cue the track (set index), do not auto-play
      setCurrentIndex(idx);
      setIsPlaying(false);
      return;
    }
    startInProgress.current = true;
    start(idx).finally(() => {
      setTimeout(() => {
        startInProgress.current = false;
      }, 500);
    });
  }
  const playNextAt = (idx) => {
    closeMenu()
    if (idx === currentIndex || queue.length < 2) return
    const targetPos = (currentIndex + 1) % queue.length
    const newQ = moveItem(queue, idx, targetPos)
    setQueue(newQ)
  }
  const removeAt = (idx) => {
    closeMenu()
    if (!queue.length) return
    if (idx === currentIndex) {
      const nextIdx = pickNextIndex(playMode, queue, currentIndex)
      const nextPath = queue[nextIdx]
      const newQ = queue.filter((_, i) => i !== idx)
      setQueue(newQ)
      if (newQ.length === 0) {
        onStop()
        setCurrentIndex(0)
        return
      }
      const mapped = newQ.indexOf(nextPath)
      if (startInProgress.current) {
        console.log('🛑 [removeAt] Blocked - start already in progress');
        return;
      }
      startInProgress.current = true;
      start(mapped >= 0 ? mapped : 0).finally(() => {
        setTimeout(() => {
          startInProgress.current = false;
        }, 500);
      });
    } else {
      const shift = idx < currentIndex ? -1 : 0
      const newQ = queue.filter((_, i) => i !== idx)
      setQueue(newQ)
      setCurrentIndex(clamp(currentIndex + shift, 0, Math.max(0, newQ.length - 1)))
    }
  }
  const moveUpAt = (idx) => { closeMenu(); if (idx <= 0) return; const n = moveItem(queue, idx, idx - 1); setQueue(n); if (currentIndex === idx) setCurrentIndex(idx - 1); else if (currentIndex === idx - 1) setCurrentIndex(idx) }
  const moveDownAt = (idx) => { closeMenu(); if (idx >= queue.length - 1) return; const n = moveItem(queue, idx, idx + 1); setQueue(n); if (currentIndex === idx) setCurrentIndex(idx + 1); else if (currentIndex === idx + 1) setCurrentIndex(idx) }

  // DJ Mode: Dual Queue Management Functions
  const playTrackInDeck = async (deckId, trackIndex) => {
    if (deckId === 'A') {
      setCurrentIndexA(trackIndex)
      // Load track to deck A
      const trackPath = queueA[trackIndex]
      if (trackPath) {
        await loadTrackToDeckA(trackPath, /*autoPlay*/ false)
        console.log('Cued track', trackIndex, 'in deck A:', trackPath)
      }
    } else {
      setCurrentIndexB(trackIndex)
      // Load track to deck B
      const trackPath = queueB[trackIndex]
      if (trackPath) {
        await loadTrackToDeckB(trackPath, /*autoPlay*/ false)
        console.log('Cued track', trackIndex, 'in deck B:', trackPath)
      }
    }
  }

  // Load and play track in Deck A (for DJ mode)
  const loadTrackToDeckA = async (trackPath, autoPlay = true, skipConfirmation = false) => {
    try {
      console.log('🎵 Loading track to Deck A:', trackPath)
      
      // Safety guard: Check if deck A is currently playing (unless confirmation is skipped)
      if (!skipConfirmation && isPlaying && a1.current?.src) {
        const trackInfo = await window.api.getTrackByPath(trackPath)
        const trackLabel = trackInfo ? labelFor(trackInfo, trackPath) : trackPath
        
        showConfirmDialog(
          `⚠️ WARNING: Deck A is currently playing!\n\nLoading "${trackLabel}" will stop the current playback and could interrupt your mix.\n\nAre you sure you want to continue?`,
          () => loadTrackToDeckA(trackPath, autoPlay, true) // Retry with skipConfirmation = true
        )
        return
      }
      
      // Stop current deck A playback
      a1.current.pause()
      a1.current.src = ''
      a1.current.currentTime = 0
      
      // Get track metadata
      const info = await window.api.getTrackByPath(trackPath)
      if (!info) {
        setToast({ type: 'danger', message: 'Track not found in database' })
        return
      }
      
      setTrackMeta(info)
      
      // Set up audio
      const startCut = info?.startCut || 0
      const pregainDb = normalize ? (info?.pregainDb || 0) : 0
      
      // Apply pregain to deck A
      if (graph.current?.chainA?.preIn) {
        graph.current.chainA.preIn.gain.value = dbToAmp(pregainDb)
      }
      
      // Load the track
      a1.current.src = toLocal(trackPath)
      
      a1.current.onloadedmetadata = () => {
        const d = Number.isFinite(a1.current.duration) ? a1.current.duration : (info?.duration || 0)
        setDuration(d)
        a1.current.currentTime = startCut
        setPosition(startCut)
        if (autoPlay && !djMode) {
          // Auto-play the track only if not in DJ mode
          a1.current.play()
            .then(() => {
              console.log('✅ Deck A playback started')
              setIsPlaying(true)
              startPosTimer()
            })
            .catch(err => {
              console.error('❌ Deck A playback failed:', err)
              setToast({ type: 'danger', message: 'Deck A playback failed: ' + err.message })
            })
        }
      }
      
      a1.current.onplay = () => setIsPlaying(true)
      a1.current.onpause = () => setIsPlaying(false)
      a1.current.onended = () => {
        setIsPlaying(false)
        // Auto-advance to next track in Queue A
        const nextIndex = (currentIndexA + 1) % queueA.length
        if (nextIndex !== currentIndexA && queueA[nextIndex]) {
          playTrackInDeck('A', nextIndex)
        }
      }
      
    } catch (error) {
      console.error('Error loading track to Deck A:', error)
      setToast({ type: 'danger', message: 'Error loading track to Deck A: ' + error.message })
    }
  }

  // Load and play track in Deck B
  const loadTrackToDeckB = async (trackPath, autoPlay = true, skipConfirmation = false) => {
    try {
      console.log('🎵 Loading track to Deck B:', trackPath)
      
      // Safety guard: Check if deck B is currently playing (unless confirmation is skipped)
      if (!skipConfirmation && deckBPlaying && a2.current?.src) {
        const trackInfo = await window.api.getTrackByPath(trackPath)
        const trackLabel = trackInfo ? labelFor(trackInfo, trackPath) : trackPath
        
        showConfirmDialog(
          `⚠️ WARNING: Deck B is currently playing!\n\nLoading "${trackLabel}" will stop the current playback and could interrupt your mix.\n\nAre you sure you want to continue?`,
          () => loadTrackToDeckB(trackPath, autoPlay, true) // Retry with skipConfirmation = true
        )
        return
      }
      
      // Stop current deck B playback
      a2.current.pause()
      a2.current.src = ''
      a2.current.currentTime = 0
      a2.current.load()
      
      // Get track metadata
      const info = await window.api.getTrackByPath(trackPath)
      if (!info) {
        setToast({ type: 'danger', message: 'Track not found in database' })
        return
      }
      
      setDeckBTrack(trackPath)
      setDeckBMeta(info)
      
      // Set up audio without audio graph initially (for testing)
      const startCut = info?.startCut || 0
      
      // Convert path to proper URL format
      const audioUrl = toLocal(trackPath)
      console.log('🎵 Deck B audio URL:', audioUrl)
      
      // Set up event handlers BEFORE setting src
      a2.current.onloadedmetadata = () => {
        console.log('🎵 Deck B metadata loaded, duration:', a2.current.duration)
        const d = Number.isFinite(a2.current.duration) ? a2.current.duration : (info?.duration || 0)
        setDeckBDuration(d)
        a2.current.currentTime = startCut
        setDeckBPosition(startCut)
        // Try connecting to audio graph AFTER successful load
        if (graph.current) {
          console.log('🔧 Connecting Deck B to audio graph after load')
          try {
            graph.current.attachMediaElements(a1.current, a2.current)
            // Apply pregain after connection
            const pregainDb = normalize ? (info?.pregainDb || 0) : 0
            if (graph.current?.chainB?.preIn) {
              graph.current.chainB.preIn.gain.value = dbToAmp(pregainDb)
            }
          } catch (graphError) {
            console.warn('Audio graph connection failed, playing directly:', graphError)
          }
        }
        if (autoPlay && !djMode) {
          // Auto-play the track only if not in DJ mode
          console.log('🎵 Attempting to play Deck B')
          a2.current.play()
            .then(() => {
              console.log('✅ Deck B playback started')
              setDeckBPlaying(true)
              startDeckBPosTimer()
            })
            .catch(err => {
              console.error('❌ Deck B playback failed:', err)
              setToast({ type: 'danger', message: 'Deck B playback failed: ' + err.message })
            })
        }
      }
      
      a2.current.onerror = (e) => {
        console.error('❌ Deck B audio error:', e, a2.current.error)
        let errorMsg = 'Unable to load audio file'
        
        if (a2.current.error) {
          const errorCode = a2.current.error.code
          const errorMessage = a2.current.error.message || ''
          
          switch (errorCode) {
            case 1: // MEDIA_ERR_ABORTED
              errorMsg = 'Audio loading was aborted'
              break
            case 2: // MEDIA_ERR_NETWORK
              errorMsg = 'Network error while loading audio'
              break
            case 3: // MEDIA_ERR_DECODE
              errorMsg = 'Audio format not supported or corrupted file'
              break
            case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
              errorMsg = 'Audio format not supported by browser'
              break
            default:
              errorMsg = `Unknown error (code: ${errorCode})`
          }
          
          if (errorMessage.includes('DEMUXER_ERROR') || errorMessage.includes('FfmpegDemuxer')) {
            errorMsg = 'Audio codec not supported - try a different file format'
          }
        }
        
        console.error('❌ Deck B detailed error:', errorMsg)
        setToast({ type: 'danger', message: 'Deck B: ' + errorMsg })
        
        // Try to recover by clearing the problematic source
        a2.current.src = ''
        a2.current.load()
      }
      
      a2.current.onplay = () => setDeckBPlaying(true)
      a2.current.onpause = () => setDeckBPlaying(false)
      a2.current.onended = () => {
        setDeckBPlaying(false)
        // Auto-advance to next track in Queue B
        const nextIndex = (currentIndexB + 1) % queueB.length
        if (nextIndex !== currentIndexB && queueB[nextIndex]) {
          playTrackInDeck('B', nextIndex)
        }
      }
      
      // Now set the source and load
      a2.current.src = audioUrl
      a2.current.load()
      
    } catch (error) {
      console.error('Error loading track to Deck B:', error)
      setToast({ type: 'danger', message: 'Error loading track to Deck B: ' + error.message })
    }
  }

  // Deck B position timer
  const deckBPosTimer = useRef(null)
  const startDeckBPosTimer = () => {
    if (deckBPosTimer.current) clearInterval(deckBPosTimer.current)
    deckBPosTimer.current = setInterval(() => {
      setDeckBPosition(a2.current.currentTime || 0)
    }, 200)
  }

  const stopDeckBPosTimer = () => {
    if (deckBPosTimer.current) {
      clearInterval(deckBPosTimer.current)
      deckBPosTimer.current = null
    }
  }

  // Deck B transport controls
  const onDeckBPlayPause = () => {
    if (!a2.current.src) {
      // No track loaded, load the current track from Queue B
      if (queueB.length > 0) {
        playTrackInDeck('B', currentIndexB)
      } else {
        setToast({ type: 'warning', message: 'No tracks in Queue B' })
      }
      return
    }
    
    if (a2.current.paused) {
      a2.current.play()
        .then(() => {
          setDeckBPlaying(true)
          startDeckBPosTimer()
        })
        .catch(err => setToast({ type: 'danger', message: 'Deck B playback failed: ' + err.message }))
    } else {
      a2.current.pause()
      setDeckBPlaying(false)
      stopDeckBPosTimer()
    }
  }

  const onDeckBStop = () => {
    a2.current.pause()
    const startCut = deckBMeta?.startCut || 0
    a2.current.currentTime = startCut
    setDeckBPosition(startCut)
    setDeckBPlaying(false)
    stopDeckBPosTimer()
  }

  const onDeckBSeek = (eOrPos) => {
    // Accept either a numeric position or an event from a range input
    const raw = (typeof eOrPos === 'number') ? eOrPos : (eOrPos?.target?.value ?? eOrPos)
    const t = Number(raw)
    if (!Number.isFinite(t)) return
    a2.current.currentTime = t
    setDeckBPosition(t)
  }

  const onDeckBVolumeChange = (volume) => {
    setDeckBVolume(volume)
    if (graph.current) {
      graph.current.setVolume('B', volume)
    }
  }

  // Cue/Headphone monitoring controls
  const toggleCue = (deck) => {
    if (deck === 'A') {
      const newCue = !cueA
      setCueA(newCue)
      if (graph.current) {
        graph.current.setCue('A', newCue)
      }
      setToast({ 
        type: 'info', 
        message: `Deck A ${newCue ? 'added to' : 'removed from'} cue` 
      })
    } else if (deck === 'B') {
      const newCue = !cueB
      setCueB(newCue)
      if (graph.current) {
        graph.current.setCue('B', newCue)
      }
      setToast({ 
        type: 'info', 
        message: `Deck B ${newCue ? 'added to' : 'removed from'} cue` 
      })
    }
  }

  const onCueMixChange = (mainLevel, cueLevel) => {
    if (mainLevel !== undefined) setCueMixMain(mainLevel)
    if (cueLevel !== undefined) setCueMixCue(cueLevel)
    if (graph.current) {
      graph.current.setCueMix(
        mainLevel !== undefined ? mainLevel : cueMixMain,
        cueLevel !== undefined ? cueLevel : cueMixCue
      )
    }
  }

  const removeTrackFromDeck = (deckId, trackIndex) => {
    if (deckId === 'A') {
      const newQ = queueA.filter((_, i) => i !== trackIndex)
      setQueueA(newQ)
      if (currentIndexA >= trackIndex && currentIndexA > 0) {
        setCurrentIndexA(currentIndexA - 1)
      }
    } else {
      const newQ = queueB.filter((_, i) => i !== trackIndex)
      setQueueB(newQ)
      if (currentIndexB >= trackIndex && currentIndexB > 0) {
        setCurrentIndexB(currentIndexB - 1)
      }
    }
  }

  const moveTrackInDeck = (deckId, fromIndex, toIndex) => {
    if (deckId === 'A') {
      const newQ = moveItem(queueA, fromIndex, toIndex)
      setQueueA(newQ)
      if (currentIndexA === fromIndex) {
        setCurrentIndexA(toIndex)
      } else if (currentIndexA === toIndex) {
        setCurrentIndexA(fromIndex)
      }
    } else {
      const newQ = moveItem(queueB, fromIndex, toIndex)
      setQueueB(newQ)
      if (currentIndexB === fromIndex) {
        setCurrentIndexB(toIndex)
      } else if (currentIndexB === toIndex) {
        setCurrentIndexB(fromIndex)
      }
    }
  }

  const clearDeckQueue = (deckId) => {
    if (deckId === 'A') {
      setQueueA([])
      setCurrentIndexA(0)
    } else {
      setQueueB([])
      setCurrentIndexB(0)
    }
  }

  // Playlist functions
  const loadPlaylists = async () => {
    try {
      const lists = await window.api.listPlaylists()
      setPlaylists(lists || [])
    } catch (error) {
      console.error('Error loading playlists:', error)
    }
  }

  const addToPlaylist = async (playlistId, trackPath) => {
    try {
      // First get the track ID from the path
      const track = await window.api.getTrackByPath(trackPath)
      if (track) {
        await window.api.addTrackToPlaylist(playlistId, track.id)
        setToast({ type: 'success', message: 'Added to playlist!' })
      } else {
        setToast({ type: 'error', message: 'Track not found in library' })
      }
    } catch (error) {
      console.error('Error adding to playlist:', error)
      setToast({ type: 'error', message: 'Error adding to playlist' })
    }
    closeMenu()
  }

  // Load playlists on component mount
  useEffect(() => {
    loadPlaylists()
  }, [])

  // Keyboard shortcuts for play modes and transport controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Don't handle hotkeys if user is typing in an input field
      const activeElement = document.activeElement
      if (activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
      )) {
        return
      }

      // In DJ mode, determine which deck to control based on cue status
      const getCueTarget = () => {
        if (!djMode) {
          return getActive() // Normal mode: use active deck
        }
        
        // DJ mode: prioritize cued deck(s)
        if (cueA && cueB) {
          // Both decks cued: use the active deck
          return getActive()
        } else if (cueA) {
          // Only deck A cued: control deck A
          return audioA.current
        } else if (cueB) {
          // Only deck B cued: control deck B
          return audioB.current
        } else {
          // No decks cued: use active deck
          return getActive()
        }
      }

      // Get the appropriate play/pause function based on cue target
      const getCuePlayPause = () => {
        if (!djMode) {
          return onPlayPause // Normal mode
        }
        
        // DJ mode: determine which deck's function to use
        if (cueA && cueB) {
          return onPlayPause // Both cued: use general function
        } else if (cueA) {
          // Only deck A cued: use deck A function
          return () => {
            if (!audioA.current.src && queueA.length > 0) {
              playTrackInDeck('A', currentIndexA)
            } else if (audioA.current.paused) {
              audioA.current.play()
              setIsPlaying(true)
              startPosTimer()
            } else {
              audioA.current.pause()
              setIsPlaying(false)
            }
          }
        } else if (cueB) {
          // Only deck B cued: use deck B function
          return () => {
            if (!audioB.current.src && queueB.length > 0) {
              playTrackInDeck('B', currentIndexB)
            } else if (audioB.current.paused) {
              audioB.current.play()
              setDeckBPlaying(true)
              // Start timer if needed
            } else {
              audioB.current.pause()
              setDeckBPlaying(false)
            }
          }
        } else {
          return onPlayPause // No decks cued: use general function
        }
      }

      // Get the appropriate stop function
      const getCueStop = () => {
        if (!djMode) {
          return onStop // Normal mode
        }
        
        // DJ mode: determine which deck's function to use
        if (cueA && cueB) {
          return onStop // Both cued: use general function
        } else if (cueA) {
          // Only deck A cued: use deck A function
          return () => {
            audioA.current.pause()
            audioA.current.currentTime = 0
            setIsPlaying(false)
            setPosition(0)
          }
        } else if (cueB) {
          // Only deck B cued: use deck B function  
          return () => {
            audioB.current.pause()
            audioB.current.currentTime = 0
            setDeckBPlaying(false)
            setDeckBPosition(0)
          }
        } else {
          return onStop // No decks cued: use general function
        }
      }

      // Get the appropriate seek function
      const getCueSeek = (offset) => {
        const A = getCueTarget()
        
        if (!A || !A.src) {
          return
        }
        
        const newPos = Math.max(0, Math.min(A.duration || 0, A.currentTime + offset))
        
        // In DJ mode, determine which deck we're seeking on
        if (!djMode) {
          onSeek(newPos) // Normal mode: use standard seek
        } else {
          // DJ mode: update the correct deck's position
          if (cueA && !cueB && A === audioA.current) {
            // Only deck A cued: update deck A position
            A.currentTime = newPos
            setPosition(newPos)
          } else if (cueB && !cueA && A === audioB.current) {
            // Only deck B cued: update deck B position
            A.currentTime = newPos
            setDeckBPosition(newPos)
          } else {
            // Both cued or neither cued: use standard seek
            onSeek(newPos)
          }
        }
      }

      // Transport controls (no modifier keys except Shift)
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const A = getCueTarget()
        const playPauseFunc = getCuePlayPause()
        const stopFunc = getCueStop()
        
        switch (e.key) {
          case ' ': // Spacebar - Play/Pause
            e.preventDefault()
            playPauseFunc()
            break
          case 'ArrowLeft': // Left arrow - Seek back 5s
            e.preventDefault()
            getCueSeek(-5)
            break
          case 'ArrowRight': // Right arrow - Seek forward 5s
            e.preventDefault()
            getCueSeek(5)
            break
          case ',': // Comma - Seek back (1s normal, 0.5s with Shift)
            e.preventDefault()
            getCueSeek(e.shiftKey ? -0.5 : -1)
            break
          case '.': // Period - Seek forward (1s normal, 0.5s with Shift)
            e.preventDefault()
            getCueSeek(e.shiftKey ? 0.5 : 1)
            break
          case 'j': // J - Seek back 10s
            e.preventDefault()
            getCueSeek(-10)
            break
          case 'l': // L - Seek forward 10s
            e.preventDefault()
            getCueSeek(10)
            break
          case 'k': // K - Play/Pause (alternative)
            e.preventDefault()
            playPauseFunc()
            break
          case 's': // S - Stop
            e.preventDefault()
            stopFunc()
            break
        }
      }
      
      // Play mode shortcuts (Ctrl/Cmd + number)
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault()
            setPlayMode('inOrder')
            setToast({ type: 'info', message: '🔄 In Order mode' })
            break
          case '2':
            e.preventDefault()
            setPlayMode('repeatAll')
            setToast({ type: 'info', message: '🔁 Repeat All mode' })
            break
          case '3':
            e.preventDefault()
            setPlayMode('repeatOne')
            setToast({ type: 'info', message: '🔂 Repeat One mode' })
            break
          case '4':
            e.preventDefault()
            setPlayMode('shuffle')
            setToast({ type: 'info', message: '🔀 Shuffle mode' })
            break
          case '5':
            e.preventDefault()
            setPlayMode('randomNoRepeat')
            setToast({ type: 'info', message: '🎲 Random (No Repeat) mode' })
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress, true) // Use capture phase
    return () => window.removeEventListener('keydown', handleKeyPress, true)
  }, [setPlayMode, djMode, cueA, cueB]) // Include all dependencies

  return (
    <div className="p-6 space-y-4 mx-auto" style={{ maxWidth: '800px' }}>
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold">Now Playing</div>
          <button 
            className="btn btn-ghost btn-xs text-xs opacity-60 hover:opacity-100"
            title="Keyboard shortcuts:&#10;• Space/K: Play/Pause&#10;• S: Stop&#10;• ←→: Seek ±5s&#10;• J/L: Seek ±10s&#10;• ,.: Seek ±1s&#10;• Shift+,: Seek back 0.5s ⬅️&#10;• Shift+.: Seek forward 0.5s ➡️&#10;• Ctrl+1-5: Play modes&#10;&#10;💡 Click CUE button to activate hotkeys for that deck"
          >
            ⌨️ Hotkeys
          </button>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={djMode} onChange={e => features.set('djMode', e.target.checked)} />
              DJ mode
            </label>
            {djMode && (
              <button 
                className="btn btn-sm"
                onClick={() => {
                  if (queue.length > 0) {
                    setQueueA([...queue])
                    setQueueB([...queue])
                    setQLabelsA({...qLabels})
                    setQLabelsB({...qLabels})
                    setToast({ 
                      type: 'success', 
                      text: `Loaded ${queue.length} tracks to both decks` 
                    })
                  } else {
                    setToast({ 
                      type: 'warning', 
                      text: 'No tracks to load. Add tracks from Library first.' 
                    })
                  }
                }}
                title="Load all tracks from main queue to both decks"
              >
                📂 Load All Tracks
              </button>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoDJ} onChange={e => features.set('autoDJ', e.target.checked)} />
              Auto-DJ
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={normalize} onChange={e => features.set('normalize', e.target.checked)} />
              Normalize
            </label>
            <label className="flex items-center gap-2">
              <span>Mode</span>
              <select 
                className="input" 
                value={playMode} 
                onChange={e => setPlayMode(e.target.value)}
                title="Playback mode (Ctrl+1-5 for quick switching)"
              >
                <option value="inOrder">🔄 In Order (Ctrl+1)</option>
                <option value="repeatAll">🔁 Repeat All (Ctrl+2)</option>
                <option value="repeatOne">🔂 Repeat One (Ctrl+3)</option>
                <option value="shuffle">🔀 Shuffle (Ctrl+4)</option>
                <option value="randomNoRepeat">🎲 Random (No Repeat) (Ctrl+5)</option>
              </select>
            </label>
          </div>
        </div>
        <Link className="btn" to="/">Library</Link>
      </div>

      {djMode ? (
        /* DJ Mode: Dual Player Setup */
        <>
        <DJDualPlayer
          deckA={{
            title: titleNow,
            artist: trackMeta?.artist,
            album: trackMeta?.album,
            position: position,
            duration: duration,
            isPlaying: isPlaying,
            volume: volume,
            cue: cueA,
            onCueToggle: () => toggleCue('A'),
            onPlayPause: () => {
              // For DJ mode, use deck-specific controls
              if (djMode) {
                if (!a1.current.src && queueA.length > 0) {
                  playTrackInDeck('A', currentIndexA)
                } else if (a1.current.paused) {
                  a1.current.play()
                  setIsPlaying(true)
                  startPosTimer()
                } else {
                  a1.current.pause()
                  setIsPlaying(false)
                }
              } else {
                onPlayPause()
              }
            },
            onStop: () => {
              if (djMode) {
                a1.current.pause()
                a1.current.currentTime = 0
                setIsPlaying(false)
                setPosition(0)
              } else {
                onStop()
              }
            },
            onSeek: onSeek,
            onVolumeChange: onVolumeChange
          }}
          deckB={{
            title: deckBMeta?.title || (queueB[currentIndexB] ? labelFor(qLabelsB[queueB[currentIndexB]], queueB[currentIndexB]) : 'No track loaded'),
            artist: deckBMeta?.artist,
            album: deckBMeta?.album,
            position: deckBPosition,
            duration: deckBDuration,
            isPlaying: deckBPlaying,
            volume: deckBVolume,
            cue: cueB,
            onCueToggle: () => toggleCue('B'),
            onPlayPause: onDeckBPlayPause,
            onStop: onDeckBStop,
            onSeek: onDeckBSeek,
            onVolumeChange: (vol) => {
              setDeckBVolume(vol)
              if (graph.current) {
                graph.current.setVolume('B', vol)
              }
            }
          }}
          crossfaderValue={djXfader}
          onCrossfaderChange={(value) => {
            setDjXfader(value)
            graph.current?.setCrossfader(value)
          }}
          onLoadTrackToDeck={(deckId) => {
            // Load the current track from main queue to the selected deck and play it
            if (queue.length > 0) {
              const currentTrack = queue[currentIndex]
              
              // Safety guard: Check if target deck is currently playing
              const isDeckAPlaying = isPlaying && a1.current?.src
              const isDeckBPlaying = deckBPlaying && a2.current?.src
              
              const executeLoad = () => {
                if (deckId === 'A') {
                  // Add to queue A if not already there
                  if (!queueA.includes(currentTrack)) {
                    setQueueA([...queueA, currentTrack])
                    setQLabelsA({...qLabelsA, [currentTrack]: qLabels[currentTrack]})
                    setCurrentIndexA(queueA.length) // Set to new index
                  } else {
                    setCurrentIndexA(queueA.indexOf(currentTrack))
                  }
                  // Load and play the track in Deck A
                  loadTrackToDeckA(currentTrack, true, true) // skipConfirmation = true
                  setToast({ 
                    type: 'success', 
                    text: `Playing "${labelFor(qLabels[currentTrack], currentTrack)}" in Deck ${deckId}` 
                  })
                } else {
                  // Add to queue B if not already there
                  if (!queueB.includes(currentTrack)) {
                    setQueueB([...queueB, currentTrack])
                    setQLabelsB({...qLabelsB, [currentTrack]: qLabels[currentTrack]})
                    setCurrentIndexB(queueB.length) // Set to new index
                  } else {
                    setCurrentIndexB(queueB.indexOf(currentTrack))
                  }
                  // Load and play the track in Deck B
                  loadTrackToDeckB(currentTrack, true, true) // skipConfirmation = true
                  setToast({ 
                    type: 'success', 
                    text: `Playing "${labelFor(qLabels[currentTrack], currentTrack)}" in Deck ${deckId}` 
                  })
                }
              }
              
              if (deckId === 'A' && isDeckAPlaying) {
                showConfirmDialog(
                  `⚠️ WARNING: Deck A is currently playing!\n\nLoading a new track will stop the current playback and could interrupt your mix.\n\nAre you sure you want to load "${labelFor(qLabels[currentTrack], currentTrack)}" to Deck A?`,
                  executeLoad
                )
                return
              } else if (deckId === 'B' && isDeckBPlaying) {
                showConfirmDialog(
                  `⚠️ WARNING: Deck B is currently playing!\n\nLoading a new track will stop the current playback and could interrupt your mix.\n\nAre you sure you want to load "${labelFor(qLabels[currentTrack], currentTrack)}" to Deck B?`,
                  executeLoad
                )
                return
              }
              
              // No warning needed - execute immediately
              executeLoad()
            } else {
              setToast({ 
                type: 'warning', 
                text: 'No track to load. Add tracks from Library first.' 
              })
            }
          }}
        />

        {/* Cue/Headphone Monitoring Controls */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Headphone Monitor</h3>
            <div className="text-sm opacity-70">
              Cue System for DJ Monitoring
            </div>
          </div>
          
          <div className="space-y-4">
            {/* Cue Mix Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Main Mix in Headphones</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={cueMixMain}
                    onChange={(e) => onCueMixChange(Number(e.target.value), undefined)}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{Math.round(cueMixMain * 100)}%</span>
                </div>
                <div className="text-xs opacity-60 mt-1">How much of the main mix you hear in headphones</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Cue Level in Headphones</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={cueMixCue}
                    onChange={(e) => onCueMixChange(undefined, Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm w-12 text-right">{Math.round(cueMixCue * 100)}%</span>
                </div>
                <div className="text-xs opacity-60 mt-1">How loud the cued tracks are in headphones</div>
              </div>
            </div>

            {/* Quick Cue Status */}
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg">
              <div className="text-sm font-medium">Currently Cueing:</div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${cueA ? 'bg-blue-500 text-white' : 'bg-white/10 opacity-50'}`}>
                  Deck A {cueA && '[CUE]'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${cueB ? 'bg-red-500 text-white' : 'bg-white/10 opacity-50'}`}>
                  Deck B {cueB && '[CUE]'}
                </span>
                {!cueA && !cueB && (
                  <span className="text-xs opacity-60">No decks cued - use CUE buttons on deck controls</span>
                )}
              </div>
            </div>

            {/* Help Text */}
            <div className="text-xs opacity-60 p-3 bg-blue-500/10 rounded-lg">
              <strong>How to use:</strong> Click CUE buttons on each deck to hear them in your headphones. 
              Adjust the mix to balance between the main output and cue signals. 
              Main mix lets you hear what the crowd hears, cue lets you preview/beatmatch the next track.
            </div>
          </div>
        </div>
        </>
      ) : (
        /* Single Player Mode */
        <>
          <div className="card space-y-3">
            <div className="text-sm opacity-80">Track</div>
            <div className="text-2xl font-semibold break-all">{titleNow}</div>
            <div className="opacity-70">{trackMeta?.album || ''}</div>
            
            {/* Play Mode Indicator */}
            <div className="text-xs opacity-60 flex items-center gap-2">
              <span>Mode:</span>
              <span 
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 cursor-help"
                title="Play modes: Ctrl+1 (In Order), Ctrl+2 (Repeat All), Ctrl+3 (Repeat One), Ctrl+4 (Shuffle), Ctrl+5 (Random)"
              >
                {playMode === 'inOrder' && '🔄 In Order'}
                {playMode === 'repeatAll' && '🔁 Repeat All'}
                {playMode === 'repeatOne' && '🔂 Repeat One'}
                {playMode === 'shuffle' && '🔀 Shuffle'}
                {playMode === 'randomNoRepeat' && '🎲 Random (No Repeat)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn" onClick={prev} title="Previous track">Prev</button>
              <button className="btn" onClick={onPlayPause} title="Play/Pause (Space or K)">{isPlaying ? 'Pause' : 'Play'}</button>
              <button className="btn" onClick={onStop} title="Stop (S)">Stop</button>
              <button className="btn" onClick={next} title="Next track">Next</button>

              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs opacity-70">{fmt(position)}</span>
                <input 
                  type="range" 
                  min="0" 
                  max={Math.max(0, Math.floor(duration))} 
                  step="1"
                  value={Math.min(Math.floor(position), Math.floor(duration))}
                  onChange={onSeek} 
                  style={{ width: 260 }}
                  title="Seek position (←→: ±5s, ,.: ±1s, J/L: ±10s)"
                />
                <span className="text-xs opacity-70">{fmt(duration)}</span>
              </div>

              <div className="flex items-center gap-2 ml-6">
                <button className="btn" onClick={onMuteToggle}>{muted ? 'Unmute' : 'Mute'}</button>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={onVolumeChange} style={{ width: 120 }} />
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-sm opacity-70">Crossfade (sec)</label>
                <input type="range" min="0" max="10" step="1" value={crossfadeSec}
                  onChange={e => setCrossfadeSec(Number(e.target.value))} disabled={!autoDJ} />
                <div className={autoDJ ? '' : 'opacity-50'}>{crossfadeSec}s</div>
              </div>
            </div>

            <div className="text-xs opacity-70">
              Auto-trim: +{(trackMeta?.startCut || 0).toFixed(2)}s / -{(trackMeta?.endCut || 0).toFixed(2)}s
            </div>
          </div>

          {/* Single Player EQ */}
          <Equalizer
            playerLabel="A"
            values={eqA}
            onChangeBand={(i, g) => { const next = [...eqA]; next[i] = g; setEqA(next); graph.current.setEqBand('A', i, g) }}
            onLoadPreset={(name) => { const preset = name in EQ_PRESETS ? [...EQ_PRESETS[name]] : new Array(16).fill(0); setEqA(preset); graph.current.setEq('A', preset) }}
          />
        </>
      )}

      {/* EQs for DJ Mode */}
      {djMode && (
        <div className="space-y-4">
          <Equalizer
            playerLabel="A"
            values={eqA}
            onChangeBand={(i, g) => { const next = [...eqA]; next[i] = g; setEqA(next); graph.current.setEqBand('A', i, g) }}
            onLoadPreset={(name) => { const preset = name in EQ_PRESETS ? [...EQ_PRESETS[name]] : new Array(16).fill(0); setEqA(preset); graph.current.setEq('A', preset) }}
          />
          <Equalizer
            playerLabel="B"
            values={eqB}
            onChangeBand={(i, g) => { const next = [...eqB]; next[i] = g; setEqB(next); graph.current.setEqBand('B', i, g) }}
            onLoadPreset={(name) => { const preset = name in EQ_PRESETS ? [...EQ_PRESETS[name]] : new Array(16).fill(0); setEqB(preset); graph.current.setEq('B', preset) }}
            defaultCollapsed
          />
        </div>
      )}

      {/* Layer Remover */}
      <LayerRemover
        currentTrack={trackMeta}
        audioElement={getActive()}
      />

      {/* Auto DJ Intelligence Panel */}
      {autoDJ && (
        <AutoDJPanel
          trackLibrary={queue.map(path => qLabels[path]).filter(Boolean)}
          currentTrack={trackMeta}
          onTrackChange={(track) => {
            // Find the track in the queue and play it
            const trackIndex = queue.findIndex(path => {
              const label = qLabels[path];
              return label?.title === track.title && label?.artist === track.artist;
            });
            
            if (trackIndex !== -1) {
              setCurrentIndex(trackIndex);
              if (djMode) {
                // In DJ mode, load to the next available deck
                const isDeckAPlaying = isPlaying && a1.current?.src;
                const isDeckBPlaying = deckBPlaying && a2.current?.src;
                
                if (!isDeckBPlaying) {
                  loadTrackToDeckB(queue[trackIndex], false, true);
                } else if (!isDeckAPlaying) {
                  loadTrackToDeckA(queue[trackIndex], false, true);
                } else {
                  // Both decks playing, queue for crossfade
                  setToast({
                    type: 'info',
                    text: 'Auto DJ transition ready - use crossfader to mix'
                  });
                }
              } else {
                // Single player mode - just play the track
                play(queue[trackIndex]);
              }
            }
          }}
        />
      )}

      {/* Queue Section */}
      {djMode ? (
        /* DJ Mode: Dual Queues */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DeckQueue
            deckId="A"
            queue={queueA}
            currentIndex={currentIndexA}
            labels={qLabelsA}
            onPlayTrack={(idx) => playTrackInDeck('A', idx)}
            onRemoveTrack={(idx) => removeTrackFromDeck('A', idx)}
            onMoveTrack={(from, to) => moveTrackInDeck('A', from, to)}
            onClearQueue={() => clearDeckQueue('A')}
            accentColor="blue"
          />
          <DeckQueue
            deckId="B"
            queue={queueB}
            currentIndex={currentIndexB}
            labels={qLabelsB}
            onPlayTrack={(idx) => playTrackInDeck('B', idx)}
            onRemoveTrack={(idx) => removeTrackFromDeck('B', idx)}
            onMoveTrack={(from, to) => moveTrackInDeck('B', from, to)}
            onClearQueue={() => clearDeckQueue('B')}
            accentColor="red"
          />
        </div>
      ) : (
        /* Single Player Mode: Original Queue */
        <div className="card">
          <div className="font-medium mb-2">Queue</div>
          <div className="max-h-[40vh] overflow-auto space-y-1">
            {(() => {
              // Show next 3 songs in queue
              const upcomingSongs = [];
              for (let i = 1; i <= 3; i++) {
                const nextIdx = currentIndex + i;
                if (nextIdx < queue.length) {
                  upcomingSongs.push({ path: queue[nextIdx], queueIndex: nextIdx, displayIndex: i });
                }
              }
              
              if (upcomingSongs.length === 0) {
                return (
                  <div className="p-2 text-zinc-500 text-sm italic">
                    No upcoming songs
                  </div>
                );
              }
              
              return upcomingSongs.map(({ path, queueIndex, displayIndex }) => {
                const label = qLabels[path]?.label || fileBase(path);
                return (
                  <div
                    key={queueIndex}
                    className="p-2 rounded-xl flex items-center justify-between cursor-pointer bg-white/5 hover:bg-white/10"
                    title={path}
                    onClick={() => onRowClick(queueIndex)}
                    onContextMenu={(e) => openMenuAt(e, queueIndex)}
                  >
                    <div className="truncate flex-1 mr-3">{label}</div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-xs opacity-70">#{displayIndex}</div>
                      <button
                        className="btn btn-ghost btn-xs"
                        aria-label="Row menu"
                        onClick={(e) => openMenuAt(e, queueIndex)}
                        onContextMenu={(e) => openMenuAt(e, queueIndex)}
                      >
                        ⋯
                      </button>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Portaled context menu */}
      {menu.open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={closeMenu}
            onContextMenu={(e) => { e.preventDefault(); closeMenu() }}
          />
          <div
            style={{
              position: 'fixed',
              left: menu.x,
              top: menu.y,
              zIndex: 9999,
              background: 'rgba(20,20,20,0.98)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 8,
              minWidth: 180,
              maxWidth: 240,
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => { 
              closeMenu(); 
              if (startInProgress.current) {
                console.log('🛑 [context menu] Blocked - start already in progress');
                return;
              }
              startInProgress.current = true;
              start(menu.idx).finally(() => {
                setTimeout(() => {
                  startInProgress.current = false;
                }, 500);
              });
            }}>▶ Play now</MenuItem>
            <MenuItem onClick={() => { closeMenu(); playNextAt(menu.idx) }}>⏭ Play next</MenuItem>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: 0 }} />
            <MenuItem onClick={() => { closeMenu(); moveUpAt(menu.idx) }} disabled={menu.idx <= 0}>↑ Move up</MenuItem>
            <MenuItem onClick={() => { closeMenu(); moveDownAt(menu.idx) }} disabled={menu.idx >= queue.length - 1}>↓ Move down</MenuItem>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: 0 }} />
            
            {/* Add to Playlist submenu */}
            {playlists.length > 0 && (
              <>
                <div className="text-zinc-400 text-xs px-3 py-1">Add to Playlist:</div>
                {playlists.map((playlist) => (
                  <MenuItem 
                    key={playlist.id} 
                    onClick={() => addToPlaylist(playlist.id, queue[menu.idx])}
                  >
                    📋 {playlist.name}
                  </MenuItem>
                ))}
                <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: 0 }} />
              </>
            )}
            
            <MenuItem onClick={() => { closeMenu(); removeAt(menu.idx) }} danger>✖ Remove</MenuItem>
          </div>
        </>,
        document.body
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md mx-4 border border-zinc-700">
            <div className="text-zinc-100 whitespace-pre-line mb-6">
              {confirmDialog.message}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                className="btn bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                className="btn bg-red-600 hover:bg-red-500 text-white"
                onClick={() => {
                  confirmDialog.onConfirm()
                  setConfirmDialog(null)
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
