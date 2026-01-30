import json
import os

# Load the new batprint(f"   Realistic BPM (80-180): {len(realistic_bpm)}/{len(bpm_values)} ({len(realistic_bpm)/len(bpm_values)*100:.1f}%)")rint(f"   Realistic BPM (80-180): {len(realistic_bpm)}/{len(bpm_values)} ({len(realistic_bpm)/len(bpm_values)*100:.1f}%)")h results
if os.path.exists('batch_analysis_20250914_132129.json'):
    with open('batch_analysis_20250914_132129.json', 'r') as f:
        new_batch = json.load(f)
    print(f"New batch loaded: {len(new_batch)} songs")
else:
    print("New batch file not found!")
    exit()

print("\n" + "="*80)
print("NEW BATCH ANALYSIS RESULTS")
print("="*80)

# Analyze new batch metrics
bpm_values = []
lufs_values = []
confidence_values = []
genre_counts = {}

for path, song in new_batch.items():
    bpm_values.append(song['bpm'])
    lufs_values.append(song['lufs'])
    confidence_values.append(song['confidence']['overall'])
    
    genre = song.get('genre', 'Unknown')
    genre_counts[genre] = genre_counts.get(genre, 0) + 1

print(f"\n📊 OVERALL METRICS:")
print(f"   Total Songs: {len(new_batch)}")
print(f"   BPM Range: {min(bpm_values):.1f} - {max(bpm_values):.1f}")
print(f"   BPM Average: {sum(bpm_values)/len(bpm_values):.1f}")
print(f"   LUFS Range: {min(lufs_values):.1f} - {max(lufs_values):.1f}")
print(f"   LUFS Average: {sum(lufs_values)/len(lufs_values):.1f}")
print(f"   Confidence Average: {sum(confidence_values)/len(confidence_values):.2f}")

print(f"\n🎵 GENRE DISTRIBUTION:")
for genre, count in sorted(genre_counts.items()):
    print(f"   {genre}: {count} songs ({count/len(new_batch)*100:.1f}%)")

print(f"\n🎯 BPM ANALYSIS:")
realistic_bpm = [bpm for bpm in bpm_values if 80 <= bpm <= 180]
print(f"   Realistic BPM (80-180): {len(realistic_bpm)}/{len(bpm_values)} ({len(realistic_bpm)/len(bpm_values)*100:.1f}%)")

print(f"\n🔊 LUFS ANALYSIS:")
negative_lufs = [lufs for lufs in lufs_values if lufs < 0]
print(f"   Negative LUFS: {len(negative_lufs)}/{len(lufs_values)} ({len(negative_lufs)/len(lufs_values)*100:.1f}%)")

print(f"\n🎪 CONFIDENCE ANALYSIS:")
high_confidence = [conf for conf in confidence_values if conf >= 0.7]
print(f"   High Confidence (≥0.7): {len(high_confidence)}/{len(confidence_values)} ({len(high_confidence)/len(confidence_values)*100:.1f}%)")

# Show some example songs
print(f"\n📋 SAMPLE RESULTS:")
for i, (path, song) in enumerate(new_batch.items()):
    if i < 5:
        print(f"   {i+1}. {song['file']}")
        print(f"      BPM: {song['bpm']:.1f} (conf: {song['confidence']['bpm']:.2f})")
        print(f"      LUFS: {song['lufs']:.1f}, Genre: {song['genre']}")
        print(f"      Overall Confidence: {song['confidence']['overall']:.2f}")
        print()

print("\n" + "="*80)
print("ANALYSIS COMPLETE")
print("="*80)