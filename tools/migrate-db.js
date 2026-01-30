import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const dbPath = path.join(process.env.APPDATA, "NGKsPlayer", "library.sqlite");
if (!fs.existsSync(dbPath)) {
  console.error("DB not found:", dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
const cols = new Set(db.prepare("PRAGMA table_info(tracks)").all().map(c => c.name));

const ensure = (name, ddl) => {
  if (!cols.has(name)) {
    console.log("Adding column:", name);
    db.prepare(`ALTER TABLE tracks ADD COLUMN ${ddl}`).run();
  } else {
    console.log("Column already exists:", name);
  }
};

db.transaction(() => {
  // Add any new columns your current code expects:
  ensure("startCut", "INTEGER NOT NULL DEFAULT 0");
  ensure("endCut",   "INTEGER");
})();
db.close();
console.log("Migration done.");
