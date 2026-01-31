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
  const [customThemes, setCustomThemes] = useState({})

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ngks_theme')
    if (saved && (themes[saved] || customThemes[saved])) {
      setCurrentTheme(saved)
    }

    // Load custom themes
    const savedCustom = localStorage.getItem('ngks_custom_themes')
    if (savedCustom) {
      try {
        setCustomThemes(JSON.parse(savedCustom))
      } catch (e) {
        console.error('Failed to load custom themes:', e)
      }
    }
  }, [])

  // Apply theme CSS variables
  useEffect(() => {
    const theme = themes[currentTheme] || customThemes[currentTheme] || themes.modernDark
    const root = document.documentElement

    // RESET: Clear all animations/filters first to prevent bleeding
    root.classList.remove('animate-all', 'filter-active')
    root.style.animation = 'none'
    root.style.filter = 'none'
    
    // Clear any existing theme classes from body
    document.body.className = document.body.className.replace(/\b\w+-\w+(-\w+)?\b/g, '')
    
    // Small delay to force reflow and prevent bleeding
    setTimeout(() => {
      // Apply color variables
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })

      // Apply font variables
      Object.entries(theme.fonts).forEach(([key, value]) => {
        root.style.setProperty(`--font-${key}`, value)
      })

      // Apply effect flags as data attributes
      root.dataset.scanlines = theme.effects.scanlines
      root.dataset.glow = theme.effects.glow
      root.dataset.pixelated = theme.effects.pixelated
      
      // Apply extreme effects
      if (theme.effects.bloodRain) root.dataset.bloodRain = 'true'
      if (theme.effects.screenShake) root.dataset.screenShake = 'true'  
      if (theme.effects.chromatic) root.dataset.chromatic = 'true'

      // Dispatch theme change event for extreme effects
      window.dispatchEvent(new CustomEvent('themeChange', {
        detail: {
          theme: currentTheme,
          effects: theme.effects,
          particles: theme.effects.bloodRain || theme.effects.particles || false,
          screenShake: theme.effects.screenShake || false,
          chromatic: theme.effects.chromatic || false
        }
      }))
      
      console.log('🎨 Theme applied:', currentTheme, 'Effects:', theme.effects)

      // Save to localStorage
      localStorage.setItem('ngks_theme', currentTheme)
    }, 50) // Small delay to prevent bleeding
  }, [currentTheme, customThemes])

  const changeTheme = async (themeId) => {
    // 1. Validate theme exists
    if (!themes[themeId] && !customThemes[themeId]) {
      console.error(`Theme ${themeId} not found`);
      return;
    }

    // 2. Update React state first - this will trigger the useEffect
    console.log(`🔄 Changing theme from ${currentTheme} to ${themeId}`);
    setCurrentTheme(themeId);

    // 3. Aggressive cleanup FIRST - kill old effects completely
    if (window.currentThemeEffect) {
      window.currentThemeEffect = null;
    }

    // Clear canvas state globally
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;
      }
    });

    // Clear all filters and animations on root/body
    const root = document.documentElement;
    root.style.filter = 'none';
    root.style.animation = 'none';
    document.body.style.filter = 'none';
    document.body.style.animation = 'none';

    // Remove any leftover classes from body
    document.body.className = '';

    // 4. Set the data-theme attribute immediately
    root.setAttribute('data-theme', themeId);

    
    // 5. The useEffect will handle the actual theme application when currentTheme changes
    // Just handle special theme effects here
    setTimeout(() => {
      // Handle special effects for specific themes
      if (themeId === 'chromaticChaos') {
        import('../themes/chromaticChaos/index.js')
          .then(themeModule => {
            window.currentThemeEffect = themeModule.applyChromaticChaos;
            console.log('Chromatic Chaos effects loaded');
          })
          .catch(err => {
            console.error('Failed to load Chromatic Chaos effects:', err);
          });
      }
      // Add similar blocks for other themes later
    }, 50);
  };

  const importTheme = (themeData) => {
    try {
      const newThemes = { ...customThemes, [themeData.id]: themeData }
      setCustomThemes(newThemes)
      localStorage.setItem('ngks_custom_themes', JSON.stringify(newThemes))
      return true
    } catch (e) {
      console.error('Failed to import theme:', e)
      return false
    }
  }

  const exportTheme = (themeId) => {
    const theme = themes[themeId] || customThemes[themeId]
    if (!theme) return null
    return JSON.stringify(theme, null, 2)
  }

  const getAllThemes = () => {
    const allThemes = { ...themes, ...customThemes }
    console.log('🎨 Available themes:', Object.keys(allThemes))
    return allThemes
  }

  const value = {
    currentTheme,
    changeTheme,
    importTheme,
    exportTheme,
    getAllThemes,
    themes: getAllThemes()
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}