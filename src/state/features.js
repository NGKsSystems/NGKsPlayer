/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: features.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/state/features.js
// Simple feature flags with localStorage + a tiny React hook.
// No external deps.

import { useSyncExternalStore } from 'react'

const LSKEY = 'ngks:features:v1'
const DEFAULTS = {
  djMode: false,         // show second deck + live crossfader
  autoDJ: true,          // automatically cue/fade into next track
  normalize: true,       // loudness pregain to -16 LUFS
  playMode: 'inOrder',   // inOrder | shuffle | randomNoRepeat  (UI only for now)
}

function read() {
  try {
    const raw = localStorage.getItem(LSKEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch {
    return { ...DEFAULTS }
  }
}

let state = read()
const listeners = new Set()

function emit() {
  localStorage.setItem(LSKEY, JSON.stringify(state))
  for (const fn of [...listeners]) fn(state)
}

export const features = {
  get(key) {
    return state[key]
  },
  all() {
    return { ...state }
  },
  set(key, value) {
    if (state[key] === value) return
    state = { ...state, [key]: value }
    emit()
  },
  toggle(key) {
    features.set(key, !features.get(key))
  },
  subscribe(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}

// React hook to read + update a specific flag
export function useFeature(name) {
  const subscribe = (cb) => features.subscribe(cb)
  const snapshot = () => features.get(name)
  const value = useSyncExternalStore(subscribe, snapshot, snapshot)
  const set = (v) => features.set(name, v)
  const toggle = () => features.toggle(name)
  return [value, set, toggle]
}

// Helper for a whole snapshot (rarely needed in components)
export function useFeaturesAll() {
  const subscribe = (cb) => features.subscribe(cb)
  const snapshot = () => features.all()
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

