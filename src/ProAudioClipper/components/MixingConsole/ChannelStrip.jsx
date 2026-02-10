/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ChannelStrip.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ProfessionalFader from './ProfessionalFader';
import ProfessionalKnob from './ProfessionalKnob';
import SendsSection from './SendsSection';
import EQSection from './EQSection';
import DynamicsSection from './DynamicsSection';
import './ChannelStrip.css';

const ChannelStrip = ({
  track,
  trackIndex,
  audioEngine,
  onTrackUpdate,
  onAutomationWrite,
  isSelected,
  onSelect,
  groupedWith,
  automationMode,
  showSends,
  showEQ,
  showDynamics,
  auxChannels,
  buses,
  consoleSize
}) => {
  const [localGain, setLocalGain] = useState(track.gain || 0);
  const [localPan, setLocalPan] = useState(track.pan || 0);
  const [isMuted, setIsMuted] = useState(track.muted || false);
  const [isSoloed, setIsSoloed] = useState(track.soloed || false);
  const [isRecordEnabled, setIsRecordEnabled] = useState(track.recordEnabled || false);
  const [selectedBus, setSelectedBus] = useState(track.busAssignment || 'master');
  const [inputGain, setInputGain] = useState(track.inputGain || 0);
  const [highPassFilter, setHighPassFilter] = useState(track.highPassFilter || false);
  const [lowPassFilter, setLowPassFilter] = useState(track.lowPassFilter || false);
  const [phase, setPhase] = useState(track.phase || 0); // 0 = normal, 180 = inverted
  
  const stripRef = useRef(null);
  const meterRef = useRef(null);
  const [meterLevels, setMeterLevels] = useState({ left: -60, right: -60, peak: -60 });

  // Professional metering update
  useEffect(() => {
    if (!audioEngine || !track.id) return;

    let animationId;
    const updateMeters = () => {
      const levels = audioEngine.getTrackMetering(track.id);
      if (levels) {
        setMeterLevels(levels);
      }
      animationId = requestAnimationFrame(updateMeters);
    };

    animationId = requestAnimationFrame(updateMeters);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [audioEngine, track.id]);

  // Handle fader automation
  const handleFaderChange = useCallback((value, timestamp = Date.now()) => {
    setLocalGain(value);
    onTrackUpdate(track.id, 'gain', value);
    
    if (automationMode !== 'off') {
      onAutomationWrite(track.id, 'gain', value, timestamp);
    }
  }, [track.id, onTrackUpdate, onAutomationWrite, automationMode]);

  // Handle pan automation
  const handlePanChange = useCallback((value, timestamp = Date.now()) => {
    setLocalPan(value);
    onTrackUpdate(track.id, 'pan', value);
    
    if (automationMode !== 'off') {
      onAutomationWrite(track.id, 'pan', value, timestamp);
    }
  }, [track.id, onTrackUpdate, onAutomationWrite, automationMode]);

  // Professional mute with automation
  const handleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onTrackUpdate(track.id, 'muted', newMuted);
    
    if (automationMode !== 'off') {
      onAutomationWrite(track.id, 'muted', newMuted, Date.now());
    }
  };

  // Professional solo with exclusive mode
  const handleSolo = (exclusive = false) => {
    const newSoloed = !isSoloed;
    setIsSoloed(newSoloed);
    onTrackUpdate(track.id, 'soloed', newSoloed);
    
    if (exclusive && newSoloed) {
      // Clear other solos when exclusive
      audioEngine.clearAllSolos(track.id);
    }
  };

  // Input gain control
  const handleInputGain = (value) => {
    setInputGain(value);
    onTrackUpdate(track.id, 'inputGain', value);
    audioEngine.setInputGain(track.id, value);
  };

  // High-pass filter
  const handleHighPass = () => {
    const newState = !highPassFilter;
    setHighPassFilter(newState);
    onTrackUpdate(track.id, 'highPassFilter', newState);
    audioEngine.setHighPassFilter(track.id, newState);
  };

  // Low-pass filter
  const handleLowPass = () => {
    const newState = !lowPassFilter;
    setLowPassFilter(newState);
    onTrackUpdate(track.id, 'lowPassFilter', newState);
    audioEngine.setLowPassFilter(track.id, newState);
  };

  // Phase invert
  const handlePhaseInvert = () => {
    const newPhase = phase === 0 ? 180 : 0;
    setPhase(newPhase);
    onTrackUpdate(track.id, 'phase', newPhase);
    audioEngine.setPhase(track.id, newPhase);
  };

  // Bus assignment
  const handleBusAssignment = (busId) => {
    setSelectedBus(busId);
    onTrackUpdate(track.id, 'busAssignment', busId);
    audioEngine.assignToBus(track.id, busId);
  };

  // Channel selection
  const handleChannelClick = (e) => {
    const multiSelect = e.ctrlKey || e.metaKey;
    onSelect(track.id, multiSelect);
  };

  return (
    <div 
      ref={stripRef}
      className={`channel-strip ${consoleSize} ${isSelected ? 'selected' : ''} ${groupedWith ? `grouped-${groupedWith}` : ''}`}
      onClick={handleChannelClick}
    >
      {/* Channel Header */}
      <div className="channel-header">
        <div className="channel-number">{trackIndex + 1}</div>
        <input
          type="text"
          className="channel-name"
          value={track.name || `Track ${trackIndex + 1}`}
          onChange={(e) => onTrackUpdate(track.id, 'name', e.target.value)}
          title="Channel Name"
        />
        <div className="channel-type">{track.type || 'AUDIO'}</div>
      </div>

      {/* Input Section */}
      <div className="input-section">
        <div className="input-controls">
          <ProfessionalKnob
            value={inputGain}
            min={-20}
            max={20}
            step={0.1}
            onChange={handleInputGain}
            label="GAIN"
            unit="dB"
            size="small"
          />
          
          <div className="input-buttons">
            <button 
              className={`filter-button ${highPassFilter ? 'active' : ''}`}
              onClick={handleHighPass}
              title="High-Pass Filter"
            >
              HP
            </button>
            <button 
              className={`filter-button ${lowPassFilter ? 'active' : ''}`}
              onClick={handleLowPass}
              title="Low-Pass Filter"
            >
              LP
            </button>
            <button 
              className={`phase-button ${phase === 180 ? 'active' : ''}`}
              onClick={handlePhaseInvert}
              title="Phase Invert"
            >
              Ã˜
            </button>
          </div>
        </div>
      </div>

      {/* EQ Section */}
      {showEQ && (
        <EQSection
          track={track}
          audioEngine={audioEngine}
          onParameterChange={(param, value) => {
            onTrackUpdate(track.id, param, value);
            if (automationMode !== 'off') {
              onAutomationWrite(track.id, param, value, Date.now());
            }
          }}
          size={consoleSize === 'small' ? 'compact' : 'normal'}
        />
      )}

      {/* Dynamics Section */}
      {showDynamics && (
        <DynamicsSection
          track={track}
          audioEngine={audioEngine}
          onParameterChange={(param, value) => {
            onTrackUpdate(track.id, param, value);
            if (automationMode !== 'off') {
              onAutomationWrite(track.id, param, value, Date.now());
            }
          }}
          size={consoleSize === 'small' ? 'compact' : 'normal'}
        />
      )}

      {/* Sends Section */}
      {showSends && (
        <SendsSection
          track={track}
          auxChannels={auxChannels}
          audioEngine={audioEngine}
          onSendChange={(sendId, value) => {
            onTrackUpdate(track.id, `send_${sendId}`, value);
            audioEngine.setSendLevel(track.id, sendId, value);
            if (automationMode !== 'off') {
              onAutomationWrite(track.id, `send_${sendId}`, value, Date.now());
            }
          }}
          size={consoleSize === 'small' ? 'compact' : 'normal'}
        />
      )}

      {/* Pan Control */}
      <div className="pan-section">
        <ProfessionalKnob
          value={localPan}
          min={-100}
          max={100}
          step={1}
          onChange={handlePanChange}
          label="PAN"
          size="medium"
          centerDetent={true}
        />
      </div>

      {/* Bus Assignment */}
      <div className="bus-assignment">
        <select 
          value={selectedBus} 
          onChange={(e) => handleBusAssignment(e.target.value)}
          className="bus-selector"
        >
          <option value="master">Master</option>
          {buses.mix.map(bus => (
            <option key={bus.id} value={bus.id}>{bus.name}</option>
          ))}
        </select>
      </div>

      {/* Professional Metering */}
      <div className="meter-section" ref={meterRef}>
        <div className="level-meters">
          <div className="meter-scale">
            <div className="meter-mark">0</div>
            <div className="meter-mark">-6</div>
            <div className="meter-mark">-12</div>
            <div className="meter-mark">-18</div>
            <div className="meter-mark">-24</div>
            <div className="meter-mark">-âˆž</div>
          </div>
          <div className="stereo-meters">
            <div className="meter-bar left">
              <div 
                className="meter-fill"
                style={{ height: `${Math.max(0, (meterLevels.left + 60) / 60 * 100)}%` }}
              />
              <div 
                className="meter-peak"
                style={{ bottom: `${Math.max(0, (meterLevels.peak + 60) / 60 * 100)}%` }}
              />
            </div>
            <div className="meter-bar right">
              <div 
                className="meter-fill"
                style={{ height: `${Math.max(0, (meterLevels.right + 60) / 60 * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <div className="transport-section">
        <button 
          className={`record-button ${isRecordEnabled ? 'active' : ''}`}
          onClick={() => {
            setIsRecordEnabled(!isRecordEnabled);
            onTrackUpdate(track.id, 'recordEnabled', !isRecordEnabled);
          }}
          title="Record Enable"
        >
          â—
        </button>
        
        <button 
          className={`solo-button ${isSoloed ? 'active' : ''}`}
          onClick={() => handleSolo(false)}
          onDoubleClick={() => handleSolo(true)}
          title="Solo (Double-click for exclusive)"
        >
          S
        </button>
        
        <button 
          className={`mute-button ${isMuted ? 'active' : ''}`}
          onClick={handleMute}
          title="Mute"
        >
          M
        </button>
      </div>

      {/* Main Fader */}
      <div className="fader-section">
        <ProfessionalFader
          value={localGain}
          min={-60}
          max={12}
          step={0.1}
          onChange={handleFaderChange}
          onAutomationWrite={onAutomationWrite}
          automationMode={automationMode}
          trackId={track.id}
          label="dB"
          size={consoleSize === 'small' ? 'compact' : consoleSize === 'medium' ? 'normal' : 'large'}
        />
        
        <div className="fader-readout">
          {localGain > -60 ? `${localGain.toFixed(1)}dB` : '-âˆž'}
        </div>
      </div>
    </div>
  );
};

export default ChannelStrip;
