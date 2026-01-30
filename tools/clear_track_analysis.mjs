#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

function usage(){
  console.log('Usage: node tools/clear_track_analysis.mjs "C:\\full\\path\\to\\file.mp3" [dbPath]');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length < 1) usage();
const targetPath = args[0];
const dbPath = args[1] || path.join(process.env.APPDATA || process.env.HOME || '.', 'ngksplayer', 'library.db');

if (!fs.existsSync(dbPath)){
  console.error('Database not found at', dbPath);
  process.exit(2);
}

console.log('Opening DB:', dbPath);
const db = new Database(dbPath);

try {
  const normalized = String(targetPath).replace(/\\\\/g, '\\');
  const stmt = db.prepare(`SELECT id, filePath, bpm, key FROM tracks WHERE LOWER(REPLACE(REPLACE(filePath, '\\\\?\\\\', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\', '/')) OR LOWER(REPLACE(REPLACE(path, '\\\\?\\\\', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\', '/')) LIMIT 1`);
  const row = stmt.get(normalized, normalized);
  if (!row) {
    console.error('Track not found in DB for path:', targetPath);
    process.exit(3);
  }
  console.log('Found track:', row.id, row.filePath, 'current BPM:', row.bpm, 'key:', row.key);

  const updateSql = `UPDATE tracks SET
    bpm = NULL,
    bpmConfidence = NULL,
    bpmNote = NULL,
    rawBpm = NULL,
    groove = NULL,
    key = NULL,
    keyConfidence = NULL,
    camelotKey = NULL,
    energy = NULL,
    danceability = NULL,
    acousticness = NULL,
    instrumentalness = NULL,
    liveness = NULL,
    loudnessLUFS = NULL,
    loudnessRange = NULL,
    cueIn = NULL,
    cueOut = NULL,
    phraseData = NULL,
    phraseLength = NULL,
    energyTrajectory = NULL,
    energyTrajectoryDesc = NULL,
    bpmDrift = NULL,
    transitionDifficulty = NULL,
    transitionDescription = NULL,
    analyzed = 0
    WHERE id = ?`;

  const upd = db.prepare(updateSql);
  const info = upd.run(row.id);
  console.log('Updated rows:', info.changes);
  console.log('Cleared analysis data for track id', row.id);
  process.exit(0);
} catch (err) {
  console.error('Error clearing track analysis:', err);
  process.exit(4);
} finally {
  try { db.close(); } catch(e) {}
}
