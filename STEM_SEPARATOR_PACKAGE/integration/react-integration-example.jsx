// ==========================================
// React Integration Example
// Complete example showing how to use StemExtractor in your React app
// ==========================================

import React, { useState, useCallback } from 'react';
import StemExtractor from './components/StemExtractor';

function MyMusicApp() {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [showStemExtractor, setShowStemExtractor] = useState(false);
  const [currentAudioFile, setCurrentAudioFile] = useState(null);
  const [extractedStems, setExtractedStems] = useState(null);

  // ==========================================
  // EXAMPLE 1: Simple Button Trigger
  // ==========================================
  const handleExtractButtonClick = () => {
    // Set the file you want to process
    setCurrentAudioFile('C:\\Users\\username\\Music\\song.mp3');
    setShowStemExtractor(true);
  };

  // ==========================================
  // EXAMPLE 2: From File Picker
  // ==========================================
  const handleFilePickerExtract = async () => {
    // Use Electron's file dialog
    const filePath = await window.electron.invoke('dialog:openFile', {
      filters: [
        { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] }
      ]
    });
    
    if (filePath) {
      setCurrentAudioFile(filePath);
      setShowStemExtractor(true);
    }
  };

  // ==========================================
  // EXAMPLE 3: Right-Click Context Menu
  // ==========================================
  const handleRightClickExtract = (event, filePath) => {
    event.preventDefault();
    setCurrentAudioFile(filePath);
    setShowStemExtractor(true);
  };

  // ==========================================
  // CALLBACK: When Stems Are Extracted
  // ==========================================
  const handleStemsExtracted = useCallback((stems) => {
    console.log('✅ Extracted stems:', stems);
    /*
    stems = {
      vocals: 'C:\\Users\\...\\Stems\\Song Name\\Song Name Vocals.wav',
      drums: 'C:\\Users\\...\\Stems\\Song Name\\Song Name Drums.wav',
      bass: 'C:\\Users\\...\\Stems\\Song Name\\Song Name Bass.wav',
      other: 'C:\\Users\\...\\Stems\\Song Name\\Song Name Other.wav'
    }
    */
    
    // Store stems in state
    setExtractedStems(stems);
    
    // Close the extractor modal
    setShowStemExtractor(false);
    
    // ==== OPTION A: Load stems as separate tracks ====
    // If you have a multi-track audio player:
    loadStemsIntoTracks(stems);
    
    // ==== OPTION B: Show success message ====
    alert(`✅ Stems extracted successfully!\n\nAvailable stems:\n- Vocals\n- Drums\n- Bass\n- Other`);
    
    // ==== OPTION C: Open folder ====
    // window.electron.invoke('shell:openPath', stemsFolder);
  }, []);

  // ==========================================
  // EXAMPLE FUNCTION: Load Stems Into Tracks
  // ==========================================
  const loadStemsIntoTracks = async (stems) => {
    // This is app-specific - here's a generic example:
    const stemOrder = ['vocals', 'drums', 'bass', 'other'];
    
    for (const stemName of stemOrder) {
      if (stems[stemName]) {
        try {
          // Load audio file
          const response = await fetch(`file://${stems[stemName]}`);
          const arrayBuffer = await response.arrayBuffer();
          
          // Decode audio (if using Web Audio API)
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Add to your player
          // yourPlayer.addTrack({
          //   name: stemName.toUpperCase(),
          //   audioBuffer: audioBuffer,
          //   filePath: stems[stemName]
          // });
          
          console.log(`Loaded ${stemName} stem`);
        } catch (error) {
          console.error(`Failed to load ${stemName}:`, error);
        }
      }
    }
  };

  // ==========================================
  // RENDER
  // ==========================================
  return (
    <div className="my-music-app">
      {/* ========== EXAMPLE UI ========== */}
      <header>
        <h1>My Music App</h1>
      </header>

      <main>
        {/* Example 1: Simple button */}
        <button onClick={handleExtractButtonClick}>
          🎵 Extract Stems
        </button>

        {/* Example 2: File picker button */}
        <button onClick={handleFilePickerExtract}>
          📁 Choose File & Extract
        </button>

        {/* Example 3: Track list with context menu */}
        <div className="track-list">
          {['song1.mp3', 'song2.mp3'].map((fileName) => (
            <div 
              key={fileName}
              className="track-item"
              onContextMenu={(e) => handleRightClickExtract(e, `/path/to/${fileName}`)}
            >
              {fileName}
            </div>
          ))}
        </div>

        {/* Display extracted stems */}
        {extractedStems && (
          <div className="extracted-stems">
            <h3>Extracted Stems:</h3>
            <ul>
              {Object.entries(extractedStems).map(([name, path]) => (
                <li key={name}>
                  <strong>{name}:</strong> {path}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* ========== STEM EXTRACTOR MODAL ========== */}
      {showStemExtractor && (
        <StemExtractor
          audioFilePath={currentAudioFile}
          onStemsExtracted={handleStemsExtracted}
          onClose={() => setShowStemExtractor(false)}
        />
      )}
    </div>
  );
}

export default MyMusicApp;

// ==========================================
// ADDITIONAL EXAMPLES
// ==========================================

// ==== EXAMPLE 4: With Custom Backdrop ====
function ExampleWithBackdrop() {
  const [showExtractor, setShowExtractor] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowExtractor(true)}>Extract</button>
      
      {showExtractor && (
        <>
          {/* Custom backdrop */}
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              zIndex: 999
            }}
            onClick={() => setShowExtractor(false)}
          />
          
          {/* Extractor modal */}
          <div style={{ position: 'relative', zIndex: 1000 }}>
            <StemExtractor
              audioFilePath="/path/to/song.mp3"
              onStemsExtracted={(stems) => {
                console.log(stems);
                setShowExtractor(false);
              }}
              onClose={() => setShowExtractor(false)}
            />
          </div>
        </>
      )}
    </>
  );
}

// ==== EXAMPLE 5: With Loading State ====
function ExampleWithLoading() {
  const [isExtracting, setIsExtracting] = useState(false);
  
  return (
    <>
      <button 
        onClick={() => setIsExtracting(true)}
        disabled={isExtracting}
      >
        {isExtracting ? 'Extracting...' : 'Extract Stems'}
      </button>
      
      {isExtracting && (
        <StemExtractor
          audioFilePath="/path/to/song.mp3"
          onStemsExtracted={(stems) => {
            console.log(stems);
            setIsExtracting(false);
          }}
          onClose={() => setIsExtracting(false)}
        />
      )}
    </>
  );
}

// ==== EXAMPLE 6: Batch Processing ====
async function batchExtractStems(filePaths) {
  for (const filePath of filePaths) {
    try {
      const result = await window.electron.invoke('stem-separation:separate', {
        filePath,
        stemsCount: '4stems'
      });
      
      if (result.success) {
        console.log(`✅ Extracted: ${filePath}`);
        console.log('Stems:', result.stems);
      }
    } catch (error) {
      console.error(`❌ Failed: ${filePath}`, error);
    }
  }
}

// Usage:
// batchExtractStems([
//   'C:\\Music\\song1.mp3',
//   'C:\\Music\\song2.mp3',
//   'C:\\Music\\song3.mp3'
// ]);
