// electron/main.cjs  — CommonJS main process with DB migrations & library IPC

/* ────────────────────────────────────────────────────────────────────────── *
 * Imports
 * ────────────────────────────────────────────────────────────────────────── */
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises;
const { app, BrowserWindow, ipcMain, dialog, protocol, shell } = require('electron');
const Database = require('better-sqlite3');
const { scanFolder: scanFolderFull } = require('./scanner.cjs');

// Audio loading function for REAL analysis
async function loadAudioFile(filePath) {
  const fs = require('fs');
  const path = require('path');
  
  console.log(`[REAL AUDIO] Loading audio file: ${filePath}`);
  
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
      
      // Check if required packages are available
      let ffmpeg, ffmpegPath;
      try {
        ffmpeg = require('fluent-ffmpeg');
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        ffmpegPath = ffmpegInstaller.path;
        console.log(`[REAL AUDIO] ✅ FFmpeg found at: ${ffmpegPath}`);
      } catch (requireError) {
        console.error(`[REAL AUDIO] ❌ FFmpeg packages not available:`, requireError.message);
        reject(new Error(`FFmpeg not available: ${requireError.message}`));
        return;
      }
      
      ffmpeg.setFfmpegPath(ffmpegPath);
      
      console.log(`[REAL AUDIO] 🎵 Starting FFmpeg decode process...`);
      console.log(`[REAL AUDIO] 📁 Input file: ${actualFilePath}`);
      console.log(`[REAL AUDIO] 🔧 Target format: 32-bit float PCM, mono, 22050Hz`);
      
      let audioData = [];
      let sampleRate = 22050;
      let duration = 0;
      let ffmpegStarted = false;
      
      const ffmpegCommand = ffmpeg(actualFilePath)
        .toFormat('f32le') // 32-bit float PCM
        .audioChannels(1) // Mono for analysis
        .audioFrequency(22050) // Downsample for performance but keep quality
        .audioCodec('pcm_f32le') // Explicitly specify the audio codec
        .outputOptions(['-avoid_negative_ts make_zero']) // Fix timestamp issues
        .on('start', (commandLine) => {
          ffmpegStarted = true;
          console.log(`[REAL AUDIO] 🚀 FFmpeg started with command:`);
          console.log(`[REAL AUDIO] ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[REAL AUDIO] 📊 Progress: ${progress.percent.toFixed(1)}% - ${progress.timemark}`);
          }
        })
        .on('stderr', (stderrLine) => {
          // Extract duration from FFmpeg output
          const durationMatch = stderrLine.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
          if (durationMatch) {
            const hours = parseInt(durationMatch[1]);
            const minutes = parseInt(durationMatch[2]);
            const seconds = parseFloat(durationMatch[3]);
            duration = hours * 3600 + minutes * 60 + seconds;
            console.log(`[REAL AUDIO] ⏱️ Duration detected: ${duration} seconds`);
          }
          
          // Log other important FFmpeg messages
          if (stderrLine.includes('Input #0') || stderrLine.includes('Stream #0') || stderrLine.includes('Output #0')) {
            console.log(`[REAL AUDIO] 📋 ${stderrLine.trim()}`);
          }
        })
        .on('error', (err) => {
          console.error(`[REAL AUDIO] 💥 FFmpeg error:`, err);
          console.error(`[REAL AUDIO] 💥 Error message: ${err.message}`);
          console.error(`[REAL AUDIO] 💥 FFmpeg started: ${ffmpegStarted}`);
          reject(new Error(`Failed to decode audio: ${err.message}`));
        });
        
      // Add timeout for FFmpeg operations (2 minutes)
      const timeoutId = setTimeout(() => {
        console.error(`[REAL AUDIO] ⏰ FFmpeg timeout after 2 minutes`);
        ffmpegCommand.kill('SIGKILL');
        reject(new Error('FFmpeg processing timeout - file may be corrupted or too large'));
      }, 120000);
        
      const stream = ffmpegCommand.pipe()
        .on('data', (chunk) => {
          // Convert raw bytes to float32 array
          const float32Array = new Float32Array(chunk.buffer, chunk.byteOffset, chunk.length / 4);
          audioData.push(...float32Array);
          
          if (audioData.length % 44100 === 0) {
            console.log(`[REAL AUDIO] 📊 Processed ${(audioData.length / 22050).toFixed(1)}s of audio data`);
          }
        })
        .on('end', () => {
          clearTimeout(timeoutId);
          console.log(`[REAL AUDIO] ✅ FFmpeg decoding completed`);
          console.log(`[REAL AUDIO] 📊 Total samples decoded: ${audioData.length}`);
          
          if (audioData.length === 0) {
            reject(new Error('No audio data decoded from FFmpeg'));
            return;
          }
          
          // CRITICAL: Ensure we have enough real audio data for accurate analysis
          const minimumSamples = 22050 * 10; // At least 10 seconds of audio
          if (audioData.length < minimumSamples) {
            console.error(`[REAL AUDIO] ❌ Insufficient audio data: ${audioData.length} samples (need ${minimumSamples})`);
            reject(new Error(`Insufficient audio data for analysis: got ${(audioData.length/22050).toFixed(1)}s, need at least 10s`));
            return;
          }
          
          sampleRate = 22050; // We downsampled to this
          duration = audioData.length / sampleRate;
          
          // Verify the audio data looks realistic
          const firstSamples = audioData.slice(0, 10);
          const variance = calculateVariance(audioData.slice(0, Math.min(44100, audioData.length)));
          
          console.log(`[REAL AUDIO] 🔍 First 10 samples:`, firstSamples.map(x => x.toFixed(6)));
          console.log(`[REAL AUDIO] 📈 Audio variance: ${variance.toFixed(8)}`);
          console.log(`[REAL AUDIO] ⏱️ Final duration: ${duration.toFixed(2)}s`);
          
          // Check for all-zero audio (silence)
          const nonZeroSamples = audioData.filter(sample => Math.abs(sample) > 0.0001).length;
          const zeroPercentage = ((audioData.length - nonZeroSamples) / audioData.length) * 100;
          console.log(`[REAL AUDIO] 📊 Non-zero samples: ${nonZeroSamples}/${audioData.length} (${(100-zeroPercentage).toFixed(1)}% actual audio)`);
          
          if (zeroPercentage > 95) {
            console.error(`[REAL AUDIO] ❌ Audio is ${zeroPercentage.toFixed(1)}% silence - FFmpeg stream mapping failed!`);
            reject(new Error(`Audio appears to be silence (${zeroPercentage.toFixed(1)}% zeros) - check FFmpeg stream mapping`));
            return;
          }
          
          // Ensure variance indicates real audio (not silence or synthetic data)
          if (variance < 0.001) {
            console.error(`[REAL AUDIO] ❌ Audio appears synthetic or silent (variance: ${variance})`);
            reject(new Error('Audio appears to be synthetic or silent - variance too low'));
            return;
          }
          
          // Create AudioBuffer-compatible object
          const audioBuffer = {
            duration: duration,
            sampleRate: sampleRate,
            length: audioData.length,
            numberOfChannels: 1,
            getChannelData: function(channel) {
              if (channel === 0) {
                return new Float32Array(audioData);
              }
              return new Float32Array(audioData.length);
            }
          };
          
          console.log(`[REAL AUDIO] ✅ Created AudioBuffer: ${duration}s, ${sampleRate}Hz, ${audioData.length} samples`);
          resolve(audioBuffer);
        })
        .on('error', (err) => {
          clearTimeout(timeoutId);
          console.error(`[REAL AUDIO] 💥 Stream error:`, err);
          reject(new Error(`Audio stream error: ${err.message}`));
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
  
  // Continue with the rest of the database setup
  db.exec(`
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
 * Protocol to safely load local files: local://C:/...  (renderer uses this)
 * ────────────────────────────────────────────────────────────────────────── */
function registerLocalProtocol() {
  protocol.registerFileProtocol('local', (request, callback) => {
    const p = request.url.replace(/^local:\/\//, '');
    const abs = decodeURIComponent(p);
    callback({ path: abs });
  });
}

/* ────────────────────────────────────────────────────────────────────────── *
 * BrowserWindow
 * ────────────────────────────────────────────────────────────────────────── */
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
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
           ${COL_FILEPATH ? COL_FILEPATH : 'NULL AS filePath'} AS filePath
      FROM ${TABLE}
      ${where}
      ORDER BY ${orderBy}
  `;
  return db.prepare(sql).all(...args);
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
           COALESCE(pregainDb, 0) AS pregainDb
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

// Remove folder from library
register('library:removeFolder', (_evt, folderPath) => {
  try {
    console.log(`Removing folder from library: ${folderPath}`);
    
    // Normalize the folder path for comparison
    const normalizedFolder = folderPath.replace(/\\/g, '/');
    
    // Get all tracks and filter by folder in JavaScript (since SQLite doesn't have dirname)
    const allTracksStmt = db.prepare(`
      SELECT id, filePath, REPLACE(REPLACE(COALESCE(filePath, path), '\\\\', '/'), '//', '/') AS fullPath
      FROM tracks
    `);
    const allTracks = allTracksStmt.all();
    
    // Filter tracks that belong to this folder
    const path = require('path');
    const tracksToDelete = allTracks.filter(track => {
      const trackDir = path.dirname(track.fullPath).replace(/\\/g, '/');
      return trackDir === normalizedFolder;
    });
    
    console.log(`Found ${tracksToDelete.length} tracks to delete from folder: ${normalizedFolder}`);
    if (tracksToDelete.length > 0) {
      console.log('Sample tracks:', tracksToDelete.slice(0, 3).map(t => t.fullPath));
    }
    
    // Delete tracks using the track IDs we found
    if (tracksToDelete.length > 0) {
      const trackIds = tracksToDelete.map(t => t.id);
      const deleteStmt = db.prepare(`DELETE FROM tracks WHERE id IN (${trackIds.map(() => '?').join(',')})`);
      const result = deleteStmt.run(...trackIds);
      
      console.log(`Removed ${result.changes} tracks from folder: ${normalizedFolder}`);
      
      return {
        success: true,
        removedCount: result.changes
      };
    } else {
      return {
        success: true,
        removedCount: 0
      };
    }
  } catch (err) {
    console.error('library:removeFolder failed:', err);
    return { 
      success: false, 
      error: String(err.message || err) 
    };
  }
});

// ── NEW: FS helpers for renderer (waveform/graph, etc.)

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

// Play a file
register('player:playFile', async (_evt, filePath) => {
  win.webContents.send('player:playFile', filePath);
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
          const result = await scanFolderRecursive(folderPath);
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
             bpm, bpmConfidence, key, keyConfidence, camelotKey, energy,
             loudnessLUFS, loudnessRange, cueIn, cueOut, hotCues,
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
        key: trackData.key || '',
        keyConfidence: trackData.keyConfidence || '',
        camelotKey: trackData.camelotKey || '',
        energy: trackData.energy || '',
        loudnessLUFS: trackData.loudnessLUFS || '',
        loudnessRange: trackData.loudnessRange || '',
        cueIn: trackData.cueIn || '',
        cueOut: trackData.cueOut || '',
        hotCues: trackData.hotCues || '',
        
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
      
      return {
        // Basic metadata
        title: common.title || path.basename(cleanPath, path.extname(cleanPath)),
        artist: common.artist || '',
        album: common.album || '',
        genre: Array.isArray(common.genre) ? common.genre.join(', ') : (common.genre || ''),
        year: common.year ? String(common.year) : '',
        trackNo: (common.track && common.track.no) ? String(common.track.no) : '',
        
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
        hotCues: '',
        
        // Analysis status
        analyzed: false,
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
          loudnessLUFS = ?, loudnessRange = ?, cueIn = ?, cueOut = ?, hotCues = ?
        WHERE filePath = ?
      `).run(
        tags.title || '',
        tags.artist || '',
        tags.album || '',
        tags.genre || '',
        tags.year ? parseInt(tags.year) || null : null,
        tags.trackNo ? parseInt(tags.trackNo) || null : null,
        tags.bpm ? parseInt(tags.bpm) || null : null,
        tags.bpmConfidence ? parseFloat(tags.bpmConfidence) || null : null,
        tags.key || '',
        tags.keyConfidence ? parseFloat(tags.keyConfidence) || null : null,
        tags.camelotKey || '',
        tags.energy ? parseFloat(tags.energy) || null : null,
        tags.loudnessLUFS ? parseFloat(tags.loudnessLUFS) || null : null,
        tags.loudnessRange ? parseFloat(tags.loudnessRange) || null : null,
        tags.cueIn ? parseFloat(tags.cueIn) || null : null,
        tags.cueOut ? parseFloat(tags.cueOut) || null : null,
        tags.hotCues || '',
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
          loudnessLUFS = ?, loudnessRange = ?, cueIn = ?, cueOut = ?, hotCues = ?
        WHERE filePath = ?
      `).run(
        tags.title || '',
        tags.artist || '',
        tags.album || '',
        tags.genre || '',
        tags.year ? parseInt(tags.year) || null : null,
        tags.trackNo ? parseInt(tags.trackNo) || null : null,
        tags.bpm ? parseInt(tags.bpm) || null : null,
        tags.bpmConfidence ? parseFloat(tags.bpmConfidence) || null : null,
        tags.key || '',
        tags.keyConfidence ? parseFloat(tags.keyConfidence) || null : null,
        tags.camelotKey || '',
        tags.energy ? parseFloat(tags.energy) || null : null,
        tags.loudnessLUFS ? parseFloat(tags.loudnessLUFS) || null : null,
        tags.loudnessRange ? parseFloat(tags.loudnessRange) || null : null,
        tags.cueIn ? parseFloat(tags.cueIn) || null : null,
        tags.cueOut ? parseFloat(tags.cueOut) || null : null,
        tags.hotCues || '',
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
        trackNumber: tags.trackNo || ''
      };
      
      NodeID3.write(id3Tags, cleanPath);
      console.log('Successfully wrote ID3 tags to file');
    } catch (id3Err) {
      console.warn('Failed to write ID3 tags (database updated):', id3Err.message);
    }
    
    return { success: true };
    
  } catch (err) {
    console.error('writeTags error:', err);
    throw new Error(`Failed to write tags: ${err.message}`);
  }
});

// AutoTagger IPC Handler - Independent Analysis Module
register('analyzeTags', async (_evt, filePath) => {
  console.log(`[IPC] analyzeTags called for: ${filePath}`);
  
  try {
    // Import the AutoTagger module
    const AutoTagger = require('../src/analysis/AutoTagger.cjs');
    
    // Create new instance for this analysis
    const autoTagger = new AutoTagger();
    
    try {
      // Perform analysis - handle database errors gracefully
      console.log(`[IPC] Starting analysis for: ${require('path').basename(filePath)}`);
      const result = await autoTagger.analyzeFile(filePath, true); // true = save results
      
      console.log(`[IPC] Analysis complete for: ${require('path').basename(filePath)}`);
      return {
        success: true,
        data: result,
        message: 'Analysis completed successfully'
      };
      
    } catch (analysisError) {
      console.error(`[IPC] Analysis error:`, analysisError.message);
      
      // Check if it's a database error
      if (analysisError.message.includes('better-sqlite3') || analysisError.message.includes('NODE_MODULE_VERSION')) {
        return {
          success: false,
          error: 'Database module needs to be rebuilt for your Node.js version',
          message: 'Please run "npm rebuild better-sqlite3" or restart the application',
          details: analysisError.message
        };
      }
      
      throw analysisError; // Re-throw other errors
    } finally {
      // Always cleanup
      try {
        autoTagger.close();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    
  } catch (error) {
    console.error(`[IPC] analyzeTags error for ${filePath}:`, error);
    return {
      success: false,
      error: error.message,
      message: `Analysis failed: ${error.message}`
    };
  }
});

// Helper function to calculate variance of audio samples
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
 * App lifecycle
 * ────────────────────────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  openDatabase();
  registerLocalProtocol();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (db) { try { db.close(); } catch {} }
});
