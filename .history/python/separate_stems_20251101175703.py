#!/usr/bin/env python3
"""
Demucs Stem Separation CLI Wrapper
Extracts vocals, drums, bass, and other instruments from audio files
Uses Demucs v4 (better quality than Spleeter, Python 3.13 compatible)
"""
import sys
import json
import os
import torch
import numpy as np
import librosa
import soundfile as sf

def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "Usage: separate_stems.py <input_file> <output_dir> <stems_count>"}))
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    stems_mode = sys.argv[3]  # "2stems" or "4stems" or "5stems"
    
    # Extract song name from output directory for file naming
    # Output dir will be like: C:\Users\suppo\Music\Stems\Artist - Song Name
    song_name = os.path.basename(output_dir)
    
    try:
        # Progress: Initializing
        print(json.dumps({"status": "initializing", "progress": 0, "message": "Starting stem separation..."}))
        sys.stdout.flush()
        
        # Import Demucs
        from demucs.pretrained import get_model
        from demucs.apply import apply_model
        
        print(json.dumps({"status": "initializing", "progress": 10, "message": "Loading Demucs AI model..."}))
        sys.stdout.flush()
        
        # Choose model based on stems count
        # htdemucs = 4 stems (vocals, drums, bass, other)
        # htdemucs_6s = 6 stems (adds piano, guitar)
        if stems_mode == '5stems':
            model_name = 'htdemucs_6s'
        else:
            model_name = 'htdemucs'
        
        # Load model (downloads ~300MB on first run)
        model = get_model(model_name)
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model.to(device)
        
        print(json.dumps({"status": "initializing", "progress": 25, "message": "Preparing audio file..."}))
        sys.stdout.flush()
        
        # Load audio with librosa (more reliable than torchaudio)
        wav_data, sr = librosa.load(input_file, sr=None, mono=False)
        
        # Ensure stereo (Demucs expects stereo input)
        if wav_data.ndim == 1:
            wav_data = np.stack([wav_data, wav_data])
        elif wav_data.shape[0] > 2:
            wav_data = wav_data[:2]  # Keep only first 2 channels
        
        # Resample if needed
        if sr != model.samplerate:
            wav_data = librosa.resample(wav_data, orig_sr=sr, target_sr=model.samplerate)
        
        # Convert to torch tensor and move to device
        wav = torch.from_numpy(wav_data).float().to(device)
        
        print(json.dumps({"status": "separating", "progress": 35, "message": "Processing audio with AI..."}))
        sys.stdout.flush()
        
        # Apply model (this is the slow part)
        sources = apply_model(model, wav.unsqueeze(0), device=device)[0]
        
        print(json.dumps({"status": "processing", "progress": 75, "message": "AI separation complete, saving stems..."}))
        sys.stdout.flush()
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Save stems
        stems_files = {}
        stem_names = model.sources
        
        if stems_mode == '2stems':
            # Combine non-vocal stems into accompaniment
            vocals_idx = stem_names.index('vocals') if 'vocals' in stem_names else 0
            vocals = sources[vocals_idx]
            
            # Sum all non-vocal stems
            accompaniment = torch.zeros_like(vocals)
            for i, name in enumerate(stem_names):
                if name != 'vocals':
                    accompaniment += sources[i]
            
            # Save vocals
            vocals_path = os.path.join(output_dir, f'{song_name} Vocals.wav')
            vocals_np = vocals.cpu().numpy()
            sf.write(vocals_path, vocals_np.T, model.samplerate)
            stems_files['vocals'] = vocals_path
            
            # Save accompaniment
            accomp_path = os.path.join(output_dir, f'{song_name} Accompaniment.wav')
            accomp_np = accompaniment.cpu().numpy()
            sf.write(accomp_path, accomp_np.T, model.samplerate)
            stems_files['accompaniment'] = accomp_path
            stems_files['other'] = accomp_path  # Alias for UI compatibility
        else:
            # Save each stem separately with song name prefix
            for i, name in enumerate(stem_names):
                # Capitalize first letter of stem name (Drums, Bass, Vocals, Other)
                stem_label = name.capitalize()
                stem_path = os.path.join(output_dir, f'{song_name} {stem_label}.wav')
                stem_np = sources[i].cpu().numpy()
                sf.write(stem_path, stem_np.T, model.samplerate)
                stems_files[name] = stem_path
        
        print(json.dumps({"status": "processing", "progress": 95}))
        sys.stdout.flush()
        
        # Complete
        print(json.dumps({
            "status": "complete",
            "progress": 100,
            "stems": stems_files
        }))
        sys.stdout.flush()
        
    except Exception as e:
        import traceback
        error_details = f"{str(e)}\n{traceback.format_exc()}"
        print(json.dumps({"status": "error", "error": error_details}))
        sys.exit(1)

if __name__ == "__main__":
    main()
