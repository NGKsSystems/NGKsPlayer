import React, { useState, useEffect, useRef } from 'react';
import './VisualDisplay.css';

/**
 * Visual Display Component for Pro Audio Clipper
 * 
 * Flexible visual display system for DJs and performers:
 * - Album art display (from metadata or custom upload)
 * - Custom image/logo display
 * - Video backgrounds
 * - Audio waveform visualization
 * - Spectrum analyzer
 * - Artist/track info overlay
 * - Clock/timer display
 * - Custom text/messages
 * 
 * Perfect for:
 * - DJ sets (show track info + artwork)
 * - Live performances (branding + visuals)
 * - OBS streaming (professional overlay)
 * - Video content creation
 */
const VisualDisplay = ({
  // Content sources
  albumArt = null,
  customImage = null,
  videoSource = null,
  
  // Track information
  songTitle = '',
  artistName = '',
  albumName = '',
  djName = '',
  eventName = '',
  
  // Audio analysis data
  currentTime = 0,
  duration = 0,
  waveformData = null,
  spectrumData = null,
  bpm = null,
  key = null,
  
  // Display options
  displayMode = 'fullscreen', // 'fullscreen', 'overlay', 'obs'
  visualMode = 'album-art', // 'album-art', 'waveform', 'spectrum', 'video', 'minimal', 'dj-mode'
  layout = 'center', // 'center', 'split', 'corner', 'bottom-bar', 'side-panel'
  
  // Customization
  theme = 'default', // 'default', 'neon', 'dark', 'light', 'club'
  primaryColor = '#00D4FF',
  secondaryColor = '#FF6B35',
  backgroundColor = 'rgba(0, 0, 0, 0.85)',
  
  // UI elements
  showTrackInfo = true,
  showProgress = true,
  showTime = true,
  showWaveform = false,
  showSpectrum = false,
  showLogo = false,
  logoImage = null,
  showClock = false,
  customText = '',
  
  // Animations
  animationStyle = 'fade', // 'fade', 'slide', 'zoom', 'pulse', 'none'
  autoRotate = false,
  rotationInterval = 10000, // ms
  
  onClose
}) => {
  const [currentVisual, setCurrentVisual] = useState(albumArt || customImage);
  const [showControls, setShowControls] = useState(false);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    if (showClock) {
      const interval = setInterval(() => {
        setCurrentDateTime(new Date());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showClock]);

  // Auto-rotate visuals
  useEffect(() => {
    if (autoRotate && albumArt) {
      const interval = setInterval(() => {
        // Could cycle through different visual modes or images
        console.log('Auto-rotating visual...');
      }, rotationInterval);
      return () => clearInterval(interval);
    }
  }, [autoRotate, rotationInterval, albumArt]);

  // Update current visual when sources change
  useEffect(() => {
    if (customImage) {
      setCurrentVisual(customImage);
    } else if (albumArt) {
      setCurrentVisual(albumArt);
    }
  }, [albumArt, customImage]);

  // Draw waveform visualization
  useEffect(() => {
    if (showWaveform && waveformData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = primaryColor;
      
      const barWidth = width / waveformData.length;
      waveformData.forEach((value, i) => {
        const barHeight = (value / 255) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      });
    }
  }, [waveformData, showWaveform, primaryColor]);

  // Draw spectrum analyzer
  useEffect(() => {
    if (showSpectrum && spectrumData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / spectrumData.length;
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(0.5, secondaryColor);
      gradient.addColorStop(1, '#FFFFFF');
      
      ctx.fillStyle = gradient;
      
      spectrumData.forEach((value, i) => {
        const barHeight = (value / 255) * height;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
      });
    }
  }, [spectrumData, showSpectrum, primaryColor, secondaryColor]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format clock display
  const formatClock = () => {
    const hours = currentDateTime.getHours().toString().padStart(2, '0');
    const minutes = currentDateTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div 
      className={`visual-display visual-${displayMode} visual-${visualMode} visual-layout-${layout} visual-theme-${theme} visual-anim-${animationStyle}`}
      style={{
        '--primary-color': primaryColor,
        '--secondary-color': secondaryColor,
        '--bg-color': backgroundColor
      }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Close Button */}
      {displayMode !== 'obs' && onClose && showControls && (
        <button className="visual-close" onClick={onClose}>
          ✕
        </button>
      )}

      {/* Background Content */}
      <div className="visual-background">
        {/* Video Background */}
        {visualMode === 'video' && videoSource && (
          <video
            ref={videoRef}
            src={videoSource}
            autoPlay
            loop
            muted
            className="visual-video"
          />
        )}

        {/* Album Art / Custom Image */}
        {(visualMode === 'album-art' || visualMode === 'dj-mode' || visualMode === 'minimal') && currentVisual && (
          <div className="visual-image-container">
            <img 
              src={currentVisual} 
              alt="Visual" 
              className="visual-image"
            />
            <div className="visual-image-overlay" />
          </div>
        )}

        {/* Waveform Visualization */}
        {(visualMode === 'waveform' || showWaveform) && (
          <canvas
            ref={canvasRef}
            className="visual-canvas visual-waveform"
            width={1920}
            height={400}
          />
        )}

        {/* Spectrum Analyzer */}
        {(visualMode === 'spectrum' || showSpectrum) && (
          <canvas
            ref={canvasRef}
            className="visual-canvas visual-spectrum"
            width={1920}
            height={600}
          />
        )}
      </div>

      {/* Content Overlay */}
      <div className="visual-content">
        {/* DJ/Event Branding (Top) */}
        {(djName || eventName || showLogo) && (
          <div className="visual-branding">
            {showLogo && logoImage && (
              <img src={logoImage} alt="Logo" className="visual-logo" />
            )}
            <div className="visual-branding-text">
              {djName && <h2 className="visual-dj-name">{djName}</h2>}
              {eventName && <h3 className="visual-event-name">{eventName}</h3>}
            </div>
            {showClock && (
              <div className="visual-clock">{formatClock()}</div>
            )}
          </div>
        )}

        {/* Main Track Information */}
        {showTrackInfo && (songTitle || artistName) && (
          <div className={`visual-track-info visual-track-${layout}`}>
            {layout === 'center' && currentVisual && visualMode !== 'minimal' && (
              <div className="visual-artwork-large">
                <img src={currentVisual} alt="Album" />
              </div>
            )}
            <div className="visual-text-content">
              {songTitle && <h1 className="visual-song-title">{songTitle}</h1>}
              {artistName && <h2 className="visual-artist-name">{artistName}</h2>}
              {albumName && <h3 className="visual-album-name">{albumName}</h3>}
              {(bpm || key) && (
                <div className="visual-metadata">
                  {bpm && <span className="visual-bpm">{bpm} BPM</span>}
                  {key && <span className="visual-key">{key}</span>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Text/Message */}
        {customText && (
          <div className="visual-custom-text">
            {customText}
          </div>
        )}

        {/* Progress Bar & Time */}
        {showProgress && duration > 0 && (
          <div className="visual-progress-section">
            {showTime && (
              <div className="visual-time-display">
                <span className="visual-current-time">{formatTime(currentTime)}</span>
                <span className="visual-separator">/</span>
                <span className="visual-total-time">{formatTime(duration)}</span>
              </div>
            )}
            <div className="visual-progress-bar">
              <div 
                className="visual-progress-fill"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualDisplay;
