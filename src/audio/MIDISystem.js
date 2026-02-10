/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: MIDISystem.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional MIDI System
 * Comprehensive MIDI integration for controllers, automation, and virtual instruments
 */

export class MIDISystem {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.midiAccess = null;
        this.connectedDevices = new Map();
        this.midiEventListeners = new Map();
        this.automationRecording = false;
        this.recordedAutomation = [];
        this.virtualInstruments = new Map();
        this.midiChannels = Array(16).fill(null).map((_, i) => ({
            channel: i + 1,
            program: 0,
            volume: 127,
            pan: 64,
            pitchBend: 8192,
            modWheel: 0,
            sustain: false,
            notes: new Map() // Active notes
        }));
        
        // MIDI CC mapping for common controllers
        this.ccMappings = new Map([
            [1, 'modWheel'],
            [7, 'volume'],
            [10, 'pan'],
            [11, 'expression'],
            [64, 'sustain'],
            [74, 'cutoff'],
            [71, 'resonance'],
            [73, 'attack'],
            [72, 'release'],
            [91, 'reverb'],
            [93, 'chorus']
        ]);
        
        // Parameter automation targets
        this.automationTargets = new Map();
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // Request MIDI access
            this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            
            // Set up event listeners
            this.midiAccess.addEventListener('statechange', this.handleStateChange.bind(this));
            
            // Initialize connected devices
            this.scanDevices();
            
            console.log('MIDI System initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize MIDI system:', error);
            throw error;
        }
    }
    
    scanDevices() {
        // Clear existing devices
        this.connectedDevices.clear();
        
        // Scan inputs
        for (const input of this.midiAccess.inputs.values()) {
            this.connectedDevices.set(input.id, {
                device: input,
                type: 'input',
                name: input.name,
                manufacturer: input.manufacturer,
                state: input.state
            });
            
            // Set up message handler
            input.addEventListener('midimessage', this.handleMIDIMessage.bind(this));
            
            console.log(`MIDI Input connected: ${input.name}`);
        }
        
        // Scan outputs
        for (const output of this.midiAccess.outputs.values()) {
            this.connectedDevices.set(output.id, {
                device: output,
                type: 'output',
                name: output.name,
                manufacturer: output.manufacturer,
                state: output.state
            });
            
            console.log(`MIDI Output connected: ${output.name}`);
        }
        
        // Notify listeners of device changes
        this.notifyDeviceChange();
    }
    
    handleStateChange(event) {
        console.log('MIDI device state changed:', event.port.name, event.port.state);
        this.scanDevices();
    }
    
    handleMIDIMessage(event) {
        const [status, data1, data2] = event.data;
        const messageType = status & 0xF0;
        const channel = status & 0x0F;
        
        const midiEvent = {
            type: this.getMIDIMessageType(messageType),
            channel,
            data1,
            data2,
            timestamp: event.timeStamp,
            rawData: event.data
        };
        
        // Process different MIDI message types
        switch (messageType) {
            case 0x90: // Note On
                if (data2 > 0) {
                    this.handleNoteOn(channel, data1, data2, event.timeStamp);
                } else {
                    this.handleNoteOff(channel, data1, 0, event.timeStamp);
                }
                break;
                
            case 0x80: // Note Off
                this.handleNoteOff(channel, data1, data2, event.timeStamp);
                break;
                
            case 0xB0: // Control Change
                this.handleControlChange(channel, data1, data2, event.timeStamp);
                break;
                
            case 0xC0: // Program Change
                this.handleProgramChange(channel, data1, event.timeStamp);
                break;
                
            case 0xE0: // Pitch Bend
                this.handlePitchBend(channel, (data2 << 7) | data1, event.timeStamp);
                break;
                
            case 0xA0: // Aftertouch
                this.handleAftertouch(channel, data1, data2, event.timeStamp);
                break;
        }
        
        // Record automation if enabled
        if (this.automationRecording) {
            this.recordAutomationEvent(midiEvent);
        }
        
        // Notify listeners
        this.notifyMIDIEvent(midiEvent);
    }
    
    getMIDIMessageType(messageType) {
        const types = {
            0x80: 'noteOff',
            0x90: 'noteOn',
            0xA0: 'aftertouch',
            0xB0: 'controlChange',
            0xC0: 'programChange',
            0xD0: 'channelPressure',
            0xE0: 'pitchBend',
            0xF0: 'systemExclusive'
        };
        return types[messageType] || 'unknown';
    }
    
    handleNoteOn(channel, note, velocity, timestamp) {
        const channelData = this.midiChannels[channel];
        
        // Store active note
        channelData.notes.set(note, {
            velocity,
            timestamp,
            noteOffVelocity: null
        });
        
        // Trigger virtual instruments
        this.triggerVirtualInstrument(channel, note, velocity, true);
        
        console.log(`Note On: Channel ${channel + 1}, Note ${note}, Velocity ${velocity}`);
    }
    
    handleNoteOff(channel, note, velocity, timestamp) {
        const channelData = this.midiChannels[channel];
        
        // Update note data
        if (channelData.notes.has(note)) {
            const noteData = channelData.notes.get(note);
            noteData.noteOffVelocity = velocity;
            noteData.duration = timestamp - noteData.timestamp;
        }
        
        // Remove from active notes
        channelData.notes.delete(note);
        
        // Trigger virtual instruments
        this.triggerVirtualInstrument(channel, note, velocity, false);
        
        console.log(`Note Off: Channel ${channel + 1}, Note ${note}, Velocity ${velocity}`);
    }
    
    handleControlChange(channel, controller, value, timestamp) {
        const channelData = this.midiChannels[channel];
        const ccName = this.ccMappings.get(controller);
        
        // Update channel state
        if (ccName) {
            if (ccName === 'sustain') {
                channelData[ccName] = value >= 64;
            } else {
                channelData[ccName] = value;
            }
        }
        
        // Handle automation mapping
        this.handleAutomationMapping(channel, controller, value, timestamp);
        
        console.log(`CC: Channel ${channel + 1}, Controller ${controller} (${ccName || 'Unknown'}), Value ${value}`);
    }
    
    handleProgramChange(channel, program, timestamp) {
        this.midiChannels[channel].program = program;
        console.log(`Program Change: Channel ${channel + 1}, Program ${program}`);
    }
    
    handlePitchBend(channel, value, timestamp) {
        this.midiChannels[channel].pitchBend = value;
        
        // Apply pitch bend to virtual instruments
        this.applyPitchBendToInstruments(channel, value);
        
        console.log(`Pitch Bend: Channel ${channel + 1}, Value ${value}`);
    }
    
    handleAftertouch(channel, note, pressure, timestamp) {
        console.log(`Aftertouch: Channel ${channel + 1}, Note ${note}, Pressure ${pressure}`);
    }
    
    // Automation System
    startAutomationRecording(targetParameter = null) {
        this.automationRecording = true;
        this.recordedAutomation = [];
        this.automationStartTime = this.audioContext.currentTime;
        
        if (targetParameter) {
            this.currentAutomationTarget = targetParameter;
        }
        
        console.log('Started MIDI automation recording');
    }
    
    stopAutomationRecording() {
        this.automationRecording = false;
        const recording = [...this.recordedAutomation];
        this.recordedAutomation = [];
        
        console.log('Stopped MIDI automation recording, recorded', recording.length, 'events');
        return recording;
    }
    
    recordAutomationEvent(midiEvent) {
        const audioTime = this.audioContext.currentTime - this.automationStartTime;
        
        this.recordedAutomation.push({
            ...midiEvent,
            audioTime,
            targetParameter: this.currentAutomationTarget
        });
    }
    
    mapControllerToParameter(channel, controller, targetParameter) {
        const key = `${channel}_${controller}`;
        this.automationTargets.set(key, targetParameter);
        
        console.log(`Mapped CC ${controller} on channel ${channel + 1} to parameter:`, targetParameter);
    }
    
    handleAutomationMapping(channel, controller, value, timestamp) {
        const key = `${channel}_${controller}`;
        const target = this.automationTargets.get(key);
        
        if (target && target.callback) {
            // Normalize MIDI value (0-127) to parameter range
            const normalizedValue = value / 127;
            const parameterValue = target.min + (normalizedValue * (target.max - target.min));
            
            // Apply the parameter change
            target.callback(parameterValue);
            
            console.log(`Automation: ${target.name} = ${parameterValue.toFixed(3)}`);
        }
    }
    
    // Virtual Instruments
    registerVirtualInstrument(channel, instrument) {
        this.virtualInstruments.set(channel, instrument);
        console.log(`Registered virtual instrument on channel ${channel + 1}:`, instrument.name);
    }
    
    triggerVirtualInstrument(channel, note, velocity, isNoteOn) {
        const instrument = this.virtualInstruments.get(channel);
        
        if (instrument) {
            if (isNoteOn) {
                instrument.noteOn(note, velocity);
            } else {
                instrument.noteOff(note, velocity);
            }
        }
    }
    
    applyPitchBendToInstruments(channel, pitchBendValue) {
        const instrument = this.virtualInstruments.get(channel);
        
        if (instrument && instrument.setPitchBend) {
            // Convert MIDI pitch bend (0-16383) to semitones (-2 to +2)
            const semitones = ((pitchBendValue - 8192) / 8192) * 2;
            instrument.setPitchBend(semitones);
        }
    }
    
    // MIDI Output
    sendMIDIMessage(deviceId, data) {
        const device = this.connectedDevices.get(deviceId);
        
        if (device && device.type === 'output' && device.device.state === 'connected') {
            device.device.send(data);
            return true;
        }
        
        return false;
    }
    
    sendNoteOn(deviceId, channel, note, velocity) {
        const status = 0x90 | (channel & 0x0F);
        this.sendMIDIMessage(deviceId, [status, note, velocity]);
    }
    
    sendNoteOff(deviceId, channel, note, velocity = 0) {
        const status = 0x80 | (channel & 0x0F);
        this.sendMIDIMessage(deviceId, [status, note, velocity]);
    }
    
    sendControlChange(deviceId, channel, controller, value) {
        const status = 0xB0 | (channel & 0x0F);
        this.sendMIDIMessage(deviceId, [status, controller, value]);
    }
    
    // Event System
    addEventListener(eventType, callback) {
        if (!this.midiEventListeners.has(eventType)) {
            this.midiEventListeners.set(eventType, []);
        }
        this.midiEventListeners.get(eventType).push(callback);
    }
    
    removeEventListener(eventType, callback) {
        const listeners = this.midiEventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    notifyMIDIEvent(midiEvent) {
        const listeners = this.midiEventListeners.get('midimessage') || [];
        listeners.forEach(callback => callback(midiEvent));
        
        // Also notify specific event type listeners
        const typeListeners = this.midiEventListeners.get(midiEvent.type) || [];
        typeListeners.forEach(callback => callback(midiEvent));
    }
    
    notifyDeviceChange() {
        const listeners = this.midiEventListeners.get('devicechange') || [];
        const devices = Array.from(this.connectedDevices.values());
        listeners.forEach(callback => callback(devices));
    }
    
    // Utility Methods
    getConnectedDevices() {
        return Array.from(this.connectedDevices.values());
    }
    
    getInputDevices() {
        return Array.from(this.connectedDevices.values()).filter(device => device.type === 'input');
    }
    
    getOutputDevices() {
        return Array.from(this.connectedDevices.values()).filter(device => device.type === 'output');
    }
    
    getChannelState(channel) {
        return { ...this.midiChannels[channel] };
    }
    
    getAllChannelStates() {
        return this.midiChannels.map(channel => ({ ...channel }));
    }
    
    noteNumberToName(noteNumber) {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(noteNumber / 12) - 1;
        const note = noteNames[noteNumber % 12];
        return `${note}${octave}`;
    }
    
    noteNameToNumber(noteName) {
        const noteMap = { 'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11 };
        const match = noteName.match(/([A-G]#?)(-?\d+)/);
        if (match) {
            const note = noteMap[match[1]];
            const octave = parseInt(match[2]);
            return (octave + 1) * 12 + note;
        }
        return 60; // Default to middle C
    }
    
    // Cleanup
    disconnect() {
        if (this.midiAccess) {
            for (const input of this.midiAccess.inputs.values()) {
                input.removeEventListener('midimessage', this.handleMIDIMessage.bind(this));
            }
            this.midiAccess.removeEventListener('statechange', this.handleStateChange.bind(this));
        }
        
        this.connectedDevices.clear();
        this.midiEventListeners.clear();
        this.virtualInstruments.clear();
        this.automationTargets.clear();
        
        console.log('MIDI System disconnected');
    }
}

export default MIDISystem;
