#!/usr/bin/env python3
"""
Professional Audio Analysis using librosa
Industry-standard BPM and Key detection
"""

import sys
import json
import os

# Suppress all warnings
import warnings
warnings.filterwarnings('ignore')
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

import librosa
import numpy as np

def detect_bpm_and_key(audio_file):
    """
    Analyze audio file for BPM and key using librosa
    Returns JSON with results
    """
    try:
        # Load audio file with basic resampling to avoid scipy issues
        y, sr = librosa.load(audio_file, sr=22050, mono=True)
        
        # BPM Detection with multi-octave analysis
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, aggregate=np.median)
        
        # Try multiple tempo hypotheses to handle octave errors
        tempos = librosa.feature.tempo(
            onset_envelope=onset_env, 
            sr=sr,
            start_bpm=120.0,
            std_bpm=2.0,
            max_tempo=400.0,
            ac_size=8.0,
            aggregate=None  # Get all frames, not aggregated
        )
        
        # Get the most common tempo across frames
        if len(tempos.shape) > 0 and tempos.shape[0] > 1:
            # Multiple frames - use histogram to find most common
            hist, bin_edges = np.histogram(tempos, bins=50, range=(40, 240))
            most_common_bin = np.argmax(hist)
            primary_tempo = (bin_edges[most_common_bin] + bin_edges[most_common_bin + 1]) / 2
        else:
            primary_tempo = float(tempos[0]) if len(tempos) > 0 else float(tempos)
        
        # Multi-octave candidate selection with smart genre-aware scoring
        candidates = []
        for multiplier in [0.25, 0.5, 1.0, 2.0, 4.0]:
            tempo = primary_tempo * multiplier
            if 40 <= tempo <= 240:
                candidates.append(tempo)
        
        # Score each candidate based on musical likelihood
        best_tempo = primary_tempo
        best_score = -1
        
        for candidate in candidates:
            # Base score: prefer the primary detected tempo
            score = 10.0 if abs(candidate - primary_tempo) < 5 else 1.0
            
            # Apply genre-expected tempo range multipliers
            # These ranges are based on actual music analysis, not arbitrary
            if 80 <= candidate <= 140:
                score *= 2.0  # Pop/rock/hip-hop sweet spot (60% of music)
            elif 140 < candidate <= 180:
                score *= 1.8  # Fast rock/electronic/dance
            elif 180 < candidate <= 240:
                score *= 1.5  # Metal/punk/drum & bass - still plausible
            elif 60 <= candidate < 80:
                score *= 1.6  # Reggae/ballads/slow country
            elif 40 <= candidate < 60:
                score *= 0.8  # Very slow (rare but valid)
            
            # For very fast detections, boost the half-time candidate
            # This helps with metal where librosa often detects 2x
            if primary_tempo > 200 and candidate == primary_tempo / 2:
                score *= 1.4  # Boost half-time for extreme tempos
            
            # For very slow detections, boost the double-time candidate
            # This helps with waltz/ballads where librosa undershoots
            if primary_tempo < 70 and candidate == primary_tempo * 2:
                score *= 1.3
                
            if score > best_score:
                best_score = score
                best_tempo = candidate
        
        bpm = float(best_tempo)
        
        # Key Detection using Constant-Q chromagram (better frequency resolution)
        # CQT (Constant-Q Transform) is better than STFT for music key detection
        # hop_length: smaller = more time resolution but slower (default 512)
        # n_chroma: always 12 for standard Western music
        # bins_per_octave: more bins = better frequency resolution (default 12)
        chromagram = librosa.feature.chroma_cqt(
            y=y, 
            sr=sr, 
            hop_length=2048,      # Larger hop for efficiency
            n_chroma=12,          # 12 pitch classes (C, C#, D, etc.)
            bins_per_octave=36    # 3x oversampling for better accuracy
        )
        
        # Average chromagram over time
        chroma_mean = np.mean(chromagram, axis=1)
        
        # Find dominant pitch class
        pitch_class = int(np.argmax(chroma_mean))
        
        # Map to key names
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key = key_names[pitch_class]
        
        # Test all 24 keys (12 major + 12 minor) with Krumhansl-Schmuckler profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        
        # Normalize chroma
        chroma_norm = chroma_mean / (np.sum(chroma_mean) + 1e-6)
        
        best_correlation = -1
        best_key = 'C'
        best_mode = 'major'
        
        # Test all 24 keys
        for rotation in range(12):
            # Rotate profiles to test each key
            major_rotated = np.roll(major_profile, rotation)
            minor_rotated = np.roll(minor_profile, rotation)
            
            # Normalize profiles
            major_norm = major_rotated / (np.sum(major_rotated) + 1e-6)
            minor_norm = minor_rotated / (np.sum(minor_rotated) + 1e-6)
            
            # Calculate correlation using Pearson correlation
            major_corr = np.corrcoef(chroma_norm, major_norm)[0, 1]
            minor_corr = np.corrcoef(chroma_norm, minor_norm)[0, 1]
            
            # Check if this is the best match
            if major_corr > best_correlation:
                best_correlation = major_corr
                best_key = key_names[rotation]
                best_mode = 'major'
            
            if minor_corr > best_correlation:
                best_correlation = minor_corr
                best_key = key_names[rotation]
                best_mode = 'minor'
        
        key = best_key
        mode = best_mode
        key_confidence = max(0, best_correlation)  # Can be negative for poor matches
        
        # Calculate BPM confidence based on onset strength variation
        onset_std = np.std(onset_env)
        bpm_confidence = min(1.0, onset_std / 10.0) if onset_std > 0 else 0.5
        
        return {
            'bpm': int(round(bpm)),
            'bpmConfidence': float(min(1.0, max(0.0, bpm_confidence))),
            'key': str(key),
            'mode': str(mode),
            'confidence': {
                'bpm': float(min(1.0, max(0.0, bpm_confidence))),
                'key': float(min(1.0, max(0.0, key_confidence)))
            }
        }
        
    except Exception as e:
        return {
            'error': str(e),
            'bpm': None,
            'key': None,
            'mode': None
        }

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No audio file specified'}))
        sys.exit(1)
    
    audio_file = sys.argv[1]
    result = detect_bpm_and_key(audio_file)
    print(json.dumps(result))
