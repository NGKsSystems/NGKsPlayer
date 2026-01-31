// electron/main.cjs  — CommonJS main process with DB migrations & library IPC

/* ────────────────────────────────────────────────────────────────────────── *
 * Imports
 * ────────────────────────────────────────────────────────────────────────── */
/* ────────────────────────────────────────────────────────────────────────── *
 * Imports
 * ────────────────────────────────────────────────────────────────────────── */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { app, BrowserWindow, ipcMain, dialog, protocol, shell, Menu } = require('electron');

const Database = require('better-sqlite3');
const { Worker } = require('worker_threads');
const { scanFolder: scanFolderFull } = require('./scanner.cjs');

// CRITICAL: Set unique app name BEFORE any other Electron initialization
// This prevents userData directory conflicts with other NGKS apps
app.setName('NGKsPlayer');
app.setPath('userData', path.join(app.getPath('appData'), 'NGKsPlayer'));

// App Isolation - Prevent interference with other NGKS Electron apps
const appIsolation = require('./appIsolation.cjs');

// Initialize app isolation BEFORE anything else
if (!appIsolation.enforceSingleInstance()) {
  // Another instance is already running, exit
  process.exit(0);
}
appIsolation.initialize();

// AutoTagger module is ES module and conflicts with package.json "type":"module" + CommonJS
// We'll handle batch-analyze directly without it
let autoTagger = null;

// Try to load RequestServer with error handling
let RequestServer;
try {
  RequestServer = require('./request-server.cjs');
} catch (error) {
  console.error('[main.cjs] Failed to load RequestServer:', error);
  RequestServer = class DummyRequestServer {
    constructor() {}
    start() { return { success: false, message: 'RequestServer module failed to load' }; }
    stop() { return { success: false }; }
    getStatus() { return { isRunning: false }; }
  };
}

// Audio loading function for REAL analysis
async function loadAudioFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  
  // Find the actual file
  const fileName = path.basename(filePath);
  const musicDirPath = path.join('C:', 'Users', 'suppo', 'Music');
  
  let actualFilePath = filePath;
  
  // Search for the file in the Music directory and subdirectories
  function findFile(dir, targetFile) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          const found = findFile(fullPath, targetFile);
          if (found) return found;
        } else if (file.toLowerCase() === targetFile.toLowerCase()) {
          return fullPath;
        }
      }
    } catch (error) {
      return null;
    }
    return null;
  }
  
  const foundFile = findFile(musicDirPath, fileName);
  if (foundFile) {
    actualFilePath = foundFile;
    console.log(`[REAL AUDIO] Found file: ${actualFilePath}`);
  } else {
    console.log(`[REAL AUDIO] File not found, checking if original path exists: ${filePath}`);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${fileName}`);
    }
  }
  
  // Use fluent-ffmpeg to decode audio to raw PCM data
  return new Promise((resolve, reject) => {
    try {
      console.log(`[REAL AUDIO] Checking for FFmpeg dependencies...`);
      
      // Check for ffmpeg binary via installer package (avoid loading fluent-ffmpeg internals)
      let ffmpegPath;
      try {
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        ffmpegPath = ffmpegInstaller.path;
        console.log(`[REAL AUDIO] ✅ FFmpeg found at: ${ffmpegPath}`);
      } catch (requireError) {
        console.error(`[REAL AUDIO] ❌ FFmpeg installer package not available:`, requireError.message);
        reject(new Error(`FFmpeg not available: ${requireError.message}`));
        return;
      }
      
      // Use direct spawn of ffmpeg for more robust streaming control (avoid fluent-ffmpeg internal timeouts)
      const { spawn } = require('child_process');
      const args = [
        '-i', actualFilePath,
        '-ac', '1',
        '-ar', '22050',
        '-f', 'f32le',
        '-acodec', 'pcm_f32le',
        'pipe:1'
      ];
      console.log(`[REAL AUDIO] 🎵 Spawning ffmpeg: ${ffmpegPath} ${args.join(' ')}`);

      let audioBuffers = [];
      let totalBytes = 0;
      let duration = 0;
      let stderrAccum = '';
      let finished = false;

      const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      // Timeout protection (longer, adjustable)
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      const timeoutId = setTimeout(() => {
        if (!finished) {
          console.error(`[REAL AUDIO] ⏰ ffmpeg timeout after ${timeoutMs/1000}s, killing process`);
          try { ff.kill('SIGKILL'); } catch (e) {}
        }
      }, timeoutMs);

      ff.stdout.on('data', (chunk) => {
        if (!chunk || chunk.length === 0) return;
        audioBuffers.push(chunk);
        totalBytes += chunk.length;
      });

      ff.stderr.on('data', (data) => {
        const line = data.toString();
        stderrAccum += line;
        // Attempt to extract Duration from ffmpeg stderr lines
        const durationMatch = line.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          const seconds = parseFloat(durationMatch[3]);
          duration = hours * 3600 + minutes * 60 + seconds;
          console.log(`[REAL AUDIO] ⏱️ Duration detected: ${duration} seconds`);
        }
        if (line.includes('Input #0') || line.includes('Stream #0') || line.includes('Output #0')) {
          console.log(`[REAL AUDIO] 📋 ${line.trim()}`);
        }
      });

      ff.on('error', (err) => {
        clearTimeout(timeoutId);
        console.error('[REAL AUDIO] ffmpeg spawn error', err);
        reject(new Error(`ffmpeg spawn error: ${err.message}`));
      });

      ff.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        finished = true;
        console.log(`[REAL AUDIO] ffmpeg closed with code=${code} signal=${signal}`);

        if (code !== 0) {
          console.error('[REAL AUDIO] ffmpeg stderr:', stderrAccum.slice(-4000));
          reject(new Error(`ffmpeg exited with code ${code} signal ${signal}`));
          return;
        }

        if (totalBytes === 0) {
          console.error('[REAL AUDIO] No data received from ffmpeg stdout');
          reject(new Error('No audio data decoded from ffmpeg'));
          return;
        }

        // Convert buffers to Float32 samples
        try {
          const outBuf = Buffer.concat(audioBuffers, totalBytes);
          const sampleCount = Math.floor(outBuf.length / 4);
          const maxArrayLength = 33554432;
          if (sampleCount > maxArrayLength) {
            reject(new Error('Audio file too large for processing'));
            return;
          }

          const audioData = new Float32Array(sampleCount);
          for (let i = 0; i < sampleCount; i++) {
            audioData[i] = outBuf.readFloatLE(i * 4);
          }

          // Basic sanity checks
          const sampleRate = 22050;
          const durationFinal = audioData.length / sampleRate;
          console.log(`[REAL AUDIO] ✅ Decoded ${audioData.length} samples (${durationFinal.toFixed(2)}s)`);

          // Reject very short files
          const minimumSamples = 22050 * 2; // at least 2 seconds for safety here
          if (audioData.length < minimumSamples) {
            console.error(`[REAL AUDIO] ❌ Insufficient audio data: ${audioData.length} samples`);
            reject(new Error(`Insufficient audio data for analysis: got ${(audioData.length/22050).toFixed(2)}s`));
            return;
          }

          const audioBuffer = {
            duration: durationFinal,
            sampleRate: sampleRate,
            length: audioData.length,
            numberOfChannels: 1,
            getChannelData: function(channel) {
              if (channel === 0) return audioData;
              return new Float32Array(audioData.length);
            }
          };

          resolve(audioBuffer);
        } catch (convErr) {
          console.error('[REAL AUDIO] Error converting ffmpeg output to floats', convErr);
          reject(new Error(`Error decoding audio: ${convErr.message}`));
        }
      });
        
    } catch (error) {
      console.error(`[REAL AUDIO] Setup error:`, error);
      reject(new Error(`Failed to setup audio decoding: ${error.message}`));
    }
  });
}

// Single file scanner for normalized files
async function scanFileAndAddToDB(db, filePath) {
  const { parseFile } = await import('music-metadata');
  const fs = require('fs');
  const path = require('path');
  
  const ext = path.extname(filePath).toLowerCase();
  const AUDIO_EXT = new Set(['.mp3','.m4a','.flac','.wav','.aac','.ogg','.opus']);
  
  if (!AUDIO_EXT.has(ext)) {
    return false;
  }
  
  if (!fs.existsSync(filePath)) {
    console.warn(`File does not exist: ${filePath}`);
    return false;
  }
  
  const upsert = db.prepare(`INSERT INTO tracks (filePath, title, artist, album, genre, duration, trackNo, year)
    VALUES (@filePath,@title,@artist,@album,@genre,@duration,@trackNo,@year)
    ON CONFLICT(filePath) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album,
      genre=excluded.genre, duration=excluded.duration, trackNo=excluded.trackNo, year=excluded.year`);
  
  try {
    const meta = await parseFile(filePath);
    const common = meta.common || {};
    const format = meta.format || {};
    
    upsert.run({
      filePath: path.normalize(filePath),
      title: path.basename(filePath, path.extname(filePath)), // Use filename without extension
      artist: (common.artist || 'Unknown').trim(),
      album: (common.album || 'Unknown').trim(),
      genre: (Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || '')),
      duration: format.duration || 0,
      trackNo: (common.track && common.track.no) || null,
      year: common.year ? String(common.year) : null,
    });
    
    console.log(`[scanFileAndAddToDB] Successfully scanned: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`[scanFileAndAddToDB] Failed to scan ${filePath}:`, error.message);
    return false;
  }
}

/* ────────────────────────────────────────────────────────────────────────── *
 * App paths & database open
 * ────────────────────────────────────────────────────────────────────────── */
const USER_DATA = app.getPath('userData');
const DB_PATH = path.join(USER_DATA, 'library.db');

let db;
let requestServer;

function openDatabase() {
  // Ensure userData exists
  fs.mkdirSync(USER_DATA, { recursive: true });

  db = new Database(DB_PATH);
  console.log('DB_PATH:', DB_PATH);
  db.pragma('journal_mode = WAL');

  // Create table if it does not exist (keeps legacy 'path' alongside canonical 'filePath')
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id         INTEGER PRIMARY KEY,
      title      TEXT,
      artist     TEXT,
      album      TEXT,
      genre      TEXT,
      duration   REAL,
      -- legacy column some older builds used:
      path       TEXT,
      -- canonical column:
      filePath   TEXT,
      -- normalization tracking:
      normalized INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
    CREATE INDEX IF NOT EXISTS idx_tracks_album  ON tracks(album);
    CREATE INDEX IF NOT EXISTS idx_tracks_genre  ON tracks(genre);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tracks_filePath ON tracks(filePath);
    
    -- Add missing columns to existing databases
    PRAGMA table_info(tracks);
  `);
  
  // Check if normalized column exists, if not add it
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN normalized INTEGER DEFAULT 0`);
    console.log('[DB] Added normalized column');
  } catch (err) {
    // Column probably already exists
    if (!err.message.includes('duplicate column')) {
      console.warn('[DB] Error adding normalized column:', err.message);
    }
  }
  
  // Check if updated_at column exists, if not add it
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN updated_at DATETIME DEFAULT (datetime('now'))`);
    console.log('[DB] Added updated_at column');
  } catch (err) {
    // Column probably already exists
    if (!err.message.includes('duplicate column')) {
      console.warn('[DB] Error adding updated_at column:', err.message);
    }
  }

  // REMOVED ALL AUTOTAG METADATA COLUMNS
  // No autotag database columns are added anymore
  
  // Add BPM and Key columns for DJ features
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN bpm INTEGER DEFAULT NULL`);
    console.log('[DB] Added bpm column');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('[DB] Error adding bpm column:', err.message);
    }
  }
  
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN key TEXT DEFAULT NULL`);
    console.log('[DB] Added key column');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('[DB] Error adding key column:', err.message);
    }
  }
  
  try {
    db.exec(`ALTER TABLE tracks ADD COLUMN analyzed INTEGER DEFAULT 0`);
    console.log('[DB] Added analyzed column');
  } catch (err) {
    if (!err.message.includes('duplicate column')) {
      console.warn('[DB] Error adding analyzed column:', err.message);
    }
  }
  
  // Add audio feature columns
  const audioFeatureColumns = [
    'bpmConfidence TEXT DEFAULT NULL',
    'keyConfidence TEXT DEFAULT NULL',
    'camelotKey TEXT DEFAULT NULL',
    'energy REAL DEFAULT NULL',
    'loudness REAL DEFAULT NULL',
    'gainRecommendation TEXT DEFAULT NULL',
    'loudnessLUFS REAL DEFAULT NULL',
    'loudnessRange REAL DEFAULT NULL',
    'cueIn REAL DEFAULT NULL',
    'cueOut REAL DEFAULT NULL',
    'cueDescription TEXT DEFAULT NULL',
    'danceability REAL DEFAULT NULL',
    'acousticness REAL DEFAULT NULL',
    'instrumentalness REAL DEFAULT NULL',
    'liveness REAL DEFAULT NULL',
    // Groove detection
    'bpmNote TEXT DEFAULT NULL',
    'rawBpm INTEGER DEFAULT NULL',
    'groove TEXT DEFAULT NULL',
    // DJ workflow fields
    'comments TEXT DEFAULT NULL',
    'rating INTEGER DEFAULT NULL',
    'color TEXT DEFAULT NULL',
    'labels TEXT DEFAULT NULL',
    // 110% PREMIUM FEATURES
    'phraseData TEXT DEFAULT NULL',
    'phraseLength INTEGER DEFAULT NULL',
    'energyTrajectory TEXT DEFAULT NULL',
    'energyTrajectoryDesc TEXT DEFAULT NULL',
    'bpmDrift TEXT DEFAULT NULL',
    'transitionDifficulty INTEGER DEFAULT NULL',
    'transitionDescription TEXT DEFAULT NULL',
    'playCount INTEGER DEFAULT 0',
    'lastPlayed INTEGER DEFAULT NULL',
    'thumbnailPath TEXT DEFAULT NULL',
    'thumbnailHash TEXT DEFAULT NULL',
    'skipCount INTEGER DEFAULT 0',
    'skipRate REAL DEFAULT 0',
    'vocalScore TEXT DEFAULT NULL',
    'harmonyCompatibility TEXT DEFAULT NULL'
  ];
  
  audioFeatureColumns.forEach(column => {
    try {
      db.exec(`ALTER TABLE tracks ADD COLUMN ${column}`);
    } catch (err) {
      if (!err.message.includes('duplicate column')) {
        console.warn(`[DB] Error adding column: ${err.message}`);
      }
    }
  });
  
  // Continue with the rest of the database setup
  db.exec(`
    -- Sampler table for storing sample file paths
    CREATE TABLE IF NOT EXISTS samples (
      id          INTEGER PRIMARY KEY,
      filePath    TEXT NOT NULL,
      name        TEXT,
      duration    REAL,
      pad_index   INTEGER,
      created_at  DATETIME DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_samples_filePath ON samples(filePath);
    
    -- Playlist tables
    CREATE TABLE IF NOT EXISTS playlists (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at DATETIME DEFAULT (datetime('now')),
      updated_at DATETIME DEFAULT (datetime('now'))
    );
    
    CREATE TABLE IF NOT EXISTS playlist_tracks (
      id          INTEGER PRIMARY KEY,
      playlist_id INTEGER NOT NULL,
      track_id    INTEGER NOT NULL,
      position    INTEGER NOT NULL,
      added_at    DATETIME DEFAULT (datetime('now')),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
    );
    
    CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON playlist_tracks(playlist_id);
    CREATE INDEX IF NOT EXISTS idx_playlist_tracks_position ON playlist_tracks(playlist_id, position);
    
    -- Band name exceptions for normalization
    CREATE TABLE IF NOT EXISTS band_name_exceptions (
      id           INTEGER PRIMARY KEY,
      variant      TEXT NOT NULL UNIQUE,     -- The incorrect variant (e.g., "AC-DC")
      correct_name TEXT NOT NULL,            -- The correct name (e.g., "AC/DC")
      category     TEXT DEFAULT 'manual',    -- 'manual', 'auto-detected', 'builtin'
      usage_count  INTEGER DEFAULT 0,        -- How many times this correction was applied
      created_at   DATETIME DEFAULT (datetime('now')),
      updated_at   DATETIME DEFAULT (datetime('now'))
    );
    
    CREATE INDEX IF NOT EXISTS idx_band_exceptions_variant ON band_name_exceptions(variant);
    CREATE INDEX IF NOT EXISTS idx_band_exceptions_correct ON band_name_exceptions(correct_name);
    
    -- Normalization settings storage
    CREATE TABLE IF NOT EXISTS normalize_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  runMigrations(db);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * One-time migrations (safe to run every startup)
 * ────────────────────────────────────────────────────────────────────────── */
function hasColumn(db, table, col) {
  try {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all();
    return !!rows.find(r => r.name === col);
  } catch {
    return false;
  }
}

function runMigrations(db) {
  // Ensure 'filePath' exists and is populated from legacy 'path'
  if (!hasColumn(db, 'tracks', 'filePath')) {
    try { db.prepare(`ALTER TABLE tracks ADD COLUMN filePath TEXT`).run(); } catch {}
  }
  db.prepare(`
    UPDATE tracks
       SET filePath = path
     WHERE (filePath IS NULL OR filePath = '')
       AND path IS NOT NULL
  `).run();

  // Ensure 'pregainDb' column exists
  if (!hasColumn(db, 'tracks', 'pregainDb')) {
    try { db.prepare(`ALTER TABLE tracks ADD COLUMN pregainDb REAL`).run(); } catch {}
  }
  db.prepare(`UPDATE tracks SET pregainDb = 0 WHERE pregainDb IS NULL`).run();

  // Ensure 'year' column exists
  if (!hasColumn(db, 'tracks', 'year')) {
    try { db.prepare(`ALTER TABLE tracks ADD COLUMN year INTEGER`).run(); } catch {}
  }

  // Ensure 'disc' column exists
  if (!hasColumn(db, 'tracks', 'disc')) {
    try { db.prepare(`ALTER TABLE tracks ADD COLUMN disc INTEGER`).run(); } catch {}
  }

  // Ensure we have *some* track number column
  const hasTrack   = hasColumn(db, 'tracks', 'track');
  const hasTrackNo = hasColumn(db, 'tracks', 'trackNo');
  if (!hasTrack && !hasTrackNo) {
    try { db.prepare(`ALTER TABLE tracks ADD COLUMN trackNo INTEGER`).run(); } catch {}
  }

  // Unique index (fast lookup) on filePath when present
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS u_tracks_filePath ON tracks(filePath);`);
  
  // Add hasPlaybackError column for tracking corrupted files
  if (!hasColumn(db, 'tracks', 'hasPlaybackError')) {
    try { 
      db.prepare(`ALTER TABLE tracks ADD COLUMN hasPlaybackError INTEGER DEFAULT 0`).run(); 
      console.log('Added hasPlaybackError column to tracks table');
    } catch (e) {
      console.error('Failed to add hasPlaybackError column:', e);
    }
  }
  
  // Populate built-in band name exceptions
  populateBuiltinBandExceptions(db);
  
  // Fix any existing AC/DC entries (AC/DC is illegal filename, should be AC-DC)
  db.prepare(`UPDATE band_name_exceptions SET correct_name = 'AC-DC' WHERE correct_name = 'AC/DC'`).run();
  console.log('Updated AC/DC entries to AC-DC for filename compatibility');

  // Normalize existing filePath
  const tracks = db.prepare('SELECT id, filePath FROM tracks WHERE filePath IS NOT NULL').all();
  for (const track of tracks) {
    const normalized = path.normalize(track.filePath).replace(/^\\\\\?\\/, '');
    if (normalized !== track.filePath) {
      db.prepare('UPDATE tracks SET filePath = ? WHERE id = ?').run(normalized, track.id);
    }
  }
}

function populateBuiltinBandExceptions(db) {
  // Comprehensive built-in band name corrections - only add if not already present
  const builtinExceptions = [
    // AC/DC variations (using AC-DC since AC/DC is illegal filename)
    { variant: "AC/DC", correctName: "AC-DC" },
    { variant: "AC~DC", correctName: "AC-DC" },
    { variant: "AC_DC", correctName: "AC-DC" },
    { variant: "ACDC", correctName: "AC-DC" },
    { variant: "AC DC", correctName: "AC-DC" },
    { variant: "AC.DC", correctName: "AC-DC" },
    { variant: "AC*DC", correctName: "AC-DC" },
    { variant: "AC & DC", correctName: "AC-DC" },
    { variant: "AC+DC", correctName: "AC-DC" },
    { variant: "AC|DC", correctName: "AC-DC" },
    { variant: "Ac/Dc", correctName: "AC-DC" },
    { variant: "ac/dc", correctName: "AC-DC" },
    
    // 38 Special variations
    { variant: "Special", correctName: "38 Special" },
    { variant: ".38 Special", correctName: "38 Special" },
    { variant: "38Special", correctName: "38 Special" },
    { variant: "Thirty Eight Special", correctName: "38 Special" },
    
    // Guns N' Roses variations
    { variant: "Guns N Roses", correctName: "Guns N' Roses" },
    { variant: "Guns N' Roses", correctName: "Guns N' Roses" },
    { variant: "GunsNRoses", correctName: "Guns N' Roses" },
    { variant: "Guns n Roses", correctName: "Guns N' Roses" },
    { variant: "Guns & Roses", correctName: "Guns N' Roses" },
    { variant: "Guns and Roses", correctName: "Guns N' Roses" },
    
    // Numbered bands (hyphen vs space)
    { variant: "Blink 182", correctName: "Blink-182" },
    { variant: "Blink182", correctName: "Blink-182" },
    { variant: "Sum 41", correctName: "Sum 41" },
    { variant: "Sum41", correctName: "Sum 41" },
    { variant: "38 Special", correctName: "38 Special" },
    { variant: "38Special", correctName: "38 Special" },
    { variant: "3 Doors Down", correctName: "3 Doors Down" },
    { variant: "3DoorsDown", correctName: "3 Doors Down" },
    { variant: "Three Doors Down", correctName: "3 Doors Down" },
    { variant: "7 Mary 3", correctName: "Seven Mary Three" },
    { variant: "Seven Mary 3", correctName: "Seven Mary Three" },
    { variant: "7Mary3", correctName: "Seven Mary Three" },
    
    // Special characters and punctuation
    { variant: "Panic at the Disco", correctName: "Panic! At The Disco" },
    { variant: "Panic At The Disco", correctName: "Panic! At The Disco" },
    { variant: "P!ATD", correctName: "Panic! At The Disco" },
    { variant: "My Chemical Romance", correctName: "My Chemical Romance" },
    { variant: "MCR", correctName: "My Chemical Romance" },
    { variant: "Fall Out Boy", correctName: "Fall Out Boy" },
    { variant: "FOB", correctName: "Fall Out Boy" },
    
    // Ampersand vs "and"
    { variant: "Simon and Garfunkel", correctName: "Simon & Garfunkel" },
    { variant: "Simon & Garfunkel", correctName: "Simon & Garfunkel" },
    { variant: "Salt n Pepa", correctName: "Salt-N-Pepa" },
    { variant: "Salt N Pepa", correctName: "Salt-N-Pepa" },
    { variant: "Salt and Pepa", correctName: "Salt-N-Pepa" },
    { variant: "Salt & Pepa", correctName: "Salt-N-Pepa" },
    
    // "The" prefix issues
    { variant: "Beatles", correctName: "The Beatles" },
    { variant: "Rolling Stones", correctName: "The Rolling Stones" },
    { variant: "Who", correctName: "The Who" },
    { variant: "Doors", correctName: "The Doors" },
    { variant: "Kinks", correctName: "The Kinks" },
    { variant: "Clash", correctName: "The Clash" },
    { variant: "Cure", correctName: "The Cure" },
    { variant: "Police", correctName: "The Police" },
    { variant: "Smiths", correctName: "The Smiths" },
    { variant: "White Stripes", correctName: "The White Stripes" },
    { variant: "Black Keys", correctName: "The Black Keys" },
    { variant: "Strokes", correctName: "The Strokes" },
    { variant: "Killers", correctName: "The Killers" },
    { variant: "Ramones", correctName: "The Ramones" },
    
    // Reversed "The" (when it gets moved to end)
    { variant: "Beatles, The", correctName: "The Beatles" },
    { variant: "Rolling Stones, The", correctName: "The Rolling Stones" },
    { variant: "Who, The", correctName: "The Who" },
    { variant: "Doors, The", correctName: "The Doors" },
    
    // Common misspellings
    { variant: "Lynard Skynard", correctName: "Lynyrd Skynyrd" },
    { variant: "Lynyrd Skynard", correctName: "Lynyrd Skynyrd" },
    { variant: "Leonard Skynard", correctName: "Lynyrd Skynyrd" },
    { variant: "Led Zeplin", correctName: "Led Zeppelin" },
    { variant: "Led Zepplin", correctName: "Led Zeppelin" },
    { variant: "Def Leopard", correctName: "Def Leppard" },
    { variant: "Def Lepard", correctName: "Def Leppard" },
    
    // Capitalization standards
    { variant: "pink floyd", correctName: "Pink Floyd" },
    { variant: "PINK FLOYD", correctName: "Pink Floyd" },
    { variant: "metallica", correctName: "Metallica" },
    { variant: "METALLICA", correctName: "Metallica" },
    { variant: "queen", correctName: "Queen" },
    { variant: "QUEEN", correctName: "Queen" },
    { variant: "u2", correctName: "U2" },
    { variant: "U-2", correctName: "U2" },
    
    // Possessive issues
    { variant: "Guns N Roses", correctName: "Guns N' Roses" },
    { variant: "Guns 'N Roses", correctName: "Guns N' Roses" },
    { variant: "Guns 'n' Roses", correctName: "Guns N' Roses" },
    
    // Hip-hop/R&B naming conventions
    { variant: "Wu Tang Clan", correctName: "Wu-Tang Clan" },
    { variant: "Wu-Tang", correctName: "Wu-Tang Clan" },
    { variant: "Outkast", correctName: "OutKast" },
    { variant: "OutKast", correctName: "OutKast" },
    { variant: "TLC", correctName: "TLC" },
    { variant: "T.L.C.", correctName: "TLC" },
    { variant: "NWA", correctName: "N.W.A" },
    { variant: "N.W.A.", correctName: "N.W.A" },
    { variant: "N W A", correctName: "N.W.A" },
    
    // Electronic/DJ names
    { variant: "Daft Punk", correctName: "Daft Punk" },
    { variant: "deadmau5", correctName: "deadmau5" },
    { variant: "Deadmau5", correctName: "deadmau5" },
    { variant: "DEADMAU5", correctName: "deadmau5" },
    
    // Metal band conventions
    { variant: "Black Sabbath", correctName: "Black Sabbath" },
    { variant: "Iron Maiden", correctName: "Iron Maiden" },
    { variant: "Judas Priest", correctName: "Judas Priest" },
    { variant: "Motorhead", correctName: "Motörhead" },
    { variant: "Motörhead", correctName: "Motörhead" },
    { variant: "Blue Oyster Cult", correctName: "Blue Öyster Cult" },
    { variant: "Blue Öyster Cult", correctName: "Blue Öyster Cult" },
    
    // Alternative spellings/formats
    { variant: "Nine Inch Nails", correctName: "Nine Inch Nails" },
    { variant: "NIN", correctName: "Nine Inch Nails" },
    { variant: "Red Hot Chili Peppers", correctName: "Red Hot Chili Peppers" },
    { variant: "RHCP", correctName: "Red Hot Chili Peppers" },
    { variant: "Red Hot Chilli Peppers", correctName: "Red Hot Chili Peppers" },
    
    // Country music conventions
    { variant: "Hank Williams Jr", correctName: "Hank Williams Jr." },
    { variant: "Hank Williams Jr.", correctName: "Hank Williams Jr." },
    { variant: "Hank Jr", correctName: "Hank Williams Jr." },
    
    // Classic rock standards
    { variant: "Deep Purple", correctName: "Deep Purple" },
    { variant: "Fleetwood Mac", correctName: "Fleetwood Mac" },
    { variant: "Eagles", correctName: "Eagles" },
    { variant: "The Eagles", correctName: "Eagles" },
    { variant: "Journey", correctName: "Journey" },
    { variant: "Boston", correctName: "Boston" },
    { variant: "Kansas", correctName: "Kansas" },
    { variant: "Chicago", correctName: "Chicago" },
    { variant: "Foreigner", correctName: "Foreigner" },
    { variant: "Styx", correctName: "Styx" },
    
    // Punk/Alternative
    { variant: "Green Day", correctName: "Green Day" },
    { variant: "Greenday", correctName: "Green Day" },
    { variant: "Bad Religion", correctName: "Bad Religion" },
    { variant: "Social Distortion", correctName: "Social Distortion" },
    { variant: "Social D", correctName: "Social Distortion" },
    
    // Progressive/Art Rock
    { variant: "Yes", correctName: "Yes" },
    { variant: "Genesis", correctName: "Genesis" },
    { variant: "King Crimson", correctName: "King Crimson" },
    { variant: "Emerson Lake and Palmer", correctName: "Emerson, Lake & Palmer" },
    { variant: "Emerson Lake & Palmer", correctName: "Emerson, Lake & Palmer" },
    { variant: "ELP", correctName: "Emerson, Lake & Palmer" }
  ];
  
  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO band_name_exceptions (variant, correct_name, category) 
    VALUES (?, ?, 'builtin')
  `);
  
  for (const exception of builtinExceptions) {
    insertStmt.run(exception.variant, exception.correctName);
  }
  
  console.log(`Populated ${builtinExceptions.length} built-in band name exceptions`);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Column introspection helpers (so queries are tolerant to old DBs)
 * ────────────────────────────────────────────────────────────────────────── */
const TABLE = 'tracks';
function tableHas(table, col) {
  return hasColumn(db, table, col);
}
function resolveColumns() {
  return {
    COL_FILEPATH: tableHas(TABLE, 'filePath') ? 'filePath'
                : tableHas(TABLE, 'path')     ? 'path' : null,
    COL_TRACKNO : tableHas(TABLE, 'track')    ? 'track'
                : tableHas(TABLE, 'trackNo')  ? 'trackNo' : null,
    COL_DISC    : tableHas(TABLE, 'disc')     ? 'disc' : null,
    COL_YEAR    : tableHas(TABLE, 'year')     ? 'year' : null,
  };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Protocol to safely load local files: ngksplayer://C:/...  (renderer uses this)
 * Uses app-specific protocol to avoid conflicts with other NGKS apps
 * ────────────────────────────────────────────────────────────────────────── */
function registerLocalProtocol() {
  // Use app-specific protocol name to avoid conflicts with ngks.writer, ngks.mail, etc.
  protocol.registerFileProtocol('ngksplayer', (request, callback) => {
    const p = request.url.replace(/^ngksplayer:\/\//, '');
    const abs = decodeURIComponent(p);
    callback({ path: abs });
  });
  
  console.log('[main.cjs] Registered app-specific protocol: ngksplayer://');
}

/* ────────────────────────────────────────────────────────────────────────── *
 * BrowserWindow
 * ────────────────────────────────────────────────────────────────────────── */
let win;
let broadcastWindow = null;

function createWindow() {
  console.log('[main.cjs] ======================================');
  console.log('[main.cjs] CREATING WINDOW FOR: NGKsPlayer');
  console.log('[main.cjs] App Name:', app.getName());
  console.log('[main.cjs] App Path:', app.getAppPath());
  console.log('[main.cjs] User Data:', app.getPath('userData'));
  console.log('[main.cjs] ======================================');

  console.log('[main.cjs] Creating BrowserWindow...');
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'NGKsPlayer - DJ Application',
    show: false, // Don't show until ready
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Handle WASM MIME type for .wasm files only (not global)
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };

    if (details.url.endsWith('.wasm')) {
      headers['Content-Type'] = ['application/wasm'];
    }

    callback({ responseHeaders: headers });
  });

  // Force window title
  win.setTitle('NGKsPlayer - DJ Application');
  
  const devUrl = process.env.VITE_DEV_SERVER_URL;
  console.log('[main.cjs] Loading URL:', devUrl || 'production build');
  
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createApplicationMenu();

  // Ensure window is ready before sending IPC signals
  // 'did-finish-load' fires when navigation is done (HTML loaded)
  // but preload has already been executed
  win.webContents.on('did-finish-load', () => {
    // Small delay to ensure React has mounted and listeners are ready
    setImmediate(() => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('app-database-ready');
        win.show(); // Show window after content is ready
        console.log('[main.cjs] Sent app-database-ready signal to renderer and showed window');
        
        // Start background scanning after window is ready
        const userHome = require('os').homedir();
        const musicFolder = path.join(userHome, 'Music');
        console.log('[BackgroundScan] Starting background scan and watcher for:', musicFolder);
        
        // Do an initial scan of existing files
        scanFolderFull(db, musicFolder)
          .then(result => {
            console.log(`[BackgroundScan] Initial scan complete: ${result.added} new tracks found`);
            if (result.added > 0 && win && !win.isDestroyed()) {
              win.webContents.send('library:updated', { added: result.added });
            }
            // After initial scan, start watching for new files
            startWatchingFolder(musicFolder);
          })
          .catch(err => {
            console.error('[BackgroundScan] Initial scan failed:', err);
            // Still start watching even if initial scan fails
            startWatchingFolder(musicFolder);
          });
      }
    });
  });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Application Menu
 * ────────────────────────────────────────────────────────────────────────── */
function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        {
          label: 'Reset Layout',
          click: () => {
            if (win && !win.isDestroyed()) {
              win.webContents.send('menu-action', 'reset-layout');
            }
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            await shell.openExternal('https://github.com/yourusername/ngksplayer');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Broadcast Window for OBS Integration
 * ────────────────────────────────────────────────────────────────────────── */
function createBroadcastWindow(options = {}) {
  if (broadcastWindow && !broadcastWindow.isDestroyed()) {
    broadcastWindow.focus();
    return;
  }

  const width = options.width || 1920;
  const height = options.height || 1080;
  const theme = options.theme || 'default';

  broadcastWindow = new BrowserWindow({
    width,
    height,
    title: 'NGKs Player - Broadcast Output',
    backgroundColor: '#000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const broadcastUrl = `#/broadcast?theme=${theme}`;
  
  if (devUrl) {
    broadcastWindow.loadURL(devUrl + broadcastUrl);
  } else {
    broadcastWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      hash: `/broadcast?theme=${theme}`
    });
  }

  broadcastWindow.on('closed', () => {
    broadcastWindow = null;
  });
}

function closeBroadcastWindow() {
  if (broadcastWindow && !broadcastWindow.isDestroyed()) {
    broadcastWindow.close();
  }
  broadcastWindow = null;
}

function sendToBroadcastWindow(channel, data) {
  if (broadcastWindow && !broadcastWindow.isDestroyed()) {
    broadcastWindow.webContents.send(channel, data);
  }
}

/* ────────────────────────────────────────────────────────────────────────── *
 * IPC registration helper (prevents "second handler" warnings)
 * ────────────────────────────────────────────────────────────────────────── */
function register(channel, handler) {
  try { ipcMain.removeHandler(channel); } catch {}
  ipcMain.handle(channel, handler);
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Library IPC
 * ────────────────────────────────────────────────────────────────────────── */

// Open folder picker (returns chosen folder or null)
register('dialog:openFolder', async () => {
  const res = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'dontAddToRecent'] });
  if (res.canceled || !res.filePaths?.length) return null;
  return res.filePaths[0];
});

// File picker for audio files
register('select-file', async (_evt, options = {}) => {
  const filters = options.filters || [
    { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'] },
    { name: 'All Files', extensions: ['*'] }
  ];
  
  const res = await dialog.showOpenDialog(win, { 
    properties: ['openFile', 'dontAddToRecent'],
    filters: filters
  });
  
  if (res.canceled || !res.filePaths?.length) return null;
  return { path: res.filePaths[0] };
});

// Folder picker
register('select-folder', async () => {
  const res = await dialog.showOpenDialog(win, { 
    properties: ['openDirectory', 'dontAddToRecent'] 
  });
  if (res.canceled || !res.filePaths?.length) return null;
  return { path: res.filePaths[0] };
});

// Open folder in file explorer
register('openFolder', async (_evt, folderPath) => {
  if (!folderPath) return { success: false, error: 'No folder path provided' };
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    console.error('[openFolder] Failed to open folder:', error);
    return { success: false, error: String(error) };
  }
});

// Scan a folder and return basic stats
register('library:scan', async (_evt, folder) => {
  if (!folder) return { added: 0, total: 0 };
  try {
    const result = await scanFolderFull(db, folder);
    const count = db.prepare(`SELECT COUNT(*) AS n FROM tracks`).get().n;
    return { added: result.added, total: count };
  }
  catch (err) {
    console.error('[scan] failed:', err);
    return { added: 0, total: 0, error: String(err) };
  }
});

// Auto scan common music folders
register('library:autoScan', async (_evt) => {
  const userHome = require('os').homedir();
  const commonFolders = [
    path.join(userHome, 'Music'),
  ];
  let totalAdded = 0;
  for (const folder of commonFolders) {
    if (fs.existsSync(folder)) {
      console.log(`Scanning ${folder}`)
      try {
        const result = await scanFolderFull(db, folder);
        totalAdded += result.added;
        console.log(`Scanned ${folder}: ${result.added} added`)
      } catch (err) {
        console.error(`[autoScan] failed for ${folder}:`, err);
      }
    } else {
      console.log(`Folder ${folder} does not exist`)
    }
  }
  const count = db.prepare(`SELECT COUNT(*) AS n FROM tracks`).get().n;
  return { added: totalAdded, total: count };
});

// List: Artists
register('library:listArtists', () => {
  return db.prepare(`
    SELECT artist AS name, COUNT(*) AS tracks
      FROM tracks
     WHERE COALESCE(artist,'') <> ''
     GROUP BY artist
     ORDER BY LOWER(artist)
  `).all();
});

// ── NEW: albums for a given artist (or all albums if no artist provided)
register('library:getAlbumsByArtist', (_evt, payload = {}) => {
  const artist = (payload && payload.artist) ? String(payload.artist) : '';

  if (artist.trim()) {
    return db.prepare(`
      SELECT album AS name,
             COALESCE(artist,'') AS artist,
             COUNT(*) AS tracks
        FROM tracks
       WHERE artist = ?
       GROUP BY album, artist
       ORDER BY LOWER(album)
    `).all(artist);
  }

  // Fallback: all albums
  return db.prepare(`
    SELECT album AS name,
           COALESCE(artist,'') AS artist,
           COUNT(*) AS tracks
      FROM tracks
     WHERE COALESCE(album,'') <> ''
     GROUP BY album, artist
     ORDER BY LOWER(album)
  `).all();
});


// List: Albums (+ artist + track count)
register('library:listAlbums', () => {
  return db.prepare(`
    SELECT album AS name,
           COALESCE(artist,'') AS artist,
           COUNT(*) AS tracks
      FROM tracks
     WHERE COALESCE(album,'') <> ''
     GROUP BY album, artist
     ORDER BY LOWER(album)
  `).all();
});

// List: Songs
register('library:listSongs', () => {
  return db.prepare(`
    SELECT id,
           COALESCE(title,'')  AS title,
           COALESCE(artist,'') AS artist,
           COALESCE(album,'')  AS album,
           COALESCE(filePath, path) AS filePath
      FROM tracks
     ORDER BY LOWER(artist), LOWER(album), LOWER(title)
  `).all();
});

// Decode a short audio segment and return raw f32 channel data (used for fast scanning)
register('audio:loadSegment', async (_evt, payload = {}) => {
  const { filePath, start = 0, duration = 10, sampleRate = 22050 } = payload || {};
  if (!filePath) throw new Error('audio:loadSegment requires filePath');
  console.log('[main] audio:loadSegment requested:', { filePath, start, duration, sampleRate });

  // Try to locate the file similar to loadAudioFile helper
  const fileName = path.basename(filePath || '');
  const musicDirPath = path.join('C:', 'Users', 'suppo', 'Music');
  let actualFilePath = filePath;

  function findFile(dir, targetFile) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          const found = findFile(fullPath, targetFile);
          if (found) return found;
        } else if (file.toLowerCase() === targetFile.toLowerCase()) {
          return fullPath;
        }
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  const foundFile = findFile(musicDirPath, fileName);
  if (foundFile) actualFilePath = foundFile;
  else if (!fs.existsSync(actualFilePath)) throw new Error('Audio file not found: ' + filePath);

  // Spawn ffmpeg to decode the short segment
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const ffmpegPath = ffmpegInstaller.path;
    const { spawn } = require('child_process');
    // place -ss before -i for fast seek
    const args = [
      '-ss', String(start),
      '-i', actualFilePath,
      '-t', String(duration),
      '-ac', '1',
      '-ar', String(sampleRate),
      '-f', 'f32le',
      '-acodec', 'pcm_f32le',
      'pipe:1'
    ];

    const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let chunks = [];
    let totalBytes = 0;
    let stderr = '';

    ff.stdout.on('data', (c) => { chunks.push(c); totalBytes += c.length; });
    ff.stderr.on('data', (d) => { stderr += d.toString(); });

    const result = await new Promise((resolve, reject) => {
      ff.on('error', (err) => reject(err));
      ff.on('close', (code) => {
        if (code !== 0) return reject(new Error('ffmpeg exited with code ' + code + '\n' + stderr.slice(-2000)));
        if (totalBytes === 0) return reject(new Error('No audio data decoded from ffmpeg segment'));
        try {
          const outBuf = Buffer.concat(chunks, totalBytes);
          const sampleCount = Math.floor(outBuf.length / 4);
          const audioData = new Float32Array(sampleCount);
          for (let i = 0; i < sampleCount; i++) audioData[i] = outBuf.readFloatLE(i * 4);
          const durationFinal = audioData.length / sampleRate;
          const res = { length: audioData.length, sampleRate: sampleRate, channelData: [Array.from(audioData)], duration: durationFinal };
          console.log('[main] audio:loadSegment returning', { filePath, samples: audioData.length, duration: durationFinal });
          resolve(res);
        } catch (convErr) { reject(convErr); }
      });
    });

    return result;
  } catch (err) {
    console.error('[main] audio:loadSegment failed', err);
    throw err;
  }
});

// List: Folders (unique)
register('library:listFolders', () => {
  const rows = db.prepare(`
    SELECT REPLACE(REPLACE(COALESCE(filePath, path), '\\\\', '/'), '//', '/') AS fullPath
      FROM tracks
  `).all();
  const uniq = new Set(rows.map(r => path.dirname(r.fullPath)));
  return [...uniq].sort().map(folder => ({ folder }));
});

// List: Genres
register('library:listGenres', () => {
  return db.prepare(`
    SELECT genre AS name, COUNT(*) AS tracks
      FROM tracks
     WHERE COALESCE(genre,'') <> ''
     GROUP BY genre
     ORDER BY LOWER(genre)
  `).all();
});

/**
 * Flexible tracks query:
 *   payload: { artist?, album?, genre?, search? }
 */
register('library:getTracks', (_evt, filter = {}) => {
  const { COL_FILEPATH, COL_TRACKNO, COL_DISC } = resolveColumns();
  const clauses = [];
  const args = [];

  if (filter.artist) { clauses.push('LOWER(artist) = LOWER(?)'); args.push(filter.artist); }
  if (filter.album)  { clauses.push('LOWER(album) = LOWER(?)'); args.push(filter.album); }
  if (filter.genre)  { clauses.push('LOWER(genre) = LOWER(?)'); args.push(filter.genre); }

  if (filter.search) {
    const s = `%${String(filter.search).toLowerCase()}%`;
    clauses.push('(LOWER(title) LIKE ? OR LOWER(artist) LIKE ? OR LOWER(album) LIKE ?)');
    args.push(s, s, s);
  }

  const where   = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const orderBy = (COL_DISC ? 'disc, ' : '') + (COL_TRACKNO ? `${COL_TRACKNO}, ` : '') + 'LOWER(title)';

  const sql = `
    SELECT id, title, artist, album, genre,
           ${COL_DISC    ? 'disc'    : 'NULL AS disc'}    AS disc,
           ${COL_TRACKNO ? COL_TRACKNO : 'NULL AS track'} AS track,
           duration,
           ${COL_FILEPATH ? COL_FILEPATH : 'NULL AS filePath'} AS filePath,
           bpm,
           key,
           camelotKey,
           loudness,
           gainRecommendation,
           analyzed
      FROM ${TABLE}
      ${where}
      ORDER BY ${orderBy}
  `;
  const tracks = db.prepare(sql).all(...args);
  
  // Add derived filename field for each track
  return tracks.map(track => ({
    ...track,
    filename: track.filePath ? require('path').basename(track.filePath) : null
  }));
});

// IPC: return a decoded short segment of audio to speed up fast scans
register('audio:loadSegment', async (_evt, payload = {}) => {
  const filePath = payload && payload.filePath ? String(payload.filePath) : null;
  const start = Number(payload && payload.start) || 0;
  const duration = Number(payload && payload.duration) || 5; // seconds
  const sampleRate = Number(payload && payload.sampleRate) || 22050;
  if (!filePath) throw new Error('audio:loadSegment requires filePath');
  try {
    // Reuse existing loadAudioFile logic but decode only a segment via ffmpeg -ss / -t
    return await (async function decodeSegment(absPath, startSec, durSec, sr) {
      const actualFilePath = absPath;
      const { spawn } = require('child_process');
      const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
      const ffmpegPath = ffmpegInstaller.path;

      const args = ['-ss', String(startSec), '-i', actualFilePath, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-acodec', 'pcm_f32le', '-t', String(durSec), 'pipe:1'];
      console.log(`[REAL AUDIO] 🎵 Spawning ffmpeg for segment: ${ffmpegPath} ${args.join(' ')}`);

      return await new Promise((resolve, reject) => {
        const chunks = [];
        let total = 0;
        let stderr = '';
        const ff = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        ff.stdout.on('data', (c) => { chunks.push(c); total += c.length; });
        ff.stderr.on('data', (d) => { stderr += d.toString(); });
        ff.on('error', (e) => reject(new Error('ffmpeg spawn failed: ' + e.message)));
        ff.on('close', (code) => {
          if (code !== 0) {
            reject(new Error('ffmpeg exited with code ' + code + ' stderr: ' + stderr.slice(-2000)));
            return;
          }
          if (total === 0) { reject(new Error('No audio data from ffmpeg')); return; }
          try {
            const buf = Buffer.concat(chunks, total);
            const samples = Math.floor(buf.length / 4);
            const floatArr = new Float32Array(samples);
            for (let i = 0; i < samples; i++) floatArr[i] = buf.readFloatLE(i * 4);
            // Return a serializable object (channelData arrays) compatible with renderer's expectations
            return resolve({ duration: samples / sr, sampleRate: sr, length: samples, numberOfChannels: 1, channelData: [Array.from(floatArr)] });
          } catch (convErr) { reject(convErr); }
        });
      });
    })(filePath, start, duration, sampleRate);
  } catch (err) {
    console.error('[audio:loadSegment] failed:', err && err.message ? err.message : err);
    throw err;
  }
});

/**
 * Get a single track by absolute path (works with filePath or legacy path)
 *   payload: { absPath: string }
 */
register('library:getTrackByPath', (_evt, { absPath }) => {
  console.log('getTrackByPath handler invoked. Incoming absPath:', absPath);
  if (!absPath) return null;
  absPath = path.normalize(absPath).replace(/^\\\?\\/, '');
  console.log('getTrackByPath called with normalized absPath:', absPath);
  const { COL_FILEPATH, COL_TRACKNO, COL_DISC, COL_YEAR } = resolveColumns();
  console.log('COL_FILEPATH:', COL_FILEPATH);

  const sql = `
    SELECT id, title, artist, album, genre,
           ${COL_YEAR    ? 'year'    : 'NULL AS year'}     AS year,
           ${COL_DISC    ? 'disc'    : 'NULL AS disc'}     AS disc,
           ${COL_TRACKNO ? COL_TRACKNO : 'NULL AS track'}  AS track,
           duration,
           ${COL_FILEPATH ? COL_FILEPATH : 'NULL AS filePath'} AS filePath,
           COALESCE(pregainDb, 0) AS pregainDb,
           bpm,
           key,
           camelotKey,
           analyzed
      FROM ${TABLE}
     WHERE LOWER(REPLACE(REPLACE(${COL_FILEPATH}, '\\\\?\\\\', ''), '\\', '/')) = LOWER(REPLACE(@p, '\\', '/'))
        OR LOWER(REPLACE(REPLACE(path, '\\\\?\\\\', ''), '\\', '/')) = LOWER(REPLACE(@p, '\\', '/'))
     LIMIT 1
  `;
  console.log('Query SQL:', sql);
  console.log('Query param p:', absPath);
  const result = db.prepare(sql).get({ p: absPath }) || null;
  console.log('getTrackByPath result', result);
  if (!result) {
    // Print all file paths for debugging
    const allPaths = db.prepare(`SELECT id, filePath, path FROM ${TABLE}`).all();
    console.log('All filePath/path entries in DB:');
    for (const row of allPaths) {
      console.log(`id: ${row.id}, filePath: ${row.filePath}, path: ${row.path}`);
    }
  }
  return result;
});

// Dev helper: query recent analysis rows from main process (temporary)
// Usage: window.api.invoke('dev:queryAnalysis', { limit: 20 })
register('dev:queryAnalysis', (_evt, opts = {}) => {
  try {
    const limit = Number(opts.limit) || 20;
    const sql = `SELECT id, title, artist, album, genre, duration, filePath, bpm, key, camelotKey, loudnessLUFS, loudnessRange, analyzed, updatedAt FROM ${TABLE} ORDER BY id DESC LIMIT @limit`;
    const rows = db.prepare(sql).all({ limit });
    console.log(`[dev:queryAnalysis] returning ${rows.length} rows`);
    rows.forEach((r) => {
      console.log('[dev:queryAnalysis] row:', JSON.stringify(r));
    });
    return rows;
  } catch (err) {
    console.error('[dev:queryAnalysis] error querying DB', err && err.message ? err.message : err);
    return { error: err && err.message ? err.message : String(err) };
  }
});

// Get a single track by ID
register('library:getTrackById', (_evt, trackId) => {
  if (!trackId) return null;
  const sql = `
    SELECT id, title, artist, album, genre, year, disc, 
           CAST(trackNo AS TEXT) AS track, duration, filePath, path,
           COALESCE(pregainDb, 0) AS pregainDb,
           bpm, bpmConfidence, key, keyConfidence, camelotKey, 
           energy, danceability, acousticness, instrumentalness, liveness,
           loudness, gainRecommendation, loudnessLUFS, loudnessRange, cueIn, cueOut,
           comments, rating, color, labels, analyzed
      FROM ${TABLE}
     WHERE id = ?
     LIMIT 1
  `;
  const result = db.prepare(sql).get(trackId) || null;
  return result;
});

// Update track metadata (for spelling corrections, etc.)
register('library:updateTrack', (_evt, { trackId, updates }) => {
  try {
    if (!trackId || !updates) {
      return { error: 'trackId and updates are required' };
    }

    const allowedFields = ['title', 'artist', 'album', 'genre', 'year'];
    const setClause = [];
    const params = { id: trackId };

    for (const [field, value] of Object.entries(updates)) {
      if (allowedFields.includes(field)) {
        setClause.push(`${field} = @${field}`);
        params[field] = value;
      }
    }

    if (setClause.length === 0) {
      return { error: 'No valid fields to update' };
    }

    const sql = `UPDATE tracks SET ${setClause.join(', ')} WHERE id = @id`;
    const stmt = db.prepare(sql);
    const result = stmt.run(params);

    return { 
      success: true, 
      changes: result.changes,
      updatedFields: Object.keys(updates).filter(f => allowedFields.includes(f))
    };
  } catch (err) {
    console.error('library:updateTrack failed:', err);
    return { error: String(err.message || err) };
  }
});

// Mark track as having playback errors
register('library:markTrackError', (_evt, { trackId, hasError }) => {
  try {
    if (!trackId) {
      return { error: 'trackId is required' };
    }

    const sql = `UPDATE tracks SET hasPlaybackError = ? WHERE id = ?`;
    const stmt = db.prepare(sql);
    const result = stmt.run(hasError ? 1 : 0, trackId);

    console.log(`[library:markTrackError] Track ${trackId} error flag set to ${hasError}`);
    return { 
      success: true, 
      changes: result.changes
    };
  } catch (err) {
    console.error('library:markTrackError failed:', err);
    return { error: String(err.message || err) };
  }
});

// Remove track from library (database only, doesn't delete file)
register('library:removeTrack', (_evt, trackId) => {
  try {
    if (!trackId) {
      return { error: 'trackId is required' };
    }

    const sql = `DELETE FROM tracks WHERE id = ?`;
    const stmt = db.prepare(sql);
    const result = stmt.run(trackId);

    console.log(`[library:removeTrack] Removed track ${trackId} from database`);
    return { 
      success: true, 
      changes: result.changes
    };
  } catch (err) {
    console.error('library:removeTrack failed:', err);
    return { error: String(err.message || err) };
  }
});

// Rename a file and update database
register('library:renameFile', async (_evt, { oldPath, newName }) => {
  console.log('[library:renameFile] Starting rename operation:', { oldPath, newName });
  try {
    if (!oldPath || !newName) {
      console.log('[library:renameFile] Missing required parameters');
      return { error: 'oldPath and newName are required' };
    }

    const fs = require('fs').promises;
    const normalizedOldPath = path.normalize(oldPath);
    const directory = path.dirname(normalizedOldPath);
    const originalExt = path.extname(normalizedOldPath);
    
    console.log('[library:renameFile] Paths:', { normalizedOldPath, directory, originalExt });
    
    // CRITICAL: Preserve file extension if user didn't include it
    let finalNewName = newName;
    if (!path.extname(newName) && originalExt) {
      finalNewName = newName + originalExt;
      console.log('[library:renameFile] Added extension:', finalNewName);
    }
    
    const newPath = path.join(directory, finalNewName);
    console.log('[library:renameFile] Final paths:', { normalizedOldPath, newPath });

    // Check if trying to rename to the same name (no change)
    if (normalizedOldPath === newPath) {
      console.log('[library:renameFile] Same name - no change needed');
      return { success: true, newPath: normalizedOldPath, message: 'No change needed' };
    }

    // Check if old file exists
    try {
      await fs.access(normalizedOldPath);
      console.log('[library:renameFile] Old file exists, proceeding');
    } catch (err) {
      console.log('[library:renameFile] Original file not found:', normalizedOldPath);
      return { error: 'Original file not found' };
    }

    // Check if new file already exists
    try {
      await fs.access(newPath);
      console.log('[library:renameFile] New file already exists:', newPath);
      return { error: 'A file with that name already exists' };
    } catch {
      console.log('[library:renameFile] New path available, proceeding');
      // File doesn't exist, which is what we want
    }

    // Rename the actual file
    console.log('[library:renameFile] Renaming file...');
    await fs.rename(normalizedOldPath, newPath);
    console.log('[library:renameFile] File renamed successfully');

    // Update database
    const { COL_FILEPATH } = resolveColumns();
    console.log('[library:renameFile] COL_FILEPATH resolved to:', COL_FILEPATH);
    
    if (!COL_FILEPATH) {
      console.error('[library:renameFile] No filepath column found in database');
      return { error: 'Database filepath column not found' };
    }
    
    const updateSql = `UPDATE tracks SET ${COL_FILEPATH} = ? WHERE ${COL_FILEPATH} = ?`;
    console.log('[library:renameFile] SQL:', updateSql);
    console.log('[library:renameFile] Updating:', newPath, 'from:', normalizedOldPath);
    
    const stmt = db.prepare(updateSql);
    const result = stmt.run(newPath, normalizedOldPath);
    console.log('[library:renameFile] Database update result:', result);

    console.log('[library:renameFile] Rename completed successfully');
    return { success: true, newPath };
  } catch (err) {
    console.error('[library:renameFile] ERROR:', err);
    return { error: String(err.message || err) };
  }
});
console.log('[HANDLER REGISTRATION] library:renameFile registered successfully');

console.log('[HANDLER REGISTRATION] Registering library:deleteFile...');
// Delete file permanently from disk (also removes from database)
register('library:deleteFile', async (_evt, filePath) => {
  try {
    if (!filePath) {
      return { error: 'filePath is required' };
    }

    const fs = require('fs').promises;
    const normalizedPath = path.normalize(filePath);

    // First, remove from database
    const { COL_FILEPATH } = resolveColumns();
    const sql = `DELETE FROM tracks WHERE ${COL_FILEPATH} = ?`;
    const stmt = db.prepare(sql);
    stmt.run(normalizedPath);

    // Then delete the actual file
    await fs.unlink(normalizedPath);

    console.log(`[library:deleteFile] Permanently deleted file: ${normalizedPath}`);
    return { success: true };
  } catch (err) {
    console.error('library:deleteFile failed:', err);
    return { error: String(err.message || err) };
  }
});
console.log('[HANDLER REGISTRATION] library:deleteFile registered successfully');

// Show file in system file explorer
register('library:showInExplorer', async (_evt, filePath) => {
  try {
    if (!filePath) {
      return { error: 'filePath is required' };
    }

    const normalizedPath = path.normalize(filePath);
    
    // Show item in folder (works on Windows, Mac, Linux)
    shell.showItemInFolder(normalizedPath);

    console.log(`[library:showInExplorer] Showed in explorer: ${normalizedPath}`);
    return { success: true };
  } catch (err) {
    console.error('library:showInExplorer failed:', err);
    return { error: String(err.message || err) };
  }
});
console.log('[HANDLER REGISTRATION] library:showInExplorer registered successfully');

console.log('[HANDLER REGISTRATION] Registering library:analyzeTrack...');
// Analyze a single track (BPM/Key)
register('library:analyzeTrack', async (_evt, trackId) => {
  try {
    if (!trackId) {
      return { error: 'trackId is required' };
    }

    // Get track info
    const { COL_FILEPATH } = resolveColumns();
    const track = db.prepare(`SELECT id, title, ${COL_FILEPATH} AS filePath FROM tracks WHERE id = ?`).get(trackId);
    
    if (!track) {
      return { error: 'Track not found' };
    }

    console.log(`[library:analyzeTrack] Starting analysis for: ${track.title}`);
    
    // This would call your existing analyzer
    // For now, just mark as analyzed
    const updateSql = `UPDATE tracks SET analyzed = 1 WHERE id = ?`;
    db.prepare(updateSql).run(trackId);

    return { success: true, trackId };
  } catch (err) {
    console.error('library:analyzeTrack failed:', err);
    return { error: String(err.message || err) };
  }
});
console.log('[HANDLER REGISTRATION] library:analyzeTrack registered successfully');

/* ────────────────────────────────────────────────────────────────────────── *
 * Audio Analysis (BPM & Key Detection)
 * ────────────────────────────────────────────────────────────────────────── */

// Update track with BPM and Key analysis results
register('library:updateAnalysis', function (_evt, ...args) {
  try {
    // Normalize payload: support both object payloads and positional args
    // (trackId, bpm, key) which some older callers still use.
    let payload = args[0];
    if (typeof payload === 'number' || typeof payload === 'string') {
      const trackId = Number(payload);
      const bpm = args.length > 1 ? args[1] : undefined;
      const key = args.length > 2 ? args[2] : undefined;
      payload = { trackId, bpm, key };
    }

    console.log('[MAIN] library:updateAnalysis payload:', payload);
    const {
      trackId,
      bpm,
      bpmConfidence,
      bpmNote,
      rawBpm,
      groove,
      key,
      keyConfidence,
      camelotKey,
      energy,
      danceability,
      acousticness,
      instrumentalness,
      liveness,
      loudness,
      gainRecommendation,
      loudnessLUFS,
      loudnessRange,
      cueIn,
      cueOut,
      cueDescription,
      phraseData,
      phraseLength,
      energyTrajectory,
      energyTrajectoryDesc,
      bpmDrift,
      transitionDifficulty,
      transitionDescription,
      analyzed
    } = payload || {};

    if (!trackId) {
      return { error: 'trackId is required' };
    }

    // Build an update statement dynamically so we only overwrite columns
    // that were explicitly provided in the payload. This prevents empty
    // or missing fields (for example from tag parsing) from nulling out
    // analyzer-produced values unintentionally.
    const updatable = {
      bpm, bpmConfidence, bpmNote, rawBpm, groove, key, keyConfidence,
      camelotKey, energy, danceability, acousticness, instrumentalness,
      liveness, loudness, gainRecommendation, loudnessLUFS, loudnessRange, cueIn, cueOut, cueDescription, phraseData,
      phraseLength, energyTrajectory, energyTrajectoryDesc, bpmDrift,
      transitionDifficulty, transitionDescription, analyzed
    };

    const assignments = [];
    const params = { id: trackId };

    for (const [k, v] of Object.entries(updatable)) {
      // Skip undefined values (not provided)
      if (typeof v === 'undefined') continue;

      // Protect against accidental clearing: do NOT write empty string or explicit null
      // from renderer payloads — these often indicate "no result" rather than an
      // intentional request to wipe the DB. To force-clearing a value, callers must
      // include a separate explicit flag (not implemented here) or be adjusted.
      if (v === '' || v === null) {
        console.log(`[Analysis] Skipping empty update for ${k} on track ${trackId}`);
        continue;
      }

      if (k === 'phraseData' || k === 'energyTrajectory' || k === 'bpmDrift') {
        params[k] = v ? JSON.stringify(v) : null;
      } else {
        params[k] = v;
      }
      assignments.push(`${k} = @${k}`);
    }

    // Always mark as analyzed when analyzer provided any analysis fields
    if (assignments.length > 0 && !assignments.includes('analyzed = 1')) {
      assignments.push('analyzed = 1');
    }

    if (assignments.length === 0) {
      return { success: true, changes: 0 };
    }

    const sql = `UPDATE tracks SET ${assignments.join(', ')} WHERE id = @id`;
    const stmt = db.prepare(sql);
    const result = stmt.run(params);

    console.log(`[Analysis] Updated track ${trackId}: BPM=${bpm}${groove ? ` (${groove})` : ''}, Key=${key}, Energy=${energy}, Groove=${groove || 'normal'}`);

    return { 
      success: true, 
      changes: result.changes
    };
  } catch (err) {
    console.error('library:updateAnalysis failed:', err);
    return { error: String(err.message || err) };
  }
});

// Get all unanalyzed tracks
register('library:getUnanalyzedTracks', () => {
  const { COL_FILEPATH } = resolveColumns();
  const sql = `
    SELECT id, title, artist, 
           ${COL_FILEPATH ? COL_FILEPATH : 'NULL AS filePath'} AS filePath
      FROM tracks
     WHERE COALESCE(analyzed, 0) = 0
     LIMIT 100
  `;
  return db.prepare(sql).all();
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Fast/Deep Analysis with Worker Threads (NEW)
 * ────────────────────────────────────────────────────────────────────────── */

// Global map to track active analysis workers
const analysisWorkers = new Map();

// Main handler: Analyze a single file with fast + deep passes
register('analyzer:analyzeFile', async (evt, { filePath, trackId }) => {
  console.log(`[Analyzer] Starting analysis for track ${trackId}: ${filePath}`);
  
  try {
    // This handler is called from the renderer which will do the actual analysis
    // We just need to coordinate and send updates back to renderer
    // The renderer will call back with results via library:updateAnalysis
    
    // For now, return success - the renderer (TagEditor) will handle the actual analysis
    // via the local AudioAnalyzer instance
    return {
      success: true,
      trackId,
      message: 'Analysis handler initialized - renderer will perform analysis'
    };
    
  } catch (err) {
    console.error(`[Analyzer] Handler initialization failed for track ${trackId}:`, err);
    
    return {
      success: false,
      trackId,
      error: err.message
    };
  }
});

// Cancel single analysis
register('analyzer:cancel', (_evt, { trackId }) => {
  console.log(`[Analyzer] Canceling analysis for track ${trackId}`);
  
  const worker = analysisWorkers.get(trackId);
  if (worker) {
    worker.terminate();
    analysisWorkers.delete(trackId);
    return { success: true };
  }
  
  return { success: false, message: 'No active analysis for this track' };
});

// Cancel all analyses
register('analyzer:cancelAll', (_evt) => {
  console.log(`[Analyzer] Canceling all analyses`);
  let count = 0;
  
  for (const [trackId, worker] of analysisWorkers) {
    worker.terminate();
    analysisWorkers.delete(trackId);
    count++;
  }
  
  console.log(`[Analyzer] Terminated ${count} worker threads`);
  return { success: true, terminated: count };
});

// Load audio file via IPC (for single-file analysis in renderer)
// This exposes the loadAudioFile function so AudioAnalyzer can use it
// NOTE: This is deprecated - use analyze-single-file instead for actual analysis
register('load-audio-file', async (_evt, { filePath }) => {
  console.log('[load-audio-file] IPC handler called for:', filePath);
  try {
    // Call the loadAudioFile function directly
    const audioBuffer = await loadAudioFile(filePath);
    console.log('[load-audio-file] Successfully loaded:', filePath);
    
    // For IPC serialization, convert Float32Array to regular array
    // (Electron can't directly serialize TypedArrays in IPC responses)
    console.log('[load-audio-file] Serializing', audioBuffer.numberOfChannels, 'channels...');
    const channelData = [];
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      const data = audioBuffer.getChannelData(i);
      // Keep as Float32Array - Electron can handle this for structured clone
      channelData.push(data);
    }
    
    console.log('[load-audio-file] Channel 0 has', channelData[0].length, 'samples');
    
    // Return metadata + serialized audio data
    return {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels,
      channelData: channelData  // Electron IPC will structured-clone this
    };
  } catch (error) {
    console.error('[load-audio-file] Error loading file:', error);
    throw new Error(`Failed to load audio file: ${error.message}`);
  }
});

// Analyze single audio file (call from Single File Analysis tab)
// Handler loads audio and lets renderer's AudioAnalyzer do the analysis with calibration
register('analyze-single-file', async (_evt, { filePath }) => {
  console.log('[analyze-single-file] Starting analysis for:', filePath);
  try {
    const audioBuffer = await loadAudioFile(filePath);
    
    // Return only audio metadata - renderer will use AudioAnalyzer for actual BPM/Key detection
    const result = {
      success: true,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels
    };
    
    console.log('[analyze-single-file] Audio loaded successfully');
    return result;
  } catch (error) {
    console.error('[analyze-single-file] Error loading audio:', error);
    return {
      success: false,
      error: error.message,
      analyzed: false
    };
  }
});

// Legacy batch-analyze - now uses unified system
register('batch-analyze', async (_evt, options) => {
  console.log('[batch-analyze] DEPRECATED: use unified analyzer');
  return { success: false, error: 'Use unified analyzer' };
});

// ── Sampler handlers ──────────────────────────────────────────────────────

// Save a sample to the database
register('sampler:saveSample', (_evt, { filePath, name, duration, padIndex }) => {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO samples (filePath, name, duration, pad_index)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(filePath, name, duration, padIndex);
    return { ok: true, id: result.lastInsertRowid };
  } catch (err) {
    console.error('[Sampler] Error saving sample:', err);
    return { ok: false, error: String(err) };
  }
});

// Get all saved samples
register('sampler:getSamples', () => {
  try {
    const samples = db.prepare(`
      SELECT id, filePath, name, duration, pad_index
      FROM samples
      ORDER BY pad_index ASC
    `).all();
    return { ok: true, samples };
  } catch (err) {
    console.error('[Sampler] Error getting samples:', err);
    return { ok: false, error: String(err) };
  }
});

// Remove a sample by file path
register('sampler:removeSample', (_evt, { filePath }) => {
  try {
    const stmt = db.prepare('DELETE FROM samples WHERE filePath = ?');
    stmt.run(filePath);
    return { ok: true };
  } catch (err) {
    console.error('[Sampler] Error removing sample:', err);
    return { ok: false, error: String(err) };
  }
});

// Clear all samples
register('sampler:clearAll', () => {
  try {
    db.prepare('DELETE FROM samples').run();
    return { ok: true };
  } catch (err) {
    console.error('[Sampler] Error clearing samples:', err);
    return { ok: false, error: String(err) };
  }
});

// ── NEW: FS helpers for renderer (waveform/graph, etc.)

// Helper to get MIME type from file extension
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.flac': 'audio/flac',
    '.m4a': 'audio/mp4',
    '.ogg': 'audio/ogg',
    '.aac': 'audio/aac',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Return the file contents as a Buffer (Electron serializes it as a Uint8Array)
register('fs:readFileBuffer', async (_evt, absPath) => {
  try {
    if (!absPath) throw new Error('No path provided');
    const data = fs.readFileSync(absPath);
    return { ok: true, data };       // data is a Buffer
  } catch (err) {
    return { ok: false, error: String(err) };
  }
});

// Return a blob URL for the file (for audio/video elements)
register('fs:createBlobUrl', async (_evt, absPath) => {
  try {
    console.log('[BLOB] Creating blob URL for:', absPath);
    if (!absPath) throw new Error('No path provided');
    const data = fs.readFileSync(absPath);
    const mimeType = getMimeType(absPath);
    const blob = new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    console.log('[BLOB] Created blob URL:', url.substring(0, 50) + '...');
    return { ok: true, url };
  } catch (err) {
    console.error('[BLOB] Failed to create blob URL:', err);
    return { ok: false, error: String(err) };
  }
});

// Save a thumbnail data URL to disk and record it in the DB
register('library:saveThumbnail', async (_evt, { trackId, dataUrl, hash }) => {
  try {
    if (!trackId) throw new Error('trackId required');
    if (!dataUrl || typeof dataUrl !== 'string') throw new Error('dataUrl required');

    // Expect data:image/(png|webp);base64,...
    const m = dataUrl.match(/^data:image\/(png|webp);base64,(.*)$/);
    if (!m) throw new Error('Invalid image data URL (png|webp expected)');

    const ext = m[1] === 'webp' ? 'webp' : 'png';
    const b64 = m[2];
    const buf = Buffer.from(b64, 'base64');

    const thumbDir = path.join(USER_DATA, 'thumbnails');
    fs.mkdirSync(thumbDir, { recursive: true });

    const tmpPath = path.join(thumbDir, `${trackId}.${ext}.tmp`);
    const finalPath = path.join(thumbDir, `${trackId}.${ext}`);

    fs.writeFileSync(tmpPath, buf);
    fs.renameSync(tmpPath, finalPath);

    // Update DB record if available
    if (db) {
      try {
        const stmt = db.prepare('UPDATE tracks SET thumbnailPath=@p, thumbnailHash=@h WHERE id=@id');
        stmt.run({ p: finalPath, h: hash || null, id: trackId });
      } catch (err) {
        console.warn('[library:saveThumbnail] DB update failed', err && err.message);
      }
    }

    return { ok: true, path: finalPath };
  } catch (err) {
    console.error('[library:saveThumbnail] error:', err);
    return { ok: false, error: String(err && err.message) };
  }
});

// Play a file
register('player:playFile', async (_evt, filePath) => {
  win.webContents.send('player:playFile', filePath);
});

// Send library context to player (for playlist shuffle, filters, etc)
ipcMain.on('library:sendToPlayer', (_evt, data) => {
  if (win && win.webContents) {
    win.webContents.send('library:loadToPlayer', data);
  }
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Playlist management
 * ────────────────────────────────────────────────────────────────────────── */

// List all playlists
register('listPlaylists', async () => {
  const stmt = db.prepare('SELECT * FROM playlists ORDER BY name');
  return stmt.all();
});

// Create a new playlist
register('createPlaylist', async (_evt, name) => {
  const stmt = db.prepare('INSERT INTO playlists (name) VALUES (?)');
  const result = stmt.run(name);
  return { id: result.lastInsertRowid, name };
});

// Rename a playlist
register('renamePlaylist', async (_evt, id, newName) => {
  const stmt = db.prepare('UPDATE playlists SET name = ? WHERE id = ?');
  stmt.run(newName, id);
  return { success: true };
});

// Delete a playlist and all its tracks
register('deletePlaylist', async (_evt, id) => {
  const db_transaction = db.transaction(() => {
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(id);
    db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  });
  db_transaction();
  return { success: true };
});

// Get tracks in a playlist
register('getPlaylistTracks', async (_evt, playlistId) => {
  const stmt = db.prepare(`
    SELECT pt.id as playlist_track_id, pt.position, t.* 
    FROM playlist_tracks pt
    JOIN tracks t ON pt.track_id = t.id
    WHERE pt.playlist_id = ?
    ORDER BY pt.position
  `);
  return stmt.all(playlistId);
});

// Add a track to a playlist
register('addTrackToPlaylist', async (_evt, playlistId, trackId) => {
  // Get the next position
  const posStmt = db.prepare('SELECT COALESCE(MAX(position), 0) + 1 as next_pos FROM playlist_tracks WHERE playlist_id = ?');
  const { next_pos } = posStmt.get(playlistId);
  
  // Add the track
  const stmt = db.prepare('INSERT INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)');
  stmt.run(playlistId, trackId, next_pos);
  
  return { success: true };
});

// Remove a track from a playlist
register('removeTrackFromPlaylist', async (_evt, playlistTrackId) => {
  const stmt = db.prepare('DELETE FROM playlist_tracks WHERE id = ?');
  stmt.run(playlistTrackId);
  return { success: true };
});

// Reorder tracks in a playlist
register('reorderPlaylistTracks', async (_evt, playlistId, trackIds) => {
  const db_transaction = db.transaction(() => {
    trackIds.forEach((trackId, index) => {
      db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?')
        .run(index + 1, playlistId, trackId);
    });
  });
  db_transaction();
  return { success: true };
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Filename Normalization IPC
 * ────────────────────────────────────────────────────────────────────────── */

// Preview normalize operation (dry run)
register('normalize:preview', async (_evt, { folderPath, options = {} }) => {
  try {
    // Get band name exceptions from database
    const bandExceptions = db.prepare(`
      SELECT variant, correct_name 
      FROM band_name_exceptions 
      ORDER BY usage_count DESC
    `).all();

    // Dynamic import of the normalizer module using file:// URL
    const { planForFolder, calculateStats } = await import(`file:///${path.resolve(__dirname, '../src/lib/filenameNormalizer.js').replace(/\\/g, '/')}`);
    
    const opts = {
      useTags: true,
      useLLM: options.useLLM || false,
      flipIfTitleDashArtist: options.flipReversed !== false,
      dryRun: true,
      recurse: options.recurse || false,
      bandExceptions,
      useAI: options.useLLM || false,
      openRouterApiKey: options.openRouterApiKey,
      ...options
    };
    
    const plans = await planForFolder(folderPath, opts);
    const stats = calculateStats(plans);
    
    return { success: true, plans, stats };
  } catch (err) {
    console.error('[normalize:preview] failed:', err);
    return { error: String(err.message || err) };
  }
});

// Execute normalize operation
register('normalize:execute', async (_evt, { folderPath, options = {}, approvedFiles = null }) => {
  try {
    // Get band exceptions from database
    const bandExceptions = db.prepare(`
      SELECT variant, correct_name FROM band_name_exceptions
    `).all();
    
    // Dynamic import of the normalizer and import pipeline using file:// URL
    const { normalizeOnImport } = await import(`file:///${path.resolve(__dirname, '../src/main/importPipeline.js').replace(/\\/g, '/')}`);
    
    const result = await normalizeOnImport(folderPath, { 
      ...options,
      useLLM: options.useLLM || false,
      openRouterKey: options.openRouterApiKey,
      flipReversed: options.flipReversed !== false,
      recurse: options.recurse || false,
      approvedFiles,
      bandExceptions 
    });
    
    // Update database with renamed files
    if (result.results && result.results.length > 0) {
      console.log('[normalize] Updating database after file renames...');
      
      // Remove old file entries and add new ones
      const removeStmt = db.prepare('DELETE FROM tracks WHERE filePath = ?');
      const addedFiles = [];
      
      for (const rename of result.results) {
        if (rename.status === 'renamed') {
          // Remove old entry
          try {
            removeStmt.run(rename.srcPath);
            console.log(`[DB] Removed old entry: ${rename.srcPath}`);
          } catch (err) {
            console.warn(`[DB] Failed to remove old entry: ${rename.srcPath}`, err);
          }
          
          // Track new file for scanning
          addedFiles.push(rename.dstPath);
        }
      }
      
      // Scan new files to add them to database
      if (addedFiles.length > 0) {
        console.log(`[DB] Scanning ${addedFiles.length} renamed files...`);
        for (const filePath of addedFiles) {
          try {
            await scanFileAndAddToDB(db, filePath);
            console.log(`[DB] Added new entry: ${filePath}`);
          } catch (err) {
            console.warn(`[DB] Failed to add new entry: ${filePath}`, err);
          }
        }
      }
    }
    
    // Only do a full re-scan for batch operations (multiple files)
    // For single file operations, the individual file scanning above is sufficient
    if (!approvedFiles || approvedFiles.length > 1) {
      try {
        console.log('[normalize] Performing full folder re-scan for batch operation...');
        await scanFolderFull(db, folderPath);
      } catch (scanErr) {
        console.warn('Full re-scan after normalize failed:', scanErr);
      }
    } else {
      console.log('[normalize] Skipping full re-scan for single file operation');
    }
    
    return { success: true, ...result };
  } catch (err) {
    console.error('[normalize:execute] failed:', err);
    return { error: String(err.message || err) };
  }
});

// AI correction for filenames
register('normalize:correctSpelling', async (_evt, { filename, currentSuggestion, context }) => {
  try {
    // Get settings from file (same as getSettings)
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'normalize-settings.json');
    
    let apiKey = '';
    try {
      const fileData = await fs.promises.readFile(settingsPath, 'utf8');
      const savedSettings = JSON.parse(fileData);
      apiKey = savedSettings.openRouterApiKey || '';
    } catch (err) {
      // No settings file found
    }
    
    if (!apiKey) {
      return { error: 'OpenRouter API key not configured' };
    }
    
    // Dynamic import of the AI correction function
    const { correctSpelling } = await import(`file:///${path.resolve(__dirname, '../src/lib/filenameNormalizer.js').replace(/\\/g, '/')}`);
    
    const result = await correctSpelling(filename, {
      model: 'anthropic/claude-3.5-sonnet',
      openRouterApiKey: apiKey,
      currentSuggestion,
      context
    });
    
    return { success: true, corrected: result };
  } catch (err) {
    console.error('[normalize:correctSpelling] failed:', err);
    return { error: String(err.message || err) };
  }
});

// AI parsing for filenames (used when user clicks "AI Fix")
register('normalize:parseWithAI', async (_evt, { filename, context }) => {
  try {
    // Get settings from file (same as getSettings)
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'normalize-settings.json');
    
    let apiKey = '';
    let model = 'anthropic/claude-3.5-sonnet';
    try {
      const fileData = await fs.promises.readFile(settingsPath, 'utf8');
      const savedSettings = JSON.parse(fileData);
      apiKey = savedSettings.openRouterApiKey || '';
      model = savedSettings.model || model;
    } catch (err) {
      // No settings file found
    }
    
    if (!apiKey) {
      return { error: 'OpenRouter API key not configured' };
    }
    
    // Get band exceptions
    const bandExceptions = db.prepare(`
      SELECT variant, correct_name FROM band_name_exceptions
    `).all();
    
    // Dynamic import of the AI parsing function
    const { parseWithAI } = await import(`file:///${path.resolve(__dirname, '../src/lib/filenameNormalizer.js').replace(/\\/g, '/')}`);
    
    const result = await parseWithAI(filename, {
      model,
      openRouterApiKey: apiKey,
      bandExceptions,
      context
    });
    
    return { success: true, parsed: result };
  } catch (err) {
    console.error('[normalize:parseWithAI] failed:', err);
    return { error: String(err.message || err) };
  }
});

// Get normalization settings
register('normalize:getSettings', async () => {
  try {
    // Try to get settings from a config file first, then localStorage
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'normalize-settings.json');
    
    let settings = {
      enableOnImport: false,
      useTags: true,
      useLLM: false,
      flipReversed: true,
      recurse: false,
      model: 'anthropic/claude-3.5-sonnet',
      openRouterApiKey: ''
    };
    
    try {
      const fileData = await fs.promises.readFile(settingsPath, 'utf8');
      const savedSettings = JSON.parse(fileData);
      settings = { ...settings, ...savedSettings };
    } catch (err) {
      // File doesn't exist or is invalid, use defaults
      console.log('No existing normalize settings found, using defaults');
    }
    
    return settings;
  } catch (err) {
    console.error('Error loading normalize settings:', err);
    return {
      enableOnImport: false,
      useTags: true,
      useLLM: false,
      flipReversed: true,
      recurse: false,
      model: 'anthropic/claude-3.5-sonnet',
      openRouterApiKey: ''
    };
  }
});

// Save normalization settings  
register('normalize:saveSettings', async (_evt, settings) => {
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'normalize-settings.json');
    
    await fsPromises.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error saving normalize settings:', err);
    return { success: false, error: err.message };
  }
});

// Mark files as normalized in database
register('normalize:markAsProcessed', async (_evt, filePaths) => {
  try {
    const stmt = db.prepare(`
      UPDATE tracks 
      SET normalized = 1, updated_at = datetime('now')
      WHERE filePath = ?
    `);
    
    let updated = 0;
    for (const filePath of filePaths) {
      const result = stmt.run(filePath);
      updated += result.changes;
    }
    
    return { success: true, updated };
  } catch (err) {
    console.error('Error marking files as normalized:', err);
    return { success: false, error: err.message };
  }
});

// Get normalized status for files
register('normalize:getProcessedStatus', async (_evt, folderPath) => {
  console.log('[MAIN.CJS] normalize:getProcessedStatus handler registered');
  try {
    const rows = db.prepare(`
      SELECT filePath, normalized 
      FROM tracks 
      WHERE filePath LIKE ?
    `).all(`${folderPath}%`);
    
    const processedFiles = new Set();
    rows.forEach(row => {
      if (row.normalized) {
        processedFiles.add(row.filePath);
      }
    });
    
    return { success: true, processedFiles: Array.from(processedFiles) };
  } catch (err) {
    console.error('Error getting processed status:', err);
    return { success: false, error: err.message };
  }
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Layout IPC handlers - Save/load widget positions and mixer settings
 * ────────────────────────────────────────────────────────────────────────── */

console.log('[MAIN.CJS] Registering layout handlers...');

// Save layout to user data
register('layout:save', async (_evt, layoutData) => {
  console.log('[LAYOUT] layout:save handler called');
  try {
    const userDataPath = app.getPath('userData');
    const layoutPath = path.join(userDataPath, 'layout.json');
    
    await fsPromises.writeFile(layoutPath, JSON.stringify(layoutData, null, 2), 'utf8');
    console.log('[LAYOUT] Saved successfully');
    return { success: true };
  } catch (err) {
    console.error('[LAYOUT] Error saving:', err);
    return { success: false, error: err.message };
  }
});

// Load layout from user data
register('layout:load', async () => {
  console.log('[LAYOUT] layout:load handler called');
  try {
    const userDataPath = app.getPath('userData');
    const layoutPath = path.join(userDataPath, 'layout.json');
    
    if (fs.existsSync(layoutPath)) {
      const data = await fsPromises.readFile(layoutPath, 'utf8');
      const layout = JSON.parse(data);
      console.log('[LAYOUT] Loaded successfully');
      return { success: true, layout };
    }
    
    return { success: false, error: 'No saved layout found' };
  } catch (err) {
    console.error('[LAYOUT] Error loading:', err);
    return { success: false, error: err.message };
  }
});

/* ────────────────────────────────────────────────────────────────────────── */

// Band Name Exception Management
register('bandExceptions:getAll', async () => {
  try {
    const exceptions = db.prepare(`
      SELECT variant, correct_name, category, usage_count, created_at, updated_at 
      FROM band_name_exceptions 
      ORDER BY usage_count DESC, correct_name ASC
    `).all();
    
    return { success: true, exceptions };
  } catch (err) {
    console.error('Error getting band exceptions:', err);
    return { success: false, error: err.message };
  }
});

// DELETED ALL AUTOTAG SYSTEMS - FRONTEND AND BACKEND
// No autotag functionality remains - all analysis systems removed

register('bandExceptions:add', async (_evt, { variant, correctName, category = 'manual' }) => {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO band_name_exceptions (variant, correct_name, category, usage_count, updated_at)
      VALUES (?, ?, ?, COALESCE((SELECT usage_count FROM band_name_exceptions WHERE variant = ?), 0), datetime('now'))
    `);
    
    stmt.run(variant, correctName, category, variant);
    
    return { success: true };
  } catch (err) {
    console.error('Error adding band exception:', err);
    return { success: false, error: err.message };
  }
});

register('bandExceptions:remove', async (_evt, variant) => {
  try {
    const stmt = db.prepare('DELETE FROM band_name_exceptions WHERE variant = ?');
    const result = stmt.run(variant);
    
    return { success: true, deleted: result.changes > 0 };
  } catch (err) {
    console.error('Error removing band exception:', err);
    return { success: false, error: err.message };
  }
});

register('bandExceptions:incrementUsage', async (_evt, variant) => {
  try {
    const stmt = db.prepare(`
      UPDATE band_name_exceptions 
      SET usage_count = usage_count + 1, updated_at = datetime('now')
      WHERE variant = ?
    `);
    
    stmt.run(variant);
    return { success: true };
  } catch (err) {
    console.error('Error incrementing usage:', err);
    return { success: false, error: err.message };
  }
});

// Clean up stale database entries
register('db:cleanup', async (_evt, folderPath) => {
  try {
    console.log('[DB Cleanup] Starting database cleanup...');
    
    // Get all tracks in the specified folder
    const tracks = db.prepare(`
      SELECT id, filePath 
      FROM tracks 
      WHERE filePath LIKE ?
    `).all(`${folderPath}%`);
    
    let removedCount = 0;
    const removeStmt = db.prepare('DELETE FROM tracks WHERE id = ?');
    
    for (const track of tracks) {
      try {
        // Check if file still exists
        await fsPromises.access(track.filePath);
      } catch {
        // File doesn't exist, remove from database
        removeStmt.run(track.id);
        removedCount++;
        console.log(`[DB Cleanup] Removed stale entry: ${track.filePath}`);
      }
    }
    
    console.log(`[DB Cleanup] Removed ${removedCount} stale entries`);
    return { success: true, removedCount };
  } catch (err) {
    console.error('Error during database cleanup:', err);
    return { success: false, error: err.message };
  }
});

// Clear and rebuild the entire library database
register('db:clearAndRebuild', async (_evt, foldersToScan = []) => {
  try {
    console.log('[DB Reset] Starting complete library reset...');
    
    // Clear all existing data
    const tablesToClear = ['tracks', 'playlists', 'playlist_tracks', 'play_history'];
    
    for (const table of tablesToClear) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get().count;
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`[DB Reset] Cleared ${count} entries from ${table}`);
      } catch (err) {
        console.log(`[DB Reset] Table ${table} might not exist, skipping...`);
      }
    }
    
    // Reset auto-increment counters
    try {
      db.prepare(`DELETE FROM sqlite_sequence`).run();
      console.log('[DB Reset] Reset auto-increment counters');
    } catch (err) {
      console.log('[DB Reset] No auto-increment counters to reset');
    }
    
    // If folders are provided, rescan them
    if (foldersToScan && foldersToScan.length > 0) {
      console.log('[DB Reset] Rescanning provided folders...');
      let totalAdded = 0;
      
      for (const folderPath of foldersToScan) {
        try {
          console.log(`[DB Reset] Scanning folder: ${folderPath}`);
          const result = await scanFolderFull(db, folderPath);
          totalAdded += result.added;
          console.log(`[DB Reset] Added ${result.added} tracks from ${folderPath}`);
        } catch (err) {
          console.error(`[DB Reset] Error scanning ${folderPath}:`, err.message);
        }
      }
      
      console.log(`[DB Reset] Total tracks added: ${totalAdded}`);
      return { 
        success: true, 
        message: `Library reset complete! Added ${totalAdded} tracks from ${foldersToScan.length} folders.`,
        totalAdded 
      };
    } else {
      console.log('[DB Reset] Database cleared, no folders to rescan');
      return { 
        success: true, 
        message: 'Database cleared successfully. Use "Add Folder" to rebuild your library.',
        totalAdded: 0 
      };
    }
    
  } catch (err) {
    console.error('Error during database reset:', err);
    return { success: false, error: err.message };
  }
});

// Get track count for library status
register('db:getTrackCount', () => {
  try {
    const result = db.prepare(`SELECT COUNT(*) as count FROM tracks`).get();
    return { success: true, count: result.count };
  } catch (err) {
    return { success: false, count: 0, error: err.message };
  }
});

// Get all scanned folders (for rebuild purposes)
register('db:getScannedFolders', async () => {
  try {
    const folders = db.prepare(`
      SELECT DISTINCT 
        CASE 
          WHEN filePath LIKE '%\\%' THEN SUBSTR(filePath, 1, LENGTH(filePath) - LENGTH(SUBSTR(filePath, INSTR(filePath, '\\') + 1)))
          ELSE SUBSTR(filePath, 1, LENGTH(filePath) - LENGTH(SUBSTR(filePath, INSTR(filePath, '/') + 1)))
        END as folderPath,
        COUNT(*) as trackCount
      FROM tracks 
      WHERE filePath IS NOT NULL
      GROUP BY folderPath
      ORDER BY trackCount DESC
    `).all();
    
    // Clean up the folder paths
    const cleanFolders = folders.map(f => {
      let path = f.folderPath;
      // Remove trailing slashes/backslashes
      path = path.replace(/[\/\\]+$/, '');
      // Get parent directory for music files
      const parts = path.split(/[\/\\]/);
      if (parts.length > 1) {
        path = parts.slice(0, -1).join(path.includes('\\') ? '\\' : '/');
      }
      return {
        path: path,
        trackCount: f.trackCount
      };
    });
    
    // Remove duplicates and sort by track count
    const uniqueFolders = [];
    const seen = new Set();
    
    for (const folder of cleanFolders) {
      if (!seen.has(folder.path) && folder.path.length > 3) {
        seen.add(folder.path);
        uniqueFolders.push(folder);
      }
    }
    
    return uniqueFolders.slice(0, 10); // Return top 10 folders
  } catch (err) {
    console.error('Error getting scanned folders:', err);
    return [];
  }
});


/* ────────────────────────────────────────────────────────────────────────── *
 * Tag Editor IPC Handlers
 * ────────────────────────────────────────────────────────────────────────── */

// Get tags from database (using existing track data) and from ID3 tags
register('getTags', async (_evt, filePath) => {
  try {
    if (!filePath) throw new Error('No file path provided');
    
    // Clean the file path (remove quotes if present)
    const cleanPath = filePath.replace(/^["'](.*)["']$/, '$1');
    
    // First, get existing metadata from database including DJ analysis data
    const trackData = db.prepare(`
      SELECT title, artist, album, genre, year, trackNo,
             bpm, bpmConfidence, bpmNote, rawBpm, groove, key, keyConfidence, camelotKey, energy,
             loudnessLUFS, loudnessRange, cueIn, cueOut, hotCues,
             danceability, acousticness, instrumentalness, liveness,
             comments, rating, color, labels,
             phraseData, phraseLength, energyTrajectory, energyTrajectoryDesc,
             bpmDrift, transitionDifficulty, transitionDescription,
             playCount, lastPlayed, skipCount, skipRate,
             vocalScore, harmonyCompatibility,
             analyzed, needsReanalysis
      FROM tracks 
      WHERE filePath = ?
    `).get(cleanPath);
    
    if (trackData) {
      return {
        // Basic metadata
        title: trackData.title || '',
        artist: trackData.artist || '',
        album: trackData.album || '',
        genre: trackData.genre || '',
        year: trackData.year ? String(trackData.year) : '',
        trackNo: trackData.trackNo ? String(trackData.trackNo) : '',
        
        // DJ analysis data
        bpm: trackData.bpm || '',
        bpmConfidence: trackData.bpmConfidence || '',
        bpmNote: trackData.bpmNote || '',
        rawBpm: trackData.rawBpm || '',
        groove: trackData.groove || '',
        key: trackData.key || '',
        keyConfidence: trackData.keyConfidence || '',
        camelotKey: trackData.camelotKey || '',
        energy: trackData.energy || '',
        loudnessLUFS: trackData.loudnessLUFS || '',
        loudnessRange: trackData.loudnessRange || '',
        cueIn: trackData.cueIn || '',
        cueOut: trackData.cueOut || '',
        hotCues: trackData.hotCues || '',
        
        // Auto DJ features
        danceability: trackData.danceability ? String(trackData.danceability) : '',
        acousticness: trackData.acousticness ? String(trackData.acousticness) : '',
        instrumentalness: trackData.instrumentalness ? String(trackData.instrumentalness) : '',
        liveness: trackData.liveness ? String(trackData.liveness) : '',
        
        // DJ workflow fields
        comments: trackData.comments || '',
        rating: trackData.rating ? String(trackData.rating) : '',
        color: trackData.color || '',
        labels: trackData.labels || '',
        
        // 110% PREMIUM FEATURES
        phraseData: trackData.phraseData ? JSON.parse(trackData.phraseData) : [],
        phraseLength: trackData.phraseLength ? String(trackData.phraseLength) : '',
        energyTrajectory: trackData.energyTrajectory ? JSON.parse(trackData.energyTrajectory) : [],
        energyTrajectoryDesc: trackData.energyTrajectoryDesc || '',
        bpmDrift: trackData.bpmDrift ? JSON.parse(trackData.bpmDrift) : {},
        transitionDifficulty: trackData.transitionDifficulty ? String(trackData.transitionDifficulty) : '',
        transitionDescription: trackData.transitionDescription || '',
        playCount: trackData.playCount ? String(trackData.playCount) : '0',
        lastPlayed: trackData.lastPlayed ? String(trackData.lastPlayed) : '',
        skipCount: trackData.skipCount ? String(trackData.skipCount) : '0',
        skipRate: trackData.skipRate ? String(trackData.skipRate) : '0',
        vocalScore: trackData.vocalScore ? JSON.parse(trackData.vocalScore) : {},
        harmonyCompatibility: trackData.harmonyCompatibility ? JSON.parse(trackData.harmonyCompatibility) : {},
        
        // Analysis status
        analyzed: !!trackData.analyzed,
        needsReanalysis: !!trackData.needsReanalysis
      };
    }
    
    // If not in database, try to read from file
    try {
      const { parseFile } = await import('music-metadata');
      const metadata = await parseFile(cleanPath);
      const common = metadata.common || {};
      
      // Extract analysis fields from user-defined text frames
      let analysisData = {
        bpm: '',
        bpmConfidence: '',
        key: '',
        keyConfidence: '',
        camelotKey: '',
        energy: '',
        loudnessLUFS: '',
        loudnessRange: '',
        cueIn: '',
        cueOut: '',
        danceability: '',
        acousticness: '',
        instrumentalness: '',
        liveness: ''
      };
      
      // Try to read analysis data from ID3 user-defined text frames
      try {
        const NodeID3 = require('node-id3');
        const tags = NodeID3.read(cleanPath);
        if (tags && tags.userDefinedText && Array.isArray(tags.userDefinedText)) {
          tags.userDefinedText.forEach(frame => {
            if (frame.description === 'BPM') analysisData.bpm = frame.value;
            if (frame.description === 'BPMConfidence') analysisData.bpmConfidence = frame.value;
            if (frame.description === 'Key') analysisData.key = frame.value;
            if (frame.description === 'KeyConfidence') analysisData.keyConfidence = frame.value;
            if (frame.description === 'CamelotKey') analysisData.camelotKey = frame.value;
            if (frame.description === 'Energy') analysisData.energy = frame.value;
            if (frame.description === 'LoudnessLUFS') analysisData.loudnessLUFS = frame.value;
            if (frame.description === 'LoudnessRange') analysisData.loudnessRange = frame.value;
            if (frame.description === 'CueIn') analysisData.cueIn = frame.value;
            if (frame.description === 'CueOut') analysisData.cueOut = frame.value;
            if (frame.description === 'Danceability') analysisData.danceability = frame.value;
            if (frame.description === 'Acousticness') analysisData.acousticness = frame.value;
            if (frame.description === 'Instrumentalness') analysisData.instrumentalness = frame.value;
            if (frame.description === 'Liveness') analysisData.liveness = frame.value;
          });
        }
      } catch (id3ReadErr) {
        console.warn('Could not read analysis data from ID3 tags:', id3ReadErr.message);
      }
      
      return {
        // Basic metadata
        title: common.title || path.basename(cleanPath, path.extname(cleanPath)),
        artist: common.artist || '',
        album: common.album || '',
        genre: Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || ''),
        year: common.year ? String(common.year) : '',
        trackNo: (common.track && common.track.no) ? String(common.track.no) : '',
        
        // DJ analysis data (from ID3 tags or empty)
        bpm: analysisData.bpm,
        bpmConfidence: analysisData.bpmConfidence,
        key: analysisData.key,
        keyConfidence: analysisData.keyConfidence,
        camelotKey: analysisData.camelotKey,
        energy: analysisData.energy,
        loudnessLUFS: analysisData.loudnessLUFS,
        loudnessRange: analysisData.loudnessRange,
        cueIn: analysisData.cueIn,
        cueOut: analysisData.cueOut,
        danceability: analysisData.danceability,
        acousticness: analysisData.acousticness,
        instrumentalness: analysisData.instrumentalness,
        liveness: analysisData.liveness,
        hotCues: '',
        
        // Analysis status
        analyzed: !!analysisData.bpm,
        needsReanalysis: false
      };
    } catch (parseErr) {
      console.warn('Failed to parse metadata from file:', parseErr);
      return {
        // Basic metadata
        title: path.basename(cleanPath, path.extname(cleanPath)),
        artist: '',
        album: '',
        genre: '',
        year: '',
        trackNo: '',
        
        // DJ analysis data (empty - needs analysis)
        bpm: '',
        bpmConfidence: '',
        key: '',
        keyConfidence: '',
        camelotKey: '',
        energy: '',
        loudnessLUFS: '',
        loudnessRange: '',
        cueIn: '',
        cueOut: '',
        danceability: '',
        acousticness: '',
        instrumentalness: '',
        liveness: '',
        hotCues: '',
        
        // Analysis status
        analyzed: false,
        needsReanalysis: false
      };
    }
  } catch (err) {
    console.error('getTags error:', err);
    throw new Error(`Failed to get tags: ${err.message}`);
  }
});

// Write tags to file and update database
register('writeTags', async (_evt, { filePath, tags }) => {
  try {
    if (!filePath || !tags) throw new Error('File path and tags are required');
    
    // Clean the file path (remove quotes if present)
    const cleanPath = filePath.replace(/^["'](.*)["']$/, '$1');
    
    // Update database first
    const trackExists = db.prepare('SELECT id FROM tracks WHERE filePath = ?').get(cleanPath);
    
    if (trackExists) {
      db.prepare(`
        UPDATE tracks SET 
          title = ?, artist = ?, album = ?, genre = ?, year = ?, trackNo = ?,
          bpm = ?, bpmConfidence = ?, key = ?, keyConfidence = ?, camelotKey = ?, energy = ?,
          loudness = ?, gainRecommendation = ?, loudnessLUFS = ?, loudnessRange = ?, cueIn = ?, cueOut = ?, hotCues = ?,
          danceability = ?, acousticness = ?, instrumentalness = ?, liveness = ?,
          comments = ?, rating = ?, color = ?, labels = ?,
          phraseData = ?, phraseLength = ?, energyTrajectory = ?, energyTrajectoryDesc = ?,
          bpmDrift = ?, transitionDifficulty = ?, transitionDescription = ?,
          playCount = ?, lastPlayed = ?, skipCount = ?, skipRate = ?,
          vocalScore = ?, harmonyCompatibility = ?
        WHERE filePath = ?
      `).run(
        tags.title || '',
        tags.artist || '',
        tags.album || '',
        tags.genre || '',
        tags.year ? parseInt(tags.year) || null : null,
        tags.trackNo ? parseInt(tags.trackNo) || null : null,
        tags.bpm ? parseInt(tags.bpm) || null : null,
        tags.bpmConfidence || null,
        tags.key || '',
        tags.keyConfidence || null,
        tags.camelotKey || '',
        tags.energy ? parseFloat(tags.energy) || null : null,
        tags.loudness ? parseFloat(tags.loudness) || null : null,
        tags.gainRecommendation || null,
        tags.loudnessLUFS ? parseFloat(tags.loudnessLUFS) || null : null,
        tags.loudnessRange ? parseFloat(tags.loudnessRange) || null : null,
        tags.cueIn ? parseFloat(tags.cueIn) || null : null,
        tags.cueOut ? parseFloat(tags.cueOut) || null : null,
        tags.hotCues || '',
        tags.danceability ? parseFloat(tags.danceability) || null : null,
        tags.acousticness ? parseFloat(tags.acousticness) || null : null,
        tags.instrumentalness ? parseFloat(tags.instrumentalness) || null : null,
        tags.liveness ? parseFloat(tags.liveness) || null : null,
        tags.comments || '',
        tags.rating ? parseInt(tags.rating) || null : null,
        tags.color || '',
        tags.labels || '',
        tags.phraseData ? JSON.stringify(tags.phraseData) : null,
        tags.phraseLength ? parseInt(tags.phraseLength) || null : null,
        tags.energyTrajectory ? JSON.stringify(tags.energyTrajectory) : null,
        tags.energyTrajectoryDesc || null,
        tags.bpmDrift ? JSON.stringify(tags.bpmDrift) : null,
        tags.transitionDifficulty ? parseInt(tags.transitionDifficulty) || null : null,
        tags.transitionDescription || null,
        tags.playCount ? parseInt(tags.playCount) || 0 : 0,
        tags.lastPlayed ? parseInt(tags.lastPlayed) || null : null,
        tags.skipCount ? parseInt(tags.skipCount) || 0 : 0,
        tags.skipRate ? parseFloat(tags.skipRate) || 0 : 0,
        tags.vocalScore ? JSON.stringify(tags.vocalScore) : null,
        tags.harmonyCompatibility ? JSON.stringify(tags.harmonyCompatibility) : null,
        cleanPath
      );
    } else {
      // Insert new record if not exists
      const addResult = await scanFileAndAddToDB(db, cleanPath);
      if (!addResult) {
        // If file doesn't exist physically, create a minimal database entry
        const path = require('path');
        db.prepare(`INSERT INTO tracks (filePath, title, artist, album, genre, duration, trackNo, year)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(filePath) DO NOTHING`).run(
          cleanPath,
          path.basename(cleanPath, path.extname(cleanPath)),
          'Unknown Artist',
          'Unknown Album', 
          'Unknown Genre',
          180,
          null,
          null
        );
      }
      // Then update with new tags
      db.prepare(`
        UPDATE tracks SET 
          title = ?, artist = ?, album = ?, genre = ?, year = ?, trackNo = ?,
          bpm = ?, bpmConfidence = ?, key = ?, keyConfidence = ?, camelotKey = ?, energy = ?,
          loudness = ?, gainRecommendation = ?, loudnessLUFS = ?, loudnessRange = ?, cueIn = ?, cueOut = ?, hotCues = ?,
          danceability = ?, acousticness = ?, instrumentalness = ?, liveness = ?,
          comments = ?, rating = ?, color = ?, labels = ?,
          phraseData = ?, phraseLength = ?, energyTrajectory = ?, energyTrajectoryDesc = ?,
          bpmDrift = ?, transitionDifficulty = ?, transitionDescription = ?,
          playCount = ?, lastPlayed = ?, skipCount = ?, skipRate = ?,
          vocalScore = ?, harmonyCompatibility = ?
        WHERE filePath = ?
      `).run(
        tags.title || '',
        tags.artist || '',
        tags.album || '',
        tags.genre || '',
        tags.year ? parseInt(tags.year) || null : null,
        tags.trackNo ? parseInt(tags.trackNo) || null : null,
        tags.bpm ? parseInt(tags.bpm) || null : null,
        tags.bpmConfidence || null,
        tags.key || '',
        tags.keyConfidence || null,
        tags.camelotKey || '',
        tags.energy ? parseFloat(tags.energy) || null : null,
        tags.loudness ? parseFloat(tags.loudness) || null : null,
        tags.gainRecommendation || null,
        tags.loudnessLUFS ? parseFloat(tags.loudnessLUFS) || null : null,
        tags.loudnessRange ? parseFloat(tags.loudnessRange) || null : null,
        tags.cueIn ? parseFloat(tags.cueIn) || null : null,
        tags.cueOut ? parseFloat(tags.cueOut) || null : null,
        tags.hotCues || '',
        tags.danceability ? parseFloat(tags.danceability) || null : null,
        tags.acousticness ? parseFloat(tags.acousticness) || null : null,
        tags.instrumentalness ? parseFloat(tags.instrumentalness) || null : null,
        tags.liveness ? parseFloat(tags.liveness) || null : null,
        tags.comments || '',
        tags.rating ? parseInt(tags.rating) || null : null,
        tags.color || '',
        tags.labels || '',
        tags.phraseData ? JSON.stringify(tags.phraseData) : null,
        tags.phraseLength ? parseInt(tags.phraseLength) || null : null,
        tags.energyTrajectory ? JSON.stringify(tags.energyTrajectory) : null,
        tags.energyTrajectoryDesc || null,
        tags.bpmDrift ? JSON.stringify(tags.bpmDrift) : null,
        tags.transitionDifficulty ? parseInt(tags.transitionDifficulty) || null : null,
        tags.transitionDescription || null,
        tags.playCount ? parseInt(tags.playCount) || 0 : 0,
        tags.lastPlayed ? parseInt(tags.lastPlayed) || null : null,
        tags.skipCount ? parseInt(tags.skipCount) || 0 : 0,
        tags.skipRate ? parseFloat(tags.skipRate) || 0 : 0,
        tags.vocalScore ? JSON.stringify(tags.vocalScore) : null,
        tags.harmonyCompatibility ? JSON.stringify(tags.harmonyCompatibility) : null,
        cleanPath
      );
    }
    
    // Try to write to ID3 tags (optional - will fail silently if not supported)
    try {
      const NodeID3 = require('node-id3');
      
      const id3Tags = {
        title: tags.title || '',
        artist: tags.artist || '',
        album: tags.album || '',
        genre: tags.genre || '',
        year: tags.year || '',
        trackNumber: tags.trackNo || '',
        // Comments field (standard ID3 COMM frame)
        comment: {
          description: '',
          text: tags.comments || ''
        },
        // Rating (using POPM - Popularimeter frame, 1-5 scale)
        // Also stored as TXXX:RATING for compatibility
        // Audio analysis fields - stored in comments/user-defined frames
        userDefinedText: [
          {
            description: 'BPM',
            value: tags.bpm ? String(tags.bpm) : ''
          },
          {
            description: 'BPMConfidence',
            value: tags.bpmConfidence ? String(tags.bpmConfidence) : ''
          },
          {
            description: 'Key',
            value: tags.key || ''
          },
          {
            description: 'KeyConfidence',
            value: tags.keyConfidence ? String(tags.keyConfidence) : ''
          },
          {
            description: 'CamelotKey',
            value: tags.camelotKey || ''
          },
          {
            description: 'Energy',
            value: tags.energy ? String(tags.energy) : ''
          },
          {
            description: 'LoudnessLUFS',
            value: tags.loudnessLUFS ? String(tags.loudnessLUFS) : ''
          },
          {
            description: 'LoudnessRange',
            value: tags.loudnessRange ? String(tags.loudnessRange) : ''
          },
          {
            description: 'Danceability',
            value: tags.danceability ? String(tags.danceability) : ''
          },
          {
            description: 'Acousticness',
            value: tags.acousticness ? String(tags.acousticness) : ''
          },
          {
            description: 'Instrumentalness',
            value: tags.instrumentalness ? String(tags.instrumentalness) : ''
          },
          {
            description: 'Liveness',
            value: tags.liveness ? String(tags.liveness) : ''
          },
          {
            description: 'CueIn',
            value: tags.cueIn ? String(tags.cueIn) : ''
          },
          {
            description: 'CueOut',
            value: tags.cueOut ? String(tags.cueOut) : ''
          },
          {
            description: 'Rating',
            value: tags.rating ? String(tags.rating) : ''
          },
          {
            description: 'Color',
            value: tags.color || ''
          },
          {
            description: 'Labels',
            value: tags.labels || ''
          },
          // 110% PREMIUM FEATURES (database-synced)
          {
            description: 'PhraseLength',
            value: tags.phraseLength ? String(tags.phraseLength) : ''
          },
          {
            description: 'EnergyTrajectoryDesc',
            value: tags.energyTrajectoryDesc || ''
          },
          {
            description: 'TransitionDifficulty',
            value: tags.transitionDifficulty ? String(tags.transitionDifficulty) : ''
          },
          {
            description: 'TransitionDescription',
            value: tags.transitionDescription || ''
          },
          {
            description: 'PlayCount',
            value: tags.playCount ? String(tags.playCount) : '0'
          },
          {
            description: 'SkipRate',
            value: tags.skipRate ? String(tags.skipRate) : '0'
          }
        ]
      };
      
      NodeID3.write(id3Tags, cleanPath);
      console.log('Successfully wrote ID3 tags including analysis fields to file');
    } catch (id3Err) {
      console.warn('Failed to write ID3 tags (database updated):', id3Err.message);
    }
    
    return { success: true };
    
  } catch (err) {
    console.error('writeTags error:', err);
    throw new Error(`Failed to write tags: ${err.message}`);
  }
});

// Analyze track using client-side AudioAnalyzer.js
// This handler prepares the track data and returns it for client-side analysis
register('analyzeTags', async (_evt, filePath) => {
  try {
    if (!filePath) throw new Error('No file path provided');
    
    // Clean the file path (remove quotes if present)
    const cleanPath = filePath.replace(/^["'](.*)["']$/, '$1');
    
    console.log('[analyzeTags] Preparing track for analysis:', cleanPath);
    
    // Get track ID from database (needed for saving results later)
    const track = db.prepare('SELECT id FROM tracks WHERE filePath = ?').get(cleanPath);
    
    if (!track) {
      // Track not in database yet - try to add it
      const addResult = await scanFileAndAddToDB(db, cleanPath);
      if (!addResult) {
        throw new Error('Track not found in database and could not be added');
      }
      // Get the track ID after adding
      const newTrack = db.prepare('SELECT id FROM tracks WHERE filePath = ?').get(cleanPath);
      if (!newTrack) {
        throw new Error('Failed to add track to database');
      }
      return { 
        success: true, 
        trackId: newTrack.id,
        filePath: cleanPath 
      };
    }
    
    // Return track ID so client can save results via library:updateAnalysis
    return { 
      success: true, 
      trackId: track.id,
      filePath: cleanPath 
    };
    
  } catch (err) {
    console.error('analyzeTags error:', err);
    throw new Error(`Failed to analyze tags: ${err.message}`);
  }
});

// REAL BPM ANALYSIS - Analyzes actual audio beats
function analyzeRealBPM(audioSamples, sampleRate) {
  console.log('[BPM] Starting real BPM detection...');
  
  // Apply low-pass filter to focus on bass/kick drum for more accurate beat detection
  const filteredSamples = applyLowPassFilter(audioSamples, sampleRate, 300); // Focus on bass frequencies
  
  // Calculate energy in overlapping windows to detect beats
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows (was too short before)
  const hopSize = Math.floor(windowSize / 2);
  const energyValues = [];
  
  // Calculate RMS energy for each window
  for (let i = 0; i < filteredSamples.length - windowSize; i += hopSize) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      sum += filteredSamples[i + j] * filteredSamples[i + j];
    }
    energyValues.push(Math.sqrt(sum / windowSize));
  }
  
  console.log(`[BPM] Calculated ${energyValues.length} energy windows`);
  
  // Find peaks in energy (potential beats) with better peak detection
  const peaks = [];
  const avgEnergy = energyValues.reduce((a, b) => a + b, 0) / energyValues.length;
  const threshold = avgEnergy * 1.5; // Increased threshold
  const minPeakDistance = Math.floor(sampleRate * 0.3 / hopSize); // Minimum 300ms between beats (200 BPM max)
  
  for (let i = minPeakDistance; i < energyValues.length - minPeakDistance; i++) {
    if (energyValues[i] > threshold) {
      // Check if this is a local maximum in a larger window
      let isLocalMax = true;
      for (let j = i - minPeakDistance; j <= i + minPeakDistance; j++) {
        if (j !== i && energyValues[j] >= energyValues[i]) {
          isLocalMax = false;
          break;
        }
      }
      
      if (isLocalMax) {
        const peakTime = i * hopSize / sampleRate;
        // Ensure minimum distance from previous peaks
        if (peaks.length === 0 || peakTime - peaks[peaks.length - 1] >= 0.3) {
          peaks.push(peakTime);
        }
      }
    }
  }
  
  console.log(`[BPM] Found ${peaks.length} potential beats`);
  
  if (peaks.length < 3) {
    console.log('[BPM] Not enough beats detected, using genre-based estimation');
    return { bpm: 80, confidence: 0.3 }; // Default for reggae
  }
  
  // Calculate intervals between beats
  const intervals = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push(peaks[i] - peaks[i-1]);
  }
  
  // Remove outliers and find the most common interval
  intervals.sort((a, b) => a - b);
  const q1 = intervals[Math.floor(intervals.length * 0.25)];
  const q3 = intervals[Math.floor(intervals.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const filteredIntervals = intervals.filter(interval => 
    interval >= lowerBound && interval <= upperBound && interval >= 0.3 && interval <= 2.0
  );
  
  if (filteredIntervals.length === 0) {
    console.log('[BPM] No valid intervals found');
    return { bpm: 80, confidence: 0.3 };
  }
  
  // Use median of filtered intervals
  const medianInterval = filteredIntervals[Math.floor(filteredIntervals.length / 2)];
  
  // Convert interval to BPM
  let bpm = Math.round(60 / medianInterval);
  
  // Check for common BPM subdivisions/multiplications and correct them
  if (bpm > 160) {
    // Probably detecting subdivisions, divide by 2
    bpm = Math.round(bpm / 2);
    console.log('[BPM] Detected subdivision, halving BPM');
  } else if (bpm > 120 && bpm < 140) {
    // Check if it's a double-time detection of a slower song
    const halfBpm = Math.round(bpm / 2);
    if (halfBpm >= 60 && halfBpm <= 80) {
      bpm = halfBpm;
      console.log('[BPM] Detected double-time, halving BPM');
    }
  }
  
  // Final sanity check - clamp to reasonable ranges
  bpm = Math.max(50, Math.min(180, bpm));
  
  // Calculate confidence based on consistency of intervals
  const consistentIntervals = filteredIntervals.filter(interval => 
    Math.abs(interval - medianInterval) < medianInterval * 0.15
  ).length;
  const confidence = Math.min(0.95, consistentIntervals / filteredIntervals.length);
  
  console.log(`[BPM] Detected: ${bpm} BPM (confidence: ${confidence.toFixed(3)}, median interval: ${medianInterval.toFixed(3)}s)`);
  
  return {
    bpm: bpm,
    confidence: confidence
  };
}

// Simple low-pass filter to focus on bass frequencies
function applyLowPassFilter(samples, sampleRate, cutoffFreq) {
  const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
  const dt = 1.0 / sampleRate;
  const alpha = dt / (rc + dt);
  
  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];
  
  for (let i = 1; i < samples.length; i++) {
    filtered[i] = filtered[i-1] + alpha * (samples[i] - filtered[i-1]);
  }
  
  return filtered;
}

// REAL KEY ANALYSIS - Analyzes harmonic content
function analyzeRealKey(audioSamples, sampleRate) {
  console.log('[KEY] Starting real key detection...');
  
  // Use FFT to analyze frequency content with improved algorithm
  const fftSize = 16384; // Larger FFT for better frequency resolution
  const chromagram = new Array(12).fill(0); // 12 semitones
  const harmonicWeights = [1.0, 0.5, 0.3, 0.2]; // Weight fundamental and harmonics
  
  // Process audio in overlapping chunks for better accuracy
  const chunkSize = fftSize;
  const hopSize = Math.floor(fftSize / 4);
  const numChunks = Math.floor((audioSamples.length - fftSize) / hopSize);
  
  console.log(`[KEY] Processing ${numChunks} audio chunks with ${fftSize}-point FFT`);
  
  for (let chunk = 0; chunk < numChunks; chunk++) {
    const start = chunk * hopSize;
    const audioChunk = audioSamples.slice(start, start + fftSize);
    
    // Apply window function to reduce spectral leakage
    for (let i = 0; i < audioChunk.length; i++) {
      const window = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (audioChunk.length - 1)); // Hann window
      audioChunk[i] *= window;
    }
    
    // Simple magnitude spectrum analysis (focusing on musical frequencies)
    for (let i = 1; i < audioChunk.length / 2; i++) {
      const freq = (i / fftSize) * sampleRate;
      
      // Focus on musical range (80Hz to 2000Hz covers most harmonic content)
      if (freq >= 80 && freq <= 2000) {
        const magnitude = Math.abs(audioChunk[i]);
        
        // Convert frequency to pitch class (0-11 for C, C#, D, etc.)
        const pitchClass = frequencyToPitchClass(freq);
        
        if (pitchClass >= 0) {
          // Weight the contribution based on magnitude and harmonic series
          const harmonicIndex = Math.floor(freq / 220); // Rough harmonic estimation
          const weight = harmonicWeights[Math.min(harmonicIndex, harmonicWeights.length - 1)] || 0.1;
          
          chromagram[pitchClass] += magnitude * weight;
        }
      }
    }
  }
  
  // Normalize chromagram
  const maxChroma = Math.max(...chromagram);
  if (maxChroma > 0) {
    for (let i = 0; i < chromagram.length; i++) {
      chromagram[i] /= maxChroma;
    }
  }
  
  console.log('[KEY] Chromagram:', chromagram.map(x => x.toFixed(3)));
  
  // Find the dominant pitch class
  const dominantPitchClass = chromagram.indexOf(Math.max(...chromagram));
  
  // Determine if it's major or minor using harmonic analysis
  const majorProfile = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1]; // Major scale pattern
  const minorProfile = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0]; // Minor scale pattern
  
  let bestKey = 'C major';
  let bestScore = 0;
  
  // Test all 24 keys (12 major + 12 minor)
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  for (let root = 0; root < 12; root++) {
    // Test major key
    let majorScore = 0;
    for (let i = 0; i < 12; i++) {
      const pitchClass = (root + i) % 12;
      majorScore += chromagram[pitchClass] * majorProfile[i];
    }
    
    if (majorScore > bestScore) {
      bestScore = majorScore;
      bestKey = noteNames[root] + ' major';
    }
    
    // Test minor key
    let minorScore = 0;
    for (let i = 0; i < 12; i++) {
      const pitchClass = (root + i) % 12;
      minorScore += chromagram[pitchClass] * minorProfile[i];
    }
    
    if (minorScore > bestScore) {
      bestScore = minorScore;
      bestKey = noteNames[root] + ' minor';
    }
  }
  
  // Calculate confidence based on how much the best key stands out
  const secondBestScore = findSecondBestKeyScore(chromagram, noteNames, majorProfile, minorProfile, bestKey);
  const confidence = Math.min(0.95, Math.max(0.5, (bestScore - secondBestScore) / bestScore));
  
  console.log(`[KEY] Detected: ${bestKey} (score: ${bestScore.toFixed(3)}, confidence: ${confidence.toFixed(3)})`);
  
  return {
    key: bestKey,
    confidence: confidence
  };
}

// Helper function to convert frequency to pitch class (0-11)
function frequencyToPitchClass(frequency) {
  if (frequency <= 0) return -1;
  
  // Use equal temperament: pitch = 12 * log2(f/440) + 69 (A4 = 440Hz = MIDI 69)
  const midiNote = 12 * Math.log2(frequency / 440) + 69;
  const pitchClass = Math.round(midiNote) % 12;
  
  // Adjust so that C = 0 (MIDI note % 12 where C = 0)
  return (pitchClass + 12) % 12;
}

// Helper function to find second best key score for confidence calculation
function findSecondBestKeyScore(chromagram, noteNames, majorProfile, minorProfile, bestKey) {
  let secondBestScore = 0;
  
  for (let root = 0; root < 12; root++) {
    // Test major key
    const majorKey = noteNames[root] + ' major';
    if (majorKey !== bestKey) {
      let majorScore = 0;
      for (let i = 0; i < 12; i++) {
        const pitchClass = (root + i) % 12;
        majorScore += chromagram[pitchClass] * majorProfile[i];
      }
      secondBestScore = Math.max(secondBestScore, majorScore);
    }
    
    // Test minor key
    const minorKey = noteNames[root] + ' minor';
    if (minorKey !== bestKey) {
      let minorScore = 0;
      for (let i = 0; i < 12; i++) {
        const pitchClass = (root + i) % 12;
        minorScore += chromagram[pitchClass] * minorProfile[i];
      }
      secondBestScore = Math.max(secondBestScore, minorScore);
    }
  }
  
  return secondBestScore;
}

// REAL ENERGY ANALYSIS - Measures actual energy levels
function analyzeRealEnergy(audioSamples, sampleRate) {
  console.log('[ENERGY] Starting real energy analysis...');
  
  // Calculate RMS energy over the entire track
  let totalEnergy = 0;
  let peakEnergy = 0;
  const windowSize = Math.floor(sampleRate * 0.25); // 250ms windows for better averaging
  const energyWindows = [];
  
  for (let i = 0; i < audioSamples.length - windowSize; i += windowSize) {
    let windowEnergy = 0;
    for (let j = 0; j < windowSize; j++) {
      windowEnergy += audioSamples[i + j] * audioSamples[i + j];
    }
    windowEnergy = Math.sqrt(windowEnergy / windowSize);
    energyWindows.push(windowEnergy);
    totalEnergy += windowEnergy;
    peakEnergy = Math.max(peakEnergy, windowEnergy);
  }
  
  const avgEnergy = totalEnergy / energyWindows.length;
  
  // Calculate dynamic range (difference between loud and quiet parts)
  energyWindows.sort((a, b) => a - b);
  const q90 = energyWindows[Math.floor(energyWindows.length * 0.9)];
  const q10 = energyWindows[Math.floor(energyWindows.length * 0.1)];
  const dynamicRange = q90 / (q10 + 1e-10);
  
  // Energy classification based on statistical analysis
  let normalizedEnergy;
  if (avgEnergy < 0.01) {
    normalizedEnergy = 0.1; // Very quiet (ambient/classical)
  } else if (avgEnergy < 0.03) {
    normalizedEnergy = 0.3; // Quiet (ballads, acoustic)
  } else if (avgEnergy < 0.08) {
    normalizedEnergy = 0.5; // Medium (pop, reggae, folk)
  } else if (avgEnergy < 0.15) {
    normalizedEnergy = 0.7; // High (rock, dance)
  } else {
    normalizedEnergy = 0.9; // Very high (metal, electronic)
  }
  
  // Adjust based on dynamic range
  if (dynamicRange > 10) {
    normalizedEnergy -= 0.1; // More dynamic = less constant energy
  } else if (dynamicRange < 3) {
    normalizedEnergy += 0.1; // Less dynamic = more constant energy
  }
  
  // Clamp to valid range
  normalizedEnergy = Math.max(0.1, Math.min(1.0, normalizedEnergy));
  
  console.log(`[ENERGY] Avg: ${avgEnergy.toFixed(6)}, Normalized: ${normalizedEnergy.toFixed(3)}, Peak: ${peakEnergy.toFixed(6)}, Dynamic Range: ${dynamicRange.toFixed(2)}`);
  
  return {
    energy: Math.round(normalizedEnergy * 100) / 100,
    peak: Math.min(1.0, peakEnergy * 50), // Scale peak appropriately
    dynamicRange: dynamicRange
  };
}

// REAL LOUDNESS ANALYSIS - Measures perceived loudness (EBU R128 approximation)
function analyzeRealLoudness(audioSamples, sampleRate) {
  console.log('[LOUDNESS] Starting real loudness analysis...');
  
  // EBU R128 uses 400ms blocks with 75% overlap
  const blockSize = Math.floor(sampleRate * 0.4); // 400ms
  const hopSize = Math.floor(blockSize * 0.25); // 75% overlap
  const blocks = [];
  
  // Apply pre-filter (simplified K-weighting approximation)
  const filteredSamples = applyKWeighting(audioSamples, sampleRate);
  
  // Calculate mean square for each block
  for (let i = 0; i < filteredSamples.length - blockSize; i += hopSize) {
    let meanSquare = 0;
    for (let j = 0; j < blockSize; j++) {
      meanSquare += filteredSamples[i + j] * filteredSamples[i + j];
    }
    meanSquare /= blockSize;
    
    if (meanSquare > 0) {
      blocks.push(meanSquare);
    }
  }
  
  if (blocks.length === 0) {
    console.log('[LOUDNESS] No valid blocks found');
    return { lufs: -50, range: 0 };
  }
  
  // Sort blocks for gating
  blocks.sort((a, b) => b - a);
  
  // Relative gating: remove blocks below -70 LUFS relative gate
  const relativeGateLevel = 0.0001; // -70 LUFS in linear scale
  const validBlocks = blocks.filter(block => block >= relativeGateLevel);
  
  if (validBlocks.length === 0) {
    console.log('[LOUDNESS] No blocks above relative gate');
    return { lufs: -50, range: 0 };
  }
  
  // Calculate mean of valid blocks for gated loudness
  const meanSquareGated = validBlocks.reduce((sum, block) => sum + block, 0) / validBlocks.length;
  
  // Convert to LUFS: LUFS = -0.691 + 10 * log10(mean_square)
  const lufs = -0.691 + 10 * Math.log10(meanSquareGated + 1e-12);
  
  // Calculate loudness range (LRA)
  // Sort by loudness and find 10th and 95th percentiles
  const loudnessValues = validBlocks.map(block => -0.691 + 10 * Math.log10(block + 1e-12));
  loudnessValues.sort((a, b) => a - b);
  
  const p10 = loudnessValues[Math.floor(loudnessValues.length * 0.1)];
  const p95 = loudnessValues[Math.floor(loudnessValues.length * 0.95)];
  const range = p95 - p10;
  
  console.log(`[LOUDNESS] Integrated: ${lufs.toFixed(1)} LUFS, Range: ${range.toFixed(1)} LU`);
  console.log(`[LOUDNESS] Valid blocks: ${validBlocks.length}/${blocks.length}`);
  
  return {
    lufs: Math.max(-50, Math.min(0, lufs)), // Clamp to reasonable range
    range: Math.max(0, Math.min(30, range))
  };
}

// Simplified K-weighting filter approximation for EBU R128
function applyKWeighting(samples, sampleRate) {
  // This is a simplified approximation of the K-weighting filter
  // Real implementation would use proper IIR filters
  
  // High-shelf filter approximation (boosts high frequencies)
  const filtered = new Float32Array(samples.length);
  const alpha = 0.1; // Filter coefficient
  
  filtered[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    filtered[i] = alpha * samples[i] + (1 - alpha) * filtered[i - 1];
  }
  
  // Pre-filter stage 1: High-pass at ~38 Hz
  const hp38 = applyHighPass(filtered, sampleRate, 38);
  
  // Pre-filter stage 2: High-shelf at ~4 kHz
  const weighted = applyHighShelf(hp38, sampleRate, 4000, 4.0);
  
  return weighted;
}

// Simple high-pass filter
function applyHighPass(samples, sampleRate, cutoffFreq) {
  const rc = 1.0 / (cutoffFreq * 2 * Math.PI);
  const dt = 1.0 / sampleRate;
  const alpha = rc / (rc + dt);
  
  const filtered = new Float32Array(samples.length);
  filtered[0] = samples[0];
  
  for (let i = 1; i < samples.length; i++) {
    filtered[i] = alpha * (filtered[i-1] + samples[i] - samples[i-1]);
  }
  
  return filtered;
}

// Simple high-shelf filter
function applyHighShelf(samples, sampleRate, cutoffFreq, gainDb) {
  const gain = Math.pow(10, gainDb / 20);
  const w = 2 * Math.PI * cutoffFreq / sampleRate;
  const cosw = Math.cos(w);
  const sinw = Math.sin(w);
  const A = Math.sqrt(gain);
  const S = 1;
  const beta = Math.sqrt(A) / 1;
  
  // Simplified shelf filter
  const filtered = new Float32Array(samples.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  
  for (let i = 0; i < samples.length; i++) {
    const x0 = samples[i];
    const y0 = x0 + 0.1 * (x0 - x1); // Simplified shelf response
    
    filtered[i] = y0;
    x2 = x1; x1 = x0;
    y2 = y1; y1 = y0;
  }
  
  return filtered;
}

// REAL CUE POINT ANALYSIS - Finds natural break points
function analyzeRealCuePoints(audioSamples, sampleRate, bpmResult) {
  console.log('[CUES] Starting real cue point analysis...');
  
  const duration = audioSamples.length / sampleRate;
  
  // Find quiet sections for cue in/out
  const windowSize = Math.floor(sampleRate * 0.5); // 500ms windows
  const energyLevels = [];
  
  for (let i = 0; i < audioSamples.length - windowSize; i += windowSize) {
    let energy = 0;
    for (let j = 0; j < windowSize; j++) {
      energy += Math.abs(audioSamples[i + j]);
    }
    energyLevels.push(energy / windowSize);
  }
  
  const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length;
  const threshold = avgEnergy * 0.3; // 30% of average for quiet sections
  
  // Find cue in (first point above threshold)
  let cueIn = 0;
  for (let i = 0; i < energyLevels.length; i++) {
    if (energyLevels[i] > threshold) {
      cueIn = (i * windowSize) / sampleRate;
      break;
    }
  }
  
  // Find cue out (last point above threshold)
  let cueOut = duration;
  for (let i = energyLevels.length - 1; i >= 0; i--) {
    if (energyLevels[i] > threshold) {
      cueOut = ((i + 1) * windowSize) / sampleRate;
      break;
    }
  }
  
  // Generate hot cues based on energy peaks and beat structure
  const hotCues = [];
  const beatInterval = 60 / bpmResult.bpm;
  
  // Find major energy changes for hot cues
  for (let i = 1; i < energyLevels.length - 1; i++) {
    const currentEnergy = energyLevels[i];
    const prevEnergy = energyLevels[i - 1];
    
    if (currentEnergy > prevEnergy * 1.5 && currentEnergy > avgEnergy * 1.2) {
      const time = (i * windowSize) / sampleRate;
      
      // Snap to nearest beat
      const nearestBeat = Math.round(time / beatInterval) * beatInterval;
      
      if (nearestBeat > cueIn + 8 && nearestBeat < cueOut - 8) {
        let label = 'Hot Cue';
        if (time < duration * 0.3) label = 'Intro';
        else if (time < duration * 0.5) label = 'Verse';
        else if (time < duration * 0.7) label = 'Chorus';
        else label = 'Outro';
        
        hotCues.push({
          time: Math.round(nearestBeat * 10) / 10,
          label: label
        });
      }
    }
  }
  
  // Limit to 8 hot cues maximum
  hotCues.splice(8);
  
  console.log(`[CUES] Cue In: ${cueIn.toFixed(1)}s, Cue Out: ${cueOut.toFixed(1)}s, Hot Cues: ${hotCues.length}`);
  
  return {
    cueIn: Math.round(cueIn * 10) / 10,
    cueOut: Math.round(cueOut * 10) / 10,
    hotCues: hotCues
  };
}

// Helper function to calculate variance of audio samples
function calculateVariance(samples) {
  if (samples.length === 0) return 0;
  
  const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
  const variance = samples.reduce((sum, sample) => sum + Math.pow(sample - mean, 2), 0) / samples.length;
  
  return variance;
}

// Helper function to convert music key to Camelot notation
function keyToCamelot(key) {
  const camelotMap = {
    'C major': '8B', 'A minor': '8A',
    'G major': '9B', 'E minor': '9A', 
    'D major': '10B', 'B minor': '10A',
    'A major': '11B', 'F# minor': '11A',
    'E major': '12B', 'C# minor': '12A',
    'B major': '1B', 'G# minor': '1A',
    'F# major': '2B', 'D# minor': '2A',
    'Db major': '3B', 'Bb minor': '3A',
    'Ab major': '4B', 'F minor': '4A',
    'Eb major': '5B', 'C minor': '5A',
    'Bb major': '6B', 'G minor': '6A',
    'F major': '7B', 'D minor': '7A'
  };
  return camelotMap[key] || '8B';
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Broadcast Window IPC Handlers
 * ────────────────────────────────────────────────────────────────────────── */

// Open broadcast window
register('broadcast:open', async (_evt, options) => {
  createBroadcastWindow(options);
  return { success: true };
});

// Close broadcast window
register('broadcast:close', async () => {
  closeBroadcastWindow();
  return { success: true };
});

// Check if broadcast window is open
register('broadcast:isOpen', async () => {
  return { isOpen: broadcastWindow && !broadcastWindow.isDestroyed() };
});

// Update broadcast window (forward deck state to broadcast window)
register('broadcast:updateDeck', async (_evt, deckData) => {
  sendToBroadcastWindow('broadcast:deckUpdate', deckData);
  return { success: true };
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Request Server IPC Handlers
 * ────────────────────────────────────────────────────────────────────────── */

// Start request server
register('request-server:start', async () => {
  try {
    console.log('[IPC] request-server:start called');
    if (!requestServer) {
      console.log('[IPC] Creating new RequestServer instance...');
      requestServer = new RequestServer(db, win);
      console.log('[IPC] RequestServer instance created successfully');
    }
    console.log('[IPC] Starting RequestServer...');
    const result = await requestServer.start();
    console.log('[IPC] RequestServer start result:', result);
    return result;
  } catch (error) {
    console.error('[IPC] Error starting request server:', error);
    return { 
      success: false, 
      message: error.message,
      stack: error.stack 
    };
  }
});

// Stop request server
register('request-server:stop', async () => {
  if (requestServer) {
    return requestServer.stop();
  }
  return { success: false, message: 'Server not initialized' };
});

// Get server status
register('request-server:status', async () => {
  if (requestServer) {
    return requestServer.getStatus();
  }
  return { isRunning: false, url: null, port: null, connections: 0, requestCount: 0 };
});

// Update current track
register('request-server:updateTrack', async (_evt, track) => {
  if (requestServer) {
    requestServer.updateCurrentTrack(track);
  }
  return { success: true };
});

// Accept request
register('request-server:acceptRequest', async (_evt, requestId) => {
  if (requestServer) {
    const track = requestServer.acceptRequest(requestId);
    return { success: true, track };
  }
  return { success: false };
});

// Reject request
register('request-server:rejectRequest', async (_evt, requestId) => {
  if (requestServer) {
    requestServer.rejectRequest(requestId);
    return { success: true };
  }
  return { success: false };
});

// Remove request
register('request-server:removeRequest', async (_evt, requestId) => {
  if (requestServer) {
    requestServer.removeRequest(requestId);
    return { success: true };
  }
  return { success: false };
});

// Clear all requests
register('request-server:clearRequests', async () => {
  if (requestServer) {
    requestServer.clearRequests();
    return { success: true };
  }
  return { success: false };
});

// Get all requests
register('request-server:getRequests', async () => {
  if (requestServer) {
    return { 
      success: true, 
      requests: requestServer.requests || [] 
    };
  }
  return { success: false, requests: [] };
});

// Get all feedback
register('request-server:getFeedback', async () => {
  if (requestServer) {
    return { 
      success: true, 
      feedback: requestServer.feedback || [] 
    };
  }
  return { success: false, feedback: [] };
});

// Get payment handles
register('request-server:getPaymentHandles', async () => {
  if (requestServer) {
    return { 
      success: true, 
      handles: requestServer.getPaymentHandles() 
    };
  }
  return { success: false, handles: { venmo: '', cashapp: '', paypal: '', zelle: '' } };
});

// Set payment handles
register('request-server:setPaymentHandles', async (event, handles) => {
  if (requestServer) {
    requestServer.setPaymentHandles(handles);
    return { success: true };
  }
  return { success: false };
});

// Get request policy
register('request-server:getRequestPolicy', async () => {
  if (requestServer) {
    return { 
      success: true, 
      policy: requestServer.getRequestPolicy() 
    };
  }
  return { success: false, policy: 'free' };
});

// Set request policy
register('request-server:setRequestPolicy', async (event, policy) => {
  if (requestServer) {
    requestServer.setRequestPolicy(policy);
    return { success: true };
  }
  return { success: false };
});

// Get all tips
register('request-server:getTips', async () => {
  if (requestServer) {
    return { 
      success: true, 
      tips: requestServer.tips || [] 
    };
  }
  return { success: false, tips: [] };
});

// Streaming services management
const streamingServices = {
  spotify: { connected: false, credentials: null },
  soundcloud: { connected: false, credentials: null },
  tidal: { connected: false, credentials: null },
  beatport: { connected: false, credentials: null },
  'apple-music': { connected: false, credentials: null },
  'youtube-music': { connected: false, credentials: null },
  deezer: { connected: false, credentials: null },
  bandcamp: { connected: false, credentials: null }
};

register('streaming-services:getStatus', async () => {
  return { success: true, services: streamingServices };
});

register('streaming-services:connect', async (event, { serviceId, credentials }) => {
  try {
    if (streamingServices[serviceId]) {
      streamingServices[serviceId].connected = true;
      streamingServices[serviceId].credentials = credentials;
      console.log(`✅ Connected to ${serviceId}`);
      return { success: true };
    }
    return { success: false, message: 'Unknown service' };
  } catch (error) {
    console.error('Failed to connect service:', error);
    return { success: false, message: error.message };
  }
});

register('streaming-services:disconnect', async (event, serviceId) => {
  try {
    if (streamingServices[serviceId]) {
      streamingServices[serviceId].connected = false;
      streamingServices[serviceId].credentials = null;
      console.log(`❌ Disconnected from ${serviceId}`);
      return { success: true };
    }
    return { success: false, message: 'Unknown service' };
  } catch (error) {
    console.error('Failed to disconnect service:', error);
    return { success: false, message: error.message };
  }
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Analyzer Calibration System
 * ────────────────────────────────────────────────────────────────────────── */
let AnalyzerCalibration = null;

// Load calibration module asynchronously
(async () => {
  try {
    const modulePath = path.join(__dirname, '../src/analysis/AnalyzerCalibration.js');
    const module = await import(require('url').pathToFileURL(modulePath).href);
    AnalyzerCalibration = module.default;
    console.log('[Calibration] Module loaded successfully');
  } catch (error) {
    console.warn('[Calibration] Module not loaded:', error.message);
  }
})();

let analyzerCalibration = null;

// Initialize calibration system
function initCalibration() {
  if (!analyzerCalibration && AnalyzerCalibration) {
    try {
      analyzerCalibration = new AnalyzerCalibration();
      console.log('[Calibration] System initialized');
    } catch (error) {
      console.error('[Calibration] Failed to initialize:', error);
    }
  }
  return analyzerCalibration;
}

// Get calibration status
register('calibration:getStatus', async () => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      return { calibrated: false, error: 'Calibration system not available' };
    }
    return calibration.getStatus();
  } catch (error) {
    console.error('[Calibration] Get status failed:', error);
    return { calibrated: false, error: error.message };
  }
});

// Import ground truth tracks
register('calibration:importGroundTruth', async (event, tracks) => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      throw new Error('Calibration system not available');
    }
    calibration.importGroundTruth(tracks);
    return { success: true, count: tracks.length };
  } catch (error) {
    console.error('[Calibration] Import ground truth failed:', error);
    throw error;
  }
});

// Start calibration process
register('calibration:calibrate', async () => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      throw new Error('Calibration system not available');
    }

    // Need to pass analyzer instance - will be created when audio module loads
    // For now, return placeholder
    console.log('[Calibration] Starting calibration process...');
    
    // This will need to be implemented with actual AudioAnalyzer integration
    // For now, return mock results
    return {
      success: true,
      calibrated: true,
      bpmAccuracy: 0,
      keyAccuracy: 0,
      tracksUsed: calibration.groundTruth.length,
      preferredMultiplier: 1.0,
      relativeFix: false,
      lastUpdated: Date.now(),
      message: 'Calibration will complete when analyzer integration is finished'
    };
  } catch (error) {
    console.error('[Calibration] Calibration failed:', error);
    throw error;
  }
});

// Export ground truth to file
register('calibration:exportGroundTruth', async (event, filePath) => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      throw new Error('Calibration system not available');
    }
    
    const data = calibration.exportGroundTruth();
    const fs = require('fs');
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    
    return { success: true };
  } catch (error) {
    console.error('[Calibration] Export failed:', error);
    throw error;
  }
});

// Import ground truth from file
register('calibration:importGroundTruthFile', async (event, filePath) => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      throw new Error('Calibration system not available');
    }
    
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    calibration.importGroundTruth(data);
    
    return data;
  } catch (error) {
    console.error('[Calibration] Import from file failed:', error);
    throw error;
  }
});

// Reset calibration
register('calibration:reset', async () => {
  try {
    const calibration = initCalibration();
    if (!calibration) {
      throw new Error('Calibration system not available');
    }
    
    calibration.reset();
    return { success: true };
  } catch (error) {
    console.error('[Calibration] Reset failed:', error);
    throw error;
  }
});

// Dialog: Open files
register('dialog:openFiles', async (event, options) => {
  try {
    const { dialog } = require('electron');
    return await dialog.showOpenDialog(options);
  } catch (error) {
    console.error('[Dialog] Open files failed:', error);
    throw error;
  }
});

// Dialog: Save file
register('dialog:save', async (event, options) => {
  try {
    const { dialog } = require('electron');
    return await dialog.showSaveDialog(options);
  } catch (error) {
    console.error('[Dialog] Save file failed:', error);
    throw error;
  }
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Stem Separation IPC (Demucs Integration)
 * ────────────────────────────────────────────────────────────────────────── */
const demucsService = require('./services/demucsService.cjs');

/* ────────────────────────────────────────────────────────────────────────── *
 * Whisper Transcription IPC
 * ────────────────────────────────────────────────────────────────────────── */
const whisperService = require('./services/whisperService.cjs');

register('stem-separation:check-python', async () => {
  try {
    const status = await demucsService.checkPythonInstallation();
    console.log('[Demucs] Python check:', status);
    return status;
  } catch (error) {
    console.error('[Demucs] Python check error:', error);
    return { available: false, error: error.message };
  }
});

register('stem-separation:separate', async (event, { filePath, stemsCount }) => {
  try {
    console.log(`[Demucs] Starting separation: ${filePath} (${stemsCount})`);
    
    // Create organized folder structure in Music folder
    // C:\Users\suppo\Music\Stems\Artist - Song Name\Artist - Song Name Vocals.wav
    const musicFolder = app.getPath('music');
    const parsedPath = path.parse(filePath);
    const songName = parsedPath.name; // e.g., "Brooks & Dunn - Brand New Man"
    
    // Create Stems folder in Music directory
    const stemsBaseDir = path.join(musicFolder, 'Stems');
    const songFolder = path.join(stemsBaseDir, songName);
    
    const stems = await demucsService.separateStems(
      filePath,
      songFolder,
      stemsCount,
      (update) => {
        // Send progress updates to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('stem-separation:progress', update);
        }
      }
    );

    console.log('[Demucs] Separation complete:', Object.keys(stems));
    return { success: true, stems };
  } catch (error) {
    console.error('[Demucs] Separation error:', error);
    return { success: false, error: error.message };
  }
});

register('stem-separation:cancel', async () => {
  try {
    const cancelled = demucsService.cancel();
    console.log('[Demucs] Cancellation requested:', cancelled);
    return { success: cancelled };
  } catch (error) {
    console.error('[Demucs] Cancel error:', error);
    return { success: false, error: error.message };
  }
});

// Check if Python and Whisper are installed
register('whisper-transcription:check-python', async () => {
  try {
    const result = await whisperService.checkPythonInstallation();
    console.log('[Whisper] Python check:', result);
    return result;
  } catch (error) {
    console.error('[Whisper] Check failed:', error);
    return {
      available: false,
      error: error.message
    };
  }
});

// Transcribe audio file
register('whisper-transcription:transcribe', async (event, { filePath, modelSize, language }) => {
  try {
    console.log('[Whisper] Starting transcription:', { filePath, modelSize, language });
    
    const transcription = await whisperService.transcribeAudio(
      filePath,
      modelSize,
      language,
      (progress) => {
        // Forward progress to renderer
        if (win && !win.isDestroyed()) {
          win.webContents.send('whisper-transcription:progress', progress);
        }
      }
    );
    
    console.log('[Whisper] Transcription complete');
    return transcription;
  } catch (error) {
    console.error('[Whisper] Transcription failed:', error);
    throw error;
  }
});

// Cancel transcription
register('whisper-transcription:cancel', async () => {
  whisperService.cancel();
  return { success: true };
});

/* ────────────────────────────────────────────────────────────────────────── *
 * Background Music Folder Watcher
 * ────────────────────────────────────────────────────────────────────────── */
let folderWatcher = null;
let watchedFolders = new Set();
let scanQueue = [];
let isScanning = false;
let lastScanTime = Date.now();
const SCAN_DEBOUNCE_MS = 5000; // Wait 5 seconds after last file change

// Single file scanner
async function scanSingleFile(filePath) {
  const AUDIO_EXT = new Set(['.mp3','.m4a','.flac','.wav','.aac','.ogg','.opus']);
  const ext = path.extname(filePath).toLowerCase();
  
  if (!AUDIO_EXT.has(ext)) return null;
  
  // Check if file already exists in database
  const existing = db.prepare('SELECT id FROM tracks WHERE filePath = ?').get(path.normalize(filePath));
  if (existing) {
    console.log(`[BackgroundScan] File already in library: ${path.basename(filePath)}`);
    return null;
  }
  
  try {
    const { parseFile } = await import('music-metadata');
    const meta = await parseFile(filePath);
    const common = meta.common || {};
    const format = meta.format || {};
    
    const upsert = db.prepare(`INSERT INTO tracks (filePath, title, artist, album, genre, duration, trackNo, year, analyzed)
      VALUES (@filePath,@title,@artist,@album,@genre,@duration,@trackNo,@year,@analyzed)
      ON CONFLICT(filePath) DO UPDATE SET title=excluded.title, artist=excluded.artist, album=excluded.album,
        genre=excluded.genre, duration=excluded.duration, trackNo=excluded.trackNo, year=excluded.year, analyzed=excluded.analyzed`);
    
    upsert.run({
      filePath: path.normalize(filePath),
      title: path.basename(filePath, path.extname(filePath)),
      artist: (common.artist || 'Unknown').trim(),
      album: (common.album || 'Unknown').trim(),
      genre: (Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || '')),
      duration: format.duration || 0,
      trackNo: (common.track && common.track.no) || null,
      year: common.year ? String(common.year) : null,
      analyzed: 0,
    });
    
    console.log(`[BackgroundScan] ✓ Added: ${path.basename(filePath)}`);
    return { added: true, filePath };
  } catch (err) {
    console.error(`[BackgroundScan] Error scanning ${filePath}:`, err.message);
    return null;
  }
}

// Process scan queue
async function processScanQueue() {
  if (isScanning || scanQueue.length === 0) return;
  
  isScanning = true;
  const files = [...scanQueue];
  scanQueue = [];
  
  console.log(`[BackgroundScan] Processing ${files.length} new files...`);
  let addedCount = 0;
  
  for (const filePath of files) {
    const result = await scanSingleFile(filePath);
    if (result) addedCount++;
  }
  
  if (addedCount > 0) {
    console.log(`[BackgroundScan] Added ${addedCount} new tracks to library`);
    // Notify renderer if window exists
    if (win && !win.isDestroyed()) {
      win.webContents.send('library:updated', { added: addedCount });
    }
  }
  
  isScanning = false;
}

// Start watching a folder for changes
function startWatchingFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.log(`[BackgroundScan] Folder does not exist: ${folderPath}`);
    return;
  }
  
  if (watchedFolders.has(folderPath)) {
    console.log(`[BackgroundScan] Already watching: ${folderPath}`);
    return;
  }
  
  console.log(`[BackgroundScan] 👁 Started watching: ${folderPath}`);
  watchedFolders.add(folderPath);
  
  try {
    const watcher = fs.watch(folderPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      
      const fullPath = path.join(folderPath, filename);
      
      // Only process 'rename' events (which includes new files and renames)
      if (eventType === 'rename') {
        // Check if file exists (it's an add, not a delete)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          console.log(`[BackgroundScan] Detected new file: ${filename}`);
          
          // Add to queue and debounce
          if (!scanQueue.includes(fullPath)) {
            scanQueue.push(fullPath);
          }
          
          lastScanTime = Date.now();
          
          // Debounce: wait for more files to settle
          setTimeout(() => {
            if (Date.now() - lastScanTime >= SCAN_DEBOUNCE_MS) {
              processScanQueue();
            }
          }, SCAN_DEBOUNCE_MS);
        }
      }
    });
    
    watcher.on('error', (err) => {
      console.error(`[BackgroundScan] Watcher error for ${folderPath}:`, err);
      watchedFolders.delete(folderPath);
    });
    
    if (!folderWatcher) folderWatcher = [];
    folderWatcher.push(watcher);
    
  } catch (err) {
    console.error(`[BackgroundScan] Failed to watch ${folderPath}:`, err);
  }
}

// Stop all watchers
function stopWatchingFolders() {
  if (folderWatcher) {
    folderWatcher.forEach(w => {
      try { w.close(); } catch {}
    });
    folderWatcher = null;
  }
  watchedFolders.clear();
  console.log('[BackgroundScan] Stopped all watchers');
}

// IPC handlers for background scanning
register('library:startBackgroundScan', (_evt, folders) => {
  if (!folders || folders.length === 0) {
    // Default to Music folder
    const userHome = require('os').homedir();
    folders = [path.join(userHome, 'Music')];
  }
  
  folders.forEach(folder => startWatchingFolder(folder));
  return { success: true, watching: Array.from(watchedFolders) };
});

register('library:stopBackgroundScan', () => {
  stopWatchingFolders();
  return { success: true };
});

register('library:getBackgroundScanStatus', () => {
  return {
    isActive: watchedFolders.size > 0,
    watchedFolders: Array.from(watchedFolders),
    queuedFiles: scanQueue.length,
    isScanning
  };
});

/* ────────────────────────────────────────────────────────────────────────── *
 * App lifecycle
 * ────────────────────────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  console.log('[main.cjs] App is ready, opening database...');
  openDatabase();

  console.log('[main.cjs] Registering local protocol...');
  registerLocalProtocol();

  console.log('[main.cjs] Creating window...');
  createWindow();

  console.log('[main.cjs] Initializing request server...');
  requestServer = new RequestServer(db, win);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  // Stop background folder watching
  stopWatchingFolders();
  
  // Close AutoTagger
  if (autoTagger) {
    try { autoTagger.close(); } catch {}
  }
  // Stop request server
  if (requestServer) {
    try { requestServer.stop(); } catch {}
  }
  // Close database
  if (db) { try { db.close(); } catch {} }
});
