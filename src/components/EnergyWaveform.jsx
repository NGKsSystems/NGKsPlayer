/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: EnergyWaveform.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useEffect, useState } from 'react'

// Enhanced EnergyWaveform
// Props:
// - trajectory: array of numbers (0..1 or 0..100) OR array of {t:seconds, v:number}
// - phrases: optional array of phrase objects with a `start` time in ms
// - duration: optional track duration in seconds (used to map timestamps)
// - onSeek(timeSeconds): called when user clicks to seek
// - height, className
export function exportEnergyThumbnail(trajectory = [], opts = { width: 240, height: 40 }){
  // Render offscreen canvas and return dataURL
  const { width, height } = opts
  const canvas = globalThis.document ? globalThis.document.createElement('canvas') : null
  if (!canvas) return null
  const ctx = canvas.getContext('2d')
  canvas.width = width
  canvas.height = height
  ctx.fillStyle = '#111827'
  ctx.fillRect(0, 0, width, height)
  let vals = trajectory.map(v => (typeof v === 'number' ? v : (v && v.v != null ? v.v : parseFloat(String(v || 0)))))
  const max = Math.max(...vals, 1)
  if (max > 1.5) vals = vals.map(v => v / 100)
  const step = width / Math.max(vals.length - 1, 1)
  ctx.beginPath()
  for (let i = 0; i < vals.length; i++){
    const x = i * step
    const y = height - (Math.max(0, Math.min(1, vals[i])) * height)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(width, height)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fillStyle = '#3b82f6'
  ctx.globalAlpha = 0.18
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.strokeStyle = '#9ca3af'
  ctx.lineWidth = 1
  ctx.stroke()
  return canvas.toDataURL('image/png')
}

export default function EnergyWaveform({ trajectory = [], phrases = [], duration = null, onSeek = null, height = 64, className = '' }){
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  // Normalize trajectory into array of values and optional timestamps
  function normalizeTrajectory(traj){
    // If entries are objects with t and v, use timestamps
    if (!Array.isArray(traj) || traj.length === 0) return { vals: [], times: [] }
    if (typeof traj[0] === 'object' && traj[0] != null && ('t' in traj[0] || 'time' in traj[0])){
      const times = traj.map(p => (p.t != null ? Number(p.t) : Number(p.time)))
      const vals = traj.map(p => Number(p.v != null ? p.v : p.value || 0))
      return { vals, times }
    }
    // simple numeric array: no timestamps, evenly spaced
    const vals = traj.map(v => (typeof v === 'number' ? v : parseFloat(String(v || '0'))))
    return { vals, times: null }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, rect.width, height)

    const { vals, times } = normalizeTrajectory(trajectory)
    if (!vals || vals.length === 0){
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, rect.width, height)
      return
    }

    let v = vals.slice()
    const max = Math.max(...v, 1)
    if (max > 1.5) v = v.map(x => x / 100)

    const w = rect.width
    const h = height
    const step = w / Math.max(v.length - 1, 1)

    // background
    ctx.fillStyle = '#0b1220'
    ctx.fillRect(0, 0, w, h)

    // gradient fill - vibrant energy-based colors
    const grd = ctx.createLinearGradient(0, 0, w, 0)
    grd.addColorStop(0, '#3b82f6')    // blue (low energy/intro)
    grd.addColorStop(0.3, '#8b5cf6')  // purple
    grd.addColorStop(0.5, '#f59e0b')  // orange (mid energy)
    grd.addColorStop(0.7, '#ef4444')  // red (high energy)
    grd.addColorStop(1, '#dc2626')    // dark red (peak)

    ctx.beginPath()
    for (let i = 0; i < v.length; i++){
      const x = i * step
      const y = h - (Math.max(0, Math.min(1, v[i])) * h)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fillStyle = grd
    ctx.globalAlpha = 0.5  // More visible
    ctx.fill()
    ctx.globalAlpha = 1

    // outline
    ctx.beginPath()
    for (let i = 0; i < v.length; i++){
      const x = i * step
      const y = h - (Math.max(0, Math.min(1, v[i])) * h)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 1
    ctx.stroke()

    // phrase markers: map by timestamp if available, otherwise by index
    if (Array.isArray(phrases) && phrases.length > 0){
      for (let i = 0; i < phrases.length; i++){
        const p = phrases[i]
        let x = 0
        if (p && (p.start != null) && duration){
          const tSec = Number(p.start) / 1000
          const frac = Math.max(0, Math.min(1, tSec / duration))
          x = frac * w
        } else {
          const idx = Math.round((i / Math.max(phrases.length - 1, 1)) * (v.length - 1))
          x = idx * step
        }
        ctx.beginPath()
        ctx.moveTo(x, 2)
        ctx.lineTo(x, h - 2)
        ctx.strokeStyle = 'rgba(59,130,246,0.9)'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

  }, [trajectory, phrases, duration, height])

  // Mouse interactions
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const onMove = (ev) => {
      const rect = canvas.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const w = rect.width
      const pct = Math.max(0, Math.min(1, x / w))
      // Derive nearest index/time
      const { vals, times } = (function(){
        if (!Array.isArray(trajectory)) return { vals: [], times: null }
        if (typeof trajectory[0] === 'object' && trajectory[0] != null && ('t' in trajectory[0] || 'time' in trajectory[0])){
          const times = trajectory.map(p => (p.t != null ? Number(p.t) : Number(p.time)))
          const vals = trajectory.map(p => Number(p.v != null ? p.v : p.value || 0))
          return { vals, times }
        }
        const vals = trajectory.map(v => (typeof v === 'number' ? v : parseFloat(String(v || '0'))))
        return { vals, times: null }
      })()
      const idx = Math.round(pct * Math.max(0, vals.length - 1))
      let timeSec = null
      if (times && times.length > 0) timeSec = times[idx]
      else if (duration) timeSec = pct * duration
      else timeSec = null
      const value = vals[idx] != null ? (vals[idx] > 1.5 ? vals[idx] / 100 : vals[idx]) : null
      setTooltip({ x: x + 4, y: ev.clientY - rect.top + 8, value, timeSec })
    }
    const onLeave = () => setTooltip(null)
    const onClick = (ev) => {
      if (!onSeek) return
      const rect = canvas.getBoundingClientRect()
      const x = ev.clientX - rect.left
      const pct = Math.max(0, Math.min(1, x / rect.width))
      const { vals, times } = normalizeTrajectory(trajectory)
      const idx = Math.round(pct * Math.max(0, vals.length - 1))
      let timeSec = null
      if (times && times.length > 0) timeSec = times[idx]
      else if (duration) timeSec = pct * duration
      else timeSec = null
      if (timeSec != null) onSeek(Number(timeSec))
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)
    return () => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [trajectory, duration, onSeek])

  return (
    <div ref={containerRef} className={`w-full relative ${className}`} style={{ height: `${height}px` }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: `${height}px`, borderRadius: 4 }} />
      {tooltip && (
        <div style={{ position: 'absolute', left: tooltip.x, top: tooltip.y, pointerEvents: 'none', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '4px 6px', borderRadius: 4, fontSize: 12 }}>
          {tooltip.timeSec != null ? `${Math.floor(tooltip.timeSec/60)}:${String(Math.floor(tooltip.timeSec%60)).padStart(2,'0')}` : ''} {tooltip.value != null ? ` • ${Math.round(tooltip.value*100)/100}` : ''}
        </div>
      )}
    </div>
  )
}

