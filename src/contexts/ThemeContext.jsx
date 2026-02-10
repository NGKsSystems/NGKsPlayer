/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ThemeContext.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
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
  const [currentThemeModule, setCurrentThemeModule] = useState(null)
  const [currentHash, setCurrentHash] = useState(window.location.hash)

  // Listen for hash changes to trigger theme reloads
  useEffect(() => {
    const handleHashChange = () => {
      const newHash = window.location.hash
      console.log('ðŸ”„ Route change detected:', newHash)
      setCurrentHash(newHash)
      
      // Force immediate theme reevaluation
      const root = document.documentElement
      if (!shouldHaveThemes()) {
        root.classList.add('dj-route')
        // CRITICAL FIX: Remove data-theme attribute immediately on non-theme routes
        root.removeAttribute('data-theme')
        console.log('ðŸš« Added theme block and removed data-theme for route:', newHash)
      } else {
        root.classList.remove('dj-route')
        console.log('ðŸŽ¨ Removed theme block for route:', newHash)
      }
    }
    
    window.addEventListener('hashchange', handleHashChange)
    
    // Also listen for popstate for browser back/forward
    window.addEventListener('popstate', handleHashChange)
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  // Check if current route should have themes (only simple player)
  const shouldHaveThemes = () => {
    const hash = window.location.hash
    const pathname = window.location.pathname
    
    // GATE: Only /player route gets themes, all others are theme-free
    // Verified theme route: /player (NowPlaying simple player)
    const themeRoutes = ['/player']
    
    // Check both hash-based and pathname-based routing
    const hashRoute = hash.replace('#', '')
    const hasThemeHash = themeRoutes.some(route => hashRoute === route || hashRoute.startsWith(route + '/'))
    const hasThemePath = themeRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
    
    const hasThemes = hasThemeHash || hasThemePath
    return hasThemes
  }

  // Check if current route is a non-theme route (library, DJ, etc)
  const isNoThemeRoute = () => {
    return !shouldHaveThemes()
  }

  // Load initial theme from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ngks_theme') || 'modernDark';
    setCurrentTheme(saved);
  }, []);

  // Initialize route state on mount
  useEffect(() => {
    const root = document.documentElement
    const initialRoute = window.location.hash || window.location.pathname
    console.log('ðŸš€ Initial route detected:', initialRoute)
    
    // Set initial class state based on route
    if (!shouldHaveThemes()) {
      root.classList.add('dj-route')
      // CRITICAL FIX: Remove data-theme attribute on mount for non-theme routes
      root.removeAttribute('data-theme')
      console.log('ðŸš« Initial theme block and removed data-theme for route:', initialRoute)
    } else {
      root.classList.remove('dj-route')
      console.log('ðŸŽ¨ Initial theme enable for route:', initialRoute)
    }
  }, [])

  // Load and apply theme from folder when currentTheme changes
  useEffect(() => {
    console.log('ðŸ”¥ loadTheme useEffect FIRED - currentTheme:', currentTheme, 'currentHash:', currentHash)
    const loadTheme = async () => {
      const root = document.documentElement
      
      // ========== SOLUTION: NO DYNAMIC CSS IMPORTS ==========
      // CSS files are now statically imported in main.jsx
      // We only manage: .dj-route class, data-theme attribute, CSS variables
      console.log('âœ… Route detection + data-theme + CSS variables (NO dynamic CSS import)')
      console.log('Current route:', window.location.hash)
      console.log('Should have themes?', shouldHaveThemes())
      
      if (isNoThemeRoute()) {
        root.classList.add('dj-route')
        root.removeAttribute('data-theme')
        // Clear CSS variables
        const themeVarKeys = ['bg-primary', 'bg-secondary', 'text-primary', 'text-secondary', 
                              'accent-primary', 'accent-secondary', 'accent-tertiary']
        themeVarKeys.forEach(key => root.style.removeProperty(`--${key}`))
        console.log('âœ… Non-theme route: .dj-route added, data-theme removed, variables cleared')
        return
      }
      
      // Theme route - load JSON only (CSS already statically loaded)
      root.classList.remove('dj-route')
      root.setAttribute('data-theme', currentTheme)
      
      try {
        // Try to load NEW modular theme from folder
        const jsonModule = await import(`../themes/${currentTheme}/theme.json`)
        const loadedTheme = jsonModule.default || jsonModule
        setThemeData(loadedTheme)
        
        // Apply CSS variables
        Object.entries(loadedTheme.colors || {}).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value)
        })
        
        Object.entries(loadedTheme.fonts || {}).forEach(([key, value]) => {
          root.style.setProperty(`--font-${key}`, value)
        })
        
        // ========== TEST 5: EFFECT FLAGS ==========
        // Apply visual effect flags from theme.json
        root.dataset.scanlines = loadedTheme.effects?.scanlines || false
        root.dataset.glow = loadedTheme.effects?.glow || false
        root.dataset.pixelated = loadedTheme.effects?.pixelated || false
        
        if (loadedTheme.effects?.bloodRain) root.dataset.bloodRain = 'true'
        if (loadedTheme.effects?.screenShake) root.dataset.screenShake = 'true'
        if (loadedTheme.effects?.chromatic) root.dataset.chromatic = 'true'
        if (loadedTheme.effects?.colorShift) root.dataset.colorShift = 'true'
        
        console.log('âœ… Theme route: Variables + effect flags loaded for', currentTheme)
        // ==========================================
        
        // ========== TEST 6: THEME MODULE (JAVASCRIPT) ==========
        // Load the theme module (index.js) if it exists for advanced effects
        try {
          const themeModule = await import(`../themes/${currentTheme}/index.js`)
          setCurrentThemeModule(themeModule)
          
          // Initialize the theme if it has an init function
          if (themeModule.initTheme) {
            themeModule.initTheme()
          }
          
          // Set global theme effect function for waveform integration
          if (themeModule.applyEffect) {
            window.currentThemeEffect = themeModule.applyEffect
          } else {
            window.currentThemeEffect = null
          }
          
          console.log('âœ… Theme module loaded:', currentTheme)
        } catch (moduleErr) {
          // Module doesn't exist or failed to load - that's OK
          setCurrentThemeModule(null)
          window.currentThemeEffect = null
          console.log('â„¹ï¸ No theme module for', currentTheme)
        }
        // =======================================================
        
        // ========== TEST 7: DISPATCH THEME CHANGE EVENT ==========
        // Dispatch event to activate extreme-effects.js
        window.dispatchEvent(new CustomEvent('themeChange', {
          detail: {
            theme: currentTheme,
            effects: loadedTheme.effects || {},
            particles: loadedTheme.effects?.bloodRain || loadedTheme.effects?.particles || false,
            screenShake: loadedTheme.effects?.screenShake || false,
            chromatic: loadedTheme.effects?.chromatic || false
          }
        }))
        
        console.log('âœ… FULL THEME LOADED:', currentTheme, 'with effects:', loadedTheme.effects)
        // =========================================================
        
      } catch (err) {
        // NEW modular theme not found - fallback to OLD theme system (themes.json)
        console.log('ðŸ“¦ Loading OLD theme system for:', currentTheme)
        const fallbackTheme = themes[currentTheme] || themes.modernDark
        setThemeData(fallbackTheme)
        
        // Apply CSS variables from old theme system
        Object.entries(fallbackTheme.colors || {}).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value)
        })
        
        Object.entries(fallbackTheme.fonts || {}).forEach(([key, value]) => {
          root.style.setProperty(`--font-${key}`, value)
        })
        
        // Apply effect flags from old theme system
        root.dataset.scanlines = fallbackTheme.effects?.scanlines || false
        root.dataset.glow = fallbackTheme.effects?.glow || false
        root.dataset.pixelated = fallbackTheme.effects?.pixelated || false
        
        console.log('âœ… OLD theme loaded:', currentTheme)
        
        // Dispatch event for old themes too
        window.dispatchEvent(new CustomEvent('themeChange', {
          detail: {
            theme: currentTheme,
            effects: fallbackTheme.effects || {},
            particles: false,
            screenShake: false,
            chromatic: false
          }
        }))
      }
      
      // Skip theme loading for non-theme routes (library, DJ, etc)
      if (isNoThemeRoute()) {
        // Mark as no-theme route to prevent theme overrides
        root.classList.add('dj-route') // Keep same class name for CSS compatibility
        
        // Clear theme attributes for non-theme interfaces
        root.removeAttribute('data-theme')
        
        // Remove all custom CSS properties (theme variables) - more comprehensive
        const computedStyles = getComputedStyle(root)
        for (let i = 0; i < computedStyles.length; i++) {
          const property = computedStyles[i]
          if (property.startsWith('--')) {
            root.style.removeProperty(property)
          }
        }
        
        // Also remove from inline styles
        const allStyles = Array.from(root.style)
        allStyles.forEach(property => {
          if (property.startsWith('--')) {
            root.style.removeProperty(property)
          }
        })
        
        // Clear effect flags more aggressively
        delete root.dataset.scanlines
        delete root.dataset.glow
        delete root.dataset.pixelated
        delete root.dataset.bloodRain
        delete root.dataset.screenShake
        delete root.dataset.chromatic
        
        // Remove any remaining theme CSS classes
        root.className = root.className.replace(/theme-\w+/g, '').trim()
        
        // Clear any theme-related CSS link tags and style tags
        const themeLinks = document.querySelectorAll('link[href*="theme"], link[data-theme], style[data-theme]')
        themeLinks.forEach(link => link.remove())
        
        // Clear any dynamically loaded theme CSS
        const allLinks = document.querySelectorAll('link[rel="stylesheet"]')
        allLinks.forEach(link => {
          if (link.href && (link.href.includes('chromaticChaos') || link.href.includes('theme'))) {
            link.remove()
          }
        })
        
        // Clear theme event handlers
        window.currentThemeEffect = null
        
        // Reset body styles that might be affected by themes
        document.body.style.removeProperty('background')
        document.body.style.removeProperty('background-image')
        document.body.style.removeProperty('animation')
        
        // CRITICAL: Dispatch theme cleanup event to deactivate extreme effects
        window.dispatchEvent(new CustomEvent('themeChange', {
          detail: {
            theme: null,
            effects: {},
            particles: false,
            screenShake: false,
            chromatic: false
          }
        }))
        
        console.log('ðŸš« Theme loading blocked for route:', window.location.hash || window.location.pathname)
        
        return
      } else {
        // Remove theme-blocking marker when on theme routes
        root.classList.remove('dj-route')
        console.log('ðŸŽ¨ Theme loading enabled for route:', window.location.hash || window.location.pathname)
      }
      
      try {
        // Load theme.json from folder - ONLY on theme routes
        const jsonModule = await import(`../themes/${currentTheme}/theme.json`);
        const loadedTheme = jsonModule.default || jsonModule;
        setThemeData(loadedTheme);

        // Load CSS from folder (this applies vars, animations, etc.)
        await import(`../themes/${currentTheme}/${currentTheme}.css`);

        // Apply colors from JSON (fallback or override) - ONLY on theme routes
        const root = document.documentElement;
        
        // CRITICAL: Only set data-theme on theme routes
        if (!isNoThemeRoute()) {
          root.setAttribute('data-theme', currentTheme);
        }
        
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

        // Load the theme module (index.js) if it exists for advanced effects
        try {
          const themeModule = await import(`../themes/${currentTheme}/index.js`);
          setCurrentThemeModule(themeModule);
          
          // Initialize the theme if it has an init function
          if (themeModule.initTheme) {
            themeModule.initTheme();
          }
          
          // Set global theme effect function for waveform integration
          if (themeModule.applyEffect) {
            window.currentThemeEffect = themeModule.applyEffect;
          } else {
            window.currentThemeEffect = null;
          }
          

        } catch (moduleErr) {

          setCurrentThemeModule(null);
          window.currentThemeEffect = null;
        }

        console.log('ðŸŽ¨ Loaded theme + CSS from folder:', currentTheme);
        localStorage.setItem('ngks_theme', currentTheme);
      } catch (err) {
        console.error('Failed to load theme folder:', err);
        // Fallback to root themes.json
        const fallback = themes[currentTheme] || themes.modernDark;
        setThemeData(fallback);
        const root = document.documentElement;
        Object.entries(fallback.colors).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      }
    };

    loadTheme();
  }, [currentTheme, currentHash]); // Add currentHash to dependencies

  const changeTheme = (themeId) => {
    // Don't change themes on non-theme routes
    if (isNoThemeRoute()) {
      console.log('ðŸŽ¨ Theme change blocked on non-theme route:', window.location.hash)
      return
    }
    
    // Cleanup previous theme if it has a cleanup function
    if (currentThemeModule && currentThemeModule.cleanupTheme) {
      currentThemeModule.cleanupTheme();
    }
    
    setCurrentTheme(themeId);
  };

  const importTheme = (themeData) => {
    // For now, just console log since we're transitioning to individual files
    console.log('Import theme:', themeData);
    return false;
  };

  const exportTheme = (themeId) => {
    const theme = themeData || themes[themeId];
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  };

  const getAllThemes = () => {
    return themes;
  };

  const value = {
    currentTheme,
    changeTheme,
    themeData,
    currentThemeModule,
    themes: getAllThemes(),
    importTheme,
    exportTheme,
    getAllThemes
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
