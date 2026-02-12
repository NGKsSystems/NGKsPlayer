/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: deckSafetyGuards.js
 * Purpose: Performance Safety Mode — guard pipeline for all deck load actions.
 *          Prevents loading to live/public-facing decks and confirms replacements.
 *
 * Design Rules:
 * - Single guard pipeline used by ALL load entrypoints (no duplication)
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// ─── Configuration ────────────────────────────────────────────────────────
export const PERFORMANCE_SAFETY_MODE = true; // DEFAULT ON — enforce all guards

// ─── Thresholds ───────────────────────────────────────────────────────────
// crossfaderWeight > this means the deck is contributing to master
const CROSSFADER_AUDIBLE_THRESHOLD = 0.15;
// VU level (0-100 scale from AudioManager.getVULevel) above this = audible signal
const VU_AUDIBLE_THRESHOLD = 5; // ~-20dB equivalent on 0-100 scale
// gainNode value above this = channel not muted
const GAIN_AUDIBLE_THRESHOLD = 0.05;

// ─── Helper: is a deck routed to master? ──────────────────────────────────
/**
 * Check if a deck's crossfader gain is letting signal through to master.
 * Uses crossfaderGainNode.gain.value which is set by _applyCrossfader().
 *
 * @param {object} audioManager - AudioManager instance
 * @param {string} deck - 'A'|'B'|'C'|'D'
 * @returns {boolean}
 */
export function isRoutedToMaster(audioManager, deck) {
  if (!audioManager?.decks?.[deck]) return false;
  const deckData = audioManager.decks[deck];

  // Check crossfader gain node — this is what _applyCrossfader() sets
  const crossfaderGain = deckData.crossfaderGainNode?.gain?.value ?? 0;
  if (crossfaderGain < CROSSFADER_AUDIBLE_THRESHOLD) return false;

  // Check channel gain (volume fader) — if muted, not routed
  const channelGain = deckData.gainNode?.gain?.value ?? 0;
  if (channelGain < GAIN_AUDIBLE_THRESHOLD) return false;

  return true;
}

// ─── Helper: crossfader weight for a deck ─────────────────────────────────
/**
 * Get the effective crossfader weight for a deck (0-1).
 * Reads from the crossfaderGainNode which _applyCrossfader() maintains.
 *
 * @param {object} audioManager - AudioManager instance
 * @param {string} deck - 'A'|'B'|'C'|'D'
 * @returns {number} 0-1 weight
 */
export function crossfaderWeight(audioManager, deck) {
  if (!audioManager?.decks?.[deck]) return 0;
  return audioManager.decks[deck].crossfaderGainNode?.gain?.value ?? 0;
}

// ─── Helper: is deck public-facing (live in master output)? ───────────────
/**
 * A deck is "public-facing" if:
 *   1) It is currently playing
 *   2) Its output is routed to master (crossfader + channel gain)
 *   3) It has audible signal (VU level above threshold, or inferred from gain)
 *
 * If exact VU data isn't available, we infer from gain * crossfader weight.
 *
 * @param {object} audioManager - AudioManager instance
 * @param {string} deck - 'A'|'B'|'C'|'D'
 * @returns {boolean}
 */
export function isDeckPublicFacing(audioManager, deck) {
  if (!audioManager) return false;

  // Must be playing
  if (!audioManager.isPlaying(deck)) return false;

  // Must be routed to master (crossfader + volume not cut)
  if (!isRoutedToMaster(audioManager, deck)) return false;

  // Check actual VU level if available — best proxy for "audible signal"
  try {
    const vuLevel = audioManager.getVULevel(deck);
    if (vuLevel > VU_AUDIBLE_THRESHOLD) return true;
  } catch {
    // VU not available — fall through to gain-based inference
  }

  // Fallback: if playing + routed, infer audible from gain levels
  // (the track might be in a quiet section, but it's still "live")
  const channelGain = audioManager.decks[deck]?.gainNode?.gain?.value ?? 0;
  const xfGain = crossfaderWeight(audioManager, deck);
  return (channelGain * xfGain) > GAIN_AUDIBLE_THRESHOLD;
}

// ─── Guard decision enum ──────────────────────────────────────────────────
export const GUARD_DECISION = {
  BLOCK_LIVE: 'BLOCK_LIVE',
  CONFIRM_REPLACE: 'CONFIRM_REPLACE',
  ALLOW: 'ALLOW',
};

// ─── Single Guard Pipeline ────────────────────────────────────────────────
/**
 * Run all guard checks before loading a track to a deck.
 * Returns a decision object describing what should happen.
 *
 * @param {object} params
 * @param {object} params.track - The track to load
 * @param {string} params.targetDeck - 'A'|'B'|'C'|'D'
 * @param {string} params.source - Where the load request came from (for logging)
 * @param {object} params.audioManager - AudioManager instance
 * @param {object} params.deckState - Current deckState from DJSimple { A: {...}, B: {...}, ... }
 * @returns {{ decision: string, message?: string, title?: string }}
 */
export function evaluateLoadGuard({ track, targetDeck, source, audioManager, deckState }) {
  const logPrefix = `LOAD_GUARD [${source}→Deck ${targetDeck}]`;

  // If safety mode is off, still enforce Condition 2 confirm at minimum
  if (!PERFORMANCE_SAFETY_MODE) {
    const deckInfo = deckState?.[targetDeck];
    if (deckInfo?.track) {
      console.log(`${logPrefix} decision=CONFIRM_REPLACE (safety off, but track loaded)`);
      return {
        decision: GUARD_DECISION.CONFIRM_REPLACE,
        title: `Replace Track on Deck ${targetDeck}?`,
        message: deckInfo.isPlaying
          ? `Deck ${targetDeck} is currently playing. Replace the track?`
          : `Deck ${targetDeck} already has a track loaded. Replace it?`,
      };
    }
    console.log(`${logPrefix} decision=ALLOW (safety off)`);
    return { decision: GUARD_DECISION.ALLOW };
  }

  // ── Condition 1: Live Output Protection (HARD BLOCK) ──
  if (isDeckPublicFacing(audioManager, targetDeck)) {
    console.log(`${logPrefix} decision=BLOCK_LIVE`);
    return {
      decision: GUARD_DECISION.BLOCK_LIVE,
      title: 'Load Blocked',
      message: `Deck ${targetDeck} is live in master output. Loading disabled.`,
    };
  }

  // ── Condition 2: Cue Occupied (SOFT CONFIRM) ──
  const deckInfo = deckState?.[targetDeck];
  if (deckInfo?.track) {
    // 2b) Playing but not public-facing (cue-only / headphones)
    if (deckInfo.isPlaying) {
      console.log(`${logPrefix} decision=CONFIRM_REPLACE (cued/headphone)`);
      return {
        decision: GUARD_DECISION.CONFIRM_REPLACE,
        title: `Replace Track on Deck ${targetDeck}?`,
        message: `Deck ${targetDeck} is currently cued in headphones. Replace it?`,
      };
    }
    // 2a) Has track but not playing
    console.log(`${logPrefix} decision=CONFIRM_REPLACE (stopped)`);
    return {
      decision: GUARD_DECISION.CONFIRM_REPLACE,
      title: `Replace Track on Deck ${targetDeck}?`,
      message: `Deck ${targetDeck} already has a track loaded. Replace it?`,
    };
  }

  // ── No guard needed ──
  console.log(`${logPrefix} decision=ALLOW`);
  return { decision: GUARD_DECISION.ALLOW };
}

// ─── Test hook: expose guard internals for Playwright under test mode ─────
if (typeof import.meta !== 'undefined' && (import.meta.env?.MODE === 'test' || import.meta.env?.DEV)) {
  window.__DECK_SAFETY_GUARDS__ = {
    isDeckPublicFacing,
    isRoutedToMaster,
    crossfaderWeight,
    evaluateLoadGuard,
    GUARD_DECISION,
    PERFORMANCE_SAFETY_MODE,
  };
}
