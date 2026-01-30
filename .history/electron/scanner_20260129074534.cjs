const fs = require('fs')
const path = require('path')
const Store = require('electron-store')

const store = new Store()
const AUDIO_EXT = new Set(['.mp3','.m4a','.flac','.wav','.aac','.ogg','.opus'])

async function scanFolder(db, folderPath){
  console.log(`Starting scan of ${folderPath}`)
  const { parseFile } = await import('music-metadata')
  const files = []
  function walk(dir){
    console.log(`Walking ${dir}`)
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    console.log(`Found ${entries.length} entries in ${dir}`)
    for (const entry of entries){
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        console.log(`Entering directory ${full}`)
        walk(full)
      } else {
        console.log(`Found file ${full}`)
        files.push(full)
      }
    }
  }
  walk(folderPath)
  console.log(`Total files found: ${files.length}`)
  console.log(`Found ${files.length} files in ${folderPath}`)
  const upsert = db.prepare(`INSERT INTO tracks (filePath, title, artist, album, genre, duration, trackNo, year, analyzed)
    VALUES (@filePath,@title,@artist,@album,@genre,@duration,@trackNo,@year,@analyzed)
    ON CONFLICT(filePath) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album,
      genre=excluded.genre, duration=excluded.duration, trackNo=excluded.trackNo, year=excluded.year, analyzed=excluded.analyzed`)

  let added = 0
  let audioCount = 0
  for (const f of files){
    const ext = path.extname(f).toLowerCase()
    // console.log(`Checking file ${f}, ext: ${ext}`)
    if (!AUDIO_EXT.has(ext)) {
      // console.log(`Skipping ${f}, not audio`)
      continue
    }
    audioCount++
    let meta
    try{
      meta = await parseFile(f)
      // console.log('Parsed metadata for', f)
    }catch(e){ 
      console.error('Error parsing file:', f, e.message)
      continue
    }
    const common = meta.common || {}
    const format = meta.format || {}
    try{
      // console.log('About to upsert', f)
      upsert.run({
        filePath: path.normalize(f),
        title: path.basename(f, path.extname(f)), // Use filename without extension instead of metadata
        artist: (common.artist || 'Unknown').trim(),
        album: (common.album || 'Unknown').trim(),
        genre: (Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || '')),
        duration: format.duration || 0,
        trackNo: (common.track && common.track.no) || null,
        year: common.year ? String(common.year) : null,
        analyzed: 0, // Mark as unanalyzed
      })
      // console.log('Upsert successful', f)
      added++
    }catch(e){ 
      console.error('Error upserting file:', f, e.message)
    }
  }
  console.log(`Processed ${audioCount} audio files, added ${added}`)
  return { added }
}

module.exports = { scanFolder }
