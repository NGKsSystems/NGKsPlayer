// Script to fix database file paths to point to the correct music directory
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

async function fixDatabasePaths() {
  console.log('Fixing database file paths...');
  
  // Open the database
  const dbPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'ngksplayer', 'library.db');
  console.log('Database path:', dbPath);
  
  if (!fs.existsSync(dbPath)) {
    console.error('Database not found:', dbPath);
    return;
  }
  
  const db = new Database(dbPath);
  
  try {
    // Get all tracks
    const tracks = db.prepare('SELECT * FROM tracks').all();
    console.log(`Found ${tracks.length} tracks in database`);
    
    const updateStmt = db.prepare('UPDATE tracks SET filePath = ? WHERE id = ?');
    let updated = 0;
    
    for (const track of tracks) {
      const fileName = path.basename(track.filePath);
      const newPath = path.join('C:', 'Users', 'suppo', 'Music', fileName);
      
      // Check if the file exists in the music directory
      if (fs.existsSync(newPath)) {
        updateStmt.run(newPath, track.id);
        updated++;
        console.log(`✓ Updated: ${fileName} -> ${newPath}`);
      } else {
        console.log(`⚠ Not found in music dir: ${fileName}`);
      }
    }
    
    console.log(`Updated ${updated} out of ${tracks.length} track paths`);
    
    // Show some examples
    const updatedTracks = db.prepare('SELECT * FROM tracks LIMIT 5').all();
    console.log('\nFirst 5 tracks after update:');
    updatedTracks.forEach(track => {
      console.log(`- ${track.artist} - ${track.title}`);
      console.log(`  Path: ${track.filePath}`);
      console.log(`  Exists: ${fs.existsSync(track.filePath) ? '✓' : '✗'}`);
    });
    
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    db.close();
  }
}

fixDatabasePaths().catch(console.error);
