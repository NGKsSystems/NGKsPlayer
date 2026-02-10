/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: SendsSection.jsx
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

const SendsSection = ({ 
  track, 
  auxChannels, 
  audioEngine, 
  onSendChange, 
  size = 'normal' 
}) => {
  const handleSendLevel = (sendIndex, value) => {
    onSendChange(sendIndex, value);
  };

  const handleSendPan = (sendIndex, value) => {
    audioEngine?.setSendPan(track.id, sendIndex, value);
  };

  const handleSendMute = (sendIndex) => {
    const currentMute = track[`send_${sendIndex}_muted`] || false;
    audioEngine?.setSendMute(track.id, sendIndex, !currentMute);
  };

  const handleSendPre = (sendIndex) => {
    const currentPre = track[`send_${sendIndex}_pre`] || false;
    audioEngine?.setSendPre(track.id, sendIndex, !currentPre);
  };

  return (
    <div className={`sends-section ${size}`}>
      <div className="sends-header">
        <span>SENDS</span>
      </div>
      
      <div className="sends-controls">
        {auxChannels.sends.slice(0, size === 'compact' ? 2 : 4).map((send, index) => (
          <div key={send.id} className="send-control">
            <div className="send-label">{index + 1}</div>
            
            <ProfessionalKnob
              value={track[`send_${index}`] || 0}
              min={-60}
              max={12}
              step={0.5}
              onChange={(value) => handleSendLevel(index, value)}
              label=""
              unit="dB"
              size="small"
            />
            
            {size !== 'compact' && (
              <>
                <ProfessionalKnob
                  value={track[`send_${index}_pan`] || 0}
                  min={-100}
                  max={100}
                  step={1}
                  onChange={(value) => handleSendPan(index, value)}
                  label=""
                  size="small"
                  centerDetent={true}
                  bipolar={true}
                />
                
                <div className="send-buttons">
                  <button 
                    className={`send-button ${track[`send_${index}_pre`] ? 'active' : ''}`}
                    onClick={() => handleSendPre(index)}
                    title="Pre/Post Fader"
                  >
                    {track[`send_${index}_pre`] ? 'PRE' : 'POST'}
                  </button>
                  
                  <button 
                    className={`send-button ${track[`send_${index}_muted`] ? 'active' : ''}`}
                    onClick={() => handleSendMute(index)}
                    title="Send Mute"
                  >
                    M
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SendsSection;
