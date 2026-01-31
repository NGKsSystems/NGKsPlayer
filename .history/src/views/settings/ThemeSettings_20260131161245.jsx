import React, { useState, useEffect } from 'react'
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom'

const ThemeSettings = () => {
  const { currentTheme, changeTheme, themes, importTheme, exportTheme } = useTheme()
  const navigate = useNavigate()
  const [importError, setImportError] = useState('')
  const [forceUpdate, setForceUpdate] = useState(0)

  // Debug: Log currentTheme changes
  useEffect(() => {
    console.log('ThemeSettings: currentTheme changed to:', currentTheme)
    setForceUpdate(prev => prev + 1) // Force component re-render
  }, [currentTheme])

  const handleThemeChange = (themeId) => {
    console.log('ThemeSettings: Changing theme to:', themeId)
    changeTheme(themeId)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      try {
        const text = await file.text()
        const themeData = JSON.parse(text)
        
        if (importTheme(themeData)) {
          setImportError('')
          alert(`Theme "${themeData.name}" imported successfully!`)
        } else {
          setImportError('Failed to import theme. Check console for details.')
        }
      } catch (err) {
        setImportError(`Invalid theme file: ${err.message}`)
      }
    }
    input.click()
  }

  const handleExport = () => {
    const themeJson = exportTheme(currentTheme)
    if (!themeJson) return

    const blob = new Blob([themeJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentTheme}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6" style={{ 
      backgroundColor: 'var(--bg-secondary)', 
      color: 'var(--text-primary)' 
    }}>
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:glow-border"
          style={{
            backgroundColor: 'var(--button-bg)',
            color: 'var(--text-primary)'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Settings
        </button>
        <h2 className="text-2xl font-bold glow-text" style={{ color: 'var(--accent-primary)' }}>
          Theme Settings
        </h2>
      </div>

      <div>
        <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
          Choose a visual theme or import your own custom theme
        </p>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-3">Select Theme</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(themes).map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center justify-center min-h-[120px] ${
                selectedTheme === theme.id
                  ? 'glow-border border-[var(--accent-primary)] bg-[var(--button-active)] text-[var(--bg-primary)]'
                  : 'border-[var(--border-subtle)] bg-[var(--button-bg)] text-[var(--text-primary)] hover:glow-border'
              }`}
            >
              {/* Checkmark + Name */}
              <div className="font-bold mb-2 flex items-center gap-2">
                {selectedTheme === theme.id && <span className="text-lg">✓</span>}
                {theme.name}
              </div>

              {/* Color preview swatches */}
              <div className="flex gap-1 justify-center">
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors['accent-primary'] }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors['accent-secondary'] }} />
                <div className="w-6 h-6 rounded" style={{ backgroundColor: theme.colors['accent-success'] }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-lg font-semibold mb-3">Import/Export</h3>
        <div className="flex gap-4">
          <button
            onClick={handleImport}
            className="px-4 py-2 rounded border-2 hover:glow-border"
            style={{
              backgroundColor: 'var(--button-bg)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            📥 Import Theme
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded border-2 hover:glow-border"
            style={{
              backgroundColor: 'var(--button-bg)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-primary)'
            }}
          >
            📤 Export Current Theme
          </button>
        </div>
        {importError && (
          <p className="mt-2 text-sm" style={{ color: 'var(--accent-error)' }}>
            {importError}
          </p>
        )}
      </div>

      <div className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-lg font-semibold mb-3">Theme Effects</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-semibold mb-1">Scanlines</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {themes[selectedTheme]?.effects.scanlines ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-semibold mb-1">Glow Effects</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {themes[selectedTheme]?.effects.glow ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
          <div className="p-3 rounded" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <div className="text-sm font-semibold mb-1">Pixelated</div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {themes[selectedTheme]?.effects.pixelated ? '✅ Enabled' : '❌ Disabled'}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t pt-6" style={{ borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-lg font-semibold mb-3">Create Your Own</h3>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Export a theme, edit the JSON file to customize colors/fonts/effects, then import it back.
        </p>
        <a 
          href="#"
          onClick={(e) => {
            e.preventDefault()
            alert('Theme documentation: Edit the JSON file to customize:\n\n• colors: All color values (hex or rgba)\n• fonts: Font families\n• effects: scanlines, glow, pixelated (true/false)\n\nSave and import to use your custom theme!')
          }}
          style={{ color: 'var(--accent-primary)' }}
          className="text-sm underline"
        >
          View theme JSON structure →
        </a>
      </div>
    </div>
  )
}

export default ThemeSettings