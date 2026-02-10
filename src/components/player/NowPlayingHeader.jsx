/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: NowPlayingHeader.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';

/**
 * Header component with navigation and theme switcher
 * Updated with larger button sizes for accessibility
 */
export function NowPlayingHeader({ 
  detectedBPM, 
  currentTheme, 
  themes, 
  showThemeMenu, 
  setShowThemeMenu, 
  onChangeTheme, 
  onNavigate 
}) {
  
  // Test function for extreme effects
  const triggerExtremeEffects = () => {
    // Simulate super peak for screen shake and blood explosion
    window.dispatchEvent(new CustomEvent('audioAnalysis', {
      detail: {
        volume: 0.95,
        bass: 0.9,
        mid: 0.7, 
        treble: 0.6,
        frequencyData: new Array(512).fill(200),
        timeData: new Array(512).fill(180),
        beat: true,
        beatIntensity: 1.0
      }
    }))
    
    // Trigger beat detection
    window.dispatchEvent(new CustomEvent('beatDetected', {
      detail: { intensity: 1.0, bass: 0.9, mid: 0.7, treble: 0.6 }
    }))
  }
  return (
    <div className="p-4 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">Now Playing</h1>
        
        {/* BPM Display - Compact */}
        {detectedBPM && (
          <div 
            className="px-3 py-1 rounded-lg text-sm font-bold glow-border"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '2px solid var(--accent-primary)',
              color: 'var(--accent-primary)'
            }}
          >
            â™© {detectedBPM}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 relative">
        {currentTheme === 'cyberBloodbath' && (
          <button
            onClick={triggerExtremeEffects}
            className="bg-red-600 hover:bg-red-700 rounded"
            style={{
              fontSize: '24px',
              fontWeight: 'bold',
              padding: '12px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
            title="Test Blood Effects ðŸ©¸"
          >
            ðŸ©¸ BLOOD
          </button>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowThemeMenu(!showThemeMenu);
          }}
          className="bg-purple-600 hover:bg-purple-700 rounded"
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
          title="Change Theme"
        >
          ðŸŽ¨ Theme
        </button>
        
        {showThemeMenu && (
          <div 
            className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50"
            style={{ minWidth: '200px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {Object.values(themes).map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onChangeTheme(theme.id);
                  setShowThemeMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 text-xl ${
                  currentTheme === theme.id ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                {currentTheme === theme.id ? 'âœ“ ' : ''}{theme.name}
              </button>
            ))}
          </div>
        )}
        
        <button
          onClick={() => onNavigate?.('library')}
          className="bg-blue-600 hover:bg-blue-700 rounded"
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            padding: '12px 20px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          ðŸ“š Back to Library
        </button>
      </div>
    </div>
  );
}

