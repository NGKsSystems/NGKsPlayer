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
      
      {/* CRITICAL FIX: Content is now always visible (no opacity: 0) */}
      {/* Splash screen uses z-index to appear on top */}
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
};

export default AppWithSplash;
