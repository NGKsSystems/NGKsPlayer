<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD028 MD029 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->

# 🎵 Stem Separator Package - Portable Installation Guide

This package contains everything you need to add AI-powered stem separation to your Electron + React app.

---

## 📦 Package Contents

```
STEM_SEPARATOR_PACKAGE/
├── README.md (this file)
├── INSTALLATION_GUIDE.md
├── python/
│   ├── separate_stems.py
│   └── requirements.txt
├── electron/
│   └── services/
│       └── demucsService.cjs
├── react/
│   ├── components/
│   │   ├── StemExtractor.jsx
│   │   ├── StemProgressModal.jsx
│   │   ├── StemExtractor.css
│   │   └── StemProgressModal.css
│   └── services/
│       └── StemSeparationService.js
└── integration/
    ├── main-ipc-handlers.js (code to add to your Electron main)
    ├── preload-bridge.js (code to add to your preload)
    └── react-integration-example.jsx
```

---

## 🚀 Quick Start (5 Steps)

### Step 1: Install Python Dependencies
```bash
pip install demucs librosa soundfile
```

### Step 2: Copy Files to Your Project
```
Your Project/
├── python/
│   ├── separate_stems.py          ← Copy from this package
│   └── requirements.txt            ← Copy from this package
├── electron/
│   ├── main.js (or main.cjs)
│   ├── preload.js (or preload.cjs)
│   └── services/
│       └── demucsService.cjs      ← Copy from this package
└── src/
    ├── components/
    │   ├── StemExtractor.jsx       ← Copy from this package
    │   ├── StemProgressModal.jsx   ← Copy from this package
    │   ├── StemExtractor.css       ← Copy from this package
    │   └── StemProgressModal.css   ← Copy from this package
    └── services/
        └── StemSeparationService.js ← Copy from this package
```

### Step 3: Add IPC Handlers to Electron Main
Open your `electron/main.js` (or `main.cjs`) and add:

```javascript
const demucsService = require('./services/demucsService.cjs');
const path = require('path');
const { app, ipcMain } = require('electron');

// Check Python/Demucs installation
ipcMain.handle('stem-separation:check-python', async () => {
  try {
    const status = await demucsService.checkPythonInstallation();
    return status;
  } catch (error) {
    return { available: false, error: error.message };
  }
});

// Start stem separation
ipcMain.handle('stem-separation:separate', async (event, { filePath, stemsCount }) => {
  try {
    const musicFolder = app.getPath('music');
    const parsedPath = path.parse(filePath);
    const songName = parsedPath.name;
    const stemsBaseDir = path.join(musicFolder, 'Stems');
    const songFolder = path.join(stemsBaseDir, songName);
    
    const stems = await demucsService.separateStems(
      filePath,
      songFolder,
      stemsCount,
      (update) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('stem-separation:progress', update);
        }
      }
    );

    return { success: true, stems };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Cancel separation
ipcMain.handle('stem-separation:cancel', async () => {
  demucsService.cancel();
  return { cancelled: true };
});
```

**Note**: Replace `win` with your BrowserWindow variable name.

### Step 4: Add IPC Bridge to Preload
Open your `electron/preload.js` (or `preload.cjs`) and add/ensure:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, callback);
  }
});
```

### Step 5: Use in Your React Component
```jsx
import React, { useState } from 'react';
import StemExtractor from './components/StemExtractor';

function YourComponent() {
  const [showStemExtractor, setShowStemExtractor] = useState(false);
  const [currentAudioFile, setCurrentAudioFile] = useState(null);

  const handleExtractStems = (filePath) => {
    setCurrentAudioFile(filePath);
    setShowStemExtractor(true);
  };

  const handleStemsExtracted = (stems) => {
    console.log('Extracted stems:', stems);
    // stems = { vocals: 'path', drums: 'path', bass: 'path', other: 'path' }
    setShowStemExtractor(false);
    
    // Load stems into your app here
    // Example: loadStemsIntoTracks(stems);
  };

  return (
    <>
      <button onClick={() => handleExtractStems('/path/to/audio.mp3')}>
        🎵 Extract Stems
      </button>

      {showStemExtractor && (
        <StemExtractor
          audioFilePath={currentAudioFile}
          onStemsExtracted={handleStemsExtracted}
          onClose={() => setShowStemExtractor(false)}
        />
      )}
    </>
  );
}
```

---

## 📋 Requirements

### System Requirements:
- **Python**: 3.8 or higher (tested with 3.13.5)
- **Node.js**: 16 or higher
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Disk Space**: 500MB for models (downloaded on first use)

### npm Dependencies:
Already in your project (no additional packages needed):
- `electron`
- `react`

### Python Dependencies:
```bash
pip install demucs librosa soundfile
```

This installs:
- `demucs` - AI stem separation model
- `torch` - PyTorch (auto-installed with demucs)
- `librosa` - Audio processing
- `soundfile` - Audio file I/O

---

## 🎯 Features

### What You Get:
✅ **4-stem separation**: Vocals, Drums, Bass, Other  
✅ **High quality**: Facebook Research Demucs model  
✅ **Progress tracking**: Real-time progress bar  
✅ **Organized output**: Each song gets its own folder  
✅ **Professional UI**: Modal with cancel support  
✅ **Error handling**: Graceful failure with user-friendly messages  

### File Organization:
```
C:\Users\<username>\Music\Stems\
  └── Song Name\
      ├── Song Name Vocals.wav
      ├── Song Name Drums.wav
      ├── Song Name Bass.wav
      └── Song Name Other.wav
```

---

## 🔧 Customization

### Change Output Location:
Edit in your `main.js` IPC handler:
```javascript
// Instead of:
const musicFolder = app.getPath('music');
const stemsBaseDir = path.join(musicFolder, 'Stems');

// Use:
const stemsBaseDir = 'C:\\Your\\Custom\\Path\\Stems';
```

### Change Model Quality:
Edit `python/separate_stems.py` line ~30:
```python
# High quality (default)
model_name = 'htdemucs'

# Or use faster model:
model_name = 'htdemucs_ft'  # Fine-tuned, faster
```

### Change Stem Count:
When calling separator:
```javascript
// 2 stems (vocals + accompaniment)
stemsCount: '2stems'

// 4 stems (vocals, drums, bass, other)
stemsCount: '4stems'

// 5 stems (adds piano/guitar)
stemsCount: '5stems'
```

---

## 🐛 Troubleshooting

### "Python Not Available"
**Solution**: Install Python 3.8+ from python.org

### "Demucs Not Found"
**Solution**: Run `pip install demucs`

### "Module Not Found" Errors
**Solution**: 
1. Check `demucsService.cjs` path to `separate_stems.py`
2. Ensure it's using `app.getAppPath()` correctly
3. Path should be: `path.join(app.getAppPath(), 'python', 'separate_stems.py')`

### Extraction Fails Silently
**Solution**:
1. Open DevTools console to see errors
2. Check if `win` variable is correct in IPC handler
3. Verify `win.webContents.send()` is working

### "Cannot Read Property 'invoke'"
**Solution**: Check preload.cjs exposes `electron.invoke()`:
```javascript
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
```

---

## 📊 Performance

### Processing Speed:
- **CPU-only**: 2-4x slower than real-time
  - 3-minute song = 6-12 minutes
- **With GPU**: Near real-time (requires CUDA setup)

### Quality:
- **Model**: htdemucs (state-of-the-art)
- **Bleed**: 1-5% typical
- **Sample Rate**: Matches input file

---

## 🎓 Advanced Integration

### Context Menu Integration (Like Pro Clipper):
See `integration/react-integration-example.jsx` for:
- Right-click context menu
- Auto-load extracted stems
- Timeline integration

### Batch Processing:
Loop through multiple files:
```javascript
for (const filePath of filePaths) {
  await window.electron.invoke('stem-separation:separate', {
    filePath,
    stemsCount: '4stems'
  });
}
```

---

## 📞 Support

### Common Issues:
1. **Slow extraction**: Normal on CPU, be patient
2. **Vocal bleed**: Normal 1-5%, can't be eliminated
3. **High memory use**: Normal, AI models are large

### Resources:
- Demucs GitHub: https://github.com/facebookresearch/demucs
- Librosa Docs: https://librosa.org/doc/latest/
- PyTorch Docs: https://pytorch.org/docs/

---

## ✅ Installation Complete!

Run your app and test stem extraction:
1. Load an audio file
2. Click "Extract Stems" button (or right-click)
3. Wait for progress bar to complete
4. Check `Music\Stems\` folder for output

**Enjoy professional-grade AI stem separation!** 🎉
