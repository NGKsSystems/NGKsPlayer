import React, { useState, useEffect } from 'react';
import SplashScreen from './components/SplashScreen';

const AppWithSplash = ({ children }) => {
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);

  useEffect(() => {
    // Check if we've already shown splash this session
    const splashShown = sessionStorage.getItem('prodjsession_splash_shown');
    if (splashShown) {
      setShowSplash(false);
      setSplashComplete(true);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('prodjsession_splash_shown', 'true');
    setSplashComplete(true);
    // Small delay before removing splash from DOM
    setTimeout(() => {
      setShowSplash(false);
    }, 500);
  };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <div style={{ opacity: splashComplete ? 1 : 0, transition: 'opacity 0.5s' }}>
        {children}
      </div>
    </>
  );
};

export default AppWithSplash;
