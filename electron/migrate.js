// electron/migrate.js
import { app } from "electron";
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dbPath = path.join(app.getPath("userData"), "library.sqlite");

export function migrate() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);

  // base table (create if you ever start from zero)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id INTEGER PRIMARY KEY,
      path TEXT NOT NULL UNIQUE,
      title TEXT, artist TEXT, album TEXT
    );
  `);

  // helper
  const has = new Set(
    db.prepare("PRAGMA table_info(tracks)").all().map(c => c.name)
  );
  const add = (name, ddl) => {
    if (!has.has(name)) {
      db.prepare(`ALTER TABLE tracks ADD COLUMN ${ddl}`).run();
    }
  };

  // 🔧 add new columns your code expects
  add("startCut", "startCut INTEGER NOT NULL DEFAULT 0");
  add("endCut",   "endCut INTEGER");

  db.close();
}
