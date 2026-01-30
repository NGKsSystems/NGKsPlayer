import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { Toast } from '../components/Toast.jsx'
import { toLocal } from '../utils/paths'
import { AudioGraph, EQ_PRESETS } from '../audio/graph'
import Equalizer from '../components/Equalizer.jsx'
import { analyzeLoudnessFromArrayBuffer } from '../analysis/loudness'
import { useFeature, features } from '../state/features'
import { pickNextIndex, getCachedNext, setCachedNext, clearCachedNext } from '../utils/randomizer'

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

export default function NowPlaying() {
  // Feature switches
  const [djMode] = useFeature('djMode')
  const [autoDJ] = useFeature('autoDJ')
  const [normalize] = useFeature('normalize')
  const [playMode, setPlayMode] = useFeature('playMode') // 'inOrder' | 'shuffle' | 'randomNoRepeat'

  // Queue + labels
  const [queue, setQueue] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [qLabels, setQLabels] = useState({})
  const [nextTrackInfo, setNextTrackInfo] = useState(null)
  const [cachedNextIndex, setCachedNextIndex] = useState(null)

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

  const getActive = () => (active.current === 1 ? a1.current : a2.current)
  const getInactive = () => (active.current === 1 ? a2.current : a1.current)

  // Context menu
  const [menu, setMenu] = useState({ open: false, x: 0, y: 0, idx: -1 })
  const openMenuAt = (evt, idx) => {
    evt?.preventDefault?.(); evt?.stopPropagation?.()
    const ne = evt?.nativeEvent ?? evt
    let x = ne?.pageX, y = ne?.pageY
    if (x == null || y == null) {
      const r = evt.currentTarget.getBoundingClientRect()
      x = r.left + r.width - 8 + window.scrollX
      y = r.top + r.height + 8 + window.scrollY
    }
    setMenu({ open: true, x: x ?? 24, y: y ?? 24, idx })
  }
  const closeMenu = () => setMenu({ open: false, x: 0, y: 0, idx: -1 })

  // Play-mode helpers are centralized in src/utils/randomizer to avoid
  // duplicated logic and ensure consistent peek/consume semantics.

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
  useEffect(() => {
    // Clear any authoritative cache when the queue or playMode changes
    setCachedNextIndex(null)
    setNextTrackInfo(null)
    try { clearCachedNext(queue) } catch (e) {}
  }, [playMode, queue])

  const getNextTrack = () => {
    if (!queue || queue.length < 2) return null
    let nextIndex
      if (cachedNextIndex !== null) {
      nextIndex = cachedNextIndex
    } else {
      // try shared localStorage cache first (cross-component)
      try {
        const v = getCachedNext(queue)
        if (v !== null) {
          nextIndex = v
          setCachedNextIndex(nextIndex)
        }
      } catch (e) { /* ignore */ }
      if (nextIndex == null) {
    } else {
      if (playMode === 'shuffle' || playMode === 'randomNoRepeat') {
        // For random modes, pre-calc the actual next and cache it so the
        // UI preview matches playback
        nextIndex = pickNextIndex(playMode, queue, currentIndex)
        setCachedNextIndex(nextIndex)
        setNextTrackInfo(queue[nextIndex])
        try { setCachedNext(queue, nextIndex) } catch (e) {}
      } else {
        // Non-random modes: peek without mutating global bag
        nextIndex = pickNextIndex(playMode, queue, currentIndex, { mutate: false })
        setNextTrackInfo(queue[nextIndex])
      }
    }
    return queue[nextIndex]
  }
    const q = ls.get('playQueue', [])
    const idx = Number(localStorage.getItem('playIndex') || 0)
    setQueue(q)
    setCurrentIndex(idx)

    graph.current = new AudioGraph()
    graph.current.attachMediaElements(a1.current, a2.current)
    graph.current.setEq('A', eqA)
    graph.current.setEq('B', eqB)
    graph.current.setCrossfader(djXfader, false)
    graph.current.setVolume('A', muted ? 0 : volume, false)
    graph.current.setVolume('B', muted ? 0 : volume, false)

    a1.current.volume = 1
    a2.current.volume = 1
  }, [])

  useEffect(() => { ls.set('playQueue', queue) }, [queue])

  useEffect(() => {
    if (!queue.length) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(queue.map(async p => {
        try { const m = await window.api.getTrackByPath(p); return [p, { label: labelFor(m, p) }] }
        catch { return [p, { label: fileBase(p) }] }
      }))
      if (!cancelled) setQLabels(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [queue])

  useEffect(() => {
    if (queue.length) start(currentIndex)
    // Ensure Up Next preview is calculated when queue/currentIndex/playMode changes.
    // For random modes this will pre-calc and cache the authoritative next index.
    if (queue.length > 1) getNextTrack()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue])

  // Also watch index/playMode so Up Next is kept up-to-date for previews
  useEffect(() => {
    if (queue.length > 1) getNextTrack()
  }, [currentIndex, playMode, queue])

  useEffect(() => () => {
    timers.current.forEach(t => clearTimeout(t))
    if (posTimer.current) clearInterval(posTimer.current)
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
    try {
      timers.current.forEach(t => clearTimeout(t)); timers.current = []
      if (posTimer.current) clearInterval(posTimer.current)

      const bounded = clamp(idx, 0, Math.max(0, queue.length - 1))
      setCurrentIndex(bounded)
      localStorage.setItem('playIndex', String(bounded))

      const path = queue[bounded]
      if (!path) return

      const info = await window.api.getTrackByPath(path)
      setTrackMeta(info)

      const startCut = info?.startCut || 0
      const pregainDb = normalize ? (info?.pregainDb || 0) : 0
      const isA = (active.current === 1)

      const preIn = isA ? graph.current.chainA.preIn : graph.current.chainB.preIn
      preIn.gain.value = dbToAmp(pregainDb)
      if (normalize && (!('pregainDb' in info) || info.pregainDb === 0)) {
        ensurePregain(path, isA ? 'A' : 'B')
      }

      const A = getActive()
      A.src = toLocal(path)
      await graph.current.resume()

      A.onloadedmetadata = () => {
        const d = Number.isFinite(A.duration) ? A.duration : (info?.duration || 0)
        setDuration(d)
        A.currentTime = startCut
        A.play()
          .then(() => { setIsPlaying(true); setPosition(A.currentTime || 0); startPosTimer(); scheduleAutoNext() })
          .catch(err => setToast({ type: 'danger', message: 'Playback failed: ' + err.message }))
      }

      A.onpause = () => setIsPlaying(false)
      A.onplay = () => setIsPlaying(true)
    } catch (e) {
      setToast({ type: 'danger', message: e.message })
    }
  }

  async function next() {
    if (fading.current) return
    try {
      const curIdx = currentIndex
      // If a UI preview or earlier calculation cached a next index, use it
      // as authoritative for playback. This ensures "Up Next" equals the
      // actual next track for random modes.
      let nextIdx
      if (cachedNextIndex !== null) {
        nextIdx = cachedNextIndex
        setCachedNextIndex(null)
        try { clearCachedNext(queue) } catch (e) {}
      } else {
        nextIdx = pickNextIndex(playMode, queue, curIdx)
      }
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
            // Ensure UI state cleared once we move to the next track
            setNextTrackInfo(null)
              // Ensure UI state cleared once we move to the next track
              setNextTrackInfo(null)
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
    const pi = currentIndex === 0 ? queue.length - 1 : currentIndex - 1
    start(pi)
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
  const onRowClick = (idx) => start(idx)

  const playNowAt = (idx) => { closeMenu(); start(idx) }
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
      // When removing the current track we only want to preview the next
      // candidate — do a non-destructive peek so we don't mutate any
      // randomNoRepeat bag state used by playback.
      const nextIdx = pickNextIndex(playMode, queue, currentIndex, { mutate: false })
      const nextPath = queue[nextIdx]
      const newQ = queue.filter((_, i) => i !== idx)
      setQueue(newQ)
      if (newQ.length === 0) {
        onStop()
        setCurrentIndex(0)
        return
      }
      const mapped = newQ.indexOf(nextPath)
      start(mapped >= 0 ? mapped : 0)
    } else {
      const shift = idx < currentIndex ? -1 : 0
      const newQ = queue.filter((_, i) => i !== idx)
      setQueue(newQ)
      setCurrentIndex(clamp(currentIndex + shift, 0, Math.max(0, newQ.length - 1)))
    }
  }
  const moveUpAt = (idx) => { closeMenu(); if (idx <= 0) return; const n = moveItem(queue, idx, idx - 1); setQueue(n); if (currentIndex === idx) setCurrentIndex(idx - 1); else if (currentIndex === idx - 1) setCurrentIndex(idx) }
  const moveDownAt = (idx) => { closeMenu(); if (idx >= queue.length - 1) return; const n = moveItem(queue, idx, idx + 1); setQueue(n); if (currentIndex === idx) setCurrentIndex(idx + 1); else if (currentIndex === idx + 1) setCurrentIndex(idx) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-3">
          <div className="text-xl font-semibold">Now Playing</div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={djMode} onChange={e => features.set('djMode', e.target.checked)} />
              DJ mode
            </label>
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
              <select className="input" value={playMode} onChange={e => setPlayMode(e.target.value)}>
                <option value="inOrder">In order</option>
                <option value="shuffle">Shuffle</option>
                <option value="randomNoRepeat">Random (no repeat)</option>
              </select>
            </label>
          </div>
        </div>
        <Link className="btn" to="/">Library</Link>
      </div>

      <div className="card space-y-3">
        <div className="text-sm opacity-80">Track</div>
        <div className="text-2xl font-semibold break-all">{titleNow}</div>
        <div className="opacity-70">{trackMeta?.album || ''}</div>

        {/* Up Next preview */}
        {nextTrackInfo && (
          <div className="mt-3 p-3 bg-white/2 rounded-lg">
            <div className="text-xs opacity-70">Up Next</div>
            <div className="font-medium">{labelFor(undefined, nextTrackInfo) || nextTrackInfo}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={prev}>Prev</button>
          <button className="btn" onClick={onPlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
          <button className="btn" onClick={onStop}>Stop</button>
          <button className="btn" onClick={next}>Next</button>

          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs opacity-70">{fmt(position)}</span>
            <input type="range" min="0" max={Math.max(0, Math.floor(duration))} step="1"
              value={Math.min(Math.floor(position), Math.floor(duration))}
              onChange={onSeek} style={{ width: 260 }} />
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

        {djMode && (
          <div className="flex items-center gap-3">
            <label className="text-sm opacity-70">A ↔ B</label>
            <input type="range" min="0" max="1" step="0.01" value={djXfader}
              onChange={e => { const x = Number(e.target.value); setDjXfader(x); graph.current.setCrossfader(x) }}
              style={{ width: 260 }} />
          </div>
        )}

        <div className="text-xs opacity-70">
          Auto-trim: +{(trackMeta?.startCut || 0).toFixed(2)}s / -{(trackMeta?.endCut || 0).toFixed(2)}s
        </div>
      </div>

      {/* EQs */}
      <Equalizer
        playerLabel="A"
        values={eqA}
        onChangeBand={(i, g) => { const next = [...eqA]; next[i] = g; setEqA(next); graph.current.setEqBand('A', i, g) }}
        onLoadPreset={(name) => { const preset = name in EQ_PRESETS ? [...EQ_PRESETS[name]] : new Array(16).fill(0); setEqA(preset); graph.current.setEq('A', preset) }}
      />
      {djMode && (
        <Equalizer
          playerLabel="B"
          values={eqB}
          onChangeBand={(i, g) => { const next = [...eqB]; next[i] = g; setEqB(next); graph.current.setEqBand('B', i, g) }}
          onLoadPreset={(name) => { const preset = name in EQ_PRESETS ? [...EQ_PRESETS[name]] : new Array(16).fill(0); setEqB(preset); graph.current.setEq('B', preset) }}
          defaultCollapsed
        />
      )}

      {/* Queue */}
      <div className="card">
        <div className="font-medium mb-2">Queue</div>
        <div className="max-h-[40vh] overflow-auto space-y-1">
          {queue.map((p, i) => {
            const label = qLabels[p]?.label || fileBase(p)
            const isCur = i === currentIndex
            return (
              <div
                key={i}
                className={
                  'p-2 rounded-xl flex items-center justify-between cursor-pointer ' +
                  (isCur ? 'bg-brand-accent/30' : 'bg-white/5')
                }
                title={p}
                onClick={() => onRowClick(i)}
                onContextMenu={(e) => openMenuAt(e, i)}
              >
                <div className="truncate">{label}</div>
                <div className="flex items-center gap-2">
                  {isCur && <div className="text-xs opacity-70">Now</div>}
                  <button
                    className="btn btn-ghost btn-xs"
                    aria-label="Row menu"
                    onClick={(e) => openMenuAt(e, i)}
                    onContextMenu={(e) => openMenuAt(e, i)}
                  >
                    ⋯
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <MenuItem onClick={() => { closeMenu(); start(menu.idx) }}>▶ Play now</MenuItem>
            <MenuItem onClick={() => { closeMenu(); playNextAt(menu.idx) }}>⏭ Play next</MenuItem>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: 0 }} />
            <MenuItem onClick={() => { closeMenu(); moveUpAt(menu.idx) }} disabled={menu.idx <= 0}>↑ Move up</MenuItem>
            <MenuItem onClick={() => { closeMenu(); moveDownAt(menu.idx) }} disabled={menu.idx >= queue.length - 1}>↓ Move down</MenuItem>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.12)', margin: 0 }} />
            <MenuItem onClick={() => { closeMenu(); removeAt(menu.idx) }} danger>✖ Remove</MenuItem>
          </div>
        </>,
        document.body
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}
