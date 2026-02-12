/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: generateWaveformThumbnail.js
 * Purpose: Generate a mini waveform PNG from audio file via IPC + OffscreenCanvas
 *
 * Pipeline:
 *   1. audio:loadSegment IPC → get decoded PCM (Float32Array)
 *   2. Draw min/max waveform onto OffscreenCanvas
 *   3. Export as data URL (image/png)
 *   4. library:saveThumbnail IPC → persist to disk + update DB
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */

// ── In-flight deduplication ──────────────────────────────────────────────
const inflight = new Map();          // trackId → Promise<string|null>
const generated = new Set();         // trackIds already done this session

// ── Configuration ────────────────────────────────────────────────────────
const CANVAS_W       = 280;          // pixels wide
const CANVAS_H       = 24;           // pixels tall
const SAMPLE_RATE    = 8000;         // low-res decode (fast)
const WAVEFORM_COLOR = '#8bb8ff';    // soft blue waveform bars
const BG_COLOR       = 'transparent';

/**
 * Render PCM samples (Float32Array) to a data URL via OffscreenCanvas.
 * Adapted from ProAudioClipper/SimpleWaveform.jsx drawing algorithm.
 */
function renderWaveform(samples, width = CANVAS_W, height = CANVAS_H) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx    = canvas.getContext('2d');

  // Background
  if (BG_COLOR !== 'transparent') {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);
  }

  const len = samples.length;
  if (len === 0) return null;

  const samplesPerPx = len / width;

  ctx.fillStyle = WAVEFORM_COLOR;
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

  return canvas;
}

/**
 * Generate a waveform thumbnail for a track.
 *
 * @param {object} track   – must have `id`, `filePath` (or `path`), and `duration`
 * @returns {Promise<string|null>}  saved file path, or null on failure
 */
export async function generateWaveformThumbnail(track) {
  const trackId  = track.id;
  const filePath = track.filePath || track.path;
  const duration = Number(track.duration) || 0;

  if (!trackId || !filePath) return null;
  if (generated.has(trackId))  return track.thumbnailPath || null;

  // De-dupe concurrent calls for same track
  if (inflight.has(trackId)) return inflight.get(trackId);

  const promise = _generate(trackId, filePath, duration);
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
      console.warn('[waveform] No window.api.invoke — skipping thumbnail generation');
      return null;
    }

    // 1. Decode entire track at low sample rate
    const segDuration = duration > 0 ? duration : 300; // fallback 5 min max
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

    // channelData comes as plain Array from IPC — convert to Float32Array
    const samples = new Float32Array(result.channelData[0]);

    // 2. Render to OffscreenCanvas
    const canvas = renderWaveform(samples);
    if (!canvas) return null;

    // 3. Export as PNG data URL
    const blob    = await canvas.convertToBlob({ type: 'image/png' });
    const reader  = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result);
      reader.onerror   = reject;
      reader.readAsDataURL(blob);
    });

    // 4. Save via IPC → disk + DB
    const saved = await api.invoke('library:saveThumbnail', {
      trackId,
      dataUrl,
      hash: null,
    });

    if (saved?.ok) {
      generated.add(trackId);
      console.log('[waveform] ✓ Generated thumbnail for', filePath);
      return saved.path;
    }

    console.warn('[waveform] saveThumbnail failed:', saved?.error);
    return null;
  } catch (err) {
    console.error('[waveform] generation failed for', filePath, err);
    return null;
  }
}

/**
 * Check if a track already has a valid thumbnail.
 */
export function hasWaveformThumbnail(track) {
  return !!(track.thumbnailPath || track.waveformPreview);
}

/**
 * Reset the session cache (e.g. on library reload).
 */
export function resetWaveformCache() {
  generated.clear();
  inflight.clear();
}
