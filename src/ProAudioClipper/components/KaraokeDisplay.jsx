/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: KaraokeDisplay.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import './KaraokeDisplay.css';

/**
 * Professional Karaoke Display Component
 * 
 * Features:
 * - Synchronized word-by-word lyric highlighting
 * - Album art background with blur/overlay effects
 * - Multiple display modes (fullscreen, overlay, OBS-ready)
 * - Smooth scrolling animations
 * - Customizable styling and effects
 * - Perfect for live performances and OBS streaming
 */
const KaraokeDisplay = ({
  transcription = null,
  currentTime = 0,
  albumArt = null,
  songTitle = '',
  artistName = '',
  displayMode = 'fullscreen', // 'fullscreen', 'overlay', 'obs'
  theme = 'default', // 'default', 'neon', 'classic', 'minimal'
  fontSize = 'large', // 'small', 'medium', 'large', 'xlarge'
  highlightColor = '#00D4FF',
  backgroundColor = 'rgba(0, 0, 0, 0.7)',
  showAlbumArt = true,
  showSongInfo = true,
  linesVisible = 3, // Number of lines to show at once
  onClose
}) => {
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const containerRef = useRef(null);
  const lyricsRef = useRef(null);

  // Group words into lines based on timing gaps
  const lines = useMemo(() => {
    if (!transcription?.words || transcription.words.length === 0) return [];
    
    const lineGroups = [];
    let currentLine = [];
    let lastEndTime = 0;
    
    transcription.words.forEach((word, index) => {
      const gap = word.start - lastEndTime;
      
      // New line if gap > 0.8 seconds or line has 12+ words
      if ((gap > 0.8 && currentLine.length > 0) || currentLine.length >= 12) {
        lineGroups.push([...currentLine]);
        currentLine = [word];
      } else {
        currentLine.push(word);
      }
      
      lastEndTime = word.end;
    });
    
    // Add final line
    if (currentLine.length > 0) {
      lineGroups.push(currentLine);
    }
    
    return lineGroups;
  }, [transcription]);

  // Update current word and line based on playback time
  useEffect(() => {
    if (!transcription?.words) return;
    
    let foundWordIndex = -1;
    let foundLineIndex = 0;
    
    // Find current word
    for (let i = 0; i < transcription.words.length; i++) {
      const word = transcription.words[i];
      if (currentTime >= word.start && currentTime < word.end) {
        foundWordIndex = i;
        break;
      }
    }
    
    // Find current line
    let wordCount = 0;
    for (let i = 0; i < lines.length; i++) {
      wordCount += lines[i].length;
      if (foundWordIndex < wordCount) {
        foundLineIndex = i;
        break;
      }
    }
    
    setCurrentWordIndex(foundWordIndex);
    setCurrentLineIndex(foundLineIndex);
    
    // Auto-scroll to keep current line centered
    if (lyricsRef.current && foundLineIndex >= 0) {
      const lineElements = lyricsRef.current.querySelectorAll('.lyric-line');
      const currentLineElement = lineElements[foundLineIndex];
      if (currentLineElement) {
        currentLineElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [currentTime, transcription, lines]);

  // Check if a word is currently active
  const isWordActive = (wordIndex) => {
    return wordIndex === currentWordIndex;
  };

  // Get the global word index from line and word indices
  const getGlobalWordIndex = (lineIndex, wordIndexInLine) => {
    let globalIndex = 0;
    for (let i = 0; i < lineIndex; i++) {
      globalIndex += lines[i].length;
    }
    return globalIndex + wordIndexInLine;
  };

  // Check if word has been sung (passed)
  const isWordPassed = (wordIndex) => {
    if (!transcription?.words[wordIndex]) return false;
    return currentTime > transcription.words[wordIndex].end;
  };

  if (!transcription || !transcription.words || transcription.words.length === 0) {
    return (
      <div className={`karaoke-display karaoke-${displayMode} karaoke-empty`}>
        <div className="karaoke-placeholder">
          <div className="karaoke-icon">ðŸŽ¤</div>
          <h2>No Lyrics Available</h2>
          <p>Transcribe audio to display synchronized lyrics</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`karaoke-display karaoke-${displayMode} karaoke-theme-${theme} karaoke-size-${fontSize}`}
      style={{
        '--highlight-color': highlightColor,
        '--bg-color': backgroundColor
      }}
    >
      {/* Close button (not for OBS mode) */}
      {displayMode !== 'obs' && onClose && (
        <button className="karaoke-close" onClick={onClose} title="Close Karaoke Display">
          âœ•
        </button>
      )}

      {/* Album Art Background */}
      {showAlbumArt && albumArt && (
        <div className="karaoke-background">
          <img 
            src={albumArt} 
            alt="Album Art" 
            className="karaoke-bg-image"
          />
          <div className="karaoke-bg-overlay" />
        </div>
      )}

      {/* Song Info Header */}
      {showSongInfo && (songTitle || artistName) && (
        <div className="karaoke-header">
          {albumArt && (
            <div className="karaoke-album-art-small">
              <img src={albumArt} alt="Album" />
            </div>
          )}
          <div className="karaoke-song-info">
            {songTitle && <h1 className="karaoke-title">{songTitle}</h1>}
            {artistName && <h2 className="karaoke-artist">{artistName}</h2>}
          </div>
        </div>
      )}

      {/* Lyrics Display */}
      <div className="karaoke-lyrics-container" ref={lyricsRef}>
        <div className="karaoke-lyrics">
          {lines.map((line, lineIndex) => {
            const isCurrentLine = lineIndex === currentLineIndex;
            const isUpcoming = lineIndex > currentLineIndex;
            const isPast = lineIndex < currentLineIndex;
            
            return (
              <div 
                key={lineIndex}
                className={`lyric-line ${isCurrentLine ? 'active' : ''} ${isPast ? 'past' : ''} ${isUpcoming ? 'upcoming' : ''}`}
              >
                {line.map((word, wordIndexInLine) => {
                  const globalIndex = getGlobalWordIndex(lineIndex, wordIndexInLine);
                  const active = isWordActive(globalIndex);
                  const passed = isWordPassed(globalIndex);
                  
                  return (
                    <span
                      key={globalIndex}
                      className={`lyric-word ${active ? 'active' : ''} ${passed ? 'passed' : ''}`}
                      data-start={word.start}
                      data-end={word.end}
                    >
                      {word.word}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress Indicator */}
      {transcription.words.length > 0 && (
        <div className="karaoke-progress">
          <div 
            className="karaoke-progress-bar"
            style={{
              width: `${(currentTime / transcription.words[transcription.words.length - 1].end) * 100}%`
            }}
          />
        </div>
      )}
    </div>
  );
};

export default KaraokeDisplay;

