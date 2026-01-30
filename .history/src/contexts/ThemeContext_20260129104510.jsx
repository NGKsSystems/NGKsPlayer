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
    return { ...themes, ...customThemes }
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
