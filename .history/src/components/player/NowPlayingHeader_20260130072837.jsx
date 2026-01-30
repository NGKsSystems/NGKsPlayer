import React from 'react';

/**
 * Header component with navigation and theme switcher
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
            ♩ {detectedBPM}
          </div>
        )}
      </div>
      
      <div className="flex gap-2 relative">
        <button
          onClick={() => setShowThemeMenu(!showThemeMenu)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
          title="Change Theme"
        >
          🎨 Theme
        </button>
        
        {showThemeMenu && (
          <div 
            className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 z-50"
            style={{ minWidth: '200px' }}
          >
            {Object.values(themes).map((theme) => (
              <button
                key={theme.id}
                onClick={() => {
                  onChangeTheme(theme.id);
                  setShowThemeMenu(false);
                }}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-700 ${
                  currentTheme === theme.id ? 'bg-gray-700 font-bold' : ''
                }`}
              >
                {currentTheme === theme.id ? '✓ ' : ''}{theme.name}
              </button>
            ))}
          </div>
        )}
        
        <button
          onClick={() => onNavigate?.('library')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          📚 Back to Library
        </button>
      </div>
    </div>
  );
}
