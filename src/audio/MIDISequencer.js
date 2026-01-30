/**
 * Professional MIDI Sequencer
 * Advanced MIDI editing and sequencing capabilities
 */

export class MIDISequencer {
    constructor(audioContext, midiSystem) {
        this.audioContext = audioContext;
        this.midiSystem = midiSystem;
        this.tracks = [];
        this.isPlaying = false;
        this.isRecording = false;
        this.currentTime = 0;
        this.tempo = 120; // BPM
        this.timeSignature = { numerator: 4, denominator: 4 };
        this.quantization = 16; // 16th notes
        this.swing = 0; // 0-100%
        this.metronomeEnabled = false;
        
        // Playback state
        this.startTime = 0;
        this.pauseTime = 0;
        this.loopStart = 0;
        this.loopEnd = 0;
        this.loopEnabled = false;
        
        // Recording state
        this.recordingTrack = null;
        this.recordedEvents = [];
        this.countInBars = 1;
        
        // Timing
        this.ticksPerQuarter = 480;
        this.schedulerInterval = null;
        this.lookahead = 25.0; // milliseconds
        this.scheduleAheadTime = 0.1; // seconds
        
        // Event listeners
        this.eventListeners = new Map();
        
        this.initialize();
    }
    
    initialize() {
        // Set up scheduler
        this.setupScheduler();
        
        // Set up MIDI event recording
        if (this.midiSystem) {
            this.setupMIDIRecording();
        }
        
        console.log('MIDI Sequencer initialized');
    }
    
    setupScheduler() {
        this.schedulerInterval = setInterval(() => {
            this.scheduler();
        }, this.lookahead);
    }
    
    setupMIDIRecording() {
        this.midiSystem.addEventListener('midimessage', (midiEvent) => {
            if (this.isRecording && this.recordingTrack !== null) {
                this.recordMIDIEvent(midiEvent);
            }
        });
    }
    
    // Transport controls
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.startTime = this.audioContext.currentTime - this.pauseTime;
        
        this.notifyListeners('play', { time: this.currentTime });
        console.log('Sequencer started');
    }
    
    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        this.pauseTime = this.audioContext.currentTime - this.startTime;
        
        this.notifyListeners('pause', { time: this.currentTime });
        console.log('Sequencer paused');
    }
    
    stop() {
        this.isPlaying = false;
        this.pauseTime = 0;
        this.currentTime = 0;
        this.startTime = 0;
        
        // Stop all MIDI notes
        this.allNotesOff();
        
        this.notifyListeners('stop', { time: this.currentTime });
        console.log('Sequencer stopped');
    }
    
    record(trackIndex = null) {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordingTrack = trackIndex;
        this.recordedEvents = [];
        
        // Start playback if not already playing
        if (!this.isPlaying) {
            this.play();
        }
        
        this.notifyListeners('recordStart', { track: trackIndex });
        console.log('Recording started on track:', trackIndex);
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        
        // Add recorded events to track
        if (this.recordingTrack !== null && this.recordedEvents.length > 0) {
            this.addEventsToTrack(this.recordingTrack, this.recordedEvents);
        }
        
        const recordedData = [...this.recordedEvents];
        this.recordedEvents = [];
        this.recordingTrack = null;
        
        this.notifyListeners('recordStop', { events: recordedData });
        console.log('Recording stopped, recorded', recordedData.length, 'events');
        
        return recordedData;
    }
    
    // Scheduler
    scheduler() {
        if (!this.isPlaying) return;
        
        const currentAudioTime = this.audioContext.currentTime;
        this.currentTime = currentAudioTime - this.startTime;
        
        // Check for loop
        if (this.loopEnabled && this.currentTime >= this.loopEnd) {
            this.currentTime = this.loopStart;
            this.startTime = currentAudioTime - this.loopStart;
        }
        
        // Schedule events
        const scheduleTime = this.currentTime + this.scheduleAheadTime;
        this.scheduleEventsInRange(this.currentTime, scheduleTime);
        
        // Update listeners
        this.notifyListeners('timeUpdate', { 
            time: this.currentTime,
            audioTime: currentAudioTime
        });
    }
    
    scheduleEventsInRange(startTime, endTime) {
        for (const track of this.tracks) {
            if (!track.enabled || track.muted) continue;
            
            for (const event of track.events) {
                if (event.time >= startTime && event.time < endTime && !event.scheduled) {
                    this.scheduleEvent(event);
                    event.scheduled = true;
                }
            }
        }
    }
    
    scheduleEvent(event) {
        const audioTime = this.startTime + event.time;
        
        switch (event.type) {
            case 'noteOn':
                this.scheduleNoteOn(event, audioTime);
                break;
            case 'noteOff':
                this.scheduleNoteOff(event, audioTime);
                break;
            case 'controlChange':
                this.scheduleControlChange(event, audioTime);
                break;
            case 'programChange':
                this.scheduleProgramChange(event, audioTime);
                break;
        }
    }
    
    scheduleNoteOn(event, audioTime) {
        // Schedule through MIDI system if available
        if (this.midiSystem) {
            const instrument = this.midiSystem.virtualInstruments.get(event.channel);
            if (instrument) {
                setTimeout(() => {
                    instrument.noteOn(event.note, event.velocity);
                }, (audioTime - this.audioContext.currentTime) * 1000);
            }
        }
        
        console.log(`Scheduled Note On: ${event.note} at ${audioTime}`);
    }
    
    scheduleNoteOff(event, audioTime) {
        if (this.midiSystem) {
            const instrument = this.midiSystem.virtualInstruments.get(event.channel);
            if (instrument) {
                setTimeout(() => {
                    instrument.noteOff(event.note, event.velocity);
                }, (audioTime - this.audioContext.currentTime) * 1000);
            }
        }
        
        console.log(`Scheduled Note Off: ${event.note} at ${audioTime}`);
    }
    
    scheduleControlChange(event, audioTime) {
        // Handle CC events
        console.log(`Scheduled CC: ${event.controller} = ${event.value} at ${audioTime}`);
    }
    
    scheduleProgramChange(event, audioTime) {
        // Handle program change
        console.log(`Scheduled Program Change: ${event.program} at ${audioTime}`);
    }
    
    // Track management
    createTrack(name = 'New Track') {
        const track = {
            id: Date.now() + Math.random(),
            name,
            events: [],
            enabled: true,
            muted: false,
            soloed: false,
            channel: this.tracks.length,
            instrument: null,
            volume: 127,
            pan: 64
        };
        
        this.tracks.push(track);
        this.notifyListeners('trackCreated', { track });
        
        return track;
    }
    
    deleteTrack(trackIndex) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks.splice(trackIndex, 1)[0];
            this.notifyListeners('trackDeleted', { track, index: trackIndex });
        }
    }
    
    addEventsToTrack(trackIndex, events) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            track.events.push(...events);
            
            // Sort events by time
            track.events.sort((a, b) => a.time - b.time);
            
            this.notifyListeners('eventsAdded', { track, events });
        }
    }
    
    removeEventsFromTrack(trackIndex, eventIds) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            track.events = track.events.filter(event => !eventIds.includes(event.id));
            
            this.notifyListeners('eventsRemoved', { track, eventIds });
        }
    }
    
    // MIDI recording
    recordMIDIEvent(midiEvent) {
        const sequencerTime = this.currentTime;
        
        const event = {
            id: Date.now() + Math.random(),
            time: sequencerTime,
            type: midiEvent.type,
            channel: midiEvent.channel,
            note: midiEvent.data1,
            velocity: midiEvent.data2,
            controller: midiEvent.data1,
            value: midiEvent.data2,
            program: midiEvent.data1,
            scheduled: false
        };
        
        // Apply quantization if enabled
        if (this.quantization > 0) {
            event.time = this.quantizeTime(event.time);
        }
        
        this.recordedEvents.push(event);
        
        console.log('Recorded MIDI event:', event);
    }
    
    quantizeTime(time) {
        const beatDuration = 60.0 / this.tempo;
        const quantizeDuration = beatDuration / (this.quantization / 4);
        
        return Math.round(time / quantizeDuration) * quantizeDuration;
    }
    
    // Editing functions
    quantizeTrack(trackIndex, quantization = this.quantization) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            
            track.events.forEach(event => {
                event.time = this.quantizeTime(event.time);
                event.scheduled = false; // Mark for rescheduling
            });
            
            // Sort events after quantization
            track.events.sort((a, b) => a.time - b.time);
            
            this.notifyListeners('trackQuantized', { track, quantization });
        }
    }
    
    transposeTrack(trackIndex, semitones) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            
            track.events.forEach(event => {
                if (event.type === 'noteOn' || event.type === 'noteOff') {
                    event.note = Math.max(0, Math.min(127, event.note + semitones));
                    event.scheduled = false;
                }
            });
            
            this.notifyListeners('trackTransposed', { track, semitones });
        }
    }
    
    scaleVelocity(trackIndex, scale) {
        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            const track = this.tracks[trackIndex];
            
            track.events.forEach(event => {
                if (event.type === 'noteOn') {
                    event.velocity = Math.max(1, Math.min(127, Math.round(event.velocity * scale)));
                    event.scheduled = false;
                }
            });
            
            this.notifyListeners('velocityScaled', { track, scale });
        }
    }
    
    // Utility functions
    allNotesOff() {
        if (this.midiSystem) {
            for (const [channel, instrument] of this.midiSystem.virtualInstruments) {
                instrument.allNotesOff();
            }
        }
    }
    
    setTempo(bpm) {
        this.tempo = Math.max(30, Math.min(300, bpm));
        this.notifyListeners('tempoChanged', { tempo: this.tempo });
    }
    
    setTimeSignature(numerator, denominator) {
        this.timeSignature = { numerator, denominator };
        this.notifyListeners('timeSignatureChanged', { timeSignature: this.timeSignature });
    }
    
    setLoop(start, end) {
        this.loopStart = start;
        this.loopEnd = end;
        this.notifyListeners('loopChanged', { start, end });
    }
    
    enableLoop(enabled) {
        this.loopEnabled = enabled;
        this.notifyListeners('loopEnabled', { enabled });
    }
    
    // Event system
    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }
    
    removeEventListener(eventType, callback) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    notifyListeners(eventType, data) {
        const listeners = this.eventListeners.get(eventType) || [];
        listeners.forEach(callback => callback(data));
    }
    
    // Project management
    exportProject() {
        return {
            tempo: this.tempo,
            timeSignature: this.timeSignature,
            tracks: this.tracks.map(track => ({
                ...track,
                events: track.events.map(event => ({ ...event }))
            }))
        };
    }
    
    importProject(projectData) {
        this.stop();
        
        this.tempo = projectData.tempo || 120;
        this.timeSignature = projectData.timeSignature || { numerator: 4, denominator: 4 };
        this.tracks = projectData.tracks || [];
        
        // Reset scheduled flags
        this.tracks.forEach(track => {
            track.events.forEach(event => {
                event.scheduled = false;
            });
        });
        
        this.notifyListeners('projectImported', { project: projectData });
    }
    
    // Cleanup
    destroy() {
        this.stop();
        
        if (this.schedulerInterval) {
            clearInterval(this.schedulerInterval);
        }
        
        this.eventListeners.clear();
        this.tracks = [];
        
        console.log('MIDI Sequencer destroyed');
    }
}

export default MIDISequencer;