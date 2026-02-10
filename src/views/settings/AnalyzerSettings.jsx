/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AnalyzerSettings.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useEffect, useState } from 'react'
import analyzerConfig, { DEFAULT_GLOBAL_CONFIG } from '../../utils/analyzerConfig'
import { GENRE_CATEGORIES } from '../../data/musicData.js'
import { Toast } from '../../DJ/Mixer/Common/Toast'

const settingsDefs = [
  { key: 'energyMaxCap', label: 'Energy Max Cap', type: 'number', min: 50, max: 120, step: 1,
    desc: 'Limits how high energy can go for this genre. Reserve 100 for true "monsters".' },
  { key: 'energyScalingFactor', label: 'Energy Scaling', type: 'number', min: 0.5, max: 2.0, step: 0.01,
    desc: 'Overall multiplier for perceived energy. Lower = chill, higher = more drive.' },
  { key: 'acousticnessBoost', label: 'Acousticness Boost', type: 'number', min: -30, max: 50, step: 1,
    desc: 'Adds a bonus to acousticness for guitar/organic-heavy genres.' },
  { key: 'danceabilityBoost', label: 'Danceability Boost', type: 'number', min: -100, max: 100, step: 1,
    desc: 'Additive boost to danceability (useful to nudge detection for club/rap/pop).' },
  { key: 'instrumentalnessBoost', label: 'Instrumentalness Boost', type: 'number', min: -50, max: 50, step: 5,
    desc: 'Additive boost to instrumentalness (useful for guitar/score-heavy genres).' },
  { key: 'transitionSoftener', label: 'Transition Softener', type: 'number', min: 0, max: 20, step: 1,
    desc: 'Lowers reported mixing difficulty so minor intro/outro issues are forgiven.' },
  { key: 'introStrongMixableBonus', label: 'Strong Intro Bonus', type: 'number', min: 0, max: 20, step: 1,
    desc: 'Rewards tracks that start with immediate energy or rhythm (cold starts).' },
  { key: 'teaseEnergyLevel', label: 'Tease Energy Level', type: 'number', min: 0.01, max: 0.5, step: 0.01,
    desc: 'Threshold to detect light "false" intros (subtle percussion before the main groove).' },
  { key: 'mainEnergyJump', label: 'Main Groove Jump', type: 'number', min: 0.1, max: 1.0, step: 0.01,
    desc: 'Minimum energy increase to detect the real song start after a tease or quiet intro.' },
  { key: 'fadeSlopeMin', label: 'Fade Slope Min', type: 'number', min: -0.2, max: -0.001, step: 0.001,
    desc: 'Minimum energy drop rate to identify natural fades (more negative = steeper required).' },
  { key: 'reverbTailThreshold', label: 'Reverb Tail Threshold', type: 'number', min: 0.0001, max: 0.05, step: 0.0001,
    desc: 'Max lingering energy considered a reverb tailâ€”helps detect long, mix-friendly fades.' },
  { key: 'halfTimeConfidenceMin', label: 'Half-Time Confidence Min', type: 'number', min: 0.5, max: 1.0, step: 0.01,
    desc: 'Minimum confidence to treat a track as half-time (higher = stricter).' },
  { key: 'halfTimeRawRangeMin', label: 'Half-Time Raw BPM Range Min', type: 'number', min: 80, max: 140, step: 1,
    desc: 'Raw BPM window where half-time display (felt = raw/2) is considered.' },
  { key: 'halfTimeRawRangeMax', label: 'Half-Time Raw BPM Range Max', type: 'number', min: 140, max: 220, step: 1,
    desc: 'Raw BPM upper bound for half-time consideration.' },
  { key: 'doubleTimeRawMin', label: 'Double-Time Raw Min', type: 'number', min: 130, max: 220, step: 1,
    desc: 'Raw BPM above which double-time (felt = raw*2) is preferred for fast tracks.' },
  { key: 'bpmCandidatePruneThreshold', label: 'BPM Candidate Prune Threshold', type: 'number', min: 0.4, max: 0.95, step: 0.01,
    desc: 'Minimum confidence to keep a BPM guess. Lower = more candidates; higher = cleaner lock.' },
  { key: 'onsetSensitivity', label: 'Onset Sensitivity', type: 'number', min: 0.1, max: 0.6, step: 0.01,
    desc: 'How easily beats/onsets are detected. Lower = finds subtle beats; higher = ignores weak hits.' },
  // Key detection knobs
  { key: 'keyConfidenceMin', label: 'Key Confidence Min', type: 'number', min: 0.6, max: 0.98, step: 0.01,
    desc: 'Minimum confidence to lock the final key. Lower accepts weaker matches.' },
  { key: 'chromaSmoothWindow', label: 'Chroma Smooth Window', type: 'number', min: 2, max: 16, step: 1,
    desc: 'Number of frames to average chroma features. Higher = smoother, more stable key detection.' },
  { key: 'relativeMinorBias', label: 'Relative Minor Bias', type: 'number', min: -1.0, max: 1.0, step: 0.01,
    desc: 'Bias toward relative major (+) or minor (-) to correct guitar/band tendencies.' },
  { key: 'commonKeyPreferenceBoost', label: 'Common Key Preference Boost', type: 'number', min: 0.0, max: 0.5, step: 0.01,
    desc: 'Extra confidence for common genre keys when matches are close.' },
  { key: 'capoTranspositionCheck', label: 'Capo Transposition Check', type: 'checkbox',
    desc: 'Check +1/+2 semitone shifts (capo) to find a better keyâ€”useful for guitar tracks.' },
]

export default function AnalyzerSettings(){
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSubgenre, setSelectedSubgenre] = useState('')
  const [currentValues, setCurrentValues] = useState({})
  const [overrideValues, setOverrideValues] = useState({})
  const [toast, setToast] = useState(null)
  const [unlocked, setUnlocked] = useState(false)
  const [unlockPhrase, setUnlockPhrase] = useState('')
  const [importText, setImportText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editingGlobal, setEditingGlobal] = useState(false)

  useEffect(() => {
    // load config on mount
    analyzerConfig.loadConfig()
    setCurrentValues({ ...analyzerConfig.global })
    // If navigated from TagEditor, auto-populate category/subgenre from URL params, sessionStorage, or localStorage
    try {
      let fromCat = ''
      let fromSub = ''

      // 1) Prefer sessionStorage (TagEditor writes here first)
      try {
        fromCat = sessionStorage.getItem('ngks_analyzer_genreCategory') || ''
        fromSub = sessionStorage.getItem('ngks_analyzer_subgenre') || ''
        if (fromCat || fromSub) console.debug('[AnalyzerSettings] Loaded from sessionStorage', fromCat, fromSub)
      } catch (e) { fromCat = fromCat || ''; fromSub = fromSub || '' }

      // 2) Fallback to localStorage
      if (!fromCat && !fromSub) {
        try {
          fromCat = localStorage.getItem('ngks_analyzer_genreCategory') || ''
          fromSub = localStorage.getItem('ngks_analyzer_subgenre') || ''
          if (fromCat || fromSub) console.debug('[AnalyzerSettings] Loaded from localStorage', fromCat, fromSub)
        } catch (e) {}
      }

      // 3) If not found, try URL hash params (e.g. #/analyzer-settings?cat=Rock&sub=Alternative%20Rock)
      if (!fromCat && !fromSub) {
        try {
          const hash = window.location.hash || ''
          const qIdx = hash.indexOf('?')
          if (qIdx !== -1) {
            const q = hash.slice(qIdx + 1)
            const params = new URLSearchParams(q)
            fromCat = params.get('cat') || ''
            fromSub = params.get('sub') || ''
            if (fromCat || fromSub) console.debug('[AnalyzerSettings] Loaded from hash params', fromCat, fromSub)
          }
        } catch (e) { /* ignore URL parse errors */ }
      }

      // 4) Finally check regular query string (search)
      if (!fromCat && !fromSub) {
        try {
          const search = window.location.search || ''
          if (search) {
            const params = new URLSearchParams(search.replace(/^\?/, ''))
            fromCat = params.get('cat') || ''
            fromSub = params.get('sub') || ''
            if (fromCat || fromSub) console.debug('[AnalyzerSettings] Loaded from search params', fromCat, fromSub)
          }
        } catch (e) { /* ignore */ }
      }

      // If we have both, set both. If only sub is present, try to infer category.
      if (fromCat) setSelectedCategory(fromCat)
      if (fromSub) {
        // If category wasn't provided, infer it from GENRE_CATEGORIES
        if (!fromCat) {
          for (const [cat, subs] of Object.entries(GENRE_CATEGORIES)) {
            if (subs && subs.includes(fromSub)) { setSelectedCategory(cat); break }
          }
        }
        setSelectedSubgenre(fromSub)
      }

      // clear transient session keys after consuming
      try { sessionStorage.removeItem('ngks_analyzer_genreCategory'); sessionStorage.removeItem('ngks_analyzer_subgenre') } catch (e) {}
    } catch (e) {
      // ignore if storage not available
    }
  }, [])

  useEffect(() => {
    // when selecting a category or subgenre, populate currentValues with merged config
    const key = selectedSubgenre || selectedCategory || ''
    if (key) {
      // For overrides, keep override-only values separate so saving writes only the override
      const merged = { ...analyzerConfig.global, ...(analyzerConfig.overrides[key] || {}) }
      setCurrentValues(merged)
      setOverrideValues({ ...(analyzerConfig.overrides[key] || {}) })
    } else {
      setCurrentValues({ ...analyzerConfig.global })
      setOverrideValues({})
    }
  }, [selectedCategory, selectedSubgenre])

  function getSelectedKey(){
    return selectedSubgenre || selectedCategory || ''
  }

  function renderFieldsFor(key){
    const cfg = key ? { ...analyzerConfig.global, ...(analyzerConfig.overrides[key] || {}) } : analyzerConfig.global
    return settingsDefs.map(def => {
      const inherited = cfg[def.key] ?? DEFAULT_GLOBAL_CONFIG[def.key]
      const overridePresent = key && overrideValues && overrideValues.hasOwnProperty(def.key)
      const displayValue = key ? (overridePresent ? overrideValues[def.key] : inherited) : (currentValues[def.key] ?? inherited)

      // Special-case checkboxes to use `checked` and boolean values
      if (def.type === 'checkbox') {
        const checked = !!displayValue
        return (
          <div key={def.key} className="flex items-center gap-3">
            <label title={def.desc} className="w-48 text-sm text-gray-200">{def.label}</label>
            <input
              type="checkbox"
              checked={checked}
              onChange={e => {
                const val = e.target.checked
                if (!editing) return
                if (key) {
                  setOverrideValues(prev => ({ ...prev, [def.key]: val }))
                } else {
                  setCurrentValues(prev => ({ ...prev, [def.key]: val }))
                }
              }}
              disabled={!editing}
              className={`${!editing ? 'opacity-60 cursor-not-allowed' : ''}`} />
            { key && analyzerConfig.overrides[key] && analyzerConfig.overrides[key].hasOwnProperty(def.key) ? (
              <span className="text-xs text-amber-300">Overridden</span>
            ) : (
              <span className="text-xs text-gray-400">Inherited</span>
            )}
          </div>
        )
      }

      return (
        <div key={def.key} className="flex items-center gap-3">
          <label title={def.desc} className="w-48 text-sm text-gray-200">{def.label}</label>
          <input
            type={def.type}
            min={def.min}
            max={def.max}
            step={def.step}
            value={displayValue}
            onChange={e => {
              const raw = e.target.value
              const val = def.type === 'number' ? (raw === '' ? '' : parseFloat(raw)) : raw
              if (!editing) return
              if (key) {
                // editing an override: update overrideValues only
                setOverrideValues(prev => ({ ...prev, [def.key]: val }))
              } else {
                setCurrentValues(prev => ({ ...prev, [def.key]: val }))
              }
            }}
            disabled={!editing}
            className={`px-2 py-1 bg-gray-700 rounded text-white ${!editing ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          { key && analyzerConfig.overrides[key] && analyzerConfig.overrides[key].hasOwnProperty(def.key) ? (
            <span className="text-xs text-amber-300">Overridden</span>
          ) : (
            <span className="text-xs text-gray-400">Inherited</span>
          )}
        </div>
      )
    })
  }

  function handleSaveOverride(){
    const key = getSelectedKey();
    if (!key) { setToast({ type:'danger', message:'Select a genre or subgenre first' }); return }
    
    // CRITICAL FIX: Only save values that are ACTUALLY overridden (exist in current overrideValues)
    // Do NOT save inherited/global values - that would pollute the override
    const existingOverride = analyzerConfig.overrides[key] || {}
    const payload = {}
    
    // Only include values that exist in overrideValues (user explicitly set them)
    settingsDefs.forEach(def => {
      if (overrideValues && overrideValues.hasOwnProperty(def.key)) {
        payload[def.key] = overrideValues[def.key]
      }
    })
    
    // If payload is empty, don't save (would create empty override object)
    if (Object.keys(payload).length === 0) {
      setToast({ type:'warning', message:'No overrides to save - all values are inherited' })
      return
    }
    
    analyzerConfig.setOverride(key, payload)
    // Reload config into memory so analyzers pick up changes immediately
    try { analyzerConfig.loadConfig(); } catch (e) { /* ignore */ }
    console.debug('[AnalyzerSettings] Saved override', key, payload)
    setToast({ type:'ok', message:`Saved ${Object.keys(payload).length} override(s) for ${key}` })
    setTimeout(()=>setToast(null),2000)
  }

  function handleSaveGlobal(){
    // Allow saving globals only when explicitly editing globals (avoid accidental saves)
    const selectedKey = getSelectedKey()
    if (selectedKey && !editingGlobal) { setToast({ type:'danger', message:'Clear category/subgenre selection or enable Edit Global to save defaults' }); return }
    if (!unlocked) { setToast({ type:'danger', message:'Unlock Advanced Mode first' }); return }
    const payload = {}
    settingsDefs.forEach(def => { if (currentValues.hasOwnProperty(def.key)) payload[def.key] = currentValues[def.key] })
    analyzerConfig.setGlobal(payload)
    // Reload config so analyzers pick up changes immediately
    try { analyzerConfig.loadConfig(); } catch (e) { /* ignore */ }
    console.debug('[AnalyzerSettings] Saved globals', payload)
    setToast({ type:'ok', message:'Saved global defaults' })
    setTimeout(()=>setToast(null),2000)
  }

  function handleResetGenre(){
    const key = getSelectedKey();
    if (!key) { setToast({ type:'danger', message:'Select a genre or subgenre first' }); return }
    if (!window.confirm(`Reset overrides for ${key}?`)) return
    analyzerConfig.deleteOverride(key)
    // clear local overrideValues so UI reflects reset
    setOverrideValues({})
    setToast({ type:'ok', message:`Reset ${key} to global` })
  }

  function handleResetAll(){
    if (!unlocked) { setToast({ type:'danger', message:'Unlock Advanced Mode first' }); return }
    if (!window.confirm('Reset ALL overrides and era rules? This cannot be undone.')) return
    analyzerConfig.resetAllOverrides()
    setToast({ type:'ok', message:'All overrides cleared' })
  }

  function handleExport(){
    const json = analyzerConfig.exportConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ngks-analyzer-config.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(){
    if (!importText) { setToast({ type:'danger', message:'Paste JSON into import box' }); return }
    const ok = analyzerConfig.importConfig(importText)
    if (ok) {
      setToast({ type:'ok', message:'Config imported' })
      setCurrentValues({ ...analyzerConfig.global })
    } else {
      setToast({ type:'danger', message:'Import failed (invalid JSON)' })
    }
  }

  function handleFactoryReset(){
    if (!unlocked) { setToast({ type:'danger', message:'Unlock Advanced Mode first' }); return }
    if (!window.confirm('Export backup then reset to factory defaults?')) return
    analyzerConfig.resetToFactoryDefaults(true)
    setToast({ type:'ok', message:'Factory reset performed (backup created)' })
    setCurrentValues({ ...analyzerConfig.global })
  }

  function renderAuditLog(){
    const hist = (analyzerConfig && analyzerConfig.meta && analyzerConfig.meta.history) ? analyzerConfig.meta.history.slice().reverse().slice(0,10) : []
    return (
      <div className="mt-4 bg-gray-900 p-3 rounded">
        <h4 className="text-sm font-semibold">Audit Log (recent)</h4>
        <div className="text-xs text-gray-300 mt-2 max-h-48 overflow-auto">
          {hist.length === 0 && <div className="text-gray-500">No actions recorded yet.</div>}
          {hist.map((h, idx) => (
            <div key={idx} className="mb-2 border-b border-gray-800 pb-2">
              <div className="text-xxs text-gray-400">{h.time}</div>
              <div className="text-sm text-gray-200">{h.action}{h.key ? ` â€” ${h.key}` : ''}</div>
              {h.settings && <div className="text-xxs text-gray-400">{JSON.stringify(h.settings)}</div>}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function attemptUnlock(){
    if (unlockPhrase.trim() === 'UNLOCK ANALYZER') {
      setUnlocked(true)
      setToast({ type:'ok', message:'Advanced Mode unlocked' })
    } else {
      setToast({ type:'danger', message:'Type the unlock phrase exactly to continue' })
    }
  }

  return (
    <div className="p-4 bg-gray-900 text-white rounded w-full">
      <h2 className="text-lg font-semibold mb-3">Analyzer Settings & Tuning</h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left narrow column: controls (Import / Unlock / Audit) */}
        <div className="lg:col-span-3 space-y-4 order-1">
          <div className="bg-gray-800 rounded p-3">
            <h3 className="font-semibold">Import / Factory</h3>
            <textarea value={importText} onChange={e => setImportText(e.target.value)} placeholder="Paste config JSON here to import" className="w-full h-32 bg-gray-700 p-2 rounded text-white" />
            <div className="mt-2 flex gap-2">
              <button onClick={handleImport} className="bg-green-600 px-3 py-1 rounded text-sm">Import</button>
              <button onClick={handleFactoryReset} className="bg-red-700 px-3 py-1 rounded text-sm">Reset To Factory Defaults</button>
              <button onClick={() => {
                const ok = analyzerConfig.restoreLastBackup(false)
                if (ok) {
                  setCurrentValues({ ...analyzerConfig.global })
                  setToast({ type:'ok', message:'Restored globals from last backup' })
                } else {
                  setToast({ type:'danger', message:'No backups found to restore' })
                }
                setTimeout(()=>setToast(null),2000)
              }} className="bg-sky-600 px-3 py-1 rounded text-sm">Restore Last Globals</button>
            </div>
          </div>

          {!unlocked && (
            <div className="bg-gray-800 rounded p-3">
              <h4 className="text-sm font-semibold">Unlock Advanced Mode</h4>
              <div className="text-xs text-gray-300 mt-2">Type <code>UNLOCK ANALYZER</code> to unlock guarded controls (editable global, destructive actions).</div>
              <div className="mt-2 flex gap-2">
                <input value={unlockPhrase} onChange={e => setUnlockPhrase(e.target.value)} className="px-2 py-1 bg-gray-700 rounded text-white flex-1" />
                <button onClick={attemptUnlock} className="bg-amber-600 px-3 py-1 rounded text-sm">Unlock</button>
              </div>
            </div>
          )}

          {renderAuditLog()}
        </div>

        {/* Right wide column: Global + Overrides (uses remaining horizontal space) */}
        <div className="lg:col-span-9 space-y-4 order-2">
          <div className="bg-gray-800 rounded p-3">
              <h3 className="font-semibold">Global Defaults (preview)</h3>
              <div className="text-xs text-gray-300 mt-2">These values are used when no genre/subgenre override exists. Toggle <em>Edit Global</em> to modify and save global defaults.</div>
              <div className="mt-3 grid grid-cols-1 gap-2">
                {settingsDefs.map(def => {
                  const globalVal = currentValues[def.key] ?? analyzerConfig.global[def.key] ?? DEFAULT_GLOBAL_CONFIG[def.key]
                  if (def.type === 'checkbox') {
                    return (
                      <div key={def.key} className="flex items-center gap-3">
                        <label title={def.desc} className="w-44 text-sm text-gray-200">{def.label}</label>
                        <input type="checkbox" checked={!!globalVal}
                          onChange={e => setCurrentValues(prev => ({ ...prev, [def.key]: e.target.checked }))}
                          disabled={!editingGlobal}
                          className={`${!editingGlobal ? 'opacity-60 cursor-not-allowed' : ''}`} />
                      </div>
                    )
                  }
                  return (
                    <div key={def.key} className="flex items-center gap-3">
                      <label title={def.desc} className="w-44 text-sm text-gray-200">{def.label}</label>
                      <input value={globalVal}
                        onChange={e => {
                          const raw = e.target.value
                          const val = def.type === 'number' ? (raw === '' ? '' : parseFloat(raw)) : raw
                          setCurrentValues(prev => ({ ...prev, [def.key]: val }))
                        }}
                        disabled={!editingGlobal}
                        className={`px-2 py-1 bg-gray-700 rounded text-white flex-1 ${!editingGlobal ? 'opacity-60 cursor-not-allowed' : ''}`} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => setEditingGlobal(prev => !prev)} className="bg-zinc-600 px-3 py-1 rounded text-sm">{editingGlobal ? 'Stop Editing Global' : 'Edit Global'}</button>
                <button onClick={() => setUnlocked(!unlocked)} className="bg-amber-600 px-3 py-1 rounded text-sm">{unlocked ? 'Lock' : 'Unlock Advanced'}</button>
                <button onClick={handleSaveGlobal} disabled={!editingGlobal || !unlocked} className={`px-3 py-1 rounded text-sm ${(!editingGlobal || !unlocked) ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600'}`}>Save As Global</button>
                <button onClick={handleExport} className="bg-blue-600 px-3 py-1 rounded text-sm">Export Config</button>
              </div>
            </div>

          <div className="bg-gray-800 rounded p-3">
            <h3 className="font-semibold">Per-Genre / Subgenre Overrides</h3>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-300">Category</label>
                <select className="w-full bg-gray-700 p-2 rounded" value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubgenre(''); }}>
                  <option value="">-- Select Category --</option>
                  {Object.keys(GENRE_CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-300">Subgenre</label>
                <select className="w-full bg-gray-700 p-2 rounded" value={selectedSubgenre} onChange={e => setSelectedSubgenre(e.target.value)}>
                  <option value="">-- Use Category or choose subgenre --</option>
                  {selectedCategory && GENRE_CATEGORIES[selectedCategory].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              {renderFieldsFor(getSelectedKey())}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setEditing(prev => !prev)} className="bg-zinc-600 px-3 py-1 rounded text-sm">{editing ? 'Stop Editing' : 'Edit'}</button>
              <button onClick={handleSaveOverride} className="bg-green-600 px-3 py-1 rounded text-sm">Apply Override</button>
              <button onClick={handleResetGenre} className="bg-yellow-600 px-3 py-1 rounded text-sm">Reset to Global</button>
              <button onClick={handleExport} className="bg-blue-600 px-3 py-1 rounded text-sm">Export</button>
              <button onClick={handleResetAll} className="bg-red-700 px-3 py-1 rounded text-sm">Reset All Overrides</button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

