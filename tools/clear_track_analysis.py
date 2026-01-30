import sys, sqlite3, os

if len(sys.argv) < 2:
    print('Usage: python tools/clear_track_analysis.py "C:\\full\\path\\to\\file.mp3" [dbPath]')
    sys.exit(1)

target = sys.argv[1]
dbpath = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.environ.get('APPDATA') or os.path.expanduser('~'), 'ngksplayer', 'library.db')

if not os.path.exists(dbpath):
    print('DB not found at', dbpath)
    sys.exit(2)

conn = sqlite3.connect(dbpath)
cur = conn.cursor()
# normalize path comparisons by replacing backslashes
norm = target.replace('\\\\', '\\')
try:
    cur.execute("SELECT id, filePath, bpm, key FROM tracks WHERE LOWER(REPLACE(REPLACE(filePath, '?', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\\\', '/')) OR LOWER(REPLACE(REPLACE(path, '?', ''), '\\\\', '/')) = LOWER(REPLACE(?, '\\\\', '/')) LIMIT 1", (norm, norm))
    row = cur.fetchone()
    if not row:
        print('Track not found:', target)
        sys.exit(3)
    tid = row[0]
    print('Found track id', tid, 'file:', row[1], 'bpm:', row[2], 'key:', row[3])
    cur.execute("UPDATE tracks SET bpm=NULL, bpmConfidence=NULL, bpmNote=NULL, rawBpm=NULL, groove=NULL, key=NULL, keyConfidence=NULL, camelotKey=NULL, energy=NULL, danceability=NULL, acousticness=NULL, instrumentalness=NULL, liveness=NULL, loudnessLUFS=NULL, loudnessRange=NULL, cueIn=NULL, cueOut=NULL, phraseData=NULL, phraseLength=NULL, energyTrajectory=NULL, energyTrajectoryDesc=NULL, bpmDrift=NULL, transitionDifficulty=NULL, transitionDescription=NULL, analyzed=0 WHERE id=?", (tid,))
    conn.commit()
    print('Cleared analysis fields for track id', tid)
finally:
    conn.close()
