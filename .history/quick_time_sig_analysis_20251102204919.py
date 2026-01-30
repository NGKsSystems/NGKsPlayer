"""
Quick time signature inference based on BPM patterns
Most popular music is 4/4, but we can infer from BPM ranges
"""
import os
import sys
import json
import subprocess

def analyze_folder(folder):
    """Analyze all audio files in folder for BPM and infer time signature"""
    results = []
    count = 0
    
    extensions = ('.mp3', '.wav', '.flac', '.m4a', '.ogg', '.wma')
    
    for root, dirs, files in os.walk(folder):
        for file in files:
            if file.lower().endswith(extensions):
                count += 1
                filepath = os.path.join(root, file)
                print(f"[{count}] Analyzing: {file}", file=sys.stderr)
                
                try:
                    # Use our working BPM analyzer
                    result = subprocess.run(
                        ['python', 'analyze_audio.py', filepath],
                        capture_output=True,
                        text=True,
                        timeout=30
                    )
                    
                    if result.returncode == 0:
                        data = json.loads(result.stdout)
                        
                        # Infer time signature from BPM and other characteristics
                        # Most music is 4/4, but certain BPM ranges suggest otherwise
                        bpm = data.get('bpm', 120)
                        confidence = data.get('bpmConfidence', 0.5)
                        
                        # Default assumption
                        time_sig = '4/4'
                        sig_confidence = 0.85  # High confidence - most music is 4/4
                        
                        # Waltz range (3/4 time)
                        if 60 <= bpm <= 90 and 'waltz' in file.lower():
                            time_sig = '3/4'
                            sig_confidence = 0.7
                        
                        results.append({
                            'file': file,
                            'timeSignature': time_sig,
                            'confidence': sig_confidence,
                            'bpm': bpm,
                            'bpmConfidence': confidence,
                            'key': data.get('key', 'unknown'),
                            'mode': data.get('mode', 'unknown')
                        })
                    else:
                        results.append({'file': file, 'error': 'analysis_failed'})
                        
                except subprocess.TimeoutExpired:
                    results.append({'file': file, 'error': 'timeout'})
                except Exception as e:
                    results.append({'file': file, 'error': str(e)})
                
                # Save progress every 50 files
                if count % 50 == 0:
                    with open('library_analysis_progress.json', 'w') as f:
                        json.dump({'analyzed': count, 'results': results}, f, indent=2)
    
    # Final save
    with open('library_analysis_complete.json', 'w') as f:
        json.dump({'total': count, 'results': results}, f, indent=2)
    
    print(json.dumps({'total': count, 'results': results}, indent=2))

if __name__ == '__main__':
    folder = sys.argv[1] if len(sys.argv) > 1 else '.'
    analyze_folder(folder)
