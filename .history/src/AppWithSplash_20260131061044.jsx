import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';
import initCoordinator from './services/InitializationCoordinator';

/**
 * AppWithSplash Component
 *
 * Handles splash screen display and initialization coordination
 * Fixes: Removed opacity trap, now content is visible from start
 * Problem Fixed: Content was hidden by opacity: 0 during initialization
 */
const AppWithSplash = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    console.log('[AppWithSplash] Mounted, showSplash:', showSplash);
    
    // Check if we've already shown splash this session
    const splashShown = sessionStorage.getItem('prodjsession_splash_shown');
    if (splashShown) {
      console.log('[AppWithSplash] Splash already shown this session, hiding it');
      setShowSplash(false);
    }
  }, []);

  /**
   * Handle splash completion
   * Mark UI as ready in the initialization coordinator
   */
  const handleSplashComplete = () => {
    console.log('[AppWithSplash] Splash completed');
    sessionStorage.setItem('prodjsession_splash_shown', 'true');
    
    // Signal that UI is ready
    initCoordinator.setReady('uiReady', true);
    console.log('[AppWithSplash] Set uiReady = true');
    
    // Remove splash from DOM
    setShowSplash(false);
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      
      {/* SVG Filters for Theme Effects */}
      <svg style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <defs>
          <filter id="rgb-split-filter">
            <feOffset in="SourceGraphic" dx="2" dy="0" result="redshift" />
            <feColorMatrix type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" in="redshift" result="redonly" />
            <feOffset in="SourceGraphic" dx="-2" dy="0" result="greenshift" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" in="greenshift" result="greenonly" />
            <feMerge>
              <feMergeNode in="redonly" />
              <feMergeNode in="SourceGraphic" />
              <feMergeNode in="greenonly" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      
      {/* CRITICAL FIX: Content is now always visible (no opacity: 0) */}
      {/* Splash screen uses z-index to appear on top */}
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default AppWithSplash;
