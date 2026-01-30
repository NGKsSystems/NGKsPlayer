#!/usr/bin/env node

/**
 * Library Cleanup Script
 * Clears the library database and rescans only the Music folder
 * Run from: npm run clear-library
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const Database = require('better-sqlite3');

// Get database path
const appDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'NGKsPlayer');
const dbPath = path.join(appDataPath, 'library.db');

// Get Music folder path
const musicFolder = path.join(os.homedir(), 'Music');

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║        NGKsPlayer Library Cleanup & Rebuild               ║');
console.log('╚═══════════════════════════════════════════════════════════╝');
console.log();

// Verify paths exist
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at: ${dbPath}`);
  process.exit(1);
}

if (!fs.existsSync(musicFolder)) {
  console.error(`❌ Music folder not found at: ${musicFolder}`);
  process.exit(1);
}

console.log(`📁 Database: ${dbPath}`);
console.log(`🎵 Music Folder: ${musicFolder}`);
console.log();

try {
  // Open database
  const db = new Database(dbPath);
  
  console.log('🔍 Checking current library state...');
  const currentCount = db.prepare('SELECT COUNT(*) as count FROM tracks').get().count;
  console.log(`   Current tracks in library: ${currentCount}`);
  console.log();

  // Clear all data
  console.log('🧹 Clearing library tables...');
  const tablesToClear = ['tracks', 'playlists', 'playlist_tracks', 'play_history'];
  
  let clearedCount = 0;
  for (const table of tablesToClear) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
      if (count > 0) {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`   ✓ Cleared ${count} entries from ${table}`);
        clearedCount += count;
      }
    } catch (err) {
      // Table might not exist, skip silently
    }
  }
  
  // Reset auto-increment
  try {
    db.prepare(`DELETE FROM sqlite_sequence`).run();
    console.log('   ✓ Reset auto-increment counters');
  } catch (err) {
    // No sequences, that's fine
  }
  
  console.log(`   ✓ Total cleared: ${clearedCount} entries`);
  console.log();

  // Note: The actual scanning happens through the app
  console.log('✅ Database cleared successfully!');
  console.log();
  console.log('📝 Next steps:');
  console.log('   1. Start the NGKsPlayer application');
  console.log('   2. Go to Settings → Library Management');
  console.log('   3. Click "Rescan Music Folder" or use the auto-scan feature');
  console.log();
  console.log('The application will scan C:\\Users\\' + os.userInfo().username + '\\Music');
  console.log('and rebuild your library with only the audio files in that folder.');
  console.log();

  db.close();
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
