/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AudioManager.js
 * Purpose: TODO â€“ describe responsibility
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
      A: {
        audio: null,
        loaded: false,
        track: null,
        cued: false,
        audioContext: null,
        gainNode: null,
        pannerNode: null,
        sourceNode: null,
        analyzerNode: null,
        vuAnalyzerNode: null,
        frequencyData: null,
        timeData: null,
        vuFrequencyData: null,
        fxInsertNode: null,
        fxReturnNode: null,
      },
      B: {
        audio: null,
        loaded: false,
        track: null,
        cued: false,
        audioContext: null,
        gainNode: null,
        pannerNode: null,
        sourceNode: null,
        analyzerNode: null,
        vuAnalyzerNode: null,
        frequencyData: null,
        timeData: null,
        vuFrequencyData: null,
        fxInsertNode: null,
        fxReturnNode: null,
      },
      C: {
        audio: null,
        loaded: false,
        track: null,
        cued: false,
        audioContext: null,
        gainNode: null,
        pannerNode: null,
        sourceNode: null,
        analyzerNode: null,
        vuAnalyzerNode: null,
        frequencyData: null,
        timeData: null,
        vuFrequencyData: null,
        fxInsertNode: null,
        fxReturnNode: null,
      },
      D: {
        audio: null,
        loaded: false,
        track: null,
        cued: false,
        audioContext: null,
        gainNode: null,
        pannerNode: null,
        sourceNode: null,
        analyzerNode: null,
        vuAnalyzerNode: null,
        frequencyData: null,
        timeData: null,
        vuFrequencyData: null,
        fxInsertNode: null,
        fxReturnNode: null,
      },
    };

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

  // Set up Web Audio API chain for a deck with stereo panning
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
      deckData.pannerNode = this.audioContext.createStereoPanner();
      deckData.analyzerNode = this.audioContext.createAnalyser();
      
      // Create a separate analyzer for VU metering after all processing
      deckData.vuAnalyzerNode = this.audioContext.createAnalyser();
      
      // Configure analyzer for waveform
      deckData.analyzerNode.fftSize = 1024;
      deckData.analyzerNode.smoothingTimeConstant = 0.8;
      
      // Configure VU analyzer for level detection (higher sensitivity)
      deckData.vuAnalyzerNode.fftSize = 256; // Smaller for faster response
      deckData.vuAnalyzerNode.smoothingTimeConstant = 0.3; // More responsive
      
      // Create data arrays for analysis
      const bufferLength = deckData.analyzerNode.frequencyBinCount;
      deckData.frequencyData = new Uint8Array(bufferLength);
      deckData.timeData = new Uint8Array(bufferLength);
      
      // Create VU data array
      const vuBufferLength = deckData.vuAnalyzerNode.frequencyBinCount;
      deckData.vuFrequencyData = new Uint8Array(vuBufferLength);
      
      // Connect the audio chain: source -> analyzer -> gain -> panner -> vuAnalyzer -> destination
      deckData.sourceNode.connect(deckData.analyzerNode);
      deckData.analyzerNode.connect(deckData.gainNode);
      deckData.gainNode.connect(deckData.pannerNode);
      deckData.pannerNode.connect(deckData.vuAnalyzerNode);
      deckData.vuAnalyzerNode.connect(this.audioContext.destination);
      
      // Set initial panning (left ear for normal, right ear for cue)
      this.updatePanning(deck);
      
      console.log(`[AudioManager] Audio chain with dual analyzer setup complete for Deck ${deck}`);
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
    if (!deckData.audio) return;
    deckData.audio.volume = Math.max(0, Math.min(1, volume));
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
      sourceNode: deckData.sourceNode
    };
  }

  insertEQChain(deck, eqChain) {
    const deckData = this.decks[deck];
    if (!deckData || !deckData.sourceNode || !deckData.gainNode || !deckData.pannerNode) return false;

    try {
      deckData.sourceNode.disconnect();
      deckData.analyzerNode.disconnect();
      deckData.gainNode.disconnect();
      deckData.pannerNode.disconnect();
      if (deckData.vuAnalyzerNode) deckData.vuAnalyzerNode.disconnect();
      
      deckData.sourceNode.connect(deckData.analyzerNode);
      
      if (eqChain && eqChain.length > 0) {
        deckData.analyzerNode.connect(eqChain[0]);
        for (let i = 0; i < eqChain.length - 1; i++) {
          eqChain[i].connect(eqChain[i + 1]);
        }
        eqChain[eqChain.length - 1].connect(deckData.gainNode);
      } else {
        deckData.analyzerNode.connect(deckData.gainNode);
      }
      
      deckData.gainNode.connect(deckData.pannerNode);
      
      if (deckData.vuAnalyzerNode) {
        deckData.pannerNode.connect(deckData.vuAnalyzerNode);
        deckData.vuAnalyzerNode.connect(this.audioContext.destination);
      } else {
        deckData.pannerNode.connect(this.audioContext.destination);
      }
      
      return true;
    } catch (error) {
      console.error(`[AudioManager] Failed to insert EQ chain:`, error);
      return false;
    }
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

