/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: autodj-brain.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * NGKsPlayer Auto DJ Brain - Phase 2: Advanced Intelligence
 * Professional Mix Decision Engine for Seamless Auto DJ
 */

/**
 * Harmonic Compatibility Engine
 * Analyzes musical harmony and key relationships
 */
class HarmonicCompatibilityEngine {
  analyzeHarmony(trackA, trackB) {
    // This would contain advanced harmonic analysis
    // For now, returning basic compatibility
    return {
      compatible: true,
      confidence: 0.7,
      advice: 'Good harmonic transition'
    };
  }
}

/**
 * Song Structure Analyzer
 * Identifies intro, verse, chorus, outro sections
 */
class SongStructureAnalyzer {
  analyzeStructure(track) {
    // This would contain advanced structure analysis
    // For now, returning basic structure
    return {
      intro: { start: 0, end: 30 },
      verse: { start: 30, end: 90 },
      chorus: { start: 90, end: 150 },
      outro: { start: 150, end: track.duration || 180 }
    };
  }
}

/**
 * Mix Transition Intelligence
 * Calculates optimal transition parameters
 */
class MixTransitionIntelligence {
  calculateOptimalTransition(trackA, trackB) {
    // This would contain advanced mix calculation logic
    // For now, returning basic structure
    return {
      transitionType: 'gradual_crossfade',
      duration: 16, // seconds
      eqCurve: 'smooth',
      tempoSync: true
    };
  }
}

/**
 * Performance Analytics
 * Learns from successful mixes to improve future decisions
 */
class PerformanceAnalytics {
  constructor() {
    this.mixHistory = [];
  }

  recordMixSuccess(fromTrack, toTrack, success, feedback = {}) {
    this.mixHistory.push({
      from: fromTrack,
      to: toTrack,
      success,
      feedback,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 mixes to prevent memory bloat
    if (this.mixHistory.length > 1000) {
      this.mixHistory = this.mixHistory.slice(-1000);
    }
  }

  getSuccessRate(trackA, trackB) {
    // Calculate historical success rate for similar transitions
    const similarMixes = this.mixHistory.filter(mix => 
      this.areTracksSimilar(mix.from, trackA) && 
      this.areTracksSimilar(mix.to, trackB)
    );
    
    if (similarMixes.length === 0) return 0.5; // No data
    
    const successfulMixes = similarMixes.filter(mix => mix.success);
    return successfulMixes.length / similarMixes.length;
  }

  areTracksSimilar(track1, track2) {
    // Simple similarity check - could be enhanced
    const bpmDiff = Math.abs((track1.bpm || 120) - (track2.bpm || 120));
    const energyDiff = Math.abs((track1.energy || 0.5) - (track2.energy || 0.5));
    
    return bpmDiff < 10 && energyDiff < 0.2;
  }
}

class AutoDJBrain {
  constructor() {
    this.harmonyEngine = new HarmonicCompatibilityEngine();
    this.structureAnalyzer = new SongStructureAnalyzer();
    this.mixTransitionAI = new MixTransitionIntelligence();
    this.performanceAnalytics = new PerformanceAnalytics();
  }

  /**
   * Find the optimal next track for seamless mixing
   * @param {Object} currentTrack - Currently playing track with analysis
   * @param {Array} candidateTracks - Available tracks with analysis
   * @param {Object} context - DJ context (time, energy target, etc.)
   * @returns {Object} Best next track with mix instructions
   */
  async findOptimalNextTrack(currentTrack, candidateTracks, context = {}) {
    console.log('[Auto DJ Brain] Finding optimal next track...');
    
    const scoredTracks = [];
    
    for (const candidate of candidateTracks) {
      const score = await this.calculateCompatibilityScore(currentTrack, candidate, context);
      
      if (score.total > 0.3) { // Minimum compatibility threshold
        scoredTracks.push({
          track: candidate,
          score: score,
          mixInstructions: await this.generateMixInstructions(currentTrack, candidate)
        });
      }
    }
    
    // Sort by total compatibility score
    scoredTracks.sort((a, b) => b.score.total - a.score.total);
    
    console.log(`[Auto DJ Brain] Found ${scoredTracks.length} compatible tracks`);
    
    return scoredTracks[0] || null;
  }

  /**
   * Calculate comprehensive compatibility score between two tracks
   */
  async calculateCompatibilityScore(trackA, trackB, context) {
    const scores = {
      harmonic: this.harmonyEngine.calculateHarmonicCompatibility(trackA, trackB),
      energy: this.calculateEnergyCompatibility(trackA, trackB, context),
      bpm: this.calculateBPMCompatibility(trackA, trackB),
      structure: await this.structureAnalyzer.calculateStructuralCompatibility(trackA, trackB),
      genre: this.calculateGenreCompatibility(trackA, trackB),
      context: this.calculateContextualCompatibility(trackA, trackB, context)
    };

    // Weighted scoring (customizable by DJ preference)
    const weights = {
      harmonic: 0.25,  // Key compatibility is crucial
      energy: 0.20,    // Energy flow matters
      bpm: 0.20,       // BPM matching is important
      structure: 0.15, // Song structure helps mixing
      genre: 0.10,     // Genre consistency
      context: 0.10    // Time/mood context
    };

    const total = Object.keys(scores).reduce((sum, key) => {
      return sum + (scores[key] * weights[key]);
    }, 0);

    return {
      ...scores,
      total: Math.min(1.0, total),
      breakdown: weights
    };
  }

  calculateEnergyCompatibility(trackA, trackB, context) {
    const energyA = trackA.energy || 0.5;
    const energyB = trackB.energy || 0.5;
    
    // Energy flow target (can be customized)
    const targetFlow = context.energyTarget || 'maintain'; // 'build', 'maintain', 'wind_down'
    
    let compatibility = 0;
    
    switch (targetFlow) {
      case 'build':
        // Want higher energy
        compatibility = energyB > energyA ? 1.0 : (energyB / energyA);
        break;
      case 'wind_down':
        // Want lower energy
        compatibility = energyB < energyA ? 1.0 : (energyA / energyB);
        break;
      case 'maintain':
      default:
        // Want similar energy
        const diff = Math.abs(energyA - energyB);
        compatibility = 1.0 - (diff / 1.0);
        break;
    }
    
    return Math.max(0, compatibility);
  }

  calculateBPMCompatibility(trackA, trackB) {
    const bpmA = trackA.bpm || 120;
    const bpmB = trackB.bpm || 120;
    
    // Check if BPMs are mixable (within reasonable range or harmonic ratios)
    const ratios = [1, 0.5, 2, 0.75, 1.33, 0.66, 1.5]; // Common BPM ratios
    
    let bestCompatibility = 0;
    
    for (const ratio of ratios) {
      const targetBPM = bpmA * ratio;
      const diff = Math.abs(targetBPM - bpmB);
      const tolerance = Math.max(2, targetBPM * 0.02); // 2% tolerance
      
      if (diff <= tolerance) {
        const compatibility = 1.0 - (diff / tolerance);
        bestCompatibility = Math.max(bestCompatibility, compatibility);
      }
    }
    
    return bestCompatibility;
  }

  calculateGenreCompatibility(trackA, trackB) {
    const genreA = (trackA.genre || '').toLowerCase();
    const genreB = (trackB.genre || '').toLowerCase();
    
    // Genre compatibility matrix
    const genreMatrix = {
      'house': ['house', 'tech house', 'deep house', 'progressive house', 'electronic'],
      'techno': ['techno', 'tech house', 'minimal', 'industrial', 'electronic'],
      'trance': ['trance', 'progressive trance', 'uplifting trance', 'electronic'],
      'hip hop': ['hip hop', 'rap', 'r&b', 'urban'],
      'rock': ['rock', 'alternative', 'indie', 'pop rock'],
      'pop': ['pop', 'pop rock', 'dance pop', 'electronic'],
      'country': ['country', 'folk', 'americana', 'bluegrass'],
      'jazz': ['jazz', 'blues', 'soul', 'funk'],
      'reggae': ['reggae', 'dub', 'ska', 'dancehall'],
      'drum and bass': ['drum and bass', 'jungle', 'dubstep', 'electronic']
    };
    
    // Find main genre categories
    let categoryA = 'unknown', categoryB = 'unknown';
    
    for (const [category, genres] of Object.entries(genreMatrix)) {
      if (genres.some(g => genreA.includes(g))) categoryA = category;
      if (genres.some(g => genreB.includes(g))) categoryB = category;
    }
    
    if (categoryA === categoryB) return 1.0;
    if (categoryA === 'unknown' || categoryB === 'unknown') return 0.5;
    
    // Check cross-genre compatibility
    const crossCompatible = {
      'house': ['techno', 'electronic', 'pop'],
      'techno': ['house', 'electronic'],
      'electronic': ['house', 'techno', 'trance', 'pop'],
      'pop': ['electronic', 'house', 'rock'],
      'rock': ['pop', 'alternative'],
      'hip hop': ['r&b', 'pop']
    };
    
    if (crossCompatible[categoryA]?.includes(categoryB)) return 0.7;
    
    return 0.2; // Different genres, low compatibility
  }

  calculateContextualCompatibility(trackA, trackB, context) {
    let score = 0.5; // Base score
    
    // Time-based context
    const hour = context.currentHour || new Date().getHours();
    
    if (hour >= 22 || hour <= 2) {
      // Peak time - prefer higher energy
      if ((trackB.energy || 0.5) > 0.7) score += 0.3;
    } else if (hour >= 6 && hour <= 10) {
      // Morning - prefer mellower tracks
      if ((trackB.energy || 0.5) < 0.6) score += 0.3;
    }
    
    // Set position context
    const setPosition = context.setPosition || 'middle'; // 'opening', 'middle', 'peak', 'closing'
    
    switch (setPosition) {
      case 'opening':
        if ((trackB.energy || 0.5) < 0.6) score += 0.2;
        break;
      case 'peak':
        if ((trackB.energy || 0.5) > 0.8) score += 0.3;
        break;
      case 'closing':
        if ((trackB.energy || 0.5) < 0.5) score += 0.2;
        break;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Generate detailed mix instructions for optimal transition
   */
  async generateMixInstructions(trackA, trackB) {
    const bpmA = trackA.bpm || 120;
    const bpmB = trackB.bpm || 120;
    
    // Calculate optimal mix timing
    const mixOutPoint = trackA.cueOut || (trackA.duration - 30);
    const mixInPoint = trackB.cueIn || 16;
    
    // Determine crossfade strategy
    let crossfadeStrategy = 'quick_cut';
    const energyDiff = Math.abs((trackA.energy || 0.5) - (trackB.energy || 0.5));
    
    if (energyDiff < 0.2) {
      crossfadeStrategy = 'smooth_blend';
    } else if (energyDiff > 0.5) {
      crossfadeStrategy = 'dramatic_cut';
    }
    
    // BPM transition strategy
    let bpmStrategy = 'match_tempo';
    const bpmRatio = bpmB / bpmA;
    
    if (bpmRatio > 1.05 || bpmRatio < 0.95) {
      bpmStrategy = 'gradual_tempo_change';
    }
    
    return {
      mixOutPoint,
      mixInPoint,
      crossfadeStrategy,
      crossfadeDuration: this.calculateOptimalCrossfadeDuration(trackA, trackB),
      bpmStrategy,
      eqStrategy: this.calculateEQStrategy(trackA, trackB),
      harmonic: this.harmonyEngine.getHarmonicTransitionAdvice(trackA, trackB),
      confidence: this.calculateMixConfidence(trackA, trackB)
    };
  }

  calculateOptimalCrossfadeDuration(trackA, trackB) {
    const bpmA = trackA.bpm || 120;
    const beatLength = 60 / bpmA;
    
    // Base duration on energy and BPM
    const energyFactor = Math.abs((trackA.energy || 0.5) - (trackB.energy || 0.5));
    const baseBars = energyFactor > 0.3 ? 2 : 4; // Shorter for energy mismatches
    
    return baseBars * 4 * beatLength; // Convert bars to seconds
  }

  calculateEQStrategy(trackA, trackB) {
    // Simplified EQ strategy based on energy and genre
    const strategy = {
      bassSwap: 'gradual', // 'quick', 'gradual', 'none'
      midRange: 'maintain',
      highFreq: 'enhance_incoming'
    };
    
    // Adjust based on energy difference
    const energyDiff = (trackB.energy || 0.5) - (trackA.energy || 0.5);
    
    if (energyDiff > 0.2) {
      strategy.bassSwap = 'quick';
      strategy.highFreq = 'enhance_incoming';
    } else if (energyDiff < -0.2) {
      strategy.bassSwap = 'gradual';
      strategy.highFreq = 'maintain';
    }
    
    return strategy;
  }

  calculateMixConfidence(trackA, trackB) {
    const factors = [
      trackA.bpm && trackB.bpm ? 0.2 : 0, // BPM data available
      trackA.key && trackB.key ? 0.2 : 0, // Key data available
      trackA.cueIn && trackB.cueIn ? 0.2 : 0, // Cue points available
      trackA.energy && trackB.energy ? 0.2 : 0, // Energy data available
      trackA.duration && trackB.duration ? 0.2 : 0 // Duration data available
    ];
    
    return factors.reduce((sum, factor) => sum + factor, 0);
  }
}

/**
 * Harmonic Compatibility Engine
 * Analyzes musical key relationships for smooth transitions
 */
class HarmonicCompatibilityEngine {
  constructor() {
    // Camelot wheel relationships
    this.camelotWheel = {
      '1A': { perfect: ['1B', '12A', '2A'], good: ['1A', '12B', '2B'], key: 'G#m' },
      '2A': { perfect: ['2B', '1A', '3A'], good: ['2A', '1B', '3B'], key: 'D#m' },
      '3A': { perfect: ['3B', '2A', '4A'], good: ['3A', '2B', '4B'], key: 'A#m' },
      '4A': { perfect: ['4B', '3A', '5A'], good: ['4A', '3B', '5B'], key: 'Fm' },
      '5A': { perfect: ['5B', '4A', '6A'], good: ['5A', '4B', '6B'], key: 'Cm' },
      '6A': { perfect: ['6B', '5A', '7A'], good: ['6A', '5B', '7B'], key: 'Gm' },
      '7A': { perfect: ['7B', '6A', '8A'], good: ['7A', '6B', '8B'], key: 'Dm' },
      '8A': { perfect: ['8B', '7A', '9A'], good: ['8A', '7B', '9B'], key: 'Am' },
      '9A': { perfect: ['9B', '8A', '10A'], good: ['9A', '8B', '10B'], key: 'Em' },
      '10A': { perfect: ['10B', '9A', '11A'], good: ['10A', '9B', '11B'], key: 'Bm' },
      '11A': { perfect: ['11B', '10A', '12A'], good: ['11A', '10B', '12B'], key: 'F#m' },
      '12A': { perfect: ['12B', '11A', '1A'], good: ['12A', '11B', '1B'], key: 'C#m' },
      
      '1B': { perfect: ['1A', '12B', '2B'], good: ['1B', '12A', '2A'], key: 'B' },
      '2B': { perfect: ['2A', '1B', '3B'], good: ['2B', '1A', '3A'], key: 'F#' },
      '3B': { perfect: ['3A', '2B', '4B'], good: ['3B', '2A', '4A'], key: 'C#' },
      '4B': { perfect: ['4A', '3B', '5B'], good: ['4B', '3A', '5A'], key: 'G#' },
      '5B': { perfect: ['5A', '4B', '6B'], good: ['5B', '4A', '6A'], key: 'D#' },
      '6B': { perfect: ['6A', '5B', '7B'], good: ['6B', '5A', '7A'], key: 'A#' },
      '7B': { perfect: ['7A', '6B', '8B'], good: ['7B', '6A', '8A'], key: 'F' },
      '8B': { perfect: ['8A', '7B', '9B'], good: ['8B', '7A', '9A'], key: 'C' },
      '9B': { perfect: ['9A', '8B', '10B'], good: ['9B', '8A', '10A'], key: 'G' },
      '10B': { perfect: ['10A', '9B', '11B'], good: ['10B', '9A', '11A'], key: 'D' },
      '11B': { perfect: ['11A', '10B', '12B'], good: ['11B', '10A', '12A'], key: 'A' },
      '12B': { perfect: ['12A', '11B', '1B'], good: ['12B', '11A', '1A'], key: 'E' }
    };
  }

  calculateHarmonicCompatibility(trackA, trackB) {
    const keyA = trackA.camelotKey;
    const keyB = trackB.camelotKey;
    
    if (!keyA || !keyB) return 0.5; // Unknown keys
    
    const relationships = this.camelotWheel[keyA];
    if (!relationships) return 0.5;
    
    if (keyA === keyB) return 1.0; // Same key - perfect
    if (relationships.perfect.includes(keyB)) return 0.9; // Perfect harmonic match
    if (relationships.good.includes(keyB)) return 0.7; // Good harmonic match
    
    // Check for relative major/minor (energy lift/drop)
    const relativeKey = keyA.replace(/A$/, 'B').replace(/B$/, 'A');
    if (keyB === relativeKey) return 0.8;
    
    return 0.3; // Harmonically challenging
  }

  getHarmonicTransitionAdvice(trackA, trackB) {
    const keyA = trackA.camelotKey;
    const keyB = trackB.camelotKey;
    
    if (!keyA || !keyB) {
      return { advice: 'Unknown keys - use ear to judge compatibility', confidence: 0.3 };
    }
    
    const relationships = this.camelotWheel[keyA];
    
    if (keyA === keyB) {
      return { advice: 'Same key - perfect harmonic match', confidence: 1.0 };
    }
    
    if (relationships?.perfect.includes(keyB)) {
      return { advice: 'Perfect harmonic transition - mix freely', confidence: 0.9 };
    }
    
    if (relationships?.good.includes(keyB)) {
      return { advice: 'Good harmonic match - smooth transition', confidence: 0.7 };
    }
    
    const relativeKey = keyA.replace(/A$/, 'B').replace(/B$/, 'A');
    if (keyB === relativeKey) {
      const isEnergyLift = keyB.endsWith('B');
      return { 
        advice: `Relative ${isEnergyLift ? 'major' : 'minor'} - ${isEnergyLift ? 'energy lift' : 'energy drop'}`, 
        confidence: 0.8 
      };
    }
    
    return { advice: 'Challenging key change - use quick cut or prepare carefully', confidence: 0.3 };
  }
}

/**
 * Song Structure Analyzer
 * Identifies intro, verse, chorus, breakdown sections
 */
class SongStructureAnalyzer {
  async calculateStructuralCompatibility(trackA, trackB) {
    // Simplified structural analysis
    // In a real implementation, this would analyze the audio structure
    
    const hasCleanIntro = (trackB.fadeInDuration || 0) > 8;
    const hasCleanOutro = (trackA.fadeOutDuration || 0) > 8;
    const goodDuration = trackA.duration > 180 && trackB.duration > 180;
    
    let score = 0.5;
    
    if (hasCleanIntro) score += 0.2;
    if (hasCleanOutro) score += 0.2;
    if (goodDuration) score += 0.1;
    
    return Math.min(1.0, score);
  }
}

/**
 * Harmonic Compatibility Engine
 * Analyzes musical harmony and key relationships
 */
class HarmonicCompatibilityEngine {
  analyzeHarmony(trackA, trackB) {
    // This would contain advanced harmonic analysis
    // For now, returning basic compatibility
    return {
      compatible: true,
      confidence: 0.7,
      advice: 'Good harmonic transition'
    };
  }
}

/**
 * Song Structure Analyzer
 * Identifies intro, verse, chorus, outro sections
 */
class SongStructureAnalyzer {
  analyzeStructure(track) {
    // This would contain advanced structure analysis
    // For now, returning basic structure
    return {
      intro: { start: 0, end: 30 },
      verse: { start: 30, end: 90 },
      chorus: { start: 90, end: 150 },
      outro: { start: 150, end: track.duration || 180 }
    };
  }
}
class MixTransitionIntelligence {
  calculateOptimalTransition(trackA, trackB) {
    // This would contain advanced mix calculation logic
    // For now, returning basic structure
    return {
      transitionType: 'gradual_crossfade',
      duration: 16, // seconds
      eqCurve: 'smooth',
      tempoSync: true
    };
  }
}

/**
 * Performance Analytics
 * Learns from successful mixes to improve future decisions
 */
class PerformanceAnalytics {
  constructor() {
    this.mixHistory = [];
  }

  recordMixSuccess(fromTrack, toTrack, success, feedback = {}) {
    this.mixHistory.push({
      from: fromTrack,
      to: toTrack,
      success,
      feedback,
      timestamp: Date.now()
    });
    
    // Keep only last 1000 mixes to prevent memory bloat
    if (this.mixHistory.length > 1000) {
      this.mixHistory = this.mixHistory.slice(-1000);
    }
  }

  getSuccessRate(trackA, trackB) {
    // Calculate historical success rate for similar transitions
    const similarMixes = this.mixHistory.filter(mix => 
      this.areTracksSimilar(mix.from, trackA) && 
      this.areTracksSimilar(mix.to, trackB)
    );
    
    if (similarMixes.length === 0) return 0.5; // No data
    
    const successfulMixes = similarMixes.filter(mix => mix.success);
    return successfulMixes.length / similarMixes.length;
  }

  areTracksSimilar(track1, track2) {
    // Simple similarity check - could be enhanced
    const bpmDiff = Math.abs((track1.bpm || 120) - (track2.bpm || 120));
    const energyDiff = Math.abs((track1.energy || 0.5) - (track2.energy || 0.5));
    
    return bpmDiff < 10 && energyDiff < 0.2;
  }
}

// Export the main Auto DJ Brain
export default AutoDJBrain;

