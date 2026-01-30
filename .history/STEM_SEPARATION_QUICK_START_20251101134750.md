<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD028 MD029 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->

# 🎵 Stem Separation - Quick Integration Guide

## ✅ Installation Complete!

All Python dependencies have been installed:
- ✅ Spleeter 2.4.0
- ✅ TensorFlow 2.13.0
- ✅ NumPy 1.24.3
- ✅ Librosa 0.10.1

---

## 🚀 Next: Add to Pro Clipper (5 Minutes)

### Step 1: Find Pro Clipper Component

Look for the main Pro Clipper file (likely one of these):
- `src/ProAudioClipper/index.jsx`
- `src/ProAudioClipper/ProClipper.jsx`
- `src/ProAudioClipper/ClipperUI.jsx`

### Step 2: Add Import at Top

```jsx
import StemExtractor from './Components/StemExtractor';
import { useState } from 'react'; // if not already imported
```

### Step 3: Add State (inside component, after other useState calls)

```jsx
const [showStemExtractor, setShowStemExtractor] = useState(false);
const [currentAudioFile, setCurrentAudioFile] = useState(null);
```

### Step 4: Add Button to Toolbar

Find the toolbar buttons section and add:

```jsx
<button 
  className="stem-extract-btn"
  onClick={() => {
    if (currentAudioFile) {
      setShowStemExtractor(true);
    } else {
      alert('Please load an audio file first');
    }
  }}
  title="Extract vocals, drums, bass, and other instruments"
>
  🎵 Extract Stems
</button>
```

### Step 5: Add Modal at Bottom (before closing tag)

```jsx
{/* Stem Extraction Modal */}
{showStemExtractor && (
  <>
    <div className="modal-backdrop" onClick={() => setShowStemExtractor(false)} />
    <StemExtractor
      audioFilePath={currentAudioFile}
      onStemsExtracted={(stems) => {
        console.log('Extracted stems:', stems);
        
        // TODO: Handle extracted stems
        // stems.vocals - path to vocals.wav
        // stems.drums - path to drums.wav
        // stems.bass - path to bass.wav
        // stems.other - path to other.wav
        
        // Example: Load them as new clips
        // loadAudioFile(stems.vocals);
        // loadAudioFile(stems.drums);
        // etc.
        
        setShowStemExtractor(false);
      }}
      onClose={() => setShowStemExtractor(false)}
    />
  </>
)}
```

### Step 6: Add CSS for Modal Backdrop

Add to your main CSS file or create new file:

```css
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.stem-extract-btn {
  background: linear-gradient(145deg, #4CAF50, #45a049);
  border: 1px solid #66bb6a;
  border-radius: 6px;
  padding: 8px 16px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
}

.stem-extract-btn:hover {
  background: linear-gradient(145deg, #45a049, #3d8b40);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
}

.stem-extract-btn:active {
  transform: translateY(0);
}
```

### Step 7: Update Audio File Reference

Find where you load audio files and set the `currentAudioFile` state:

```jsx
const loadAudioFile = (filePath) => {
  // ... existing loading code ...
  setCurrentAudioFile(filePath); // Add this line
};
```

---

## 🎯 Testing

1. **Start the app** (if not already running)
2. **Load an audio file** in Pro Clipper
3. **Click "Extract Stems"** button
4. **Select quality** (2-stem is fastest for testing)
5. **Click "Extract Stems"** in modal
6. **Wait ~1-5 minutes** for processing
7. **Check console** for extracted stem paths

---

## 📊 What to Expect

### First Run (Longer)
- Downloads Spleeter model files (~100MB)
- Initializes TensorFlow
- Processes audio
- **Total: ~5-10 minutes**

### Subsequent Runs (Faster)
- Uses cached models
- Just processes audio
- **Total: ~1-5 minutes**

### Progress States
1. **Initializing** - Loading Spleeter models
2. **Separating** - Processing audio (0-100%)
3. **Processing** - Finalizing stems
4. **Complete** - Ready! Stems available

---

## 🔍 Troubleshooting

### Button doesn't appear
- Check file path in import statement
- Verify component name matches
- Look for console errors

### "Python Not Available" error
- Python packages are installed ✅
- Try clicking "Retry Check" in error modal
- Check terminal for Python version: `python --version`

### Slow processing
- Use **2-stem mode** for faster results
- First run downloads models (one-time)
- 3-4 min songs take 1-5 minutes to process

### Process hangs
- Click **Cancel** button
- Check if audio file path is valid
- Try with shorter audio file (30 sec test)

---

## 💡 What to Do with Stems

Once extraction completes, you get paths like:
```
{
  vocals: "C:/Users/.../stems/20250122_143055/vocals.wav",
  drums: "C:/Users/.../stems/20250122_143055/drums.wav",
  bass: "C:/Users/.../stems/20250122_143055/bass.wav",
  other: "C:/Users/.../stems/20250122_143055/other.wav"
}
```

### Ideas:
1. **Load as new clips** in clipper timeline
2. **Add to sample pads** for triggering
3. **Create separate tracks** for mixing
4. **Export for remixing** in other DAWs
5. **Apply different FX** to each stem
6. **Practice remixing** stems live

---

## 🎨 UI Flow

```
User clicks "Extract Stems"
  ↓
Modal opens with settings
  ↓
User selects quality (2/4/5 stems)
  ↓
User selects which stems to extract
  ↓
User clicks "Extract Stems"
  ↓
Progress modal shows real-time updates
  ↓
Processing completes (1-5 min)
  ↓
onStemsExtracted callback fires
  ↓
You handle stems (load/display/whatever)
  ↓
Modal closes automatically
```

---

## 📁 Files Created

Backend (Python):
- ✅ `python/requirements.txt`
- ✅ `python/separate_stems.py`

Service Layer (Electron):
- ✅ `electron/services/spleeterService.js`
- ✅ `electron/main.cjs` (IPC handlers added)

Bridge Layer (React):
- ✅ `src/services/StemSeparationService.js`

UI Components (React):
- ✅ `src/ProAudioClipper/Components/StemExtractor.jsx`
- ✅ `src/ProAudioClipper/Components/StemExtractor.css`
- ✅ `src/ProAudioClipper/Components/StemProgressModal.jsx`
- ✅ `src/ProAudioClipper/Components/StemProgressModal.css`

Documentation:
- ✅ `STEM_SEPARATION_READY.md` (full reference)
- ✅ `STEM_SEPARATION_QUICK_START.md` (this file)

---

## ✅ You're Ready!

Everything is installed and ready to use. Just follow Steps 1-7 above to add the button to Pro Clipper, and you'll have professional stem separation integrated!

**Need the full documentation?** See `STEM_SEPARATION_READY.md`

---

*Total setup time: ~5 minutes*
*First stem extraction: ~5-10 minutes (model download)*
*Subsequent extractions: ~1-5 minutes*
