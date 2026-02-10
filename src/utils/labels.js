/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: labels.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/utils/label.js
/**
 * Return a friendly label for a queue item or track row.
 * Supports both "new" object queue entries and legacy string file paths.
 */
export function trackLabel(item) {
  if (!item) return 'â€”';
  if (typeof item === 'string') {
    // Legacy: just a path. Show file name without folder.
    try {
      const base = item.split(/[/\\]/).pop();
      return base || item;
    } catch {
      return item;
    }
  }
  // Object with title/artist
  const title = item.title || 'Unknown Title';
  const artist = item.artist || 'Unknown Artist';
  return `${artist} â€” ${title}`;
}

