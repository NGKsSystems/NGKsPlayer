/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: Acousticness.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/Acousticness.js
// Improved acousticness: spectral + energy heuristics
// High acousticness = warm, natural timbre (low high-freq energy, low rolloff, less "bright" sound)

import GenreRules from "./GenreRules.js";

export function computeAcousticnessFast(
  energyVal = 50,
  spectralCentroid = 0.5,
  genre = "",
  cfg = {}
) {
  // Fast: crude proxy — lower energy + lower brightness = more acoustic
  const energyScore = (100 - energyVal) * 0.6; // Lower energy → more acoustic
  const brightnessScore = (1 - spectralCentroid) * 100 * 0.4; // Lower centroid → warmer
  let raw = energyScore + brightnessScore;

  const rules = GenreRules.getAcousticnessRules(genre) || {};
  const boost = rules.boost || cfg.acousticnessBoost || 0;
  return Math.round(Math.max(0, Math.min(100, raw + boost)));
}

export function computeAcousticnessDeep(
  trajectory = [],
  spectralData = { centroid: [], rolloff: [] }, // Assume you have avg or per-frame
  genre = "",
  cfg = {}
) {
  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return computeAcousticnessFast(null, null, genre, cfg);
  }

  // 1. Energy consistency (acoustic tracks often have natural dynamics)
  const meanEnergy = trajectory.reduce((s, v) => s + v, 0) / trajectory.length;
  const energyVariance =
    trajectory.reduce((s, v) => s + Math.pow(v - meanEnergy, 2), 0) /
    trajectory.length;
  const dynamicScore = Math.min(100, Math.sqrt(energyVariance) * 300); // Higher variance → more acoustic

  // 2. Spectral centroid (lower = warmer, less "bright"/electronic)
  let centroidScore = 80;
  if (spectralData.centroid && spectralData.centroid.length > 0) {
    const avgCentroid =
      spectralData.centroid.reduce((s, v) => s + v, 0) /
      spectralData.centroid.length;
    centroidScore = (1 - avgCentroid) * 100; // Normalized 0-1 assumed
  }

  // 3. Spectral rolloff (lower = less high-freq content)
  let rolloffScore = 70;
  if (spectralData.rolloff && spectralData.rolloff.length > 0) {
    const avgRolloff =
      spectralData.rolloff.reduce((s, v) => s + v, 0) /
      spectralData.rolloff.length;
    rolloffScore = (1 - avgRolloff) * 100;
  }

  // Weighted combination
  let raw = dynamicScore * 0.3 + centroidScore * 0.4 + rolloffScore * 0.3;

  // Apply genre boost
  const boost = cfg.acousticnessBoost || 0;
  return Math.round(Math.max(0, Math.min(100, raw + boost)));
}

export default { computeAcousticnessFast, computeAcousticnessDeep };

