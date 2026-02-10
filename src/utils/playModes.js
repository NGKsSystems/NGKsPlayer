/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: playModes.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
export const PlayMode = Object.freeze({
  SINGLE: 'single',          // stop at end
  LIST: 'list',              // play through list once
  REPEAT_ONE: 'repeat_one',
  REPEAT_ALL: 'repeat_all',
  SHUFFLE: 'shuffle',        // can repeat
  SHUFFLE_NR: 'shuffle_nr',  // no repeat until all played
});

