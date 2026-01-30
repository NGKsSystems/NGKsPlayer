// Quick script to scan the user's music directory and add to database
const path = require('path');
const Database = require('better-sqlite3');

async function scanMusicDir() {
  console.log('Scanning music directory...');
  
  // Open the database
  const dbPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'ngksplayer', 'library.db');
  console.log('Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  // Import the scanner
  const { scanFolder } = require('./electron/scanner.cjs');
  
  // Scan the music directory
  const musicDir = path.join('C:', 'Users', 'suppo', 'Music');
  console.log('Scanning:', musicDir);
  
  try {
    await scanFolder(db, musicDir);
    console.log('✓ Music directory scanned successfully');
    
    // Show what tracks were found
    const tracks = db.prepare('SELECT * FROM tracks ORDER BY artist, title LIMIT 10').all();
    console.log(`Found ${tracks.length} tracks (showing first 10):`);
    tracks.forEach(track => {
      console.log(`- ${track.artist} - ${track.title} (${track.filePath})`);
    });
    
  } catch (error) {
    console.error('Scan failed:', error);
  } finally {
    db.close();
  }
}

scanMusicDir().catch(console.error);
