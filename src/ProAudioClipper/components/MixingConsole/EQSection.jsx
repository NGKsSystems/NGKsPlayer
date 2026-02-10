/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: EQSection.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import ProfessionalKnob from './ProfessionalKnob';

const EQSection = ({ 
  track, 
  audioEngine, 
  onParameterChange, 
  size = 'normal' 
}) => {
  const handleEQParameter = (band, parameter, value) => {
    const paramName = `eq_${band}_${parameter}`;
    onParameterChange(paramName, value);
    audioEngine?.setEQParameter(track.id, band, parameter, value);
  };

  const handleEQBypass = (band) => {
    const paramName = `eq_${band}_bypass`;
    const currentBypass = track[paramName] || false;
    onParameterChange(paramName, !currentBypass);
    audioEngine?.setEQBypass(track.id, band, !currentBypass);
  };

  if (size === 'compact') {
    return (
      <div className="eq-section compact">
        <div className="eq-header">
          <span>EQ</span>
        </div>
        <div className="eq-compact">
          <ProfessionalKnob
            value={track.eq_high_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('high', 'gain', value)}
            label="HI"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
          <ProfessionalKnob
            value={track.eq_low_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('low', 'gain', value)}
            label="LO"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="eq-section">
      <div className="eq-header">
        <span>4-BAND EQ</span>
        <button 
          className={`eq-bypass ${track.eq_bypass ? 'active' : ''}`}
          onClick={() => {
            onParameterChange('eq_bypass', !track.eq_bypass);
            audioEngine?.setEQBypass(track.id, 'all', !track.eq_bypass);
          }}
        >
          BYP
        </button>
      </div>
      
      <div className="eq-bands">
        {/* High Frequency */}
        <div className="eq-band">
          <div className="band-label">HF</div>
          <ProfessionalKnob
            value={track.eq_high_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('high', 'gain', value)}
            label="GAIN"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
          <ProfessionalKnob
            value={track.eq_high_freq || 8000}
            min={1000}
            max={20000}
            step={10}
            onChange={(value) => handleEQParameter('high', 'freq', value)}
            label="FREQ"
            unit="Hz"
            size="small"
            logarithmic={true}
          />
        </div>

        {/* High-Mid Frequency */}
        <div className="eq-band">
          <div className="band-label">HM</div>
          <ProfessionalKnob
            value={track.eq_hmid_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('hmid', 'gain', value)}
            label="GAIN"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
          <ProfessionalKnob
            value={track.eq_hmid_freq || 2500}
            min={200}
            max={8000}
            step={10}
            onChange={(value) => handleEQParameter('hmid', 'freq', value)}
            label="FREQ"
            unit="Hz"
            size="small"
            logarithmic={true}
          />
          <ProfessionalKnob
            value={track.eq_hmid_q || 1}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(value) => handleEQParameter('hmid', 'q', value)}
            label="Q"
            size="small"
            logarithmic={true}
          />
        </div>

        {/* Low-Mid Frequency */}
        <div className="eq-band">
          <div className="band-label">LM</div>
          <ProfessionalKnob
            value={track.eq_lmid_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('lmid', 'gain', value)}
            label="GAIN"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
          <ProfessionalKnob
            value={track.eq_lmid_freq || 500}
            min={50}
            max={2000}
            step={10}
            onChange={(value) => handleEQParameter('lmid', 'freq', value)}
            label="FREQ"
            unit="Hz"
            size="small"
            logarithmic={true}
          />
          <ProfessionalKnob
            value={track.eq_lmid_q || 1}
            min={0.1}
            max={10}
            step={0.1}
            onChange={(value) => handleEQParameter('lmid', 'q', value)}
            label="Q"
            size="small"
            logarithmic={true}
          />
        </div>

        {/* Low Frequency */}
        <div className="eq-band">
          <div className="band-label">LF</div>
          <ProfessionalKnob
            value={track.eq_low_gain || 0}
            min={-15}
            max={15}
            step={0.1}
            onChange={(value) => handleEQParameter('low', 'gain', value)}
            label="GAIN"
            unit="dB"
            size="small"
            centerDetent={true}
            bipolar={true}
          />
          <ProfessionalKnob
            value={track.eq_low_freq || 100}
            min={20}
            max={500}
            step={1}
            onChange={(value) => handleEQParameter('low', 'freq', value)}
            label="FREQ"
            unit="Hz"
            size="small"
            logarithmic={true}
          />
        </div>
      </div>
    </div>
  );
};

export default EQSection;
