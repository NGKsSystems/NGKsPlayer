#!/usr/bin/env python3
import subprocess
import json
import sys

# Test the debug_analyzer.py JSON output
file_path = r"C:\Users\suppo\Music\Kiss - Heaven's On Fire.mp3"

try:
    result = subprocess.run([
        sys.executable, 'debug_analyzer.py', '--json', file_path
    ], capture_output=True, text=True, cwd=r'C:\Users\suppo\Desktop\NGKsPlayer')
    
    print("STDOUT:")
    print(result.stdout)
    print("\nSTDERR:")
    print(result.stderr)
    print(f"\nReturn code: {result.returncode}")
    
    # Try to parse JSON from stdout
    lines = result.stdout.strip().split('\n')
    for i, line in enumerate(lines):
        line = line.strip()
        if line.startswith('{') and line.endswith('}'):
            try:
                json_data = json.loads(line)
                print(f"\nFound JSON on line {i+1}:")
                print(json.dumps(json_data, indent=2))
                
                # Check for Auto DJ features
                auto_dj_features = ['danceability', 'acousticness', 'instrumentalness', 'liveness']
                missing_features = [f for f in auto_dj_features if f not in json_data]
                if missing_features:
                    print(f"\nMissing Auto DJ features: {missing_features}")
                else:
                    print("\nAll Auto DJ features present!")
                    for feature in auto_dj_features:
                        print(f"  {feature}: {json_data[feature]}")
                break
            except json.JSONDecodeError as e:
                print(f"Failed to parse JSON on line {i+1}: {e}")
                
except Exception as e:
    print(f"Error: {e}")