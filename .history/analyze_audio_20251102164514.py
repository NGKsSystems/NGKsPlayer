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
        
        # Test octave variations and pick best
        candidates = [
            primary_tempo / 4,  # Quarter time
            primary_tempo / 2,  # Half time  
            primary_tempo,      # Primary
            primary_tempo * 2,  # Double time
            primary_tempo * 4   # Quadruple time
        ]
        
        # Score each candidate - prefer common tempo ranges
        best_tempo = primary_tempo
        best_score = 0
        
        for candidate in candidates:
            if candidate < 40 or candidate > 240:
                continue
                
            # Score based on proximity to common tempo ranges
            score = 1.0
            if 80 <= candidate <= 140:
                score = 2.0  # Most common range
            elif 60 <= candidate < 80 or 140 < candidate <= 180:
                score = 1.5  # Common range
            elif 180 < candidate <= 220:
                score = 1.3  # Fast music
            
            # Boost score if close to detected peak
            if abs(candidate - primary_tempo) < 5:
                score *= 1.5
                
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
        
        # Determine major/minor using key profiles
        major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
        minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
        
        # Rotate chroma to match detected key
        chroma_rotated = np.roll(chroma_mean, -pitch_class)
        
        # Normalize
        chroma_norm = chroma_rotated / np.max(chroma_rotated) if np.max(chroma_rotated) > 0 else chroma_rotated
        major_norm = major_profile / np.max(major_profile)
        minor_norm = minor_profile / np.max(minor_profile)
        
        # Calculate correlation
        major_corr = np.corrcoef(chroma_norm, major_norm)[0, 1]
        minor_corr = np.corrcoef(chroma_norm, minor_norm)[0, 1]
        
        mode = 'major' if major_corr > minor_corr else 'minor'
        key_confidence = max(major_corr, minor_corr)
        
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
