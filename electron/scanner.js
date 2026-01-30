const fs = require('fs')
const path = require('path')
const mm = require('music-metadata')
const Store = require('electron-store')
const { analyzeSilence } = require('./silence.cjs')

const store = new Store()
const AUDIO_EXT = new Set(['.mp3','.m4a','.flac','.wav','.aac','.ogg','.opus'])

async function scanFolder(db, folderPath){
  const files = []
  function walk(dir){
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })){
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else files.push(full)
    }
  }
  walk(folderPath)
  const upsert = db.prepare(`INSERT INTO tracks (filePath, title, artist, album, genre, duration, trackNo, year, startCut, endCut)
    VALUES (@filePath,@title,@artist,@album,@genre,@duration,@trackNo,@year,@startCut,@endCut)
    ON CONFLICT(filePath) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album,
      genre=excluded.genre, duration=excluded.duration, trackNo=excluded.trackNo, year=excluded.year,
      startCut=excluded.startCut, endCut=excluded.endCut`)

  let added = 0
  const doTrim = store.get('settings.autoTrim', true)
  for (const f of files){
    const ext = path.extname(f).toLowerCase()
    if (!AUDIO_EXT.has(ext)) continue
    try{
      const meta = await mm.parseFile(f)
      const common = meta.common || {}
      const format = meta.format || {}
      let startCut = 0, endCut = 0
      if (doTrim) {
        const res = await analyzeSilence(f, format.duration || 0)
        startCut = res.startCut || 0
        endCut = res.endCut || 0
      }
      upsert.run({
        filePath: f,
        title: common.title || path.basename(f),
        artist: (common.artist || 'Unknown').trim(),
        album: (common.album || 'Unknown').trim(),
        genre: (Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || '')),
        duration: format.duration || 0,
        trackNo: (common.track && common.track.no) || null,
        year: common.year ? String(common.year) : null,
        startCut, endCut
      })
      added++
    }catch(e){ /* ignore individual file errors */ }
  }
  return { added }
}

module.exports = { scanFolder }
