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
  const [currentThemeEffect, setCurrentThemeEffect] = useState(null)

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ngks_theme')
    if (saved && (themes[saved] || customThemes[saved])) {
      setCurrentTheme(saved)
    }

    const savedCustom = localStorage.getItem('ngks_custom_themes')
    if (savedCustom) {
      try {
        setCustomThemes(JSON.parse(savedCustom))
      } catch (e) {
        console.error('Failed to load custom themes:', e)
      }
    }
  }, [])

  // Apply theme CSS variables + load theme module
  useEffect(() => {
    const theme = themes[currentTheme] || customThemes[currentTheme] || themes.modernDark
    const root = document.documentElement

    // Aggressive cleanup
    root.classList.remove('animate-all', 'filter-active')
    root.style.animation = 'none'
    root.style.filter = 'none'
    document.body.className = ''

    // Load theme module from folder
    import(`../themes/${currentTheme}/index.js`)
      .then(module => {
        // Apply CSS (already imported in index.js)
        // Store effect function if exported
        if (module.applyEffect) {
          setCurrentThemeEffect(() => module.applyEffect)
          console.log(`Loaded effect for ${currentTheme}`)
        }
      })
      .catch(err => {
        console.warn(`No custom effect for ${currentTheme}`, err)
        setCurrentThemeEffect(null)
      })

    setTimeout(() => {
      Object.entries(theme.colors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value)
      })

      Object.entries(theme.fonts).forEach(([key, value]) => {
        root.style.setProperty(`--font-${key}`, value)
      })

      root.dataset.scanlines = theme.effects.scanlines
      root.dataset.glow = theme.effects.glow
      root.dataset.pixelated = theme.effects.pixelated

      if (theme.effects.bloodRain) root.dataset.bloodRain = 'true'
      if (theme.effects.screenShake) root.dataset.screenShake = 'true'
      if (theme.effects.chromatic) root.dataset.chromatic = 'true'

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

      localStorage.setItem('ngks_theme', currentTheme)
    }, 50)
  }, [currentTheme, customThemes])

  const changeTheme = async (themeId) => {
    setCurrentTheme(themeId)
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