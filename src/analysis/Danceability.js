/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: Danceability.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/Danceability.js
// Genre-aware danceability: base calc + per-genre adjustments from GenreRules

import GenreRules from "./GenreRules.js";

export function computeDanceabilityFast(energyVal = 50, genre = "", cfg = {}) {
  const rules = GenreRules.getDanceabilityRules(genre) || {};
  const base = typeof energyVal === "number" ? energyVal : 50;
  const genreBoost = rules.boost || 0;
  return Math.round(Math.max(0, Math.min(100, base + genreBoost)));
}

export function computeDanceabilityDeep(
  trajectory = [],
  onsets = null,
  genre = "",
  cfg = {}
) {
  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return computeDanceabilityFast(null, genre, cfg);
  }

  const rules = GenreRules.getDanceabilityRules(genre) || {};

  // 1. Sustained energy: 75th percentile
  const sorted = trajectory.slice().sort((a, b) => a - b);
  const p75 = sorted[Math.floor(sorted.length * 0.75)] || 0;
  let energyScore = p75 * 100;

  // 2. Rhythmic regularity: low variance = steady groove
  const usable =
    onsets && Array.isArray(onsets) && onsets.length > 10 ? onsets : trajectory;
  const mean = usable.reduce((a, b) => a + b, 0) / usable.length;
  const variance =
    usable.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / usable.length;
  const stdDev = Math.sqrt(variance);
  let regularity = Math.max(0, 100 - (stdDev * (rules.regularityScale || 200)));

  // Genre-specific adjustments
  const genreType = genre.toLowerCase();
  if (genreType.includes('country') || genreType.includes('polka')) {
    regularity *= 1.2;
    energyScore = Math.min(energyScore * (rules.energyWeight || 0.5), 100);
  }

  // 3. Combine with genre weights
  const raw =
    energyScore * (rules.energyWeight || 0.4) +
    regularity * (rules.regularityWeight || 0.6);
  const boost = rules.boost || cfg.danceabilityBoost || 0;
  return Math.round(Math.max(0, Math.min(100, raw + boost)));
}

export default { computeDanceabilityFast, computeDanceabilityDeep };

