import path from 'path'
import nodeID3 from 'node-id3'
import * as mm from 'music-metadata'
import Database from 'better-sqlite3'
import { app } from 'electron'

export async function getTags(filePath){
  const meta = await mm.parseFile(filePath)
  const c = meta.common
  return {
    title: c.title || '',
    artist: c.artist || '',
    album: c.album || '',
    genre: Array.isArray(c.genre) ? c.genre.join(', ') : (c.genre || ''),
    year: c.year ? String(c.year) : '',
    trackNo: c.track && c.track.no ? String(c.track.no) : ''
  }
}

export async function writeTags(filePath, tags){
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.mp3'){
    const ok = nodeID3.update({
      title: tags.title,
      artist: tags.artist,
      album: tags.album,
      genre: tags.genre,
      year: tags.year,
      trackNumber: tags.trackNo
    }, filePath)
    if (!ok) throw new Error('Failed to write ID3 tags')
    // Update DB record so UI reflects immediately
    const db = new Database(path.join(app.getPath('userData'),'library.sqlite'))
    db.prepare(`UPDATE tracks SET title=?, artist=?, album=?, genre=?, year=? WHERE filePath=?`)
      .run(tags.title, tags.artist, tags.album, tags.genre, tags.year, filePath)
    return { ok: true }
  }
  throw new Error('Tag writing only supported for MP3 in this version')
}
