// src/utils/label.js
/**
 * Return a friendly label for a queue item or track row.
 * Supports both "new" object queue entries and legacy string file paths.
 */
export function trackLabel(item) {
  if (!item) return '—';
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
  return `${artist} — ${title}`;
}
