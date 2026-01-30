#!/usr/bin/env python3
"""
Test the improved analyzer on a specific problematic song
"""

import sys
import os
sys.path.append('.')

from debug_analyzer import analyze_audio_complete

def test_improvements():
    print("Testing Analyzer Improvements")
    print("=" * 50)
    
    # Test files that showed issues in batch analysis
    test_files = [
        r'C:\Users\suppo\Music\Tom MacDonald - Hollywood.mp3',  # Had 180.7 BPM
        r'C:\Users\suppo\Music\Pink Floyd - Breathe .mp3',      # Misclassified as Reggae
        r'C:\Users\suppo\Music\Buckcherry - Hellbound.mp3'     # Had +1.5 LUFS
    ]
    
    improvements_found = []
    
    for test_file in test_files:
        if os.path.exists(test_file):
            print(f"\nTesting: {os.path.basename(test_file)}")
            print("-" * 40)
            
            try:
                result = analyze_audio_complete(test_file, json_mode=True)
                
                bpm = result.get('bpm', 0)
                genre = result.get('genre', '')
                lufs = result.get('lufs', 0)
                confidence = result.get('confidence', {}).get('overall', 0)
                
                print(f"BPM: {bpm:.1f}")
                print(f"Genre: {genre}")
                print(f"LUFS: {lufs:.1f} dB")
                print(f"Confidence: {confidence:.3f}")
                
                # Check for improvements
                if 'Hollywood' in test_file and bpm < 120:
                    improvements_found.append("✅ Hollywood BPM fixed (was 180.7, now realistic)")
                    
                if 'Pink Floyd' in test_file and 'Rock' in genre:
                    improvements_found.append("✅ Pink Floyd genre fixed (was Reggae, now Rock)")
                    
                if 'Buckcherry' in test_file and lufs < 0:
                    improvements_found.append("✅ Buckcherry LUFS fixed (was +1.5, now negative)")
                    
                if confidence > 0.65:
                    improvements_found.append(f"✅ Confidence improved: {confidence:.3f}")
                    
            except Exception as e:
                print(f"Error testing {test_file}: {e}")
        else:
            print(f"File not found: {test_file}")
    
    print(f"\n" + "=" * 50)
    print("IMPROVEMENT SUMMARY:")
    print("=" * 50)
    
    if improvements_found:
        for improvement in improvements_found:
            print(improvement)
        print(f"\n🎯 Total improvements detected: {len(improvements_found)}")
    else:
        print("⚠️ No test files found or no improvements detected")
        print("Run a full batch analysis to validate improvements")

if __name__ == "__main__":
    test_improvements()