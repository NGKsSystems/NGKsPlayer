export function initDb(db){
  db.exec(`CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY,
    filePath TEXT UNIQUE,
    title TEXT,
    artist TEXT,
    album TEXT,
    genre TEXT,
    duration REAL,
    trackNo INTEGER,
    year TEXT,
    startCut REAL DEFAULT 0,
    endCut REAL DEFAULT 0,
    hasPlaybackError INTEGER DEFAULT 0
  )`)
  db.exec(`CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY,
    filePath TEXT,
    playedAt INTEGER
  )`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_history_path_time ON play_history(filePath, playedAt)`)
}
