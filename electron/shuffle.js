import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

// Avoid repeats from the last K plays and penalize very recent tracks.
// Also softly encourage same-artist/album blocks to feel "DJ-curated".
export function getSmartNext(currentPath){
  const dbPath = path.join(app.getPath('userData'),'library.sqlite')
  const db = new Database(dbPath)
  const tracks = db.prepare('SELECT filePath, artist, album FROM tracks').all()
  const recent = db.prepare('SELECT filePath FROM play_history ORDER BY playedAt DESC LIMIT 50').all()
  const recentSet = new Set(recent.map(r=>r.filePath))

  // Base score plus freshness and variety
  const scored = tracks.map(t => {
    let score = Math.random() // small randomization for variety
    if (!recentSet.has(t.filePath)) score += 1.5 // prefer not recently played
    if (currentPath){
      const cur = db.prepare('SELECT artist, album FROM tracks WHERE filePath=?').get(currentPath)
      if (cur && (t.artist === cur.artist || t.album === cur.album)) score += 0.25 // mild cohesion
    }
    if (t.filePath === currentPath) score = -999 // never pick same track
    return { ...t, score }
  })
  scored.sort((a,b)=>b.score - a.score)
  const next = scored[0]
  if (!next) return null
  // record play
  db.prepare('INSERT INTO play_history (filePath, playedAt) VALUES (?,?)').run(next.filePath, Date.now())
  return next.filePath
}

export function markPlayed(filePath){
  const dbPath = path.join(app.getPath('userData'),'library.sqlite')
  const db = new Database(dbPath)
  db.prepare('INSERT INTO play_history (filePath, playedAt) VALUES (?,?)').run(filePath, Date.now())
}
