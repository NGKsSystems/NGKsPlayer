/**
 * Utility functions for NowPlaying component
 */

// Time formatting
export const fmt = (s = 0) => {
  if (!isFinite(s)) return '--:--'
  const m = Math.floor(s / 60)
  const ss = Math.floor(s % 60)
  return `${m}:${ss.toString().padStart(2, '0')}`
}

// Audio utilities
export const dbToAmp = (db) => Math.pow(10, db / 20)

// File utilities
export const fileBase = (p = '') => (p.split(/[\\/]/).pop() || '').replace(/\.[^/.]+$/, '')

// Label generation
export const labelFor = (meta, path) => {
  return meta?.title || meta?.name || fileBase(path) || 'Unknown Track'
}

// Math utilities
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

// Array utilities
export const moveItem = (arr, from, to) => { 
  const a = arr.slice()
  const [x] = a.splice(from, 1)
  a.splice(to, 0, x)
  return a
}

// Local storage wrapper
export const ls = {
  get: (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def } catch { return def } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
}

// Session storage wrapper
export const ss = {
  get: (k, def) => { try { return JSON.parse(sessionStorage.getItem(k)) ?? def } catch { return def } },
  set: (k, v) => sessionStorage.setItem(k, JSON.stringify(v))
}
