#!/usr/bin/env python3
import sqlite3
import os

# Connect to the NGKsPlayer database
db_path = os.path.expanduser(r'~\AppData\Roaming\ngksplayer\library.db')

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Query the tracks table for Kiss - Heaven's On Fire
    query = """
    SELECT filePath, title, artist, bpm, energy, loudnessLUFS, loudnessRange,
           danceability, acousticness, instrumentalness, liveness, analyzed
    FROM tracks 
    WHERE title LIKE '%Heaven%' OR artist LIKE '%Kiss%' OR filePath LIKE '%Heaven%'
    """
    
    cursor.execute(query)
    results = cursor.fetchall()
    
    if results:
        print("Found tracks:")
        for row in results:
            print(f"\nFile: {row[0]}")
            print(f"Title: {row[1]}")
            print(f"Artist: {row[2]}")
            print(f"BPM: {row[3]} (type: {type(row[3])})")
            print(f"Energy: {row[4]} (type: {type(row[4])})")
            print(f"LUFS: {row[5]} (type: {type(row[5])})")
            print(f"Loudness Range: {row[6]} (type: {type(row[6])})")
            print(f"Danceability: {row[7]} (type: {type(row[7])})")
            print(f"Acousticness: {row[8]} (type: {type(row[8])})")
            print(f"Instrumentalness: {row[9]} (type: {type(row[9])})")
            print(f"Liveness: {row[10]} (type: {type(row[10])})")
            print(f"Analyzed: {row[11]}")
    else:
        print("No tracks found matching the criteria")
        
        # List all tracks to see what's in the database
        cursor.execute("SELECT title, artist, filePath FROM tracks LIMIT 10")
        all_tracks = cursor.fetchall()
        print(f"\nAll tracks in database ({len(all_tracks)} shown):")
        for i, track in enumerate(all_tracks, 1):
            print(f"{i}. {track[1]} - {track[0]} ({track[2]})")
    
    conn.close()
    
except Exception as e:
    print(f"Error: {e}")