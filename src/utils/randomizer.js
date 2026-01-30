// Centralized randomizer utilities for NowPlaying components
const safeLs = {
  get(k, def = null) {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def } catch { return def }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
}

const bagKey = (q) => 'ngks:bag:v1:' + (q && q.length ? q.join('|') : 'empty')
const cacheKey = (q) => 'ngks:cache:v1:' + (q && q.length ? q.join('|') : 'empty')

function readBag(q) {
  if (!q || !q.length) return []
  const k = bagKey(q)
  const v = safeLs.get(k, null)
  return Array.isArray(v) ? v : []
}

function writeBag(q, bag) {
  const k = bagKey(q)
  safeLs.set(k, bag)
}

function getCachedNext(q) {
  if (!q || !q.length) return null
  const v = safeLs.get(cacheKey(q), null)
  return typeof v === 'number' ? v : null
}

function setCachedNext(q, idx) {
  if (!q || !q.length) return
  safeLs.set(cacheKey(q), Number(idx))
}

function clearCachedNext(q) {
  if (!q || !q.length) return
  safeLs.set(cacheKey(q), null)
}

function pickNextIndex(mode, q, curIdx, { mutate = true } = {}) {
  if (!q || !q.length) return 0
  if (mode === 'stop') return curIdx // In stop mode, stay on current track
  if (mode === 'inOrder') return (curIdx + 1) % q.length
  if (mode === 'repeatAll') return (curIdx + 1) % q.length

  if (mode === 'shuffle') {
    if (q.length === 1) return curIdx
    let r; do { r = Math.floor(Math.random() * q.length) } while (r === curIdx)
    return r
  }

  if (mode === 'randomNoRepeat') {
    let bag = readBag(q)
    if (!bag.length) {
      bag = [...Array(q.length).keys()]
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] }
    }

    if (!mutate) {
      for (let i = bag.length - 1; i >= 0; i--) {
        const idx = bag[i]
        if (idx !== curIdx) return idx
      }
      return (curIdx + 1) % q.length
    }

    while (bag.length) {
      const idx = bag.pop()
      if (idx !== curIdx) { writeBag(q, bag); return idx }
    }
    return (curIdx + 1) % q.length
  }

  // Fallback: simple next
  return (curIdx + 1) % q.length
}

function pickPrevIndex(mode, q, curIdx) {
  if (!q || !q.length) return 0
  if (mode === 'inOrder' || mode === 'repeatAll') return curIdx === 0 ? q.length - 1 : curIdx - 1
  if (mode === 'shuffle' || mode === 'randomNoRepeat') return curIdx === 0 ? q.length - 1 : curIdx - 1
  return curIdx === 0 ? q.length - 1 : curIdx - 1
}

export { pickNextIndex, pickPrevIndex, readBag, writeBag, bagKey, cacheKey, getCachedNext, setCachedNext, clearCachedNext }
