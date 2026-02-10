/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SettingsHome.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react'

export default function SettingsHome({ onNavigate }) {
  return (
    <div className="p-6 w-full max-w-none">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => onNavigate('library')}
          className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </button>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">🎨 Theme & Appearance</h2>
          <p className="text-sm text-zinc-400 mb-4">Customize visual themes: Atari Night, Modern Dark, Classic Winamp, or import your own.</p>
          <div className="flex gap-3">
            <button onClick={() => { window.location.hash = '#/settings/themes' }} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white">Open Theme Settings</button>
          </div>
        </section>

        <section className="bg-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Application Settings</h2>
          <p className="text-sm text-zinc-400 mb-4">General app preferences: filename normalization, AI integration, database management.</p>
          <div className="flex gap-3">
            <button onClick={() => { window.location.hash = '#/settings/app' }} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white">Open App Settings</button>
            <button onClick={() => { window.location.hash = '#/analyzer-settings' }} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white">Open Analyzer Settings</button>
          </div>
        </section>

        <section className="bg-zinc-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-zinc-100 mb-3">Quick Actions</h2>
          <p className="text-sm text-zinc-400 mb-4">Shortcuts to library/analysis tools.</p>
          <div className="flex gap-3">
            <button onClick={() => onNavigate('library')} className="px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white">Back to Library</button>
            <button onClick={() => onNavigate('tags')} className="px-4 py-2 rounded-lg bg-zinc-600 hover:bg-zinc-500 text-white">Open Tag Editor</button>
          </div>
        </section>
      </div>
    </div>
  )
}

