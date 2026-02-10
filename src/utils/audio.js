/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: audio.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/utils/audio.js
// Tiny convenience so older imports keep working.

export function buildLocalAudioURL(filePath) {
  if (!filePath) return "";
  return "ngksplayer://" + String(filePath).replace(/\\/g, "/");
}

