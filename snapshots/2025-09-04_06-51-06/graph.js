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

    // Crossfade mixer
    this.mixA = this.ctx.createGain();
    this.mixB = this.ctx.createGain();
    this.chainA.preOutGain.connect(this.mixA);
    this.chainB.preOutGain.connect(this.mixB);

    // Master headroom -> limiter -> speakers
    this.headroom = this.ctx.createGain();
    this.headroom.gain.value = dbToAmp(MASTER_HEADROOM_DB);
    this.mixA.connect(this.headroom);
    this.mixB.connect(this.headroom);

    this.limiterNode = null;
    this.#initLimiter().then(() => {
      this.headroom.connect(this.limiterNode);
      this.limiterNode.connect(this.ctx.destination);
    });

    // Default crossfader center
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

    // A
    if (this.chainA.input && this.chainA.inputEl !== elA) {
      try { this.chainA.input.disconnect(); } catch {}
      this.chainA.input = null;
    }
    if (!this.chainA.input) {
      this.chainA.input = this.ctx.createMediaElementSource(elA);
      this.chainA.inputEl = elA;
      this.chainA.preIn = this.ctx.createGain();
      this.chainA.input.connect(this.chainA.preIn);
      this.chainA.preIn.connect(this.chainA.eqIn);
    }

    // B
    if (this.chainB.input && this.chainB.inputEl !== elB) {
      try { this.chainB.input.disconnect(); } catch {}
      this.chainB.input = null;
    }
    if (!this.chainB.input) {
      this.chainB.input = this.ctx.createMediaElementSource(elB);
      this.chainB.inputEl = elB;
      this.chainB.preIn = this.ctx.createGain();
      this.chainB.input.connect(this.chainB.preIn);
      this.chainB.preIn.connect(this.chainB.eqIn);
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
