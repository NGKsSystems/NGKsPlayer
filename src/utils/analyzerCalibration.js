/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: analyzerCalibration.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Audio Analyzer Calibration System
 * 
 * Uses known BPM/Key values from reference tracks to:
 * - Test analyzer accuracy
 * - Auto-tune detection parameters
 * - Generate calibration report
 * - Optimize detection algorithms
 */

// Known reference values for calibration tracks
export const CALIBRATION_TRACKS = [
  // 60-90 BPM (slow / ballad)
  { name: "Someone Like You", artist: "Adele", bpm: 68, key: "A", mode: "major", category: "slow" },
  { name: "Ain't No Sunshine", artist: "Bill Withers", bpm: 79, key: "A", mode: "minor", category: "slow" },
  { name: "Fast Car", artist: "Tracy Chapman", bpm: 84, key: "G", mode: "major", category: "slow" },
  
  // 90-130 BPM (mid-tempo)
  { name: "Billie Jean", artist: "Michael Jackson", bpm: 117, key: "F#", mode: "minor", category: "mid-tempo" },
  { name: "Hotel California", artist: "Eagles", bpm: 120, key: "B", mode: "minor", category: "mid-tempo" },
  { name: "Get Lucky", artist: "Daft Punk", bpm: 116, key: "F#", mode: "minor", category: "mid-tempo" },
  
  // 130-180 BPM (fast / dance)
  { name: "Mr. Brightside", artist: "The Killers", bpm: 148, key: "D", mode: "major", category: "fast" },
  { name: "Levels", artist: "Avicii", bpm: 126, key: "C#", mode: "minor", category: "fast", note: "doubles to 252" },
  { name: "Master of Puppets", artist: "Metallica", bpm: 212, key: "E", mode: "minor", category: "fast", note: "half-time feel ≈ 106" },
  
  // Straight 4/4 (electronic focus)
  { name: "Summer", artist: "Calvin Harris", bpm: 128, key: "C#", mode: "minor", category: "electronic" },
  { name: "Strobe", artist: "Deadmau5", bpm: 128, key: "B", mode: "major", category: "electronic" },
  { name: "The Robots", artist: "Kraftwerk", bpm: 120, key: "D", mode: "minor", category: "electronic" },
  
  // Swing / Shuffle (jazz / hip-hop feel)
  { name: "Pride and Joy", artist: "Stevie Ray Vaughan", bpm: 126, key: "E", mode: "major", category: "shuffle", note: "shuffle feel" },
  { name: "Still D.R.E.", artist: "Dr. Dre", bpm: 94, key: "D", mode: "minor", category: "swing", note: "swing groove" },
  { name: "It Don't Mean a Thing", artist: "Duke Ellington", bpm: 120, key: "G", mode: "minor", category: "swing" },
  
  // 3/4 (waltz time)
  { name: "Come Away With Me", artist: "Norah Jones", bpm: 82, key: "C", mode: "major", category: "waltz", timeSignature: "3/4" },
  { name: "Hallelujah", artist: "Jeff Buckley", bpm: 66, key: "C", mode: "major", category: "waltz", timeSignature: "6/8" },
  { name: "Norwegian Wood", artist: "The Beatles", bpm: 94, key: "E", mode: "major", category: "waltz", timeSignature: "3/4" },
  
  // Major keys (bright / happy)
  { name: "Happy", artist: "Pharrell Williams", bpm: 160, key: "F", mode: "major", category: "major" },
  { name: "Wouldn't It Be Nice", artist: "The Beach Boys", bpm: 130, key: "A", mode: "major", category: "major" },
  { name: "Viva La Vida", artist: "Coldplay", bpm: 138, key: "Ab", mode: "major", category: "major" },
  
  // Minor keys (dark / moody)
  { name: "In the End", artist: "Linkin Park", bpm: 105, key: "E", mode: "minor", category: "minor" },
  { name: "Blinding Lights", artist: "The Weeknd", bpm: 171, key: "F", mode: "minor", category: "minor" },
  { name: "Bad Guy", artist: "Billie Eilish", bpm: 135, key: "G", mode: "minor", category: "minor" },
  
  // Instrumental (no vocal focus)
  { name: "Experience", artist: "Ludovico Einaudi", bpm: 120, key: "A", mode: "minor", category: "instrumental" },
  
  // Reggae (80-100 BPM)
  { name: "Three Little Birds", artist: "Bob Marley", bpm: 76, key: "A", mode: "major", category: "reggae" },
  { name: "Legalize It", artist: "Peter Tosh", bpm: 94, key: "G", mode: "major", category: "reggae" },
  
  // Country (90-120 BPM)
  { name: "Folsom Prison Blues", artist: "Johnny Cash", bpm: 98, key: "E", mode: "major", category: "country" },
  { name: "Tennessee Whiskey", artist: "Chris Stapleton", bpm: 82, key: "A", mode: "major", category: "country" },
  
  // Speed Metal (160-220 BPM)
  { name: "Raining Blood", artist: "Slayer", bpm: 220, key: "E", mode: "minor", category: "metal" },
  { name: "Hangar 18", artist: "Megadeth", bpm: 172, key: "D", mode: "minor", category: "metal" }
];

/**
 * Find matching calibration track by filename
 */
export function findCalibrationTrack(filename) {
  const cleanName = filename.toLowerCase()
    .replace(/\.(mp3|wav|flac|m4a|ogg)$/i, '')
    .replace(/[_-]/g, ' ')
    .trim();
  
  return CALIBRATION_TRACKS.find(track => {
    const trackSearch = `${track.artist} ${track.name}`.toLowerCase();
    const nameSearch = `${track.name}`.toLowerCase();
    const artistSearch = `${track.artist}`.toLowerCase();
    
    return cleanName.includes(trackSearch) ||
           cleanName.includes(nameSearch) ||
           (cleanName.includes(artistSearch) && cleanName.includes(nameSearch.split(' ')[0]));
  });
}

/**
 * Calculate BPM detection accuracy
 * Accounts for octave errors (2x, 0.5x) and typical rounding
 */
export function calculateBPMAccuracy(detected, expected) {
  if (!detected || !expected) return 0;
  
  const tolerance = 2; // ±2 BPM is acceptable
  const diff = Math.abs(detected - expected);
  
  // Exact match (within tolerance)
  if (diff <= tolerance) {
    return 100;
  }
  
  // Octave errors (common in BPM detection)
  const doubleExpected = expected * 2;
  const halfExpected = expected / 2;
  
  if (Math.abs(detected - doubleExpected) <= tolerance) {
    return 85; // 85% accuracy for octave error
  }
  
  if (Math.abs(detected - halfExpected) <= tolerance) {
    return 85; // 85% accuracy for half-time error
  }
  
  // Triple/third errors (less common but possible)
  if (Math.abs(detected - (expected * 3)) <= tolerance) {
    return 70;
  }
  
  if (Math.abs(detected - (expected / 3)) <= tolerance) {
    return 70;
  }
  
  // Percentage-based accuracy for other errors
  const percentDiff = (diff / expected) * 100;
  
  if (percentDiff <= 5) return 95; // Within 5%
  if (percentDiff <= 10) return 85; // Within 10%
  if (percentDiff <= 15) return 70; // Within 15%
  if (percentDiff <= 20) return 50; // Within 20%
  
  return Math.max(0, 100 - percentDiff); // Linear falloff
}

/**
 * Calculate Key detection accuracy
 * Accounts for relative major/minor, parallel keys, and enharmonic equivalents
 */
export function calculateKeyAccuracy(detected, expected) {
  if (!detected || !expected) return 0;
  
  const detectedKey = normalizeKey(detected.key);
  const detectedMode = detected.mode?.toLowerCase();
  const expectedKey = normalizeKey(expected.key);
  const expectedMode = expected.mode?.toLowerCase();
  
  // Exact match
  if (detectedKey === expectedKey && detectedMode === expectedMode) {
    return 100;
  }
  
  // Relative major/minor (e.g., C major = A minor)
  if (areRelativeKeys(detectedKey, detectedMode, expectedKey, expectedMode)) {
    return 90; // Very close, just mode confusion
  }
  
  // Parallel keys (e.g., C major vs C minor)
  if (detectedKey === expectedKey && detectedMode !== expectedMode) {
    return 80; // Same tonic, wrong mode
  }
  
  // Fifth relationship (circle of fifths - common confusion)
  if (isFifthRelated(detectedKey, expectedKey)) {
    return 70;
  }
  
  // Enharmonic equivalent (e.g., C# = Db)
  if (areEnharmonic(detectedKey, expectedKey)) {
    return 95; // Technically correct
  }
  
  // Chromatic distance
  const distance = getChromaticDistance(detectedKey, expectedKey);
  if (distance === 1) return 60; // One semitone off
  if (distance === 2) return 40; // Two semitones off
  
  return Math.max(0, 100 - (distance * 15)); // Further distances
}

/**
 * Normalize key notation (handle sharps, flats, etc.)
 */
function normalizeKey(key) {
  if (!key) return null;
  
  const enharmonic = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
  };
  
  const normalized = key.replace('♭', 'b').replace('♯', '#').toUpperCase();
  return enharmonic[normalized] || normalized;
}

/**
 * Check if keys are relative (major/minor relationship)
 */
function areRelativeKeys(key1, mode1, key2, mode2) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const idx1 = notes.indexOf(key1);
  const idx2 = notes.indexOf(key2);
  
  if (idx1 === -1 || idx2 === -1) return false;
  
  // Major to relative minor: +9 semitones (or -3)
  // Minor to relative major: -9 semitones (or +3)
  if (mode1 === 'major' && mode2 === 'minor') {
    return (idx2 - idx1 + 12) % 12 === 9;
  }
  
  if (mode1 === 'minor' && mode2 === 'major') {
    return (idx1 - idx2 + 12) % 12 === 9;
  }
  
  return false;
}

/**
 * Check if keys are related by fifth
 */
function isFifthRelated(key1, key2) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const idx1 = notes.indexOf(key1);
  const idx2 = notes.indexOf(key2);
  
  if (idx1 === -1 || idx2 === -1) return false;
  
  const distance = Math.abs(idx2 - idx1);
  return distance === 7 || distance === 5; // Perfect fifth up or down
}

/**
 * Check if keys are enharmonic equivalents
 */
function areEnharmonic(key1, key2) {
  return normalizeKey(key1) === normalizeKey(key2);
}

/**
 * Get chromatic distance between two keys
 */
function getChromaticDistance(key1, key2) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  
  const idx1 = notes.indexOf(key1);
  const idx2 = notes.indexOf(key2);
  
  if (idx1 === -1 || idx2 === -1) return 12;
  
  const distance = Math.abs(idx2 - idx1);
  return Math.min(distance, 12 - distance); // Shortest distance on circle
}

/**
 * Generate calibration report
 */
export function generateCalibrationReport(results) {
  const report = {
    totalTracks: results.length,
    successfulDetections: 0,
    bpmAccuracy: {
      perfect: 0,      // 100%
      excellent: 0,    // 85-99%
      good: 0,         // 70-84%
      fair: 0,         // 50-69%
      poor: 0,         // < 50%
      averageScore: 0
    },
    keyAccuracy: {
      perfect: 0,
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      averageScore: 0
    },
    byCategory: {},
    problematicTracks: [],
    recommendations: []
  };
  
  let totalBpmScore = 0;
  let totalKeyScore = 0;
  
  results.forEach(result => {
    if (!result.detected) return;
    
    report.successfulDetections++;
    
    // BPM accuracy
    const bpmScore = result.bpmAccuracy || 0;
    totalBpmScore += bpmScore;
    
    if (bpmScore >= 100) report.bpmAccuracy.perfect++;
    else if (bpmScore >= 85) report.bpmAccuracy.excellent++;
    else if (bpmScore >= 70) report.bpmAccuracy.good++;
    else if (bpmScore >= 50) report.bpmAccuracy.fair++;
    else report.bpmAccuracy.poor++;
    
    // Key accuracy
    const keyScore = result.keyAccuracy || 0;
    totalKeyScore += keyScore;
    
    if (keyScore >= 100) report.keyAccuracy.perfect++;
    else if (keyScore >= 85) report.keyAccuracy.excellent++;
    else if (keyScore >= 70) report.keyAccuracy.good++;
    else if (keyScore >= 50) report.keyAccuracy.fair++;
    else report.keyAccuracy.poor++;
    
    // By category
    const category = result.expected.category || 'unknown';
    if (!report.byCategory[category]) {
      report.byCategory[category] = {
        count: 0,
        avgBpmScore: 0,
        avgKeyScore: 0,
        bpmScores: [],
        keyScores: []
      };
    }
    
    report.byCategory[category].count++;
    report.byCategory[category].bpmScores.push(bpmScore);
    report.byCategory[category].keyScores.push(keyScore);
    
    // Track problematic detections
    if (bpmScore < 70 || keyScore < 70) {
      report.problematicTracks.push({
        name: result.filename,
        category,
        bpmScore,
        keyScore,
        expected: result.expected,
        detected: result.detected
      });
    }
  });
  
  // Calculate averages
  const validCount = report.successfulDetections || 1;
  report.bpmAccuracy.averageScore = totalBpmScore / validCount;
  report.keyAccuracy.averageScore = totalKeyScore / validCount;
  
  // Calculate category averages
  Object.keys(report.byCategory).forEach(category => {
    const cat = report.byCategory[category];
    cat.avgBpmScore = cat.bpmScores.reduce((a, b) => a + b, 0) / cat.count;
    cat.avgKeyScore = cat.keyScores.reduce((a, b) => a + b, 0) / cat.count;
  });
  
  // Generate recommendations
  if (report.bpmAccuracy.averageScore < 80) {
    report.recommendations.push('BPM detection accuracy is below 80%. Consider adjusting onset detection sensitivity.');
  }
  
  if (report.keyAccuracy.averageScore < 80) {
    report.recommendations.push('Key detection accuracy is below 80%. Consider adjusting chroma analysis parameters.');
  }
  
  // Category-specific recommendations
  Object.entries(report.byCategory).forEach(([category, data]) => {
    if (data.avgBpmScore < 70) {
      report.recommendations.push(`Poor BPM detection for ${category} tracks. Consider specific tuning for this genre.`);
    }
    if (data.avgKeyScore < 70) {
      report.recommendations.push(`Poor Key detection for ${category} tracks. Consider specific tuning for this genre.`);
    }
  });
  
  return report;
}

export default {
  CALIBRATION_TRACKS,
  findCalibrationTrack,
  calculateBPMAccuracy,
  calculateKeyAccuracy,
  generateCalibrationReport
};

