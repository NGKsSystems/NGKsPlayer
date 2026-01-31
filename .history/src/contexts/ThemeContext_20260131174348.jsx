import React, { createContext, useContext, useState, useEffect } from 'react'
import themes from '../themes/themes.json'

const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState('modernDark')
  const [themeData, setThemeData] = useState(null)
  const [currentThemeEffect, setCurrentThemeEffect] = useState(null)

  // Load initial theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ngks_theme') || 'modernDark';
    setCurrentTheme(saved);
  }, []);

  // Load and apply theme from folder when currentTheme changes
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Load theme.json from folder
        const jsonModule = await import(`../themes/${currentTheme}/theme.json`);
        const loadedTheme = jsonModule.default || jsonModule;
        setThemeData(loadedTheme);

        // Load CSS from folder (this applies vars, animations, etc.)
        await import(`../themes/${currentTheme}/${currentTheme}.css`);

        // Apply colors from JSON (fallback or override)
        const root = document.documentElement;
        Object.entries(loadedTheme.colors || {}).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });

        Object.entries(loadedTheme.fonts || {}).forEach(([key, value]) => {
          root.style.setProperty(`--font-${key}`, value);
        });

        // Effect flags
        root.dataset.scanlines = loadedTheme.effects?.scanlines || false;
        root.dataset.glow = loadedTheme.effects?.glow || false;
        root.dataset.pixelated = loadedTheme.effects?.pixelated || false;

        if (loadedTheme.effects?.bloodRain) root.dataset.bloodRain = 'true';
        if (loadedTheme.effects?.screenShake) root.dataset.screenShake = 'true';
        if (loadedTheme.effects?.chromatic) root.dataset.chromatic = 'true';

        // Dispatch event
        window.dispatchEvent(new CustomEvent('themeChange', {
          detail: {
            theme: currentTheme,
            effects: loadedTheme.effects || {},
            particles: loadedTheme.effects?.bloodRain || loadedTheme.effects?.particles || false,
            screenShake: loadedTheme.effects?.screenShake || false,
            chromatic: loadedTheme.effects?.chromatic || false
          }
        }));

        console.log('🎨 Loaded theme + CSS from folder:', currentTheme);
        localStorage.setItem('ngks_theme', currentTheme);
      } catch (err) {
        console.error('Failed to load theme folder:', err);
        // Fallback to root themes.json
        const fallback = themes[currentTheme] || themes.modernDark;
        setThemeData(fallback);
        Object.entries(fallback.colors).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      }
    };

    loadTheme();
  }, [currentTheme]);

  const changeTheme = (themeId) => {
    setCurrentTheme(themeId);
  };

  const value = {
    currentTheme,
    changeTheme,
    themeData,
    currentThemeEffect
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}