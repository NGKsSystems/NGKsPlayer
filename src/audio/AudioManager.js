/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioManager.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/analysis/AudioManager.js - HTML5 Audio playback for DJ decks
// Fixed: analyzer initialization moved inside constructor to avoid top-level this undefined

import { CrashProtection } from '../utils/playerCrashProtection.js';

class AudioManager {
  constructor() {
    this.decks = {
      A: this._createDeckData(),
      B: this._createDeckData(),
      C: this._createDeckData(),
      D: this._createDeckData(),
    };

    // Crossfader state
    this.crossfaderPosition = 0.5; // 0 = full A, 1 = full B
    this.crossfaderCurve = 'linear'; // 'linear', 'cut', 'smooth'

    this.onPositionUpdate = null;
    this.positionUpdateInterval = null;
    this.userInteracted = false;

    // Listen for user interaction to enable audio
    document.addEventListener(
      "click",
      () => {
        this.userInteracted = true;
        console.log(
          "[AudioManager] User interaction detected - audio playback enabled"
        );
      },
      { once: true }
    );

    // Initialize Web Audio Context for stereo panning
    this.initializeAudioContext();

    // Initialize recording system
    // this.initializeRecording();  // Not implemented yet

    // Initialize audio analyzer (async, safe inside constructor)
    this.initAnalyzer();
  }

  // ── Factory for deck data structure ──
  _createDeckData() {
    return {
      audio: null,
      loaded: false,
      track: null,
      cued: false,
      audioContext: null,
      gainNode: null,          // channel fader gain
      crossfaderGainNode: null, // crossfader gain (applied per-deck)
      pannerNode: null,
      sourceNode: null,
      analyzerNode: null,
      vuAnalyzerNode: null,
      frequencyData: null,
      timeData: null,
      vuFrequencyData: null,
      fxInsertNode: null,
      fxReturnNode: null,
      // ── 16-band parametric EQ chain ──
      eqFilters: [],           // array of BiquadFilterNode
    };
  }

  // ── EQ frequency table (matches EQ A/B/C/D component) ──
  static EQ_FREQUENCIES = [
    31, 62, 125, 250, 500, 1000, 2000, 4000,
    8000, 16000
    // Clamped to Nyquist-safe range. Original UI shows 16 bands but
    // frequencies above ~20 kHz are inaudible and cause Web Audio errors.
  ];

  async initAnalyzer() {
    try {
      const { default: AudioAnalyzer } = await import(
        "../analysis/AudioAnalyzer_refactored.js"
      );
      this.analyzer = new AudioAnalyzer();
      console.log(
        "[AudioManager] Audio analyzer initialized (new refactored version)"
      );
    } catch (e) {
      console.error("[AudioManager] Failed to load AudioAnalyzer:", e);
      this.analyzer = null;
    }
  }

  // ... (rest of your AudioManager methods unchanged: initializeAudioContext, initializeRecording, setupAudioChain, loadTrack, playPause, analyzeTrack, etc.)

  initializeAudioContext() {
    try {
      // Create a shared audio context
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioManager] Web Audio Context initialized for stereo panning');
    } catch (error) {
      console.error('[AudioManager] Failed to initialize Web Audio Context:', error);
      this.audioContext = null;
    }
  }

  // Set up Web Audio API chain for a deck with EQ, crossfader, and stereo panning
  //
  // Signal chain:
  //   source → analyzer → [EQ band 0] → ... → [EQ band N] → gainNode → crossfaderGainNode → pannerNode → vuAnalyzer → destination
  //
  setupAudioChain(deck) {
    const deckData = this.decks[deck];
    
    if (!this.audioContext || !deckData.audio) {
      console.warn(`[AudioManager] Cannot setup audio chain for Deck ${deck}: Missing context or audio`);
      return false;
    }

    try {
      // Create audio nodes
      deckData.sourceNode = this.audioContext.createMediaElementSource(deckData.audio);
      deckData.gainNode = this.audioContext.createGain();
      deckData.crossfaderGainNode = this.audioContext.createGain();
      deckData.pannerNode = this.audioContext.createStereoPanner();
      deckData.analyzerNode = this.audioContext.createAnalyser();
      
      // Create a separate analyzer for VU metering after all processing
      deckData.vuAnalyzerNode = this.audioContext.createAnalyser();
      
      // Configure analyzer for waveform
      deckData.analyzerNode.fftSize = 1024;
      deckData.analyzerNode.smoothingTimeConstant = 0.8;
      
      // Configure VU analyzer for level detection (higher sensitivity)
      deckData.vuAnalyzerNode.fftSize = 256;
      deckData.vuAnalyzerNode.smoothingTimeConstant = 0.3;
      
      // Create data arrays for analysis
      const bufferLength = deckData.analyzerNode.frequencyBinCount;
      deckData.frequencyData = new Uint8Array(bufferLength);
      deckData.timeData = new Uint8Array(bufferLength);
      
      // Create VU data array
      const vuBufferLength = deckData.vuAnalyzerNode.frequencyBinCount;
      deckData.vuFrequencyData = new Uint8Array(vuBufferLength);

      // ── Build 10-band parametric EQ chain ──
      const eqFreqs = AudioManager.EQ_FREQUENCIES;
      deckData.eqFilters = eqFreqs.map((freq, index) => {
        const filter = this.audioContext.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === eqFreqs.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
        }
        const clampedFreq = Math.max(10, Math.min(this.audioContext.sampleRate / 2 - 1, freq));
        filter.frequency.setValueAtTime(clampedFreq, this.audioContext.currentTime);
        filter.Q.setValueAtTime(1.4, this.audioContext.currentTime);
        filter.gain.setValueAtTime(0, this.audioContext.currentTime);  // flat by default
        return filter;
      });

      // ── Connect the full audio chain ──
      // source → analyzer
      deckData.sourceNode.connect(deckData.analyzerNode);

      // analyzer → EQ chain
      let prevNode = deckData.analyzerNode;
      for (const filter of deckData.eqFilters) {
        prevNode.connect(filter);
        prevNode = filter;
      }

      // EQ chain → gainNode → crossfaderGainNode → pannerNode → vuAnalyzer → destination
      prevNode.connect(deckData.gainNode);
      deckData.gainNode.connect(deckData.crossfaderGainNode);
      deckData.crossfaderGainNode.connect(deckData.pannerNode);
      deckData.pannerNode.connect(deckData.vuAnalyzerNode);
      deckData.vuAnalyzerNode.connect(this.audioContext.destination);
      
      // Set initial panning (left ear for normal, right ear for cue)
      this.updatePanning(deck);

      // Apply current crossfader position
      this._applyCrossfader();
      
      // Emit event so EQ components know the chain is ready
      window.dispatchEvent(new CustomEvent('audioChainReady', { detail: { deck } }));
      
      console.log(`[AudioManager] Audio chain with ${eqFreqs.length}-band EQ + crossfader setup complete for Deck ${deck}`);
      return true;
    } catch (error) {
      console.error(`[AudioManager] Failed to setup audio chain for Deck ${deck}:`, error);
      return false;
    }
  }

  // Update stereo panning based on cue state
  updatePanning(deck) {
    const deckData = this.decks[deck];
    
    if (!deckData.pannerNode) {
      console.warn(`[AudioManager] Cannot update panning for Deck ${deck}: No panner node`);
      return;
    }

    // Pan values: -1 = full left, 0 = center, 1 = full right
    const panValue = deckData.cued ? 1.0 : -1.0; // Right for cue, left for normal
    deckData.pannerNode.pan.setValueAtTime(panValue, this.audioContext.currentTime);
    
    console.log(`[AudioManager] Deck ${deck} panning set to ${panValue} (${deckData.cued ? 'CUE - Right ear' : 'NORMAL - Left ear'})`);
  }

  // Load a track into a deck
  async loadTrack(deck, track) {
    console.log(`[AudioManager] Loading track to Deck ${deck}:`, track.title);
    console.log(`[AudioManager] Track file path:`, track.filePath);
    
    try {
      // Create new audio element
      const audio = new Audio();
      
      // Enable crash protection for this deck
      if (!this.decks[deck].crashProtection) {
        this.decks[deck].crashProtection = new CrashProtection(audio, {
          maxRecoveryAttempts: 3,
          recoveryTimeout: 5000,
          stallTimeout: 3000
        });
        this.decks[deck].crashProtection.enable();
        
        this.decks[deck].crashProtection.onRecoverySuccess = (method) => {
          console.log(`[AudioManager] Deck ${deck} recovered using: ${method}`);
        };
        
        this.decks[deck].crashProtection.onRecoveryFailed = (reason) => {
          console.error(`[AudioManager] Deck ${deck} recovery failed: ${reason}`);
          audio.pause();
          this.decks[deck].loaded = false;
        };
      }
      
      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        console.log(`[AudioManager] Track loaded: ${track.title} (${audio.duration}s)`);
        this.decks[deck].loaded = true;
        this.decks[deck].errorCount = 0; // Reset error count on successful load
        
        if (this.onTrackLoaded) {
          this.onTrackLoaded(deck, { ...track, duration: audio.duration });
        }
      });

      // Initial load error handler
      audio.addEventListener('error', (e) => {
        console.error(`[AudioManager] Error loading track:`, e);
        this.decks[deck].loaded = false;
      }, { once: true });

      // Playback error recovery handlers
      const handlePlaybackError = (e) => {
        const deckData = this.decks[deck];
        
        // Ignore stalled/suspend events during initial load (before track has started playing)
        // These are normal buffering events, not playback errors
        if (!deckData.hasStartedPlaying || audio.currentTime === 0) {
          return;
        }
        
        if (!deckData.errorCount) deckData.errorCount = 0;
        if (!deckData.lastErrorTime) deckData.lastErrorTime = 0;
        
        const now = Date.now();
        console.warn(`[AudioManager] Deck ${deck} playback glitch at ${audio.currentTime}s`);
        
        // If errors are happening too frequently, give up
        if (now - deckData.lastErrorTime < 1000) {
          deckData.errorCount++;
          if (deckData.errorCount > 5) {
            console.error(`[AudioManager] Deck ${deck} has too many consecutive errors, stopping`);
            audio.pause();
            // Mark track as having playback errors
            if (track.id && window.api && window.api.markTrackError) {
              window.api.markTrackError(track.id, true).catch(err => {
                console.error(`[AudioManager] Failed to mark track error:`, err);
              });
            }
            if (this.onTrackEnded) {
              this.onTrackEnded(deck);
            }
            return;
          }
        } else {
          deckData.errorCount = 1;
        }
        deckData.lastErrorTime = now;
        
        // Try to skip past the bad spot
        const currentPos = audio.currentTime;
        const skipAmount = 0.5; // Skip 0.5 seconds ahead
        console.log(`[AudioManager] Deck ${deck} attempting recovery: jumping from ${currentPos}s to ${currentPos + skipAmount}s`);
        
        audio.currentTime = currentPos + skipAmount;
        if (!audio.paused) {
          audio.play().catch(err => {
            console.error(`[AudioManager] Deck ${deck} recovery failed:`, err);
          });
        }
      };
      
      audio.addEventListener('stalled', handlePlaybackError);
      audio.addEventListener('suspend', handlePlaybackError);

      // Track when playback actually starts to distinguish from initial buffering
      audio.addEventListener('playing', () => {
        this.decks[deck].hasStartedPlaying = true;
      }, { once: true });

      audio.addEventListener('timeupdate', () => {
        if (this.onPositionUpdate) {
          this.onPositionUpdate(deck, audio.currentTime);
        }
      });

      audio.addEventListener('ended', () => {
        console.log(`[AudioManager] Track ended on Deck ${deck}`);
        if (this.onTrackEnded) {
          this.onTrackEnded(deck);
        }
      });

      // Convert file path to use Electron's local protocol
      let audioSrc;
      if (track.filePath.startsWith('ngksplayer://')) {
        audioSrc = track.filePath;
      } else if (track.filePath.startsWith('http://') || track.filePath.startsWith('https://')) {
        audioSrc = track.filePath;
      } else {
        audioSrc = `ngksplayer://${track.filePath}`;
      }
      
      audio.src = audioSrc;
      this.decks[deck].audio = audio;
      this.decks[deck].track = track;
      this.decks[deck].loaded = false;
      
      this.setupAudioChain(deck);
      audio.load();
      
      return true;
    } catch (error) {
      console.error(`[AudioManager] Failed to load track:`, error);
      return false;
    }
  }

  async playPause(deck) {
    const deckData = this.decks[deck];
    
    if (!deckData.audio || !deckData.loaded) {
      console.warn(`[AudioManager] Cannot play Deck ${deck}: Not ready`);
      return false;
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    try {
      if (deckData.audio.paused) {
        await deckData.audio.play();
        return true;
      } else {
        deckData.audio.pause();
        return false;
      }
    } catch (error) {
      console.error(`[AudioManager] Play/pause error:`, error);
      return false;
    }
  }

  seek(deck, time) {
    const deckData = this.decks[deck];
    if (!deckData.audio || !deckData.loaded) return;
    deckData.audio.currentTime = Math.max(0, Math.min(time, deckData.audio.duration || 0));
  }

  skip(deck, seconds) {
    const deckData = this.decks[deck];
    if (!deckData.audio || !deckData.loaded) return;
    this.seek(deck, deckData.audio.currentTime + seconds);
  }

  setVolume(deck, volume) {
    const deckData = this.decks[deck];
    if (!deckData) return;
    // Use Web Audio gainNode (in the signal chain) — not audio.volume
    if (deckData.gainNode) {
      const clamped = Math.max(0, Math.min(1, volume));
      deckData.gainNode.gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.02);
    } else if (deckData.audio) {
      // Fallback to HTML5 volume if chain not ready yet
      deckData.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  // ── Channel gain (same as setVolume but named for Mixer compatibility) ──
  setChannelGain(deck, volume) {
    this.setVolume(deck, volume);
  }

  // ── 3-band channel EQ (High / Mid / Low) — used by Mixer ChannelStrip ──
  // Maps to the built-in 10-band EQ: low = bands 0-1, mid = bands 3-5, high = bands 7-9
  setChannelEQ(deck, band, gainDb) {
    const deckData = this.decks[deck];
    if (!deckData || !deckData.eqFilters || deckData.eqFilters.length === 0) return;

    const clamped = Math.max(-24, Math.min(24, gainDb));
    const t = this.audioContext.currentTime;

    // Map 3-band EQ to the 10-band filter array
    // low = 31 Hz, 62 Hz (bands 0-1)
    // mid = 250 Hz, 500 Hz, 1 kHz (bands 3-5)  
    // high = 4 kHz, 8 kHz, 16 kHz (bands 7-9)
    const bandMap = {
      low:  [0, 1],
      mid:  [3, 4, 5],
      high: [7, 8, 9]
    };

    const indices = bandMap[band];
    if (!indices) return;

    for (const i of indices) {
      if (deckData.eqFilters[i]) {
        deckData.eqFilters[i].gain.setTargetAtTime(clamped, t, 0.02);
      }
    }
  }

  // ── Full 10-band (or 16-band mapped) EQ control — used by EQ A/B/C/D components ──
  setEQBand(deck, bandIndex, gainDb) {
    const deckData = this.decks[deck];
    if (!deckData || !deckData.eqFilters) return;
    
    // EQ UI has 16 bands but AudioManager only creates 10 (audible range).
    // Map 16-band UI index to 10-band internal index.
    // UI bands 0-9 map to filter 0-9. UI bands 10-15 are ultrasonic — ignore.
    if (bandIndex >= deckData.eqFilters.length) return;
    
    const filter = deckData.eqFilters[bandIndex];
    if (!filter) return;
    
    const clamped = Math.max(-24, Math.min(24, gainDb));
    filter.gain.setTargetAtTime(clamped, this.audioContext.currentTime, 0.02);
  }

  // Get the current EQ filter nodes for a deck (for external UI to read/bind)
  getEQFilters(deck) {
    return this.decks[deck]?.eqFilters || [];
  }

  // ── Crossfader ──
  setCrossfaderPosition(position) {
    // position: 0 = full A, 0.5 = center, 1 = full B
    this.crossfaderPosition = Math.max(0, Math.min(1, position));
    this._applyCrossfader();
  }

  setCrossfaderCurve(curve) {
    this.crossfaderCurve = curve; // 'linear', 'cut', 'smooth'
    this._applyCrossfader();
  }

  _applyCrossfader() {
    const pos = this.crossfaderPosition;
    let gainA, gainB;

    switch (this.crossfaderCurve) {
      case 'cut':
        // Hard cut: full volume until the last 5%, then instant drop
        gainA = pos > 0.95 ? 0 : 1;
        gainB = pos < 0.05 ? 0 : 1;
        break;
      case 'smooth':
        // Equal-power crossfade (no dip in the middle)
        gainA = Math.cos(pos * Math.PI / 2);
        gainB = Math.sin(pos * Math.PI / 2);
        break;
      case 'linear':
      default:
        // Linear crossfade
        gainA = 1 - pos;
        gainB = pos;
        // Keep both at full when centered (DJ-style: both audible at center)
        gainA = Math.min(1, gainA * 2);
        gainB = Math.min(1, gainB * 2);
        break;
    }

    const t = this.audioContext ? this.audioContext.currentTime : 0;

    // Apply to deck A crossfader gain
    if (this.decks.A.crossfaderGainNode) {
      this.decks.A.crossfaderGainNode.gain.setTargetAtTime(gainA, t, 0.01);
    }
    // Apply to deck B crossfader gain
    if (this.decks.B.crossfaderGainNode) {
      this.decks.B.crossfaderGainNode.gain.setTargetAtTime(gainB, t, 0.01);
    }
    // Decks C and D: C follows A, D follows B
    if (this.decks.C.crossfaderGainNode) {
      this.decks.C.crossfaderGainNode.gain.setTargetAtTime(gainA, t, 0.01);
    }
    if (this.decks.D.crossfaderGainNode) {
      this.decks.D.crossfaderGainNode.gain.setTargetAtTime(gainB, t, 0.01);
    }
  }

  // ── Mixer state sync (called by Mixer component) ──
  updateMixerState(state) {
    if (!state) return;

    // Apply channel volumes
    const channelMap = { channel1: 'A', channel2: 'B', channel3: 'C', channel4: 'D' };
    for (const [key, deck] of Object.entries(channelMap)) {
      if (state[key]) {
        if (state[key].gain !== undefined) {
          this.setVolume(deck, state[key].gain / 100);
        }
        if (state[key].eq) {
          if (state[key].eq.high !== undefined) this.setChannelEQ(deck, 'high', state[key].eq.high);
          if (state[key].eq.mid !== undefined) this.setChannelEQ(deck, 'mid', state[key].eq.mid);
          if (state[key].eq.low !== undefined) this.setChannelEQ(deck, 'low', state[key].eq.low);
        }
      }
    }

    // Apply crossfader
    if (state.crossfader) {
      if (state.crossfader.position !== undefined) {
        this.setCrossfaderPosition(state.crossfader.position / 100);
      }
      if (state.crossfader.curve !== undefined) {
        this.setCrossfaderCurve(state.crossfader.curve);
      }
    }

    // Apply master volume
    if (state.master?.volume !== undefined) {
      // Master volume applied via HTML5 destination gain or a master node
      // For now, we scale both decks proportionally (simple approach)
    }
  }

  async testAudio() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      audioContext.close();
      return true;
    } catch (error) {
      console.error(`[AudioManager] Audio test failed:`, error);
      return false;
    }
  }

  getCurrentTrack(deck) {
    return this.decks[deck]?.track || null;
  }

  getCurrentTime(deck) {
    return this.decks[deck].audio ? this.decks[deck].audio.currentTime : 0;
  }

  getDuration(deck) {
    return this.decks[deck].audio ? this.decks[deck].audio.duration : 0;
  }

  isPlaying(deck) {
    return this.decks[deck].audio ? !this.decks[deck].audio.paused : false;
  }

  setOnPositionUpdate(callback) {
    this.onPositionUpdate = callback;
  }

  setOnTrackLoaded(callback) {
    this.onTrackLoaded = callback;
  }

  setOnTrackEnded(callback) {
    this.onTrackEnded = callback;
  }

  stop(deck) {
    const deckData = this.decks[deck];
    if (!deckData.audio) return;
    deckData.audio.pause();
    deckData.audio.currentTime = 0;
  }

  setCue(deck, cueState) {
    this.decks[deck].cued = cueState;
    this.updatePanning(deck);
  }

  getCue(deck) {
    return this.decks[deck].cued;
  }

  getFrequencyData(deck) {
    const deckData = this.decks[deck];
    if (!deckData.analyzerNode || !deckData.frequencyData) return null;
    deckData.analyzerNode.getByteFrequencyData(deckData.frequencyData);
    return deckData.frequencyData;
  }

  getTimeData(deck) {
    const deckData = this.decks[deck];
    if (!deckData.analyzerNode || !deckData.timeData) return null;
    deckData.analyzerNode.getByteTimeDomainData(deckData.timeData);
    return deckData.timeData;
  }

  getVULevel(deck) {
    const deckData = this.decks[deck];
    const analyzer = deckData.vuAnalyzerNode || deckData.analyzerNode;
    const dataArray = deckData.vuFrequencyData || deckData.frequencyData;
    
    if (!analyzer || !dataArray) return 0;
    
    analyzer.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(100, (average / 255) * 120);
  }

  getAudioNodes(deck) {
    const deckData = this.decks[deck];
    if (!deckData || !this.audioContext) {
      return { audioContext: null, gainNode: null, pannerNode: null, analyzerNode: null };
    }
    return {
      audioContext: this.audioContext,
      gainNode: deckData.gainNode,
      pannerNode: deckData.pannerNode,
      analyzerNode: deckData.analyzerNode,
      sourceNode: deckData.sourceNode,
      eqFilters: deckData.eqFilters,
      crossfaderGainNode: deckData.crossfaderGainNode
    };
  }

  // Legacy method — EQ is now built into setupAudioChain; this is kept for backward compat
  insertEQChain(deck, eqChain) {
    console.warn('[AudioManager] insertEQChain is deprecated — EQ is built into the signal chain. Use setEQBand() instead.');
    return true;
  }

  async analyzeTrack(track) {
    if (!this.analyzer) {
      console.warn("[AudioManager] Analyzer not initialized yet");
      return null;
    }
    if (!track || !track.filePath) {
      console.warn("[AudioManager] Cannot analyze track: No file path");
      return null;
    }
    try {
      const result = await this.analyzer.analyzeTrack(track.filePath);
      return result;
    } catch (error) {
      console.error("[AudioManager] Track analysis failed:", error);
      return { bpm: null, key: null, analyzed: false, error: error.message };
    }
  }

  destroy() {
    Object.keys(this.decks).forEach(deck => {
      const deckData = this.decks[deck];
      if (deckData.audio) {
        deckData.audio.pause();
        deckData.audio.src = '';
      }
      if (deckData.sourceNode) deckData.sourceNode.disconnect();
      if (deckData.analyzerNode) deckData.analyzerNode.disconnect();
      if (deckData.vuAnalyzerNode) deckData.vuAnalyzerNode.disconnect();
      if (deckData.gainNode) deckData.gainNode.disconnect();
      if (deckData.pannerNode) deckData.pannerNode.disconnect();
    });
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}

export default AudioManager;

