/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: index.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useMemo, useState } from 'react'
import { CENTER_FREQS } from '../../audio/graph' // one source of truth

// Format band labels
const formatHz = (hz) => (hz >= 1000 ? `${String(hz/1000).replace(/\.0+$/, '')}k` : String(hz))
const BAND_LABELS = CENTER_FREQS.map(formatHz)

/**
 * Props:
 *   playerLabel: 'A' | 'B'
 *   values: number[16] in dB
 *   onChangeBand(index:number, gainDb:number)
 *   onLoadPreset(name:string)
 *   defaultCollapsed?: boolean   <-- NEW
 */
export default function Equalizer({
  playerLabel = 'A',
  values = [],
  onChangeBand,
  onLoadPreset,
  defaultCollapsed = false,              // NEW
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)   // NEW

  const gains = useMemo(() => {
    const a = new Array(CENTER_FREQS.length).fill(0)
    for (let i = 0; i < Math.min(a.length, values.length); i++) a[i] = Number(values[i] || 0)
    return a
  }, [values])

  return (
    <div style={styles.card}>
      <div style={styles.headerRow}>
        <div style={styles.title}>Equalizer â€” Player {playerLabel}</div>
        <div style={styles.headerRight}>
          <label style={styles.label}>Preset</label>
          <select
            style={styles.input}
            defaultValue="__"
            onChange={(e) => {
              const v = e.target.value
              if (v !== '__') onLoadPreset?.(v)
              e.target.value = '__'
            }}
          >
            <option value="__">Chooseâ€¦</option>
            <option value="Flat">Flat</option>
            <option value="BassBoost">BassBoost</option>
            <option value="TrebleBoost">TrebleBoost</option>
            <option value="Vocal">Vocal</option>
            <option value="Loudness">Loudness</option>
            <option value="Rock">Rock</option>
            <option value="Jazz">Jazz</option>
            <option value="Classical">Classical</option>
          </select>

          <button style={styles.button} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? 'Show EQ' : 'Hide EQ'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={styles.sliderRow}>
            {gains.map((g, i) => (
              <div key={i} style={styles.sliderCol}>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={0.1}
                  value={g}
                  onChange={(e) => onChangeBand?.(i, Number(e.target.value))}
                  onDoubleClick={() => onChangeBand?.(i, 0)}
                  style={styles.sliderVertical}
                  aria-label={`EQ ${BAND_LABELS[i]} band`}
                  title={`${BAND_LABELS[i]} â€¢ ${g.toFixed(1)} dB`}
                />
                <div style={styles.freqLabel}>{BAND_LABELS[i]}</div>
                <div style={styles.dbLabel}>{g.toFixed(1)} dB</div>
              </div>
            ))}
          </div>

          <div style={styles.tip}>
            Tip: double-click a slider to reset it (or set preset to <em>Flat</em>).
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  card: { borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', padding: 16, marginTop: 12, background: 'rgba(255,255,255,0.02)' },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontWeight: 600 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  label: { fontSize: 12, opacity: 0.7 },
  input: { height: 28, background: 'rgba(255,255,255,0.04)', color: 'inherit', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, padding: '2px 6px' },
  button: { height: 28, padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)', color: 'inherit', cursor: 'pointer' },
  sliderRow: { display: 'flex', gap: 14, padding: '14px 4px 8px', overflowX: 'auto', overflowY: 'hidden' },
  sliderCol: { width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  sliderVertical: { WebkitAppearance: 'slider-vertical', writingMode: 'vertical-rl', height: 140, width: 12 },
  freqLabel: { fontSize: 11, marginTop: 6, opacity: 0.7 },
  dbLabel: { fontSize: 10, opacity: 0.65 },
  tip: { fontSize: 12, opacity: 0.7, marginTop: 8 },
}

