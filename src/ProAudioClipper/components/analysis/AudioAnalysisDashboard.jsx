/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioAnalysisDashboard.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useCallback } from 'react';
import SpectrumAnalyzerComponent from './SpectrumAnalyzerComponent.jsx';
import PhaseCorrelationMeterComponent from './PhaseCorrelationMeterComponent.jsx';

/**
 * Professional Audio Analysis Dashboard
 * 
 * Comprehensive audio analysis suite featuring:
 * - Real-time spectrum analyzer (FFT)
 * - Phase correlation meter with goniometer
 * - Stereo imaging analysis
 * - Mono compatibility checking
 * - Professional metering and visualization
 */
export const AudioAnalysisDashboard = ({ audioEngine, className = "" }) => {
  const [activeTab, setActiveTab] = useState('spectrum');
  const [dashboardMode, setDashboardMode] = useState('compact'); // compact, expanded

  const tabs = [
    { id: 'spectrum', label: 'Spectrum', icon: 'ðŸ“Š' },
    { id: 'phase', label: 'Phase', icon: 'ðŸ”„' },
    { id: 'combo', label: 'Combined', icon: 'ðŸ“ˆ' }
  ];

  const toggleMode = useCallback(() => {
    setDashboardMode(prev => prev === 'compact' ? 'expanded' : 'compact');
  }, []);

  return (
    <div className={`audio-analysis-dashboard ${className}`}>
      {/* Dashboard Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 15px',
        background: 'linear-gradient(90deg, #2a2a2a, #353535)',
        borderRadius: '6px 6px 0 0',
        borderBottom: '1px solid #444'
      }}>
        <h3 style={{
          margin: 0,
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ðŸŽ¯ Professional Audio Analysis
          {!audioEngine?.audioContext && (
            <span style={{
              fontSize: '11px',
              color: '#ff6666',
              fontWeight: 'normal'
            }}>
              (No Audio Context)
            </span>
          )}
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={toggleMode}
            style={{
              padding: '4px 8px',
              background: '#444',
              color: '#ccc',
              border: '1px solid #666',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '10px'
            }}
          >
            {dashboardMode === 'compact' ? 'ðŸ” Expand' : 'ðŸ“Š Compact'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        background: '#2a2a2a',
        borderBottom: '1px solid #444'
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: activeTab === tab.id ? '#444' : 'transparent',
              color: activeTab === tab.id ? '#ffffff' : '#cccccc',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #4CAF50' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '11px',
              transition: 'all 0.2s ease'
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Analysis Content */}
      <div style={{
        padding: '15px',
        background: '#1e1e1e',
        borderRadius: '0 0 6px 6px',
        minHeight: dashboardMode === 'expanded' ? '500px' : '350px'
      }}>
        {activeTab === 'spectrum' && (
          <SpectrumAnalyzerComponent
            audioEngine={audioEngine}
            width={dashboardMode === 'expanded' ? 800 : 600}
            height={dashboardMode === 'expanded' ? 400 : 280}
          />
        )}

        {activeTab === 'phase' && (
          <PhaseCorrelationMeterComponent
            audioEngine={audioEngine}
            width={dashboardMode === 'expanded' ? 500 : 400}
            height={dashboardMode === 'expanded' ? 350 : 280}
          />
        )}

        {activeTab === 'combo' && (
          <div style={{
            display: 'flex',
            flexDirection: dashboardMode === 'expanded' ? 'row' : 'column',
            gap: '20px'
          }}>
            <div style={{ flex: 1 }}>
              <SpectrumAnalyzerComponent
                audioEngine={audioEngine}
                width={dashboardMode === 'expanded' ? 450 : 500}
                height={dashboardMode === 'expanded' ? 250 : 200}
              />
            </div>
            <div style={{ flex: 1 }}>
              <PhaseCorrelationMeterComponent
                audioEngine={audioEngine}
                width={dashboardMode === 'expanded' ? 350 : 400}
                height={dashboardMode === 'expanded' ? 250 : 200}
              />
            </div>
          </div>
        )}

        {/* Quick Status Bar */}
        <div style={{
          marginTop: '15px',
          padding: '8px 12px',
          background: '#2a2a2a',
          borderRadius: '4px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: '#999'
        }}>
          <div>
            <span style={{ color: '#66ff66' }}>â—</span> AudioWorklet: {audioEngine?.workletSupported ? 'Active' : 'Fallback'}
          </div>
          <div>
            Sample Rate: {audioEngine?.audioContext?.sampleRate || 'N/A'}Hz
          </div>
          <div>
            Latency: {audioEngine?.workletSupported ? '128 samples' : '~1024 samples'}
          </div>
          <div>
            Status: {audioEngine?.isPlaying ? 
              <span style={{ color: '#66ff66' }}>Playing</span> : 
              <span style={{ color: '#666' }}>Stopped</span>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioAnalysisDashboard;
