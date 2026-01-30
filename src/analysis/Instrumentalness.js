// src/audio/Instrumentalness.js
// Pro-level instrumentalness: vocal presence detection via spectral cues

import GenreRules from "./GenreRules.js";

export function computeInstrumentalnessFast(energyVal = 50, genre = "", cfg = {}) {
  // Fast: config boost only (conservative default low)
  const rules = GenreRules.getInstrumentalnessRules(genre) || {};
  const boost = rules.boost || cfg.instrumentalnessBoost || 0;
  return Math.round(Math.max(0, Math.min(100, 20 + boost))); // Most tracks have vocals
}

export function computeInstrumentalnessDeep(
  trajectory = [],
  spectralData = { flatness: [], vocalEnergy: [] }, // per-frame or avg
  genre = "",
  cfg = {}
) {
  if (!Array.isArray(trajectory) || trajectory.length === 0) {
    return computeInstrumentalnessFast(null, genre, cfg);
  }

  const rules = GenreRules.getInstrumentalnessRules(genre) || {};
  const boost = rules.boost || cfg.instrumentalnessBoost || 0;

  // 1. Spectral flatness: high flatness = noise-like = instrumental (no tonal vocals)
  let flatnessScore = 50;
  if (spectralData.flatness && spectralData.flatness.length > 0) {
    const avgFlatness =
      spectralData.flatness.reduce((s, v) => s + v, 0) /
      spectralData.flatness.length;
    // Flatness ~0.1-0.3 tonal (vocals), ~0.6-1 noise/instrumental
    flatnessScore = avgFlatness * 100;
  }

  // 2. Vocal-range energy (300-3000Hz): high energy in this band = likely vocals
  let vocalScore = 80; // Assume vocals unless proven otherwise
  if (spectralData.vocalEnergy && spectralData.vocalEnergy.length > 0) {
    const avgVocal =
      spectralData.vocalEnergy.reduce((s, v) => s + v, 0) /
      spectralData.vocalEnergy.length;
    // Normalized 0-1: high = strong vocal presence → low instrumentalness
    vocalScore = (1 - avgVocal) * 100;
  }

  // 3. Energy consistency bonus: instrumentals often more steady
  const mean = trajectory.reduce((s, v) => s + v, 0) / trajectory.length;
  const variance =
    trajectory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
    trajectory.length;
  const stdDev = Math.sqrt(variance);
  const consistencyBonus = Math.min(30, stdDev < 0.15 ? 30 : 0); // Very steady → bonus

  // Combine: flatness and low vocal energy = high instrumentalness
  let raw = flatnessScore * 0.5 + vocalScore * 0.4 + consistencyBonus;

  return Math.round(Math.max(0, Math.min(100, raw + boost)));
}

export default { computeInstrumentalnessFast, computeInstrumentalnessDeep };
