/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: GenreRules.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/GenreRules.js
// Central genre-specific tuning rules
// Used by all feature modules (BPM, Energy, Danceability, Key, etc.)

const genreRules = {
  // Base / fallback
  default: {
    bpm: {
      preferredRange: [80, 170],
      doubleTimeRawMin: 170,
      halfTimeRawMin: 80,
      halfTimeRawMax: 160,
      pruneThreshold: 0.6,
    },
    energy: {
      scaling: 1.0,
      maxCap: 100,
      boost: 0,
    },
    danceability: {
      boost: 0,
      regularityWeight: 0.6,
      energyWeight: 0.4,
      regularityScale: 200,
    },
    acousticness: { boost: 0 },
    instrumentalness: { boost: 0 },
    liveness: { boost: 0 },
    key: {
      relativeMinorBias: 0,
      commonKeyBoost: 0.1,
      capoCheck: false,
    },
    transition: { difficultyOffset: 0 },
  },

  rock: {
    bpm: { doubleTimeRawMin: 160, pruneThreshold: 0.5 },
    energy: { scaling: 1.8, boost: 30 },
    danceability: { boost: 20, regularityWeight: 0.7 },
    acousticness: { boost: -10 },
    instrumentalness: { boost: 20 },
    key: { capoCheck: true },
  },

  "classic rock": {
    parent: "rock",
    energy: { scaling: 1.2 },
    acousticness: { boost: -15 },
  },

  "southern rock": {
    parent: "rock",
    energy: { scaling: 1.9, boost: 35 },
    danceability: { boost: 20 },  // Lower to avoid 100
    key: { relativeMinorBias: 0.5 },
  },

  "new wave": {
    parent: "rock",
    danceability: { boost: 30, regularityWeight: 0.8 },
  },

  country: {
    bpm: { preferredRange: [90, 140], doubleTimeRawMin: 140 },
    energy: { scaling: 1.8, boost: 40 },  // Big push for country drive
    danceability: {
      boost: 30,  // Moderate for two-step
      regularityWeight: 0.7,
      energyWeight: 0.25,
      regularityScale: 150, // Less variance penalty
    },
    acousticness: { boost: -20 },  // Less acoustic bias
    instrumentalness: { boost: 10 },
    key: { capoCheck: true, relativeMinorBias: -0.1 },
    transition: { difficultyOffset: -10 }, // Smoother transitions
  },

  "country rock": {
    parent: "country",
    energy: { scaling: 1.4 },
    danceability: { boost: 45 },
    instrumentalness: { boost: 15 },
  },

  "hip-hop": {
    bpm: { doubleTimeRawMin: 140, pruneThreshold: 0.4 },
    danceability: { boost: 40, regularityWeight: 0.8 },
    acousticness: { boost: -20 },
  },

  "pop rap": {
    parent: "hip-hop",
    danceability: { boost: 55 },
    energy: { scaling: 1.2 },
  },

  polka: {
    bpm: { preferredRange: [160, 220] },
    danceability: { boost: 70, regularityWeight: 0.9, regularityScale: 100 },
    energy: { scaling: 1.1 },
  },

  // Add more: swing, salsa, reggae, metal, edm, etc.
};

// Helper to merge with parent
function mergeRules(base, parentKey) {
  if (!base.parent) return base;
  const parent = genreRules[base.parent] || genreRules.default;
  const parentMerged = mergeRules(parent, parent.parentKey);
  return { ...parentMerged, ...base, parent: undefined };
}

export default class GenreRules {
  static getRules(category = "", subgenre = "") {
    let key = subgenre || category || "default";
    key = key.toLowerCase().trim();

    let rules =
      genreRules[key] ||
      genreRules[category.toLowerCase()] ||
      genreRules.default;
    rules = mergeRules({ ...rules }, rules.parentKey);

    return rules;
  }

  // Convenience methods used by feature modules
  static getBpmRules(genre, subgenre) {
    return this.getRules(genre, subgenre).bpm || {};
  }

  static getEnergyRules(genre, subgenre) {
    return this.getRules(genre, subgenre).energy || {};
  }

  static getDanceabilityRules(genre, subgenre) {
    return this.getRules(genre, subgenre).danceability || {};
  }

  static getKeyRules(genre, subgenre) {
    return this.getRules(genre, subgenre).key || {};
  }

  static getAcousticnessRules(genre, subgenre) {
    return this.getRules(genre, subgenre).acousticness || {};
  }

  static getInstrumentalnessRules(genre, subgenre) {
    return this.getRules(genre, subgenre).instrumentalness || {};
  }

  static getLivenessRules(genre, subgenre) {
    return this.getRules(genre, subgenre).liveness || {};
  }

  static getTransitionRules(genre, subgenre) {
    return this.getRules(genre, subgenre).transition || {};
  }
}

