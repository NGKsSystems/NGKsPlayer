/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: BpmAnalyzer.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// BpmAnalyzer.js
import {
  getMonoData,
  calculateEnergyEnvelope,
  findPeaks,
  intervalsToTempo,
} from "./utils.js";
import analyzerConfig from "../utils/analyzerConfig.js";

const foldBpm = (bpm, min = 80, max = 180) => {
  let x = bpm || 0;
  while (x > 0 && x < min) x *= 2;
  while (x > max) x *= 0.5;
  return x || 120;
};

const dedupe = (arr) => {
  const seen = new Set();
  return arr.filter((c) => {
    const v = Math.round(c.value);
    if (seen.has(v)) return false;
    seen.add(v);
    c.value = v;
    return true;
  });
};

const getOpts = (opts) => {
  if (opts && typeof opts === "object" && Object.keys(opts).length) return opts;
  try {
    const g = analyzerConfig?.getConfigForGenre
      ? analyzerConfig.getConfigForGenre("", null)
      : analyzerConfig?.global || {};
    return { ...(g || {}) };
  } catch {
    return {};
  }
};

export async function detectBPMWithCandidates(audioBuffer, opts = {}) {
  opts = getOpts(opts);

  const sr = audioBuffer?.sampleRate || 44100;
  const hopMs = typeof opts.hopMs === "number" ? opts.hopMs : 100;
  const minDistMs =
    typeof opts.minPeakDistanceMs === "number" ? opts.minPeakDistanceMs : 200;

  const onsetSensitivity =
    typeof opts.onsetSensitivity === "number" ? opts.onsetSensitivity : 0.3;
  const bpmMin = typeof opts.bpmMin === "number" ? opts.bpmMin : 80;
  const bpmMax = typeof opts.bpmMax === "number" ? opts.bpmMax : 180;
  const prune =
    typeof opts.bpmCandidatePruneThreshold === "number"
      ? opts.bpmCandidatePruneThreshold
      : null;

  const channel = getMonoData(audioBuffer);
  const env = calculateEnergyEnvelope(channel, sr, hopMs);
  const peaks = findPeaks(env, sr, hopMs, minDistMs, onsetSensitivity);

  if (!peaks || peaks.length < 2) {
    return { primary: 120, candidates: [{ value: 120, confidence: 0.4 }] };
  }

  const intervals = [];
  for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);

  const raw = intervalsToTempo(intervals, sr, hopMs);
  const primary = foldBpm(raw, bpmMin, bpmMax);

  // === NEW DATA-DRIVEN CONFIDENCE PATCH START ===
  // Build histogram of interval-derived BPM values
  const intervalHistogram = new Map();
  intervals.forEach((i) => {
    const bpm = Math.round((60 * sr) / i / hopMs);
    intervalHistogram.set(bpm, (intervalHistogram.get(bpm) || 0) + 1);
  });
  const totalIntervals = intervals.length || 1;

  const getConfidence = (bpmVal) => {
    const support = intervalHistogram.get(bpmVal) || 0;
    return support / totalIntervals;
  };

  let candidates = dedupe(
    [
      {
        value: primary * 0.5,
        confidence: getConfidence(Math.round(primary * 0.5)) * 0.6,
      },
      { value: primary, confidence: getConfidence(Math.round(primary)) },
      {
        value: primary * 1.5,
        confidence: getConfidence(Math.round(primary * 1.5)) * 0.4,
      },
      {
        value: primary * 2,
        confidence: getConfidence(Math.round(primary * 2)) * 0.8,
      },
    ].filter((c) => c.confidence > 0.05) // only meaningful support
  ).sort((a, b) => b.confidence - a.confidence);

  // Double-time candidate if raw high
  const dtMin =
    typeof opts.doubleTimeRawMin === "number" ? opts.doubleTimeRawMin : null;
  if (dtMin && raw > dtMin) {
    candidates = dedupe([
      {
        value: raw * 2,
        confidence: getConfidence(Math.round(raw * 2)) * 0.9 || 0.4,
      },
      ...candidates,
    ]).sort((a, b) => b.confidence - a.confidence);
  }

  // Optional debug
  if (opts.debugBpm) {
    console.log("[BpmAnalyzer] raw:", raw, "primary:", primary);
    console.log("[BpmAnalyzer] candidates:", candidates);
  }
  // === NEW DATA-DRIVEN CONFIDENCE PATCH END ===

  if (prune != null && prune > 0) {
    candidates = candidates.filter((c) => (c.confidence || 0) >= prune);
    if (!candidates.length)
      candidates = [{ value: Math.round(primary), confidence: 0.8 }];
  }

  return { primary, candidates };
}

export async function detectBPM(audioBuffer, opts = {}) {
  const r = await detectBPMWithCandidates(audioBuffer, opts);
  return r.primary;
}

export function detectBPMDrift(channelData, sampleRate, bpm, opts = {}) {
  opts = getOpts(opts);
  const hopMs = typeof opts.hopMs === "number" ? opts.hopMs : 100;
  const onsetSensitivity =
    typeof opts.onsetSensitivity === "number" ? opts.onsetSensitivity : 0.3;
  const bpmMin = typeof opts.bpmMin === "number" ? opts.bpmMin : 80;
  const bpmMax = typeof opts.bpmMax === "number" ? opts.bpmMax : 180;

  try {
    const len = channelData.length;
    const sec = sampleRate * 30;
    const first = channelData.slice(0, Math.min(len, sec));
    const last = channelData.slice(Math.max(0, len - sec));

    const fEnv = calculateEnergyEnvelope(first, sampleRate, hopMs);
    const lEnv = calculateEnergyEnvelope(last, sampleRate, hopMs);

    const fPeaks = findPeaks(fEnv, sampleRate, hopMs, 200, onsetSensitivity);
    const lPeaks = findPeaks(lEnv, sampleRate, hopMs, 200, onsetSensitivity);

    const fRaw =
      fPeaks.length >= 2
        ? intervalsToTempo(
            fPeaks.slice(1).map((v, i) => v - fPeaks[i]),
            sampleRate,
            hopMs
          )
        : bpm;
    const lRaw =
      lPeaks.length >= 2
        ? intervalsToTempo(
            lPeaks.slice(1).map((v, i) => v - lPeaks[i]),
            sampleRate,
            hopMs
          )
        : bpm;

    const startBpm = foldBpm(fRaw, bpmMin, bpmMax);
    const endBpm = foldBpm(lRaw, bpmMin, bpmMax);
    return {
      startBpm,
      endBpm,
      drift: Math.round((endBpm - startBpm) * 100) / 100,
    };
  } catch {
    return { startBpm: bpm, endBpm: bpm, drift: 0 };
  }
}

