import React, { useState, useRef, useEffect } from 'react';
import ProfessionalFader from './ProfessionalFader';
import ProfessionalKnob from './ProfessionalKnob';
import './MasterSection.css';

const MasterSection = ({
  masterBus,
  audioEngine,
  onMasterUpdate,
  onAutomationWrite,
  automationMode,
  isRecording,
  isPlaying,
  consoleSize
}) => {
  const [masterGain, setMasterGain] = useState(masterBus?.level || 0);
  const [masterPan, setMasterPan] = useState(masterBus?.pan || 0);
  const [isMuted, setIsMuted] = useState(masterBus?.muted || false);
  const [isDimmed, setIsDimmed] = useState(false);
  const [monoMode, setMonoMode] = useState(false);
  const [talkbackEnabled, setTalkbackEnabled] = useState(false);
  
  // Master chain processing
  const [compressorEnabled, setCompressorEnabled] = useState(false);
  const [limiterEnabled, setLimiterEnabled] = useState(true);
  const [eqEnabled, setEQEnabled] = useState(false);
  
  // Monitoring
  const [monitorLevel, setMonitorLevel] = useState(-12);
  const [headphoneLevel, setHeadphoneLevel] = useState(-18);
  const [cueLevel, setCueLevel] = useState(-20);
  
  // Metering
  const [masterLevels, setMasterLevels] = useState({ 
    left: -60, 
    right: -60, 
    peak: -60,
    rms: -60,
    lufs: -23 
  });
  
  const meterRef = useRef(null);
  const masterRef = useRef(null);

  // Update master metering
  useEffect(() => {
    if (!audioEngine) return;

    let animationId;
    const updateMeters = () => {
      const levels = audioEngine.getMasterMetering();
      if (levels) {
        setMasterLevels(levels);
      }
      animationId = requestAnimationFrame(updateMeters);
    };

    animationId = requestAnimationFrame(updateMeters);
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [audioEngine]);

  // Handle master fader
  const handleMasterGain = (value, timestamp) => {
    setMasterGain(value);
    onMasterUpdate('gain', value);
    audioEngine?.setMasterGain(value);
    
    if (automationMode !== 'off') {
      onAutomationWrite('master', 'gain', value, timestamp);
    }
  };

  // Handle master pan
  const handleMasterPan = (value, timestamp) => {
    setMasterPan(value);
    onMasterUpdate('pan', value);
    audioEngine?.setMasterPan(value);
    
    if (automationMode !== 'off') {
      onAutomationWrite('master', 'pan', value, timestamp);
    }
  };

  // Handle master mute
  const handleMasterMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    onMasterUpdate('muted', newMuted);
    audioEngine?.setMasterMute(newMuted);
    
    if (automationMode !== 'off') {
      onAutomationWrite('master', 'muted', newMuted, Date.now());
    }
  };

  // Handle dim (monitor level reduction)
  const handleDim = () => {
    const newDimmed = !isDimmed;
    setIsDimmed(newDimmed);
    audioEngine?.setMonitorDim(newDimmed);
  };

  // Handle mono monitoring
  const handleMono = () => {
    const newMono = !monoMode;
    setMonoMode(newMono);
    audioEngine?.setMonitorMono(newMono);
  };

  // Handle talkback
  const handleTalkback = () => {
    const newTalkback = !talkbackEnabled;
    setTalkbackEnabled(newTalkback);
    audioEngine?.setTalkback(newTalkback);
  };

  // Master chain controls
  const handleCompressor = () => {
    const newEnabled = !compressorEnabled;
    setCompressorEnabled(newEnabled);
    audioEngine?.setMasterCompressor(newEnabled);
  };

  const handleLimiter = () => {
    const newEnabled = !limiterEnabled;
    setLimiterEnabled(newEnabled);
    audioEngine?.setMasterLimiter(newEnabled);
  };

  const handleEQ = () => {
    const newEnabled = !eqEnabled;
    setEQEnabled(newEnabled);
    audioEngine?.setMasterEQ(newEnabled);
  };

  // Monitor level controls
  const handleMonitorLevel = (value) => {
    setMonitorLevel(value);
    audioEngine?.setMonitorLevel(value);
  };

  const handleHeadphoneLevel = (value) => {
    setHeadphoneLevel(value);
    audioEngine?.setHeadphoneLevel(value);
  };

  const handleCueLevel = (value) => {
    setCueLevel(value);
    audioEngine?.setCueLevel(value);
  };

  return (
    <div className={`master-section ${consoleSize}`} ref={masterRef}>
      {/* Master Chain */}
      <div className="master-chain">
        <div className="chain-header">
          <span>MASTER CHAIN</span>
        </div>
        
        <div className="chain-controls">
          <button 
            className={`chain-button ${eqEnabled ? 'active' : ''}`}
            onClick={handleEQ}
            title="Master EQ"
          >
            EQ
          </button>
          
          <button 
            className={`chain-button ${compressorEnabled ? 'active' : ''}`}
            onClick={handleCompressor}
            title="Master Compressor"
          >
            COMP
          </button>
          
          <button 
            className={`chain-button ${limiterEnabled ? 'active' : ''}`}
            onClick={handleLimiter}
            title="Master Limiter"
          >
            LIM
          </button>
        </div>
      </div>

      {/* Monitor Controls */}
      <div className="monitor-controls">
        <div className="monitor-header">
          <span>MONITOR</span>
        </div>
        
        <div className="monitor-levels">
          <ProfessionalKnob
            value={monitorLevel}
            min={-60}
            max={12}
            step={0.5}
            onChange={handleMonitorLevel}
            label="MON"
            unit="dB"
            size="small"
          />
          
          <ProfessionalKnob
            value={headphoneLevel}
            min={-60}
            max={12}
            step={0.5}
            onChange={handleHeadphoneLevel}
            label="HP"
            unit="dB"
            size="small"
          />
          
          <ProfessionalKnob
            value={cueLevel}
            min={-60}
            max={12}
            step={0.5}
            onChange={handleCueLevel}
            label="CUE"
            unit="dB"
            size="small"
          />
        </div>
        
        <div className="monitor-buttons">
          <button 
            className={`monitor-button ${isDimmed ? 'active' : ''}`}
            onClick={handleDim}
            title="Dim Monitor (-20dB)"
          >
            DIM
          </button>
          
          <button 
            className={`monitor-button ${monoMode ? 'active' : ''}`}
            onClick={handleMono}
            title="Mono Monitoring"
          >
            MONO
          </button>
          
          <button 
            className={`monitor-button ${talkbackEnabled ? 'active' : ''}`}
            onClick={handleTalkback}
            title="Talkback"
          >
            TALK
          </button>
        </div>
      </div>

      {/* Master Pan */}
      <div className="master-pan">
        <ProfessionalKnob
          value={masterPan}
          min={-100}
          max={100}
          step={1}
          onChange={(value, timestamp) => handleMasterPan(value, timestamp)}
          onAutomationWrite={onAutomationWrite}
          automationMode={automationMode}
          trackId="master"
          parameter="pan"
          label="PAN"
          size="medium"
          centerDetent={true}
          bipolar={true}
        />
      </div>

      {/* Master Metering */}
      <div className="master-metering" ref={meterRef}>
        <div className="meter-header">
          <span>MASTER</span>
        </div>
        
        {/* Stereo Level Meters */}
        <div className="stereo-meters">
          <div className="meter-scale">
            <div className="meter-mark">+12</div>
            <div className="meter-mark">0</div>
            <div className="meter-mark">-6</div>
            <div className="meter-mark">-12</div>
            <div className="meter-mark">-18</div>
            <div className="meter-mark">-24</div>
            <div className="meter-mark">-30</div>
            <div className="meter-mark">-∞</div>
          </div>
          
          <div className="level-bars">
            <div className="meter-bar left">
              <div 
                className="meter-fill"
                style={{ 
                  height: `${Math.max(0, (masterLevels.left + 60) / 72 * 100)}%` 
                }}
              />
              <div 
                className="meter-peak"
                style={{ 
                  bottom: `${Math.max(0, (masterLevels.peak + 60) / 72 * 100)}%` 
                }}
              />
            </div>
            
            <div className="meter-bar right">
              <div 
                className="meter-fill"
                style={{ 
                  height: `${Math.max(0, (masterLevels.right + 60) / 72 * 100)}%` 
                }}
              />
            </div>
          </div>
          
          <div className="channel-labels">
            <span>L</span>
            <span>R</span>
          </div>
        </div>

        {/* RMS and LUFS Display */}
        <div className="advanced-metering">
          <div className="meter-readout">
            <span className="meter-label">RMS</span>
            <span className="meter-value">
              {masterLevels.rms > -60 ? `${masterLevels.rms.toFixed(1)}` : '-∞'}
            </span>
          </div>
          
          <div className="meter-readout">
            <span className="meter-label">LUFS</span>
            <span className="meter-value">
              {masterLevels.lufs.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* Transport Integration */}
      <div className="transport-status">
        <div className={`status-indicator ${isRecording ? 'recording' : ''}`}>
          {isRecording ? 'REC' : ''}
        </div>
        <div className={`status-indicator ${isPlaying ? 'playing' : ''}`}>
          {isPlaying ? 'PLAY' : ''}
        </div>
      </div>

      {/* Master Mute */}
      <div className="master-mute">
        <button 
          className={`mute-button master ${isMuted ? 'active' : ''}`}
          onClick={handleMasterMute}
          title="Master Mute"
        >
          MUTE
        </button>
      </div>

      {/* Master Fader */}
      <div className="master-fader">
        <ProfessionalFader
          value={masterGain}
          min={-60}
          max={12}
          step={0.1}
          onChange={(value, timestamp) => handleMasterGain(value, timestamp)}
          onAutomationWrite={onAutomationWrite}
          automationMode={automationMode}
          trackId="master"
          label="dB"
          size={consoleSize === 'small' ? 'compact' : consoleSize === 'medium' ? 'normal' : 'large'}
        />
        
        <div className="fader-label">
          MASTER
        </div>
        
        <div className="fader-readout">
          {masterGain > -60 ? `${masterGain.toFixed(1)}dB` : '-∞'}
        </div>
      </div>
    </div>
  );
};

export default MasterSection;