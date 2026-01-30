// Script to scan real audio files into the database
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

async function scanRealFiles() {
  console.log('Scanning real audio files into database...');
  
  const dbPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'ngksplayer', 'library.db');
  console.log('Using database:', dbPath);
  
  const db = new Database(dbPath);
  
  // Get real audio files
  const testDir = path.join(__dirname, 'test-music-files');
  const files = fs.readdirSync(testDir).filter(f => f.endsWith('.mp3'));
  
  console.log('Found files:', files);
  
  for (const file of files) {
    const fullPath = path.join(testDir, file);
    console.log(`Adding: ${fullPath}`);
    
    // Remove existing entry if it exists
    const deleteStmt = db.prepare('DELETE FROM tracks WHERE path = ?');
    deleteStmt.run(fullPath);
    
    // Add new entry
    const insertStmt = db.prepare(`
      INSERT INTO tracks (
        path, title, artist, album, genre, year, duration, 
        bpm, bpmConfidence, key, keyConfidence, camelotKey, energy,
        analyzed, analyzedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const title = file.replace('.mp3', '');
    const parts = title.split(' - ');
    const artist = parts[0] || 'Unknown Artist';
    const songTitle = parts[1] || title;
    
    insertStmt.run(
      fullPath,
      songTitle,
      artist,
      'Test Album',
      'Rock',
      2023,
      240, // duration
      0, 0, '', 0, '', 0, // analysis data (will be filled by real analysis)
      false, // not analyzed yet
      null
    );
    
    console.log(`Added: ${artist} - ${songTitle}`);
  }
  
  db.close();
  console.log('Database updated with real files!');
}

scanRealFiles().catch(console.error);
