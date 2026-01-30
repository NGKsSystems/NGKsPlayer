#!/usr/bin/env python3
"""
Analyze music library for time signatures
Detect 4/4 vs non-4/4 time signatures
"""

import sys
import json
import os
import warnings
warnings.filterwarnings('ignore')

import librosa
import numpy as np

def detect_time_signature(audio_file):
    """
    Detect time signature (4/4, 3/4, 6/8, etc.)
    """
    try:
        # Load audio
        y, sr = librosa.load(audio_file, sr=22050, mono=True, duration=60)  # First 60 seconds
        
        # Get onset strength
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
        
        # Get tempogram for meter analysis
        tempogram = librosa.feature.tempogram(onset_envelope=onset_env, sr=sr)
        
        # Detect tempo
        tempo = librosa.feature.tempo(onset_envelope=onset_env, sr=sr)[0]
        
        # Beat tracking
        tempo_full, beats = librosa.beat.beat_track(y=y, sr=sr, units='time')
        
        # Analyze beat intervals
        if len(beats) > 4:
            beat_intervals = np.diff(beats)
            
            # Check for regular patterns
            interval_var = np.std(beat_intervals) / (np.mean(beat_intervals) + 1e-6)
            
            # Estimate meter by analyzing strong/weak beat patterns
            # Look at energy at beat positions
            beat_strengths = []
            for beat_time in beats[:min(len(beats), 32)]:
                beat_sample = int(beat_time * sr)
                if beat_sample < len(y) - 2048:
                    strength = np.mean(np.abs(y[beat_sample:beat_sample + 2048]))
                    beat_strengths.append(strength)
            
            # Check for 4-beat pattern (strong-weak-medium-weak)
            if len(beat_strengths) >= 8:
                # Group into measures and check if every 4th beat is strongest
                four_pattern = 0
                three_pattern = 0
                
                for i in range(0, len(beat_strengths) - 4, 4):
                    group = beat_strengths[i:i+4]
                    if group[0] == max(group):
                        four_pattern += 1
                
                for i in range(0, len(beat_strengths) - 3, 3):
                    group = beat_strengths[i:i+3]
                    if group[0] == max(group):
                        three_pattern += 1
                
                # Determine most likely time signature
                if four_pattern > three_pattern * 1.2:
                    time_sig = "4/4"
                    confidence = min(1.0, four_pattern / 8)
                elif three_pattern > four_pattern * 1.2:
                    time_sig = "3/4"
                    confidence = min(1.0, three_pattern / 8)
                else:
                    # Ambiguous - default to 4/4 (most common)
                    time_sig = "4/4"
                    confidence = 0.5
            else:
                time_sig = "4/4"  # Default
                confidence = 0.5
        else:
            time_sig = "4/4"
            confidence = 0.3
        
        return {
            'file': os.path.basename(audio_file),
            'timeSignature': time_sig,
            'confidence': float(confidence),
            'bpm': float(tempo),
            'beatCount': len(beats)
        }
        
    except Exception as e:
        return {
            'file': os.path.basename(audio_file),
            'error': str(e)
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No folder specified'}))
        sys.exit(1)
    
    folder = sys.argv[1]
    results = []
    
    # Scan for audio files
    audio_extensions = ('.mp3', '.wav', '.flac', '.m4a', '.ogg', '.wma')
    
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.lower().endswith(audio_extensions):
                file_path = os.path.join(root, file)
                print(f"Analyzing: {file}", file=sys.stderr)
                result = detect_time_signature(file_path)
                results.append(result)
    
    print(json.dumps(results, indent=2))
