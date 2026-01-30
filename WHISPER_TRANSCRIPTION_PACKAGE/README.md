<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD028 MD029 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->


# 🎤 Whisper AI Audio Transcription - Portable Package

Complete audio-to-text transcription system using OpenAI's Whisper AI. Drop this into any Electron + React app for professional speech recognition with word-level timestamps.

## ✨ Features

- **State-of-the-art AI transcription** using OpenAI Whisper
- **Word-level timestamps** - Perfect for karaoke, subtitles, closed captions
- **5 quality levels** - From lightning-fast (tiny) to ultra-accurate (large)
- **Multi-language support** - 99+ languages with auto-detection
- **Real-time progress tracking** - See transcription status as it happens
- **Offline capable** - Runs locally, no API costs, no internet required (after model download)
- **GPU acceleration** - Automatic CUDA support for 10-100x speedup
- **Clean architecture** - Easy to integrate into any app

## 📦 What's Included

```
WHISPER_TRANSCRIPTION_PACKAGE/
├── README.md                          # This file
├── FILE_LIST.md                       # Complete file inventory
├── python/
│   ├── transcribe_audio.py            # Core Whisper wrapper script
│   └── requirements.txt               # Python dependencies
├── electron/
│   └── services/
│       └── whisperService.cjs         # Electron service manager
├── react/
│   ├── components/
│   │   ├── WhisperTranscriber.jsx     # Main transcription UI
│   │   ├── WhisperTranscriber.css     # Styling
│   │   ├── TranscriptionProgressModal.jsx  # Progress display
│   │   └── TranscriptionProgressModal.css  # Progress styling
│   └── services/
│       └── WhisperTranscriptionService.js  # React IPC bridge
└── integration/
    ├── main-ipc-handlers.cjs          # Example Electron IPC setup
    ├── preload-bridge.cjs             # Example preload script
    └── react-integration-example.jsx  # Usage examples

Total Size: ~15 KB (excluding AI models which download on first use)
```

## 🚀 Quick Start (5 Steps)

### 1. Install Python Dependencies
```bash
pip install openai-whisper
```

Optional (for GPU acceleration):
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### 2. Copy Files to Your Project
```bash
# Python script
cp python/transcribe_audio.py YOUR_PROJECT/python/

# Electron service
cp electron/services/whisperService.cjs YOUR_PROJECT/electron/services/

# React components
cp -r react/components/* YOUR_PROJECT/src/components/
cp react/services/WhisperTranscriptionService.js YOUR_PROJECT/src/services/
```

### 3. Add IPC Handlers (Electron Main Process)
In your `electron/main.cjs`:
```javascript
const { ipcMain } = require('electron');
const whisperService = require('./services/whisperService.cjs');

ipcMain.handle('whisper-transcription:check-python', async () => {
  return await whisperService.checkPythonInstallation();
});

ipcMain.handle('whisper-transcription:transcribe', async (event, { filePath, modelSize, language }) => {
  return await whisperService.transcribeAudio(
    filePath,
    modelSize,
    language,
    (progress) => {
      mainWindow.webContents.send('whisper-transcription:progress', progress);
    }
  );
});

ipcMain.handle('whisper-transcription:cancel', async () => {
  whisperService.cancel();
  return { success: true };
});
```

### 4. Expose IPC in Preload Script
In your `electron/preload.cjs`:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
  }
});
```

### 5. Use in React
```jsx
import WhisperTranscriber from './components/WhisperTranscriber';

function MyComponent() {
  const [showTranscriber, setShowTranscriber] = useState(false);
  const [audioFile, setAudioFile] = useState(null);

  const handleTranscriptionComplete = (transcription) => {
    console.log('Full text:', transcription.text);
    console.log('Words with timestamps:', transcription.words);
    
    // Display words synced with audio playback
    transcription.words.forEach(word => {
      console.log(`${word.start}s - ${word.end}s: "${word.word}"`);
    });
  };

  return (
    <>
      <button onClick={() => setShowTranscriber(true)}>
        Transcribe Audio
      </button>
      
      {showTranscriber && (
        <WhisperTranscriber
          audioFilePath={audioFile}
          onTranscriptionComplete={handleTranscriptionComplete}
          onClose={() => setShowTranscriber(false)}
        />
      )}
    </>
  );
}
```

## 🎯 Model Sizes & Performance

| Model | Size | Accuracy | Speed | Use Case |
|-------|------|----------|-------|----------|
| **tiny** | 39 MB | Basic | 32x realtime | Quick drafts, testing |
| **base** | 74 MB | Good | 16x realtime | ⭐ **Recommended balance** |
| **small** | 244 MB | Better | 6x realtime | Production quality |
| **medium** | 769 MB | Great | 2x realtime | High quality needs |
| **large** | 1.5 GB | Best | 1x realtime | Maximum accuracy |

**GPU vs CPU:**
- **CPU:** Slower but works everywhere
- **GPU (CUDA):** 10-100x faster, requires NVIDIA GPU

## 📊 Output Format

### Full Transcription Object
```json
{
  "text": "Hello world, this is a test recording.",
  "language": "en",
  "duration": 5.2,
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 2.5,
      "text": "Hello world,",
      "words": [
        {"word": "Hello", "start": 0.0, "end": 0.5},
        {"word": "world,", "start": 0.6, "end": 1.2}
      ]
    },
    {
      "id": 1,
      "start": 2.5,
      "end": 5.2,
      "text": "this is a test recording.",
      "words": [
        {"word": "this", "start": 2.5, "end": 2.8},
        {"word": "is", "start": 2.9, "end": 3.0},
        {"word": "a", "start": 3.1, "end": 3.2},
        {"word": "test", "start": 3.3, "end": 3.7},
        {"word": "recording.", "start": 3.8, "end": 5.2}
      ]
    }
  ],
  "words": [
    {"word": "Hello", "start": 0.0, "end": 0.5},
    {"word": "world,", "start": 0.6, "end": 1.2},
    {"word": "this", "start": 2.5, "end": 2.8},
    // ... all words flat
  ]
}
```

## 🎤 Perfect for Karaoke!

Combine with stem separation for the ultimate karaoke system:

```jsx
// 1. Remove vocals from song
await separateStems(songFile); // Gets instrumental

// 2. Transcribe vocals
const lyrics = await transcribeAudio(songFile, 'base');

// 3. Display lyrics synced to instrumental playback
function displayLyrics(currentTime) {
  const currentWord = lyrics.words.find(
    w => currentTime >= w.start && currentTime < w.end
  );
  
  // Highlight current word karaoke-style
  if (currentWord) {
    highlightWord(currentWord.word);
  }
}
```

## 🌍 Supported Languages

Auto-detection works for 99+ languages including:

**Major Languages:**
- English, Spanish, French, German, Italian, Portuguese
- Chinese (Simplified & Traditional), Japanese, Korean
- Russian, Arabic, Hindi, Bengali, Turkish

**Also Supports:**
- Dutch, Polish, Swedish, Czech, Romanian
- Thai, Vietnamese, Indonesian, Greek, Hebrew
- And 80+ more!

See full list: https://github.com/openai/whisper#available-models-and-languages

## ⚙️ Configuration Options

### Model Selection
```jsx
<WhisperTranscriber
  modelSize="base"  // tiny, base, small, medium, large
  language="en"     // Force specific language or "auto"
/>
```

### Manual API Usage
```javascript
import WhisperTranscriptionService from './services/WhisperTranscriptionService';

// Check installation
const status = await WhisperTranscriptionService.checkWhisperAvailable();

// Transcribe
const result = await WhisperTranscriptionService.transcribeAudio(
  '/path/to/audio.mp3',
  'base',     // Model size
  'en'        // Language (optional)
);

// Cancel
await WhisperTranscriptionService.cancelTranscription();
```

## 🔧 Troubleshooting

### "Whisper Not Available"
```bash
pip install openai-whisper
```

### Slow Transcription (CPU-only)
Install PyTorch with CUDA support:
```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### Model Downloads Failing
Models download automatically on first use. Ensure:
- Internet connection active
- ~40MB to 1.5GB free disk space (depending on model)
- No firewall blocking Python

### Import Errors
```bash
pip install --upgrade openai-whisper torch numpy
```

### Out of Memory
- Use smaller model (tiny or base)
- Close other applications
- Enable GPU acceleration

## 💡 Usage Examples

### Basic Transcription
```jsx
const [transcription, setTranscription] = useState(null);

<WhisperTranscriber
  audioFilePath="song.mp3"
  onTranscriptionComplete={setTranscription}
  onClose={() => setShowModal(false)}
/>

{transcription && (
  <div>
    <h3>Lyrics:</h3>
    <p>{transcription.text}</p>
  </div>
)}
```

### Karaoke Display
```jsx
function KaraokeDisplay({ transcription, currentTime }) {
  const currentWords = transcription.words.filter(
    w => currentTime >= w.start && currentTime < w.end
  );
  
  return (
    <div className="karaoke-display">
      {transcription.words.map((word, i) => (
        <span
          key={i}
          className={currentWords.includes(word) ? 'active' : ''}
        >
          {word.word}{' '}
        </span>
      ))}
    </div>
  );
}
```

### Subtitle Export (SRT format)
```javascript
function exportToSRT(transcription) {
  let srt = '';
  transcription.segments.forEach((segment, i) => {
    srt += `${i + 1}\n`;
    srt += `${formatTime(segment.start)} --> ${formatTime(segment.end)}\n`;
    srt += `${segment.text}\n\n`;
  });
  return srt;
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}
```

## 📈 Performance Tips

1. **Start with 'base' model** - Good balance of speed and accuracy
2. **Use GPU** - Install CUDA-enabled PyTorch for 10-100x speedup
3. **Process in chunks** - For long files, split into segments
4. **Cache results** - Save transcriptions to avoid re-processing
5. **Pre-download models** - Run once to download before user needs

## 🎁 Bonus: Combine with Stem Separation

```jsx
// Complete karaoke workflow
async function createKaraokeTrack(songFile) {
  // 1. Get lyrics with timestamps
  const lyrics = await transcribeAudio(songFile, 'base');
  
  // 2. Remove vocals from song
  const stems = await separateStems(songFile); // From stem separator package
  const instrumental = stems.other; // Everything except vocals
  
  // 3. Return karaoke package
  return {
    instrumental: instrumental,  // Audio to play
    lyrics: lyrics.words,        // Words with timestamps
    fullText: lyrics.text        // Complete lyrics text
  };
}
```

## 📝 Requirements

- **Python:** 3.8, 3.9, 3.10, 3.11, 3.12, or 3.13
- **Node.js:** 16+ (for Electron)
- **RAM:** 2GB minimum, 4GB+ recommended for larger models
- **Disk Space:** 40MB to 1.5GB per model
- **GPU (Optional):** NVIDIA GPU with CUDA support for acceleration

## 🔐 Privacy & Security

- ✅ **100% Local** - No cloud APIs, no data sent anywhere
- ✅ **Offline Capable** - Works without internet (after model download)
- ✅ **No API Costs** - Free, unlimited transcriptions
- ✅ **Open Source** - Full transparency, inspect the code

## 📄 License

This package wrapper: MIT License
OpenAI Whisper: MIT License

## 🤝 Support

Issues? Questions? Check:
- OpenAI Whisper docs: https://github.com/openai/whisper
- PyTorch installation: https://pytorch.org/get-started/locally/

## 🚀 Next Steps

1. Install Python dependencies: `pip install openai-whisper`
2. Copy files to your project
3. Add IPC handlers
4. Start transcribing!

Happy transcribing! 🎤✨
