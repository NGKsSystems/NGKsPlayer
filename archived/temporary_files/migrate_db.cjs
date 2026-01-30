#!/usr/bin/env node

/**
 * NGKsPlayer Database Migration - Add Analysis Fields
 * Adds BPM, Key, Energy, LUFS, and Song Structure fields to tracks table
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Database helper functions
function hasColumn(db, tableName, columnName) {
  const info = db.pragma(`table_info(${tableName})`);
  return info.some(col => col.name === columnName);
}

function addAnalysisColumns(dbPath) {
  console.log('NGKsPlayer Database Migration - Adding Analysis Fields');
  console.log('='.repeat(60));
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`);
    process.exit(1);
  }
  
  const db = new Database(dbPath);
  
  console.log(`Connected to database: ${dbPath}`);
  
  // List of analysis columns to add
  const analysisColumns = [
    { name: 'bpm', type: 'REAL', description: 'Beats per minute' },
    { name: 'musical_key', type: 'TEXT', description: 'Musical key (Camelot notation)' },
    { name: 'energy', type: 'INTEGER', description: 'Energy level (1-100)' },
    { name: 'lufs', type: 'REAL', description: 'Loudness Units relative to Full Scale' },
    { name: 'detected_genre', type: 'TEXT', description: 'Auto-detected genre' },
    { name: 'confidence_overall', type: 'REAL', description: 'Overall analysis confidence' },
    { name: 'confidence_bpm', type: 'REAL', description: 'BPM detection confidence' },
    { name: 'confidence_key', type: 'REAL', description: 'Key detection confidence' },
    { name: 'confidence_energy', type: 'REAL', description: 'Energy analysis confidence' },
    { name: 'confidence_lufs', type: 'REAL', description: 'LUFS measurement confidence' },
    { name: 'song_structure', type: 'TEXT', description: 'Song structure as JSON' },
    { name: 'analyzed_at', type: 'DATETIME', description: 'When analysis was performed' }
  ];
  
  console.log(`\nAdding analysis columns to tracks table:`);
  
  let addedCount = 0;
  let skippedCount = 0;
  
  for (const column of analysisColumns) {
    if (hasColumn(db, 'tracks', column.name)) {
      console.log(`  ⚠️  Column '${column.name}' already exists - skipping`);
      skippedCount++;
    } else {
      try {
        const sql = `ALTER TABLE tracks ADD COLUMN ${column.name} ${column.type}`;
        db.prepare(sql).run();
        console.log(`  ✅ Added '${column.name}' (${column.type}) - ${column.description}`);
        addedCount++;
      } catch (error) {
        console.log(`  ❌ Failed to add '${column.name}': ${error.message}`);
      }
    }
  }
  
  // Create indexes for performance
  console.log(`\nCreating indexes for analysis fields:`);
  
  const indexes = [
    { name: 'idx_tracks_bpm', column: 'bpm' },
    { name: 'idx_tracks_musical_key', column: 'musical_key' },
    { name: 'idx_tracks_energy', column: 'energy' },
    { name: 'idx_tracks_detected_genre', column: 'detected_genre' },
    { name: 'idx_tracks_analyzed_at', column: 'analyzed_at' }
  ];
  
  for (const index of indexes) {
    try {
      const sql = `CREATE INDEX IF NOT EXISTS ${index.name} ON tracks(${index.column})`;
      db.prepare(sql).run();
      console.log(`  ✅ Created index: ${index.name}`);
    } catch (error) {
      console.log(`  ❌ Failed to create index ${index.name}: ${error.message}`);
    }
  }
  
  // Show current table schema
  console.log(`\nCurrent tracks table schema:`);
  const tableInfo = db.pragma('table_info(tracks)');
  for (const col of tableInfo) {
    const isNew = analysisColumns.some(ac => ac.name === col.name);
    const marker = isNew ? ' 🆕' : '';
    console.log(`  ${col.name} (${col.type})${marker}`);
  }
  
  db.close();
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('Database migration complete!');
  console.log(`Added: ${addedCount} columns`);
  console.log(`Skipped: ${skippedCount} columns (already exist)`);
  console.log(`${'='.repeat(60)}`);
}

// Find NGKsPlayer database
function findNGKsPlayerDatabase() {
  const possiblePaths = [
    path.join(process.cwd(), 'ngksplayer.db'),
    path.join(process.cwd(), 'electron', 'ngksplayer.db'),
    path.join(os.homedir(), '.ngksplayer', 'ngksplayer.db'),
    path.join(os.homedir(), 'AppData', 'Local', 'NGKsPlayer', 'ngksplayer.db')
  ];
  
  for (const dbPath of possiblePaths) {
    if (fs.existsSync(dbPath)) {
      return dbPath;
    }
  }
  
  return null;
}

function main() {
  const args = process.argv.slice(2);
  
  let dbPath;
  
  if (args.length > 0) {
    dbPath = args[0];
  } else {
    dbPath = findNGKsPlayerDatabase();
    if (!dbPath) {
      console.error('Could not find NGKsPlayer database file.');
      console.error('Please specify the database path as an argument:');
      console.error('  node migrate_db.cjs /path/to/ngksplayer.db');
      process.exit(1);
    }
    console.log(`Auto-detected database: ${dbPath}`);
  }
  
  addAnalysisColumns(dbPath);
}

if (require.main === module) {
  main();
}

module.exports = { addAnalysisColumns, hasColumn };
