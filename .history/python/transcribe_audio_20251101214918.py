#!/usr/bin/env python3
"""
Whisper AI Audio Transcription CLI Wrapper
Transcribes speech from audio files with word-level timestamps
Uses OpenAI's Whisper (local, no API required)
"""
import sys
import json
import os
import whisper
import torch

def main():
    # DEBUG: Print all arguments received
    print(json.dumps({"debug": "sys.argv", "args": sys.argv, "argc": len(sys.argv)}), file=sys.stderr)
    sys.stderr.flush()
    
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: transcribe_audio.py <input_file> <model_size> [language]"}))
        sys.exit(1)
    
    input_file = sys.argv[1]
    model_size = sys.argv[2]  # tiny, base, small, medium, large
    language = sys.argv[3] if len(sys.argv) > 3 else None  # Optional language code (en, es, fr, etc.)
    
    # DEBUG: Print parsed values
    print(json.dumps({"debug": "parsed", "input_file": input_file, "model_size": model_size, "language": language}), file=sys.stderr)
    sys.stderr.flush()
    
    try:
        # Progress: Initializing
        print(json.dumps({"status": "initializing", "progress": 0, "message": "Starting transcription..."}))
        sys.stdout.flush()
        
        # Check for GPU
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        device_name = "GPU (CUDA)" if device == 'cuda' else "CPU"
        
        print(json.dumps({
            "status": "initializing", 
            "progress": 10, 
            "message": f"Loading Whisper {model_size} model on {device_name}..."
        }))
        sys.stdout.flush()
        
        # Load Whisper model (downloads on first run)
        # Models: tiny (~39M), base (~74M), small (~244M), medium (~769M), large (~1550M)
        model = whisper.load_model(model_size, device=device)
        
        print(json.dumps({
            "status": "initializing", 
            "progress": 30, 
            "message": "Model loaded, preparing audio..."
        }))
        sys.stdout.flush()
        
        # Transcribe with word-level timestamps
        print(json.dumps({
            "status": "transcribing", 
            "progress": 40, 
            "message": "Transcribing audio with AI..."
        }))
        sys.stdout.flush()
        
        # Transcription options
        transcribe_options = {
            "task": "transcribe",  # or "translate" for translation to English
            "word_timestamps": True,  # Get word-level timestamps
            "verbose": False
        }
        
        if language:
            transcribe_options["language"] = language
        
        result = model.transcribe(input_file, **transcribe_options)
        
        print(json.dumps({
            "status": "processing", 
            "progress": 80, 
            "message": "Processing transcription results..."
        }))
        sys.stdout.flush()
        
        # Format output with word-level timestamps
        formatted_segments = []
        word_list = []
        
        for segment in result["segments"]:
            segment_data = {
                "id": segment["id"],
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip()
            }
            
            # Add word-level timestamps if available
            if "words" in segment:
                segment_data["words"] = [
                    {
                        "word": word_info["word"].strip(),
                        "start": word_info["start"],
                        "end": word_info["end"]
                    }
                    for word_info in segment["words"]
                ]
                # Add to flat word list for easier access
                word_list.extend(segment_data["words"])
            
            formatted_segments.append(segment_data)
        
        print(json.dumps({
            "status": "processing", 
            "progress": 95, 
            "message": "Finalizing transcription..."
        }))
        sys.stdout.flush()
        
        # Complete with full results
        output = {
            "status": "complete",
            "progress": 100,
            "message": "Transcription complete!",
            "transcription": {
                "text": result["text"].strip(),
                "language": result["language"],
                "segments": formatted_segments,
                "words": word_list,  # Flat list of all words with timestamps
                "duration": result["segments"][-1]["end"] if result["segments"] else 0
            }
        }
        
        print(json.dumps(output))
        sys.stdout.flush()
        
    except Exception as e:
        import traceback
        error_details = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({
            "status": "error", 
            "error": error_details,
            "message": f"Transcription failed: {str(e)}"
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
