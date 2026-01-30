<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD028 MD029 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->

# 🎵 Stem Separation - Architecture Overview

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Pro Clipper UI                                          │  │
│  │  ┌────────────────────┐                                  │  │
│  │  │ 🎵 Extract Stems  │ ← Button in toolbar              │  │
│  │  └────────────────────┘                                  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ onClick                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StemExtractor.jsx (Modal)                               │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ Quality: [2/4/5 stems] ▼                            │ │  │
│  │  │ ☑ Vocals  ☑ Drums  ☑ Bass  ☑ Other                 │ │  │
│  │  │ [Extract Stems] [Cancel]                            │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ Extract clicked                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StemProgressModal.jsx                                   │  │
│  │  ┌─────────────────────────────────────────────────────┐ │  │
│  │  │ 🎵 Extracting stems from audio...                   │ │  │
│  │  │ ████████████░░░░░░░░░░░░░░░░░░░░░░░░ 47%           │ │  │
│  │  │ This may take 1-5 minutes...                        │ │  │
│  │  │ [Cancel]                                             │ │  │
│  │  └─────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    REACT SERVICE BRIDGE                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  StemSeparationService.js                                │  │
│  │  • setupProgressListener()                               │  │
│  │  • checkPythonAvailable()                                │  │
│  │  • separateStems(file, quality, callback)                │  │
│  │  • cancelSeparation()                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ ipcRenderer.invoke()
┌─────────────────────────────────────────────────────────────────┐
│                  ELECTRON MAIN PROCESS                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  main.cjs (IPC Handlers)                                 │  │
│  │  • stem-separation:check-python                          │  │
│  │  • stem-separation:separate                              │  │
│  │  • stem-separation:cancel                                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  spleeterService.js                                      │  │
│  │  • findPython() - Locates Python executable             │  │
│  │  • checkPythonInstallation()                             │  │
│  │  • separateStems() - Spawns Python process              │  │
│  │  • cancel() - Kills active process                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ child_process.spawn()
┌─────────────────────────────────────────────────────────────────┐
│                    PYTHON SUBPROCESS                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  separate_stems.py                                       │  │
│  │  1. Parse arguments (input, output, stems)               │  │
│  │  2. Initialize Spleeter                                  │  │
│  │  3. Load audio file                                      │  │
│  │  4. Separate stems (ML processing)                       │  │
│  │  5. Save stems to disk                                   │  │
│  │  6. Return paths as JSON                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓ imports
┌─────────────────────────────────────────────────────────────────┐
│                   SPLEETER LIBRARY                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Spleeter 2.4.0 (Deezer Research)                        │  │
│  │  • Pre-trained ML models (2/4/5 stems)                   │  │
│  │  • TensorFlow backend                                    │  │
│  │  • Audio processing pipeline                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      OUTPUT FILES                               │
│  📁 userData/stems/20250122_143055/                            │
│     ├── 🎤 vocals.wav                                          │
│     ├── 🥁 drums.wav                                           │
│     ├── 🎸 bass.wav                                            │
│     └── 🎹 other.wav                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow

### 1. Extraction Request
```
User Action → React State → IPC Invoke → Electron Service → Python Spawn
```

### 2. Progress Updates
```
Python stdout → Electron service → IPC Event → React Service → UI Update
```

### 3. Completion
```
Python exit → Electron callback → IPC Event → React callback → UI action
```

---

## 📨 Message Format

### Progress Messages (Python → React)
```json
{
  "status": "initializing|separating|processing|complete|error",
  "progress": 0-100,
  "error": "error message (if status=error)"
}
```

### Completion Message
```json
{
  "status": "complete",
  "stems": {
    "vocals": "C:/path/to/vocals.wav",
    "drums": "C:/path/to/drums.wav",
    "bass": "C:/path/to/bass.wav",
    "other": "C:/path/to/other.wav"
  }
}
```

---

## 🎯 Key Components

### React UI (Frontend)
- **StemExtractor.jsx**: Main modal with settings
- **StemProgressModal.jsx**: Real-time progress display
- **Styling**: Matches mixer aesthetic

### React Service (Bridge)
- **StemSeparationService.js**: IPC wrapper
- **Manages**: Callbacks, events, state

### Electron Main (Backend)
- **main.cjs**: IPC handler registration
- **spleeterService.js**: Subprocess lifecycle
- **Handles**: Python detection, spawning, cleanup

### Python (Processing)
- **separate_stems.py**: CLI wrapper
- **Spleeter**: ML-based separation engine
- **TensorFlow**: Neural network backend

---

## ⚡ Performance Profile

### CPU Usage
```
Phase 1: Initialization (5-30s)
├─ Load TensorFlow: 🔥🔥░░ (50% CPU)
├─ Load model: 🔥🔥░░ (50% CPU)
└─ Load audio: 🔥░░░ (25% CPU)

Phase 2: Separation (1-4min)
├─ ML inference: 🔥🔥🔥🔥 (100% CPU)
└─ Can use GPU if available

Phase 3: Finalization (5-15s)
├─ Write files: 🔥░░░ (25% CPU)
└─ Cleanup: 🔥░░░ (10% CPU)
```

### Memory Usage
```
Base: ~500MB (TensorFlow + model)
Peak: ~1.5GB (processing 4-min song)
Output: ~100MB per stem (44.1kHz WAV)
```

### Disk Space
```
Models (first run): ~100MB
Stems (per song): ~400MB (4 stems × 100MB)
Cache: Auto-cleans old sessions
```

---

## 🛡️ Error Handling

### Python Not Found
```
spleeterService → Searches common paths
↓ Not found
React UI → Shows installation instructions
```

### Process Crashes
```
Python exit code ≠ 0
↓
Electron service → Captures stderr
↓
React UI → Shows error message
```

### User Cancellation
```
Cancel button → IPC cancel invoke
↓
Electron → Kills Python process (SIGTERM)
↓
React → Shows "Cancelled" status
```

### File Issues
```
Invalid path → Python error
↓
JSON error message → Electron
↓
React → Shows user-friendly error
```

---

## 🔐 Security

### Subprocess Isolation
- Python runs in separate process
- No direct file system access from renderer
- All paths validated in main process

### IPC Security
- contextIsolation enabled
- nodeIntegration disabled (recommended)
- All IPC goes through preload (if configured)

### File Handling
- Output directory in userData (app-controlled)
- No arbitrary path writes
- Timestamp-based folders prevent conflicts

---

## 🚀 Future Optimizations

### Performance
- [ ] GPU acceleration (TensorFlow GPU)
- [ ] Model caching (reduce init time)
- [ ] Parallel processing (multiple files)
- [ ] Quality presets (fast/balanced/quality)

### Features
- [ ] Stem preview (before full extraction)
- [ ] Custom output formats (MP3, FLAC)
- [ ] Batch processing interface
- [ ] Stem mixing/remixing UI

### UX
- [ ] Estimated time calculation
- [ ] Cancel confirmation
- [ ] Resume interrupted extractions
- [ ] Background processing notification

---

## 📚 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| UI | React 18.3.1 | Component rendering |
| Desktop | Electron 29.4.6 | Native app wrapper |
| IPC | ipcMain/ipcRenderer | Process communication |
| Subprocess | Node child_process | Python execution |
| ML Engine | Spleeter 2.4.0 | Stem separation |
| ML Backend | TensorFlow 2.13.0 | Neural networks |
| Audio | Librosa 0.10.1 | Audio I/O |
| Language | Python 3.8+ | ML processing |

---

## ✅ System Requirements

### Minimum
- CPU: Multi-core (4+ cores recommended)
- RAM: 4GB (8GB recommended)
- Disk: 2GB free space
- Python: 3.8 or higher
- OS: Windows 7+, macOS 10.13+, Ubuntu 18.04+

### Recommended
- CPU: 8+ cores or GPU (NVIDIA CUDA)
- RAM: 16GB
- Disk: SSD with 10GB free
- Python: 3.10
- OS: Windows 10+, macOS 11+, Ubuntu 20.04+

---

*Architecture designed for extensibility, performance, and user experience*
