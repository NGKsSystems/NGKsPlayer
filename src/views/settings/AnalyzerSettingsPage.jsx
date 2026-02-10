/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AnalyzerSettingsPage.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react'
import AnalyzerSettings from './AnalyzerSettings.jsx'

export default function AnalyzerSettingsPage({ onNavigate }) {
  return (
    <div className="p-6 w-full max-w-none">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate('settings')}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-zinc-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Settings
          </button>

          <button
            onClick={() => {
              try {
                const returnHash = sessionStorage.getItem('ngks_return_to')
                if (returnHash) {
                  // Use location.hash to restore exact previous route
                  window.location.hash = returnHash
                  return
                }
              } catch(e) { console.warn('Failed to read return hash', e) }
              // Fallback: go to Tag Editor
              onNavigate('tags')
            }}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-700 hover:bg-indigo-600 rounded-lg text-white transition-colors"
          >
            Return to Tag Editor
          </button>
        </div>
        <h1 className="text-2xl font-bold text-zinc-100">Analyzer Settings</h1>
      </div>

      <div className="space-y-6">
        <section className="bg-zinc-800 rounded-xl p-4">
          <AnalyzerSettings />
        </section>
      </div>
    </div>
  )
}

