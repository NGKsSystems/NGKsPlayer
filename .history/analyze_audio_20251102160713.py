#!/usr/bin/env python3
"""
Professional Audio Analysis using librosa
Industry-standard BPM and Key detection
"""

import sys
import json
import warnings
warnings.filterwarnings('ignore')

import librosa
import numpy as np

def detect_bpm_and_key(audio_file):
    """
    Analyze audio file for BPM and key using librosa
    Returns JSON with results
    """
    try:
        # Load audio file (suppress warnings)
        y, sr = librosa.load(audio_file, sr=22050, mono=True, res_type='kaiser_fast')
        
        # BPM Detection using librosa's beat tracker
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        bpm = float(tempo)
        
        # Key Detection using chromagram
        chromagram = librosa.feature.chroma_cqt(y=y, sr=sr)
        
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
        
        # Calculate BPM confidence based on beat strength
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
        bpm_confidence = float(np.mean(pulse))
        
        return {
            'bpm': round(bpm),
            'bpmConfidence': min(1.0, max(0.0, bpm_confidence)),
            'key': key,
            'mode': mode,
            'confidence': {
                'bpm': min(1.0, max(0.0, bpm_confidence)),
                'key': min(1.0, max(0.0, key_confidence))
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
