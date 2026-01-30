// src/utils/audio.js
// Tiny convenience so older imports keep working.

export function buildLocalAudioURL(filePath) {
  if (!filePath) return "";
  return "ngksplayer://" + String(filePath).replace(/\\/g, "/");
}
