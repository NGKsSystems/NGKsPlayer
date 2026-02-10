/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AppWithSplash.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
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
      {/* Hidden global SVG filters â€“ available to all themes */}
<svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
  <defs>
    <filter id="rgb-split-filter">
      {/* Red channel shift right */}
      <feOffset in="SourceGraphic" dx="3" dy="0" result="red" />
      <feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />

      {/* Green channel shift left */}
      <feOffset in="SourceGraphic" dx="-3" dy="0" result="green" />
      <feColorMatrix in="green" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />

      {/* Blue channel shift down (optional vertical tear) */}
      <feOffset in="SourceGraphic" dx="0" dy="2" result="blue" />
      <feColorMatrix in="blue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />

      {/* Merge all channels back together */}
      <feMerge>
        <feMergeNode in="red" />
        <feMergeNode in="green" />
        <feMergeNode in="blue" />
        <feMergeNode in="SourceGraphic" />
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

