/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: keyConverter.js
 * Purpose: Musical key ↔ Camelot wheel conversion for DJ harmonic mixing
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// Musical key → Camelot mapping
const MUSICAL_TO_CAMELOT = {
  // Minor keys (A side)
  'Abm': '1A',  'G#m': '1A',
  'Ebm': '2A',  'D#m': '2A',
  'Bbm': '3A',  'A#m': '3A',
  'Fm':  '4A',
  'Cm':  '5A',
  'Gm':  '6A',
  'Dm':  '7A',
  'Am':  '8A',
  'Em':  '9A',
  'Bm':  '10A',
  'F#m': '11A', 'Gbm': '11A',
  'C#m': '12A', 'Dbm': '12A',
  // Major keys (B side)
  'B':   '1B',  'Cb':  '1B',
  'F#':  '2B',  'Gb':  '2B',
  'C#':  '3B',  'Db':  '3B',
  'Ab':  '4B',  'G#':  '4B',
  'Eb':  '5B',  'D#':  '5B',
  'Bb':  '6B',  'A#':  '6B',
  'F':   '7B',
  'C':   '8B',
  'G':   '9B',
  'D':   '10B',
  'A':   '11B',
  'E':   '12B',
};

// Camelot → Musical key mapping (canonical names)
const CAMELOT_TO_MUSICAL = {
  '1A': 'Abm',  '2A': 'Ebm',  '3A': 'Bbm',  '4A': 'Fm',
  '5A': 'Cm',   '6A': 'Gm',   '7A': 'Dm',   '8A': 'Am',
  '9A': 'Em',  '10A': 'Bm',  '11A': 'F#m', '12A': 'C#m',
  '1B': 'B',    '2B': 'F#',   '3B': 'Db',   '4B': 'Ab',
  '5B': 'Eb',   '6B': 'Bb',   '7B': 'F',    '8B': 'C',
  '9B': 'G',   '10B': 'D',   '11B': 'A',   '12B': 'E',
};

/**
 * Convert a musical key string to Camelot notation.
 * Handles formats like "Em", "E minor", "C", "C major", "F#m", "Gb"
 * @param {string} key - Musical key (e.g. "Em", "C", "F# minor")
 * @param {string} [mode] - Optional mode hint ("m", "minor", "major")
 * @returns {string|null} Camelot key (e.g. "9A") or null if unrecognized
 */
export function musicalToCamelot(key, mode) {
  if (!key) return null;
  
  let normalized = key.trim();
  
  // Handle "E minor" / "C major" formats
  if (/\s*minor$/i.test(normalized)) {
    normalized = normalized.replace(/\s*minor$/i, 'm');
  } else if (/\s*major$/i.test(normalized)) {
    normalized = normalized.replace(/\s*major$/i, '');
  }
  
  // If mode hint provided ('m' or first char of mode)
  if (mode && !normalized.endsWith('m')) {
    const modeChar = mode.charAt(0).toLowerCase();
    if (modeChar === 'm') {
      // Check if it's "minor" or "major"
      if (mode.toLowerCase().startsWith('mi')) {
        normalized += 'm';
      }
      // "major" — leave as is
    }
  }
  
  return MUSICAL_TO_CAMELOT[normalized] || null;
}

/**
 * Convert a Camelot key to musical notation.
 * @param {string} camelot - Camelot key (e.g. "9A", "8B")
 * @returns {string|null} Musical key (e.g. "Em", "C") or null
 */
export function camelotToMusical(camelot) {
  if (!camelot) return null;
  return CAMELOT_TO_MUSICAL[camelot.trim().toUpperCase()] || null;
}

/**
 * Format a key for display based on the selected mode.
 * @param {object} track - Track object with key, mode, camelotKey fields
 * @param {string} displayMode - "musical" or "camelot"
 * @returns {string} Formatted key string
 */
export function formatKeyDisplay(track, displayMode) {
  if (!track) return '--';
  
  if (displayMode === 'camelot') {
    // Prefer stored camelotKey, else convert
    if (track.camelotKey) return track.camelotKey;
    if (track.key) {
      const converted = musicalToCamelot(track.key, track.mode);
      return converted || track.key;
    }
    return '--';
  }
  
  // Musical mode
  if (track.key) {
    const modeChar = track.mode?.charAt(0) || '';
    return `${track.key}${modeChar}`;
  }
  return '--';
}

/**
 * Get compatible keys for harmonic mixing (Camelot wheel neighbors).
 * Compatible = same number, ±1 number, or same number opposite letter.
 * @param {string} camelotKey - e.g. "8A"
 * @returns {string[]} Array of compatible Camelot keys
 */
export function getCompatibleKeys(camelotKey) {
  if (!camelotKey) return [];
  const match = camelotKey.match(/^(\d+)([AB])$/i);
  if (!match) return [];
  
  const num = parseInt(match[1], 10);
  const letter = match[2].toUpperCase();
  const otherLetter = letter === 'A' ? 'B' : 'A';
  
  const prev = num === 1 ? 12 : num - 1;
  const next = num === 12 ? 1 : num + 1;
  
  return [
    `${num}${letter}`,       // Same key
    `${prev}${letter}`,      // -1 semitone
    `${next}${letter}`,      // +1 semitone
    `${num}${otherLetter}`,  // Relative major/minor
  ];
}
