/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: graph.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/graph.js

// ===== Public helpers to fix “loads but won’t play” =====
// Keep a reference to the single AudioContext so the renderer can resume it.
let ctxRef = null;

/** Call this once after you create an AudioContext (done in constructor below). */
export function setAudioContext(ctx) {
  ctxRef = ctx;
}

/** Safe resume for autoplay policies / suspended contexts (Electron/Chrome). */
export async function resumeAudio() {
  try {
    if (ctxRef && ctxRef.state !== 'running') {
      await ctxRef.resume();
    }
  } catch (e) {
    // No-op if already running or resume not allowed yet.
    console.warn('resumeAudio() skipped:', e?.message || e);
  }
}

// ===== Core EQ / Graph =====
export const CENTER_FREQS = [
  20, 32, 50, 80, 125, 200, 315, 500,
  800, 1250, 2000, 3150, 5000, 8000, 12500, 16000
];

const DEFAULT_Q = 1.2;
const DEFAULT_GAIN_DB = 0;
const MASTER_HEADROOM_DB = -6;

const dbToAmp = (db) => Math.pow(10, db / 20);

export class AudioGraph {
  constructor() {
    // Create context and expose it so UI can resume before play.
    this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    setAudioContext(this.ctx);

    // Worklet (limiter)
    this.ready = this.ctx.audioWorklet.addModule(new URL('./limiter.worklet.js', import.meta.url));

    // Media elements + chains
    this.mediaA = null;
    this.mediaB = null;

    this.chainA = this.#buildChain();
    this.chainB = this.#buildChain();

    // Crossfade mixer (for main output)
    this.mixA = this.ctx.createGain();
    this.mixB = this.ctx.createGain();
    this.chainA.preOutGain.connect(this.mixA);
    this.chainB.preOutGain.connect(this.mixB);

    // Master output path (to crowd/speakers)
    this.masterOutput = this.ctx.createGain();
    this.mixA.connect(this.masterOutput);
    this.mixB.connect(this.masterOutput);

    // Cue/Headphone output path - SAME CONTEXT, SEPARATE CHAINS
    this.cueChainA = this.#buildChain();
    this.cueChainB = this.#buildChain();
    this.cueGainA = this.ctx.createGain();
    this.cueGainB = this.ctx.createGain();
    this.cueMasterOut = this.ctx.createGain();
    
    // Connect cue chains to cue output
    this.cueChainA.preOutGain.connect(this.cueGainA);
    this.cueChainB.preOutGain.connect(this.cueGainB);
    this.cueGainA.connect(this.cueMasterOut);
    this.cueGainB.connect(this.cueMasterOut);
    
    // Initially no cue active
    this.cueGainA.gain.value = 0.0;
    this.cueGainB.gain.value = 0.0;

    // Master headroom -> limiter -> main output
    this.headroom = this.ctx.createGain();
    this.headroom.gain.value = dbToAmp(MASTER_HEADROOM_DB);
    this.masterOutput.connect(this.headroom);

    // Create final output merger for exclusive left/right control
    this.finalOutput = this.ctx.createChannelMerger(2);
    this.finalOutput.connect(this.ctx.destination);

    this.limiterNode = null;
    this.#initLimiter().then(() => {
      // Main mix output for crowd AND DJ monitoring (LEFT channel) 
      this.headroom.connect(this.limiterNode);
      this.limiterNode.connect(this.finalOutput, 0, 0); // Main mix to LEFT channel at 100%
      
      // Cue output ONLY (RIGHT channel)
      // Pure cue signal with no main mix contamination
      this.cueMasterOut.connect(this.finalOutput, 0, 1); // Cue to RIGHT channel at 100%
    });

    // Default crossfader center, no cue active initially
    this.setCrossfader(0.5, false);
  }

  async #initLimiter() {
    await this.ready;
    this.limiterNode = new AudioWorkletNode(this.ctx, 'lookahead-limiter', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { threshold: -1.0, release: 0.15, lookahead: 0.005, makeup: 0.0 }
    });
  }



  #buildChain() {
    const eqIn = this.ctx.createGain();
    let node = eqIn;

    const eqBands = CENTER_FREQS.map(freq => {
      const b = this.ctx.createBiquadFilter();
      b.type = 'peaking';
      b.frequency.value = freq;
      b.Q.value = DEFAULT_Q;
      b.gain.value = DEFAULT_GAIN_DB;
      node.connect(b);
      node = b;
      return b;
    });

    const preOutGain = this.ctx.createGain(); // per-deck fader before mix
    node.connect(preOutGain);

    // we fill `input`/`preIn` later in attachMediaElements
    return { eqIn, eqBands, preOutGain, input: null, preIn: null, inputEl: null };
  }

  /**
   * Attach two <audio> elements to the graph.
   * IMPORTANT: never create multiple MediaElementSource nodes for the same element.
   */
  attachMediaElements(elA, elB) {
    this.mediaA = elA;
    this.mediaB = elB;

    // Main audio chain A
    if (this.chainA.input && this.chainA.inputEl !== elA) {
      try { this.chainA.input.disconnect(); } catch {}
      this.chainA.input = null;
    }
    if (!this.chainA.input) {
      this.chainA.input = this.ctx.createMediaElementSource(elA);
      this.chainA.inputEl = elA;
      this.chainA.preIn = this.ctx.createGain();
      this.chainA.input.connect(this.chainA.preIn);
      
      // Connect to main chain 
      this.chainA.preIn.connect(this.chainA.eqIn);
      
      // ALWAYS connect to cue chain (controlled by gain later)
      this.chainA.preIn.connect(this.cueChainA.eqIn);
    }

    // Main audio chain B
    if (this.chainB.input && this.chainB.inputEl !== elB) {
      try { this.chainB.input.disconnect(); } catch {}
      this.chainB.input = null;
    }
    if (!this.chainB.input) {
      this.chainB.input = this.ctx.createMediaElementSource(elB);
      this.chainB.inputEl = elB;
      this.chainB.preIn = this.ctx.createGain();
      this.chainB.input.connect(this.chainB.preIn);
      
      // Connect to main chain
      this.chainB.preIn.connect(this.chainB.eqIn);
      
      // ALWAYS connect to cue chain (controlled by gain later)
      this.chainB.preIn.connect(this.cueChainB.eqIn);
    }
  }

  /** Public resume used by UI as a convenience. */
  async resume() {
    await resumeAudio();
  }

  #rampParam(param, value, t = 0.02) {
    const now = this.ctx.currentTime;
    try { param.cancelScheduledValues(now); } catch {}
    param.setTargetAtTime(value, now, t);
  }

  setCrossfader(t, smooth = true) {
    const v = Math.min(1, Math.max(0, t));
    // equal-power curve
    const a = Math.cos(v * Math.PI * 0.5);
    const b = Math.cos((1 - v) * Math.PI * 0.5);
    if (smooth) {
      this.#rampParam(this.mixA.gain, a, 0.02);
      this.#rampParam(this.mixB.gain, b, 0.02);
    } else {
      this.mixA.gain.value = a;
      this.mixB.gain.value = b;
    }
  }

  setVolume(player, v, smooth = true) {
    const c = player === 'A' ? this.chainA : this.chainB;
    const vol = Math.max(0, Math.min(1, v));
    if (smooth) this.#rampParam(c.preOutGain.gain, vol, 0.02);
    else c.preOutGain.gain.value = vol;
  }

  setLimiter({ thresholdDb = -1.0, release = 0.15, lookahead = 0.005, makeupDb = 0.0 } = {}) {
    if (!this.limiterNode) return;
    const t = this.ctx.currentTime;
    this.limiterNode.parameters.get('threshold')?.setValueAtTime(thresholdDb, t);
    this.limiterNode.parameters.get('release')?.setValueAtTime(release, t);
    this.limiterNode.parameters.get('lookahead')?.setValueAtTime(lookahead, t);
    this.limiterNode.parameters.get('makeup')?.setValueAtTime(makeupDb, t);
  }

  setEqBand(player, i, gainDb, smooth = true) {
    const c = player === 'A' ? this.chainA : this.chainB;
    const f = c.eqBands[i];
    if (!f) return;
    if (smooth) this.#rampParam(f.gain, gainDb, 0.02);
    else f.gain.value = gainDb;
  }

  setEq(player, gainsDbArray, smooth = true) {
    (gainsDbArray || []).forEach((g, i) => this.setEqBand(player, i, g, smooth));
  }

  /**
   * Set which channels are sent to cue (headphone) output
   * @param {boolean} cueA - Whether to send deck A to cue
   * @param {boolean} cueB - Whether to send deck B to cue
   */
  setCueChannels(cueA, cueB) {
    this.cueGainA.gain.value = cueA ? 1.0 : 0.0;
    this.cueGainB.gain.value = cueB ? 1.0 : 0.0;
  }

  /**
   * Set the cue mix balance between main mix and pure cue signal in headphones
   * @param {number} mainLevel - Level of main mix in headphones (0-1) [NOT USED - main always 100% in left]
   * @param {number} cueLevel - Level of cue signal in headphones (0-1) 
   */
  setCueMix(mainLevel, cueLevel) {
    // In professional DJ setup: left=100% main, right=100% cue (when active)
    // mainLevel parameter ignored - main is always 100% in left channel
    this.cueMasterOut.gain.value = Math.max(0, Math.min(1, cueLevel));
  }

  /**
   * Quick cue toggle for a specific deck
   * @param {string} player - 'A' or 'B'
   * @param {boolean} enabled - Whether cue is enabled for this deck
   */
  setCue(player, enabled) {
    if (player === 'A') {
      if (enabled) {
        // Connect deck A to cue chain if not already connected
        if (!this.chainA.cueConnection) {
          this.chainA.cueConnection = this.chainA.preIn.connect(this.cueChainA.eqIn);
        }
        this.cueGainA.gain.value = 1.0;
      } else {
        // Disconnect deck A from cue chain
        if (this.chainA.cueConnection) {
          try { this.chainA.preIn.disconnect(this.cueChainA.eqIn); } catch {}
          this.chainA.cueConnection = null;
        }
        this.cueGainA.gain.value = 0.0;
      }
    } else if (player === 'B') {
      if (enabled) {
        // Connect deck B to cue chain if not already connected
        if (!this.chainB.cueConnection) {
          this.chainB.cueConnection = this.chainB.preIn.connect(this.cueChainB.eqIn);
        }
        this.cueGainB.gain.value = 1.0;
      } else {
        // Disconnect deck B from cue chain
        if (this.chainB.cueConnection) {
          try { this.chainB.preIn.disconnect(this.cueChainB.eqIn); } catch {}
          this.chainB.cueConnection = null;
        }
        this.cueGainB.gain.value = 0.0;
      }
    }
  }

  /**
   * Legacy method for compatibility - redirects to setCueMix
   * @param {string} mode - Monitoring mode (ignored, uses cue system instead)
   */
  setDJMonitoringMode(mode) {
    // This method exists for backward compatibility
    // The new cue system handles monitoring through setCue and setCueMix methods
    console.warn('setDJMonitoringMode is deprecated, use setCue and setCueMix instead');
  }
}

export const EQ_PRESETS = {
  Flat: new Array(16).fill(0),
  BassBoost: [ 6, 5, 4, 3, 2, 1, 0, 0, -1, -2, -3, -4, -5, -6, -6, -6 ],
  TrebleBoost:[ -4,-3,-2,-1, 0, 0, 1, 2, 3, 4, 5, 6, 6, 6, 5, 4 ],
  Vocal:     [ -2,-2,-1,-1, 0, 1, 2, 3, 4, 4, 3, 1, 0,-1,-2,-3 ],
  Loudness:  [ 5, 4, 3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 4, 5, 5, 4 ],
  Rock:      [ 3, 2, 1, 0,-1, 0, 2, 3, 3, 2, 0,-1, 0, 1, 2, 3 ],
  Jazz:      [ 0, 0, 1, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 1, 0, 0 ],
  Classical: [ -1,-1, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0,-1,-1 ],
};

