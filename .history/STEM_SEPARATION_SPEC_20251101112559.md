<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD028 MD029 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->

# Stem Separation - Technical Specification

## Phase 1: MVP Implementation with Spleeter

### Overview
Integrate Spleeter (MIT-licensed) stem separation into Pro Clipper for extracting vocals, drums, bass, and other instruments from audio clips.

---

## Architecture

### Component Structure
```
src/
├── ProAudioClipper/
│   ├── Components/
│   │   ├── StemExtractor.jsx          # Main UI component
│   │   ├── StemExtractor.css          # Styling
│   │   └── StemProgressModal.jsx      # Progress display
│   └── ProAudioClipper.jsx            # Add stem button
├── services/
│   └── StemSeparationService.js       # Electron IPC bridge
electron/
├── main.js                             # Add IPC handlers
└── services/
    └── spleeterService.js              # Python subprocess manager
python/
├── requirements.txt                    # spleeter==2.4.0
├── separate_stems.py                   # CLI wrapper script
└── models/                             # Auto-downloaded models
    └── 4stems/                         # ~50MB
```

---

## Implementation Details

### 1. Python Setup

**File: `python/requirements.txt`**
```txt
spleeter==2.4.0
tensorflow==2.13.0
numpy==1.24.3
librosa==0.10.1
```

**File: `python/separate_stems.py`**
```python
#!/usr/bin/env python3
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
        # Progress callback
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
        
        # Find output files
        base_name = os.path.splitext(os.path.basename(input_file))[0]
        output_subdir = os.path.join(output_dir, base_name)
        
        stems_files = {}
        if os.path.exists(output_subdir):
            for file in os.listdir(output_subdir):
                if file.endswith('.wav'):
                    stem_name = os.path.splitext(file)[0]
                    stems_files[stem_name] = os.path.join(output_subdir, file)
        
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
```

---

### 2. Electron Service

**File: `electron/services/spleeterService.js`**
```javascript
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class SpleeterService {
  constructor() {
    this.pythonPath = this.findPython();
    this.scriptPath = path.join(app.getAppPath(), 'python', 'separate_stems.py');
    this.activeProcess = null;
  }

  findPython() {
    // Try common Python paths
    const possiblePaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'C:\\Python39\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python311\\python.exe',
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const result = require('child_process').execSync(`${pythonPath} --version`, { 
          encoding: 'utf-8',
          stdio: 'pipe'
        });
        if (result.includes('Python 3')) {
          return pythonPath;
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('Python 3 not found. Please install Python 3.8+');
  }

  async separateStems(inputFile, outputDir, stemsCount = '4stems', progressCallback) {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const args = [
        this.scriptPath,
        inputFile,
        outputDir,
        stemsCount
      ];

      console.log('🎵 Starting Spleeter:', this.pythonPath, args.join(' '));

      this.activeProcess = spawn(this.pythonPath, args);

      let outputBuffer = '';

      this.activeProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        
        // Process line by line
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update = JSON.parse(line);
              console.log('Spleeter update:', update);
              
              if (progressCallback) {
                progressCallback(update);
              }

              if (update.status === 'complete') {
                resolve(update.stems);
              } else if (update.status === 'error') {
                reject(new Error(update.error));
              }
            } catch (e) {
              console.log('Non-JSON output:', line);
            }
          }
        }
      });

      this.activeProcess.stderr.on('data', (data) => {
        console.error('Spleeter stderr:', data.toString());
      });

      this.activeProcess.on('close', (code) => {
        this.activeProcess = null;
        if (code !== 0) {
          reject(new Error(`Spleeter process exited with code ${code}`));
        }
      });

      this.activeProcess.on('error', (err) => {
        reject(new Error(`Failed to start Spleeter: ${err.message}`));
      });
    });
  }

  cancel() {
    if (this.activeProcess) {
      this.activeProcess.kill();
      this.activeProcess = null;
      return true;
    }
    return false;
  }
}

module.exports = new SpleeterService();
```

**File: `electron/main.js` (add IPC handlers)**
```javascript
const { ipcMain } = require('electron');
const spleeterService = require('./services/spleeterService');
const path = require('path');
const { app } = require('electron');

// Add to existing main.js

ipcMain.handle('stem-separation:separate', async (event, { filePath, stemsCount }) => {
  try {
    const outputDir = path.join(app.getPath('userData'), 'stems', Date.now().toString());
    
    const stems = await spleeterService.separateStems(
      filePath,
      outputDir,
      stemsCount,
      (update) => {
        // Send progress updates to renderer
        event.sender.send('stem-separation:progress', update);
      }
    );

    return { success: true, stems };
  } catch (error) {
    console.error('Stem separation error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stem-separation:cancel', async () => {
  const cancelled = spleeterService.cancel();
  return { success: cancelled };
});

ipcMain.handle('stem-separation:check-python', async () => {
  try {
    const pythonPath = spleeterService.pythonPath;
    return { available: true, path: pythonPath };
  } catch (error) {
    return { available: false, error: error.message };
  }
});
```

---

### 3. React Service Bridge

**File: `src/services/StemSeparationService.js`**
```javascript
class StemSeparationService {
  constructor() {
    this.progressCallbacks = new Map();
    this.setupProgressListener();
  }

  setupProgressListener() {
    if (window.electron) {
      window.electron.ipcRenderer.on('stem-separation:progress', (update) => {
        // Notify all registered callbacks
        this.progressCallbacks.forEach(callback => callback(update));
      });
    }
  }

  async checkPythonAvailable() {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }
    return await window.electron.ipcRenderer.invoke('stem-separation:check-python');
  }

  async separateStems(filePath, stemsCount = '4stems', progressCallback) {
    if (!window.electron) {
      throw new Error('Electron IPC not available');
    }

    // Register progress callback
    const callbackId = Date.now();
    if (progressCallback) {
      this.progressCallbacks.set(callbackId, progressCallback);
    }

    try {
      const result = await window.electron.ipcRenderer.invoke('stem-separation:separate', {
        filePath,
        stemsCount
      });

      return result;
    } finally {
      // Cleanup callback
      this.progressCallbacks.delete(callbackId);
    }
  }

  async cancelSeparation() {
    if (!window.electron) {
      return { success: false };
    }
    return await window.electron.ipcRenderer.invoke('stem-separation:cancel');
  }
}

export default new StemSeparationService();
```

---

### 4. React UI Components

**File: `src/ProAudioClipper/Components/StemExtractor.jsx`**
```jsx
import React, { useState } from 'react';
import StemSeparationService from '../../services/StemSeparationService';
import StemProgressModal from './StemProgressModal';
import './StemExtractor.css';

const StemExtractor = ({ clipPath, onStemsExtracted, onClose }) => {
  const [selectedStems, setSelectedStems] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true
  });
  const [quality, setQuality] = useState('4stems'); // 2stems, 4stems, 5stems
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ status: 'idle', progress: 0 });
  const [error, setError] = useState(null);

  const handleExtract = async () => {
    setProcessing(true);
    setError(null);

    try {
      const result = await StemSeparationService.separateStems(
        clipPath,
        quality,
        (update) => {
          setProgress(update);
        }
      );

      if (result.success) {
        // Filter stems based on user selection
        const filteredStems = {};
        Object.entries(result.stems).forEach(([stemName, stemPath]) => {
          if (selectedStems[stemName]) {
            filteredStems[stemName] = stemPath;
          }
        });

        onStemsExtracted(filteredStems);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    await StemSeparationService.cancelSeparation();
    setProcessing(false);
    setProgress({ status: 'cancelled', progress: 0 });
  };

  const toggleStem = (stem) => {
    setSelectedStems(prev => ({ ...prev, [stem]: !prev[stem] }));
  };

  return (
    <div className="stem-extractor">
      <div className="stem-extractor-header">
        <h3>🎵 Extract Stems</h3>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>

      {!processing ? (
        <>
          <div className="stem-selection">
            <h4>Select Stems to Extract:</h4>
            <div className="stem-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={selectedStems.vocals}
                  onChange={() => toggleStem('vocals')}
                />
                <span>🎤 Vocals</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStems.drums}
                  onChange={() => toggleStem('drums')}
                />
                <span>🥁 Drums</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStems.bass}
                  onChange={() => toggleStem('bass')}
                />
                <span>🎸 Bass</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={selectedStems.other}
                  onChange={() => toggleStem('other')}
                />
                <span>🎹 Other</span>
              </label>
            </div>
          </div>

          <div className="quality-selection">
            <h4>Quality:</h4>
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="2stems">2 Stems (Vocals / Accompaniment) - Fast</option>
              <option value="4stems">4 Stems (Vocals / Drums / Bass / Other) - Recommended</option>
              <option value="5stems">5 Stems (Vocals / Drums / Bass / Piano / Other) - Slow</option>
            </select>
            <p className="quality-note">
              Estimated time: {quality === '2stems' ? '30-60s' : quality === '4stems' ? '1-2 min' : '3-5 min'}
            </p>
          </div>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="stem-actions">
            <button className="extract-btn" onClick={handleExtract}>
              Extract Stems →
            </button>
          </div>
        </>
      ) : (
        <StemProgressModal
          progress={progress}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default StemExtractor;
```

**File: `src/ProAudioClipper/Components/StemProgressModal.jsx`**
```jsx
import React from 'react';

const StemProgressModal = ({ progress, onCancel }) => {
  const getStatusText = () => {
    switch (progress.status) {
      case 'initializing':
        return 'Initializing Spleeter...';
      case 'separating':
        return 'Extracting stems...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return `Error: ${progress.error}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="stem-progress-modal">
      <h3>{getStatusText()}</h3>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress.progress || 0}%` }}
        />
      </div>
      
      <p className="progress-percentage">{Math.round(progress.progress || 0)}%</p>
      
      {progress.status !== 'complete' && progress.status !== 'error' && (
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
};

export default StemProgressModal;
```

**File: `src/ProAudioClipper/Components/StemExtractor.css`**
```css
.stem-extractor {
  background: linear-gradient(145deg, #252525, #2a2a2a);
  border-radius: 12px;
  padding: 20px;
  min-width: 400px;
  color: #ffffff;
}

.stem-extractor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.stem-extractor-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
}

.close-btn:hover {
  color: #fff;
}

.stem-selection {
  margin-bottom: 20px;
}

.stem-selection h4 {
  margin-bottom: 12px;
  color: #aaa;
  font-size: 14px;
}

.stem-checkboxes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.stem-checkboxes label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #1a1a1a;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
}

.stem-checkboxes label:hover {
  background: #222;
}

.stem-checkboxes input[type="checkbox"] {
  width: 18px;
  height: 18px;
}

.quality-selection {
  margin-bottom: 20px;
}

.quality-selection h4 {
  margin-bottom: 12px;
  color: #aaa;
  font-size: 14px;
}

.quality-selection select {
  width: 100%;
  padding: 10px;
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
}

.quality-note {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}

.error-message {
  background: #441111;
  border: 1px solid #882222;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 20px;
  color: #ffaaaa;
}

.stem-actions {
  display: flex;
  justify-content: center;
}

.extract-btn {
  background: linear-gradient(145deg, #4CAF50, #45a049);
  border: none;
  border-radius: 6px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}

.extract-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

/* Progress Modal */
.stem-progress-modal {
  text-align: center;
  padding: 20px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #1a1a1a;
  border-radius: 4px;
  overflow: hidden;
  margin: 20px 0;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #45a049);
  transition: width 0.3s ease;
}

.progress-percentage {
  font-size: 24px;
  font-weight: bold;
  color: #4CAF50;
  margin: 12px 0;
}

.cancel-btn {
  background: #444;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  cursor: pointer;
  margin-top: 12px;
}

.cancel-btn:hover {
  background: #555;
}
```

---

## Installation & Setup

### 1. Python Environment Setup
```bash
# Navigate to project root
cd NGKsPlayer

# Create python directory
mkdir python
cd python

# Install requirements
pip install spleeter==2.4.0 tensorflow==2.13.0

# Test installation
python -c "from spleeter.separator import Separator; print('✅ Spleeter installed')"
```

### 2. First-time Model Download
Models will auto-download (~50MB for 4stems) on first use. Cache location:
- Windows: `%USERPROFILE%\.spleeter`
- Mac/Linux: `~/.spleeter`

---

## Usage Workflow

1. User opens Pro Clipper with audio clip
2. User clicks "Extract Stems" button (new button in clipper)
3. StemExtractor modal appears
4. User selects which stems to extract (vocals, drums, bass, other)
5. User chooses quality (2/4/5 stems)
6. Clicks "Extract Stems →"
7. Progress modal shows real-time progress
8. On completion, stems are loaded as new clips/tracks in Pro Clipper
9. Original clip remains unchanged

---

## File Organization

**Stems Storage:**
```
%USERPROFILE%/AppData/Roaming/NGKsPlayer/stems/
├── 1234567890/              # Timestamp
│   ├── song_name/
│   │   ├── vocals.wav
│   │   ├── drums.wav
│   │   ├── bass.wav
│   │   └── other.wav
```

---

## Performance Expectations

| Quality | Stems | Time (3min song) | Model Size |
|---------|-------|------------------|------------|
| 2stems  | 2     | 30-60 seconds    | ~30MB      |
| 4stems  | 4     | 1-2 minutes      | ~50MB      |
| 5stems  | 5     | 3-5 minutes      | ~80MB      |

**CPU Usage:** 50-100% during processing
**RAM Usage:** 1-2GB
**GPU:** Optional (CUDA support if available, ~3x faster)

---

## Next Steps

1. ✅ Review this spec
2. ⏳ Implement Python service
3. ⏳ Implement Electron IPC handlers
4. ⏳ Create React components
5. ⏳ Integrate into Pro Clipper
6. ⏳ Test with various audio files
7. ⏳ Add error handling & edge cases

---

## Future Enhancements (Phase 2+)

- [ ] Upgrade to Demucs for better quality
- [ ] Add stem preview before accepting
- [ ] Batch processing multiple clips
- [ ] Cloud API option (AudioShake)
- [ ] GPU acceleration auto-detection
- [ ] Stem mixing controls
- [ ] Export individual stems

---

**Ready to proceed?** Should I start implementing these files?
