/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SplashScreen.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useEffect, useState } from 'react';
import './SplashScreen.css';

const SplashScreen = ({ onComplete }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    console.log('[SplashScreen] Mounted, starting 3-second timer');
    
    // Show splash for 3 seconds, then fade out
    const timer = setTimeout(() => {
      console.log('[SplashScreen] Timer completed, fading out');
      setFadeOut(true);
      setTimeout(() => {
        console.log('[SplashScreen] Fade animation complete, calling onComplete');
        onComplete && onComplete();
      }, 500); // Wait for fade animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`splash-screen ${fadeOut ? 'fade-out' : ''}`}>
      <div className="splash-background">
        <img 
          src="/splash-background.jpg" 
          alt="DJ Setup" 
          className="splash-bg-image"
          onError={(e) => e.target.style.display = 'none'}
        />
        <div className="splash-overlay"></div>
      </div>
      
      <div className="splash-content">
        <h1 className="splash-logo">ProDJsession</h1>
        <p className="splash-tagline">Where Professionals Mix</p>
        
        <div className="splash-loader">
          <div className="loader-bar"></div>
        </div>
        
        <p className="splash-version">v1.0.0</p>
      </div>
    </div>
  );
};

export default SplashScreen;

