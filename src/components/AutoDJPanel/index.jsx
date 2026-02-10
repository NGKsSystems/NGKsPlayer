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
/**
 * NGKsPlayer Auto DJ Interface
 * Professional Auto DJ control panel with intelligent mixing
 */

import React, { useState, useEffect, useRef } from 'react';
// import AutoDJController from '../audio/autodj-controller.js';

export default function AutoDJPanel({ trackLibrary, currentTrack, onTrackChange }) {
  const [autoDJ, setAutoDJ] = useState(null);
  const [status, setStatus] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [transitionAnalysis, setTransitionAnalysis] = useState(null);
  const [settings, setSettings] = useState({
    crossfadeDuration: 16,
    energyTarget: 'maintain',
    harmonyPriority: 0.8,
    avoidRepeats: true,
    minTrackGap: 5,
    contextAware: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const controllerRef = useRef(null);

  useEffect(() => {
    // Initialize Auto DJ Controller
    // const controller = new AutoDJController();
    const controller = null; // Temporarily disabled due to import issues
    controllerRef.current = controller;
    setAutoDJ(controller);
    
    // Set up transition callback
    controller.onTransitionReady = (nextTrack) => {
      console.log('[Auto DJ UI] Transition ready:', nextTrack.track.title);
      // Trigger transition in main player
      onTrackChange?.(nextTrack.track);
    };
    
    return () => {
      if (controller) {
        controller.stop();
      }
    };
  }, [onTrackChange]);

  useEffect(() => {
    if (autoDJ && trackLibrary?.length > 0) {
      // Initialize with track library
      autoDJ.initialize(trackLibrary).catch(err => {
        setError(err.message);
      });
    }
  }, [autoDJ, trackLibrary]);

  useEffect(() => {
    // Update status regularly
    if (autoDJ && isActive) {
      const interval = setInterval(() => {
        const newStatus = autoDJ.getStatus();
        setStatus(newStatus);
        
        const analysis = autoDJ.getTransitionAnalysis();
        setTransitionAnalysis(analysis);
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [autoDJ, isActive]);

  const handleStart = async () => {
    if (!autoDJ) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await autoDJ.start(currentTrack);
      setIsActive(true);
      setStatus(autoDJ.getStatus());
      setTransitionAnalysis(autoDJ.getTransitionAnalysis());
      console.log('[Auto DJ UI] Started:', result.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    if (!autoDJ) return;
    
    const result = autoDJ.stop();
    setIsActive(false);
    setStatus(null);
    setTransitionAnalysis(null);
    console.log('[Auto DJ UI] Stopped:', result.message);
  };

  const handleSettingsChange = (newSettings) => {
    if (!autoDJ) return;
    
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    autoDJ.updateSettings(updatedSettings);
  };

  const handleManualOverride = async (track) => {
    if (!autoDJ || !isActive) return;
    
    try {
      await autoDJ.overrideNextTrack(track);
      setTransitionAnalysis(autoDJ.getTransitionAnalysis());
    } catch (err) {
      setError(err.message);
    }
  };

  const getEnergyColor = (energy) => {
    if (energy >= 0.8) return 'text-red-400';
    if (energy >= 0.6) return 'text-yellow-400';
    if (energy >= 0.4) return 'text-green-400';
    return 'text-blue-400';
  };

  const getCompatibilityColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    if (score >= 0.4) return 'text-orange-400';
    return 'text-red-400';
  };

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-4 m-4">
        <h3 className="text-red-400 font-bold mb-2">Auto DJ Error</h3>
        <p className="text-red-300">{error}</p>
        <button 
          onClick={() => setError(null)}
          className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 m-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center">
          ðŸ¤– Auto DJ Intelligence
          {isActive && <span className="ml-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>}
        </h2>
        
        <div className="flex gap-2">
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={loading || !trackLibrary?.length}
              className={`px-4 py-2 rounded font-medium ${
                loading || !trackLibrary?.length
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? 'Starting...' : 'Start Auto DJ'}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
            >
              Stop Auto DJ
            </button>
          )}
        </div>
      </div>

      {!isActive && !loading && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h3 className="text-lg font-semibold text-white mb-3">Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Energy Target
              </label>
              <select
                value={settings.energyTarget}
                onChange={(e) => handleSettingsChange({ energyTarget: e.target.value })}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
              >
                <option value="build">Build Energy</option>
                <option value="maintain">Maintain Energy</option>
                <option value="wind_down">Wind Down</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Crossfade Duration (seconds)
              </label>
              <input
                type="range"
                min="8"
                max="32"
                value={settings.crossfadeDuration}
                onChange={(e) => handleSettingsChange({ crossfadeDuration: parseInt(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-400">{settings.crossfadeDuration}s</span>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Harmony Priority
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.harmonyPriority}
                onChange={(e) => handleSettingsChange({ harmonyPriority: parseFloat(e.target.value) })}
                className="w-full"
              />
              <span className="text-sm text-gray-400">{(settings.harmonyPriority * 100).toFixed(0)}%</span>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="avoidRepeats"
                checked={settings.avoidRepeats}
                onChange={(e) => handleSettingsChange({ avoidRepeats: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="avoidRepeats" className="text-sm text-gray-300">
                Avoid Recent Repeats
              </label>
            </div>
          </div>
        </div>
      )}

      {isActive && status && (
        <div className="space-y-4">
          {/* Current Status */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Current Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Library Size:</span>
                <span className="ml-2 text-white">{status.librarySize} tracks</span>
              </div>
              <div>
                <span className="text-gray-400">Tracks Played:</span>
                <span className="ml-2 text-white">{status.playHistory.length}</span>
              </div>
              <div>
                <span className="text-gray-400">Energy Target:</span>
                <span className="ml-2 text-white capitalize">{status.settings.energyTarget}</span>
              </div>
            </div>
          </div>

          {/* Current Track */}
          {status.currentTrack && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Now Playing</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{status.currentTrack.title}</p>
                  <p className="text-gray-400">{status.currentTrack.artist}</p>
                </div>
                <div className="flex gap-2 text-sm">
                  <span className="px-2 py-1 bg-blue-600 text-white rounded">
                    {status.currentTrack.bpm} BPM
                  </span>
                  <span className="px-2 py-1 bg-purple-600 text-white rounded">
                    {status.currentTrack.camelotKey}
                  </span>
                  <span className={`px-2 py-1 bg-gray-600 rounded ${getEnergyColor(status.currentTrack.energy)}`}>
                    {((status.currentTrack.energy || 0) * 100).toFixed(0)}% Energy
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Next Track & Transition Analysis */}
          {transitionAnalysis && (
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-2">Upcoming Transition</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Next Track Info */}
                <div>
                  <h4 className="font-medium text-white mb-2">Next Track</h4>
                  <p className="text-white">{transitionAnalysis.next.title}</p>
                  <p className="text-gray-400">{transitionAnalysis.next.artist}</p>
                  <div className="flex gap-2 mt-2 text-sm">
                    <span className="px-2 py-1 bg-blue-600 text-white rounded">
                      {transitionAnalysis.next.bpm} BPM
                    </span>
                    <span className="px-2 py-1 bg-purple-600 text-white rounded">
                      {transitionAnalysis.next.camelotKey}
                    </span>
                  </div>
                </div>

                {/* Compatibility Scores */}
                <div>
                  <h4 className="font-medium text-white mb-2">Compatibility Analysis</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Overall:</span>
                      <span className={`font-medium ${getCompatibilityColor(transitionAnalysis.compatibility.total)}`}>
                        {(transitionAnalysis.compatibility.total * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Harmonic:</span>
                      <span className={`font-medium ${getCompatibilityColor(transitionAnalysis.compatibility.harmonic)}`}>
                        {(transitionAnalysis.compatibility.harmonic * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Energy:</span>
                      <span className={`font-medium ${getCompatibilityColor(transitionAnalysis.compatibility.energy)}`}>
                        {(transitionAnalysis.compatibility.energy * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">BPM:</span>
                      <span className={`font-medium ${getCompatibilityColor(transitionAnalysis.compatibility.bpm)}`}>
                        {(transitionAnalysis.compatibility.bpm * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mix Instructions */}
              <div className="bg-gray-700 rounded p-3">
                <h4 className="font-medium text-white mb-2">Mix Instructions</h4>
                <p className="text-green-400 text-sm mb-2">ðŸŽµ {transitionAnalysis.advice}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Strategy:</span>
                    <span className="ml-2 text-white capitalize">
                      {transitionAnalysis.mixInstructions.crossfadeStrategy.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Duration:</span>
                    <span className="ml-2 text-white">{transitionAnalysis.mixInstructions.crossfadeDuration}s</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Confidence:</span>
                    <span className={`ml-2 font-medium ${getCompatibilityColor(transitionAnalysis.mixInstructions.confidence)}`}>
                      {(transitionAnalysis.mixInstructions.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Manual Override Option */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2">Manual Override</h3>
            <p className="text-gray-400 text-sm mb-2">
              Don't like the next track? You can manually select a different one.
            </p>
            <button
              onClick={() => {
                // This would open a track selector modal
                // For now, just log
                console.log('Manual override requested');
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
            >
              Choose Different Track
            </button>
          </div>
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <h3 className="text-sm font-semibold text-white mb-2">ðŸ§  Auto DJ Intelligence</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          The Auto DJ analyzes harmonic compatibility, energy flow, BPM matching, and song structure 
          to create seamless transitions. It learns from your music library and adapts to context 
          like time of day and set progression for professional-quality automatic mixing.
        </p>
      </div>
    </div>
  );
}

