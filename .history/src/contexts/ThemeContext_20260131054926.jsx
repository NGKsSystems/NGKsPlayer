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

    // Apply theme-specific body classes
    document.body.className = document.body.className.replace(/\b\w+-\w+(-\w+)?\b/g, ''); // Remove existing theme classes
    if (currentTheme === 'chromaticChaos') {
      document.body.classList.add('chromatic-chaos');
    } else if (currentTheme === 'cyberBloodbath') {
      document.body.classList.add('cyber-bloodbath');
    } else if (currentTheme === 'hyperAurora') {
      document.body.classList.add('hyper-aurora');
    } else if (currentTheme === 'diamondRain') {
      document.body.classList.add('diamond-rain');
    } else if (currentTheme === 'neonNightmare') {
      document.body.classList.add('neon-nightmare');
    } else if (currentTheme === 'galacticStorm') {
      document.body.classList.add('galactic-storm');
    } else if (currentTheme === 'quantumDrift') {
      document.body.classList.add('quantum-drift');
    }

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
    
    console.log('🎨 Theme changed to:', currentTheme, 'Effects:', theme.effects)

    // Save to localStorage
    localStorage.setItem('ngks_theme', currentTheme)
  }, [currentTheme, customThemes])

  const changeTheme = (themeId) => {
    if (themes[themeId] || customThemes[themeId]) {
      setCurrentTheme(themeId)
    }
  }

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
