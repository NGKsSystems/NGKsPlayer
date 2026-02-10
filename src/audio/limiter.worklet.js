/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: limiter.worklet.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/limiter.worklet.js
class LookaheadLimiter extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'threshold', defaultValue: -1.0, minValue: -24, maxValue: 0 },
      { name: 'release',   defaultValue: 0.150, minValue: 0.01, maxValue: 1.0 },
      { name: 'lookahead', defaultValue: 0.005, minValue: 0.001, maxValue: 0.020 },
      { name: 'makeup',    defaultValue: 0.0,   minValue: -12, maxValue: 12 }
    ];
  }

  constructor() {
    super();
    this.sampleRateInv = 1 / sampleRate;
    this.maxLA = 0.020;
    this.maxBuf = Math.ceil(this.maxLA * sampleRate);
    this.bufL = new Float32Array(this.maxBuf);
    this.bufR = new Float32Array(this.maxBuf);
    this.w = 0;
    this.delaySamp = Math.ceil(0.005 * sampleRate);
    this.env = 1.0;
  }

  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    if (!input || input.length === 0) return true;
    const inL = input[0] || new Float32Array(output[0].length).fill(0);
    const inR = input[1] || inL;
    const outL = output[0], outR = output[1] || outL;

    const thrDb   = params.threshold.length > 1 ? params.threshold : params.threshold[0];
    const rel     = params.release.length   > 1 ? params.release   : params.release[0];
    const la      = params.lookahead.length > 1 ? params.lookahead : params.lookahead[0];
    const makeup  = params.makeup.length    > 1 ? params.makeup    : params.makeup[0];

    const thr = Math.pow(10, thrDb / 20);
    const mk  = Math.pow(10, makeup / 20);
    const laSamp = Math.min(this.maxBuf - 1, Math.max(1, Math.floor(la * sampleRate)));
    this.delaySamp = laSamp;
    const relCoef = Math.exp(-1 / (rel * sampleRate));

    for (let i = 0; i < outL.length; i++) {
      this.bufL[this.w] = inL[i] || 0;
      this.bufR[this.w] = inR[i] || 0;

      let ri = this.w + this.maxBuf - this.delaySamp;
      if (ri >= this.maxBuf) ri -= this.maxBuf;

      const preL = this.bufL[ri], preR = this.bufR[ri];
      const peak = Math.max(Math.abs(preL), Math.abs(preR), 1e-9);
      const target = peak > thr ? (thr / peak) : 1.0;
      const g = (target < this.env) ? target : (relCoef * this.env + (1 - relCoef) * target);
      this.env = g;

      outL[i] = this.bufL[ri] * this.env * mk;
      outR[i] = this.bufR[ri] * this.env * mk;

      this.w++; if (this.w >= this.maxBuf) this.w = 0;
    }
    return true;
  }
}
registerProcessor('lookahead-limiter', LookaheadLimiter);

