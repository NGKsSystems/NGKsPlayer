/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ProfessionalFXController.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKs Player - Professional FX Controller UI
 * 
 * Complete FX interface matching Pioneer DJM mixers and exceeding Serato/Traktor
 * - 4 FX units with 3 effects each
 * - BPM-synced parameters
 * - Hardware controller integration
 * - Real-time visual feedback
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sliders, Power, RotateCcw, Zap, Clock, Volume2, Filter, 
         Waves, Sparkles, Radio, Mic, Headphones, Settings } from 'lucide-react';

const ProfessionalFXController = ({ 
  fxEngine, 
  currentBPM = 128, 
  onParameterChange,
  hardwareController = null 
}) => {
  // FX Unit state (4 units matching Pioneer layout)
  const [fxUnits, setFxUnits] = useState([
    { id: 1, enabled: false, effects: ['delay', 'reverb', 'filter'], selectedEffect: 0, parameters: {} },
    { id: 2, enabled: false, effects: ['echo', 'chorus', 'phaser'], selectedEffect: 0, parameters: {} },
    { id: 3, enabled: false, effects: ['flanger', 'roll', 'bitcrusher'], selectedEffect: 0, parameters: {} },
    { id: 4, enabled: false, effects: ['transform', 'gate', 'distortion'], selectedEffect: 0, parameters: {} }
  ]);

  const [masterFX, setMasterFX] = useState({
    enabled: true,
    effect: 'compressor',
    parameters: { threshold: -12, ratio: 4, attack: 10, release: 100 }
  });

  // Beat sync and timing
  const [bpmSync, setBpmSync] = useState(true);
  const [beatDivisions] = useState([
    { label: '1/32', value: 32 },
    { label: '1/16', value: 16 },
    { label: '1/8', value: 8 },
    { label: '1/4', value: 4 },
    { label: '1/2', value: 2 },
    { label: '1/1', value: 1 }
  ]);

  // Hardware integration
  const [hardwareMapped, setHardwareMapped] = useState(false);
  const [midiLearn, setMidiLearn] = useState(null);

  // Performance monitoring
  const [cpuUsage, setCpuUsage] = useState(0);
  const [latency, setLatency] = useState(0);

  // Effect library with categories
  const effectLibrary = {
    filters: {
      filter: { name: 'Filter', icon: <Filter className="w-4 h-4" />, color: 'bg-blue-500' },
      vocal_filter: { name: 'Vocal Filter', icon: <Mic className="w-4 h-4" />, color: 'bg-blue-600' },
      radio_filter: { name: 'Radio', icon: <Radio className="w-4 h-4" />, color: 'bg-blue-400' }
    },
    time: {
      delay: { name: 'Delay', icon: <Waves className="w-4 h-4" />, color: 'bg-green-500' },
      echo: { name: 'Echo', icon: <Volume2 className="w-4 h-4" />, color: 'bg-green-600' },
      reverb: { name: 'Reverb', icon: <Sparkles className="w-4 h-4" />, color: 'bg-green-400' }
    },
    modulation: {
      chorus: { name: 'Chorus', icon: <Waves className="w-4 h-4" />, color: 'bg-purple-500' },
      flanger: { name: 'Flanger', icon: <Waves className="w-4 h-4" />, color: 'bg-purple-600' },
      phaser: { name: 'Phaser', icon: <Sparkles className="w-4 h-4" />, color: 'bg-purple-400' }
    },
    dj: {
      roll: { name: 'Roll', icon: <RotateCcw className="w-4 h-4" />, color: 'bg-red-500' },
      transform: { name: 'Transform', icon: <Zap className="w-4 h-4" />, color: 'bg-red-600' },
      gate: { name: 'Gate', icon: <Volume2 className="w-4 h-4" />, color: 'bg-red-400' }
    },
    creative: {
      bitcrusher: { name: 'BitCrusher', icon: <Zap className="w-4 h-4" />, color: 'bg-orange-500' },
      distortion: { name: 'Distortion', icon: <Volume2 className="w-4 h-4" />, color: 'bg-orange-600' }
    }
  };

  // Initialize FX engine connection
  useEffect(() => {
    if (fxEngine) {
      // Set up performance monitoring
      const monitorPerformance = () => {
        const stats = fxEngine.getPerformanceStats();
        setCpuUsage(stats.cpuUsage);
        setLatency(stats.latency);
      };

      const interval = setInterval(monitorPerformance, 1000);
      return () => clearInterval(interval);
    }
  }, [fxEngine]);

  // Handle BPM changes
  useEffect(() => {
    if (fxEngine && bpmSync) {
      fxEngine.setBPM(currentBPM);
    }
  }, [currentBPM, fxEngine, bpmSync]);

  // Toggle FX unit
  const toggleFXUnit = useCallback((unitId) => {
    setFxUnits(prev => prev.map(unit => 
      unit.id === unitId 
        ? { ...unit, enabled: !unit.enabled }
        : unit
    ));

    if (fxEngine) {
      const unit = fxUnits.find(u => u.id === unitId);
      if (unit?.enabled) {
        fxEngine.removeEffectFromChain(`unit_${unitId}`, unit.effects[unit.selectedEffect]);
      } else {
        fxEngine.addEffectToChain(`unit_${unitId}`, unit.effects[unit.selectedEffect]);
      }
    }
  }, [fxEngine, fxUnits]);

  // Change effect in unit
  const changeEffect = useCallback((unitId, effectIndex) => {
    setFxUnits(prev => prev.map(unit => 
      unit.id === unitId 
        ? { ...unit, selectedEffect: effectIndex }
        : unit
    ));

    if (fxEngine) {
      // Remove old effect and add new one
      const unit = fxUnits.find(u => u.id === unitId);
      if (unit?.enabled) {
        fxEngine.removeEffectFromChain(`unit_${unitId}`, unit.effects[unit.selectedEffect]);
        fxEngine.addEffectToChain(`unit_${unitId}`, unit.effects[effectIndex]);
      }
    }
  }, [fxEngine, fxUnits]);

  // Set effect parameter
  const setParameter = useCallback((unitId, paramName, value) => {
    setFxUnits(prev => prev.map(unit => 
      unit.id === unitId 
        ? { 
            ...unit, 
            parameters: { ...unit.parameters, [paramName]: value }
          }
        : unit
    ));

    if (fxEngine && onParameterChange) {
      onParameterChange(unitId, paramName, value);
    }
  }, [fxEngine, onParameterChange]);

  // Get effect info
  const getEffectInfo = (effectName) => {
    for (const category of Object.values(effectLibrary)) {
      if (category[effectName]) {
        return category[effectName];
      }
    }
    return { name: effectName, icon: <Sliders className="w-4 h-4" />, color: 'bg-gray-500' };
  };

  // Start MIDI learn mode
  const startMidiLearn = (unitId, paramName) => {
    setMidiLearn({ unitId, paramName });
    // TODO: Implement MIDI learn functionality
  };

  return (
    <div className="fx-controller bg-gray-900 text-white p-4 border-t border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sliders className="w-5 h-5" />
            Professional FX
          </h2>
          
          {/* BPM Sync */}
          <button
            onClick={() => setBpmSync(!bpmSync)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium ${
              bpmSync ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            BPM SYNC {bpmSync && `(${currentBPM})`}
          </button>
        </div>

        {/* Performance Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <span>CPU: {cpuUsage.toFixed(1)}%</span>
          <span>Latency: {latency.toFixed(1)}ms</span>
          {hardwareMapped && (
            <span className="text-green-400 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Hardware
            </span>
          )}
        </div>
      </div>

      {/* FX Units Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
        {fxUnits.map(unit => {
          const currentEffect = unit.effects[unit.selectedEffect];
          const effectInfo = getEffectInfo(currentEffect);
          
          return (
            <div 
              key={unit.id}
              className={`fx-unit bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                unit.enabled ? 'border-blue-500 shadow-lg' : 'border-gray-600'
              }`}
            >
              {/* Unit Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">FX Unit {unit.id}</h3>
                
                <button
                  onClick={() => toggleFXUnit(unit.id)}
                  className={`p-2 rounded-lg transition-all ${
                    unit.enabled 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>

              {/* Effect Selection */}
              <div className="grid grid-cols-3 gap-1 mb-4">
                {unit.effects.map((effect, index) => {
                  const info = getEffectInfo(effect);
                  const isSelected = index === unit.selectedEffect;
                  
                  return (
                    <button
                      key={effect}
                      onClick={() => changeEffect(unit.id, index)}
                      className={`p-2 rounded text-xs font-medium transition-all ${
                        isSelected 
                          ? `${info.color} text-white shadow-lg` 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {info.icon}
                        <span>{info.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Current Effect Display */}
              <div className={`p-3 rounded-lg mb-4 ${effectInfo.color} bg-opacity-20 border border-current border-opacity-30`}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {effectInfo.icon}
                  <span>{effectInfo.name}</span>
                </div>
              </div>

              {/* Parameters */}
              <div className="space-y-3">
                {/* Dry/Wet Mix */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-400">MIX</label>
                    <span className="text-xs text-gray-300">
                      {Math.round((unit.parameters.mix || 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={unit.parameters.mix || 0.5}
                    onChange={(e) => setParameter(unit.id, 'mix', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!unit.enabled}
                  />
                </div>

                {/* Parameter 1 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-400">PARAM 1</label>
                    <button
                      onClick={() => startMidiLearn(unit.id, 'param1')}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      LEARN
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={unit.parameters.param1 || 0.5}
                    onChange={(e) => setParameter(unit.id, 'param1', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!unit.enabled}
                  />
                </div>

                {/* Parameter 2 */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-gray-400">PARAM 2</label>
                    <button
                      onClick={() => startMidiLearn(unit.id, 'param2')}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      LEARN
                    </button>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={unit.parameters.param2 || 0.5}
                    onChange={(e) => setParameter(unit.id, 'param2', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    disabled={!unit.enabled}
                  />
                </div>

                {/* Beat Division (for time-based effects) */}
                {bpmSync && ['delay', 'echo', 'roll'].includes(currentEffect) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">BEAT DIV</label>
                    <select
                      value={unit.parameters.beatDivision || 4}
                      onChange={(e) => setParameter(unit.id, 'beatDivision', parseInt(e.target.value))}
                      className="w-full bg-gray-700 border border-gray-600 rounded text-xs p-1"
                      disabled={!unit.enabled}
                    >
                      {beatDivisions.map(div => (
                        <option key={div.value} value={div.value}>
                          {div.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Master FX */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Headphones className="w-4 h-4" />
            Master FX
          </h3>
          
          <button
            onClick={() => setMasterFX(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`p-2 rounded-lg transition-all ${
              masterFX.enabled 
                ? 'bg-green-600 text-white shadow-lg' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <Power className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Compressor controls */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">THRESHOLD</label>
            <input
              type="range"
              min="-40"
              max="0"
              step="1"
              value={masterFX.parameters.threshold}
              onChange={(e) => setMasterFX(prev => ({
                ...prev,
                parameters: { ...prev.parameters, threshold: parseInt(e.target.value) }
              }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!masterFX.enabled}
            />
            <span className="text-xs text-gray-300">{masterFX.parameters.threshold}dB</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">RATIO</label>
            <input
              type="range"
              min="1"
              max="20"
              step="0.1"
              value={masterFX.parameters.ratio}
              onChange={(e) => setMasterFX(prev => ({
                ...prev,
                parameters: { ...prev.parameters, ratio: parseFloat(e.target.value) }
              }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!masterFX.enabled}
            />
            <span className="text-xs text-gray-300">{masterFX.parameters.ratio}:1</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">ATTACK</label>
            <input
              type="range"
              min="0.1"
              max="100"
              step="0.1"
              value={masterFX.parameters.attack}
              onChange={(e) => setMasterFX(prev => ({
                ...prev,
                parameters: { ...prev.parameters, attack: parseFloat(e.target.value) }
              }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!masterFX.enabled}
            />
            <span className="text-xs text-gray-300">{masterFX.parameters.attack}ms</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">RELEASE</label>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={masterFX.parameters.release}
              onChange={(e) => setMasterFX(prev => ({
                ...prev,
                parameters: { ...prev.parameters, release: parseInt(e.target.value) }
              }))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              disabled={!masterFX.enabled}
            />
            <span className="text-xs text-gray-300">{masterFX.parameters.release}ms</span>
          </div>
        </div>
      </div>

      {/* MIDI Learn Indicator */}
      {midiLearn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 text-center">
            <Zap className="w-12 h-12 mx-auto mb-4 text-blue-500 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">MIDI Learn Mode</h3>
            <p className="text-gray-400 mb-4">
              Move a control on your hardware controller to map it to<br />
              <strong>FX Unit {midiLearn.unitId} - {midiLearn.paramName.toUpperCase()}</strong>
            </p>
            <button
              onClick={() => setMidiLearn(null)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Custom CSS for sliders */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .slider:disabled::-webkit-slider-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }
        
        .slider:disabled::-moz-range-thumb {
          background: #6b7280;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default ProfessionalFXController;
