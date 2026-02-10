/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DynamicsSection.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import ProfessionalKnob from './ProfessionalKnob';

const DynamicsSection = ({ 
  track, 
  audioEngine, 
  onParameterChange, 
  size = 'normal' 
}) => {
  const handleDynamicsParameter = (parameter, value) => {
    const paramName = `dynamics_${parameter}`;
    onParameterChange(paramName, value);
    audioEngine?.setDynamicsParameter(track.id, parameter, value);
  };

  const handleDynamicsType = (type) => {
    onParameterChange('dynamics_type', type);
    audioEngine?.setDynamicsType(track.id, type);
  };

  const handleDynamicsBypass = () => {
    const currentBypass = track.dynamics_bypass || false;
    onParameterChange('dynamics_bypass', !currentBypass);
    audioEngine?.setDynamicsBypass(track.id, !currentBypass);
  };

  if (size === 'compact') {
    return (
      <div className="dynamics-section compact">
        <div className="dynamics-header">
          <span>DYN</span>
        </div>
        <div className="dynamics-compact">
          <ProfessionalKnob
            value={track.dynamics_threshold || -12}
            min={-60}
            max={0}
            step={0.1}
            onChange={(value) => handleDynamicsParameter('threshold', value)}
            label="THR"
            unit="dB"
            size="small"
          />
          <ProfessionalKnob
            value={track.dynamics_ratio || 4}
            min={1}
            max={20}
            step={0.1}
            onChange={(value) => handleDynamicsParameter('ratio', value)}
            label="RAT"
            size="small"
            logarithmic={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dynamics-section">
      <div className="dynamics-header">
        <span>DYNAMICS</span>
        <div className="dynamics-controls">
          <select 
            value={track.dynamics_type || 'compressor'}
            onChange={(e) => handleDynamicsType(e.target.value)}
            className="dynamics-type"
          >
            <option value="compressor">COMP</option>
            <option value="limiter">LIM</option>
            <option value="gate">GATE</option>
            <option value="expander">EXP</option>
          </select>
          <button 
            className={`dynamics-bypass ${track.dynamics_bypass ? 'active' : ''}`}
            onClick={handleDynamicsBypass}
          >
            BYP
          </button>
        </div>
      </div>
      
      <div className="dynamics-controls-grid">
        {/* Threshold */}
        <ProfessionalKnob
          value={track.dynamics_threshold || -12}
          min={-60}
          max={0}
          step={0.1}
          onChange={(value) => handleDynamicsParameter('threshold', value)}
          label="THRESH"
          unit="dB"
          size="small"
        />

        {/* Ratio */}
        <ProfessionalKnob
          value={track.dynamics_ratio || 4}
          min={1}
          max={20}
          step={0.1}
          onChange={(value) => handleDynamicsParameter('ratio', value)}
          label="RATIO"
          size="small"
          logarithmic={true}
        />

        {/* Attack */}
        <ProfessionalKnob
          value={track.dynamics_attack || 10}
          min={0.1}
          max={100}
          step={0.1}
          onChange={(value) => handleDynamicsParameter('attack', value)}
          label="ATTACK"
          unit="ms"
          size="small"
          logarithmic={true}
        />

        {/* Release */}
        <ProfessionalKnob
          value={track.dynamics_release || 100}
          min={10}
          max={5000}
          step={1}
          onChange={(value) => handleDynamicsParameter('release', value)}
          label="RELEASE"
          unit="ms"
          size="small"
          logarithmic={true}
        />

        {/* Knee */}
        <ProfessionalKnob
          value={track.dynamics_knee || 2}
          min={0}
          max={10}
          step={0.1}
          onChange={(value) => handleDynamicsParameter('knee', value)}
          label="KNEE"
          unit="dB"
          size="small"
        />

        {/* Makeup Gain */}
        <ProfessionalKnob
          value={track.dynamics_makeup || 0}
          min={-12}
          max={24}
          step={0.1}
          onChange={(value) => handleDynamicsParameter('makeup', value)}
          label="MAKEUP"
          unit="dB"
          size="small"
          centerDetent={true}
          bipolar={true}
        />
      </div>

      {/* Gain Reduction Meter */}
      <div className="gr-meter">
        <div className="gr-label">GR</div>
        <div className="gr-bar">
          <div 
            className="gr-fill"
            style={{ 
              width: `${Math.min(100, Math.abs(track.dynamics_gr || 0) * 5)}%` 
            }}
          />
        </div>
        <div className="gr-value">
          {track.dynamics_gr ? `${track.dynamics_gr.toFixed(1)}dB` : '0.0dB'}
        </div>
      </div>
    </div>
  );
};

export default DynamicsSection;
