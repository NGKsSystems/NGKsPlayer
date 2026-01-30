import os
import sys
import json
import warnings
import signal
warnings.filterwarnings('ignore')

import librosa
import numpy as np

# Timeout handler
class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("Analysis timeout")

def detect_time_signature(audio_file):
    """Detect time signature with high accuracy"""
    try:
        # Load only first 30 seconds to avoid hanging on long files
        y, sr = librosa.load(audio_file, sr=22050, mono=True, duration=30)
        
        # Use tempogram instead of beat_track to avoid scipy issues
        hop_length = 512
        oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)
        tempogram = librosa.feature.tempogram(onset_envelope=oenv, sr=sr, hop_length=hop_length)
        tempo = librosa.beat.tempo(onset_envelope=oenv, sr=sr, hop_length=hop_length)[0]
        
        # Simple onset detection for beats
        onset_frames = librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop_length)
        beats = librosa.frames_to_time(onset_frames, sr=sr, hop_length=hop_length)
        
        if len(beats) < 8:
            return {'file': os.path.basename(audio_file), 'timeSignature': '4/4', 'confidence': 0.3, 'reason': 'insufficient_beats'}
        
        # Calculate beat intervals
        beat_intervals = np.diff(beats)
        interval_consistency = 1.0 - (np.std(beat_intervals) / (np.mean(beat_intervals) + 1e-6))
        
        # Analyze energy at each beat
        beat_energies = []
        for beat_time in beats[:min(len(beats), 48)]:
            sample_idx = int(beat_time * sr)
            if sample_idx < len(y) - 4096:
                energy = np.sum(y[sample_idx:sample_idx + 4096] ** 2)
                beat_energies.append(energy)
        
        if len(beat_energies) < 8:
            return {'file': os.path.basename(audio_file), 'timeSignature': '4/4', 'confidence': 0.3, 'reason': 'insufficient_data'}
        
        # Normalize energies
        beat_energies = np.array(beat_energies)
        beat_energies = (beat_energies - np.min(beat_energies)) / (np.max(beat_energies) - np.min(beat_energies) + 1e-6)
        
        # Test for 4/4: every 4th beat should be strongest
        score_4 = 0
        for i in range(0, len(beat_energies) - 4, 4):
            if beat_energies[i] == np.max(beat_energies[i:i+4]):
                score_4 += 1
        
        # Test for 3/4: every 3rd beat should be strongest
        score_3 = 0
        for i in range(0, len(beat_energies) - 3, 3):
            if beat_energies[i] == np.max(beat_energies[i:i+3]):
                score_3 += 1
        
        # Test for 6/8: groups of 6 with strong on 1 and 4
        score_6 = 0
        for i in range(0, len(beat_energies) - 6, 6):
            if beat_energies[i] > np.mean(beat_energies[i:i+6]) and beat_energies[i+3] > np.mean(beat_energies[i:i+6]):
                score_6 += 1
        
        # Normalize scores
        max_measures_4 = max(1, (len(beat_energies) - 4) // 4)
        max_measures_3 = max(1, (len(beat_energies) - 3) // 3)
        max_measures_6 = max(1, (len(beat_energies) - 6) // 6)
        
        score_4_norm = score_4 / max_measures_4
        score_3_norm = score_3 / max_measures_3
        score_6_norm = score_6 / max_measures_6
        
        # Determine time signature
        if score_4_norm > score_3_norm * 1.3 and score_4_norm > score_6_norm * 1.2:
            return {
                'file': os.path.basename(audio_file),
                'timeSignature': '4/4',
                'confidence': float(min(1.0, score_4_norm * interval_consistency)),
                'bpm': float(tempo),
                'scores': {'4/4': float(score_4_norm), '3/4': float(score_3_norm), '6/8': float(score_6_norm)}
            }
        elif score_3_norm > score_4_norm * 1.3 and score_3_norm > score_6_norm * 1.2:
            return {
                'file': os.path.basename(audio_file),
                'timeSignature': '3/4',
                'confidence': float(min(1.0, score_3_norm * interval_consistency)),
                'bpm': float(tempo),
                'scores': {'4/4': float(score_4_norm), '3/4': float(score_3_norm), '6/8': float(score_6_norm)}
            }
        elif score_6_norm > score_4_norm * 1.2 and score_6_norm > score_3_norm * 1.2:
            return {
                'file': os.path.basename(audio_file),
                'timeSignature': '6/8',
                'confidence': float(min(1.0, score_6_norm * interval_consistency)),
                'bpm': float(tempo),
                'scores': {'4/4': float(score_4_norm), '3/4': float(score_3_norm), '6/8': float(score_6_norm)}
            }
        else:
            # Ambiguous - default to 4/4
            return {
                'file': os.path.basename(audio_file),
                'timeSignature': '4/4',
                'confidence': 0.5,
                'bpm': float(tempo),
                'scores': {'4/4': float(score_4_norm), '3/4': float(score_3_norm), '6/8': float(score_6_norm)},
                'reason': 'ambiguous'
            }
            
    except Exception as e:
        return {'file': os.path.basename(audio_file), 'error': str(e)}

if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    results = []
    count = 0
    
    extensions = ('.mp3', '.wav', '.flac', '.m4a', '.ogg', '.wma')
    
    # Process all files including subdirectories
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.lower().endswith(extensions):
                count += 1
                filepath = os.path.join(root, file)
                print(f"[{count}] Analyzing: {file}", file=sys.stderr)
                
                try:
                    # Set 60 second timeout per file
                    if sys.platform != 'win32':
                        signal.signal(signal.SIGALRM, timeout_handler)
                        signal.alarm(60)
                    
                    result = detect_time_signature(filepath)
                    
                    if sys.platform != 'win32':
                        signal.alarm(0)  # Cancel timeout
                        
                except TimeoutException:
                    result = {'file': file, 'error': 'timeout_60s'}
                except Exception as e:
                    result = {'file': file, 'error': str(e)}
                
                results.append(result)
                
                # Save incremental results every 50 files
                if count % 50 == 0:
                    with open('time_sig_progress.json', 'w') as f:
                        json.dump({'analyzed': count, 'results': results}, f, indent=2)
    
    print(json.dumps(results, indent=2))
