import sys, sqlite3, os, json

if len(sys.argv) < 3:
    print('Usage: python tools/write_analysis.py "C:\\full\\path\\to\\file.mp3" bpm [key]')
    sys.exit(1)

target = sys.argv[1]
bpm = sys.argv[2]
key = sys.argv[3] if len(sys.argv) > 3 else None

dbpath = os.path.join(os.environ.get('APPDATA') or os.path.expanduser('~'), 'ngksplayer', 'library.db')
if not os.path.exists(dbpath):
    print('DB not found at', dbpath)
    sys.exit(2)

conn = sqlite3.connect(dbpath)
cur = conn.cursor()

norm = target.replace('\\\\', '\\')
try:
    cur.execute("SELECT id, filePath FROM tracks WHERE LOWER(REPLACE(REPLACE(filePath, '?', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\\\', '/')) OR LOWER(REPLACE(REPLACE(path, '?', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\\\', '/')) LIMIT 1", (norm, norm))
    row = cur.fetchone()
    if not row:
        print('Track not found:', target)
        sys.exit(3)
    tid = row[0]
    print('Found track id', tid, 'file:', row[1])
    # update relevant columns
    cur.execute("UPDATE tracks SET bpm=?, rawBpm=?, key=?, analyzed=1 WHERE id=?", (bpm, bpm, key, tid))
    conn.commit()
    print('Wrote BPM', bpm, 'key', key, 'for track id', tid)
finally:
    conn.close()
