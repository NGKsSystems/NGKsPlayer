import React, { useState, useRef, useEffect } from 'react';
import './MixingConsole.css';
import ChannelStrip from './ChannelStrip';
import MasterSection from './MasterSection';
import MeteringBridge from './MeteringBridge';
import SendsReturnsSection from './SendsReturnsSection';
import BusRoutingMatrix from './BusRoutingMatrix';

const MixingConsole = ({ 
  tracks, 
  audioEngine, 
  onTrackUpdate, 
  onMasterUpdate,
  isRecording,
  isPlaying 
}) => {
  const [viewMode, setViewMode] = useState('mixer'); // 'mixer', 'routing', 'automation'
  const [selectedChannels, setSelectedChannels] = useState([]);
  const [groupedFaders, setGroupedFaders] = useState({});
  const [automationMode, setAutomationMode] = useState('off'); // 'off', 'read', 'write', 'touch', 'latch'
  const [showSends, setShowSends] = useState(true);
  const [showEQs, setShowEQs] = useState(true);
  const [showDynamics, setShowDynamics] = useState(false);
  const [consoleSize, setConsoleSize] = useState('medium'); // 'small', 'medium', 'large'
  
  const consoleRef = useRef(null);
  const meteringRef = useRef(null);
  
  // Initialize auxiliary channels (4 sends, 2 stereo returns)
  const [auxChannels] = useState(() => ({
    sends: Array.from({ length: 4 }, (_, i) => ({
      id: `send-${i + 1}`,
      name: `Send ${i + 1}`,
      level: 0,
      pan: 0,
      muted: false,
      type: 'send'
    })),
    returns: Array.from({ length: 2 }, (_, i) => ({
      id: `return-${i + 1}`,
      name: `Return ${i + 1}`,
      level: 0,
      pan: 0,
      muted: false,
      type: 'return',
      inputGain: 0
    }))
  }));

  // Initialize bus system (8 stereo buses + master)
  const [buses] = useState(() => ({
    mix: Array.from({ length: 8 }, (_, i) => ({
      id: `bus-${i + 1}`,
      name: `Bus ${i + 1}`,
      level: 0,
      pan: 0,
      muted: false,
      soloed: false,
      type: 'mix',
      assigns: []
    })),
    master: {
      id: 'master',
      name: 'Master',
      level: 0,
      pan: 0,
      muted: false,
      soloed: false,
      type: 'master'
    }
  }));

  // Professional fader grouping
  const handleFaderGroup = (channelIds, groupName) => {
    setGroupedFaders(prev => ({
      ...prev,
      [groupName]: channelIds
    }));
  };

  // Multi-channel selection for batch operations
  const handleChannelSelect = (channelId, multiSelect = false) => {
    if (multiSelect) {
      setSelectedChannels(prev => 
        prev.includes(channelId) 
          ? prev.filter(id => id !== channelId)
          : [...prev, channelId]
      );
    } else {
      setSelectedChannels([channelId]);
    }
  };

  // Automation recording
  const handleAutomationWrite = (channelId, parameter, value, timestamp) => {
    if (automationMode === 'write' || automationMode === 'touch' || automationMode === 'latch') {
      audioEngine.recordAutomation(channelId, parameter, value, timestamp);
    }
  };

  // Console layout optimization
  const getConsoleLayout = () => {
    const maxChannelsPerRow = consoleSize === 'small' ? 8 : consoleSize === 'medium' ? 12 : 16;
    const channelRows = [];
    for (let i = 0; i < tracks.length; i += maxChannelsPerRow) {
      channelRows.push(tracks.slice(i, i + maxChannelsPerRow));
    }
    return channelRows;
  };

  return (
    <div className={`mixing-console ${consoleSize}`} ref={consoleRef}>
      {/* Console Header */}
      <div className="console-header">
        <div className="console-controls">
          <div className="view-modes">
            <button 
              className={viewMode === 'mixer' ? 'active' : ''} 
              onClick={() => setViewMode('mixer')}
            >
              Mixer
            </button>
            <button 
              className={viewMode === 'routing' ? 'active' : ''} 
              onClick={() => setViewMode('routing')}
            >
              Routing
            </button>
            <button 
              className={viewMode === 'automation' ? 'active' : ''} 
              onClick={() => setViewMode('automation')}
            >
              Automation
            </button>
          </div>
          
          <div className="automation-controls">
            <label>Auto:</label>
            <select 
              value={automationMode} 
              onChange={(e) => setAutomationMode(e.target.value)}
            >
              <option value="off">Off</option>
              <option value="read">Read</option>
              <option value="write">Write</option>
              <option value="touch">Touch</option>
              <option value="latch">Latch</option>
            </select>
          </div>

          <div className="console-options">
            <button 
              className={showSends ? 'active' : ''}
              onClick={() => setShowSends(!showSends)}
            >
              Sends
            </button>
            <button 
              className={showEQs ? 'active' : ''}
              onClick={() => setShowEQs(!showEQs)}
            >
              EQs
            </button>
            <button 
              className={showDynamics ? 'active' : ''}
              onClick={() => setShowDynamics(!showDynamics)}
            >
              Dynamics
            </button>
          </div>

          <div className="console-size">
            <select 
              value={consoleSize} 
              onChange={(e) => setConsoleSize(e.target.value)}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Console Area */}
      <div className="console-main">
        {viewMode === 'mixer' && (
          <div className="mixer-view">
            {/* Metering Bridge */}
            <MeteringBridge 
              ref={meteringRef}
              tracks={tracks}
              buses={buses}
              audioEngine={audioEngine}
              consoleSize={consoleSize}
            />

            {/* Channel Strips */}
            <div className="channel-strips-container">
              {getConsoleLayout().map((channelRow, rowIndex) => (
                <div key={rowIndex} className="channel-row">
                  {channelRow.map((track, index) => (
                    <ChannelStrip
                      key={track.id}
                      track={track}
                      trackIndex={index + (rowIndex * (consoleSize === 'small' ? 8 : consoleSize === 'medium' ? 12 : 16))}
                      audioEngine={audioEngine}
                      onTrackUpdate={onTrackUpdate}
                      onAutomationWrite={handleAutomationWrite}
                      isSelected={selectedChannels.includes(track.id)}
                      onSelect={handleChannelSelect}
                      groupedWith={Object.keys(groupedFaders).find(group => 
                        groupedFaders[group].includes(track.id)
                      )}
                      automationMode={automationMode}
                      showSends={showSends}
                      showEQ={showEQs}
                      showDynamics={showDynamics}
                      auxChannels={auxChannels}
                      buses={buses}
                      consoleSize={consoleSize}
                    />
                  ))}
                </div>
              ))}

              {/* Sends/Returns Section */}
              <SendsReturnsSection
                auxChannels={auxChannels}
                audioEngine={audioEngine}
                onAuxUpdate={(auxId, parameter, value) => {
                  audioEngine.updateAuxChannel(auxId, parameter, value);
                }}
                consoleSize={consoleSize}
              />

              {/* Master Section */}
              <MasterSection
                masterBus={buses.master}
                audioEngine={audioEngine}
                onMasterUpdate={onMasterUpdate}
                onAutomationWrite={handleAutomationWrite}
                automationMode={automationMode}
                isRecording={isRecording}
                isPlaying={isPlaying}
                consoleSize={consoleSize}
              />
            </div>
          </div>
        )}

        {viewMode === 'routing' && (
          <BusRoutingMatrix
            tracks={tracks}
            buses={buses}
            auxChannels={auxChannels}
            audioEngine={audioEngine}
            onRoutingChange={(sourceId, destinationId, enabled) => {
              audioEngine.setRouting(sourceId, destinationId, enabled);
            }}
          />
        )}

        {viewMode === 'automation' && (
          <div className="automation-view">
            <div className="automation-lanes">
              {tracks.map(track => (
                <div key={track.id} className="automation-lane">
                  <div className="lane-header">
                    <span>{track.name}</span>
                    <select onChange={(e) => {
                      // Switch automation parameter view
                    }}>
                      <option value="volume">Volume</option>
                      <option value="pan">Pan</option>
                      <option value="send1">Send 1</option>
                      <option value="send2">Send 2</option>
                      <option value="eq-gain">EQ Gain</option>
                    </select>
                  </div>
                  <div className="automation-curve">
                    {/* Automation curve visualization and editing */}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MixingConsole;