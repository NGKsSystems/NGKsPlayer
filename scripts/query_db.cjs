const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const appData = process.env.APPDATA || (os.platform() === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : '/var/local');
const dbPath = path.join(appData, 'ngksplayer', 'library.db');

console.log('DB Path:', dbPath);

try {
  const db = new Database(dbPath, { readonly: true });
  const rows = db.prepare(`SELECT id, title, artist, filePath, bpm, key, loudnessLUFS, loudnessRange, analyzed FROM tracks WHERE bpm IS NOT NULL OR analyzed = 1 ORDER BY id DESC LIMIT 20`).all();
  if (!rows || rows.length === 0) {
    console.log('No analysis rows found.');
    process.exit(0);
  }
  console.log('Recent analysis rows:');
  rows.forEach(r => {
    console.log(`- id:${r.id} title:${r.title} artist:${r.artist} file:${r.filePath}`);
    console.log(`  bpm:${r.bpm} key:${r.key} loudnessLUFS:${r.loudnessLUFS} loudnessRange:${r.loudnessRange} analyzed:${r.analyzed}`);
  });
  db.close();
} catch (e) {
  console.error('Failed to open DB:', e.message);
  process.exit(1);
}
