/**
 * Professional MIDI Integration Interface
 * Complete MIDI system for controllers, automation, and virtual instruments
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MIDISystem } from '../audio/MIDISystem';
import { AnalogSynth, DrumMachine } from '../audio/VirtualInstruments';

const MIDIIntegrationInterface = ({ audioContext, onAutomationData, isActive = true }) => {
    // State management
    const [midiSystem, setMidiSystem] = useState(null);
    const [connectedDevices, setConnectedDevices] = useState([]);
    const [midiActivity, setMidiActivity] = useState([]);
    const [isRecordingAutomation, setIsRecordingAutomation] = useState(false);
    const [virtualInstruments, setVirtualInstruments] = useState(new Map());
    const [currentAutomationTarget, setCurrentAutomationTarget] = useState(null);
    
    // UI state
    const [activeTab, setActiveTab] = useState('devices');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Channel states (16 MIDI channels)
    const [channelStates, setChannelStates] = useState(
        Array(16).fill(null).map((_, i) => ({
            channel: i + 1,
            volume: 127,
            pan: 64,
            program: 0,
            instrument: 'none',
            mute: false,
            solo: false,
            activeNotes: []
        }))
    );
    
    // MIDI mapping state
    const [midiMappings, setMidiMappings] = useState([]);
    const [isLearningMode, setIsLearningMode] = useState(false);
    const [learningParameter, setLearningParameter] = useState(null);
    
    // Refs
    const midiSystemRef = useRef(null);
    const activityTimeoutRef = useRef(null);
    
    // Initialize MIDI system
    useEffect(() => {
        if (!audioContext || !isActive) return;
        
        const initializeMIDI = async () => {
            try {
                const midi = new MIDISystem(audioContext);
                await midi.initialize();
                
                midiSystemRef.current = midi;
                setMidiSystem(midi);
                
                // Set up event listeners
                setupMIDIEventListeners(midi);
                
                // Initialize virtual instruments
                initializeVirtualInstruments(midi);
                
                console.log('MIDI Integration Interface initialized');
                
            } catch (error) {
                console.error('Failed to initialize MIDI system:', error);
            }
        };
        
        initializeMIDI();
        
        return () => {
            if (midiSystemRef.current) {
                midiSystemRef.current.disconnect();
            }
        };
    }, [audioContext, isActive]);
    
    const setupMIDIEventListeners = (midi) => {
        // Device change events
        midi.addEventListener('devicechange', (devices) => {
            setConnectedDevices(devices);
        });
        
        // MIDI message events
        midi.addEventListener('midimessage', (midiEvent) => {
            handleMIDIActivity(midiEvent);
            
            // Handle MIDI learn mode
            if (isLearningMode && learningParameter) {
                handleMIDILearn(midiEvent);
            }
        });
        
        // Note events for channel state updates
        midi.addEventListener('noteOn', (event) => {
            updateChannelNoteState(event.channel, event.data1, true);
        });
        
        midi.addEventListener('noteOff', (event) => {
            updateChannelNoteState(event.channel, event.data1, false);
        });
        
        // Control change events
        midi.addEventListener('controlChange', (event) => {
            updateChannelControlState(event.channel, event.data1, event.data2);
        });
    };
    
    const initializeVirtualInstruments = (midi) => {
        const instruments = new Map();
        
        // Create default instruments for some channels
        const analogSynth = new AnalogSynth(audioContext);
        analogSynth.connect(audioContext.destination);
        instruments.set(0, analogSynth); // Channel 1
        midi.registerVirtualInstrument(0, analogSynth);
        
        const drumMachine = new DrumMachine(audioContext);
        drumMachine.connect(audioContext.destination);
        instruments.set(9, drumMachine); // Channel 10 (drums)
        midi.registerVirtualInstrument(9, drumMachine);
        
        setVirtualInstruments(instruments);
        
        // Update channel states
        setChannelStates(prev => prev.map((channel, index) => ({
            ...channel,
            instrument: index === 0 ? 'analogSynth' : index === 9 ? 'drumMachine' : 'none'
        })));
    };
    
    const handleMIDIActivity = (midiEvent) => {
        // Add to activity log
        const activity = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            type: midiEvent.type,
            channel: midiEvent.channel + 1,
            data1: midiEvent.data1,
            data2: midiEvent.data2,
            message: formatMIDIMessage(midiEvent)
        };
        
        setMidiActivity(prev => [activity, ...prev.slice(0, 49)]); // Keep last 50 events
        
        // Clear activity after timeout
        if (activityTimeoutRef.current) {
            clearTimeout(activityTimeoutRef.current);
        }
        
        activityTimeoutRef.current = setTimeout(() => {
            setMidiActivity(prev => prev.slice(0, 10)); // Keep last 10 after timeout
        }, 5000);
    };
    
    const formatMIDIMessage = (midiEvent) => {
        const { type, channel, data1, data2 } = midiEvent;
        
        switch (type) {
            case 'noteOn':
                return `Note On: ${noteNumberToName(data1)} (${data1}) Vel: ${data2}`;
            case 'noteOff':
                return `Note Off: ${noteNumberToName(data1)} (${data1}) Vel: ${data2}`;
            case 'controlChange':
                return `CC: ${data1} = ${data2}`;
            case 'programChange':
                return `Program: ${data1}`;
            case 'pitchBend':
                return `Pitch Bend: ${data1}`;
            default:
                return `${type}: ${data1}, ${data2}`;
        }
    };
    
    const noteNumberToName = (noteNumber) => {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(noteNumber / 12) - 1;
        const note = noteNames[noteNumber % 12];
        return `${note}${octave}`;
    };
    
    const updateChannelNoteState = (channel, note, isOn) => {
        setChannelStates(prev => prev.map((ch, index) => {
            if (index === channel) {
                const activeNotes = isOn 
                    ? [...ch.activeNotes, note].slice(-8) // Keep last 8 notes
                    : ch.activeNotes.filter(n => n !== note);
                
                return { ...ch, activeNotes };
            }
            return ch;
        }));
    };
    
    const updateChannelControlState = (channel, controller, value) => {
        setChannelStates(prev => prev.map((ch, index) => {
            if (index === channel) {
                const updates = { ...ch };
                
                switch (controller) {
                    case 7: // Volume
                        updates.volume = value;
                        break;
                    case 10: // Pan
                        updates.pan = value;
                        break;
                }
                
                return updates;
            }
            return ch;
        }));
    };
    
    // Automation recording
    const startAutomationRecording = useCallback((targetParameter = null) => {
        if (!midiSystemRef.current) return;
        
        setIsRecordingAutomation(true);
        setCurrentAutomationTarget(targetParameter);
        midiSystemRef.current.startAutomationRecording(targetParameter);
        
        console.log('Started MIDI automation recording for:', targetParameter?.name || 'all parameters');
    }, []);
    
    const stopAutomationRecording = useCallback(() => {
        if (!midiSystemRef.current) return;
        
        const recordedData = midiSystemRef.current.stopAutomationRecording();
        setIsRecordingAutomation(false);
        setCurrentAutomationTarget(null);
        
        if (onAutomationData && recordedData.length > 0) {
            onAutomationData(recordedData);
        }
        
        console.log('Stopped MIDI automation recording, recorded:', recordedData.length, 'events');
        return recordedData;
    }, [onAutomationData]);
    
    // MIDI Learn functionality
    const startMIDILearn = useCallback((parameterInfo) => {
        setIsLearningMode(true);
        setLearningParameter(parameterInfo);
        console.log('MIDI Learn mode activated for:', parameterInfo.name);
    }, []);
    
    const handleMIDILearn = useCallback((midiEvent) => {
        if (!learningParameter || midiEvent.type !== 'controlChange') return;
        
        const mapping = {
            id: Date.now(),
            channel: midiEvent.channel,
            controller: midiEvent.data1,
            parameter: learningParameter,
            min: learningParameter.min || 0,
            max: learningParameter.max || 1
        };
        
        // Add mapping
        setMidiMappings(prev => [...prev, mapping]);
        
        // Set up the actual MIDI mapping
        if (midiSystemRef.current) {
            midiSystemRef.current.mapControllerToParameter(
                midiEvent.channel,
                midiEvent.data1,
                learningParameter
            );
        }
        
        // Exit learn mode
        setIsLearningMode(false);
        setLearningParameter(null);
        
        console.log('MIDI mapping created:', mapping);
    }, [learningParameter]);
    
    const cancelMIDILearn = useCallback(() => {
        setIsLearningMode(false);
        setLearningParameter(null);
    }, []);
    
    // Channel control
    const setChannelInstrument = useCallback((channel, instrumentType) => {
        if (!midiSystemRef.current || !audioContext) return;
        
        // Remove existing instrument
        const existingInstrument = virtualInstruments.get(channel);
        if (existingInstrument) {
            existingInstrument.disconnect();
        }
        
        // Create new instrument
        let newInstrument = null;
        switch (instrumentType) {
            case 'analogSynth':
                newInstrument = new AnalogSynth(audioContext);
                break;
            case 'drumMachine':
                newInstrument = new DrumMachine(audioContext);
                break;
            default:
                // Remove instrument
                virtualInstruments.delete(channel);
                setVirtualInstruments(new Map(virtualInstruments));
                return;
        }
        
        if (newInstrument) {
            newInstrument.connect(audioContext.destination);
            virtualInstruments.set(channel, newInstrument);
            setVirtualInstruments(new Map(virtualInstruments));
            
            midiSystemRef.current.registerVirtualInstrument(channel, newInstrument);
        }
        
        // Update channel state
        setChannelStates(prev => prev.map((ch, index) => 
            index === channel ? { ...ch, instrument: instrumentType } : ch
        ));
    }, [virtualInstruments, audioContext]);
    
    // Render devices tab
    const renderDevicesTab = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Input Devices */}
                <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">📥 MIDI Inputs</h4>
                    <div className="space-y-2">
                        {connectedDevices.filter(d => d.type === 'input').map(device => (
                            <div key={device.device.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                <div>
                                    <div className="text-white text-sm font-medium">{device.name}</div>
                                    <div className="text-gray-400 text-xs">{device.manufacturer}</div>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${
                                    device.state === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                            </div>
                        ))}
                        {connectedDevices.filter(d => d.type === 'input').length === 0 && (
                            <div className="text-gray-400 text-sm text-center py-4">
                                No MIDI input devices connected
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Output Devices */}
                <div className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">📤 MIDI Outputs</h4>
                    <div className="space-y-2">
                        {connectedDevices.filter(d => d.type === 'output').map(device => (
                            <div key={device.device.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                <div>
                                    <div className="text-white text-sm font-medium">{device.name}</div>
                                    <div className="text-gray-400 text-xs">{device.manufacturer}</div>
                                </div>
                                <div className={`w-3 h-3 rounded-full ${
                                    device.state === 'connected' ? 'bg-green-500' : 'bg-red-500'
                                }`} />
                            </div>
                        ))}
                        {connectedDevices.filter(d => d.type === 'output').length === 0 && (
                            <div className="text-gray-400 text-sm text-center py-4">
                                No MIDI output devices connected
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* MIDI Activity Monitor */}
            <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">🎹 MIDI Activity</h4>
                <div className="bg-black rounded p-3 h-32 overflow-y-auto font-mono text-xs">
                    {midiActivity.map(activity => (
                        <div key={activity.id} className="text-green-400 mb-1">
                            <span className="text-gray-500">CH{activity.channel}:</span> {activity.message}
                        </div>
                    ))}
                    {midiActivity.length === 0 && (
                        <div className="text-gray-500 text-center">
                            Waiting for MIDI input...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
    
    // Render channels tab
    const renderChannelsTab = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {channelStates.map((channel, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-white font-medium">Channel {channel.channel}</h4>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => {
                                        const newStates = [...channelStates];
                                        newStates[index].mute = !newStates[index].mute;
                                        setChannelStates(newStates);
                                    }}
                                    className={`px-2 py-1 text-xs rounded ${
                                        channel.mute ? 'bg-red-600' : 'bg-gray-600'
                                    }`}
                                >
                                    M
                                </button>
                                <button
                                    onClick={() => {
                                        const newStates = [...channelStates];
                                        newStates[index].solo = !newStates[index].solo;
                                        setChannelStates(newStates);
                                    }}
                                    className={`px-2 py-1 text-xs rounded ${
                                        channel.solo ? 'bg-yellow-600' : 'bg-gray-600'
                                    }`}
                                >
                                    S
                                </button>
                            </div>
                        </div>
                        
                        {/* Instrument Selection */}
                        <div className="mb-3">
                            <label className="block text-gray-400 text-xs mb-1">Instrument</label>
                            <select
                                value={channel.instrument}
                                onChange={(e) => setChannelInstrument(index, e.target.value)}
                                className="w-full bg-gray-700 text-white text-sm rounded px-2 py-1"
                            >
                                <option value="none">None</option>
                                <option value="analogSynth">Analog Synthesizer</option>
                                <option value="drumMachine">Drum Machine</option>
                            </select>
                        </div>
                        
                        {/* Channel Controls */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                    Volume: {Math.round((channel.volume / 127) * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="127"
                                    value={channel.volume}
                                    onChange={(e) => {
                                        const newStates = [...channelStates];
                                        newStates[index].volume = parseInt(e.target.value);
                                        setChannelStates(newStates);
                                    }}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-gray-400 text-xs mb-1">
                                    Pan: {channel.pan === 64 ? 'C' : channel.pan < 64 ? `L${64 - channel.pan}` : `R${channel.pan - 64}`}
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="127"
                                    value={channel.pan}
                                    onChange={(e) => {
                                        const newStates = [...channelStates];
                                        newStates[index].pan = parseInt(e.target.value);
                                        setChannelStates(newStates);
                                    }}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        {/* Active Notes */}
                        {channel.activeNotes.length > 0 && (
                            <div className="mt-3 p-2 bg-gray-900 rounded">
                                <div className="text-gray-400 text-xs mb-1">Active Notes:</div>
                                <div className="flex flex-wrap gap-1">
                                    {channel.activeNotes.map((note, i) => (
                                        <span key={i} className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                                            {noteNumberToName(note)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
    
    // Render automation tab
    const renderAutomationTab = () => (
        <div className="space-y-4">
            {/* Recording Controls */}
            <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">🎛️ Automation Recording</h4>
                
                <div className="flex items-center space-x-3 mb-4">
                    <button
                        onClick={() => isRecordingAutomation ? stopAutomationRecording() : startAutomationRecording()}
                        className={`px-4 py-2 rounded font-medium ${
                            isRecordingAutomation 
                                ? 'bg-red-600 hover:bg-red-700' 
                                : 'bg-green-600 hover:bg-green-700'
                        }`}
                    >
                        {isRecordingAutomation ? '⏹️ Stop Recording' : '⏺️ Start Recording'}
                    </button>
                    
                    {isRecordingAutomation && (
                        <div className="flex items-center space-x-2 text-red-400">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm">Recording automation...</span>
                        </div>
                    )}
                </div>
                
                {currentAutomationTarget && (
                    <div className="bg-gray-900 rounded p-3 mb-4">
                        <div className="text-gray-400 text-sm">Recording target:</div>
                        <div className="text-white font-medium">{currentAutomationTarget.name}</div>
                    </div>
                )}
            </div>
            
            {/* MIDI Learn */}
            <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-3">🎯 MIDI Learn</h4>
                
                {isLearningMode && learningParameter ? (
                    <div className="bg-blue-900 border border-blue-600 rounded p-3 mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-blue-200 text-sm">Learning mode active</div>
                                <div className="text-white font-medium">Move a MIDI controller for: {learningParameter.name}</div>
                            </div>
                            <button
                                onClick={cancelMIDILearn}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => startMIDILearn({
                            name: 'Test Parameter',
                            min: 0,
                            max: 1,
                            callback: (value) => console.log('Test parameter:', value)
                        })}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Start MIDI Learn
                    </button>
                )}
                
                {/* Current Mappings */}
                {midiMappings.length > 0 && (
                    <div className="mt-4">
                        <h5 className="text-gray-400 text-sm mb-2">Active Mappings:</h5>
                        <div className="space-y-2">
                            {midiMappings.map(mapping => (
                                <div key={mapping.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                                    <div className="text-sm">
                                        <span className="text-white">CH{mapping.channel + 1} CC{mapping.controller}</span>
                                        <span className="text-gray-400 mx-2">→</span>
                                        <span className="text-blue-400">{mapping.parameter.name}</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setMidiMappings(prev => prev.filter(m => m.id !== mapping.id));
                                        }}
                                        className="text-red-400 hover:text-red-300 text-sm"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
    
    if (!isActive) return null;
    
    return (
        <div className="midi-integration-interface bg-gray-900 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">MIDI Integration Suite</h3>
                
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
                    >
                        Advanced
                    </button>
                    
                    <div className={`px-3 py-1 rounded text-sm ${
                        connectedDevices.length > 0 ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                        {connectedDevices.length} Devices
                    </div>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
                {['devices', 'channels', 'automation'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors capitalize ${
                            activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            
            {/* Tab Content */}
            <div>
                {activeTab === 'devices' && renderDevicesTab()}
                {activeTab === 'channels' && renderChannelsTab()}
                {activeTab === 'automation' && renderAutomationTab()}
            </div>
        </div>
    );
};

export default MIDIIntegrationInterface;