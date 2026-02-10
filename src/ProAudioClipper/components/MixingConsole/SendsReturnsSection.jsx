/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SendsReturnsSection.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import ProfessionalFader from './ProfessionalFader';
import ProfessionalKnob from './ProfessionalKnob';

const SendsReturnsSection = ({ 
  auxChannels, 
  audioEngine, 
  onAuxUpdate, 
  consoleSize 
}) => {
  const handleSendLevel = (sendId, value) => {
    onAuxUpdate(sendId, 'level', value);
    audioEngine?.setAuxLevel(sendId, value);
  };

  const handleReturnLevel = (returnId, value) => {
    onAuxUpdate(returnId, 'level', value);
    audioEngine?.setAuxLevel(returnId, value);
  };

  const handleAuxMute = (auxId) => {
    const aux = [...auxChannels.sends, ...auxChannels.returns].find(a => a.id === auxId);
    if (aux) {
      const newMuted = !aux.muted;
      onAuxUpdate(auxId, 'muted', newMuted);
      audioEngine?.setAuxMute(auxId, newMuted);
    }
  };

  return (
    <div className={`sends-returns-section ${consoleSize}`}>
      {/* Sends */}
      <div className="aux-sends">
        <div className="section-header">SENDS</div>
        {auxChannels.sends.map((send) => (
          <div key={send.id} className="aux-channel">
            <div className="aux-header">
              <input
                type="text"
                className="aux-name"
                value={send.name}
                onChange={(e) => onAuxUpdate(send.id, 'name', e.target.value)}
              />
            </div>
            
            <ProfessionalKnob
              value={send.pan}
              min={-100}
              max={100}
              step={1}
              onChange={(value) => onAuxUpdate(send.id, 'pan', value)}
              label="PAN"
              size="small"
              centerDetent={true}
              bipolar={true}
            />
            
            <button 
              className={`aux-mute ${send.muted ? 'active' : ''}`}
              onClick={() => handleAuxMute(send.id)}
            >
              M
            </button>
            
            <ProfessionalFader
              value={send.level}
              min={-60}
              max={12}
              step={0.1}
              onChange={(value) => handleSendLevel(send.id, value)}
              label="dB"
              size={consoleSize === 'small' ? 'compact' : 'normal'}
            />
          </div>
        ))}
      </div>

      {/* Returns */}
      <div className="aux-returns">
        <div className="section-header">RETURNS</div>
        {auxChannels.returns.map((returnCh) => (
          <div key={returnCh.id} className="aux-channel">
            <div className="aux-header">
              <input
                type="text"
                className="aux-name"
                value={returnCh.name}
                onChange={(e) => onAuxUpdate(returnCh.id, 'name', e.target.value)}
              />
            </div>
            
            <ProfessionalKnob
              value={returnCh.inputGain}
              min={-20}
              max={20}
              step={0.1}
              onChange={(value) => onAuxUpdate(returnCh.id, 'inputGain', value)}
              label="GAIN"
              unit="dB"
              size="small"
            />
            
            <ProfessionalKnob
              value={returnCh.pan}
              min={-100}
              max={100}
              step={1}
              onChange={(value) => onAuxUpdate(returnCh.id, 'pan', value)}
              label="PAN"
              size="small"
              centerDetent={true}
              bipolar={true}
            />
            
            <button 
              className={`aux-mute ${returnCh.muted ? 'active' : ''}`}
              onClick={() => handleAuxMute(returnCh.id)}
            >
              M
            </button>
            
            <ProfessionalFader
              value={returnCh.level}
              min={-60}
              max={12}
              step={0.1}
              onChange={(value) => handleReturnLevel(returnCh.id, value)}
              label="dB"
              size={consoleSize === 'small' ? 'compact' : 'normal'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SendsReturnsSection;
