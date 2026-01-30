#!/usr/bin/env python3
"""
Spleeter Stem Separation CLI Wrapper
Extracts vocals, drums, bass, and other instruments from audio files
"""
import sys
import json
import os
from spleeter.separator import Separator
from spleeter.audio.adapter import AudioAdapter

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: separate_stems.py <input_file> <output_dir> <stems_count>"}))
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    stems = sys.argv[3]  # "2stems" or "4stems" or "5stems"
    
    try:
        # Progress: Initializing
        print(json.dumps({"status": "initializing", "progress": 0}))
        sys.stdout.flush()
        
        # Initialize separator
        separator = Separator(f'spleeter:{stems}')
        
        print(json.dumps({"status": "separating", "progress": 10}))
        sys.stdout.flush()
        
        # Perform separation
        separator.separate_to_file(
            input_file,
            output_dir,
            codec='wav',
            bitrate='320k'
        )
        
        # Progress: Processing complete
        print(json.dumps({"status": "processing", "progress": 90}))
        sys.stdout.flush()
        
        # Find output files
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_subdir = os.path.join(output_dir, base_name)
        
        stems_files = {}
        if os.path.exists(output_subdir):
            for file in os.listdir(output_subdir):
                if file.endswith('.wav'):
                    stem_name = os.path.splitext(file)[0]
                    stems_files[stem_name] = os.path.join(output_subdir, file)
        
        # Complete
        print(json.dumps({
            "status": "complete",
            "progress": 100,
            "stems": stems_files
        }))
        sys.stdout.flush()
        
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
