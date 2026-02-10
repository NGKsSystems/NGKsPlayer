/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: Liveness.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/Liveness.js
// Improved liveness: dynamic fluctuations + reverb proxies + spectral hints

import GenreRules from "./GenreRules.js";

export function computeLivenessFast(energyVal = 50, genre = "", cfg = {}) {
  // Fast: simple base + small energy tie-in
  const rules = GenreRules.getLivenessRules(genre) || {};
  const base = rules.boost || cfg.livenessBase || 20; // Default low for studio
  const energyBoost = energyVal > 70 ? 10 : 0; // Slight lift for high-energy
  return Math.round(Math.max(0, Math.min(100, base + energyBoost)));
}

export function computeLivenessDeep(
  trajectory = [],
  spectralData = { highFreqEnergy: [], rolloff: [] }, // Optional per-frame data
  genre = "",
  cfg = {}
) {
  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return computeLivenessFast(null, genre, cfg);
  }

  // 1. Dynamic fluctuations (crowd/movement/performer energy)
  const mean = trajectory.reduce((s, v) => s + v, 0) / trajectory.length;
  const variance =
    trajectory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
    trajectory.length;
  const stdDev = Math.sqrt(variance);
  let fluctuationScore = Math.min(100, stdDev * 250); // Tuned: live shows ~0.2-0.4 std

  // 2. Reverb tail proxy: sustained high-frequency energy (hall/venue reverb)
  let reverbScore = 30; // Base assumption
  if (spectralData.highFreqEnergy && spectralData.highFreqEnergy.length > 0) {
    const lateHighMean =
      spectralData.highFreqEnergy
        .slice(Math.floor(spectralData.highFreqEnergy.length * 0.7)) // Last 30%
        .reduce((s, v) => s + v, 0) /
      (spectralData.highFreqEnergy.length * 0.3);
    reverbScore = lateHighMean * 100 * 1.5; // Amplify tail persistence
  }

  // 3. Spectral rolloff persistence (live venues = slower HF decay)
  if (spectralData.rolloff && spectralData.rolloff.length > 0) {
    const avgRolloff =
      spectralData.rolloff.reduce((s, v) => s + v, 0) /
      spectralData.rolloff.length;
    const rolloffScore = avgRolloff < 0.5 ? (1 - avgRolloff) * 80 : 0; // Lower rolloff = more reverb
    reverbScore = Math.max(reverbScore, rolloffScore);
  }

  // 4. Combine: fluctuations + reverb = liveness feel
  let raw = fluctuationScore * 0.5 + reverbScore * 0.5;

  // Genre-aware boost (e.g., live country/rock often has crowd)
  const boost = cfg.livenessBoost || 0;
  return Math.round(Math.max(0, Math.min(100, raw + boost)));
}

export default { computeLivenessFast, computeLivenessDeep };

