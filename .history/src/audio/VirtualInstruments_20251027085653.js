/**
 * Professional Virtual Instrument Engine
 * Advanced synthesizer and sampler engine for MIDI integration
 */

export class VirtualInstrument {
    constructor(audioContext, name = 'Virtual Instrument') {
        this.audioContext = audioContext;
        this.name = name;
        this.voices = [];
        this.maxPolyphony = 32;
        this.masterVolume = 1.0;
        this.masterPan = 0;
        this.pitchBend = 0; // In semitones
        this.pitchBendRange = 2; // ±2 semitones
        
        // Master output nodes
        this.masterGain = audioContext.createGain();
        this.masterPanner = audioContext.createStereoPanner();
        
        // Connect master chain
        this.masterGain.connect(this.masterPanner);
        this.output = this.masterPanner;
        
        // Set initial values
        this.masterGain.gain.value = this.masterVolume;
        this.masterPanner.pan.value = this.masterPan;
    }
    
    connect(destination) {
        this.output.connect(destination);
        return this;
    }
    
    disconnect() {
        this.output.disconnect();
        return this;
    }
    
    noteOn(note, velocity) {
        // Find available voice or steal oldest
        let voice = this.findAvailableVoice();
        if (!voice) {
            voice = this.stealVoice();
        }
        
        if (voice) {
            voice.noteOn(note, velocity, this.pitchBend);
        }
    }
    
    noteOff(note, velocity = 0) {
        // Find active voice for this note
        const voice = this.voices.find(v => v.isActive && v.note === note);
        if (voice) {
            voice.noteOff(velocity);
        }
    }
    
    findAvailableVoice() {
        return this.voices.find(voice => !voice.isActive);
    }
    
    stealVoice() {
        // Find oldest voice in release phase, or oldest active voice
        let oldestVoice = null;
        let oldestTime = Infinity;
        
        for (const voice of this.voices) {
            if (voice.isInRelease && voice.startTime < oldestTime) {
                oldestVoice = voice;
                oldestTime = voice.startTime;
            }
        }
        
        if (!oldestVoice) {
            for (const voice of this.voices) {
                if (voice.startTime < oldestTime) {
                    oldestVoice = voice;
                    oldestTime = voice.startTime;
                }
            }
        }
        
        if (oldestVoice) {
            oldestVoice.stop();
        }
        
        return oldestVoice;
    }
    
    setPitchBend(semitones) {
        this.pitchBend = Math.max(-this.pitchBendRange, Math.min(this.pitchBendRange, semitones));
        
        // Apply to all active voices
        this.voices.forEach(voice => {
            if (voice.isActive) {
                voice.setPitchBend(this.pitchBend);
            }
        });
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.setTargetAtTime(this.masterVolume, this.audioContext.currentTime, 0.01);
    }
    
    setMasterPan(pan) {
        this.masterPan = Math.max(-1, Math.min(1, pan));
        this.masterPanner.pan.setTargetAtTime(this.masterPan, this.audioContext.currentTime, 0.01);
    }
    
    allNotesOff() {
        this.voices.forEach(voice => {
            if (voice.isActive) {
                voice.noteOff(0);
            }
        });
    }
    
    allSoundOff() {
        this.voices.forEach(voice => voice.stop());
    }
}

export class SynthVoice {
    constructor(audioContext, instrument) {
        this.audioContext = audioContext;
        this.instrument = instrument;
        this.isActive = false;
        this.isInRelease = false;
        this.note = 0;
        this.velocity = 0;
        this.startTime = 0;
        
        // Oscillators
        this.oscillators = [];
        this.filters = [];
        this.envelopes = {};
        
        // Voice output
        this.voiceGain = audioContext.createGain();
        this.voiceGain.gain.value = 0;
        this.voiceGain.connect(instrument.masterGain);
    }
    
    noteOn(note, velocity, pitchBend = 0) {
        this.cleanup();
        
        this.note = note;
        this.velocity = velocity;
        this.isActive = true;
        this.isInRelease = false;
        this.startTime = this.audioContext.currentTime;
        
        // Create synthesis chain
        this.createSynthChain(note, velocity, pitchBend);
        
        // Trigger envelopes
        this.triggerEnvelopes();
    }
    
    noteOff(velocity = 0) {
        if (!this.isActive) return;
        
        this.isInRelease = true;
        
        // Trigger release phase of envelopes
        this.releaseEnvelopes();
    }
    
    stop() {
        this.cleanup();
        this.isActive = false;
        this.isInRelease = false;
    }
    
    createSynthChain(note, velocity, pitchBend) {
        // Override in subclasses
    }
    
    triggerEnvelopes() {
        // Override in subclasses
    }
    
    releaseEnvelopes() {
        // Override in subclasses
    }
    
    setPitchBend(semitones) {
        // Apply pitch bend to oscillators
        const bendRatio = Math.pow(2, semitones / 12);
        this.oscillators.forEach(osc => {
            if (osc.frequency) {
                const baseFreq = this.noteToFrequency(this.note);
                osc.frequency.setTargetAtTime(baseFreq * bendRatio, this.audioContext.currentTime, 0.01);
            }
        });
    }
    
    noteToFrequency(note) {
        return 440 * Math.pow(2, (note - 69) / 12);
    }
    
    cleanup() {
        // Stop and disconnect all nodes
        this.oscillators.forEach(osc => {
            try {
                osc.stop();
                osc.disconnect();
            } catch (e) {
                // Node may already be stopped
            }
        });
        
        this.filters.forEach(filter => {
            try {
                filter.disconnect();
            } catch (e) {
                // Node may already be disconnected
            }
        });
        
        // Clear arrays
        this.oscillators = [];
        this.filters = [];
        this.envelopes = {};
    }
}

export class AnalogSynth extends VirtualInstrument {
    constructor(audioContext) {
        super(audioContext, 'Analog Synthesizer');
        
        // Initialize voices
        for (let i = 0; i < this.maxPolyphony; i++) {
            this.voices.push(new AnalogSynthVoice(audioContext, this));
        }
        
        // Synth parameters
        this.parameters = {
            // Oscillator 1
            osc1: {
                waveform: 'sawtooth',
                octave: 0,
                semitone: 0,
                cents: 0,
                level: 0.7
            },
            // Oscillator 2
            osc2: {
                waveform: 'square',
                octave: 0,
                semitone: 7, // Fifth
                cents: 0,
                level: 0.5
            },
            // Filter
            filter: {
                type: 'lowpass',
                frequency: 1000,
                resonance: 1,
                envAmount: 0.5
            },
            // Amplitude Envelope
            ampEnv: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.7,
                release: 0.5
            },
            // Filter Envelope
            filterEnv: {
                attack: 0.01,
                decay: 0.3,
                sustain: 0.3,
                release: 0.8
            },
            // LFO
            lfo: {
                rate: 5,
                depth: 0.1,
                target: 'filter' // 'filter', 'osc1', 'osc2', 'amp'
            }
        };
    }
    
    setParameter(section, parameter, value) {
        if (this.parameters[section] && this.parameters[section].hasOwnProperty(parameter)) {
            this.parameters[section][parameter] = value;
            console.log(`AnalogSynth: ${section}.${parameter} = ${value}`);
        }
    }
}

export class AnalogSynthVoice extends SynthVoice {
    createSynthChain(note, velocity, pitchBend) {
        const params = this.instrument.parameters;
        const now = this.audioContext.currentTime;
        
        // Create oscillators
        const osc1 = this.audioContext.createOscillator();
        const osc2 = this.audioContext.createOscillator();
        const osc1Gain = this.audioContext.createGain();
        const osc2Gain = this.audioContext.createGain();
        
        // Configure oscillators
        const baseFreq = this.noteToFrequency(note);
        const bendRatio = Math.pow(2, pitchBend / 12);
        
        // Oscillator 1
        osc1.type = params.osc1.waveform;
        const osc1Freq = baseFreq * bendRatio * Math.pow(2, params.osc1.octave) * Math.pow(2, params.osc1.semitone / 12) * Math.pow(2, params.osc1.cents / 1200);
        osc1.frequency.value = osc1Freq;
        osc1Gain.gain.value = params.osc1.level * (velocity / 127);
        
        // Oscillator 2
        osc2.type = params.osc2.waveform;
        const osc2Freq = baseFreq * bendRatio * Math.pow(2, params.osc2.octave) * Math.pow(2, params.osc2.semitone / 12) * Math.pow(2, params.osc2.cents / 1200);
        osc2.frequency.value = osc2Freq;
        osc2Gain.gain.value = params.osc2.level * (velocity / 127);
        
        // Create filter
        const filter = this.audioContext.createBiquadFilter();
        filter.type = params.filter.type;
        filter.frequency.value = params.filter.frequency;
        filter.Q.value = params.filter.resonance;
        
        // Create mixer
        const mixer = this.audioContext.createGain();
        mixer.gain.value = 1;
        
        // Connect oscillators
        osc1.connect(osc1Gain);
        osc2.connect(osc2Gain);
        osc1Gain.connect(mixer);
        osc2Gain.connect(mixer);
        mixer.connect(filter);
        filter.connect(this.voiceGain);
        
        // Store references
        this.oscillators = [osc1, osc2];
        this.filters = [filter];
        
        // Create LFO if enabled
        if (params.lfo.depth > 0) {
            const lfo = this.audioContext.createOscillator();
            const lfoGain = this.audioContext.createGain();
            
            lfo.type = 'sine';
            lfo.frequency.value = params.lfo.rate;
            lfoGain.gain.value = params.lfo.depth;
            
            lfo.connect(lfoGain);
            
            // Connect LFO to target
            switch (params.lfo.target) {
                case 'filter':
                    lfoGain.connect(filter.frequency);
                    break;
                case 'osc1':
                    lfoGain.connect(osc1.frequency);
                    break;
                case 'osc2':
                    lfoGain.connect(osc2.frequency);
                    break;
                case 'amp':
                    lfoGain.connect(this.voiceGain.gain);
                    break;
            }
            
            lfo.start(now);
            this.oscillators.push(lfo);
        }
        
        // Start oscillators
        osc1.start(now);
        osc2.start(now);
        
        // Set up envelopes
        this.envelopes.amp = {
            gain: this.voiceGain.gain,
            params: params.ampEnv
        };
        
        this.envelopes.filter = {
            target: filter.frequency,
            baseValue: filter.frequency.value,
            params: params.filterEnv,
            amount: params.filter.envAmount
        };
    }
    
    triggerEnvelopes() {
        const now = this.audioContext.currentTime;
        
        // Amplitude envelope
        const ampEnv = this.envelopes.amp;
        if (ampEnv) {
            ampEnv.gain.cancelScheduledValues(now);
            ampEnv.gain.setValueAtTime(0, now);
            ampEnv.gain.linearRampToValueAtTime(this.velocity / 127, now + ampEnv.params.attack);
            ampEnv.gain.linearRampToValueAtTime((this.velocity / 127) * ampEnv.params.sustain, now + ampEnv.params.attack + ampEnv.params.decay);
        }
        
        // Filter envelope
        const filterEnv = this.envelopes.filter;
        if (filterEnv) {
            const envAmount = filterEnv.amount * filterEnv.baseValue;
            filterEnv.target.cancelScheduledValues(now);
            filterEnv.target.setValueAtTime(filterEnv.baseValue, now);
            filterEnv.target.linearRampToValueAtTime(filterEnv.baseValue + envAmount, now + filterEnv.params.attack);
            filterEnv.target.linearRampToValueAtTime(filterEnv.baseValue + (envAmount * filterEnv.params.sustain), now + filterEnv.params.attack + filterEnv.params.decay);
        }
    }
    
    releaseEnvelopes() {
        const now = this.audioContext.currentTime;
        
        // Amplitude envelope release
        const ampEnv = this.envelopes.amp;
        if (ampEnv) {
            ampEnv.gain.cancelScheduledValues(now);
            ampEnv.gain.setValueAtTime(ampEnv.gain.value, now);
            ampEnv.gain.linearRampToValueAtTime(0, now + ampEnv.params.release);
        }
        
        // Filter envelope release
        const filterEnv = this.envelopes.filter;
        if (filterEnv) {
            filterEnv.target.cancelScheduledValues(now);
            filterEnv.target.setValueAtTime(filterEnv.target.value, now);
            filterEnv.target.linearRampToValueAtTime(filterEnv.baseValue, now + filterEnv.params.release);
        }
        
        // Schedule voice cleanup
        setTimeout(() => {
            this.stop();
        }, ampEnv.params.release * 1000 + 100);
    }
}

export class DrumMachine extends VirtualInstrument {
    constructor(audioContext) {
        super(audioContext, 'Drum Machine');
        
        this.maxPolyphony = 16; // Each drum pad is separate
        
        // Initialize drum voices
        for (let i = 0; i < this.maxPolyphony; i++) {
            this.voices.push(new DrumVoice(audioContext, this));
        }
        
        // Drum kit mapping (General MIDI)
        this.drumKit = {
            35: { name: 'Kick', type: 'kick' },
            36: { name: 'Kick', type: 'kick' },
            37: { name: 'Side Stick', type: 'stick' },
            38: { name: 'Snare', type: 'snare' },
            39: { name: 'Hand Clap', type: 'clap' },
            40: { name: 'Snare', type: 'snare' },
            41: { name: 'Low Tom', type: 'tom' },
            42: { name: 'Closed Hi-Hat', type: 'hihat_closed' },
            43: { name: 'Low Tom', type: 'tom' },
            44: { name: 'Pedal Hi-Hat', type: 'hihat_pedal' },
            45: { name: 'Mid Tom', type: 'tom' },
            46: { name: 'Open Hi-Hat', type: 'hihat_open' },
            47: { name: 'High Tom', type: 'tom' },
            48: { name: 'High Tom', type: 'tom' },
            49: { name: 'Crash', type: 'crash' },
            50: { name: 'High Tom', type: 'tom' },
            51: { name: 'Ride', type: 'ride' },
            52: { name: 'Chinese', type: 'china' },
            53: { name: 'Ride Bell', type: 'bell' },
            54: { name: 'Tambourine', type: 'tambourine' },
            55: { name: 'Splash', type: 'splash' },
            56: { name: 'Cowbell', type: 'cowbell' },
            57: { name: 'Crash', type: 'crash' }
        };
    }
    
    noteOn(note, velocity) {
        const drum = this.drumKit[note];
        if (!drum) return;
        
        // Find available drum voice
        let voice = this.voices.find(v => !v.isActive);
        if (!voice) {
            voice = this.voices[0]; // Use first voice if all busy
        }
        
        voice.triggerDrum(drum.type, velocity);
    }
}

export class DrumVoice extends SynthVoice {
    triggerDrum(drumType, velocity) {
        this.cleanup();
        
        this.isActive = true;
        this.velocity = velocity;
        this.startTime = this.audioContext.currentTime;
        
        const now = this.audioContext.currentTime;
        
        switch (drumType) {
            case 'kick':
                this.createKick(velocity);
                break;
            case 'snare':
                this.createSnare(velocity);
                break;
            case 'hihat_closed':
                this.createHiHat(velocity, false);
                break;
            case 'hihat_open':
                this.createHiHat(velocity, true);
                break;
            case 'crash':
                this.createCrash(velocity);
                break;
            default:
                this.createGenericDrum(velocity);
        }
        
        // Auto-cleanup after sound duration
        setTimeout(() => {
            this.stop();
        }, 2000);
    }
    
    createKick(velocity) {
        const now = this.audioContext.currentTime;
        
        // Sine wave for body
        const bodyOsc = this.audioContext.createOscillator();
        const bodyGain = this.audioContext.createGain();
        
        bodyOsc.type = 'sine';
        bodyOsc.frequency.setValueAtTime(60, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(20, now + 0.1);
        
        bodyGain.gain.setValueAtTime(velocity / 127, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        
        bodyOsc.connect(bodyGain);
        bodyGain.connect(this.voiceGain);
        bodyOsc.start(now);
        bodyOsc.stop(now + 0.3);
        
        this.oscillators.push(bodyOsc);
    }
    
    createSnare(velocity) {
        const now = this.audioContext.currentTime;
        
        // White noise for snare
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 200;
        
        noiseGain.gain.setValueAtTime(velocity / 127, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.voiceGain);
        noise.start(now);
        
        this.oscillators.push(noise);
    }
    
    createHiHat(velocity, open) {
        const now = this.audioContext.currentTime;
        const duration = open ? 0.3 : 0.1;
        
        // High frequency noise
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        filter.Q.value = 1;
        
        noiseGain.gain.setValueAtTime(velocity / 127, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.voiceGain);
        noise.start(now);
        
        this.oscillators.push(noise);
    }
    
    createCrash(velocity) {
        const now = this.audioContext.currentTime;
        
        // Metallic noise
        const bufferSize = this.audioContext.sampleRate * 2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.audioContext.createBufferSource();
        const noiseGain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        noise.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.value = 5000;
        filter.Q.value = 0.5;
        
        noiseGain.gain.setValueAtTime(velocity / 127, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2);
        
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.voiceGain);
        noise.start(now);
        
        this.oscillators.push(noise);
    }
    
    createGenericDrum(velocity) {
        // Simple sine wave for generic percussion
        const now = this.audioContext.currentTime;
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        
        gain.gain.setValueAtTime(velocity / 127, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        
        osc.connect(gain);
        gain.connect(this.voiceGain);
        osc.start(now);
        osc.stop(now + 0.2);
        
        this.oscillators.push(osc);
    }
}

export default { VirtualInstrument, AnalogSynth, DrumMachine };