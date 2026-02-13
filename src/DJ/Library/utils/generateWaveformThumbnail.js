/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: generateWaveformThumbnail.js
 * Purpose: Generate mini waveform data-URL from audio file via IPC + canvas
 *
 * Pipeline:
 *   1. audio:loadSegment IPC → decoded PCM (Float32Array)
 *   2. Draw min/max waveform onto a regular <canvas> element
 *   3. canvas.toDataURL() → base64 PNG data URL
 *   4. Return data URL directly for <img> display (no disk I/O required)
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// ── Caches ───────────────────────────────────────────────────────────────
const cache    = new Map();   // trackId → data URL string
const inflight = new Map();   // trackId → Promise<string|null>

// ── Configuration ────────────────────────────────────────────────────────
const CANVAS_W       = 280;          // pixels wide
const CANVAS_H       = 24;           // pixels tall
const SAMPLE_RATE    = 4000;         // low-res decode (small IPC payload, fast)
const WAVEFORM_COLOR = '#8bb8ff';    // soft blue waveform bars

/**
 * Render PCM samples onto a regular canvas and return a data URL (PNG).
 * Uses the same min/max-per-pixel algorithm as SimpleWaveform.jsx.
 */
function renderToDataUrl(samples, width = CANVAS_W, height = CANVAS_H) {
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const len = samples.length;
  if (len === 0) return null;

  const samplesPerPx = len / width;

  ctx.fillStyle   = WAVEFORM_COLOR;
  ctx.globalAlpha = 0.85;

  for (let x = 0; x < width; x++) {
    const start = Math.floor(x * samplesPerPx);
    const end   = Math.floor((x + 1) * samplesPerPx);

    let min =  1;
    let max = -1;
    for (let i = start; i < end && i < len; i++) {
      const s = samples[i];
      if (s < min) min = s;
      if (s > max) max = s;
    }

    // Map [-1,1] → [0, height]
    const minY = ((min + 1) / 2) * height;
    const maxY = ((max + 1) / 2) * height;
    const barH = Math.max(1, maxY - minY);

    ctx.fillRect(x, height - maxY, 1, barH);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Convert an absolute file path to a loadable src for <img>.
 * Uses the app's registered ngksplayer:// file protocol.
 */
export function toImageSrc(absPath) {
  if (!absPath) return null;
  if (absPath.startsWith('data:')) return absPath;                 // already a data URL
  if (absPath.startsWith('ngksplayer://')) return absPath;         // already converted
  if (absPath.startsWith('http')) return absPath;                  // remote URL
  return 'ngksplayer://' + absPath.replace(/\\/g, '/');            // Windows path → protocol
}

/**
 * Generate a waveform data URL for a track.
 *
 * @param {object} track   – must have `id` and `filePath`
 * @returns {Promise<string|null>}  base64 PNG data URL, or null on failure
 */
export async function generateWaveformThumbnail(track) {
  const trackId  = track?.id;
  const filePath = track?.filePath || track?.path;

  if (!trackId || !filePath) return null;

  // Return from memory cache
  if (cache.has(trackId)) return cache.get(trackId);

  // De-dupe concurrent calls for same track
  if (inflight.has(trackId)) return inflight.get(trackId);

  const promise = _generate(trackId, filePath, Number(track.duration) || 0);
  inflight.set(trackId, promise);

  try {
    return await promise;
  } finally {
    inflight.delete(trackId);
  }
}

async function _generate(trackId, filePath, duration) {
  try {
    const api = window.api;
    if (!api?.invoke) {
      console.warn('[waveform] No window.api.invoke — cannot generate');
      return null;
    }

    // 1. Decode full track at low sample rate (small payload)
    const segDuration = duration > 0 ? duration : 300; // 5 min fallback
    const result = await api.invoke('audio:loadSegment', {
      filePath,
      start: 0,
      duration: segDuration,
      sampleRate: SAMPLE_RATE,
    });

    if (!result?.channelData?.[0]?.length) {
      console.warn('[waveform] No PCM data for', filePath);
      return null;
    }

    // channelData comes as plain Array from IPC — convert
    const samples = new Float32Array(result.channelData[0]);

    // 2. Render to canvas → data URL
    const dataUrl = renderToDataUrl(samples);
    if (!dataUrl) return null;

    // 3. Cache in memory
    cache.set(trackId, dataUrl);
    console.log('[waveform] ✓ Generated waveform for', filePath);
    return dataUrl;
  } catch (err) {
    console.error('[waveform] generation failed for', filePath, err);
    return null;
  }
}

/**
 * Check if a track already has a usable waveform (cached or on disk).
 */
export function hasWaveformThumbnail(track) {
  if (!track) return false;
  if (cache.has(track.id)) return true;
  return !!(track.thumbnailPath);
}

/**
 * Reset the session caches (e.g. on library reload).
 */
export function resetWaveformCache() {
  cache.clear();
  inflight.clear();
}
