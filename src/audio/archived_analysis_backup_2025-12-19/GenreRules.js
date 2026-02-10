/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: GenreRules.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// GenreRules.js
// Genre-aware validation with config override support

class GenreRules {
  constructor(config = {}) {
    this.config = config; // passed from analyzerConfig

    // Base hard-coded rules (fallback)
    this.baseMap = {
      acoustic: {
        minBPM: 50,
        maxBPM: 110,
        energyMax: 50,
        // Stub re-export to consolidated analysis
        export * from "../analysis/GenreRules.js";
    // Base exact match
    if (this.baseMap[norm]) return this.baseMap[norm];

    // Fuzzy/category match
    for (const [key, rules] of Object.entries(this.baseMap)) {
      if (norm.includes(key) || key.includes(norm)) return rules;
    }

    // Keyword inference
    if (/acoustic|singer|ballad|folk|country/i.test(norm))
      return this.baseMap.acoustic;
    if (/electronic|edm|house|techno|synth/i.test(norm))
      return this.baseMap.electronic;
    if (/hip-hop|rap/i.test(norm)) return this.baseMap["hip-hop"];
    if (/rock|metal|hard/i.test(norm)) return this.baseMap.rock;
    if (/jazz|funk/i.test(norm)) return this.baseMap.jazz;

    return this.baseMap.pop || {};
  }

  validateBPMForGenre(detectedBPM, genre) {
    const rules = this.getRulesForGenre(genre);
    const { minBPM, maxBPM } = rules;

    if (detectedBPM >= minBPM && detectedBPM <= maxBPM) {
      if (this.isAcousticGenre(genre)) {
        const ratios = [1.22, 1.5, 2.0];
        for (const r of ratios) {
          const corrected = detectedBPM / r;
          if (corrected >= minBPM && corrected <= maxBPM && corrected >= 70) {
            return {
              bpm: Math.round(corrected),
              adjustment: `acoustic-harmonic-${r}x`,
              confidence: 0.8,
              reason: `Acoustic correction: ${detectedBPM} â†’ ${Math.round(
                corrected
              )} (${r}x ratio)`,
            };
          }
        }
      }
      return {
        bpm: Math.round(detectedBPM),
        adjustment: "none",
        confidence: 0.95,
      };
    }

    if (detectedBPM < minBPM) {
      const doubled = detectedBPM * 2;
      if (doubled >= minBPM && doubled <= maxBPM) {
        return {
          bpm: Math.round(doubled),
          adjustment: "doubled",
          confidence: 0.85,
        };
      }
    }

    if (detectedBPM > maxBPM) {
      const halved = detectedBPM / 2;
      if (halved >= minBPM && halved <= maxBPM) {
        return {
          bpm: Math.round(halved),
          adjustment: "halved",
          confidence: 0.85,
        };
      }
    }

    return {
      bpm: Math.round(detectedBPM),
      adjustment: "out-of-range",
      confidence: 0.6,
    };
  }

  validateEnergyForGenre(detectedEnergy, genre) {
    const rules = this.getRulesForGenre(genre);
    const { energyMax } = rules;

    let scaled = detectedEnergy;
    const capped = detectedEnergy > energyMax;
    if (capped) scaled = (detectedEnergy / 100) * energyMax;

    return {
      energy: Math.round(scaled),
      maxExpected: energyMax,
      note: capped
        ? `${genre} capped at ${energyMax}`
        : `${genre} normal range`,
      isCapped: capped,
    };
  }

  getExpectedTimeSignature(genre) {
    return this.getRulesForGenre(genre).timeSignature || "4/4";
  }

  isAcousticGenre(genre) {
    return /acoustic|singer|ballad|folk|country|blues|classical|ambient|lo-fi/i.test(
      genre
    );
  }

  isHighEnergyGenre(genre) {
    return /electronic|edm|house|metal|rock|dance|pop/i.test(genre);
  }

  getAllGenres() {
    return { ...this.baseMap, ...(this.config.overrides || {}) };
  }
}

export default GenreRules;

